import { create } from "zustand";

export type InitializationStep = "connection" | "auth" | "projects" | "catalogs" | "lastProject" | "draft" | "recentRun";
export type InitializationStepStatus = "pending" | "loading" | "completed" | "failed" | "skipped";

interface InitializationStepState {
  status: InitializationStepStatus;
  error: string | null;
}

interface InitializationState {
  steps: Record<InitializationStep, InitializationStepState>;
  setStep: (step: InitializationStep, status: InitializationStepStatus, error?: string | null) => void;
}

const step = (): InitializationStepState => ({ status: "pending", error: null });

export const useInitializationStore = create<InitializationState>((set) => ({
  steps: {
    connection: step(),
    auth: step(),
    projects: step(),
    catalogs: step(),
    lastProject: step(),
    draft: step(),
    recentRun: step()
  },
  setStep: (name, status, error = null) =>
    set((state) => ({ steps: { ...state.steps, [name]: { status, error } } }))
}));
