"use client";

import {
  Activity,
  AlertTriangle,
  Bell,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleGauge,
  Clock3,
  Command,
  Database,
  Download,
  FileCheck2,
  Filter,
  GitBranch,
  HelpCircle,
  Home,
  Layers3,
  Menu,
  MoreHorizontal,
  Network,
  Play,
  Plus,
  Search,
  ServerCog,
  ShieldCheck,
  Sparkles,
  X,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
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
type Toast = { title: string; detail: string } | null;

const benchmark = benchmarkData;
const nav: Array<{
  id: View;
  label: string;
  group: string;
  icon: typeof Home;
}> = [
  { id: "overview", label: "Overview", group: "Monitor", icon: Home },
  {
    id: "incidents",
    label: "Incidents",
    group: "Monitor",
    icon: AlertTriangle,
  },
  { id: "pipelines", label: "Pipelines", group: "Platform", icon: GitBranch },
  {
    id: "benchmark",
    label: "Detection benchmark",
    group: "Quality",
    icon: CircleGauge,
  },
  {
    id: "evaluation",
    label: "AI evaluation",
    group: "Quality",
    icon: Sparkles,
  },
];
const labels = Object.fromEntries(
  nav.map((item) => [item.id, item.label]),
) as Record<View, string>;
const dateOnly = (value: string) =>
  new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
const dateTime = (value: string | number) =>
  new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "UTC",
  });
const pct = (value: number, digits = 1) => `${(value * 100).toFixed(digits)}%`;
const titleCase = (value: string) =>
  value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

function Status({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: string;
}) {
  return (
    <span className={`status status-${tone}`}>
      <i />
      {children}
    </span>
  );
}

function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`brand ${compact ? "brand-compact" : ""}`}>
      <span>
        <Activity size={17} strokeWidth={2.5} />
      </span>
      {!compact && (
        <div>
          <strong>SignalOps</strong>
          <small>Incident intelligence</small>
        </div>
      )}
    </div>
  );
}

function EmptyState({ query }: { query: string }) {
  return (
    <div className="empty-state">
      <Search size={26} />
      <strong>No incidents found</strong>
      <p>Nothing matches “{query}”. Clear a filter or try a service name.</p>
    </div>
  );
}

function MetricChart({ incident }: { incident: Incident }) {
  const points = Array.from({ length: 64 }, (_, index) => {
    const expected =
      57 +
      12 * Math.sin(((index - 10) * Math.PI) / 16) +
      3 * Math.sin((index * Math.PI) / 8);
    const impact =
      index >= 42 && index <= 47
        ? incident.category.includes("drop")
          ? -23
          : 24
        : 0;
    return {
      expected: Number(expected.toFixed(4)),
      observed: Number(
        (expected + 1.7 * Math.sin(index * 1.4) + impact).toFixed(4),
      ),
    };
  });
  const path = (field: "expected" | "observed") =>
    points
      .map(
        (point, index) =>
          `${index ? "L" : "M"} ${(index * (840 / 63)).toFixed(2)} ${(188 - point[field] * 1.9).toFixed(2)}`,
      )
      .join(" ");
  const area = `${path("observed")} L 840 205 L 0 205 Z`;
  return (
    <div className="signal-card panel">
      <div className="panel-heading chart-heading">
        <div>
          <div className="eyebrow">Primary signal · Revenue</div>
          <h2>Observed vs seasonal expectation</h2>
        </div>
        <div className="chart-legend">
          <span>
            <i className="legend-live" />
            Observed
          </span>
          <span>
            <i className="legend-base" />
            Expected
          </span>
        </div>
      </div>
      <div className="chart-summary">
        <div>
          <strong>{titleCase(incident.category)}</strong>
          <span>
            {incident.service} / {incident.region}
          </span>
        </div>
        <div className="score-chip">
          <Zap size={13} />
          Peak {incident.top_score.toFixed(1)}σ
        </div>
      </div>
      <div className="chart-canvas">
        <svg
          viewBox="0 0 840 215"
          role="img"
          aria-label={`Observed signal diverges from the seasonal expectation during ${incident.id}`}
        >
          <defs>
            <linearGradient id="signal-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#477ff0" stopOpacity=".18" />
              <stop offset="1" stopColor="#477ff0" stopOpacity="0" />
            </linearGradient>
          </defs>
          <g className="chart-grid">
            {[35, 80, 125, 170].map((y) => (
              <line key={y} x1="0" x2="840" y1={y} y2={y} />
            ))}
          </g>
          <rect
            className="incident-window"
            x="550"
            y="10"
            width="96"
            height="185"
            rx="8"
          />
          <path className="signal-area" d={area} />
          <path className="expected-path" d={path("expected")} />
          <path className="observed-path" d={path("observed")} />
          <line className="event-line" x1="606" x2="606" y1="12" y2="194" />
          <circle
            className="event-dot"
            cx="606"
            cy={188 - points[45].observed * 1.9}
            r="5"
          />
        </svg>
        <div className="event-label">Incident detected · +1h</div>
      </div>
      <div className="chart-axis">
        <span>48 hours before</span>
        <span>Incident window</span>
        <span>12 hours after</span>
      </div>
    </div>
  );
}

function IncidentRows({
  incidents,
  selected,
  select,
}: {
  incidents: Incident[];
  selected: string;
  select: (incident: Incident) => void;
}) {
  if (!incidents.length) return <EmptyState query="current filters" />;
  return (
    <div className="table-scroll">
      <table className="data-table">
        <thead>
          <tr>
            <th>Incident</th>
            <th>Service</th>
            <th>Region</th>
            <th>Signal</th>
            <th>Severity</th>
            <th>Detected</th>
            <th>
              <span className="sr-only">Open</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {incidents.map((item) => (
            <tr
              key={item.id}
              className={selected === item.id ? "is-selected" : ""}
            >
              <td>
                <button className="incident-link" onClick={() => select(item)}>
                  <span className={`incident-mark ${item.severity}`} />
                  {item.id}
                </button>
              </td>
              <td>
                <strong>{item.service}</strong>
              </td>
              <td>
                <span className="mono-muted">{item.region}</span>
              </td>
              <td>{titleCase(item.category)}</td>
              <td>
                <Status tone={item.severity}>{item.severity}</Status>
              </td>
              <td>{dateOnly(item.detected_at)}</td>
              <td>
                <button
                  className="row-action"
                  aria-label={`Open ${item.id}`}
                  onClick={() => select(item)}
                >
                  <ChevronRight size={15} />
                </button>
              </td>
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
  close,
}: {
  incident: Incident;
  action?: Action;
  save: (status: string, note: string) => Promise<void>;
  close?: () => void;
}) {
  const [note, setNote] = useState(action?.note || "");
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<"evidence" | "runbook" | "activity">(
    "evidence",
  );
  const persist = async (status: string) => {
    setSaving(true);
    await save(status, note);
    setSaving(false);
  };
  return (
    <aside
      className="evidence-panel"
      aria-label={`${incident.id} investigation`}
    >
      <div className="drawer-head">
        <div>
          <div className="drawer-kicker">
            <Status tone={incident.severity}>{incident.severity}</Status>
            <span>Detected {dateTime(incident.detected_at)} UTC</span>
          </div>
          <h2>{incident.id}</h2>
          <p>
            {incident.service} <span>→</span> {incident.region}
          </p>
        </div>
        {close ? (
          <button
            className="icon-button"
            aria-label="Close investigation"
            onClick={close}
          >
            <X size={18} />
          </button>
        ) : (
          <button className="icon-button" aria-label="Incident actions">
            <MoreHorizontal size={18} />
          </button>
        )}
      </div>
      <div className="evidence-stats">
        <div>
          <span>Duration</span>
          <strong>{incident.duration_hours}h</strong>
        </div>
        <div>
          <span>Peak score</span>
          <strong>{incident.top_score.toFixed(1)}σ</strong>
        </div>
        <div>
          <span>Detector</span>
          <strong>v2026.09</strong>
        </div>
      </div>
      <div
        className="drawer-tabs"
        role="tablist"
        aria-label="Investigation detail"
      >
        <button
          role="tab"
          aria-selected={tab === "evidence"}
          onClick={() => setTab("evidence")}
        >
          Evidence
        </button>
        <button
          role="tab"
          aria-selected={tab === "runbook"}
          onClick={() => setTab("runbook")}
        >
          Runbook
        </button>
        <button
          role="tab"
          aria-selected={tab === "activity"}
          onClick={() => setTab("activity")}
        >
          Activity
        </button>
      </div>
      <div className="drawer-body">
        {tab === "evidence" && (
          <section>
            <div className="section-title">
              <div>
                <h3>Ranked evidence</h3>
                <p>Observational signals, not causal proof</p>
              </div>
              <ShieldCheck size={17} />
            </div>
            <div className="evidence-list">
              {incident.diagnostics
                .filter((item) => item.score >= 0.5)
                .map((item, index) => (
                  <article key={item.metric} className="evidence-item">
                    <span className="rank">0{index + 1}</span>
                    <div>
                      <div className="evidence-item-head">
                        <strong>{item.title}</strong>
                        <b>{item.score.toFixed(1)}σ</b>
                      </div>
                      <p>{item.evidence}</p>
                      <div className="next-step">
                        <ChevronRight size={13} />
                        <span>{item.next_step}</span>
                      </div>
                    </div>
                  </article>
                ))}
            </div>
          </section>
        )}
        {tab === "runbook" && (
          <section>
            <div className="section-title">
              <div>
                <h3>Matched guidance</h3>
                <p>Grounded retrieval with section citations</p>
              </div>
              <BookOpen size={17} />
            </div>
            {incident.runbooks.map((item, index) => (
              <article
                className={`runbook-card ${index === 0 ? "primary-match" : ""}`}
                key={item.document_id}
              >
                <div>
                  <Status tone={index === 0 ? "healthy" : "neutral"}>
                    {index === 0 ? "Top match" : "Related"}
                  </Status>
                  <span>{item.citation}</span>
                </div>
                <h4>{item.title}</h4>
                <p>{item.excerpt}</p>
                <button
                  onClick={() =>
                    setNote(
                      (current) => current || `Checked ${item.document_id}: `,
                    )
                  }
                >
                  <Plus size={14} />
                  Add to analyst record
                </button>
              </article>
            ))}
          </section>
        )}
        {tab === "activity" && (
          <section>
            <div className="section-title">
              <div>
                <h3>Investigation history</h3>
                <p>User-scoped audit trail</p>
              </div>
              <Clock3 size={17} />
            </div>
            <div className="timeline">
              <article>
                <i />
                <div>
                  <strong>Incident detected</strong>
                  <span>{dateTime(incident.detected_at)} UTC</span>
                  <p>
                    SignalOps opened an episode at{" "}
                    {incident.top_score.toFixed(1)}σ.
                  </p>
                </div>
              </article>
              {action && (
                <article>
                  <i />
                  <div>
                    <strong>Status changed to {action.status}</strong>
                    <span>{dateTime(action.updatedAt)} UTC</span>
                    <p>{action.note || "No analyst note was attached."}</p>
                  </div>
                </article>
              )}
            </div>
          </section>
        )}
        <section className="analyst-record">
          <div className="section-title">
            <div>
              <h3>Analyst record</h3>
              <p>Persisted to your private workspace</p>
            </div>
            <Status tone={action?.status === "resolved" ? "healthy" : "active"}>
              {action?.status || "open"}
            </Status>
          </div>
          <textarea
            aria-label="Incident note"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            maxLength={1000}
            placeholder="Record what you checked, ruled out, or escalated…"
          />
          <div className="record-meta">
            <span>{note.length}/1000</span>
            <div>
              <button
                className="button button-secondary"
                onClick={() => persist("investigating")}
                disabled={saving}
              >
                {saving ? "Saving…" : "Save note"}
              </button>
              <button
                className="button button-primary"
                onClick={() => persist("resolved")}
                disabled={saving}
              >
                <Check size={15} />
                Resolve
              </button>
            </div>
          </div>
        </section>
      </div>
    </aside>
  );
}

function PageHeader({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="page-header">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {children && <div className="page-actions">{children}</div>}
    </div>
  );
}

function Overview({
  selected,
  setSelected,
  actions,
  save,
  openIncidents,
  openMonitor,
}: {
  selected: Incident;
  setSelected: (incident: Incident) => void;
  actions: Action[];
  save: (status: string, note: string) => Promise<void>;
  openIncidents: () => void;
  openMonitor: () => void;
}) {
  const signal = benchmark.detectors.signalops;
  return (
    <>
      <PageHeader
        eyebrow="Production workspace / Live monitor"
        title="Service health"
        description="Twelve service-region entities monitored against seasonal behavior."
      >
        <button className="button button-secondary">
          <Clock3 size={15} />
          Last 24 hours
          <ChevronDown size={14} />
        </button>
        <button className="button button-primary" onClick={openMonitor}>
          <Plus size={15} />
          Create monitor
        </button>
      </PageHeader>
      <div className="metric-grid">
        <article>
          <div>
            <span>Open incidents</span>
            <AlertTriangle size={16} />
          </div>
          <strong>2</strong>
          <footer>
            <b className="good">↓ 60%</b>
            <span>vs yesterday</span>
          </footer>
        </article>
        <article>
          <div>
            <span>Healthy entities</span>
            <CheckCircle2 size={16} />
          </div>
          <strong>
            11 <em>/ 12</em>
          </strong>
          <footer>
            <b className="good">91.7%</b>
            <span>within SLO</span>
          </footer>
        </article>
        <article>
          <div>
            <span>False alert rate</span>
            <ShieldCheck size={16} />
          </div>
          <strong>
            {signal.false_alerts_per_1000_entity_hours.toFixed(2)}
          </strong>
          <footer>
            <b className="good">
              ↓ {pct(benchmark.improvement.false_alert_reduction, 1)}
            </b>
            <span>vs baseline</span>
          </footer>
        </article>
        <article>
          <div>
            <span>Median detection</span>
            <Zap size={16} />
          </div>
          <strong>{signal.median_delay_hours.toFixed(1)}h</strong>
          <footer>
            <b>29 / 31</b>
            <span>incidents caught</span>
          </footer>
        </article>
      </div>
      <div className="overview-layout">
        <main>
          <MetricChart incident={selected} />
          <section className="panel incident-queue">
            <div className="panel-heading">
              <div>
                <div className="eyebrow">Prioritized queue</div>
                <h2>Recent incidents</h2>
              </div>
              <button className="text-button" onClick={openIncidents}>
                View all {benchmark.incidents.length}
                <ChevronRight size={14} />
              </button>
            </div>
            <IncidentRows
              incidents={benchmark.incidents.slice(0, 5)}
              selected={selected.id}
              select={setSelected}
            />
          </section>
        </main>
        <EvidencePanel
          key={selected.id}
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
  setSelected: (incident: Incident) => void;
  actions: Action[];
  save: (status: string, note: string) => Promise<void>;
}) {
  const [query, setQuery] = useState("");
  const [severity, setSeverity] = useState("all");
  const [drawer, setDrawer] = useState(false);
  const incidents = useMemo(
    () =>
      benchmark.incidents.filter(
        (item) =>
          (severity === "all" || item.severity === severity) &&
          `${item.id} ${item.service} ${item.region} ${item.category}`
            .toLowerCase()
            .includes(query.toLowerCase()),
      ),
    [query, severity],
  );
  const choose = (incident: Incident) => {
    setSelected(incident);
    setDrawer(true);
  };
  return (
    <>
      <PageHeader
        eyebrow="Operations / Incident catalogue"
        title="Incident workspace"
        description="Triage, investigate, document, and resolve detector episodes."
      >
        <button className="button button-secondary">
          <Download size={15} />
          Export CSV
        </button>
      </PageHeader>
      <section className="panel catalogue">
        <div className="catalogue-toolbar">
          <div className="search-field">
            <Search size={16} />
            <input
              aria-label="Search incident catalogue"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search ID, service, region, or signal…"
            />
            {query && (
              <button aria-label="Clear search" onClick={() => setQuery("")}>
                <X size={14} />
              </button>
            )}
          </div>
          <div className="filter-label">
            <Filter size={14} />
            Severity
          </div>
          <div className="segmented">
            {["all", "critical", "high", "medium"].map((value) => (
              <button
                key={value}
                className={severity === value ? "active" : ""}
                onClick={() => setSeverity(value)}
              >
                {titleCase(value)}
              </button>
            ))}
          </div>
        </div>
        <div className="catalogue-summary">
          <div>
            <strong>{incidents.length}</strong>
            <span>matching incidents</span>
          </div>
          <div>
            <span>Dataset</span>
            <code>HOLDOUT-2026.09</code>
          </div>
          <div>
            <span>Checksum</span>
            <code>{benchmark.scope.checksum}</code>
          </div>
          <Status tone="healthy">Verified</Status>
        </div>
        <IncidentRows
          incidents={incidents}
          selected={selected.id}
          select={choose}
        />
      </section>
      {drawer && (
        <div
          className="drawer-overlay"
          onMouseDown={(event) =>
            event.target === event.currentTarget && setDrawer(false)
          }
        >
          <EvidencePanel
            key={selected.id}
            incident={selected}
            action={actions.find((item) => item.incidentId === selected.id)}
            save={save}
            close={() => setDrawer(false)}
          />
        </div>
      )}
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
  const signal = benchmark.detectors.signalops;
  const baseline = benchmark.detectors.baseline;
  const comparisons = [
    {
      label: "Precision",
      baseline: baseline.precision,
      signal: signal.precision,
    },
    { label: "Recall", baseline: baseline.recall, signal: signal.recall },
    { label: "F1 score", baseline: baseline.f1, signal: signal.f1 },
  ];
  return (
    <>
      <PageHeader
        eyebrow="Quality / Detector evaluation"
        title="Release benchmark"
        description="Event-level performance on a locked synthetic holdout with uncertainty reported."
      >
        <button
          className="button button-primary"
          onClick={run}
          disabled={running}
        >
          {running ? (
            <>
              <span className="spinner" />
              Running evaluation…
            </>
          ) : (
            <>
              <Play size={15} />
              Run benchmark
            </>
          )}
        </button>
      </PageHeader>
      <section className="release-banner">
        <div className="release-icon">
          <CheckCircle2 size={22} />
        </div>
        <div>
          <div className="eyebrow">Release gate / Passed</div>
          <h2>
            SignalOps improves F1 by{" "}
            {pct(benchmark.improvement.f1_absolute, 1).replace(
              "%",
              " percentage points",
            )}
          </h2>
          <p>
            All four quality gates passed on benchmark{" "}
            {benchmark.benchmark_version}.
          </p>
        </div>
        <dl>
          <div>
            <dt>Version</dt>
            <dd>v{benchmark.benchmark_version}</dd>
          </div>
          <div>
            <dt>Seed</dt>
            <dd>{benchmark.seed}</dd>
          </div>
          <div>
            <dt>Last run</dt>
            <dd>
              {lastRun ? dateTime(lastRun.createdAt) : "Verified artifact"}
            </dd>
          </div>
        </dl>
      </section>
      <div className="benchmark-layout">
        <section className="panel comparison-card">
          <div className="panel-heading">
            <div>
              <div className="eyebrow">Head-to-head</div>
              <h2>Detector performance</h2>
            </div>
            <Status tone="healthy">Holdout</Status>
          </div>
          <div className="comparison-columns">
            <span />
            <b>Rolling z-score</b>
            <b>SignalOps</b>
          </div>
          {comparisons.map((row) => (
            <div className="comparison" key={row.label}>
              <strong>{row.label}</strong>
              <div>
                <div>
                  <i style={{ width: `${row.baseline * 100}%` }} />
                </div>
                <b>{pct(row.baseline)}</b>
              </div>
              <div className="comparison-best">
                <div>
                  <i style={{ width: `${row.signal * 100}%` }} />
                </div>
                <b>{pct(row.signal)}</b>
              </div>
            </div>
          ))}
        </section>
        <section className="panel scope-card">
          <div className="panel-heading">
            <div>
              <div className="eyebrow">Evaluation contract</div>
              <h2>Locked scope</h2>
            </div>
            <FileCheck2 size={18} />
          </div>
          <dl>
            <div>
              <dt>Telemetry rows</dt>
              <dd>{benchmark.scope.telemetry_rows.toLocaleString()}</dd>
            </div>
            <div>
              <dt>Entity-hours</dt>
              <dd>{benchmark.scope.entity_hours.toLocaleString()}</dd>
            </div>
            <div>
              <dt>Test incidents</dt>
              <dd>{benchmark.scope.test_incidents}</dd>
            </div>
            <div>
              <dt>Warm-up window</dt>
              <dd>{benchmark.scope.warmup_days} days</dd>
            </div>
            <div>
              <dt>Precision bootstrap CI</dt>
              <dd>
                {pct(signal.bootstrap_precision_ci_95[0])}–
                {pct(signal.bootstrap_precision_ci_95[1])}
              </dd>
            </div>
            <div>
              <dt>Recall bootstrap CI</dt>
              <dd>
                {pct(signal.bootstrap_recall_ci_95[0])}–
                {pct(signal.bootstrap_recall_ci_95[1])}
              </dd>
            </div>
          </dl>
          <div className="method-callout">
            <ShieldCheck size={16} />
            <p>
              Labels are isolated from detector features. Every reference window
              ends before its current observation.
            </p>
          </div>
        </section>
      </div>
      <section className="panel ablation-card">
        <div className="panel-heading">
          <div>
            <div className="eyebrow">Component analysis</div>
            <h2>Ablation study</h2>
            <p>Each row shows what a detector layer contributes.</p>
          </div>
        </div>
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Variant</th>
                <th>Precision</th>
                <th>Recall</th>
                <th>F1</th>
                <th>False positives</th>
                <th>Interpretation</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <strong>Rolling z-score</strong>
                </td>
                <td>{pct(baseline.precision)}</td>
                <td>{pct(baseline.recall)}</td>
                <td>{pct(baseline.f1)}</td>
                <td>111</td>
                <td>Misses seasonal structure</td>
              </tr>
              <tr>
                <td>
                  <strong>Seasonal median / MAD</strong>
                </td>
                <td>{pct(benchmark.detectors.robust_raw.precision)}</td>
                <td>{pct(benchmark.detectors.robust_raw.recall)}</td>
                <td>{pct(benchmark.detectors.robust_raw.f1)}</td>
                <td>478</td>
                <td>Sensitive, but too noisy</td>
              </tr>
              <tr className="winner">
                <td>
                  <strong>
                    <CheckCircle2 size={15} />+ persistence & corroboration
                  </strong>
                </td>
                <td>{pct(signal.precision)}</td>
                <td>{pct(signal.recall)}</td>
                <td>{pct(signal.f1)}</td>
                <td>4</td>
                <td>Production candidate</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

function PipelinesView({
  detail,
  setDetail,
}: {
  detail: boolean;
  setDetail: (value: boolean) => void;
}) {
  const stages = [
    { name: "Ingest", icon: Database, meta: "60,480 rows", time: "18s" },
    { name: "Contract gate", icon: ShieldCheck, meta: "12 checks", time: "4s" },
    { name: "dbt build", icon: Layers3, meta: "7 models", time: "31s" },
    { name: "Detect", icon: Activity, meta: "33 episodes", time: "12s" },
    { name: "Evaluate", icon: CircleGauge, meta: "4 gates", time: "6s" },
    { name: "Publish", icon: Zap, meta: "v2026.09", time: "3s" },
  ];
  return (
    <>
      <PageHeader
        eyebrow="Platform / Orchestration"
        title="Hourly pipeline"
        description="Idempotent ingestion, transformation, detection, evaluation, and publication."
      >
        <button
          className="button button-secondary"
          onClick={() => setDetail(!detail)}
        >
          <ServerCog size={15} />
          {detail ? "Hide run detail" : "Open run detail"}
        </button>
      </PageHeader>
      <section className="run-banner">
        <div>
          <Status tone="healthy">Succeeded</Status>
          <h2>signalops_hourly</h2>
          <p>
            <Clock3 size={14} />
            Scheduled hourly at :15 · completed in 1m 14s
          </p>
        </div>
        <div className="run-facts">
          <div>
            <span>Run ID</span>
            <code>scheduled__2026-09-04T14:15Z</code>
          </div>
          <div>
            <span>Data interval</span>
            <strong>14:00–15:00 UTC</strong>
          </div>
          <div>
            <span>Next run</span>
            <strong>in 32 minutes</strong>
          </div>
        </div>
      </section>
      <section className="pipeline-track" aria-label="Pipeline stages">
        {stages.map((stage, index) => {
          const Icon = stage.icon;
          return (
            <article key={stage.name}>
              <div className="stage-icon">
                <Icon size={17} />
                <span>
                  <Check size={10} />
                </span>
              </div>
              <div>
                <strong>{stage.name}</strong>
                <p>{stage.meta}</p>
                <small>{stage.time}</small>
              </div>
              {index < stages.length - 1 && <i className="connector" />}
            </article>
          );
        })}
      </section>
      <div className="platform-grid">
        <section className="panel quality-card">
          <div className="panel-heading">
            <div>
              <div className="eyebrow">Blocking controls</div>
              <h2>Data quality contract</h2>
            </div>
            <Status tone="healthy">12 / 12 passed</Status>
          </div>
          <div className="check-list">
            {[
              ["Freshness", "Latest partition under two hours", "34m"],
              ["Unique grain", "timestamp + service + region", "100%"],
              ["Completeness", "Required measures populated", "99.92%"],
              ["Accepted values", "Known service and region codes", "100%"],
              ["Volume drift", "Within expected ingest range", "+1.8%"],
            ].map((row) => (
              <div key={row[0]}>
                <span>
                  <Check size={12} />
                </span>
                <div>
                  <strong>{row[0]}</strong>
                  <p>{row[1]}</p>
                </div>
                <b>{row[2]}</b>
              </div>
            ))}
          </div>
        </section>
        <section className="panel lineage-card">
          <div className="panel-heading">
            <div>
              <div className="eyebrow">Current publication path</div>
              <h2>Data lineage</h2>
            </div>
            <Network size={18} />
          </div>
          <div className="lineage">
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
                {index < 4 && <ChevronDown size={14} />}
              </div>
            ))}
          </div>
        </section>
      </div>
      {detail && (
        <section className="panel logs-card">
          <div className="panel-heading">
            <div>
              <div className="eyebrow">Run output</div>
              <h2>Structured task log</h2>
            </div>
            <button
              className="icon-button"
              aria-label="Close run detail"
              onClick={() => setDetail(false)}
            >
              <X size={16} />
            </button>
          </div>
          <pre>
            <span>14:15:02</span> partition=2026-09-04T14:00:00Z task=ingest
            rows=60480 status=success{"\n"}
            <span>14:15:20</span> contract=telemetry_v1 assertions=12 failed=0
            status=passed{"\n"}
            <span>14:15:55</span> detector=signalops episodes=33
            release_gate=true status=published
          </pre>
        </section>
      )}
    </>
  );
}

function EvaluationView({ exportPack }: { exportPack: () => void }) {
  const retrieval = benchmark.retrieval,
    experiment = benchmark.experiment;
  return (
    <>
      <PageHeader
        eyebrow="Quality / Applied intelligence"
        title="Evaluation registry"
        description="Independent gates prevent one strong metric from hiding another failure mode."
      >
        <button className="button button-secondary" onClick={exportPack}>
          <Download size={15} />
          Export evidence pack
        </button>
      </PageHeader>
      <div className="evaluation-grid">
        <article className="panel evaluation-card">
          <header>
            <div className="eval-icon">
              <BookOpen size={18} />
            </div>
            <div>
              <span>RAG-RET-04</span>
              <h2>Runbook retrieval</h2>
            </div>
            <Status tone="healthy">Passed</Status>
          </header>
          <p>
            Ten paraphrased incident questions evaluated against five curated
            operational runbooks.
          </p>
          <div className="eval-stat-grid">
            <div>
              <strong>{pct(retrieval.hit_rate_at_1, 0)}</strong>
              <span>Hit rate @ 1</span>
            </div>
            <div>
              <strong>{pct(retrieval.hit_rate_at_3, 0)}</strong>
              <span>Hit rate @ 3</span>
            </div>
            <div>
              <strong>{retrieval.mrr.toFixed(2)}</strong>
              <span>MRR</span>
            </div>
          </div>
          <div className="threshold-row">
            <span>Release threshold</span>
            <div>
              <i style={{ width: `${retrieval.hit_rate_at_3 * 100}%` }} />
            </div>
            <b>≥90%</b>
          </div>
          <footer>
            <ShieldCheck size={15} />
            Every recommendation includes a document and section citation.
          </footer>
        </article>
        <article className="panel evaluation-card">
          <header>
            <div className="eval-icon eval-icon-violet">
              <Activity size={18} />
            </div>
            <div>
              <span>EXP-CUPED-02</span>
              <h2>Experiment recovery</h2>
            </div>
            <Status tone="healthy">Passed</Status>
          </header>
          <p>
            Known treatment effect recovered from a seeded 12,000-unit
            experiment.
          </p>
          <div className="eval-stat-grid">
            <div>
              <strong>+{(experiment.absolute_lift * 100).toFixed(2)}pp</strong>
              <span>Estimated lift</span>
            </div>
            <div>
              <strong>{pct(experiment.variance_reduction)}</strong>
              <span>Variance reduction</span>
            </div>
            <div>
              <strong>{pct(experiment.relative_lift)}</strong>
              <span>Relative lift</span>
            </div>
          </div>
          <div className="confidence-range">
            <span>{(experiment.ci_low * 100).toFixed(2)}pp</span>
            <div>
              <i />
              <b />
            </div>
            <span>{(experiment.ci_high * 100).toFixed(2)}pp</span>
          </div>
          <footer>
            <CheckCircle2 size={15} />
            95% confidence interval excludes zero. Decision: ship.
          </footer>
        </article>
      </div>
      <section className="panel registry">
        <div className="panel-heading">
          <div>
            <div className="eyebrow">Release controls</div>
            <h2>Evaluation dimensions</h2>
          </div>
          <Status tone="healthy">4 / 4 passed</Status>
        </div>
        <div className="table-scroll">
          <table className="data-table">
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
              {[
                ["Incident detector", "HOLDOUT-2026.09", "F1", "90.6%", "≥75%"],
                [
                  "Runbook retrieval",
                  "RUNBOOK-QA-10",
                  "Hit rate @ 3",
                  "90.0%",
                  "≥90%",
                ],
                [
                  "Experiment estimator",
                  "CUPED-12K",
                  "Effect recovery",
                  "+2.23pp",
                  "CI excludes 0",
                ],
                [
                  "Data contracts",
                  "TELEMETRY-V1",
                  "Assertions",
                  "12 / 12",
                  "100%",
                ],
              ].map((row) => (
                <tr key={row[0]}>
                  <td>
                    <strong>{row[0]}</strong>
                  </td>
                  <td>
                    <code>{row[1]}</code>
                  </td>
                  <td>{row[2]}</td>
                  <td>
                    <b>{row[3]}</b>
                  </td>
                  <td>{row[4]}</td>
                  <td>
                    <Status tone="healthy">Passed</Status>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

function CommandPalette({
  open,
  close,
  selectView,
  selectIncident,
}: {
  open: boolean;
  close: () => void;
  selectView: (view: View) => void;
  selectIncident: (incident: Incident) => void;
}) {
  const [query, setQuery] = useState("");
  if (!open) return null;
  const matchingViews = nav.filter((item) =>
    item.label.toLowerCase().includes(query.toLowerCase()),
  );
  const matchingIncidents = benchmark.incidents
    .filter((item) =>
      `${item.id} ${item.service} ${item.category}`
        .toLowerCase()
        .includes(query.toLowerCase()),
    )
    .slice(0, 5);
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => event.target === event.currentTarget && close()}
    >
      <div
        className="command-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Command menu"
      >
        <div className="command-search">
          <Search size={18} />
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search pages, incidents, and actions…"
          />
          <kbd>ESC</kbd>
        </div>
        <div className="command-results">
          {matchingViews.length > 0 && (
            <section>
              <span>Navigate</span>
              {matchingViews.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      selectView(item.id);
                      close();
                    }}
                  >
                    <i>
                      <Icon size={16} />
                    </i>
                    <div>
                      <strong>{item.label}</strong>
                      <small>{item.group}</small>
                    </div>
                    <ChevronRight size={15} />
                  </button>
                );
              })}
            </section>
          )}
          {matchingIncidents.length > 0 && (
            <section>
              <span>Incidents</span>
              {matchingIncidents.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    selectIncident(item);
                    close();
                  }}
                >
                  <i>
                    <AlertTriangle size={16} />
                  </i>
                  <div>
                    <strong>{item.id}</strong>
                    <small>
                      {item.service} · {titleCase(item.category)}
                    </small>
                  </div>
                  <Status tone={item.severity}>{item.severity}</Status>
                </button>
              ))}
            </section>
          )}
        </div>
        <footer>
          <span>
            <kbd>↵</kbd> open
          </span>
          <span>
            <kbd>esc</kbd> close
          </span>
          <b>SignalOps command</b>
        </footer>
      </div>
    </div>
  );
}

function CreateMonitorModal({
  open,
  close,
  created,
}: {
  open: boolean;
  close: () => void;
  created: (name: string) => void;
}) {
  const [name, setName] = useState("Revenue conversion guardrail");
  if (!open) return null;
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => event.target === event.currentTarget && close()}
    >
      <form
        className="form-modal"
        onSubmit={(event) => {
          event.preventDefault();
          created(name);
          close();
        }}
      >
        <header>
          <div>
            <div className="eyebrow">New monitor</div>
            <h2>Define an operational signal</h2>
            <p>Configure a production-shaped monitor for one service metric.</p>
          </div>
          <button
            type="button"
            className="icon-button"
            aria-label="Close monitor form"
            onClick={close}
          >
            <X size={17} />
          </button>
        </header>
        <label>
          Monitor name
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
            maxLength={80}
          />
        </label>
        <div className="form-grid">
          <label>
            Service
            <select defaultValue="payments">
              <option>payments</option>
              <option>checkout</option>
              <option>identity</option>
              <option>catalog</option>
            </select>
          </label>
          <label>
            Metric
            <select defaultValue="revenue">
              <option>revenue</option>
              <option>error_rate</option>
              <option>latency_p95_ms</option>
              <option>requests</option>
            </select>
          </label>
        </div>
        <label>
          Detection policy
          <select defaultValue="seasonal">
            <option value="seasonal">
              Seasonal median / MAD + corroboration
            </option>
            <option value="baseline">Rolling z-score baseline</option>
          </select>
        </label>
        <div className="policy-preview">
          <ShieldCheck size={17} />
          <div>
            <strong>Safe default</strong>
            <p>
              Current observations are excluded from their own expectation.
              Two-period persistence is required.
            </p>
          </div>
        </div>
        <footer>
          <button
            type="button"
            className="button button-secondary"
            onClick={close}
          >
            Cancel
          </button>
          <button className="button button-primary">
            <Plus size={15} />
            Create monitor
          </button>
        </footer>
      </form>
    </div>
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
  const [commandOpen, setCommandOpen] = useState(false);
  const [monitorOpen, setMonitorOpen] = useState(false);
  const [notifications, setNotifications] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [pipelineDetail, setPipelineDetail] = useState(false);
  const [toast, setToast] = useState<Toast>(null);
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
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen(true);
      }
      if (event.key === "Escape") {
        setCommandOpen(false);
        setMonitorOpen(false);
        setNotifications(false);
        setMobileNav(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3600);
    return () => window.clearTimeout(timer);
  }, [toast]);
  const showToast = (title: string, detail: string) =>
    setToast({ title, detail });
  const save = useCallback(
    async (status: string, note: string) => {
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
      showToast(
        status === "resolved" ? "Incident resolved" : "Analyst record saved",
        `${selected.id} was updated in your workspace.`,
      );
    },
    [selected.id, workspace.mode],
  );
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
      } else await new Promise((resolve) => setTimeout(resolve, 900));
      showToast(
        "Release gate passed",
        "All detector and retrieval thresholds remain green.",
      );
    } finally {
      setRunning(false);
    }
  };
  const exportPack = () => {
    const blob = new Blob([JSON.stringify(benchmark, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `signalops-evidence-${benchmark.benchmark_version}.json`;
    link.click();
    URL.revokeObjectURL(url);
    showToast(
      "Evidence pack exported",
      "The reproducible benchmark JSON is ready.",
    );
  };
  const navigate = (next: View) => {
    setView(next);
    setMobileNav(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const openIncident = (incident: Incident) => {
    setSelected(incident);
    navigate("incidents");
  };
  const content =
    view === "overview" ? (
      <Overview
        selected={selected}
        setSelected={setSelected}
        actions={workspace.actions}
        save={save}
        openIncidents={() => navigate("incidents")}
        openMonitor={() => setMonitorOpen(true)}
      />
    ) : view === "incidents" ? (
      <IncidentsView
        selected={selected}
        setSelected={setSelected}
        actions={workspace.actions}
        save={save}
      />
    ) : view === "pipelines" ? (
      <PipelinesView detail={pipelineDetail} setDetail={setPipelineDetail} />
    ) : view === "benchmark" ? (
      <BenchmarkView run={run} running={running} lastRun={workspace.runs[0]} />
    ) : (
      <EvaluationView exportPack={exportPack} />
    );

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileNav ? "mobile-open" : ""}`}>
        <div className="sidebar-top">
          <Logo />
          <button
            className="icon-button sidebar-close"
            aria-label="Close navigation"
            onClick={() => setMobileNav(false)}
          >
            <X size={18} />
          </button>
        </div>
        <button className="workspace-switch">
          <span>OP</span>
          <div>
            <strong>Operations</strong>
            <small>Production workspace</small>
          </div>
          <ChevronDown size={14} />
        </button>
        <nav aria-label="SignalOps navigation">
          {["Monitor", "Platform", "Quality"].map((group) => (
            <div key={group}>
              <p>{group}</p>
              {nav
                .filter((item) => item.group === group)
                .map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      className={view === item.id ? "active" : ""}
                      onClick={() => navigate(item.id)}
                    >
                      <Icon size={16} />
                      <span>{item.label}</span>
                      {item.id === "incidents" && <b>2</b>}
                    </button>
                  );
                })}
            </div>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="system-health">
            <span>
              <i />
              Operational
            </span>
            <small>Last checked 36s ago</small>
          </div>
          <div className="profile">
            <span>
              {workspace.user?.displayName?.slice(0, 2).toUpperCase() || "PW"}
            </span>
            <div>
              <strong>
                {workspace.user?.displayName || "Portfolio reviewer"}
              </strong>
              <small>
                {workspace.mode === "connected"
                  ? "Private workspace"
                  : workspace.mode === "connecting"
                    ? "Connecting…"
                    : "Demonstration mode"}
              </small>
            </div>
            <ChevronRight size={14} />
          </div>
        </div>
      </aside>
      {mobileNav && (
        <button
          className="nav-scrim"
          aria-label="Close navigation overlay"
          onClick={() => setMobileNav(false)}
        />
      )}
      <main className="workspace">
        <header className="topbar">
          <div>
            <button
              className="mobile-menu icon-button"
              aria-label="Open navigation"
              onClick={() => setMobileNav(true)}
            >
              <Menu size={19} />
            </button>
            <div className="breadcrumbs">
              <button onClick={() => navigate("overview")}>SignalOps</button>
              <ChevronRight size={13} />
              <strong>{labels[view]}</strong>
            </div>
          </div>
          <div className="topbar-actions">
            <button
              className="command-trigger"
              onClick={() => setCommandOpen(true)}
            >
              <Search size={15} />
              <span>Search incidents or jump to…</span>
              <kbd>
                <Command size={10} />K
              </kbd>
            </button>
            <a
              className="icon-button help-link"
              aria-label="Open repository documentation"
              href="https://github.com/pablowilliams/signalops#readme"
              target="_blank"
              rel="noreferrer"
            >
              <HelpCircle size={17} />
            </a>
            <div className="notification-wrap">
              <button
                className="icon-button"
                aria-label="Notifications"
                aria-expanded={notifications}
                onClick={() => setNotifications(!notifications)}
              >
                <Bell size={17} />
                <i className="notification-dot" />
              </button>
              {notifications && (
                <div className="notification-popover">
                  <header>
                    <strong>Notifications</strong>
                    <button onClick={() => setNotifications(false)}>
                      <X size={14} />
                    </button>
                  </header>
                  <article>
                    <span>
                      <CheckCircle2 size={15} />
                    </span>
                    <div>
                      <strong>Release gate passed</strong>
                      <p>Detector v2026.09 cleared all checks.</p>
                      <small>4 minutes ago</small>
                    </div>
                  </article>
                  <article>
                    <span className="notice-amber">
                      <AlertTriangle size={15} />
                    </span>
                    <div>
                      <strong>Revenue anomaly resolved</strong>
                      <p>INC-0032 analyst record was updated.</p>
                      <small>28 minutes ago</small>
                    </div>
                  </article>
                </div>
              )}
            </div>
            <button className="avatar-button">
              {workspace.user?.displayName?.slice(0, 2).toUpperCase() || "PW"}
            </button>
          </div>
        </header>
        <div className="content">{content}</div>
      </main>
      <CommandPalette
        open={commandOpen}
        close={() => setCommandOpen(false)}
        selectView={navigate}
        selectIncident={openIncident}
      />
      <CreateMonitorModal
        open={monitorOpen}
        close={() => setMonitorOpen(false)}
        created={(name) =>
          showToast(
            "Monitor created",
            `${name} is now evaluating in shadow mode.`,
          )
        }
      />
      {toast && (
        <div className="toast" role="status">
          <span>
            <Check size={15} />
          </span>
          <div>
            <strong>{toast.title}</strong>
            <p>{toast.detail}</p>
          </div>
          <button
            aria-label="Dismiss notification"
            onClick={() => setToast(null)}
          >
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
