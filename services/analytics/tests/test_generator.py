import pandas as pd

from signalops.generator import dataset_checksum, generate_telemetry


def test_generator_is_deterministic_and_labels_are_separate():
    first, first_labels = generate_telemetry(days=70, seed=90426)
    second, second_labels = generate_telemetry(days=70, seed=90426)
    assert dataset_checksum(first, first_labels) == dataset_checksum(second, second_labels)
    assert "incident_id" not in first.columns
    assert len(first) == 70 * 24 * 4 * 3
    assert set(first_labels["category"]) == {"error_spike", "latency_regression", "traffic_drop", "revenue_drop"}


def test_incidents_begin_after_warmup():
    frame, labels = generate_telemetry()
    assert labels["start"].min() >= frame["timestamp"].min() + pd.Timedelta(days=40)
