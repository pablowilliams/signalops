# Data dictionary

## Telemetry grain

One row per `timestamp × service × region`.

| Field | Type | Meaning |
|---|---|---|
| `event_id` | string | Stable idempotency key |
| `timestamp` | UTC datetime | Start of observed hour |
| `ingested_at` | UTC datetime | Simulated arrival time |
| `service` | enum | checkout, payments, identity, catalog |
| `region` | enum | eu-west, us-east, ap-south |
| `deployment_version` | string | Release cohort, `YYYY.NN` |
| `requests` | number | Hourly request volume |
| `error_rate` | proportion | Failed requests / total requests |
| `latency_p95_ms` | nullable number | 95th-percentile latency in ms |
| `revenue` | number | Hourly modeled revenue units |

## Incident labels

Labels are generated and stored separately from telemetry. Each label contains `incident_id`, interval, service, region, category, severity, and affected metrics. Detector functions never accept the label table.
