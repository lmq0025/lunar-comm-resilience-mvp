import {
  ApiOutlined,
  CloudServerOutlined,
  DatabaseOutlined,
  DeploymentUnitOutlined,
  GatewayOutlined,
  GlobalOutlined,
  MobileOutlined,
  RadarChartOutlined
} from "@ant-design/icons";
import { Card, Space, Typography } from "antd";
import { useCatalogsQuery } from "../../api/catalogs";
import { fallbackNodeTypes } from "./topologyOptions";

const iconByType: Record<string, JSX.Element> = {
  main_hub: <GatewayOutlined />,
  surface_relay: <RadarChartOutlined />,
  rover: <MobileOutlined />,
  compute: <CloudServerOutlined />,
  payload: <DatabaseOutlined />,
  terminal: <ApiOutlined />,
  orbiter: <GlobalOutlined />,
  ground: <DeploymentUnitOutlined />
};

export function NodePalette() {
  const { data } = useCatalogsQuery();
  const items = data?.node_types.length
    ? data.node_types.map((item) => ({ id: item.id, name_zh: item.name_zh || item.name_en || item.id }))
    : fallbackNodeTypes;

  return (
    <Card title="节点组件库" size="small" className="tool-card">
      <Space direction="vertical" className="full-width">
        {items.map((item) => (
          <div
            key={item.id}
            draggable
            className="palette-item"
            onDragStart={(event) => {
              event.dataTransfer.setData("application/lunar-node-type", item.id);
              event.dataTransfer.effectAllowed = "copy";
            }}
          >
            {iconByType[item.id] ?? <DeploymentUnitOutlined />}
            <span>{item.name_zh}</span>
          </div>
        ))}
      </Space>
      <Typography.Text type="secondary" className="small-note">
        拖入画布添加节点，连线时会打开链路参数对话框。
      </Typography.Text>
    </Card>
  );
}
