import type {
  ProjectCreateRequest,
  ProjectListResponse,
  ProjectResponse,
  ProjectUpdateRequest,
  ProjectVersionListResponse
} from "./contracts";
import { requestJson } from "./client";

export function listProjects(): Promise<ProjectListResponse> {
  return requestJson<ProjectListResponse>("/projects");
}

export function createProjectDocument(payload: ProjectCreateRequest): Promise<ProjectResponse> {
  return requestJson<ProjectResponse>("/projects", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function updateProjectDocument(projectId: string, payload: ProjectUpdateRequest): Promise<ProjectResponse> {
  return requestJson<ProjectResponse>(`/projects/${encodeURIComponent(projectId)}`, {
    method: "PUT",
    body: JSON.stringify(payload)
  });
}

export function copyProjectDocument(projectId: string, name?: string): Promise<ProjectResponse> {
  return requestJson<ProjectResponse>(`/projects/${encodeURIComponent(projectId)}/copy`, {
    method: "POST",
    body: JSON.stringify({ name })
  });
}

export function deleteProjectDocument(projectId: string): Promise<{ deleted: boolean; session_id: string }> {
  return requestJson<{ deleted: boolean; session_id: string }>(`/projects/${encodeURIComponent(projectId)}`, {
    method: "DELETE"
  });
}

export function listProjectVersions(projectId: string): Promise<ProjectVersionListResponse> {
  return requestJson<ProjectVersionListResponse>(`/projects/${encodeURIComponent(projectId)}/versions`);
}

export function restoreProjectVersion(projectId: string, revision: number): Promise<ProjectResponse> {
  return requestJson<ProjectResponse>(`/projects/${encodeURIComponent(projectId)}/restore`, {
    method: "POST",
    body: JSON.stringify({ revision })
  });
}
