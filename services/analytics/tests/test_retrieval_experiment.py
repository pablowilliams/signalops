from signalops.experiments import run_cuped_experiment
from signalops.retrieval import evaluate_retrieval, search


def test_retrieval_gate_and_citations():
    evaluation = evaluate_retrieval()
    assert evaluation["hit_rate_at_3"] >= 0.9
    result = search("tail latency and saturation in one region")[0]
    assert result["citation"].startswith("RB-")


def test_cuped_recovers_positive_effect_and_reduces_variance():
    result = run_cuped_experiment()
    assert result.decision == "ship"
    assert result.ci_low > 0
    assert result.variance_reduction > 0.35
