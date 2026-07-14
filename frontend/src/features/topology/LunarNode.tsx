import {
  ApiOutlined,
  CloudServerOutlined,
  DatabaseOutlined,
  DeploymentUnitOutlined,
  GatewayOutlined,
  GlobalOutlined,
  MobileOutlined,
  RadiusSettingOutlined
} from "@ant-design/icons";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { TopologyFlowNode } from "../../types/topology";

const typeLabels: Record<string, string> = {
  main_hub: "主枢纽",
  surface_relay: "中继",
  rover: "巡视器",
  compute: "计算",
  payload: "载荷",
  terminal: "终端",
  orbiter: "轨道",
  ground: "地面"
};

const typeIcons: Record<string, JSX.Element> = {
  main_hub: <GatewayOutlined />,
  surface_relay: <RadiusSettingOutlined />,
  rover: <MobileOutlined />,
  compute: <CloudServerOutlined />,
  payload: <DatabaseOutlined />,
  terminal: <ApiOutlined />,
  orbiter: <GlobalOutlined />,
  ground: <DeploymentUnitOutlined />
};

export function LunarNode({ data, selected }: NodeProps<TopologyFlowNode>) {
  const payload = data.payload;
  const inactive = payload.active === false;
  return (
    <div className={`lunar-node lunar-node-${payload.type} ${inactive ? "lunar-node-inactive" : ""} ${selected ? "lunar-node-selected" : ""}`}>
      <Handle type="target" position={Position.Top} />
      <div className="lunar-node-header">
        <span className="lunar-node-icon">{typeIcons[payload.type] ?? <DeploymentUnitOutlined />}</span>
        <span>{payload.name || payload.id}</span>
        {data.routeBadge ? <span className="route-badge">{data.routeBadge}</span> : null}
      </div>
      <div className="lunar-node-id">{payload.id}</div>
      <div className="lunar-node-footer">
        <span>{typeLabels[payload.type] ?? payload.type}</span>
        <span>{inactive ? "停用" : "启用"}</span>
      </div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}
