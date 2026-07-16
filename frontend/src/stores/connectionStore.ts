import { create } from "zustand";
import { ApiClientError } from "../api/client";
import { getDiagnostics, type DiagnosticsResponse } from "../api/diagnostics";
import { getHealth } from "../api/health";

export type BackendConnectionStatus = "checking" | "connected" | "disconnected" | "reconnecting";

interface ConnectionState {
  status: BackendConnectionStatus;
  lastSuccessfulCheckAt: string | null;
  lastFailureAt: string | null;
  lastError: string | null;
  requestId: string | null;
  retryCount: number;
  diagnostics: DiagnosticsResponse | null;
  startMonitoring: () => void;
  stopMonitoring: () => void;
  checkNow: () => Promise<void>;
  loadDiagnostics: () => Promise<DiagnosticsResponse>;
}

let retryTimer: number | null = null;
let monitoring = false;
let checkInFlight: Promise<void> | null = null;

function scheduleNext(delayMs: number): void {
  if (!monitoring) return;
  if (retryTimer !== null) window.clearTimeout(retryTimer);
  retryTimer = window.setTimeout(() => void useConnectionStore.getState().checkNow(), delayMs);
}

export const useConnectionStore = create<ConnectionState>((set, get) => ({
  status: "checking",
  lastSuccessfulCheckAt: null,
  lastFailureAt: null,
  lastError: null,
  requestId: null,
  retryCount: 0,
  diagnostics: null,

  startMonitoring: () => {
    if (monitoring) return;
    monitoring = true;
    set({ status: get().retryCount > 0 ? "reconnecting" : "checking" });
    void get().checkNow();
  },

  stopMonitoring: () => {
    monitoring = false;
    if (retryTimer !== null) window.clearTimeout(retryTimer);
    retryTimer = null;
  },

  checkNow: async () => {
    if (checkInFlight) return checkInFlight;
    const previousStatus = get().status;
    if (previousStatus === "disconnected") set({ status: "reconnecting" });
    checkInFlight = (async () => {
      try {
        const health = await getHealth();
        if (health.status !== "ok") throw new Error(`Unexpected health status: ${health.status}`);
        set({
          status: "connected",
          lastSuccessfulCheckAt: new Date().toISOString(),
          lastError: null,
          requestId: null,
          retryCount: 0
        });
        scheduleNext(5000);
      } catch (error) {
        const apiError = error instanceof ApiClientError ? error : null;
        set((state) => ({
          status: "disconnected",
          lastFailureAt: new Date().toISOString(),
          lastError: error instanceof Error ? error.message : "后端连接失败",
          requestId: apiError?.body.requestId ?? null,
          retryCount: state.retryCount + 1
        }));
        scheduleNext(5000);
      } finally {
        checkInFlight = null;
      }
    })();
    return checkInFlight;
  },

  loadDiagnostics: async () => {
    const diagnostics = await getDiagnostics();
    set({ diagnostics });
    return diagnostics;
  }
}));

export const connectionStatusLabel: Record<BackendConnectionStatus, string> = {
  checking: "正在检查后端",
  connected: "后端已连接",
  disconnected: "后端连接中断",
  reconnecting: "正在重新连接"
};
