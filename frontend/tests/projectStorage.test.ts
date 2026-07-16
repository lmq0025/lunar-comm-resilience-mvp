import { beforeEach, describe, expect, it, vi } from "vitest";
import { useProjectStore } from "../src/stores/projectStore";
import { defaultLikeScenario } from "./fixtures/scenarioFixture";

describe("SQLite 权威项目存储", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    resetStore();
  });

  it("新建项目在后端确认前保持未保存，成功后才清除 dirty", async () => {
    mockProjectApi();
    useProjectStore.getState().createProject("测试项目", "说明");
    expect(useProjectStore.getState().dirty).toBe(true);
    expect(useProjectStore.getState().saveStatus).toBe("未保存");

    const saved = await useProjectStore.getState().saveCurrent();
    expect(saved?.projectId).toBe("backend-project-1");
    expect(useProjectStore.getState().dirty).toBe(false);
    expect(useProjectStore.getState().saveStatus).toBe("已保存到数据库");
  });

  it("后端断开时保留本地草稿且不显示数据库保存成功", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("network down"); }));
    useProjectStore.getState().createProject("离线项目", "");
    const saved = await useProjectStore.getState().saveCurrent();
    expect(saved).toBeNull();
    expect(useProjectStore.getState().dirty).toBe(true);
    expect(useProjectStore.getState().saveStatus).toBe("仅保存在本地草稿");

    resetStore();
    useProjectStore.getState().loadLocalDraft();
    expect(useProjectStore.getState().draftProject?.name).toBe("离线项目");
  });

  it("另存为和复制都通过后端创建独立正式项目", async () => {
    mockProjectApi();
    useProjectStore.getState().createProject("原项目", "");
    const original = await useProjectStore.getState().saveCurrent();
    const savedAs = await useProjectStore.getState().saveAs("另存项目", "说明");
    expect(savedAs?.projectId).not.toBe(original?.projectId);
    const duplicated = await useProjectStore.getState().duplicateProject(original!.projectId);
    expect(duplicated.projectId).not.toBe(original?.projectId);
  });

  it("导入项目在用户保存前不进入正式项目列表", () => {
    const imported = useProjectStore.getState().importProject({
      schemaVersion: "1.0",
      projectId: "file-project",
      name: "导入项目",
      description: "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      scenario: defaultLikeScenario(),
      editor: {}
    });
    expect(imported.projectId).not.toBe("file-project");
    expect(useProjectStore.getState().projects).toHaveLength(0);
    expect(useProjectStore.getState().dirty).toBe(true);
    expect(useProjectStore.getState().saveStatus).toBe("未保存");
  });
});

function resetStore() {
  useProjectStore.setState({
    projects: [],
    activeProjectId: null,
    draftProject: null,
    dirty: false,
    saveStatus: "未保存",
    saveError: null,
    saveRequestId: null,
    loadingProjects: false,
    validationStatus: "未验证",
    validationResult: null
  });
}

function mockProjectApi() {
  let counter = 0;
  vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    counter += 1;
    const id = url.endsWith("/copy") ? `backend-copy-${counter}` : `backend-project-${counter}`;
    const body = init?.body ? JSON.parse(String(init.body)) as Record<string, unknown> : {};
    return new Response(JSON.stringify({
      project_id: id,
      owner_user_id: "local_admin",
      name: body.name ?? "项目副本",
      description: body.description ?? "",
      revision: 1,
      deleted: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      scenario: body.scenario ?? defaultLikeScenario(),
      editor: body.editor ?? {}
    }), { status: 200, headers: { "Content-Type": "application/json", "X-Request-ID": `request-${counter}` } });
  }));
}
