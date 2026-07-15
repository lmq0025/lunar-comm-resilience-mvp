import type {
  AnalyzeFaultImpactStepResponse,
  ArtifactManifestResponse,
  BuildTopologyStepResponse,
  CalculateRoutesStepResponse,
  ExecuteHealingStepResponse,
  InjectFaultsStepResponse,
  RecalculateRoutesStepResponse,
  RunAfterHealingStepResponse,
  RunNominalStepResponse,
  ScenarioPayload,
  SessionSummaryResponse,
  VerifyIndicatorsStepResponse
} from "./contracts";
import { requestBlob, requestJson } from "./client";

export function createSession(
  scenario: ScenarioPayload,
  project?: { projectId?: string | null; projectRevision?: number | null }
): Promise<SessionSummaryResponse> {
  return requestJson<SessionSummaryResponse>("/sessions", {
    method: "POST",
    body: JSON.stringify({
      scenario,
      project_id: project?.projectId ?? null,
      project_revision: project?.projectRevision ?? null
    })
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

export function executeHealingStep(sessionId: string): Promise<ExecuteHealingStepResponse> {
  return requestJson<ExecuteHealingStepResponse>(`/sessions/${encodeURIComponent(sessionId)}/steps/execute-healing`, {
    method: "POST"
  });
}

export function recalculateRoutesStep(sessionId: string): Promise<RecalculateRoutesStepResponse> {
  return requestJson<RecalculateRoutesStepResponse>(`/sessions/${encodeURIComponent(sessionId)}/steps/recalculate-routes`, {
    method: "POST"
  });
}

export function runAfterHealingStep(sessionId: string): Promise<RunAfterHealingStepResponse> {
  return requestJson<RunAfterHealingStepResponse>(`/sessions/${encodeURIComponent(sessionId)}/steps/run-after-healing`, {
    method: "POST"
  });
}

export function verifyIndicatorsStep(sessionId: string): Promise<VerifyIndicatorsStepResponse> {
  return requestJson<VerifyIndicatorsStepResponse>(`/sessions/${encodeURIComponent(sessionId)}/steps/verify-indicators`, {
    method: "POST"
  });
}

export function getArtifactManifest(sessionId: string): Promise<ArtifactManifestResponse> {
  return requestJson<ArtifactManifestResponse>(`/sessions/${encodeURIComponent(sessionId)}/artifacts`);
}

export function downloadArtifact(sessionId: string, filename: string): Promise<Blob> {
  return requestBlob(`/sessions/${encodeURIComponent(sessionId)}/artifacts/files/${encodeURIComponent(filename)}`);
}

export function downloadArtifactBundle(sessionId: string): Promise<Blob> {
  return requestBlob(`/sessions/${encodeURIComponent(sessionId)}/artifacts/bundle`);
}
