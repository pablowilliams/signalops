# Operator runbook

## Health checks

- Web build: `npm run build`
- Full suite: `npm test`
- API readiness: `curl http://localhost:8000/healthz`
- Prometheus metrics: `curl http://localhost:8000/metrics`
- Evidence regeneration: `npm run backtest`

## Failed detector gate

Inspect the changed dataset checksum first. Compare baseline, raw robust, and production variants in the ablation. Do not tune against the locked test labels; create a development split or new seed, document the change, then run the untouched holdout once.

## Data contract failure

Quarantine the partition. Identify missing columns, duplicate event IDs, invalid service-region values, or negative measures. Repair upstream data and rerun the same partition; stable event IDs make the write idempotent.

## Retrieval gate failure

Inspect failed paraphrases and citations. Update runbook content or retrieval logic using a development query set, then validate against the fixed ten-query set. Never hide an unsupported answer by removing its test case.

## Rollback

Keep the previous evidence artifact and deployment commit available. If the new gate passes but operational review finds a regression, redeploy the prior commit and retain the failed run in the audit log.
