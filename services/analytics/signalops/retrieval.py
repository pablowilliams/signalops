from __future__ import annotations

import math
import re
from collections import Counter
from dataclasses import dataclass


TOKEN = re.compile(r"[a-z0-9_]+")


@dataclass(frozen=True)
class Runbook:
    document_id: str
    title: str
    section: str
    body: str


RUNBOOKS = (
    Runbook("RB-ERR-01", "Elevated application errors", "Triage", "Compare error classes by deployment and dependency. Roll back only when the increase aligns with the release window. Check payment gateway and identity provider status."),
    Runbook("RB-LAT-02", "Regional latency regression", "Diagnosis", "Compare p95 latency by region, dependency, saturation, queue depth, and deployment version. Shift traffic only after capacity and error-rate checks."),
    Runbook("RB-TRF-03", "Unexpected traffic loss", "Validation", "Validate event freshness, routing, DNS, acquisition campaigns, and upstream client versions. Distinguish demand loss from missing telemetry before escalation."),
    Runbook("RB-REV-04", "Revenue conversion divergence", "Investigation", "Reconcile checkout starts, payment authorizations, completion events, pricing changes, refunds, and event lag. Compare revenue against request and conversion volume."),
    Runbook("RB-DATA-05", "Late or incomplete telemetry", "Recovery", "Check source watermarks, schema changes, duplicate keys, null rates, partition freshness, and orchestrator retries before backfilling an idempotent partition."),
)

EVAL_QUERIES = (
    ("payments are returning more failures after a release", "RB-ERR-01"),
    ("ap south response times increased while traffic stayed normal", "RB-LAT-02"),
    ("request count collapsed but there is no corresponding outage", "RB-TRF-03"),
    ("checkout volume is healthy but money captured has fallen", "RB-REV-04"),
    ("the hourly partition has nulls and the watermark is behind", "RB-DATA-05"),
    ("dependency failures correlate with the newest deployment", "RB-ERR-01"),
    ("queue depth and tail response time rose in one geography", "RB-LAT-02"),
    ("events may be missing after an upstream client update", "RB-TRF-03"),
    ("payment authorizations no longer match completed orders", "RB-REV-04"),
    ("how should we safely replay a delayed warehouse partition", "RB-DATA-05"),
)


def _tokens(text: str) -> list[str]:
    aliases = {"failures": "errors", "response": "latency", "money": "revenue", "captured": "revenue", "geography": "region", "replay": "backfilling", "delayed": "late"}
    return [aliases.get(token, token) for token in TOKEN.findall(text.lower())]


def search(query: str, limit: int = 3) -> list[dict[str, object]]:
    documents = [_tokens(f"{item.title} {item.section} {item.body}") for item in RUNBOOKS]
    query_tokens = _tokens(query)
    average_length = sum(map(len, documents)) / len(documents)
    frequencies = Counter(token for document in documents for token in set(document))
    scores = []
    for runbook, document in zip(RUNBOOKS, documents, strict=True):
        counts = Counter(document)
        score = 0.0
        for token in query_tokens:
            document_frequency = frequencies[token]
            inverse = math.log(1 + (len(documents) - document_frequency + 0.5) / (document_frequency + 0.5))
            frequency = counts[token]
            score += inverse * frequency * 2.5 / (frequency + 1.5 * (0.25 + 0.75 * len(document) / average_length))
        scores.append((score, runbook))
    ranked = sorted(scores, key=lambda item: item[0], reverse=True)[:limit]
    return [{"document_id": item.document_id, "title": item.title, "citation": f"{item.document_id} · {item.section}", "excerpt": item.body, "score": round(score, 3)} for score, item in ranked]


def evaluate_retrieval() -> dict[str, float | int]:
    reciprocal_ranks = []
    top_one = 0
    top_three = 0
    for query, expected in EVAL_QUERIES:
        results = search(query, limit=3)
        ids = [str(item["document_id"]) for item in results]
        if ids and ids[0] == expected:
            top_one += 1
        if expected in ids:
            top_three += 1
            reciprocal_ranks.append(1 / (ids.index(expected) + 1))
        else:
            reciprocal_ranks.append(0)
    total = len(EVAL_QUERIES)
    return {"queries": total, "hit_rate_at_1": top_one / total, "hit_rate_at_3": top_three / total, "mrr": sum(reciprocal_ranks) / total}
