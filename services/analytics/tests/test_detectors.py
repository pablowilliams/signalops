import pandas as pd

from signalops.detectors import score_telemetry
from signalops.generator import generate_telemetry


def test_current_value_does_not_change_its_own_expectation():
    frame, _ = generate_telemetry(days=70)
    scored = score_telemetry(frame)
    target_index = scored[(scored.service == "checkout") & (scored.region == "eu-west")].index[-10]
    changed = frame.copy()
    changed.loc[target_index, "requests"] *= 100
    rescored = score_telemetry(changed)
    # A huge current change must alter the score, proving the expectation did not absorb itself.
    assert abs(rescored.loc[target_index, "robust_requests"]) > abs(scored.loc[target_index, "robust_requests"]) + 50


def test_scores_are_cold_start_safe():
    frame, _ = generate_telemetry(days=70)
    scored = score_telemetry(frame)
    early = scored[scored.timestamp < scored.timestamp.min() + pd.Timedelta(days=7)]
    assert not early.filter(like="robust_").isna().any().any()
