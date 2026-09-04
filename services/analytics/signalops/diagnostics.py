from __future__ import annotations

import pandas as pd

from .generator import METRICS


LABELS = {
    "requests": ("Traffic volume fell below its seasonal range", "Check routing, upstream demand, and ingestion completeness."),
    "error_rate": ("Error rate rose above its seasonal range", "Inspect the latest deployment and dependency error classes."),
    "latency_p95_ms": ("Tail latency moved outside its expected range", "Compare saturation, dependency latency, and regional capacity."),
    "revenue": ("Revenue diverged from request volume", "Validate checkout completion, pricing events, and payment authorization."),
}


def rank_causes(scored: pd.DataFrame, service: str, region: str, timestamp: pd.Timestamp, limit: int = 3) -> list[dict[str, object]]:
    row = scored[(scored["service"] == service) & (scored["region"] == region) & (scored["timestamp"] == timestamp)]
    if row.empty:
        return []
    current = row.iloc[0]
    evidence = []
    for metric in METRICS:
        score = max(0.0, float(current[f"robust_{metric}"]))
        title, action = LABELS[metric]
        evidence.append({
            "metric": metric,
            "score": round(score, 2),
            "title": title,
            "evidence": f"Observed {float(current[metric]):,.3f}; robust seasonal deviation {score:.1f}σ.",
            "next_step": action,
            "limitation": "This is ranked observational evidence, not proof of causality.",
        })
    return sorted(evidence, key=lambda item: float(item["score"]), reverse=True)[:limit]
