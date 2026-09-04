"""Run the deterministic detector for an orchestration partition."""
from __future__ import annotations

import argparse

from signalops.backtest import run_backtest


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--partition", required=True)
    args = parser.parse_args()
    result = run_backtest()
    metrics = result["detectors"]["signalops"]
    print(f"partition={args.partition} episodes={metrics['alerts']} release_gate={result['release_gate']['passed']}")


if __name__ == "__main__":
    main()
