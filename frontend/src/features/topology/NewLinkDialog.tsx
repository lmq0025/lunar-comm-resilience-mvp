import { Form, Input, InputNumber, Modal, Select, Switch } from "antd";
import type { LinkPayload } from "../../api/contracts";
import { useCatalogsQuery } from "../../api/catalogs";
import { createId } from "../../utils/ids";
import { type LinkFormValues, makeLinkPayload } from "./formModels";
import { linkTypeOptions } from "./topologyOptions";

export interface PendingConnection {
  source: string;
  target: string;
}

interface NewLinkDialogProps {
  open: boolean;
  connection: PendingConnection | null;
  onCancel: () => void;
  onCreate: (payload: LinkPayload) => void;
}

export function NewLinkDialog({ open, connection, onCancel, onCreate }: NewLinkDialogProps) {
  const [form] = Form.useForm<LinkFormValues>();
  const { data } = useCatalogsQuery();
  const options = data?.link_types.length
    ? data.link_types.map((item) => ({ value: item.id, label: item.name_zh || item.name_en || item.id }))
    : linkTypeOptions;

  return (
    <Modal
      title="新建链路"
      open={open}
      onCancel={onCancel}
      destroyOnClose
      onOk={() => {
        void form.validateFields().then((values) => onCreate(makeLinkPayload(values)));
      }}
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          id: createId("link"),
          name: "",
          source: connection?.source ?? "",
          target: connection?.target ?? "",
          kind: "local",
          bandwidth_mbps: 10,
          delay_ms: 10,
          packet_loss_rate: 0.00001,
          availability: 0.999,
          active: true
        }}
      >
        <Form.Item name="id" label="链路 ID">
          <Input disabled />
        </Form.Item>
        <Form.Item name="name" label="链路名称">
          <Input />
        </Form.Item>
        <Form.Item name="source" label="源节点">
          <Input disabled />
        </Form.Item>
        <Form.Item name="target" label="目标节点">
          <Input disabled />
        </Form.Item>
        <Form.Item name="kind" label="链路类型" rules={[{ required: true, message: "请选择链路类型" }]}>
          <Select options={options} />
        </Form.Item>
        <Form.Item name="bandwidth_mbps" label="带宽 Mbps" rules={[{ type: "number", min: 0.000001, message: "带宽必须大于 0" }]}>
          <InputNumber className="full-width" min={0.000001} />
        </Form.Item>
        <Form.Item name="delay_ms" label="时延 ms" rules={[{ type: "number", min: 0, message: "时延必须大于等于 0" }]}>
          <InputNumber className="full-width" min={0} />
        </Form.Item>
        <Form.Item name="packet_loss_rate" label="丢包率 概率值" rules={[{ type: "number", min: 0, max: 1, message: "丢包率必须在 0 到 1 之间" }]}>
          <InputNumber className="full-width" min={0} max={1} step={0.000001} />
        </Form.Item>
        <Form.Item name="availability" label="可用率 概率值" rules={[{ type: "number", min: 0, max: 1, message: "可用率必须在 0 到 1 之间" }]}>
          <InputNumber className="full-width" min={0} max={1} step={0.0001} />
        </Form.Item>
        <Form.Item name="active" label="启用状态" valuePropName="checked">
          <Switch />
        </Form.Item>
      </Form>
    </Modal>
  );
}
