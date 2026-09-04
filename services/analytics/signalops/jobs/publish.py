"""Validate the release gate before publishing an incident partition."""
from __future__ import annotations

import argparse

from signalops.backtest import run_backtest


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--partition", required=True)
    args = parser.parse_args()
    result = run_backtest()
    if not result["release_gate"]["passed"]:
        raise SystemExit("publish blocked: benchmark release gate failed")
    print(f"published partition={args.partition} version={result['benchmark_version']}")


if __name__ == "__main__":
    main()
