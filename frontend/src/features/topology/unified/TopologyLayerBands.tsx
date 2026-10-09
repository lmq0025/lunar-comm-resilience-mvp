export function TopologyLayerBands() {
  return (
    <div className="topology-layer-bands" aria-hidden="true">
      <div className="topology-layer-band layer-orbit"><strong>月球轨道与空间通信层</strong></div>
      <div className="topology-layer-band layer-surface"><strong>月面通信网络层</strong><span>骨干与中继 / 任务用户与载荷</span></div>
      <div className="topology-layer-band layer-earth"><strong>地球地面通信层</strong></div>
    </div>
  );
}
