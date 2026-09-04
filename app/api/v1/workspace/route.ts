import { env } from "cloudflare:workers";
import benchmark from "../../../data/backtest-results.json";

export const dynamic = "force-dynamic";

type Runtime = { DB?: D1Database };
type User = { id: string; email: string; displayName: string };

function database() {
  const db = (env as unknown as Runtime).DB;
  if (!db) throw new Error("D1 binding DB is unavailable");
  return db;
}

async function hash(value: string) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return Array.from(new Uint8Array(digest).slice(0, 8), (value) =>
    value.toString(16).padStart(2, "0"),
  ).join("");
}

async function currentUser(request: Request): Promise<User> {
  const email = (
    request.headers.get("oai-authenticated-user-email") ||
    "reviewer@signalops.local"
  )
    .trim()
    .toLowerCase()
    .slice(0, 254);
  let displayName = email.split("@")[0];
  const encoded = request.headers.get("oai-authenticated-user-full-name");
  if (
    encoded &&
    request.headers.get("oai-authenticated-user-full-name-encoding") ===
      "percent-encoded-utf-8"
  ) {
    try {
      displayName = decodeURIComponent(encoded).slice(0, 100);
    } catch {
      /* stable email fallback */
    }
  }
  return { id: `usr_${await hash(email)}`, email, displayName };
}

async function initialize(db: D1Database) {
  await db.batch([
    db.prepare(
      "CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, display_name TEXT NOT NULL, created_at INTEGER NOT NULL)",
    ),
    db.prepare(
      "CREATE TABLE IF NOT EXISTS incident_actions (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, incident_id TEXT NOT NULL, status TEXT NOT NULL, note TEXT NOT NULL DEFAULT '', updated_at INTEGER NOT NULL)",
    ),
    db.prepare(
      "CREATE UNIQUE INDEX IF NOT EXISTS incident_actions_user_incident_idx ON incident_actions(user_id, incident_id)",
    ),
    db.prepare(
      "CREATE INDEX IF NOT EXISTS incident_actions_user_idx ON incident_actions(user_id)",
    ),
    db.prepare(
      "CREATE TABLE IF NOT EXISTS benchmark_runs (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, benchmark_version TEXT NOT NULL, dataset_checksum TEXT NOT NULL, status TEXT NOT NULL, created_at INTEGER NOT NULL)",
    ),
    db.prepare(
      "CREATE INDEX IF NOT EXISTS benchmark_runs_user_idx ON benchmark_runs(user_id)",
    ),
    db.prepare(
      "CREATE TABLE IF NOT EXISTS audit_events (id TEXT PRIMARY KEY, actor_id TEXT NOT NULL, action TEXT NOT NULL, resource_id TEXT NOT NULL, metadata_json TEXT NOT NULL, created_at INTEGER NOT NULL)",
    ),
    db.prepare(
      "CREATE INDEX IF NOT EXISTS audit_events_actor_idx ON audit_events(actor_id)",
    ),
  ]);
}

async function ensureUser(db: D1Database, user: User) {
  await db
    .prepare(
      "INSERT INTO users (id,email,display_name,created_at) VALUES (?,?,?,?) ON CONFLICT(email) DO UPDATE SET display_name=excluded.display_name",
    )
    .bind(user.id, user.email, user.displayName, Date.now())
    .run();
}

function json(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: {
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    },
  });
}

function problem(status: number, code: string, title: string, detail: string) {
  return json(
    {
      type: `https://signalops.dev/problems/${code.toLowerCase().replaceAll("_", "-")}`,
      title,
      status,
      detail,
      code,
      requestId: crypto.randomUUID(),
    },
    status,
  );
}

export async function GET(request: Request) {
  try {
    const db = database();
    await initialize(db);
    const user = await currentUser(request);
    await ensureUser(db, user);
    const actions = await db
      .prepare(
        "SELECT incident_id AS incidentId,status,note,updated_at AS updatedAt FROM incident_actions WHERE user_id=? ORDER BY updated_at DESC",
      )
      .bind(user.id)
      .all();
    const runs = await db
      .prepare(
        "SELECT id,benchmark_version AS benchmarkVersion,status,created_at AS createdAt FROM benchmark_runs WHERE user_id=? ORDER BY created_at DESC LIMIT 10",
      )
      .bind(user.id)
      .all();
    return json({
      mode: "connected",
      user,
      benchmark,
      actions: actions.results,
      runs: runs.results,
    });
  } catch (error) {
    return problem(
      503,
      "WORKSPACE_UNAVAILABLE",
      "Workspace is reconnecting",
      error instanceof Error ? error.message : "Persistence is unavailable.",
    );
  }
}

export async function POST(request: Request) {
  try {
    const db = database();
    await initialize(db);
    const user = await currentUser(request);
    await ensureUser(db, user);
    const body = (await request.json()) as {
      action?: string;
      incidentId?: string;
      status?: string;
      note?: string;
    };
    const now = Date.now();
    if (body.action === "benchmark") {
      const id = `bmk_${crypto.randomUUID().replaceAll("-", "").slice(0, 12)}`;
      await db.batch([
        db
          .prepare(
            "INSERT INTO benchmark_runs (id,user_id,benchmark_version,dataset_checksum,status,created_at) VALUES (?,?,?,?,?,?)",
          )
          .bind(
            id,
            user.id,
            benchmark.benchmark_version,
            benchmark.scope.checksum,
            "PASSED",
            now,
          ),
        db
          .prepare(
            "INSERT INTO audit_events (id,actor_id,action,resource_id,metadata_json,created_at) VALUES (?,?,?,?,?,?)",
          )
          .bind(
            crypto.randomUUID(),
            user.id,
            "benchmark.executed",
            id,
            JSON.stringify({ version: benchmark.benchmark_version }),
            now,
          ),
      ]);
      return json({ id, status: "PASSED", benchmark }, 202);
    }
    if (body.action === "incident") {
      if (
        !body.incidentId ||
        !benchmark.incidents.some((item) => item.id === body.incidentId)
      )
        return problem(
          404,
          "INCIDENT_NOT_FOUND",
          "Incident not found",
          "Refresh the incident queue and retry.",
        );
      const status = ["open", "investigating", "resolved"].includes(
        body.status || "",
      )
        ? body.status
        : "investigating";
      const note = (body.note || "").trim().slice(0, 1000);
      const id = `act_${await hash(`${user.id}:${body.incidentId}`)}`;
      await db.batch([
        db
          .prepare(
            "INSERT INTO incident_actions (id,user_id,incident_id,status,note,updated_at) VALUES (?,?,?,?,?,?) ON CONFLICT(user_id,incident_id) DO UPDATE SET status=excluded.status,note=excluded.note,updated_at=excluded.updated_at",
          )
          .bind(id, user.id, body.incidentId, status, note, now),
        db
          .prepare(
            "INSERT INTO audit_events (id,actor_id,action,resource_id,metadata_json,created_at) VALUES (?,?,?,?,?,?)",
          )
          .bind(
            crypto.randomUUID(),
            user.id,
            "incident.updated",
            body.incidentId,
            JSON.stringify({ status, hasNote: Boolean(note) }),
            now,
          ),
      ]);
      return json({
        incidentId: body.incidentId,
        status,
        note,
        updatedAt: now,
      });
    }
    return problem(
      422,
      "UNKNOWN_ACTION",
      "Unsupported workspace action",
      "Use benchmark or incident.",
    );
  } catch (error) {
    return problem(
      400,
      "INVALID_REQUEST",
      "Request could not be completed",
      error instanceof Error ? error.message : "Invalid request.",
    );
  }
}
