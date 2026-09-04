from __future__ import annotations

import json
import time
import uuid
from pathlib import Path
from typing import Annotated

from fastapi import FastAPI, Header, HTTPException, Request, Response
from pydantic import BaseModel, Field

from .experiments import experiment_as_dict


ROOT = Path(__file__).resolve().parents[3]
BENCHMARK_PATH = ROOT / "artifacts" / "backtest-results.json"
app = FastAPI(title="SignalOps Analytics API", version="1.0.0", docs_url="/docs")
REQUESTS = 0
ERRORS = 0
LATENCY_SECONDS: list[float] = []


class ExperimentRequest(BaseModel):
    units: int = Field(default=12000, ge=1000, le=1_000_000)
    treatment_effect: float = Field(default=0.018, ge=-0.2, le=0.2)
    seed: int = Field(default=90426, ge=0)


def benchmark() -> dict[str, object]:
    if not BENCHMARK_PATH.exists():
        raise HTTPException(503, detail={"code": "BENCHMARK_MISSING", "action": "Run python -m signalops.backtest."})
    return json.loads(BENCHMARK_PATH.read_text())


@app.middleware("http")
async def observe(request: Request, call_next):
    global REQUESTS, ERRORS
    started = time.perf_counter()
    request_id = request.headers.get("x-request-id", str(uuid.uuid4()))[:80]
    REQUESTS += 1
    try:
        response = await call_next(request)
        if response.status_code >= 500:
            ERRORS += 1
    except Exception:
        ERRORS += 1
        raise
    LATENCY_SECONDS.append(time.perf_counter() - started)
    del LATENCY_SECONDS[:-500]
    response.headers["x-request-id"] = request_id
    response.headers["x-content-type-options"] = "nosniff"
    response.headers["cache-control"] = "no-store"
    return response


@app.get("/healthz")
def health() -> dict[str, object]:
    return {"status": "ok", "benchmark_ready": BENCHMARK_PATH.exists(), "version": app.version}


@app.get("/metrics", response_class=Response)
def metrics() -> Response:
    average = sum(LATENCY_SECONDS) / len(LATENCY_SECONDS) if LATENCY_SECONDS else 0
    buckets = (0.01, 0.05, 0.1, 0.25, 0.5, 1.0)
    histogram = [f'signalops_http_latency_seconds_bucket{{le="{bound}"}} {sum(value <= bound for value in LATENCY_SECONDS)}' for bound in buckets]
    histogram.append(f'signalops_http_latency_seconds_bucket{{le="+Inf"}} {len(LATENCY_SECONDS)}')
    body = "\n".join((
        "# HELP signalops_http_requests_total Total API requests.",
        "# TYPE signalops_http_requests_total counter",
        f"signalops_http_requests_total {REQUESTS}",
        "# HELP signalops_http_errors_total Total server errors.",
        "# TYPE signalops_http_errors_total counter",
        f"signalops_http_errors_total {ERRORS}",
        "# HELP signalops_http_latency_seconds_mean Rolling mean request latency.",
        "# TYPE signalops_http_latency_seconds_mean gauge",
        f"signalops_http_latency_seconds_mean {average:.6f}",
        "# HELP signalops_http_latency_seconds Request latency histogram over the latest 500 requests.",
        "# TYPE signalops_http_latency_seconds histogram",
        *histogram,
        f"signalops_http_latency_seconds_count {len(LATENCY_SECONDS)}",
        f"signalops_http_latency_seconds_sum {sum(LATENCY_SECONDS):.6f}",
    )) + "\n"
    return Response(body, media_type="text/plain; version=0.0.4")


@app.get("/v1/benchmarks/latest")
def latest_benchmark() -> dict[str, object]:
    return benchmark()


@app.get("/v1/incidents")
def incidents(severity: str | None = None) -> list[dict[str, object]]:
    rows = benchmark()["incidents"]
    assert isinstance(rows, list)
    return [row for row in rows if not severity or row.get("severity") == severity]


@app.get("/v1/incidents/{incident_id}")
def incident(incident_id: str) -> dict[str, object]:
    for row in incidents():
        if row.get("id") == incident_id:
            return row
    raise HTTPException(404, detail={"code": "INCIDENT_NOT_FOUND", "action": "Refresh the incident queue."})


@app.post("/v1/experiments/analyze")
def analyze_experiment(payload: ExperimentRequest, idempotency_key: Annotated[str | None, Header()] = None) -> dict[str, object]:
    return {"idempotency_key": idempotency_key, **experiment_as_dict(units=payload.units, treatment_effect=payload.treatment_effect, seed=payload.seed)}
