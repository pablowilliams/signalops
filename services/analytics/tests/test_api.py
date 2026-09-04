from fastapi.testclient import TestClient

from signalops.api import app


client = TestClient(app)


def test_health_benchmark_and_security_headers():
    response = client.get("/healthz")
    assert response.status_code == 200
    assert response.json()["benchmark_ready"] is True
    assert response.headers["x-content-type-options"] == "nosniff"
    benchmark = client.get("/v1/benchmarks/latest")
    assert benchmark.json()["release_gate"]["passed"] is True


def test_incident_filter_and_validation():
    critical = client.get("/v1/incidents", params={"severity": "critical"})
    assert critical.status_code == 200
    assert all(row["severity"] == "critical" for row in critical.json())
    invalid = client.post("/v1/experiments/analyze", json={"units": 20})
    assert invalid.status_code == 422
