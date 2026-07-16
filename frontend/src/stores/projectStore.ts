import { create } from "zustand";
import { ApiClientError } from "../api/client";
import type { ProjectResponse, ScenarioValidationResponse } from "../api/contracts";
import {
  copyProjectDocument,
  createProjectDocument,
  deleteProjectDocument,
  listProjects,
  updateProjectDocument
} from "../api/projects";
import type { EditorViewport, LunarProjectDocument, ProjectSaveStatus, ValidationStatus } from "../types/project";
import {
  cloneProject,
  listProjectItems,
  loadActiveProjectId,
  loadDraftProject,
  saveActiveProjectId,
  saveDraftProject
} from "../utils/storage";
import { createBlankScenario } from "../utils/scenarioTemplates";

interface ProjectStoreState {
  projects: LunarProjectDocument[];
  activeProjectId: string | null;
  draftProject: LunarProjectDocument | null;
  dirty: boolean;
  saveStatus: ProjectSaveStatus;
  saveError: string | null;
  saveRequestId: string | null;
  loadingProjects: boolean;
  validationStatus: ValidationStatus;
  validationResult: ScenarioValidationResponse | null;
  loadFromStorage: () => void;
  loadLocalDraft: () => void;
  loadFromBackend: () => Promise<void>;
  createProject: (name: string, description: string) => LunarProjectDocument;
  openProject: (projectId: string) => void;
  saveCurrent: () => Promise<LunarProjectDocument | null>;
  retrySave: () => Promise<LunarProjectDocument | null>;
  saveAs: (name: string, description: string) => Promise<LunarProjectDocument | null>;
  duplicateProject: (projectId: string) => Promise<LunarProjectDocument>;
  renameProject: (projectId: string, name: string, description: string) => Promise<void>;
  deleteProject: (projectId: string) => Promise<void>;
  importProject: (project: LunarProjectDocument) => LunarProjectDocument;
  updateDraftScenario: (updater: (scenario: LunarProjectDocument["scenario"]) => LunarProjectDocument["scenario"]) => void;
  updateDraftEditor: (updater: (editor: LunarProjectDocument["editor"]) => LunarProjectDocument["editor"]) => void;
  updateViewport: (viewport: EditorViewport) => void;
  markDirty: () => void;
  setValidation: (status: ValidationStatus, result: ScenarioValidationResponse | null) => void;
  getCurrentScenario: () => LunarProjectDocument["scenario"] | null;
}

const NOT_VALIDATED = "未验证" as ValidationStatus;

export const useProjectStore = create<ProjectStoreState>((set, get) => ({
  projects: [],
  activeProjectId: null,
  draftProject: null,
  dirty: false,
  saveStatus: "未保存",
  saveError: null,
  saveRequestId: null,
  loadingProjects: false,
  validationStatus: NOT_VALIDATED,
  validationResult: null,

  loadFromStorage: () => get().loadLocalDraft(),

  loadLocalDraft: () => {
    const draft = loadDraftProject();
    if (!draft) return;
    const normalized = normalizeEditor(cloneProject(draft));
    set({
      activeProjectId: normalized.projectId,
      draftProject: normalized,
      dirty: true,
      saveStatus: "仅保存在本地草稿",
      saveError: null,
      saveRequestId: null,
      validationStatus: NOT_VALIDATED,
      validationResult: null
    });
  },

  loadFromBackend: async () => {
    set({ loadingProjects: true });
    try {
      const response = await listProjects();
      const backendProjects = response.projects.map(projectFromBackend);
      const preferredId = loadActiveProjectId();
      const active = backendProjects.find((project) => project.projectId === preferredId) ?? backendProjects[0] ?? null;
      set({
        projects: backendProjects,
        activeProjectId: active?.projectId ?? null,
        draftProject: active ? cloneProject(active) : null,
        dirty: false,
        saveStatus: active ? "已保存到数据库" : "未保存",
        saveError: null,
        saveRequestId: null,
        loadingProjects: false
      });
      saveActiveProjectId(active?.projectId ?? null);
    } catch (error) {
      set({ loadingProjects: false });
      throw error;
    }
  },

  createProject: (name, description) => {
    const now = new Date().toISOString();
    const project: LunarProjectDocument = normalizeEditor({
      schemaVersion: "1.0",
      projectId: crypto.randomUUID(),
      name,
      description,
      createdAt: now,
      updatedAt: now,
      scenario: createBlankScenario(name),
      editor: { nodeTypeCounters: {} }
    });
    setDraft(set, project, "未保存");
    return project;
  },

  openProject: (projectId) => {
    const project = get().projects.find((item) => item.projectId === projectId);
    if (!project) return;
    saveActiveProjectId(projectId);
    saveDraftProject(null);
    set({
      activeProjectId: projectId,
      draftProject: normalizeEditor(cloneProject(project)),
      dirty: false,
      saveStatus: "已保存到数据库",
      saveError: null,
      saveRequestId: null,
      validationStatus: NOT_VALIDATED,
      validationResult: null
    });
  },

  saveCurrent: async () => {
    const draft = get().draftProject;
    if (!draft) return null;
    set({ saveStatus: "保存中", saveError: null, saveRequestId: null });
    try {
      const response = draft.revision
        ? await updateProjectDocument(draft.projectId, projectUpdatePayload(draft))
        : await createProjectDocument(projectCreatePayload(draft));
      const saved = projectFromBackend(response);
      const projects = upsertProject(get().projects, saved);
      saveActiveProjectId(saved.projectId);
      saveDraftProject(null);
      set({
        projects,
        activeProjectId: saved.projectId,
        draftProject: cloneProject(saved),
        dirty: false,
        saveStatus: "已保存到数据库",
        saveError: null,
        saveRequestId: null
      });
      return saved;
    } catch (error) {
      const current = get().draftProject;
      if (current) saveDraftProject(current);
      const apiError = error instanceof ApiClientError ? error : null;
      set({
        dirty: true,
        saveStatus: apiError?.body.status === 0 ? "仅保存在本地草稿" : "保存失败",
        saveError: error instanceof Error ? error.message : "项目保存失败",
        saveRequestId: apiError?.body.requestId ?? null
      });
      return null;
    }
  },

  retrySave: async () => get().saveCurrent(),

  saveAs: async (name, description) => {
    const draft = get().draftProject;
    if (!draft) return null;
    const now = new Date().toISOString();
    const copy: LunarProjectDocument = {
      ...normalizeEditor(cloneProject(draft)),
      projectId: crypto.randomUUID(),
      revision: undefined,
      name,
      description,
      createdAt: now,
      updatedAt: now
    };
    setDraft(set, copy, "未保存");
    return get().saveCurrent();
  },

  duplicateProject: async (projectId) => {
    const response = await copyProjectDocument(projectId);
    const copied = projectFromBackend(response);
    set({ projects: upsertProject(get().projects, copied) });
    return copied;
  },

  renameProject: async (projectId, name, description) => {
    const project = get().projects.find((item) => item.projectId === projectId);
    if (!project?.revision) throw new Error("项目不存在");
    const response = await updateProjectDocument(projectId, {
      expected_revision: project.revision,
      name,
      description
    });
    const updated = projectFromBackend(response);
    set((state) => ({
      projects: upsertProject(state.projects, updated),
      draftProject: state.draftProject?.projectId === projectId ? cloneProject(updated) : state.draftProject,
      dirty: state.draftProject?.projectId === projectId ? false : state.dirty,
      saveStatus: state.draftProject?.projectId === projectId ? "已保存到数据库" : state.saveStatus
    }));
  },

  deleteProject: async (projectId) => {
    await deleteProjectDocument(projectId);
    const projects = get().projects.filter((project) => project.projectId !== projectId);
    const deletingActive = get().activeProjectId === projectId;
    const next = deletingActive ? projects[0] ?? null : get().draftProject;
    saveActiveProjectId(next?.projectId ?? null);
    if (deletingActive) saveDraftProject(null);
    set({
      projects,
      activeProjectId: next?.projectId ?? null,
      draftProject: next ? normalizeEditor(cloneProject(next)) : null,
      dirty: false,
      saveStatus: next ? "已保存到数据库" : "未保存",
      saveError: null,
      saveRequestId: null,
      validationStatus: NOT_VALIDATED,
      validationResult: null
    });
  },

  importProject: (project) => {
    const now = new Date().toISOString();
    const imported = normalizeEditor({
      ...cloneProject(project),
      projectId: crypto.randomUUID(),
      revision: undefined,
      createdAt: now,
      updatedAt: now
    });
    setDraft(set, imported, "未保存");
    return imported;
  },

  updateDraftScenario: (updater) => {
    const draft = get().draftProject;
    if (!draft) return;
    const updated = { ...draft, scenario: updater(draft.scenario) };
    saveDraftProject(updated);
    set({
      draftProject: updated,
      dirty: true,
      saveStatus: "未保存",
      saveError: null,
      saveRequestId: null
    });
  },

  updateDraftEditor: (updater) => {
    const draft = get().draftProject;
    if (!draft) return;
    const updated = { ...draft, editor: updater(draft.editor) };
    saveDraftProject(updated);
    set({ draftProject: updated, dirty: true, saveStatus: "未保存" });
  },

  updateViewport: (viewport) => {
    const draft = get().draftProject;
    if (!draft) return;
    const updated = { ...draft, editor: { ...draft.editor, viewport } };
    saveDraftProject(updated);
    set({ draftProject: updated });
  },

  markDirty: () => {
    const draft = get().draftProject;
    if (draft) saveDraftProject(draft);
    set({ dirty: true, saveStatus: "未保存" });
  },

  setValidation: (validationStatus, validationResult) => set({ validationStatus, validationResult }),
  getCurrentScenario: () => get().draftProject?.scenario ?? null
}));

export function selectProjectItems() {
  return listProjectItems(useProjectStore.getState().projects);
}

function setDraft(
  set: (patch: Partial<ProjectStoreState>) => void,
  project: LunarProjectDocument,
  saveStatus: ProjectSaveStatus
): void {
  saveActiveProjectId(project.projectId);
  saveDraftProject(project);
  set({
    activeProjectId: project.projectId,
    draftProject: cloneProject(project),
    dirty: true,
    saveStatus,
    saveError: null,
    saveRequestId: null,
    validationStatus: NOT_VALIDATED,
    validationResult: null
  });
}

function upsertProject(projects: LunarProjectDocument[], project: LunarProjectDocument): LunarProjectDocument[] {
  return projects.some((item) => item.projectId === project.projectId)
    ? projects.map((item) => (item.projectId === project.projectId ? project : item))
    : [...projects, project];
}

function normalizeEditor(project: LunarProjectDocument): LunarProjectDocument {
  const scenario = project.scenario;
  const nodes = Array.isArray(scenario?.nodes) ? scenario.nodes : [];
  const links = Array.isArray(scenario?.links) ? scenario.links : [];
  const services = Array.isArray(scenario?.services) ? scenario.services : [];
  const schedule = Array.isArray(scenario?.faults?.schedule) ? scenario.faults.schedule : [];
  const faultEnabled = Array.isArray(scenario?.faults?.enabled) ? scenario.faults.enabled : [];
  const healingEnabled = Array.isArray(scenario?.healing?.enabled) ? scenario.healing.enabled : [];
  const indicators = Array.isArray(scenario?.technical_indicators) ? scenario.technical_indicators : [];
  const normalized = {
    ...project,
    scenario: {
      ...scenario,
      nodes,
      links,
      services,
      faults: { enabled: faultEnabled, schedule },
      healing: { enabled: healingEnabled },
      technical_indicators: indicators
    },
    editor: {
      ...(project.editor ?? {}),
      nodeTypeCounters: project.editor?.nodeTypeCounters ?? inferNodeTypeCounters(nodes)
    }
  };
  return normalized as LunarProjectDocument;
}

function projectCreatePayload(project: LunarProjectDocument) {
  return { name: project.name, description: project.description, scenario: project.scenario, editor: project.editor };
}

function projectUpdatePayload(project: LunarProjectDocument) {
  return {
    expected_revision: project.revision,
    name: project.name,
    description: project.description,
    scenario: project.scenario,
    editor: project.editor
  };
}

function projectFromBackend(project: ProjectResponse): LunarProjectDocument {
  return normalizeEditor({
    schemaVersion: "1.0",
    projectId: project.project_id,
    revision: project.revision,
    name: project.name,
    description: project.description,
    createdAt: project.created_at,
    updatedAt: project.updated_at,
    scenario: project.scenario as LunarProjectDocument["scenario"],
    editor: (project.editor ?? {}) as LunarProjectDocument["editor"]
  });
}

function inferNodeTypeCounters(nodes: LunarProjectDocument["scenario"]["nodes"]): Record<string, number> {
  const counters: Record<string, number> = {};
  nodes.forEach((node) => {
    const match = new RegExp(`^${node.type}_(\\d+)$`).exec(node.id);
    counters[node.type] = Math.max(counters[node.type] ?? 0, match ? Number(match[1]) : 0);
  });
  return counters;
}
