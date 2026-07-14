import { beforeEach, describe, expect, it } from "vitest";
import { useProjectStore } from "../src/stores/projectStore";
import { defaultLikeScenario } from "./fixtures/scenarioFixture";

describe("项目存储", () => {
  beforeEach(() => {
    localStorage.clear();
    useProjectStore.setState({
      projects: [],
      activeProjectId: null,
      draftProject: null,
      dirty: false,
      validationStatus: "未验证",
      validationResult: null
    });
  });

  it("可以创建、保存并重新打开项目", () => {
    const project = useProjectStore.getState().createProject("测试项目", "说明");
    expect(useProjectStore.getState().dirty).toBe(true);
    useProjectStore.getState().saveCurrent();
    expect(useProjectStore.getState().dirty).toBe(false);
    useProjectStore.getState().loadFromStorage();
    expect(useProjectStore.getState().draftProject?.projectId).toBe(project.projectId);
    expect(useProjectStore.getState().projects).toHaveLength(1);
  });

  it("另存为和复制项目会创建独立项目", () => {
    const project = useProjectStore.getState().createProject("原项目", "");
    useProjectStore.getState().saveCurrent();
    const savedAs = useProjectStore.getState().saveAs("另存项目", "说明");
    expect(savedAs?.projectId).not.toBe(project.projectId);
    const duplicated = useProjectStore.getState().duplicateProject(project.projectId);
    expect(duplicated.projectId).not.toBe(project.projectId);
    useProjectStore.getState().openProject(duplicated.projectId);
    useProjectStore.getState().updateDraftScenario((scenario) => ({ ...scenario, nodes: [] }));
    expect(useProjectStore.getState().projects.find((item) => item.projectId === project.projectId)?.scenario.nodes).toHaveLength(0);
  });

  it("导入相同 projectId 的项目 JSON 不覆盖原项目", () => {
    const project = useProjectStore.getState().createProject("原项目", "");
    useProjectStore.getState().saveCurrent();
    const imported = useProjectStore.getState().importProject({
      schemaVersion: "1.0",
      projectId: project.projectId,
      name: project.name,
      description: "导入项目",
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      scenario: defaultLikeScenario(),
      editor: {}
    });
    expect(imported.projectId).not.toBe(project.projectId);
    expect(useProjectStore.getState().projects).toHaveLength(2);
    expect(useProjectStore.getState().projects.find((item) => item.projectId === project.projectId)?.description).toBe("");
  });

  it("可以删除项目", () => {
    const project = useProjectStore.getState().createProject("待删除", "");
    useProjectStore.getState().saveCurrent();
    useProjectStore.getState().deleteProject(project.projectId);
    expect(useProjectStore.getState().projects).toHaveLength(0);
  });
});
