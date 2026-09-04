# SignalOps detector model card

## Intended use

Prioritize hourly service-region telemetry for human investigation. The detector is a statistical decision rule, not a trained foundation model and not an autonomous remediation system.

## Inputs and outputs

Inputs are requests, error rate, p95 latency, and revenue at hourly service-region grain. Outputs are direction-aware robust scores, alert episodes, confidence evidence, and ranked diagnostic observations.

## Evaluation

The fixed synthetic holdout contains 31 incidents across four categories after a 42-day warm-up. SignalOps reaches 87.9% precision, 93.5% recall, and 90.6% F1 with four false-positive episodes and one-hour median delay. See `backtest-methodology.md` for matching and uncertainty.

## Limitations

Synthetic distributions cannot capture every production regime. Revenue drops are the weakest category at 75% recall. The detector assumes enough same-hour-of-week history and can degrade during holidays, launches, structural traffic shifts, and telemetry loss. Scores rank deviation, not business impact or causality.

## Monitoring

Track alert volume, precision from adjudicated incidents, category recall, detection delay, missingness, reference-window coverage, and score distribution drift. Recalibration requires a development split; the locked holdout must not become a tuning set.
