import { desc, eq, like, or } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import * as schema from "../drizzle/schema";
import { InsertUser, users } from "../drizzle/schema";
import { calculateReleaseReadiness } from "./qualityforgeLogic";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;
  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  (["name", "email", "loginMethod"] as const).forEach(field => {
    if (user[field] !== undefined) {
      values[field] = user[field] ?? null;
      updateSet[field] = user[field] ?? null;
    }
  });
  if (user.lastSignedIn) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function ensureDemoData() {
  const db = await getDb();
  if (!db) return;
  const [existing] = await db.select({ id: schema.projects.id }).from(schema.projects).limit(1);
  if (existing) return;

  const now = Date.now();
  await db.insert(schema.roles).values([
    { key: "admin", label: "Admin", description: "Workspace administration and release governance" },
    { key: "manager", label: "Engineering Manager", description: "Release, risk, and quality visibility" },
    { key: "developer", label: "Developer", description: "Quality remediation and test ownership" },
    { key: "qa", label: "QA Engineer", description: "Test design, execution, and defect workflows" },
  ]);
  await db.insert(schema.projects).values([
    { name: "Atlas Commerce", slug: "atlas-commerce", description: "Multi-tenant checkout and order orchestration platform.", status: "at_risk", owner: "Maya Chen", stack: ["React", "Node", "PostgreSQL"], qualityScore: 91, lastDeploymentAt: new Date(now - 1000 * 60 * 43) },
    { name: "Beacon Identity", slug: "beacon-identity", description: "Authentication, consent, and enterprise SSO service.", status: "active", owner: "Jordan Lee", stack: ["Go", "gRPC", "Redis"], qualityScore: 96, lastDeploymentAt: new Date(now - 1000 * 60 * 60 * 21) },
    { name: "Pulse Analytics", slug: "pulse-analytics", description: "Usage intelligence and operational reporting APIs.", status: "active", owner: "Ari Patel", stack: ["Python", "FastAPI", "ClickHouse"], qualityScore: 88, lastDeploymentAt: new Date(now - 1000 * 60 * 60 * 52) },
  ]);
  const projectRows = await db.select().from(schema.projects).orderBy(schema.projects.id);
  const atlas = projectRows[0]!;
  const beacon = projectRows[1]!;
  const pulse = projectRows[2]!;
  await db.insert(schema.repositories).values([
    { projectId: atlas.id, name: "atlas-web", provider: "GitHub", url: "https://github.com/qualityforge-demo/atlas-web", branch: "release/2026.08" },
    { projectId: beacon.id, name: "beacon-core", provider: "GitHub", url: "https://github.com/qualityforge-demo/beacon-core", branch: "main" },
    { projectId: pulse.id, name: "pulse-api", provider: "GitHub", url: "https://github.com/qualityforge-demo/pulse-api", branch: "main" },
  ]);
  await db.insert(schema.environments).values([
    { projectId: atlas.id, name: "Staging", type: "staging", url: "https://staging.atlas.example", status: "healthy" },
    { projectId: atlas.id, name: "Production", type: "production", url: "https://atlas.example", status: "healthy" },
    { projectId: beacon.id, name: "Production", type: "production", url: "https://beacon.example", status: "healthy" },
    { projectId: pulse.id, name: "Staging", type: "staging", url: "https://staging.pulse.example", status: "degraded" },
  ]);
  await db.insert(schema.teamMembers).values([
    { projectId: atlas.id, name: "Maya Chen", email: "maya@qualityforge.demo", role: "Engineering Manager", avatarTone: "cyan" },
    { projectId: atlas.id, name: "Noah Williams", email: "noah@qualityforge.demo", role: "QA Engineer", avatarTone: "violet" },
    { projectId: atlas.id, name: "Elena Ruiz", email: "elena@qualityforge.demo", role: "Staff Developer", avatarTone: "coral" },
    { projectId: beacon.id, name: "Jordan Lee", email: "jordan@qualityforge.demo", role: "Platform Lead", avatarTone: "amber" },
    { projectId: pulse.id, name: "Ari Patel", email: "ari@qualityforge.demo", role: "SDET", avatarTone: "blue" },
  ]);
  await db.insert(schema.testSuites).values([
    { projectId: atlas.id, name: "Checkout Release Candidate", type: "Regression", environment: "Staging" },
    { projectId: atlas.id, name: "Payments Contract", type: "API", environment: "Staging" },
    { projectId: beacon.id, name: "Identity Core", type: "Integration", environment: "Production" },
    { projectId: pulse.id, name: "Analytics API", type: "API", environment: "Staging" },
  ]);
  const suites = await db.select().from(schema.testSuites).orderBy(schema.testSuites.id);
  const titles = [
    "Checkout completes with a saved payment method", "Guest checkout validates tax allocation", "Promo code is rejected after expiration", "Address normalization preserves apartment values", "Order confirmation persists on a double click", "Cart quantity updates under concurrency", "Payment authorization handles a 3DS redirect", "Retry logic avoids duplicate charges", "Refund request returns canonical order state", "Inventory reservation releases after timeout",
    "Session refresh rejects revoked credentials", "SAML assertion validates audience and issuer", "Password reset link expires at the boundary", "MFA enrollment restores backup codes", "Role change invalidates stale access tokens", "Account lockout resets after the configured window", "OAuth consent records the requested scopes", "Webhook signature rejects replayed events", "Profile API enforces tenant isolation", "Service token rotation avoids request interruption",
    "Report export pagination retains filters", "Analytics query rejects unsafe sort fields", "Cohort endpoint reports empty segments", "Dashboard drawer restores selected date range", "CSV export encodes regional characters", "Usage aggregation handles delayed events", "Rate limit response includes reset hints", "Backfill task preserves event order", "Metric API returns expected schema", "Alert policy suppresses duplicate triggers",
  ];
  const kinds: Array<typeof schema.testCases.$inferInsert["testType"]> = ["e2e", "api", "regression", "ui", "integration", "unit"];
  await db.insert(schema.testCases).values(titles.map((name, index) => ({
    projectId: index < 10 ? atlas.id : index < 20 ? beacon.id : pulse.id,
    suiteId: index < 10 ? suites[0]?.id : index < 20 ? suites[2]?.id : suites[3]?.id,
    key: `QF-${101 + index}`,
    name,
    description: `A durable ${kinds[index % kinds.length]} quality check for ${name.toLowerCase()}.`,
    steps: ["Arrange test data", "Execute the target workflow", "Assert outcome and telemetry"],
    expectedResult: "The workflow completes with the expected contract, state transition, and observability event.",
    priority: (index % 9 === 0 ? "critical" : index % 4 === 0 ? "high" : "medium") as "critical" | "high" | "medium",
    status: (index % 13 === 0 ? "draft" : "ready") as "draft" | "ready",
    testType: kinds[index % kinds.length],
    environment: index % 2 === 0 ? "Staging" : "Production",
    automationStatus: (index % 7 === 0 ? "planned" : "automated") as "planned" | "automated",
    tags: [kinds[index % kinds.length], index < 10 ? "checkout" : index < 20 ? "identity" : "analytics"],
    owner: index % 2 === 0 ? "Noah Williams" : "Ari Patel",
  })));
  const cases = await db.select().from(schema.testCases).orderBy(schema.testCases.id);
  const executionRows = Array.from({ length: 10 }, (_, index) => ({
    projectId: index < 5 ? atlas.id : index < 8 ? beacon.id : pulse.id,
    suiteId: index < 5 ? suites[0]?.id : index < 8 ? suites[2]?.id : suites[3]?.id,
    name: index < 5 ? "Checkout Release Candidate" : index < 8 ? "Identity Core" : "Analytics API",
    environment: index % 3 === 0 ? "Production" : "Staging",
    status: index === 1 || index === 6 ? "failed" as const : "passed" as const,
    totalTests: 12,
    passedTests: index === 1 || index === 6 ? 10 : 12,
    failedTests: index === 1 || index === 6 ? 2 : 0,
    skippedTests: index === 8 ? 1 : 0,
    durationSeconds: 240 + index * 31,
    startedAt: new Date(now - 1000 * 60 * 48 * index),
  }));
  await db.insert(schema.testExecutions).values(executionRows);
  const executions = await db.select().from(schema.testExecutions).orderBy(schema.testExecutions.id);
  await db.insert(schema.testResults).values(Array.from({ length: 60 }, (_, index) => ({
    executionId: executions[Math.floor(index / 6)]!.id,
    testCaseId: cases[index % cases.length]!.id,
    status: index === 7 || index === 11 || index === 39 || index === 41 ? "failed" as const : index === 52 ? "skipped" as const : "passed" as const,
    durationMs: 480 + (index % 7) * 135,
    failureMessage: [7, 11, 39, 41].includes(index) ? "Expected canonical payment state but received a partially normalized response." : null,
  })));
  const defectTitles = [
    "Checkout confirms order before payment capture completes", "SAML callback drops relay state for an enterprise tenant", "Analytics export duplicates rows after a retry", "Promo API returns 500 for a deleted campaign", "Session renewal race logs users out on two browser tabs", "Tax preview is stale after an address change", "Webhook processor accepts an expired signing key", "Search results ignore the saved segment filter", "Refund screen does not show a pending status", "API gateway timeout is surfaced as an unknown error", "Account recovery email renders an outdated brand link", "Report sharing permits a removed team member", "Inventory hold is not released after payment cancellation", "Dashboard chart clips the final date label", "Data backfill uses an unexpected default timezone",
  ];
  await db.insert(schema.defects).values(defectTitles.map((title, index) => ({
    projectId: index < 6 ? atlas.id : index < 11 ? beacon.id : pulse.id,
    key: `DEF-${142 + index}`,
    title,
    description: `QualityForge recorded this defect from an automated ${index % 2 ? "API" : "regression"} execution. The issue has sufficient reproduction context for triage.`,
    reproductionSteps: "Open the affected scenario, use the seeded customer account, complete the documented flow, and inspect the correlated service log.",
    expectedBehavior: "The workflow should preserve the documented contract and maintain correct user-visible state.",
    actualBehavior: "The observed output diverges from the expected contract under the recorded execution conditions.",
    environment: index % 3 === 0 ? "Production" : "Staging",
    severity: (index === 0 || index === 6 ? "critical" : index % 3 === 0 ? "high" : index % 3 === 1 ? "medium" : "low") as "critical" | "high" | "medium" | "low",
    priority: (index === 0 || index === 6 ? "critical" : index % 2 === 0 ? "high" : "medium") as "critical" | "high" | "medium",
    status: (index === 0 || index === 6 ? "open" : index % 5 === 0 ? "resolved" : index % 4 === 0 ? "in_progress" : "open") as "open" | "in_progress" | "resolved",
    assignee: index % 2 === 0 ? "Elena Ruiz" : "Noah Williams",
    evidenceUrl: "https://evidence.qualityforge.demo/execution/demo",
    createdAt: new Date(now - 1000 * 60 * 60 * (index + 3)),
  })));
  const pipelinesData = [
    { projectId: atlas.id, name: "Atlas deploy", branch: "release/2026.08" },
    { projectId: beacon.id, name: "Beacon secure release", branch: "main" },
    { projectId: pulse.id, name: "Pulse API delivery", branch: "main" },
  ];
  await db.insert(schema.pipelines).values(pipelinesData);
  const pipelines = await db.select().from(schema.pipelines).orderBy(schema.pipelines.id);
  const stages = ["Checkout", "Build", "Unit Tests", "API Tests", "UI Tests", "Integration Tests", "Security Checks", "Quality Gate", "Deployment"];
  await db.insert(schema.pipelineRuns).values(Array.from({ length: 6 }, (_, index) => ({
    pipelineId: pipelines[index % pipelines.length]!.id,
    projectId: pipelinesData[index % pipelines.length]!.projectId,
    commit: ["8f31a9e", "3ce82d1", "9bf347c", "f71d883", "ac29e4f", "d1e36b0"][index]!,
    branch: pipelinesData[index % pipelines.length]!.branch,
    status: index === 0 ? "warning" as const : index === 3 ? "failed" as const : "passed" as const,
    qualityGate: index === 0 ? "warning" as const : index === 3 ? "blocked" as const : "ready" as const,
    durationSeconds: 480 + index * 42,
    stages: stages.map((name, stageIndex) => ({ name, status: (index === 3 && stageIndex === 4 ? "failed" : index === 0 && stageIndex === 7 ? "running" : "passed") as "passed" | "failed" | "running", duration: `${22 + stageIndex * 7}s`, timestamp: `${14 - stageIndex}:0${stageIndex} UTC`, log: `${name} completed for demo release candidate` })),
    createdAt: new Date(now - 1000 * 60 * 55 * index),
  })));
  await db.insert(schema.releases).values([
    { projectId: atlas.id, version: "2026.08.12-rc.3", environment: "Staging", status: "warning", score: 92, summary: "Release candidate is near-ready; resolve the payment contract mismatch before production promotion." },
    { projectId: atlas.id, version: "2026.08.05", environment: "Production", status: "released", score: 95, summary: "Released after checkout regression and security gates passed." },
    { projectId: beacon.id, version: "3.14.0", environment: "Production", status: "ready", score: 97, summary: "Identity release meets quality, coverage, and stability thresholds." },
    { projectId: pulse.id, version: "1.32.0", environment: "Staging", status: "blocked", score: 79, summary: "Blocked by an open API reliability defect and insufficient failure investigation." },
    { projectId: pulse.id, version: "1.31.4", environment: "Production", status: "released", score: 90, summary: "Released with a monitored analytics export warning." },
  ]);
  await db.insert(schema.aiAnalyses).values([
    { projectId: atlas.id, defectId: 1, kind: "root_cause", confidence: 82, content: { rootCause: "Payment status normalization occurs after confirmation dispatch.", affectedComponent: "Checkout orchestration service" } },
    { projectId: beacon.id, defectId: 7, kind: "failure_cluster", confidence: 76, content: { group: "Authentication failures", recommendation: "Rotate signing key cache and replay callback tests." } },
  ]);
  await db.insert(schema.auditLogs).values([
    { actor: "Maya Chen", action: "Approved release candidate", resource: "Atlas Commerce · 2026.08.12-rc.3" },
    { actor: "Noah Williams", action: "Started test execution", resource: "Checkout Release Candidate" },
    { actor: "Forge Assistant", action: "Generated root-cause analysis", resource: "DEF-142" },
    { actor: "Elena Ruiz", action: "Updated defect status", resource: "DEF-148" },
    { actor: "Jordan Lee", action: "Created test case", resource: "QF-120" },
  ]);
}

export async function getOverview() {
  await ensureDemoData();
  const db = await getDb();
  if (!db) return emptyOverview();
  const [projectRows, cases, executions, results, defectRows, releaseRows, pipelineRows] = await Promise.all([
    db.select().from(schema.projects).orderBy(desc(schema.projects.qualityScore)),
    db.select().from(schema.testCases),
    db.select().from(schema.testExecutions).orderBy(desc(schema.testExecutions.startedAt)).limit(6),
    db.select().from(schema.testResults),
    db.select().from(schema.defects).orderBy(desc(schema.defects.updatedAt)).limit(6),
    db.select().from(schema.releases).orderBy(desc(schema.releases.createdAt)).limit(4),
    db.select().from(schema.pipelineRuns).orderBy(desc(schema.pipelineRuns.createdAt)).limit(4),
  ]);
  const passed = results.filter(result => result.status === "passed").length;
  const failed = results.filter(result => result.status === "failed").length;
  const total = Math.max(1, results.length);
  const passRate = Math.round((passed / total) * 100);
  const critical = defectRows.filter(defect => defect.severity === "critical" && !["resolved", "closed"].includes(defect.status)).length;
  const release = calculateReleaseReadiness({ passRate, coverage: 88, apiHealth: 97, stability: 92, criticalDefects: critical, regressionFailures: failed > 3 ? 2 : 1 });
  return {
    metrics: {
      projects: projectRows.length,
      automatedTests: cases.filter(item => item.automationStatus === "automated").length,
      testCases: cases.length,
      passRate,
      failureRate: Math.round((failed / total) * 100),
      defects: defectRows.length,
      criticalDefects: critical,
      coverage: 88,
      apiHealth: 97,
      regressionStatus: failed > 3 ? "Watch" : "Stable",
      releaseScore: release.score,
      releaseState: release.state,
      qualityScore: Math.round((projectRows.reduce((sum, project) => sum + project.qualityScore, 0) / Math.max(1, projectRows.length))),
    },
    projects: projectRows,
    executions,
    defects: defectRows,
    releases: releaseRows,
    pipelineRuns: pipelineRows,
    qualityTrend: [78, 81, 80, 84, 86, 85, 89, 91, release.score],
    coverageTrend: [72, 73, 76, 77, 79, 80, 82, 86, 88],
    failureGroups: [
      { name: "Authentication", value: 18, color: "#f48b7a" },
      { name: "API timeout", value: 11, color: "#f4bd6b" },
      { name: "Validation", value: 9, color: "#72d7dd" },
      { name: "Selectors", value: 6, color: "#9e9cf5" },
    ],
  };
}

export async function listProjects() {
  await ensureDemoData();
  const db = await getDb();
  return db ? db.select().from(schema.projects).orderBy(desc(schema.projects.qualityScore)) : [];
}

export async function createProject(input: { name: string; description: string; owner: string; stack: string[] }) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  const slug = `${input.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}-${String(Date.now()).slice(-4)}`;
  await db.insert(schema.projects).values({ name: input.name, slug, description: input.description, owner: input.owner, stack: input.stack.filter(Boolean), status: "active", qualityScore: 72 });
  await recordAudit("Demo operator", "Created project", input.name);
  return { success: true, slug };
}

export async function updateProject(input: { id: number; name: string; description: string; owner: string; stack: string[] }) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  await db.update(schema.projects).set({ name: input.name, description: input.description, owner: input.owner, stack: input.stack.filter(Boolean) }).where(eq(schema.projects.id, input.id));
  await recordAudit("Demo operator", "Updated project", input.name);
  return { success: true };
}

export async function archiveProject(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  await db.update(schema.projects).set({ status: "archived" }).where(eq(schema.projects.id, id));
  await recordAudit("Demo operator", "Archived project", `Project ${id}`);
  return { success: true };
}

export async function listTestCases(search?: string) {
  await ensureDemoData();
  const db = await getDb();
  if (!db) return [];
  if (!search) return db.select().from(schema.testCases).orderBy(desc(schema.testCases.updatedAt));
  const searchTerm = `%${search}%`;
  return db.select().from(schema.testCases).where(or(like(schema.testCases.name, searchTerm), like(schema.testCases.key, searchTerm))).orderBy(desc(schema.testCases.updatedAt));
}

export async function createTestCase(input: {
  name: string; description: string; testType: "unit" | "api" | "ui" | "integration" | "e2e" | "regression" | "smoke" | "performance"; priority: "critical" | "high" | "medium" | "low";
}) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  const [project] = await db.select().from(schema.projects).limit(1);
  if (!project) throw new Error("Create a project before creating a test case");
  const key = `QF-${String(Date.now()).slice(-5)}`;
  await db.insert(schema.testCases).values({
    projectId: project.id,
    key,
    name: input.name,
    description: input.description,
    steps: ["Prepare test data", "Execute the workflow", "Validate the expected result"],
    priority: input.priority,
    status: "ready",
    testType: input.testType,
    environment: "Staging",
    automationStatus: "planned",
    tags: ["new", input.testType],
    owner: "Demo operator",
  });
  await recordAudit("Demo operator", "Created test case", key);
  return { success: true, key };
}

export async function listDefects() {
  await ensureDemoData();
  const db = await getDb();
  return db ? db.select().from(schema.defects).orderBy(desc(schema.defects.updatedAt)) : [];
}

export async function updateDefect(id: number, status: "open" | "in_progress" | "resolved" | "reopened" | "closed", assignee?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  await db.update(schema.defects).set({ status, assignee: assignee || undefined }).where(eq(schema.defects.id, id));
  await recordAudit("Demo operator", "Updated defect", `DEF-${id}`);
  return { success: true };
}

export async function listTeam() {
  await ensureDemoData();
  const db = await getDb();
  return db ? db.select().from(schema.teamMembers).orderBy(schema.teamMembers.name) : [];
}

export async function listAuditLogs() {
  await ensureDemoData();
  const db = await getDb();
  return db ? db.select().from(schema.auditLogs).orderBy(desc(schema.auditLogs.createdAt)).limit(20) : [];
}

export async function listPipelineRuns() {
  await ensureDemoData();
  const db = await getDb();
  return db ? db.select().from(schema.pipelineRuns).orderBy(desc(schema.pipelineRuns.createdAt)).limit(8) : [];
}

export async function recordAudit(actor: string, action: string, resource: string) {
  const db = await getDb();
  if (!db) return;
  await db.insert(schema.auditLogs).values({ actor, action, resource });
}

function emptyOverview() {
  return {
    metrics: { projects: 0, automatedTests: 0, testCases: 0, passRate: 0, failureRate: 0, defects: 0, criticalDefects: 0, coverage: 0, apiHealth: 0, regressionStatus: "Waiting", releaseScore: 0, releaseState: "warning" as const, qualityScore: 0 },
    projects: [], executions: [], defects: [], releases: [], pipelineRuns: [], qualityTrend: [], coverageTrend: [], failureGroups: [],
  };
}
