from __future__ import annotations

from dataclasses import asdict, dataclass
from hashlib import sha256
from pathlib import Path

import numpy as np
import pandas as pd


SERVICES = ("checkout", "payments", "identity", "catalog")
REGIONS = ("eu-west", "us-east", "ap-south")
METRICS = ("requests", "error_rate", "latency_p95_ms", "revenue")


@dataclass(frozen=True)
class Incident:
    incident_id: str
    start: pd.Timestamp
    end: pd.Timestamp
    service: str
    region: str
    category: str
    severity: str
    affected_metrics: tuple[str, ...]


def _incident_schedule(index: pd.DatetimeIndex, seed: int) -> list[Incident]:
    rng = np.random.default_rng(seed + 41)
    categories = (
        ("error_spike", ("error_rate", "requests")),
        ("latency_regression", ("latency_p95_ms", "error_rate")),
        ("traffic_drop", ("requests", "revenue")),
        ("revenue_drop", ("revenue", "requests")),
    )
    incidents: list[Incident] = []
    warmup_hours = 24 * 42
    available = len(index) - warmup_hours - 24
    offsets = np.linspace(warmup_hours, warmup_hours + available, 32, endpoint=False, dtype=int)
    offsets += rng.integers(-30, 31, size=len(offsets))
    for number, offset in enumerate(offsets, 1):
        category, metrics = categories[(number - 1) % len(categories)]
        duration = int(rng.integers(3, 9))
        service = SERVICES[int(rng.integers(0, len(SERVICES)))]
        region = REGIONS[int(rng.integers(0, len(REGIONS)))]
        severity = "critical" if number % 5 == 0 else "high" if number % 3 == 0 else "medium"
        start = index[int(offset)]
        incidents.append(Incident(f"INC-{number:04d}", start, start + pd.Timedelta(hours=duration - 1), service, region, category, severity, metrics))
    return incidents


def generate_telemetry(days: int = 210, seed: int = 90426) -> tuple[pd.DataFrame, pd.DataFrame]:
    """Generate deterministic hourly telemetry and separately held incident labels."""
    rng = np.random.default_rng(seed)
    index = pd.date_range("2025-01-01", periods=days * 24, freq="h", tz="UTC")
    incidents = _incident_schedule(index, seed)
    rows: list[dict[str, object]] = []
    service_scale = {"checkout": 1.25, "payments": 1.0, "identity": 0.72, "catalog": 1.55}
    region_scale = {"eu-west": 1.0, "us-east": 1.18, "ap-south": 0.76}

    for service in SERVICES:
        for region in REGIONS:
            scale = service_scale[service] * region_scale[region]
            for hour_index, timestamp in enumerate(index):
                hour = timestamp.hour
                weekday = timestamp.weekday()
                daily = 1 + 0.34 * np.sin((hour - 7) * np.pi / 12) + 0.08 * np.sin(hour * np.pi / 6)
                weekend = 0.82 if weekday >= 5 else 1.0
                trend = 1 + 0.000035 * hour_index
                requests = max(80, 1250 * scale * daily * weekend * trend + rng.normal(0, 48 * scale))
                latency = 182 + 32 / max(daily, 0.55) + (25 if region == "ap-south" else 0) + rng.normal(0, 9)
                error_rate = max(0.001, 0.009 + 0.002 / max(daily, 0.55) + rng.normal(0, 0.0018))
                revenue = max(0, requests * (2.05 if service in {"checkout", "payments"} else 0.22) * (1 + rng.normal(0, 0.025)))
                rows.append({
                    "event_id": f"evt-{service}-{region}-{hour_index:06d}",
                    "timestamp": timestamp,
                    "ingested_at": timestamp + pd.Timedelta(minutes=5),
                    "service": service,
                    "region": region,
                    "deployment_version": f"2025.{1 + hour_index // (24 * 21):02d}",
                    "requests": round(requests, 2),
                    "error_rate": round(error_rate, 6),
                    "latency_p95_ms": round(latency, 2),
                    "revenue": round(revenue, 2),
                })

    frame = pd.DataFrame(rows).sort_values(["service", "region", "timestamp"], ignore_index=True)
    for incident in incidents:
        mask = (
            (frame["service"] == incident.service)
            & (frame["region"] == incident.region)
            & frame["timestamp"].between(incident.start, incident.end)
        )
        severity_factor = {"medium": 1.0, "high": 1.25, "critical": 1.55}[incident.severity]
        if incident.category == "error_spike":
            frame.loc[mask, "error_rate"] *= 5.2 * severity_factor
            frame.loc[mask, "requests"] *= 0.86
        elif incident.category == "latency_regression":
            frame.loc[mask, "latency_p95_ms"] *= 1.75 * severity_factor
            frame.loc[mask, "error_rate"] *= 2.3
        elif incident.category == "traffic_drop":
            frame.loc[mask, "requests"] *= 0.48 / severity_factor
            frame.loc[mask, "revenue"] *= 0.51 / severity_factor
        else:
            frame.loc[mask, "revenue"] *= 0.42 / severity_factor
            frame.loc[mask, "requests"] *= 0.91

    # Short benign deployment disturbances are deliberately left unlabelled.
    # They make the holdout realistic: a useful detector should still incur and report some false alerts.
    for day, hour, service, region in ((58, 5, "checkout", "eu-west"), (103, 11, "identity", "us-east"), (166, 16, "catalog", "ap-south"), (193, 9, "payments", "eu-west")):
        start = index[min(day * 24 + hour, len(index) - 3)]
        while any(item.service == service and item.region == region and item.start <= start + pd.Timedelta(hours=1) and item.end >= start for item in incidents):
            start += pd.Timedelta(hours=12)
        benign = (frame["service"] == service) & (frame["region"] == region) & frame["timestamp"].between(start, start + pd.Timedelta(hours=1))
        frame.loc[benign, "error_rate"] *= 3.8
        frame.loc[benign, "latency_p95_ms"] *= 1.12

    # A controlled 0.08% missingness sample exercises quality handling without overlapping incidents.
    missing_candidates = frame.index[frame["timestamp"] < index[24 * 40]]
    missing = rng.choice(missing_candidates, size=max(1, len(frame) // 1250), replace=False)
    frame.loc[missing, "latency_p95_ms"] = np.nan
    labels = pd.DataFrame([asdict(incident) for incident in incidents])
    return frame, labels


def dataset_checksum(frame: pd.DataFrame, labels: pd.DataFrame) -> str:
    payload = frame.to_csv(index=False).encode() + labels.to_json(date_format="iso", orient="records").encode()
    return sha256(payload).hexdigest()[:16]


def write_sample(output: Path, days: int = 14, seed: int = 90426) -> None:
    frame, labels = generate_telemetry(days=max(days, 60), seed=seed)
    output.mkdir(parents=True, exist_ok=True)
    cutoff = frame["timestamp"].min() + pd.Timedelta(days=days)
    frame[frame["timestamp"] < cutoff].to_csv(output / "telemetry_sample.csv", index=False)
    labels.to_json(output / "incident_labels.json", orient="records", date_format="iso", indent=2)
