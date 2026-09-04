# Resume and interview evidence

## Claims you can defend

| Claim | Exact figure | Evidence | Boundary |
|---|---:|---|---|
| Event-level F1 | 90.6% | `artifacts/backtest-results.json` | Seeded synthetic holdout |
| Baseline F1 | 19.1% | Same artifact, `detectors.baseline` | Same matching rule |
| F1 improvement | +71.5pp | `improvement.f1_absolute` | Absolute percentage points |
| False-positive reduction | 96.4% | 111 baseline vs 4 SignalOps | Episode-level, not row-level |
| Recall | 93.5% | 29 / 31 incidents | Bootstrap CI 83.9–100% |
| Precision | 87.9% | 29 / 33 alert episodes | Bootstrap CI 75.8–97.0% |
| Retrieval hit@3 | 90% | 9 / 10 paraphrased queries | Five-runbook corpus |
| CUPED variance reduction | 44.1% | 12,000-unit seeded experiment | Synthetic known-effect experiment |

## Two-minute explanation

SignalOps starts with deterministic, seasonal telemetry whose incident labels never enter detector features. A naive rolling z-score is compared with a robust same-hour-of-week reference. Persistence and cross-metric corroboration turn noisy row-level scores into useful event episodes. A matching layer measures precision, recall, alert fatigue, delay, category recall, and uncertainty. The same project then demonstrates the surrounding engineering: contracts, dbt, Airflow, an API, retrieval evaluation, experiment analysis, observability, CI, and a durable incident workflow.

## Interview questions to expect

**Why did the raw robust detector perform poorly?** It reached high recall but emitted hundreds of isolated episodes. The ablation makes the tradeoff visible: seasonality helps sensitivity; persistence and corroboration recover precision.

**Why is the recall interval wide?** Thirty-one incidents are enough for a portfolio benchmark but not a narrow production estimate. Reporting the interval prevents false certainty.

**Is ranked evidence root cause analysis?** No. It ranks temporally aligned deviations and comparison slices. The interface labels this as observational evidence and proposes verification steps.

**Why not use an LLM for retrieval?** A transparent BM25 benchmark is deterministic and easy to audit. The provider boundary can be replaced by embeddings or reranking, but any replacement must beat the fixed retrieval set and keep citations.

**What would you do next in production?** Historical replay, cost-weighted thresholds, shadow deployment, drift monitoring, incident adjudication, late-data testing, per-service calibration, and gradual alert routing.
