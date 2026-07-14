import { create } from "zustand";
import type { ScenarioValidationResponse } from "../api/contracts";
import type { EditorViewport, LunarProjectDocument, ValidationStatus } from "../types/project";
import { cloneProject, listProjectItems, loadActiveProjectId, loadProjects, saveActiveProjectId, saveProjects } from "../utils/storage";
import { createBlankScenario } from "../utils/scenarioTemplates";

interface ProjectStoreState {
  projects: LunarProjectDocument[];
  activeProjectId: string | null;
  draftProject: LunarProjectDocument | null;
  dirty: boolean;
  validationStatus: ValidationStatus;
  validationResult: ScenarioValidationResponse | null;
  loadFromStorage: () => void;
  createProject: (name: string, description: string) => LunarProjectDocument;
  openProject: (projectId: string) => void;
  saveCurrent: () => void;
  saveAs: (name: string, description: string) => LunarProjectDocument | null;
  duplicateProject: (projectId: string) => LunarProjectDocument;
  renameProject: (projectId: string, name: string, description: string) => void;
  deleteProject: (projectId: string) => void;
  importProject: (project: LunarProjectDocument) => LunarProjectDocument;
  updateDraftScenario: (updater: (scenario: LunarProjectDocument["scenario"]) => LunarProjectDocument["scenario"]) => void;
  updateDraftEditor: (updater: (editor: LunarProjectDocument["editor"]) => LunarProjectDocument["editor"]) => void;
  updateViewport: (viewport: EditorViewport) => void;
  markDirty: () => void;
  setValidation: (status: ValidationStatus, result: ScenarioValidationResponse | null) => void;
  getCurrentScenario: () => LunarProjectDocument["scenario"] | null;
}

export const useProjectStore = create<ProjectStoreState>((set, get) => ({
  projects: [],
  activeProjectId: null,
  draftProject: null,
  dirty: false,
  validationStatus: "未验证",
  validationResult: null,

  loadFromStorage: () => {
    const projects = loadProjects();
    const activeProjectId = loadActiveProjectId();
    const activeProject = projects.find((project) => project.projectId === activeProjectId) ?? null;
    set({
      projects,
      activeProjectId: activeProject?.projectId ?? null,
      draftProject: activeProject ? normalizeEditor(cloneProject(activeProject)) : null,
      dirty: false,
      validationStatus: "未验证",
      validationResult: null
    });
  },

  createProject: (name, description) => {
    const now = new Date().toISOString();
    const project: LunarProjectDocument = {
      schemaVersion: "1.0",
      projectId: crypto.randomUUID(),
      name,
      description,
      createdAt: now,
      updatedAt: now,
      scenario: createBlankScenario(name),
      editor: { nodeTypeCounters: {} }
    };
    saveActiveProjectId(project.projectId);
    set({
      activeProjectId: project.projectId,
      draftProject: project,
      dirty: true,
      validationStatus: "未验证",
      validationResult: null
    });
    return project;
  },

  openProject: (projectId) => {
    const project = get().projects.find((item) => item.projectId === projectId);
    if (!project) return;
    saveActiveProjectId(projectId);
    set({
      activeProjectId: projectId,
      draftProject: normalizeEditor(cloneProject(project)),
      dirty: false,
      validationStatus: "未验证",
      validationResult: null
    });
  },

  saveCurrent: () => {
    const draft = get().draftProject;
    if (!draft) return;
    const saved = { ...normalizeEditor(cloneProject(draft)), updatedAt: new Date().toISOString() };
    const nextProjects = upsertProject(get().projects, saved);
    saveProjects(nextProjects);
    saveActiveProjectId(saved.projectId);
    set({
      projects: nextProjects,
      activeProjectId: saved.projectId,
      draftProject: cloneProject(saved),
      dirty: false
    });
  },

  saveAs: (name, description) => {
    const draft = get().draftProject;
    if (!draft) return null;
    const now = new Date().toISOString();
    const copied: LunarProjectDocument = {
      ...normalizeEditor(cloneProject(draft)),
      projectId: crypto.randomUUID(),
      name,
      description,
      createdAt: now,
      updatedAt: now
    };
    const nextProjects = [...get().projects, copied];
    saveProjects(nextProjects);
    saveActiveProjectId(copied.projectId);
    set({
      projects: nextProjects,
      activeProjectId: copied.projectId,
      draftProject: cloneProject(copied),
      dirty: false,
      validationStatus: "未验证",
      validationResult: null
    });
    return copied;
  },

  duplicateProject: (projectId) => {
    const source = get().projects.find((project) => project.projectId === projectId);
    if (!source) throw new Error("项目不存在");
    const now = new Date().toISOString();
    const copied: LunarProjectDocument = {
      ...normalizeEditor(cloneProject(source)),
      projectId: crypto.randomUUID(),
      name: `${source.name} - 副本`,
      createdAt: now,
      updatedAt: now
    };
    const nextProjects = [...get().projects, copied];
    saveProjects(nextProjects);
    set({ projects: nextProjects });
    return copied;
  },

  renameProject: (projectId, name, description) => {
    const nextProjects = get().projects.map((project) =>
      project.projectId === projectId ? { ...project, name, description, updatedAt: new Date().toISOString() } : project
    );
    saveProjects(nextProjects);
    set((state) => ({
      projects: nextProjects,
      draftProject: state.draftProject?.projectId === projectId ? { ...state.draftProject, name, description } : state.draftProject,
      dirty: state.draftProject?.projectId === projectId ? true : state.dirty
    }));
  },

  deleteProject: (projectId) => {
    const nextProjects = get().projects.filter((project) => project.projectId !== projectId);
    saveProjects(nextProjects);
    const deletingActive = get().activeProjectId === projectId;
    const nextActive = deletingActive ? nextProjects[0] ?? null : get().draftProject;
    saveActiveProjectId(nextActive?.projectId ?? null);
    set({
      projects: nextProjects,
      activeProjectId: nextActive?.projectId ?? null,
      draftProject: nextActive ? normalizeEditor(cloneProject(nextActive)) : null,
      dirty: false,
      validationStatus: "未验证",
      validationResult: null
    });
  },

  importProject: (project) => {
    const now = new Date().toISOString();
    const existingNames = new Set(get().projects.map((item) => item.name));
    const imported: LunarProjectDocument = normalizeEditor({
      ...cloneProject(project),
      projectId: crypto.randomUUID(),
      name: existingNames.has(project.name) ? `${project.name} - 导入` : project.name,
      createdAt: now,
      updatedAt: now
    });
    const nextProjects = [...get().projects, imported];
    saveProjects(nextProjects);
    saveActiveProjectId(imported.projectId);
    set({
      projects: nextProjects,
      activeProjectId: imported.projectId,
      draftProject: cloneProject(imported),
      dirty: false,
      validationStatus: "未验证",
      validationResult: null
    });
    return imported;
  },

  updateDraftScenario: (updater) => {
    const draft = get().draftProject;
    if (!draft) return;
    set({
      draftProject: { ...draft, scenario: updater(draft.scenario) },
      dirty: true,
      validationStatus: get().validationStatus === "未验证" ? "未验证" : "验证结果已过期"
    });
  },

  updateDraftEditor: (updater) => {
    const draft = get().draftProject;
    if (!draft) return;
    set({
      draftProject: { ...draft, editor: updater(draft.editor) },
      dirty: true,
      validationStatus: get().validationStatus === "未验证" ? "未验证" : "验证结果已过期"
    });
  },

  updateViewport: (viewport) => {
    get().updateDraftEditor((editor) => ({ ...editor, viewport }));
  },

  markDirty: () => {
    set({
      dirty: true,
      validationStatus: get().validationStatus === "未验证" ? "未验证" : "验证结果已过期"
    });
  },

  setValidation: (status, result) => {
    set({ validationStatus: status, validationResult: result });
  },

  getCurrentScenario: () => get().draftProject?.scenario ?? null
}));

export function selectProjectItems() {
  return listProjectItems(useProjectStore.getState().projects);
}

function upsertProject(projects: LunarProjectDocument[], project: LunarProjectDocument): LunarProjectDocument[] {
  const exists = projects.some((item) => item.projectId === project.projectId);
  return exists ? projects.map((item) => (item.projectId === project.projectId ? project : item)) : [...projects, project];
}

function normalizeEditor(project: LunarProjectDocument): LunarProjectDocument {
  return {
    ...project,
    editor: {
      ...project.editor,
      nodeTypeCounters: project.editor.nodeTypeCounters ?? inferNodeTypeCounters(project)
    }
  };
}

function inferNodeTypeCounters(project: LunarProjectDocument): Record<string, number> {
  const counters: Record<string, number> = {};
  project.scenario.nodes.forEach((node) => {
    const match = new RegExp(`^${node.type}_(\\d+)$`).exec(node.id);
    const current = counters[node.type] ?? 0;
    counters[node.type] = match ? Math.max(current, Number(match[1])) : current;
  });
  return counters;
}
