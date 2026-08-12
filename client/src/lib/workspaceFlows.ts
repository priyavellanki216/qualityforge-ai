export type WorkspaceRole = "admin" | "manager" | "developer" | "qa" | "user";

export function workspaceRoute(base: "/app" | "/workspace", section: string) {
  return `${base}/${section}`;
}

export function canAccessWorkspaceSection(role: WorkspaceRole, section: string) {
  if (role === "admin" || role === "manager") return true;
  return !["audit", "team"].includes(section);
}

export function executionProgress(running: boolean, stopped: boolean) {
  if (running || stopped) return { percent: 68, label: running ? "8 of 12 tests complete" : "Execution stopped at 8 of 12 tests" };
  return { percent: 100, label: "Last run completed" };
}

export function apiSimulationResult(hasRun: boolean) {
  return hasRun
    ? { state: "passed" as const, status: "200 OK", duration: "284 ms", contractPassed: true }
    : { state: "ready" as const, status: null, duration: null, contractPassed: false };
}

export function canUpdateDefectStatus(current: string, next: string) {
  if (current === "closed") return next === "reopened";
  return current !== next;
}
