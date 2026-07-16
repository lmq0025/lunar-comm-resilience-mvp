import type { LunarProjectDocument, ProjectListItem } from "../types/project";

export const PROJECTS_KEY = "lunar_comm_projects_v1";
export const ACTIVE_PROJECT_KEY = "lunar_comm_active_project_v1";
export const DRAFT_PROJECT_KEY = "lunar_comm_unsaved_draft_v1";

export class StorageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StorageError";
  }
}

export function loadProjects(): LunarProjectDocument[] {
  const raw = localStorage.getItem(PROJECTS_KEY);
  if (!raw) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      throw new StorageError("项目存储格式不正确");
    }
    return parsed.map(normalizeProject);
  } catch (error) {
    if (error instanceof StorageError) {
      throw error;
    }
    throw new StorageError("读取本地项目失败");
  }
}

export function saveProjects(projects: LunarProjectDocument[]): void {
  try {
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
  } catch {
    throw new StorageError("写入本地项目失败");
  }
}

export function loadDraftProject(): LunarProjectDocument | null {
  const raw = localStorage.getItem(DRAFT_PROJECT_KEY);
  if (!raw) return null;
  try {
    return normalizeProject(JSON.parse(raw) as unknown);
  } catch {
    return null;
  }
}

export function saveDraftProject(project: LunarProjectDocument | null): void {
  if (project) localStorage.setItem(DRAFT_PROJECT_KEY, JSON.stringify(project));
  else localStorage.removeItem(DRAFT_PROJECT_KEY);
}

export function loadActiveProjectId(): string | null {
  return localStorage.getItem(ACTIVE_PROJECT_KEY);
}

export function saveActiveProjectId(projectId: string | null): void {
  if (projectId) {
    localStorage.setItem(ACTIVE_PROJECT_KEY, projectId);
  } else {
    localStorage.removeItem(ACTIVE_PROJECT_KEY);
  }
}

export function listProjectItems(projects: LunarProjectDocument[]): ProjectListItem[] {
  return projects.map((project) => ({
    projectId: project.projectId,
    name: project.name,
    description: project.description,
    nodeCount: project.scenario.nodes.length,
    linkCount: project.scenario.links.length,
    updatedAt: project.updatedAt
  }));
}

export function cloneProject(project: LunarProjectDocument): LunarProjectDocument {
  return structuredClone(project);
}

function normalizeProject(value: unknown): LunarProjectDocument {
  if (!isProjectDocument(value)) {
    throw new StorageError("项目格式版本不受支持");
  }
  return value;
}

function isProjectDocument(value: unknown): value is LunarProjectDocument {
  return (
    typeof value === "object" &&
    value !== null &&
    "schemaVersion" in value &&
    (value as { schemaVersion: unknown }).schemaVersion === "1.0" &&
    "projectId" in value &&
    "scenario" in value
  );
}
