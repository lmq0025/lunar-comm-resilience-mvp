import { useMemo, useRef, useState } from "react";
import {
  CopyOutlined,
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  FolderOpenOutlined,
  ImportOutlined,
  PlusOutlined,
  SaveOutlined
} from "@ant-design/icons";
import { Alert, App, Button, Form, Input, Modal, Popconfirm, Space, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { SaveAsProjectModal } from "../components/SaveAsProjectModal";
import { useProjectStore } from "../stores/projectStore";
import { useTopologyEditorStore } from "../stores/topologyEditorStore";
import { useUiStore } from "../stores/uiStore";
import type { LunarProjectDocument, ProjectListItem } from "../types/project";
import {
  buildProjectFromScenario,
  downloadText,
  parseProjectJson,
  parseScenarioYaml,
  stringifyProjectJson,
  stringifyScenarioYaml
} from "../utils/importExport";
import { listProjectItems } from "../utils/storage";

interface ProjectFormValues {
  name: string;
  description: string;
}

export function ProjectManagerPage() {
  const { message } = App.useApp();
  const projects = useProjectStore((state) => state.projects);
  const draftProject = useProjectStore((state) => state.draftProject);
  const dirty = useProjectStore((state) => state.dirty);
  const saveStatus = useProjectStore((state) => state.saveStatus);
  const loadingProjects = useProjectStore((state) => state.loadingProjects);
  const createProject = useProjectStore((state) => state.createProject);
  const openProject = useProjectStore((state) => state.openProject);
  const saveCurrent = useProjectStore((state) => state.saveCurrent);
  const saveAs = useProjectStore((state) => state.saveAs);
  const duplicateProject = useProjectStore((state) => state.duplicateProject);
  const renameProject = useProjectStore((state) => state.renameProject);
  const deleteProject = useProjectStore((state) => state.deleteProject);
  const importProject = useProjectStore((state) => state.importProject);
  const loadScenario = useTopologyEditorStore((state) => state.loadScenario);
  const setActiveMenu = useUiStore((state) => state.setActiveMenu);
  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const [saveAsOpen, setSaveAsOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState<ProjectListItem | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const items = useMemo(() => listProjectItems(projects), [projects]);

  const enterProject = (project: LunarProjectDocument) => {
    loadScenario(project.scenario);
    setActiveMenu("topology");
  };

  const handleSave = async () => {
    const saved = await saveCurrent();
    if (saved) message.success("项目已保存到数据库");
    else message.error(useProjectStore.getState().saveError ?? "项目保存失败");
  };

  const columns: ColumnsType<ProjectListItem> = [
    { title: "项目名称", dataIndex: "name", key: "name" },
    { title: "项目描述", dataIndex: "description", key: "description" },
    { title: "节点数", dataIndex: "nodeCount", key: "nodeCount", width: 80 },
    { title: "链路数", dataIndex: "linkCount", key: "linkCount", width: 80 },
    { title: "更新时间", dataIndex: "updatedAt", key: "updatedAt", render: (value: string) => new Date(value).toLocaleString("zh-CN") },
    {
      title: "操作",
      key: "actions",
      width: 350,
      render: (_, record) => (
        <Space wrap>
          <Button icon={<FolderOpenOutlined />} onClick={() => {
            openProject(record.projectId);
            const opened = useProjectStore.getState().draftProject;
            if (opened) enterProject(opened);
          }}>打开</Button>
          <Button icon={<EditOutlined />} onClick={() => setRenameTarget(record)}>重命名</Button>
          <Button icon={<CopyOutlined />} onClick={() => void duplicateProject(record.projectId).then(() => message.success("项目副本已创建"))}>复制</Button>
          <Popconfirm title="确认删除数据库中的项目？" okText="删除" cancelText="取消" onConfirm={() => void deleteProject(record.projectId).then(() => message.success("项目已删除"))}>
            <Button danger icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <div className="page-fill">
      <div className="page-header">
        <div>
          <Typography.Title level={4}>项目管理</Typography.Title>
          <Typography.Text type="secondary">正式项目保存在本机 SQLite；浏览器仅保留未同步草稿和界面偏好。</Typography.Text>
        </div>
        <Space wrap>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setNewProjectOpen(true)}>新建项目</Button>
          <Button icon={<SaveOutlined />} loading={saveStatus === "保存中"} disabled={!draftProject} onClick={() => void handleSave()}>保存项目</Button>
          <Button disabled={!draftProject} onClick={() => setSaveAsOpen(true)}>另存为</Button>
          <Button icon={<ImportOutlined />} onClick={() => fileInputRef.current?.click()}>导入项目/场景</Button>
          <Button icon={<DownloadOutlined />} disabled={!draftProject} onClick={() => draftProject && downloadText(`${draftProject.name}.lunar-project.json`, stringifyProjectJson(draftProject), "application/json")}>导出项目</Button>
          <Button disabled={!draftProject} onClick={() => draftProject && downloadText(`${draftProject.name}.yaml`, stringifyScenarioYaml(draftProject.scenario), "application/x-yaml")}>导出 YAML</Button>
        </Space>
      </div>
      {dirty && draftProject ? (
        <Alert
          type="warning"
          showIcon
          message={saveStatus === "仅保存在本地草稿" ? "本地草稿，未同步到数据库" : "当前项目尚未保存"}
          description={`${draftProject.name}：Nodes ${safeLength(draftProject.scenario.nodes)} / Links ${safeLength(draftProject.scenario.links)} / Services ${safeLength(draftProject.scenario.services)} / Faults ${safeLength(draftProject.scenario.faults?.schedule)} / Healing ${safeLength(draftProject.scenario.healing?.enabled)} / Indicators ${safeLength(draftProject.scenario.technical_indicators)}`}
        />
      ) : null}
      <Table rowKey="projectId" loading={loadingProjects} columns={columns} dataSource={items} pagination={false} locale={{ emptyText: "数据库中暂无项目" }} />
      <input
        ref={fileInputRef}
        type="file"
        accept=".yaml,.yml,.json,application/json"
        className="hidden-file-input"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) void handleImportFile(file, importProject, enterProject, message.error, message.success);
        }}
      />
      <ProjectModal
        title="新建项目"
        open={newProjectOpen}
        initialValues={{ name: "未命名月面通信项目", description: "" }}
        onCancel={() => setNewProjectOpen(false)}
        onSubmit={(values) => {
          const project = createProject(values.name, values.description);
          loadScenario(project.scenario);
          setNewProjectOpen(false);
          setActiveMenu("topology");
        }}
      />
      <SaveAsProjectModal
        open={saveAsOpen}
        initialValues={{ name: `${draftProject?.name ?? "项目"} - 副本`, description: draftProject?.description ?? "" }}
        onCancel={() => setSaveAsOpen(false)}
        onSubmit={(values) => void saveAs(values.name, values.description).then((saved) => {
          if (saved) {
            message.success("项目副本已保存到数据库");
            setSaveAsOpen(false);
          }
        })}
      />
      <ProjectModal
        title="重命名项目"
        open={Boolean(renameTarget)}
        initialValues={{ name: renameTarget?.name ?? "", description: renameTarget?.description ?? "" }}
        onCancel={() => setRenameTarget(null)}
        onSubmit={(values) => {
          if (!renameTarget) return;
          void renameProject(renameTarget.projectId, values.name, values.description).then(() => {
            setRenameTarget(null);
            message.success("项目信息已更新到数据库");
          });
        }}
      />
      <Tag color="blue">SQLite 权威项目库</Tag>
    </div>
  );
}

function ProjectModal({ title, open, initialValues, onCancel, onSubmit }: {
  title: string;
  open: boolean;
  initialValues: ProjectFormValues;
  onCancel: () => void;
  onSubmit: (values: ProjectFormValues) => void;
}) {
  const [form] = Form.useForm<ProjectFormValues>();
  return (
    <Modal title={title} open={open} onCancel={onCancel} onOk={() => void form.validateFields().then(onSubmit)} destroyOnHidden>
      <Form form={form} layout="vertical" initialValues={initialValues}>
        <Form.Item name="name" label="项目名称" rules={[{ required: true, message: "请输入项目名称" }]}><Input /></Form.Item>
        <Form.Item name="description" label="项目描述"><Input.TextArea rows={3} /></Form.Item>
      </Form>
    </Modal>
  );
}

async function handleImportFile(
  file: File,
  importProject: (project: LunarProjectDocument) => LunarProjectDocument,
  enterProject: (project: LunarProjectDocument) => void,
  onError: (content: string) => void,
  onSuccess: (content: string) => void
): Promise<void> {
  try {
    const text = await file.text();
    const project = file.name.endsWith(".json")
      ? parseProjectJson(text)
      : buildProjectFromScenario(parseScenarioYaml(text), file.name.replace(/\.(yaml|yml)$/i, ""), "从场景文件导入");
    const imported = importProject(project);
    enterProject(imported);
    onSuccess("导入成功，当前状态为未保存");
  } catch (error) {
    onError(error instanceof Error ? error.message : "导入失败");
  }
}

function safeLength(value: unknown): number {
  return Array.isArray(value) ? value.length : 0;
}
