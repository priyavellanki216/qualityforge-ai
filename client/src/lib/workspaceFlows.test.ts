import { describe, expect, it } from "vitest";
import { apiSimulationResult, canAccessWorkspaceSection, canUpdateDefectStatus, executionProgress, workspaceRoute } from "./workspaceFlows";

describe("workspace navigation flows", () => {
  it("preserves the selected workspace base when navigating", () => {
    expect(workspaceRoute("/app", "generator")).toBe("/app/generator");
    expect(workspaceRoute("/workspace", "defects")).toBe("/workspace/defects");
  });

  it("hides administrative sections for individual contributors", () => {
    expect(canAccessWorkspaceSection("developer", "audit")).toBe(false);
    expect(canAccessWorkspaceSection("qa", "team")).toBe(false);
    expect(canAccessWorkspaceSection("manager", "audit")).toBe(true);
  });
});

describe("execution control flow", () => {
  it("reports progress for running, stopped, and completed states", () => {
    expect(executionProgress(true, false)).toMatchObject({ percent: 68, label: "8 of 12 tests complete" });
    expect(executionProgress(false, true)).toMatchObject({ percent: 68, label: "Execution stopped at 8 of 12 tests" });
    expect(executionProgress(false, false)).toMatchObject({ percent: 100, label: "Last run completed" });
  });
});

describe("quality interaction helpers", () => {
  it("returns a passed API contract result only after a simulated run", () => {
    expect(apiSimulationResult(false)).toMatchObject({ state: "ready", contractPassed: false });
    expect(apiSimulationResult(true)).toMatchObject({ state: "passed", status: "200 OK", contractPassed: true });
  });

  it("limits closed defects to an explicit reopening transition", () => {
    expect(canUpdateDefectStatus("open", "in_progress")).toBe(true);
    expect(canUpdateDefectStatus("closed", "in_progress")).toBe(false);
    expect(canUpdateDefectStatus("closed", "reopened")).toBe(true);
  });
});
