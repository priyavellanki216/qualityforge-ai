import {
  boolean,
  index,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

export const roles = mysqlTable("roles", {
  id: int("id").autoincrement().primaryKey(),
  key: varchar("key", { length: 32 }).notNull().unique(),
  label: varchar("label", { length: 64 }).notNull(),
  description: text("description"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["admin", "manager", "developer", "qa", "user"]).default("qa").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const projects = mysqlTable("projects", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 128 }).notNull(),
  slug: varchar("slug", { length: 128 }).notNull().unique(),
  description: text("description"),
  status: mysqlEnum("status", ["active", "at_risk", "archived"]).default("active").notNull(),
  owner: varchar("owner", { length: 128 }).notNull(),
  stack: json("stack").$type<string[]>().notNull(),
  qualityScore: int("qualityScore").default(0).notNull(),
  lastDeploymentAt: timestamp("lastDeploymentAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [index("projects_status_idx").on(table.status)]);

export const repositories = mysqlTable("repositories", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull().references(() => projects.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 128 }).notNull(),
  provider: varchar("provider", { length: 32 }).notNull(),
  url: varchar("url", { length: 512 }).notNull(),
  branch: varchar("branch", { length: 128 }).default("main").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [index("repositories_project_idx").on(table.projectId)]);

export const environments = mysqlTable("environments", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull().references(() => projects.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 64 }).notNull(),
  type: mysqlEnum("type", ["development", "staging", "production"]).notNull(),
  url: varchar("url", { length: 512 }),
  status: mysqlEnum("status", ["healthy", "degraded", "offline"]).default("healthy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [index("environments_project_idx").on(table.projectId)]);

export const teamMembers = mysqlTable("teamMembers", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull().references(() => projects.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 128 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  role: varchar("role", { length: 64 }).notNull(),
  avatarTone: varchar("avatarTone", { length: 24 }).default("cyan").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [index("team_members_project_idx").on(table.projectId)]);

export const testSuites = mysqlTable("testSuites", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull().references(() => projects.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 128 }).notNull(),
  type: varchar("type", { length: 32 }).notNull(),
  environment: varchar("environment", { length: 64 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [index("test_suites_project_idx").on(table.projectId)]);

export const testCases = mysqlTable("testCases", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull().references(() => projects.id, { onDelete: "cascade" }),
  suiteId: int("suiteId").references(() => testSuites.id, { onDelete: "set null" }),
  key: varchar("key", { length: 32 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description").notNull(),
  preconditions: text("preconditions"),
  steps: json("steps").$type<string[]>().notNull(),
  expectedResult: text("expectedResult"),
  priority: mysqlEnum("priority", ["critical", "high", "medium", "low"]).default("medium").notNull(),
  status: mysqlEnum("status", ["ready", "draft", "deprecated"]).default("ready").notNull(),
  testType: mysqlEnum("testType", ["unit", "api", "ui", "integration", "e2e", "regression", "smoke", "performance"]).notNull(),
  environment: varchar("environment", { length: 64 }).notNull(),
  automationStatus: mysqlEnum("automationStatus", ["automated", "manual", "planned"]).default("automated").notNull(),
  tags: json("tags").$type<string[]>().notNull(),
  owner: varchar("owner", { length: 128 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [
  index("test_cases_project_idx").on(table.projectId),
  index("test_cases_type_idx").on(table.testType),
  index("test_cases_status_idx").on(table.status),
]);

export const testExecutions = mysqlTable("testExecutions", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull().references(() => projects.id, { onDelete: "cascade" }),
  suiteId: int("suiteId").references(() => testSuites.id, { onDelete: "set null" }),
  name: varchar("name", { length: 128 }).notNull(),
  environment: varchar("environment", { length: 64 }).notNull(),
  status: mysqlEnum("status", ["passed", "failed", "running", "cancelled"]).notNull(),
  totalTests: int("totalTests").default(0).notNull(),
  passedTests: int("passedTests").default(0).notNull(),
  failedTests: int("failedTests").default(0).notNull(),
  skippedTests: int("skippedTests").default(0).notNull(),
  durationSeconds: int("durationSeconds").default(0).notNull(),
  startedAt: timestamp("startedAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [index("test_executions_project_idx").on(table.projectId), index("test_executions_status_idx").on(table.status)]);

export const testResults = mysqlTable("testResults", {
  id: int("id").autoincrement().primaryKey(),
  executionId: int("executionId").notNull().references(() => testExecutions.id, { onDelete: "cascade" }),
  testCaseId: int("testCaseId").references(() => testCases.id, { onDelete: "set null" }),
  status: mysqlEnum("status", ["passed", "failed", "skipped"]).notNull(),
  durationMs: int("durationMs").default(0).notNull(),
  failureMessage: text("failureMessage"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [index("test_results_execution_idx").on(table.executionId)]);

export const defects = mysqlTable("defects", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull().references(() => projects.id, { onDelete: "cascade" }),
  key: varchar("key", { length: 32 }).notNull().unique(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description").notNull(),
  reproductionSteps: text("reproductionSteps"),
  expectedBehavior: text("expectedBehavior"),
  actualBehavior: text("actualBehavior"),
  environment: varchar("environment", { length: 64 }).notNull(),
  severity: mysqlEnum("severity", ["critical", "high", "medium", "low"]).notNull(),
  priority: mysqlEnum("priority", ["critical", "high", "medium", "low"]).notNull(),
  status: mysqlEnum("status", ["open", "in_progress", "resolved", "reopened", "closed"]).default("open").notNull(),
  assignee: varchar("assignee", { length: 128 }),
  evidenceUrl: varchar("evidenceUrl", { length: 512 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [index("defects_project_idx").on(table.projectId), index("defects_severity_idx").on(table.severity), index("defects_status_idx").on(table.status)]);

export const defectComments = mysqlTable("defectComments", {
  id: int("id").autoincrement().primaryKey(),
  defectId: int("defectId").notNull().references(() => defects.id, { onDelete: "cascade" }),
  author: varchar("author", { length: 128 }).notNull(),
  body: text("body").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [index("defect_comments_defect_idx").on(table.defectId)]);

export const pipelines = mysqlTable("pipelines", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull().references(() => projects.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 128 }).notNull(),
  branch: varchar("branch", { length: 128 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [index("pipelines_project_idx").on(table.projectId)]);

export type PipelineStage = { name: string; status: "passed" | "failed" | "running" | "skipped"; duration: string; timestamp: string; log: string };

export const pipelineRuns = mysqlTable("pipelineRuns", {
  id: int("id").autoincrement().primaryKey(),
  pipelineId: int("pipelineId").notNull().references(() => pipelines.id, { onDelete: "cascade" }),
  projectId: int("projectId").notNull().references(() => projects.id, { onDelete: "cascade" }),
  commit: varchar("commit", { length: 16 }).notNull(),
  branch: varchar("branch", { length: 128 }).notNull(),
  status: mysqlEnum("status", ["passed", "failed", "running", "warning"]).notNull(),
  qualityGate: mysqlEnum("qualityGate", ["ready", "blocked", "warning"]).notNull(),
  durationSeconds: int("durationSeconds").default(0).notNull(),
  stages: json("stages").$type<PipelineStage[]>().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [index("pipeline_runs_project_idx").on(table.projectId), index("pipeline_runs_status_idx").on(table.status)]);

export const releases = mysqlTable("releases", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull().references(() => projects.id, { onDelete: "cascade" }),
  version: varchar("version", { length: 64 }).notNull(),
  environment: varchar("environment", { length: 64 }).notNull(),
  status: mysqlEnum("status", ["ready", "blocked", "warning", "released"]).notNull(),
  score: int("score").notNull(),
  summary: text("summary").notNull(),
  releasedAt: timestamp("releasedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [index("releases_project_idx").on(table.projectId), index("releases_status_idx").on(table.status)]);

export const aiAnalyses = mysqlTable("aiAnalyses", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull().references(() => projects.id, { onDelete: "cascade" }),
  defectId: int("defectId").references(() => defects.id, { onDelete: "set null" }),
  kind: varchar("kind", { length: 64 }).notNull(),
  content: json("content").$type<Record<string, unknown>>().notNull(),
  confidence: int("confidence").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [index("ai_analyses_project_idx").on(table.projectId), index("ai_analyses_defect_idx").on(table.defectId)]);

export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").references(() => users.id, { onDelete: "set null" }),
  title: varchar("title", { length: 255 }).notNull(),
  body: text("body").notNull(),
  level: mysqlEnum("level", ["info", "warning", "critical"]).default("info").notNull(),
  readAt: timestamp("readAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const auditLogs = mysqlTable("auditLogs", {
  id: int("id").autoincrement().primaryKey(),
  actor: varchar("actor", { length: 128 }).notNull(),
  action: varchar("action", { length: 128 }).notNull(),
  resource: varchar("resource", { length: 255 }).notNull(),
  metadata: json("metadata").$type<Record<string, unknown>>(),
  ipDevice: varchar("ipDevice", { length: 255 }).default("Demo browser · 127.0.0.1").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [index("audit_logs_created_idx").on(table.createdAt)]);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
