import pandas as pd

from signalops.contracts import validate
from signalops.generator import generate_telemetry


def test_generated_telemetry_passes_contract():
    frame, _ = generate_telemetry(days=60)
    assert validate(frame) == []


def test_duplicate_event_id_is_rejected():
    frame, _ = generate_telemetry(days=60)
    broken = pd.concat([frame.iloc[:2], frame.iloc[:1]], ignore_index=True)
    assert "event_id must be unique" in validate(broken)
