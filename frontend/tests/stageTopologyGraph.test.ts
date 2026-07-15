import { describe, expect, it } from "vitest";
import type { Edge, Node } from "@xyflow/react";
import { computeSelectionCenter, stageLinkStrokeColor } from "../src/features/simulation/stageTopologyGraphModel";

describe("stage topology graph helpers", () => {
  const nodes: Node[] = [
    { id: "node_1", position: { x: 10, y: 20 }, data: { label: "node_1" } },
    { id: "node_2", position: { x: 50, y: 100 }, data: { label: "node_2" } }
  ];
  const edges: Edge[] = [
    { id: "link_1", source: "node_1", target: "node_2", data: { linkId: "link_1" } }
  ];

  it("returns the selected node center", () => {
    expect(computeSelectionCenter(nodes, edges, ["node_1"], [])).toEqual({ x: 10, y: 20 });
  });

  it("returns the selected link midpoint", () => {
    expect(computeSelectionCenter(nodes, edges, [], ["link_1"])).toEqual({ x: 30, y: 60 });
  });

  it("returns null for missing selections", () => {
    expect(computeSelectionCenter(nodes, edges, ["missing"], [])).toBeNull();
    expect(computeSelectionCenter(nodes, edges, [], ["missing"])).toBeNull();
  });

  it("keeps current route styling ahead of low availability styling", () => {
    expect(stageLinkStrokeColor(true, true, true)).toBe("#1677ff");
    expect(stageLinkStrokeColor(true, false, true)).toBe("#d46b08");
  });
});
