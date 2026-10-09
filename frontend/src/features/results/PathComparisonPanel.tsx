import { Alert, Card, Col, Row } from "antd";
import type { GraphSnapshotResponse, LinkPayload, NodePayload, RouteSnapshotItemResponse, ServicePayload } from "../../api/contracts";
import { serviceDisplayName } from "../../i18n/displayNames";
import { UnifiedLunarNetworkGraph } from "../topology/unified/UnifiedLunarNetworkGraph";

export function PathComparisonPanel({
  nodes,
  links,
  service,
  nominalTopology,
  healedTopology,
  nominalRoute,
  healedRoute
}: {
  nodes: NodePayload[];
  links: LinkPayload[];
  service: ServicePayload | null;
  nominalTopology: GraphSnapshotResponse | null;
  healedTopology: GraphSnapshotResponse | null;
  nominalRoute?: RouteSnapshotItemResponse;
  healedRoute?: RouteSnapshotItemResponse;
}) {
  if (!service || !nominalTopology || !healedTopology) {
    return <Alert type="info" showIcon message="完成正常状态和第 7 步后可查看正常与自愈后路径对比。" />;
  }
  return (
    <Card size="small" title={`${serviceDisplayName(service)}：正常与自愈后路径对比`}>
      <Row gutter={[12, 12]}>
        <Col xs={24} xl={12}>
          <Card size="small" title="正常状态计算路径">
            <UnifiedLunarNetworkGraph projectNodes={nodes} projectLinks={links} snapshot={nominalTopology} selectedRoute={nominalRoute} selectedServiceId={service.id} stage="nominal" showLinkLabels />
          </Card>
        </Col>
        <Col xs={24} xl={12}>
          <Card size="small" title="自愈后备用恢复路径">
            <UnifiedLunarNetworkGraph projectNodes={nodes} projectLinks={links} snapshot={healedTopology} selectedRoute={healedRoute} selectedServiceId={service.id} stage="after_healing" showLinkLabels />
          </Card>
        </Col>
      </Row>
    </Card>
  );
}
