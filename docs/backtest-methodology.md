# Backtest methodology

## Question

Can a leakage-safe, same-hour-of-week robust detector outperform a trailing rolling z-score at the incident-episode level while controlling alert fatigue?

## Locked evaluation design

- Seed: `90426`.
- Dataset: 210 days × 24 hours × 4 services × 3 regions = 60,480 rows.
- Warm-up: first 42 days; incidents beginning before the cutoff are excluded.
- Evaluation: 48,384 monitored entity-hours and 31 incident labels.
- Labels: separate table containing service, region, interval, category, and severity.
- Match: first alert episode on the correct service-region between incident start and one hour after its end.
- Duplicates: subsequent episodes are false positives.
- Benign disturbances: four unlabelled deployment-like disturbances are retained.

Both detectors exclude the current observation from the reference distribution. The baseline uses trailing mean/standard deviation. SignalOps uses the same hour of week, median/MAD, scale floors, persistence, and cross-metric corroboration.

## Results

SignalOps matched 29 of 31 incidents with 4 false-positive episodes. Precision was 87.9%, recall 93.5%, and F1 90.6%. The baseline matched 15 incidents and emitted 111 false positives: 11.9% precision, 48.4% recall, and 19.1% F1.

Deterministic 4,000-resample percentile intervals are 75.8–97.0% for SignalOps precision and 83.9–100% for recall. Wilson intervals are included as a second small-sample check. Recall by category is 100% for error spikes, latency regressions, and traffic drops, and 75% for revenue drops.

## Reproduce

```bash
npm run backtest
python3 -m pytest services/analytics/tests/test_backtest.py
```

The command rewrites both machine-readable evidence files. A changed checksum or detector result for the same seed fails the reproducibility expectation and should block release.

## Interpretation boundary

The benchmark proves deterministic behavior on this generator. It does not estimate production incident prevalence or transfer performance. Before production use, replay historical telemetry, adjudicate ambiguous labels with operators, calibrate costs, test delayed/late data, and operate in shadow mode.
