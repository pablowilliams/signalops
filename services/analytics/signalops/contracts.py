"""CLI data-contract gate used by the reference Airflow DAG."""
from __future__ import annotations

import argparse
from pathlib import Path

import pandas as pd

from .generator import REGIONS, SERVICES


REQUIRED = {
    "event_id", "timestamp", "ingested_at", "service", "region",
    "deployment_version", "requests", "error_rate", "latency_p95_ms", "revenue",
}


def validate(frame: pd.DataFrame) -> list[str]:
    errors: list[str] = []
    missing = REQUIRED - set(frame.columns)
    if missing:
        errors.append(f"missing columns: {', '.join(sorted(missing))}")
        return errors
    if frame["event_id"].duplicated().any():
        errors.append("event_id must be unique")
    if not set(frame["service"]).issubset(SERVICES):
        errors.append("unknown service value")
    if not set(frame["region"]).issubset(REGIONS):
        errors.append("unknown region value")
    if (frame[["requests", "error_rate", "revenue"]].min() < 0).any():
        errors.append("non-null numeric measures must be non-negative")
    return errors


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", type=Path, default=Path("datasets/telemetry_sample.csv"))
    parser.add_argument("--partition", default="sample")
    args = parser.parse_args()
    frame = pd.read_csv(args.input)
    errors = validate(frame)
    if errors:
        raise SystemExit(f"contract failed for {args.partition}: {'; '.join(errors)}")
    print(f"contract passed for {args.partition}: {len(frame):,} rows")


if __name__ == "__main__":
    main()
