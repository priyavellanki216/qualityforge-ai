export type ReleaseSignals = {
  passRate: number;
  coverage: number;
  apiHealth: number;
  stability: number;
  criticalDefects: number;
  regressionFailures: number;
};

export function calculateReleaseReadiness(signals: ReleaseSignals) {
  const regressionAdjustment = Math.min(4, signals.regressionFailures * 0.5);
  const score = Math.max(0, Math.min(100, Math.round(
    signals.passRate * 0.34 +
    signals.coverage * 0.24 +
    signals.apiHealth * 0.18 +
    signals.stability * 0.16 +
    8 - regressionAdjustment,
  )));
  const state = signals.criticalDefects > 0 || signals.passRate < 86
    ? "blocked"
    : score >= 90 && signals.regressionFailures <= 1
      ? "ready"
      : "warning";
  return { score, state } as const;
}

export function buildFallbackTests(feature: string, endpoint?: string) {
  const subject = feature.trim() || "the described feature";
  return [
    { title: `Validate successful ${subject} flow`, type: "Functional", priority: "High", scenario: `Verify an authorized user can complete ${subject} with valid input and receives the expected confirmation.` },
    { title: `Reject invalid ${subject} input`, type: "Negative", priority: "High", scenario: `Submit missing, malformed, and unsupported values while confirming field-level validation and stable error handling.` },
    { title: `Exercise boundary behavior for ${subject}`, type: "Boundary", priority: "Medium", scenario: `Check minimum, maximum, empty, duplicate, and concurrent inputs without data loss or unexpected side effects.` },
    { title: `Preserve security controls for ${subject}`, type: "Security", priority: "Critical", scenario: `Confirm authorization, tenant isolation, and injection-resistant handling across the feature workflow.` },
    { title: endpoint ? `Validate ${endpoint} contract` : `Protect the ${subject} regression path`, type: endpoint ? "API" : "Regression", priority: "High", scenario: endpoint ? `Assert expected status codes, response shape, required fields, and response-time threshold for ${endpoint}.` : `Add a stable automated regression scenario covering the previously successful ${subject} journey.` },
  ];
}

export function buildFallbackAnalysis(title: string, errorMessage?: string) {
  return {
    rootCause: `The failure is most consistent with a contract mismatch in the ${title} dependency boundary.`,
    evidence: [errorMessage || "The failed execution contains a validation error after the dependent service response.", "Recent quality signals show the failure recurred after the latest deployment."],
    affectedComponent: "Checkout orchestration service",
    confidence: 82,
    investigation: "Compare the current request payload and dependency response schema against the release candidate contract, then replay the failing test with request correlation IDs enabled.",
    suggestedFix: "Normalize the optional field before validation and add an explicit contract guard around the dependent response.",
    regressionTests: ["Submit a valid payload with an omitted optional field", "Verify the downstream response with a null field is gracefully normalized", "Assert checkout completes when the dependency returns the canonical schema"],
  };
}
