import { Form, Input, Modal } from "antd";

export interface SaveAsProjectValues {
  name: string;
  description: string;
}

export function SaveAsProjectModal({
  open,
  initialValues,
  onCancel,
  onSubmit
}: {
  open: boolean;
  initialValues: SaveAsProjectValues;
  onCancel: () => void;
  onSubmit: (values: SaveAsProjectValues) => void;
}) {
  const [form] = Form.useForm<SaveAsProjectValues>();
  return (
    <Modal
      title="另存为"
      open={open}
      onCancel={onCancel}
      onOk={() => {
        void form.validateFields().then(onSubmit).catch(() => undefined);
      }}
      destroyOnClose
    >
      <Form form={form} layout="vertical" initialValues={initialValues}>
        <Form.Item name="name" label="新项目名称" rules={[{ required: true, message: "请输入项目名称" }]}>
          <Input />
        </Form.Item>
        <Form.Item name="description" label="项目描述">
          <Input.TextArea rows={3} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
