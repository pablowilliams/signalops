# Architecture decisions

## Boundaries

The repository separates deterministic analytics from reviewer-state persistence. Python owns generation, statistical detection, evaluation, diagnostics, experiments, and retrieval. The Next.js application reads the frozen evidence artifact and uses Cloudflare D1 only for user-scoped notes, incident status, benchmark-run history, and audit events.

This split keeps the hosted demonstration fast and reproducible while preserving a real FastAPI serving boundary for local or container deployment.

## Data path

1. Hourly telemetry arrives with a stable event ID and ingestion timestamp.
2. The JSON contract and Python gate reject invalid grains and enum values.
3. dbt deduplicates events and publishes an hourly service-health fact.
4. Detection computes lagged seasonal expectations and collapses rows into episodes.
5. Evaluation joins episodes to separately stored labels.
6. Diagnostics and retrieval produce evidence-backed incident cards.
7. FastAPI serves analytical results; the hosted app preserves reviewer actions in D1.

## Reliability

- Hourly partitions and stable event IDs make ingestion and publication idempotent.
- Airflow retries tasks twice and supports catch-up backfills.
- Release publication is gated on detector and retrieval quality.
- Prometheus and Grafana configuration expose service health.
- The API attaches request IDs and defensive response headers.

## Tradeoffs

The checked-in JSON artifact is intentional: a reviewer receives the exact validated evidence without waiting for a Python runtime. D1 stores user workflow state but is not used as a telemetry warehouse. Redpanda and Postgres in Compose demonstrate the integration topology; the deterministic sample remains the default so the project runs without external credentials.
