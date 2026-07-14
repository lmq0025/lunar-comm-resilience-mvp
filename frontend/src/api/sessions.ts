import type {
  AnalyzeFaultImpactStepResponse,
  BuildTopologyStepResponse,
  CalculateRoutesStepResponse,
  InjectFaultsStepResponse,
  RunNominalStepResponse,
  ScenarioPayload,
  SessionSummaryResponse
} from "./contracts";
import { requestJson } from "./client";

export function createSession(scenario: ScenarioPayload): Promise<SessionSummaryResponse> {
  return requestJson<SessionSummaryResponse>("/sessions", {
    method: "POST",
    body: JSON.stringify({ scenario })
  });
}

export function deleteSession(sessionId: string): Promise<{ deleted: boolean; session_id: string }> {
  return requestJson<{ deleted: boolean; session_id: string }>(`/sessions/${encodeURIComponent(sessionId)}`, {
    method: "DELETE"
  });
}

export function buildTopologyStep(sessionId: string): Promise<BuildTopologyStepResponse> {
  return requestJson<BuildTopologyStepResponse>(`/sessions/${encodeURIComponent(sessionId)}/steps/build-topology`, {
    method: "POST"
  });
}

export function calculateRoutesStep(sessionId: string): Promise<CalculateRoutesStepResponse> {
  return requestJson<CalculateRoutesStepResponse>(`/sessions/${encodeURIComponent(sessionId)}/steps/calculate-routes`, {
    method: "POST"
  });
}

export function runNominalStep(sessionId: string): Promise<RunNominalStepResponse> {
  return requestJson<RunNominalStepResponse>(`/sessions/${encodeURIComponent(sessionId)}/steps/run-nominal`, {
    method: "POST"
  });
}

export function injectFaultsStep(sessionId: string): Promise<InjectFaultsStepResponse> {
  return requestJson<InjectFaultsStepResponse>(`/sessions/${encodeURIComponent(sessionId)}/steps/inject-faults`, {
    method: "POST"
  });
}

export function analyzeFaultImpactStep(sessionId: string): Promise<AnalyzeFaultImpactStepResponse> {
  return requestJson<AnalyzeFaultImpactStepResponse>(`/sessions/${encodeURIComponent(sessionId)}/steps/analyze-fault-impact`, {
    method: "POST"
  });
}
