import type { JobResponse, RestoreRunSessionResponse, SimulationRunListResponse, SimulationRunResponse } from "./contracts";
import { requestJson } from "./client";

export function listRuns(projectId?: string | null): Promise<SimulationRunListResponse> {
  const query = projectId ? `?project_id=${encodeURIComponent(projectId)}` : "";
  return requestJson<SimulationRunListResponse>(`/runs${query}`);
}

export function getLatestRun(projectId?: string | null): Promise<SimulationRunResponse> {
  const query = projectId ? `?project_id=${encodeURIComponent(projectId)}` : "";
  return requestJson<SimulationRunResponse>(`/runs/latest${query}`);
}

export function getRun(runId: string): Promise<SimulationRunResponse> {
  return requestJson<SimulationRunResponse>(`/runs/${encodeURIComponent(runId)}`);
}

export function restoreRunSession(runId: string): Promise<RestoreRunSessionResponse> {
  return requestJson<RestoreRunSessionResponse>(`/runs/${encodeURIComponent(runId)}/restore-session`, {
    method: "POST"
  });
}

export function createStepJob(runId: string, stepName: string): Promise<JobResponse> {
  return requestJson<JobResponse>(`/runs/${encodeURIComponent(runId)}/jobs/${encodeURIComponent(stepName)}`, {
    method: "POST"
  });
}

export function getJob(jobId: string): Promise<JobResponse> {
  return requestJson<JobResponse>(`/jobs/${encodeURIComponent(jobId)}`);
}

export function cancelJob(jobId: string): Promise<JobResponse> {
  return requestJson<JobResponse>(`/jobs/${encodeURIComponent(jobId)}/cancel`, {
    method: "POST"
  });
}
