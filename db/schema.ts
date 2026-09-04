import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  displayName: text("display_name").notNull(),
  createdAt: integer("created_at").notNull(),
});

export const incidentActions = sqliteTable(
  "incident_actions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    incidentId: text("incident_id").notNull(),
    status: text("status").notNull(),
    note: text("note").notNull().default(""),
    updatedAt: integer("updated_at").notNull(),
  },
  (table) => ({
    userIncident: uniqueIndex("incident_actions_user_incident_idx").on(
      table.userId,
      table.incidentId,
    ),
    userIndex: index("incident_actions_user_idx").on(table.userId),
  }),
);

export const benchmarkRuns = sqliteTable(
  "benchmark_runs",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    benchmarkVersion: text("benchmark_version").notNull(),
    datasetChecksum: text("dataset_checksum").notNull(),
    status: text("status").notNull(),
    createdAt: integer("created_at").notNull(),
  },
  (table) => ({ userIndex: index("benchmark_runs_user_idx").on(table.userId) }),
);

export const auditEvents = sqliteTable(
  "audit_events",
  {
    id: text("id").primaryKey(),
    actorId: text("actor_id")
      .notNull()
      .references(() => users.id),
    action: text("action").notNull(),
    resourceId: text("resource_id").notNull(),
    metadataJson: text("metadata_json").notNull(),
    createdAt: integer("created_at").notNull(),
  },
  (table) => ({
    actorIndex: index("audit_events_actor_idx").on(table.actorId),
  }),
);
