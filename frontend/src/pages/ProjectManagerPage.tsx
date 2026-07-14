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
import { App, Button, Card, Form, Input, Modal, Popconfirm, Space, Table, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { SaveAsProjectModal } from "../components/SaveAsProjectModal";
import type { LunarProjectDocument, ProjectListItem } from "../types/project";
import { useProjectStore } from "../stores/projectStore";
import { useTopologyEditorStore } from "../stores/topologyEditorStore";
import { useUiStore } from "../stores/uiStore";
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
  const { message, modal } = App.useApp();
  const projects = useProjectStore((state) => state.projects);
  const draftProject = useProjectStore((state) => state.draftProject);
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

  const columns: ColumnsType<ProjectListItem> = [
    { title: "项目名称", dataIndex: "name", key: "name" },
    { title: "项目描述", dataIndex: "description", key: "description" },
    { title: "节点数", dataIndex: "nodeCount", key: "nodeCount", width: 90 },
    { title: "链路数", dataIndex: "linkCount", key: "linkCount", width: 90 },
    {
      title: "更新时间",
      dataIndex: "updatedAt",
      key: "updatedAt",
      render: (value: string) => new Date(value).toLocaleString("zh-CN")
    },
    {
      title: "操作",
      key: "actions",
      width: 360,
      render: (_, record) => (
        <Space wrap>
          <Button
            icon={<FolderOpenOutlined />}
            onClick={() => {
              openProject(record.projectId);
              const opened = useProjectStore.getState().draftProject;
              if (opened) enterProject(opened);
            }}
          >
            打开
          </Button>
          <Button icon={<EditOutlined />} onClick={() => setRenameTarget(record)}>
            重命名
          </Button>
          <Button
            icon={<CopyOutlined />}
            onClick={() => {
              duplicateProject(record.projectId);
              message.success("项目副本已创建");
            }}
          >
            复制
          </Button>
          <Popconfirm
            title="确认删除本地项目？"
            description="删除后无法从 localStorage 恢复。"
            okText="删除"
            cancelText="取消"
            onConfirm={() => {
              deleteProject(record.projectId);
              message.success("项目已删除");
            }}
          >
            <Button danger icon={<DeleteOutlined />}>
              删除
            </Button>
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
          <Typography.Text type="secondary">当前使用本地浏览器项目存储；请及时导出项目 JSON 或 YAML。</Typography.Text>
        </div>
        <Space wrap>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setNewProjectOpen(true)}>
            新建项目
          </Button>
          <Button icon={<SaveOutlined />} onClick={() => { saveCurrent(); message.success("项目已保存"); }}>
            保存项目
          </Button>
          <Button onClick={() => setSaveAsOpen(true)}>另存为</Button>
          <Button icon={<ImportOutlined />} onClick={() => fileInputRef.current?.click()}>
            导入项目/场景
          </Button>
          <Button
            icon={<DownloadOutlined />}
            onClick={() => {
              if (!draftProject) {
                message.warning("没有可导出的项目");
                return;
              }
              downloadText(`${draftProject.name}.lunar-project.json`, stringifyProjectJson(draftProject), "application/json");
            }}
          >
            导出项目
          </Button>
          <Button
            onClick={() => {
              if (!draftProject) {
                message.warning("没有可导出的场景");
                return;
              }
              downloadText(`${draftProject.name}.yaml`, stringifyScenarioYaml(draftProject.scenario), "application/x-yaml");
            }}
          >
            导出 YAML
          </Button>
        </Space>
      </div>
      <Card className="work-card">
        <Table rowKey="projectId" columns={columns} dataSource={items} pagination={false} />
      </Card>
      <input
        ref={fileInputRef}
        type="file"
        accept=".yaml,.yml,.json,application/json"
        className="hidden-file-input"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (!file) return;
          void handleImportFile(file, importProject, enterProject, message.error, message.success);
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
        initialValues={{ name: `${draftProject?.name ?? "项目"} - 另存`, description: draftProject?.description ?? "" }}
        onCancel={() => setSaveAsOpen(false)}
        onSubmit={(values) => {
          const saved = saveAs(values.name, values.description);
          if (saved) {
            message.success("另存成功");
            setSaveAsOpen(false);
          }
        }}
      />
      <ProjectModal
        title="重命名项目"
        open={Boolean(renameTarget)}
        initialValues={{ name: renameTarget?.name ?? "", description: renameTarget?.description ?? "" }}
        onCancel={() => setRenameTarget(null)}
        onSubmit={(values) => {
          if (renameTarget) {
            renameProject(renameTarget.projectId, values.name, values.description);
            setRenameTarget(null);
            message.success("项目信息已更新");
          }
        }}
      />
      <Button
        className="storage-note-button"
        onClick={() =>
          modal.info({
            title: "本地存储说明",
            content: "当前使用浏览器 localStorage 保存项目。路径计算 session 和结果只保存在运行时内存，不会写入项目 JSON 或 YAML。"
          })
        }
      >
        本地存储说明
      </Button>
    </div>
  );
}

function ProjectModal({
  title,
  open,
  initialValues,
  onCancel,
  onSubmit
}: {
  title: string;
  open: boolean;
  initialValues: ProjectFormValues;
  onCancel: () => void;
  onSubmit: (values: ProjectFormValues) => void;
}) {
  const [form] = Form.useForm<ProjectFormValues>();
  return (
    <Modal
      title={title}
      open={open}
      onCancel={onCancel}
      onOk={() => void form.validateFields().then(onSubmit).catch(() => undefined)}
      destroyOnClose
    >
      <Form form={form} layout="vertical" initialValues={initialValues}>
        <Form.Item name="name" label="项目名称" rules={[{ required: true, message: "请输入项目名称" }]}>
          <Input />
        </Form.Item>
        <Form.Item name="description" label="项目描述">
          <Input.TextArea rows={3} />
        </Form.Item>
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
    onSuccess("导入成功");
  } catch (error) {
    onError(error instanceof Error ? error.message : "导入失败");
  }
}
