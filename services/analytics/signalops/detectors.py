from __future__ import annotations

from dataclasses import dataclass

import numpy as np
import pandas as pd

from .generator import METRICS


DIRECTION = {"requests": "low", "error_rate": "high", "latency_p95_ms": "high", "revenue": "low"}
SCALE_FLOOR = {"requests": 30.0, "error_rate": 0.0015, "latency_p95_ms": 7.0, "revenue": 35.0}


@dataclass(frozen=True)
class DetectorConfig:
    baseline_threshold: float = 3.0
    robust_threshold: float = 4.5
    strong_threshold: float = 8.0
    corroboration_threshold: float = 3.0
    seasonal_periods: int = 5


def _directional(value: pd.Series, center: pd.Series, scale: pd.Series, direction: str) -> pd.Series:
    raw = (value - center) / scale
    return raw if direction == "high" else -raw


def score_telemetry(frame: pd.DataFrame, config: DetectorConfig = DetectorConfig()) -> pd.DataFrame:
    """Return lag-only anomaly scores. No current/future observation enters its expectation."""
    groups: list[pd.DataFrame] = []
    for (_, _), group in frame.groupby(["service", "region"], sort=False):
        group = group.sort_values("timestamp").copy()
        for metric in METRICS:
            values = group[metric].astype(float).interpolate(limit=2).ffill()
            prior = values.shift(1)
            mean = prior.rolling(24 * 14, min_periods=24 * 7).mean()
            std = prior.rolling(24 * 14, min_periods=24 * 7).std().clip(lower=SCALE_FLOOR[metric])
            group[f"baseline_{metric}"] = _directional(values, mean, std, DIRECTION[metric]).fillna(0)

            seasonal = pd.concat([values.shift(24 * 7 * lag) for lag in range(1, config.seasonal_periods + 1)], axis=1)
            median = seasonal.median(axis=1)
            mad = seasonal.sub(median, axis=0).abs().median(axis=1)
            scale = (1.4826 * mad).clip(lower=SCALE_FLOOR[metric])
            group[f"robust_{metric}"] = _directional(values, median, scale, DIRECTION[metric]).fillna(0)
        groups.append(group)
    return pd.concat(groups, ignore_index=True)


def detect_alerts(scored: pd.DataFrame, method: str, config: DetectorConfig = DetectorConfig()) -> pd.DataFrame:
    output = scored[["timestamp", "service", "region"]].copy()
    if method == "baseline":
        columns = [f"baseline_{metric}" for metric in METRICS]
        output["score"] = scored[columns].max(axis=1)
        output["metric"] = scored[columns].idxmax(axis=1).str.removeprefix("baseline_")
        output["is_alert"] = output["score"] >= config.baseline_threshold
    elif method == "robust_raw":
        robust_columns = [f"robust_{metric}" for metric in METRICS]
        output["score"] = scored[robust_columns].max(axis=1)
        output["metric"] = scored[robust_columns].idxmax(axis=1).str.removeprefix("robust_")
        output["is_alert"] = output["score"] >= config.robust_threshold
    elif method == "signalops":
        robust_columns = [f"robust_{metric}" for metric in METRICS]
        scores = scored[robust_columns]
        output["score"] = scores.max(axis=1)
        output["metric"] = scores.idxmax(axis=1).str.removeprefix("robust_")
        threshold_hits = scores.ge(config.robust_threshold)
        corroborated = scores.ge(config.corroboration_threshold).sum(axis=1) >= 2
        strong = scores.max(axis=1) >= config.strong_threshold
        candidate = threshold_hits.any(axis=1) & (corroborated | strong)
        prior_candidate = candidate.groupby([scored["service"], scored["region"]]).shift(1).fillna(False)
        output["is_alert"] = candidate & prior_candidate
    else:
        raise ValueError(f"unknown method: {method}")
    return output[output["is_alert"]].reset_index(drop=True)


def collapse_episodes(alerts: pd.DataFrame, gap_hours: int = 6) -> pd.DataFrame:
    if alerts.empty:
        return alerts.assign(episode_id=pd.Series(dtype="string"))
    alerts = alerts.sort_values(["service", "region", "timestamp"]).copy()
    gap = alerts.groupby(["service", "region"])["timestamp"].diff().gt(pd.Timedelta(hours=gap_hours)).fillna(True)
    alerts["episode_number"] = gap.groupby([alerts["service"], alerts["region"]]).cumsum().astype(int)
    episodes = alerts.groupby(["service", "region", "episode_number"], as_index=False).agg(
        timestamp=("timestamp", "min"), end=("timestamp", "max"), score=("score", "max"), metric=("metric", "first")
    )
    episodes["episode_id"] = [f"ALT-{index:05d}" for index in range(1, len(episodes) + 1)]
    return episodes
