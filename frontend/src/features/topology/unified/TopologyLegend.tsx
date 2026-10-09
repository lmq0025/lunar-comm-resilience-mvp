export function TopologyLegend() {
  return (
    <div className="unified-topology-legend" aria-label="拓扑图例">
      <span><i className="legend-line normal" />正常活动链路</span>
      <span><i className="legend-line route" />当前业务路径</span>
      <span><i className="legend-line degraded" />性能退化链路</span>
      <span><i className="legend-line failed" />故障失效链路</span>
      <span><i className="legend-line recovered" />自愈后恢复路径</span>
      <small>橙色表示性能退化，链路仍可能可用；本图表达系统通信层级，节点间距离不代表真实空间尺度。</small>
    </div>
  );
}
