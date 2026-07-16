import { requestJson } from "./client";

export interface DiagnosticsResponse {
  application_version: string;
  database_status: string;
  database_path: string;
  app_data_dir: string;
  runs_dir: string;
  frontend_dist_exists: boolean;
  auth_mode: string;
  job_manager_status: string;
  current_time: string;
}

export function getDiagnostics(): Promise<DiagnosticsResponse> {
  return requestJson<DiagnosticsResponse>("/diagnostics");
}
