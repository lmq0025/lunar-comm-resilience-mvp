import { create } from "zustand";

export type MainMenuKey =
  | "projects"
  | "topology"
  | "services"
  | "faults"
  | "healing"
  | "simulation"
  | "results"
  | "runHistory"
  | "experiments";

interface UiStoreState {
  collapsed: boolean;
  activeMenu: MainMenuKey;
  validationPanelOpen: boolean;
  setCollapsed: (collapsed: boolean) => void;
  setActiveMenu: (key: MainMenuKey) => void;
  setValidationPanelOpen: (open: boolean) => void;
}

export const useUiStore = create<UiStoreState>((set) => ({
  collapsed: false,
  activeMenu: "projects",
  validationPanelOpen: true,
  setCollapsed: (collapsed) => set({ collapsed }),
  setActiveMenu: (activeMenu) => set({ activeMenu }),
  setValidationPanelOpen: (validationPanelOpen) => set({ validationPanelOpen })
}));
