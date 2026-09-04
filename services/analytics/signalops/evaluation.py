from __future__ import annotations

from dataclasses import dataclass

import numpy as np
import pandas as pd


@dataclass(frozen=True)
class Metrics:
    precision: float
    recall: float
    f1: float
    true_positives: int
    false_positives: int
    false_negatives: int
    alerts: int
    median_delay_hours: float
    mean_delay_hours: float


def match_episodes(episodes: pd.DataFrame, incidents: pd.DataFrame) -> tuple[Metrics, pd.DataFrame]:
    matched_incidents: set[str] = set()
    records: list[dict[str, object]] = []
    for episode in episodes.sort_values("timestamp").itertuples():
        candidates = incidents[
            (incidents["service"] == episode.service)
            & (incidents["region"] == episode.region)
            & (incidents["start"] <= episode.timestamp)
            & (incidents["end"] + pd.Timedelta(hours=1) >= episode.timestamp)
        ]
        unmatched = candidates[~candidates["incident_id"].isin(matched_incidents)]
        if len(unmatched):
            incident = unmatched.sort_values("start").iloc[0]
            matched_incidents.add(str(incident["incident_id"]))
            delay = max(0.0, (episode.timestamp - incident["start"]).total_seconds() / 3600)
            records.append({"episode_id": episode.episode_id, "incident_id": incident["incident_id"], "matched": True, "delay_hours": delay})
        else:
            records.append({"episode_id": episode.episode_id, "incident_id": None, "matched": False, "delay_hours": None})
    matches = pd.DataFrame(records)
    tp = len(matched_incidents)
    fp = len(episodes) - tp
    fn = len(incidents) - tp
    precision = tp / (tp + fp) if tp + fp else 0.0
    recall = tp / (tp + fn) if tp + fn else 0.0
    f1 = 2 * precision * recall / (precision + recall) if precision + recall else 0.0
    delays = matches.loc[matches["matched"], "delay_hours"].astype(float) if len(matches) else pd.Series(dtype=float)
    metrics = Metrics(precision, recall, f1, tp, fp, fn, len(episodes), float(delays.median()) if len(delays) else 0, float(delays.mean()) if len(delays) else 0)
    return metrics, matches


def proportion_interval(successes: int, total: int, z: float = 1.96) -> tuple[float, float]:
    if total == 0:
        return 0.0, 0.0
    proportion = successes / total
    denominator = 1 + z**2 / total
    center = (proportion + z**2 / (2 * total)) / denominator
    margin = z * np.sqrt(proportion * (1 - proportion) / total + z**2 / (4 * total**2)) / denominator
    return max(0.0, center - margin), min(1.0, center + margin)


def bootstrap_proportion_interval(
    outcomes: np.ndarray | list[bool], seed: int = 90426, iterations: int = 4000
) -> tuple[float, float]:
    """Return a deterministic percentile interval over independent event outcomes."""
    values = np.asarray(outcomes, dtype=float)
    if values.size == 0:
        return 0.0, 0.0
    rng = np.random.default_rng(seed)
    samples = rng.choice(values, size=(iterations, values.size), replace=True).mean(axis=1)
    low, high = np.quantile(samples, [0.025, 0.975])
    return float(low), float(high)
