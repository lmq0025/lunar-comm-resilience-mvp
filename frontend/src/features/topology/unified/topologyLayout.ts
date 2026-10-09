import type { NodePayload } from "../../../api/contracts";

export type LunarNetworkLayer = "orbit" | "surface_backbone" | "surface_mission" | "earth";

export interface LayoutPoint {
  x: number;
  y: number;
  layer: LunarNetworkLayer;
}

const X_GAP = 190;
const LEFT = 100;
const LAYER_Y: Record<LunarNetworkLayer, number> = {
  orbit: 60,
  surface_backbone: 255,
  surface_mission: 465,
  earth: 675
};

const ORDER = [
  "lunar_orbiter",
  "lander_main_hub",
  "relay_backup_1",
  "relay_backup_2",
  "edge_compute",
  "rover_1",
  "rover_2",
  "rover_3",
  "science_station",
  "camera_station",
  "teleop_terminal",
  "ground_station"
];

export function topologyLayer(node: Pick<NodePayload, "type" | "role">): LunarNetworkLayer {
  if (node.type === "orbiter" || node.role?.includes("orbit")) return "orbit";
  if (node.type === "ground" || node.role?.includes("ground")) return "earth";
  if (["main_hub", "surface_relay", "compute"].includes(node.type)) return "surface_backbone";
  return "surface_mission";
}

export function deterministicLayeredLayout(nodes: NodePayload[]): Map<string, LayoutPoint> {
  const grouped = new Map<LunarNetworkLayer, NodePayload[]>([
    ["orbit", []],
    ["surface_backbone", []],
    ["surface_mission", []],
    ["earth", []]
  ]);
  nodes.forEach((node) => grouped.get(topologyLayer(node))?.push(node));
  const result = new Map<string, LayoutPoint>();
  grouped.forEach((items, layer) => {
    items.sort((left, right) => orderOf(left.id) - orderOf(right.id) || left.id.localeCompare(right.id));
    const rowWidth = Math.max(0, (items.length - 1) * X_GAP);
    const startX = Math.max(LEFT, 620 - rowWidth / 2);
    items.forEach((node, index) => {
      result.set(node.id, { x: Math.round(startX + index * X_GAP), y: LAYER_Y[layer], layer });
    });
  });
  return result;
}

export function resolveNodePosition(node: NodePayload, layout: Map<string, LayoutPoint>, preserveSaved = true): LayoutPoint {
  const fallback = layout.get(node.id) ?? { x: LEFT, y: LAYER_Y.surface_mission, layer: topologyLayer(node) };
  if (preserveSaved && isFiniteCoordinate(node.position_x) && isFiniteCoordinate(node.position_y)) {
    return { x: Number(node.position_x), y: Number(node.position_y), layer: topologyLayer(node) };
  }
  return fallback;
}

export function applyLayeredCoordinates(nodes: NodePayload[]): NodePayload[] {
  const layout = deterministicLayeredLayout(nodes);
  return nodes.map((node) => {
    const point = resolveNodePosition(node, layout, false);
    return { ...node, position_x: point.x, position_y: point.y };
  });
}

export function isFiniteCoordinate(value: unknown): boolean {
  return typeof value === "number" && Number.isFinite(value);
}

function orderOf(id: string): number {
  const index = ORDER.indexOf(id);
  return index < 0 ? ORDER.length : index;
}
