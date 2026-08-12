import { describe, expect, it } from "vitest";
import { buildFallbackTests, calculateReleaseReadiness } from "./qualityforgeLogic";

describe("QualityForge release readiness", () => {
  it("returns the requested demo readiness score for the seeded release signal", () => {
    const outcome = calculateReleaseReadiness({ passRate: 92, coverage: 88, apiHealth: 97, stability: 92, criticalDefects: 1, regressionFailures: 2 });
    expect(outcome.score).toBe(92);
    expect(outcome.state).toBe("blocked");
  });

  it("blocks a release with a critical defect", () => {
    const outcome = calculateReleaseReadiness({ passRate: 96, coverage: 91, apiHealth: 98, stability: 93, criticalDefects: 1, regressionFailures: 0 });
    expect(outcome.state).toBe("blocked");
    expect(outcome.score).toBeLessThan(100);
  });

  it("marks a healthy release ready", () => {
    const outcome = calculateReleaseReadiness({ passRate: 98, coverage: 94, apiHealth: 99, stability: 95, criticalDefects: 0, regressionFailures: 0 });
    expect(outcome.state).toBe("ready");
    expect(outcome.score).toBeGreaterThanOrEqual(90);
  });
});

describe("QualityForge fallback test generation", () => {
  it("creates a useful mix of test strategies", () => {
    const tests = buildFallbackTests("saved search", "/v1/searches");
    expect(tests).toHaveLength(5);
    expect(tests.some(test => test.type === "Security")).toBe(true);
    expect(tests.some(test => test.type === "API")).toBe(true);
  });
});
