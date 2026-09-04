import assert from "node:assert/strict";
import { access, readFile, readdir } from "node:fs/promises";
import test from "node:test";

test("production bundle contains the SignalOps command center", async () => {
  await access(new URL("../dist/server/index.js", import.meta.url));
  const files = await readdir(new URL("../dist/client/assets/", import.meta.url));
  assert.ok(files.some(name => name.startsWith("SignalOpsApp-") && name.endsWith(".js")));
  const source = await readFile(new URL("../app/SignalOpsApp.tsx", import.meta.url), "utf8");
  assert.match(source, /Service health/);
  assert.match(source, /Release benchmark/);
  assert.match(source, /Runbook match/);
  assert.doesNotMatch(source, /Your site is taking shape|react-loading-skeleton/i);
});

test("metadata, durable API, benchmark, and migrations are present", async () => {
  const [layout, route, benchmark] = await Promise.all([
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/v1/workspace/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/data/backtest-results.json", import.meta.url), "utf8"),
  ]);
  assert.match(layout, /SignalOps \| Data incident intelligence/);
  assert.match(route, /incident_actions/);
  assert.match(route, /benchmark.executed/);
  assert.match(benchmark, /"f1": 0\.9062/);
  const migrations = await readdir(new URL("../drizzle/", import.meta.url));
  assert.ok(migrations.some(name => name.endsWith(".sql")));
});
