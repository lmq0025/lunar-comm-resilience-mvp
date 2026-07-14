export const nodeTypeOptions = [
  { value: "main_hub", label: "月面主枢纽" },
  { value: "surface_relay", label: "月面中继" },
  { value: "rover", label: "巡视器" },
  { value: "compute", label: "边缘计算" },
  { value: "payload", label: "载荷" },
  { value: "terminal", label: "终端" },
  { value: "orbiter", label: "月轨中继器" },
  { value: "ground", label: "地面站" }
];

export const linkTypeOptions = [
  { value: "local", label: "本地链路" },
  { value: "redundant_surface", label: "冗余月面链路" },
  { value: "surface_to_orbit", label: "月面至轨道" },
  { value: "orbit_to_ground", label: "轨道至地面" }
];

export const fallbackNodeTypes = [
  { id: "main_hub", name_zh: "月面主枢纽" },
  { id: "surface_relay", name_zh: "月面中继" },
  { id: "rover", name_zh: "巡视器" },
  { id: "compute", name_zh: "边缘计算" },
  { id: "payload", name_zh: "载荷站" },
  { id: "terminal", name_zh: "终端" },
  { id: "orbiter", name_zh: "月轨中继器" },
  { id: "ground", name_zh: "地面站" }
];
