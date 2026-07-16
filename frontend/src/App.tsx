import { useEffect, useRef } from "react";
import { App as AntApp } from "antd";
import { getCurrentUser } from "./api/auth";
import { getCatalogs } from "./api/catalogs";
import { getLatestRun, restoreRunSession } from "./api/runs";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { AppLayout } from "./layouts/AppLayout";
import { useConnectionStore } from "./stores/connectionStore";
import { useInitializationStore, type InitializationStep } from "./stores/initializationStore";
import { useProjectStore } from "./stores/projectStore";
import { restorePersistedRun } from "./stores/serviceRoutingStore";

export default function App() {
  const dirty = useProjectStore((state) => state.dirty);
  const startMonitoring = useConnectionStore((state) => state.startMonitoring);
  const initialized = useRef(false);
  const initializing = useRef(false);
  const offlineDraftLoaded = useRef(false);

  useEffect(() => {
    startMonitoring();
    const unsubscribe = useConnectionStore.subscribe((state) => {
      const setStep = useInitializationStore.getState().setStep;
      if (state.status === "connected") {
        setStep("connection", "completed");
        if (!initialized.current && !initializing.current) {
          initializing.current = true;
          void initializeConnectedApplication().finally(() => {
            initialized.current = true;
            initializing.current = false;
          });
        }
      } else if (state.status === "disconnected") {
        setStep("connection", "failed", state.lastError);
        if (!offlineDraftLoaded.current && !initialized.current) {
          useProjectStore.getState().loadLocalDraft();
          setStep("draft", "completed");
          offlineDraftLoaded.current = true;
        }
      } else {
        setStep("connection", "loading");
      }
    });
    return unsubscribe;
  }, [startMonitoring]);

  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  return (
    <AntApp>
      <ErrorBoundary>
        <AppLayout />
      </ErrorBoundary>
    </AntApp>
  );
}

async function initializeConnectedApplication(): Promise<void> {
  await runInitializationStep("auth", () => getCurrentUser());
  await runInitializationStep("projects", () => useProjectStore.getState().loadFromBackend());
  useInitializationStore.getState().setStep("lastProject", "completed");
  await runInitializationStep("catalogs", () => getCatalogs());
  useProjectStore.getState().loadLocalDraft();
  useInitializationStore.getState().setStep("draft", "completed");

  const projectId = useProjectStore.getState().draftProject?.revision
    ? useProjectStore.getState().draftProject?.projectId
    : null;
  if (!projectId) {
    useInitializationStore.getState().setStep("recentRun", "skipped");
    return;
  }
  await runInitializationStep("recentRun", async () => {
    const latest = await getLatestRun(projectId);
    const restored = await restoreRunSession(latest.run_id);
    restorePersistedRun(restored.run, restored.session.session_id);
  }, true);
}

async function runInitializationStep(
  step: InitializationStep,
  action: () => Promise<unknown>,
  allowNotFound = false
): Promise<void> {
  const store = useInitializationStore.getState();
  store.setStep(step, "loading");
  try {
    await action();
    store.setStep(step, "completed");
  } catch (error) {
    const message = error instanceof Error ? error.message : "初始化失败";
    store.setStep(step, allowNotFound && message.includes("不存在") ? "skipped" : "failed", message);
  }
}
