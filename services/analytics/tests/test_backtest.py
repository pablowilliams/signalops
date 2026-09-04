from signalops.backtest import run_backtest


def test_holdout_release_gate_and_expected_scope():
    result = run_backtest()
    signal = result["detectors"]["signalops"]
    assert result["release_gate"]["passed"] is True
    assert result["scope"]["test_incidents"] == 31
    assert result["scope"]["telemetry_rows"] == 60480
    assert signal["precision"] >= 0.85
    assert signal["recall"] >= 0.90
    assert signal["f1"] > result["detectors"]["baseline"]["f1"]
    assert result["improvement"]["false_alert_reduction"] > 0.90
    assert result["retrieval"]["hit_rate_at_3"] >= 0.90
    assert len(signal["bootstrap_precision_ci_95"]) == 2
    assert set(signal["category_recall"]) == {"error_spike", "latency_regression", "revenue_drop", "traffic_drop"}


def test_backtest_is_reproducible():
    first = run_backtest()
    second = run_backtest()
    assert first["scope"]["checksum"] == second["scope"]["checksum"]
    assert first["detectors"] == second["detectors"]
