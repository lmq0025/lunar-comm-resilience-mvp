import type { ScenarioPayload } from "../api/generated/openapi";

export interface EditorViewport {
  x: number;
  y: number;
  zoom: number;
}

export interface LunarProjectDocument {
  schemaVersion: "1.0";
  projectId: string;
  revision?: number;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  scenario: ScenarioPayload;
  editor: {
    viewport?: EditorViewport;
    nodeTypeCounters?: Record<string, number>;
  };
}

export interface ProjectListItem {
  projectId: string;
  name: string;
  description: string;
  nodeCount: number;
  linkCount: number;
  updatedAt: string;
}

export type ValidationStatus = "未验证" | "验证中" | "验证通过" | "验证失败" | "验证结果已过期";
