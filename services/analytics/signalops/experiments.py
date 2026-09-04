from __future__ import annotations

from dataclasses import asdict, dataclass

import numpy as np
from scipy import stats


@dataclass(frozen=True)
class ExperimentResult:
    units: int
    control_mean: float
    treatment_mean: float
    absolute_lift: float
    relative_lift: float
    ci_low: float
    ci_high: float
    p_value: float
    variance_reduction: float
    decision: str


def run_cuped_experiment(units: int = 12000, treatment_effect: float = 0.018, seed: int = 90426) -> ExperimentResult:
    rng = np.random.default_rng(seed)
    assignment = rng.integers(0, 2, units)
    propensity = rng.beta(5, 9, units)
    pre = rng.binomial(12, propensity) / 12
    latent_post = np.clip(0.62 * pre + 0.38 * propensity + assignment * treatment_effect + rng.normal(0, 0.12, units), 0, 1)
    post = rng.binomial(20, latent_post) / 20
    theta = np.cov(post, pre, ddof=1)[0, 1] / np.var(pre, ddof=1)
    adjusted = post - theta * (pre - pre.mean())
    control = adjusted[assignment == 0]
    treatment = adjusted[assignment == 1]
    delta = float(treatment.mean() - control.mean())
    se = float(np.sqrt(control.var(ddof=1) / len(control) + treatment.var(ddof=1) / len(treatment)))
    statistic = delta / se
    degrees = min(len(control), len(treatment)) - 1
    p_value = float(2 * stats.t.sf(abs(statistic), degrees))
    raw_variance = float(post[assignment == 0].var(ddof=1) / len(control) + post[assignment == 1].var(ddof=1) / len(treatment))
    adjusted_variance = se**2
    relative = delta / float(control.mean())
    return ExperimentResult(
        units=units,
        control_mean=float(control.mean()),
        treatment_mean=float(treatment.mean()),
        absolute_lift=delta,
        relative_lift=relative,
        ci_low=delta - 1.96 * se,
        ci_high=delta + 1.96 * se,
        p_value=p_value,
        variance_reduction=1 - adjusted_variance / raw_variance,
        decision="ship" if p_value < 0.05 and delta > 0 else "hold",
    )


def experiment_as_dict(**kwargs: object) -> dict[str, object]:
    return asdict(run_cuped_experiment(**kwargs))
