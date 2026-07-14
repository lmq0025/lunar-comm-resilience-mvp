import YAML from "yaml";
import type { ScenarioPayload } from "../api/contracts";
import type { LunarProjectDocument } from "../types/project";
import { createBlankScenario } from "./scenarioTemplates";

export class ImportExportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ImportExportError";
  }
}

export function parseScenarioYaml(text: string): ScenarioPayload {
  try {
    const parsed = YAML.parse(text) as unknown;
    return normalizeScenario(parsed);
  } catch {
    throw new ImportExportError("YAML 解析失败，请检查文件格式");
  }
}

export function parseProjectJson(text: string): LunarProjectDocument {
  try {
    const parsed = JSON.parse(text) as unknown;
    if (!isProjectDocument(parsed)) {
      throw new ImportExportError("项目格式版本不受支持或结构不完整");
    }
    return {
      ...parsed,
      scenario: normalizeScenario(parsed.scenario),
      editor: {
        ...parsed.editor,
        nodeTypeCounters: parsed.editor.nodeTypeCounters ?? {}
      }
    };
  } catch (error) {
    if (error instanceof ImportExportError) {
      throw error;
    }
    throw new ImportExportError("JSON 解析失败，请检查项目文件");
  }
}

export function stringifyScenarioYaml(scenario: ScenarioPayload): string {
  return YAML.stringify(scenario, { lineWidth: 0 });
}

export function stringifyProjectJson(project: LunarProjectDocument): string {
  return JSON.stringify(project, null, 2);
}

export function buildProjectFromScenario(
  scenario: ScenarioPayload,
  fallbackName: string,
  description: string
): LunarProjectDocument {
  const now = new Date().toISOString();
  const scenarioName = typeof scenario.scenario.name === "string" ? scenario.scenario.name : fallbackName;
  return {
    schemaVersion: "1.0",
    projectId: crypto.randomUUID(),
    name: scenarioName,
    description,
    createdAt: now,
    updatedAt: now,
    scenario,
    editor: { nodeTypeCounters: inferNodeTypeCounters(scenario) }
  };
}

export function normalizeScenario(value: unknown): ScenarioPayload {
  if (typeof value !== "object" || value === null) {
    throw new ImportExportError("场景文件必须是对象");
  }
  const candidate = value as Partial<ScenarioPayload>;
  if (!Array.isArray(candidate.nodes) || !Array.isArray(candidate.links)) {
    throw new ImportExportError("场景缺少 nodes 或 links 数组");
  }
  if (!Array.isArray(candidate.services)) {
    throw new ImportExportError("场景缺少 services 数组");
  }
  if (!candidate.faults || !Array.isArray(candidate.faults.enabled) || !Array.isArray(candidate.faults.schedule)) {
    throw new ImportExportError("场景缺少 faults.enabled 或 faults.schedule");
  }
  if (!candidate.healing || !Array.isArray(candidate.healing.enabled)) {
    throw new ImportExportError("场景缺少 healing.enabled");
  }
  if (!Array.isArray(candidate.technical_indicators)) {
    throw new ImportExportError("场景缺少 technical_indicators 数组");
  }
  const blank = createBlankScenario("imported_scenario");
  return {
    ...candidate,
    scenario: asRecord(candidate.scenario, blank.scenario),
    environment: asRecord(candidate.environment, blank.environment),
    model_parameters: asRecord(candidate.model_parameters, {}),
    physical_model_config: asRecord(candidate.physical_model_config, {}),
    fault_propagation: asRecord(candidate.fault_propagation, blank.fault_propagation ?? {}),
    nodes: candidate.nodes,
    links: candidate.links,
    services: candidate.services,
    faults: {
      enabled: candidate.faults.enabled,
      schedule: candidate.faults.schedule
    },
    healing: {
      enabled: candidate.healing.enabled
    },
    technical_indicators: candidate.technical_indicators
  };
}

export function downloadText(filename: string, text: string, mimeType: string): void {
  const blob = new Blob([text], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function asRecord(value: unknown, fallback: Record<string, unknown>): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : fallback;
}

function isProjectDocument(value: unknown): value is LunarProjectDocument {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<LunarProjectDocument>;
  return (
    candidate.schemaVersion === "1.0" &&
    typeof candidate.projectId === "string" &&
    typeof candidate.name === "string" &&
    typeof candidate.description === "string" &&
    typeof candidate.createdAt === "string" &&
    typeof candidate.updatedAt === "string" &&
    typeof candidate.scenario === "object" &&
    candidate.scenario !== null &&
    typeof candidate.editor === "object" &&
    candidate.editor !== null
  );
}

function inferNodeTypeCounters(scenario: ScenarioPayload): Record<string, number> {
  const counters: Record<string, number> = {};
  scenario.nodes.forEach((node) => {
    const match = new RegExp(`^${node.type}_(\\d+)$`).exec(node.id);
    counters[node.type] = Math.max(counters[node.type] ?? 0, match ? Number(match[1]) : 0);
  });
  return counters;
}
