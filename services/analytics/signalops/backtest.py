from __future__ import annotations

import argparse
import json
from dataclasses import asdict
from pathlib import Path

import pandas as pd

from .detectors import DetectorConfig, collapse_episodes, detect_alerts, score_telemetry
from .diagnostics import rank_causes
from .evaluation import bootstrap_proportion_interval, match_episodes, proportion_interval
from .experiments import experiment_as_dict
from .generator import dataset_checksum, generate_telemetry
from .retrieval import evaluate_retrieval, search


def _rounded(values: dict[str, object]) -> dict[str, object]:
    return {key: round(value, 4) if isinstance(value, float) else value for key, value in values.items()}


def run_backtest(days: int = 210, seed: int = 90426) -> dict[str, object]:
    frame, labels = generate_telemetry(days=days, seed=seed)
    scored = score_telemetry(frame, DetectorConfig())
    warmup_end = frame["timestamp"].min() + pd.Timedelta(days=42)
    test_scored = scored[scored["timestamp"] >= warmup_end].copy()
    test_labels = labels[labels["start"] >= warmup_end].copy()
    detector_results: dict[str, object] = {}
    episode_sets: dict[str, pd.DataFrame] = {}
    for method in ("baseline", "robust_raw", "signalops"):
        episodes = collapse_episodes(detect_alerts(test_scored, method))
        metrics, matches = match_episodes(episodes, test_labels)
        precision_ci = proportion_interval(metrics.true_positives, metrics.true_positives + metrics.false_positives)
        recall_ci = proportion_interval(metrics.true_positives, metrics.true_positives + metrics.false_negatives)
        episode_outcomes = matches["matched"].astype(bool).to_numpy() if len(matches) else []
        matched_ids = set(matches.loc[matches["matched"], "incident_id"].astype(str)) if len(matches) else set()
        incident_outcomes = test_labels["incident_id"].astype(str).isin(matched_ids).to_numpy()
        precision_bootstrap = bootstrap_proportion_interval(episode_outcomes, seed=seed + len(method))
        recall_bootstrap = bootstrap_proportion_interval(incident_outcomes, seed=seed + len(method) + 101)
        category_recall = {}
        for category, group in test_labels.groupby("category", sort=True):
            category_recall[str(category)] = round(float(group["incident_id"].astype(str).isin(matched_ids).mean()), 4)
        per_thousand = metrics.false_positives / (len(test_scored) / 1000)
        detector_results[method] = {
            **_rounded(asdict(metrics)),
            "false_alerts_per_1000_entity_hours": round(per_thousand, 4),
            "precision_ci_95": [round(x, 4) for x in precision_ci],
            "recall_ci_95": [round(x, 4) for x in recall_ci],
            "bootstrap_precision_ci_95": [round(x, 4) for x in precision_bootstrap],
            "bootstrap_recall_ci_95": [round(x, 4) for x in recall_bootstrap],
            "category_recall": category_recall,
        }
        episode_sets[method] = episodes

    signal = detector_results["signalops"]
    baseline = detector_results["baseline"]
    signal_episodes = episode_sets["signalops"]
    incident_cards = []
    for incident in test_labels.sort_values("start", ascending=False).head(8).itertuples():
        episode = signal_episodes[
            (signal_episodes["service"] == incident.service)
            & (signal_episodes["region"] == incident.region)
            & signal_episodes["timestamp"].between(incident.start, incident.end + pd.Timedelta(hours=1))
        ].head(1)
        alert_time = episode.iloc[0]["timestamp"] if len(episode) else incident.start
        incident_cards.append({
            "id": incident.incident_id,
            "service": incident.service,
            "region": incident.region,
            "category": incident.category,
            "severity": incident.severity,
            "status": "investigating" if len(incident_cards) < 2 else "resolved",
            "started_at": incident.start.isoformat(),
            "duration_hours": int((incident.end - incident.start).total_seconds() / 3600 + 1),
            "detected": bool(len(episode)),
            "detected_at": alert_time.isoformat(),
            "top_score": round(float(episode.iloc[0]["score"]), 2) if len(episode) else 0,
            "diagnostics": rank_causes(scored, incident.service, incident.region, alert_time),
            "runbooks": search(incident.category.replace("_", " "), 2),
        })

    retrieval = _rounded(evaluate_retrieval())
    release_passed = bool(
        float(signal["f1"]) > float(baseline["f1"])
        and float(signal["precision"]) >= 0.75
        and float(signal["recall"]) >= 0.8
        and float(retrieval["hit_rate_at_3"]) >= 0.9
    )
    return {
        "benchmark_version": "2026.09",
        "generated_at": "2026-09-04T00:00:00Z",
        "seed": seed,
        "scope": {
            "days": days,
            "warmup_days": 42,
            "test_incidents": len(test_labels),
            "entity_hours": len(test_scored),
            "services": int(frame["service"].nunique()),
            "regions": int(frame["region"].nunique()),
            "telemetry_rows": len(frame),
            "checksum": dataset_checksum(frame, labels),
            "synthetic": True,
        },
        "detectors": detector_results,
        "improvement": {
            "f1_absolute": round(float(signal["f1"]) - float(baseline["f1"]), 4),
            "false_alert_reduction": round(1 - float(signal["false_positives"]) / max(float(baseline["false_positives"]), 1), 4),
            "alert_reduction": round(1 - float(signal["alerts"]) / max(float(baseline["alerts"]), 1), 4),
        },
        "retrieval": retrieval,
        "experiment": _rounded(experiment_as_dict()),
        "incidents": incident_cards,
        "release_gate": {
            "passed": release_passed,
            "criteria": ["F1 exceeds baseline", "precision ≥ 0.75", "recall ≥ 0.80", "retrieval hit@3 ≥ 0.90"],
        },
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, default=Path("artifacts/backtest-results.json"))
    parser.add_argument("--app-output", type=Path, default=Path("app/data/backtest-results.json"))
    args = parser.parse_args()
    result = run_backtest()
    for output in (args.output, args.app_output):
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_text(json.dumps(result, indent=2) + "\n")
    print(json.dumps(result["detectors"], indent=2))
    print(json.dumps(result["improvement"], indent=2))


if __name__ == "__main__":
    main()
