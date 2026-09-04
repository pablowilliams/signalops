"use client";

import { useEffect, useState } from "react";
import benchmarkData from "./data/backtest-results.json";

type View = "overview" | "incidents" | "pipelines" | "benchmark" | "evaluation";
type Incident = (typeof benchmarkData.incidents)[number];
type Action = {
  incidentId: string;
  status: string;
  note: string;
  updatedAt: number;
};
type Workspace = {
  mode: "connecting" | "connected" | "demo";
  user?: { displayName: string; email: string };
  actions: Action[];
  runs: Array<{ id: string; createdAt: number }>;
};

const labels: Record<View, string> = {
  overview: "Overview",
  incidents: "Incidents",
  pipelines: "Pipelines",
  benchmark: "Detection benchmark",
  evaluation: "AI evaluation",
};
const icons: Record<View, string> = {
  overview: "⌂",
  incidents: "!",
  pipelines: "↳",
  benchmark: "∆",
  evaluation: "◎",
};
const benchmark = benchmarkData;
const dateOnly = (value: string) =>
  new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
const dateTime = (value: string) =>
  new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "UTC",
  });

function Status({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: string;
}) {
  return (
    <span className={`status ${tone}`}>
      <i />
      {children}
    </span>
  );
}
function Logo() {
  return (
    <div className="logo">
      <span>S</span>
      <strong>SignalOps</strong>
    </div>
  );
}

function MetricChart({ incident }: { incident: Incident }) {
  const points = Array.from({ length: 48 }, (_, index) => {
    const expected =
      58 +
      13 * Math.sin(((index - 8) * Math.PI) / 12) +
      4 * Math.sin((index * Math.PI) / 6);
    const impact =
      index >= 31 && index <= 35
        ? incident.category.includes("drop")
          ? -24
          : 26
        : 0;
    return {
      expected: Number(expected.toFixed(4)),
      observed: Number(
        (expected + 2 * Math.sin(index * 1.7) + impact).toFixed(4),
      ),
    };
  });
  const path = (field: "expected" | "observed") =>
    points
      .map(
        (point, index) =>
          `${index === 0 ? "M" : "L"} ${(index * (720 / 47)).toFixed(2)} ${(170 - point[field] * 1.8).toFixed(2)}`,
      )
      .join(" ");
  return (
    <div className="chart-wrap">
      <div className="chart-head">
        <div>
          <span>Observed vs seasonal expectation</span>
          <strong>{incident.category.replaceAll("_", " ")}</strong>
        </div>
        <div className="legend">
          <span>
            <i className="actual" />
            Observed
          </span>
          <span>
            <i />
            Expected
          </span>
        </div>
      </div>
      <svg
        viewBox="0 0 720 190"
        role="img"
        aria-label="Observed metric diverges from the seasonal expectation during the selected incident"
      >
        <g className="grid-lines">
          {[30, 70, 110, 150].map((y) => (
            <line key={y} x1="0" x2="720" y1={y} y2={y} />
          ))}
        </g>
        <rect
          className="incident-band"
          x="468"
          y="12"
          width="92"
          height="158"
          rx="3"
        />
        <path className="expected-line" d={path("expected")} />
        <path className="actual-line" d={path("observed")} />
        <circle
          className="chart-point"
          cx="505"
          cy={170 - points[33].observed * 1.8}
          r="4"
        />
      </svg>
      <div className="chart-axis">
        <span>48 hours ago</span>
        <span>Incident window</span>
        <span>Now</span>
      </div>
    </div>
  );
}

function IncidentTable({
  incidents,
  selected,
  select,
}: {
  incidents: Incident[];
  selected: string;
  select: (incident: Incident) => void;
}) {
  return (
    <div className="incident-table">
      <table>
        <thead>
          <tr>
            <th>Incident</th>
            <th>Service</th>
            <th>Region</th>
            <th>Signal</th>
            <th>Severity</th>
            <th>Detected</th>
          </tr>
        </thead>
        <tbody>
          {incidents.map((item) => (
            <tr
              key={item.id}
              className={selected === item.id ? "selected" : ""}
              onClick={() => select(item)}
            >
              <td>
                <button onClick={() => select(item)}>{item.id}</button>
              </td>
              <td>
                <strong>{item.service}</strong>
              </td>
              <td>{item.region}</td>
              <td>{item.category.replaceAll("_", " ")}</td>
              <td>
                <Status tone={item.severity}>{item.severity}</Status>
              </td>
              <td>{dateOnly(item.detected_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EvidencePanel({
  incident,
  action,
  save,
}: {
  incident: Incident;
  action?: Action;
  save: (status: string, note: string) => Promise<void>;
}) {
  const [note, setNote] = useState(action?.note || "");
  const [saving, setSaving] = useState(false);
  return (
    <aside className="evidence-panel">
      <div className="evidence-title">
        <div>
          <Status tone={incident.severity}>{incident.severity}</Status>
          <h2>{incident.id}</h2>
          <p>
            {incident.service} · {incident.region}
          </p>
        </div>
        <button className="icon-btn" aria-label="More incident actions">
          •••
        </button>
      </div>
      <div className="evidence-meta">
        <div>
          <span>Detected</span>
          <b>{dateTime(incident.detected_at)}</b>
        </div>
        <div>
          <span>Duration</span>
          <b>{incident.duration_hours} hours</b>
        </div>
        <div>
          <span>Peak score</span>
          <b>{incident.top_score.toFixed(1)}σ</b>
        </div>
      </div>
      <section>
        <div className="section-head">
          <h3>Ranked evidence</h3>
          <span>not causal proof</span>
        </div>
        {incident.diagnostics.slice(0, 2).map((item, index) => (
          <article className="cause" key={item.metric}>
            <span>{index + 1}</span>
            <div>
              <div>
                <strong>{item.title}</strong>
                <b>{item.score.toFixed(1)}σ</b>
              </div>
              <p>{item.evidence}</p>
              <small>{item.next_step}</small>
            </div>
          </article>
        ))}
      </section>
      <section>
        <div className="section-head">
          <h3>Runbook match</h3>
          <span>{incident.runbooks[0].citation}</span>
        </div>
        <div className="runbook">
          <strong>{incident.runbooks[0].title}</strong>
          <p>{incident.runbooks[0].excerpt}</p>
          <button>Open cited section →</button>
        </div>
      </section>
      <section>
        <div className="section-head">
          <h3>Analyst record</h3>
          <Status tone={action?.status === "resolved" ? "resolved" : "active"}>
            {action?.status || "open"}
          </Status>
        </div>
        <textarea
          aria-label="Incident note"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Add what you checked, ruled out, or escalated…"
        />
        <div className="record-actions">
          <button
            className="button secondary"
            onClick={async () => {
              setSaving(true);
              await save("investigating", note);
              setSaving(false);
            }}
          >
            {saving ? "Saving…" : "Save note"}
          </button>
          <button
            className="button primary"
            onClick={() => save("resolved", note)}
          >
            Resolve incident
          </button>
        </div>
      </section>
    </aside>
  );
}

function Overview({
  selected,
  setSelected,
  actions,
  save,
}: {
  selected: Incident;
  setSelected: (i: Incident) => void;
  actions: Action[];
  save: (s: string, n: string) => Promise<void>;
}) {
  return (
    <>
      <div className="page-title">
        <div>
          <span>Operations / Live monitor</span>
          <h1>Service health</h1>
          <p>Prioritized anomalies across product and data systems.</p>
        </div>
        <div className="title-actions">
          <button className="button secondary">Last 24 hours⌄</button>
          <button className="button primary">Create monitor</button>
        </div>
      </div>
      <div className="kpi-grid">
        <div>
          <span>Open incidents</span>
          <strong>2</strong>
          <small>
            <b className="down">−3</b> since yesterday
          </small>
        </div>
        <div>
          <span>Healthy services</span>
          <strong>11 / 12</strong>
          <small>91.7% within SLO</small>
        </div>
        <div>
          <span>False alert rate</span>
          <strong>
            {benchmark.detectors.signalops.false_alerts_per_1000_entity_hours.toFixed(
              2,
            )}
          </strong>
          <small>per 1,000 entity-hours</small>
        </div>
        <div>
          <span>Detection delay</span>
          <strong>
            {benchmark.detectors.signalops.median_delay_hours.toFixed(1)}h
          </strong>
          <small>median on holdout</small>
        </div>
      </div>
      <div className="investigation-grid">
        <main>
          <section className="panel chart-panel">
            <MetricChart incident={selected} />
          </section>
          <section className="panel queue">
            <div className="panel-header">
              <div>
                <h2>Incident queue</h2>
                <p>Sorted by severity and recency</p>
              </div>
              <button className="quiet-button">
                View all {benchmark.incidents.length}
              </button>
            </div>
            <IncidentTable
              incidents={benchmark.incidents.slice(0, 5)}
              selected={selected.id}
              select={setSelected}
            />
          </section>
        </main>
        <EvidencePanel
          incident={selected}
          action={actions.find((item) => item.incidentId === selected.id)}
          save={save}
        />
      </div>
    </>
  );
}

function IncidentsView({
  selected,
  setSelected,
  actions,
  save,
}: {
  selected: Incident;
  setSelected: (i: Incident) => void;
  actions: Action[];
  save: (s: string, n: string) => Promise<void>;
}) {
  const [severity, setSeverity] = useState("all");
  const filtered =
    severity === "all"
      ? benchmark.incidents
      : benchmark.incidents.filter((item) => item.severity === severity);
  return (
    <>
      <div className="page-title">
        <div>
          <span>Operations / Incident catalogue</span>
          <h1>Incidents</h1>
          <p>Review, document, and resolve every detector episode.</p>
        </div>
        <div className="segmented">
          {["all", "critical", "high", "medium"].map((value) => (
            <button
              key={value}
              className={severity === value ? "active" : ""}
              onClick={() => setSeverity(value)}
            >
              {value}
            </button>
          ))}
        </div>
      </div>
      <div className="catalogue-grid">
        <section className="panel queue">
          <div className="panel-header">
            <div>
              <h2>{filtered.length} incidents</h2>
              <p>
                Deterministic holdout dataset · checksum{" "}
                {benchmark.scope.checksum}
              </p>
            </div>
          </div>
          <IncidentTable
            incidents={filtered}
            selected={selected.id}
            select={setSelected}
          />
        </section>
        <EvidencePanel
          incident={selected}
          action={actions.find((item) => item.incidentId === selected.id)}
          save={save}
        />
      </div>
    </>
  );
}

function BenchmarkView({
  run,
  running,
  lastRun,
}: {
  run: () => Promise<void>;
  running: boolean;
  lastRun?: { id: string; createdAt: number };
}) {
  const base = benchmark.detectors.baseline,
    sig = benchmark.detectors.signalops;
  const rows = [
    { label: "Precision", base: base.precision, sig: sig.precision },
    { label: "Recall", base: base.recall, sig: sig.recall },
    { label: "F1 score", base: base.f1, sig: sig.f1 },
  ];
  return (
    <>
      <div className="page-title">
        <div>
          <span>Quality / Detector evaluation</span>
          <h1>Release benchmark</h1>
          <p>
            Event-level scoring on an untouched synthetic holdout with
            deliberately unlabelled disturbances.
          </p>
        </div>
        <button className="button primary" onClick={run} disabled={running}>
          {running ? "Running benchmark…" : "Run reproducible benchmark"}
        </button>
      </div>
      <div className="gate-banner">
        <div className="gate-icon">✓</div>
        <div>
          <span>Release gate passed</span>
          <strong>
            SignalOps improves F1 by{" "}
            {(benchmark.improvement.f1_absolute * 100).toFixed(1)} percentage
            points
          </strong>
          <p>
            Version {benchmark.benchmark_version} · seed {benchmark.seed} ·{" "}
            {benchmark.scope.checksum}
          </p>
        </div>
        <div>
          <span>Last persisted run</span>
          <strong>
            {lastRun
              ? new Date(lastRun.createdAt).toLocaleString()
              : "Not run in this workspace"}
          </strong>
        </div>
      </div>
      <div className="benchmark-grid">
        <section className="panel benchmark-card">
          <div className="panel-header">
            <div>
              <h2>Detector comparison</h2>
              <p>Higher is better</p>
            </div>
            <Status tone="resolved">holdout</Status>
          </div>
          <div className="comparison-head">
            <span />
            <b>Rolling z-score</b>
            <b>SignalOps</b>
          </div>
          {rows.map((row) => (
            <div className="comparison-row" key={row.label}>
              <strong>{row.label}</strong>
              <div>
                <span style={{ width: `${row.base * 100}%` }} />
                <b>{(row.base * 100).toFixed(1)}%</b>
              </div>
              <div className="signal">
                <span style={{ width: `${row.sig * 100}%` }} />
                <b>{(row.sig * 100).toFixed(1)}%</b>
              </div>
            </div>
          ))}
        </section>
        <section className="panel method-card">
          <div className="panel-header">
            <div>
              <h2>Evaluation scope</h2>
              <p>Locked before the holdout run</p>
            </div>
          </div>
          <dl>
            <dt>Telemetry</dt>
            <dd>{benchmark.scope.telemetry_rows.toLocaleString()} rows</dd>
            <dt>Monitored entities</dt>
            <dd>
              {benchmark.scope.services * benchmark.scope.regions}{" "}
              service-regions
            </dd>
            <dt>Test incidents</dt>
            <dd>{benchmark.scope.test_incidents}</dd>
            <dt>Warm-up</dt>
            <dd>{benchmark.scope.warmup_days} days</dd>
            <dt>Precision 95% CI</dt>
            <dd>
              {(sig.precision_ci_95[0] * 100).toFixed(1)}–
              {(sig.precision_ci_95[1] * 100).toFixed(1)}%
            </dd>
            <dt>Recall 95% CI</dt>
            <dd>
              {(sig.recall_ci_95[0] * 100).toFixed(1)}–
              {(sig.recall_ci_95[1] * 100).toFixed(1)}%
            </dd>
          </dl>
          <p className="method-note">
            Ground truth is stored separately from detector features. Current
            observations never enter their own seasonal expectation.
          </p>
        </section>
      </div>
      <section className="panel ablation">
        <div className="panel-header">
          <div>
            <h2>Ablation study</h2>
            <p>Why the production rule performs better</p>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Variant</th>
              <th>Precision</th>
              <th>Recall</th>
              <th>F1</th>
              <th>False positives</th>
            </tr>
          </thead>
          <tbody>
            {[
              ["Rolling z-score", base],
              ["Seasonal median/MAD", benchmark.detectors.robust_raw],
              ["+ persistence & corroboration", sig],
            ].map(([label, metrics]) => (
              <tr key={label as string}>
                <td>{label as string}</td>
                <td>{((metrics as typeof sig).precision * 100).toFixed(1)}%</td>
                <td>{((metrics as typeof sig).recall * 100).toFixed(1)}%</td>
                <td>
                  <strong>
                    {((metrics as typeof sig).f1 * 100).toFixed(1)}%
                  </strong>
                </td>
                <td>{(metrics as typeof sig).false_positives}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}

function PipelinesView() {
  const stages = [
    ["01", "Ingest", "Succeeded", "60,480 rows", "18s"],
    ["02", "Contract gate", "Succeeded", "0 invalid", "4s"],
    ["03", "dbt build", "Succeeded", "7 models", "31s"],
    ["04", "Detect", "Succeeded", "33 episodes", "12s"],
    ["05", "Evaluate", "Succeeded", "4 gates", "6s"],
    ["06", "Publish", "Succeeded", "v2026.09", "3s"],
  ];
  return (
    <>
      <div className="page-title">
        <div>
          <span>Platform / Orchestration</span>
          <h1>Hourly pipeline</h1>
          <p>
            Idempotent ingestion, transformation, detection, and quality gates.
          </p>
        </div>
        <button className="button secondary">Open run details</button>
      </div>
      <div className="pipeline-summary">
        <div>
          <Status tone="resolved">Succeeded</Status>
          <h2>signalops_hourly</h2>
          <p>Scheduled hourly at :15 · completed in 1m 14s</p>
        </div>
        <div>
          <span>Data interval</span>
          <strong>2026-09-04 14:00 UTC</strong>
        </div>
        <div>
          <span>Next run</span>
          <strong>in 32 minutes</strong>
        </div>
      </div>
      <section className="pipeline-flow">
        {stages.map((stage, index) => (
          <article key={stage[0]}>
            <div className="stage-index">{stage[0]}</div>
            <div>
              <span>{stage[1]}</span>
              <strong>{stage[2]}</strong>
              <small>
                {stage[3]} · {stage[4]}
              </small>
            </div>
            {index < stages.length - 1 && <i />}
          </article>
        ))}
      </section>
      <div className="pipeline-grid">
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Quality contract</h2>
              <p>Blocking assertions before detection</p>
            </div>
            <Status tone="resolved">12 / 12 passed</Status>
          </div>
          <div className="checks">
            {[
              ["Freshness", "Latest partition under 2 hours", "34m"],
              ["Unique grain", "timestamp + service + region", "100%"],
              ["Completeness", "Required measures populated", "99.92%"],
              ["Accepted values", "Known service and region codes", "100%"],
              ["Volume drift", "Within expected ingest range", "+1.8%"],
            ].map((row) => (
              <div key={row[0]}>
                <span>✓</span>
                <strong>{row[0]}</strong>
                <p>{row[1]}</p>
                <b>{row[2]}</b>
              </div>
            ))}
          </div>
        </section>
        <section className="panel lineage">
          <div className="panel-header">
            <div>
              <h2>Lineage</h2>
              <p>Current published path</p>
            </div>
          </div>
          {[
            "raw.telemetry",
            "stg_telemetry",
            "fct_service_health_hourly",
            "incident_features",
            "published_incidents",
          ].map((name, index) => (
            <div key={name}>
              <span>{index + 1}</span>
              <code>{name}</code>
              {index < 4 && <i>↓</i>}
            </div>
          ))}
        </section>
      </div>
    </>
  );
}

function EvaluationView() {
  const experiment = benchmark.experiment,
    retrieval = benchmark.retrieval;
  return (
    <>
      <div className="page-title">
        <div>
          <span>Quality / Applied AI</span>
          <h1>Evaluation registry</h1>
          <p>
            Retrieval and decision-science checks are measured separately from
            detector quality.
          </p>
        </div>
        <button className="button secondary">Export evidence pack</button>
      </div>
      <div className="evaluation-grid">
        <section className="panel eval-card">
          <div className="eval-title">
            <span>RAG-RET-04</span>
            <Status tone="resolved">Passed</Status>
          </div>
          <h2>Runbook retrieval</h2>
          <p>
            Ten paraphrased incident questions evaluated against five curated
            runbooks.
          </p>
          <div className="eval-metrics">
            <div>
              <strong>{(retrieval.hit_rate_at_1 * 100).toFixed(0)}%</strong>
              <span>Hit rate @ 1</span>
            </div>
            <div>
              <strong>{(retrieval.hit_rate_at_3 * 100).toFixed(0)}%</strong>
              <span>Hit rate @ 3</span>
            </div>
            <div>
              <strong>{retrieval.mrr.toFixed(2)}</strong>
              <span>MRR</span>
            </div>
          </div>
          <div className="threshold">
            <span>Release threshold</span>
            <div>
              <i style={{ width: `${retrieval.hit_rate_at_3 * 100}%` }} />
            </div>
            <b>≥ 90%</b>
          </div>
          <small>
            Every generated recommendation is paired with a runbook ID and
            section citation.
          </small>
        </section>
        <section className="panel eval-card">
          <div className="eval-title">
            <span>EXP-CUPED-02</span>
            <Status tone="resolved">Passed</Status>
          </div>
          <h2>Experiment recovery</h2>
          <p>
            Known treatment effect recovered from a seeded 12,000-unit
            experiment.
          </p>
          <div className="eval-metrics">
            <div>
              <strong>+{(experiment.absolute_lift * 100).toFixed(2)}pp</strong>
              <span>Estimated lift</span>
            </div>
            <div>
              <strong>
                {(experiment.variance_reduction * 100).toFixed(1)}%
              </strong>
              <span>Variance reduction</span>
            </div>
            <div>
              <strong>{(experiment.relative_lift * 100).toFixed(1)}%</strong>
              <span>Relative lift</span>
            </div>
          </div>
          <div className="confidence">
            <span>{(experiment.ci_low * 100).toFixed(2)}pp</span>
            <div>
              <i />
              <b style={{ left: `52%` }} />
            </div>
            <span>{(experiment.ci_high * 100).toFixed(2)}pp</span>
          </div>
          <small>
            CUPED adjustment uses only the pre-period covariate; the confidence
            interval excludes zero.
          </small>
        </section>
      </div>
      <section className="panel evaluation-table">
        <div className="panel-header">
          <div>
            <h2>Evaluation dimensions</h2>
            <p>
              Independent gates prevent one strong metric from hiding another
              failure mode
            </p>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>System</th>
              <th>Dataset</th>
              <th>Primary metric</th>
              <th>Result</th>
              <th>Threshold</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Incident detector</td>
              <td>HOLDOUT-2026.09</td>
              <td>F1</td>
              <td>90.6%</td>
              <td>≥ 75%</td>
              <td>
                <Status tone="resolved">Passed</Status>
              </td>
            </tr>
            <tr>
              <td>Runbook retrieval</td>
              <td>RUNBOOK-QA-10</td>
              <td>Hit rate @ 3</td>
              <td>90.0%</td>
              <td>≥ 90%</td>
              <td>
                <Status tone="resolved">Passed</Status>
              </td>
            </tr>
            <tr>
              <td>Experiment estimator</td>
              <td>CUPED-12K</td>
              <td>Effect recovery</td>
              <td>+2.23pp</td>
              <td>CI excludes 0</td>
              <td>
                <Status tone="resolved">Passed</Status>
              </td>
            </tr>
            <tr>
              <td>Data contracts</td>
              <td>TELEMETRY-V1</td>
              <td>Assertions</td>
              <td>12 / 12</td>
              <td>100%</td>
              <td>
                <Status tone="resolved">Passed</Status>
              </td>
            </tr>
          </tbody>
        </table>
      </section>
    </>
  );
}

export function SignalOpsApp() {
  const [view, setView] = useState<View>("overview");
  const [selected, setSelected] = useState<Incident>(benchmark.incidents[0]);
  const [workspace, setWorkspace] = useState<Workspace>({
    mode: "connecting",
    actions: [],
    runs: [],
  });
  const [running, setRunning] = useState(false);
  useEffect(() => {
    fetch("/api/v1/workspace")
      .then(async (response) => {
        if (!response.ok) throw new Error();
        return response.json();
      })
      .then((data) =>
        setWorkspace({
          mode: "connected",
          user: data.user,
          actions: data.actions || [],
          runs: data.runs || [],
        }),
      )
      .catch(() => setWorkspace({ mode: "demo", actions: [], runs: [] }));
  }, []);
  const save = async (status: string, note: string) => {
    const action = {
      incidentId: selected.id,
      status,
      note,
      updatedAt: Date.now(),
    };
    setWorkspace((current) => ({
      ...current,
      actions: [
        action,
        ...current.actions.filter((item) => item.incidentId !== selected.id),
      ],
    }));
    if (workspace.mode === "connected")
      await fetch("/api/v1/workspace", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "incident", ...action }),
      });
  };
  const run = async () => {
    setRunning(true);
    try {
      if (workspace.mode === "connected") {
        const response = await fetch("/api/v1/workspace", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ action: "benchmark" }),
        });
        const data = await response.json();
        setWorkspace((current) => ({
          ...current,
          runs: [{ id: data.id, createdAt: Date.now() }, ...current.runs],
        }));
      } else await new Promise((resolve) => setTimeout(resolve, 700));
    } finally {
      setRunning(false);
    }
  };
  const content =
    view === "overview" ? (
      <Overview
        selected={selected}
        setSelected={setSelected}
        actions={workspace.actions}
        save={save}
      />
    ) : view === "incidents" ? (
      <IncidentsView
        selected={selected}
        setSelected={setSelected}
        actions={workspace.actions}
        save={save}
      />
    ) : view === "pipelines" ? (
      <PipelinesView />
    ) : view === "benchmark" ? (
      <BenchmarkView run={run} running={running} lastRun={workspace.runs[0]} />
    ) : (
      <EvaluationView />
    );
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Logo />
        <div className="workspace-switch">
          <span>OP</span>
          <div>
            <strong>Operations</strong>
            <small>Production workspace</small>
          </div>
          <b>⌄</b>
        </div>
        <nav aria-label="SignalOps navigation">
          <p>Monitor</p>
          {(["overview", "incidents"] as View[]).map((item) => (
            <button
              key={item}
              className={view === item ? "active" : ""}
              onClick={() => setView(item)}
            >
              <span>{icons[item]}</span>
              {labels[item]}
              {item === "incidents" && <b>2</b>}
            </button>
          ))}
          <p>Platform</p>
          {(["pipelines", "benchmark", "evaluation"] as View[]).map((item) => (
            <button
              key={item}
              className={view === item ? "active" : ""}
              onClick={() => setView(item)}
            >
              <span>{icons[item]}</span>
              {labels[item]}
            </button>
          ))}
        </nav>
        <div className="sidebar-foot">
          <div className="health">
            <i />
            All systems operational
          </div>
          <div className="profile">
            <span>
              {workspace.user?.displayName?.slice(0, 2).toUpperCase() || "PR"}
            </span>
            <div>
              <strong>
                {workspace.user?.displayName || "Portfolio reviewer"}
              </strong>
              <small>
                {workspace.mode === "connected"
                  ? "Durable workspace"
                  : workspace.mode === "connecting"
                    ? "Connecting…"
                    : "Read-only demo"}
              </small>
            </div>
          </div>
        </div>
      </aside>
      <main className="workspace">
        <header>
          <div>
            <button className="crumb" onClick={() => setView("overview")}>
              SignalOps
            </button>
            <span>/</span>
            <strong>{labels[view]}</strong>
          </div>
          <div>
            <button className="search-button">
              ⌕ <span>Search incidents</span>
              <kbd>⌘ K</kbd>
            </button>
            <button className="header-icon" aria-label="Documentation">
              ?
            </button>
            <button className="header-icon" aria-label="Notifications">
              ○
            </button>
          </div>
        </header>
        <div className="content">{content}</div>
      </main>
    </div>
  );
}
