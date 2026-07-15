import type { UserResponse } from "./contracts";
import { requestJson } from "./client";

export function getCurrentUser(): Promise<UserResponse> {
  return requestJson<UserResponse>("/auth/me");
}

export function login(username: string, password: string): Promise<{ user: UserResponse; token?: string | null }> {
  return requestJson<{ user: UserResponse; token?: string | null }>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password })
  });
}

export function logout(): Promise<{ deleted: boolean; session_id: string }> {
  return requestJson<{ deleted: boolean; session_id: string }>("/auth/logout", { method: "POST" });
}
