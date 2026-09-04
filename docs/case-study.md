# Case study: turning telemetry into an incident decision

## Situation

An operator sees a revenue anomaly in `payments / eu-west`. A typical dashboard provides a red line but no measure of detector reliability, no traceable operational guidance, and no durable investigation record.

## SignalOps response

The detector compares the observation with prior values from the same hour of week using median/MAD references that exclude the current row. Persistence and corroborating request movement convert the deviation into one incident episode. The command center displays the seasonal expectation, ranks the strongest observed signals, cites the matching revenue runbook section, and lets the analyst preserve what they checked.

## Outcome

Across the locked synthetic holdout, the complete rule cut false-positive episodes from 111 to 4 while increasing matched incidents from 15 to 29. The project makes the tradeoff inspectable through an ablation: the raw robust detector is sensitive but noisy; persistence and corroboration recover precision.

## What makes the project credible

The result is reproducible from a clean checkout, the evidence is machine-readable, uncertainty is reported, label leakage has a regression test, synthetic limitations are prominent, and every architecture box has a corresponding runnable artifact or explicit reference-topology label.
