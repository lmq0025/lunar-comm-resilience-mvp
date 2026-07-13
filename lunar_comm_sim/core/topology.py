"""Topology construction and rendering."""

from __future__ import annotations

from pathlib import Path

import matplotlib

matplotlib.use("Agg")

import matplotlib.pyplot as plt
import networkx as nx
from matplotlib.lines import Line2D
from matplotlib.patches import Patch

from lunar_comm_sim.core.environment import environmental_link_effects
from lunar_comm_sim.core.scenario import Scenario


NODE_LABELS_ZH = {
    "ground_station": "地球地面站",
    "lunar_orbiter": "月轨中继器",
    "lander_main_hub": "月面主枢纽",
    "relay_backup_1": "备用中继1",
    "relay_backup_2": "备用中继2",
    "edge_compute": "边缘计算节点",
    "science_station": "科学载荷站",
    "camera_station": "高清视频站",
    "teleop_terminal": "遥操作终端",
    "rover_1": "巡视器1",
    "rover_2": "巡视器2",
    "rover_3": "巡视器3",
}


def build_topology(scenario: Scenario) -> nx.Graph:
    """Build an undirected network graph from scenario nodes and links."""

    graph = nx.Graph(name=scenario.name)
    for node in scenario.nodes:
        graph.add_node(
            node.id,
            type=node.type,
            role=node.role,
            active=True,
            availability=1.0,
        )

    for link in scenario.links:
        attrs = {
            "kind": link.kind,
            "bandwidth_mbps": float(link.bandwidth_mbps),
            "base_bandwidth_mbps": float(link.bandwidth_mbps),
            "delay_ms": float(link.delay_ms),
            "base_delay_ms": float(link.delay_ms),
            "packet_loss_rate": float(link.packet_loss_rate),
            "base_packet_loss_rate": float(link.packet_loss_rate),
            "availability": float(link.availability),
            "base_availability": float(link.availability),
            "active": bool(link.active),
        }
        attrs.update(environmental_link_effects(attrs, scenario.environment, scenario.model_parameters))
        graph.add_edge(link.source, link.target, **attrs)

    return graph


def active_subgraph(graph: nx.Graph) -> nx.Graph:
    """Return a copy containing only active nodes and active edges."""

    active_nodes = [node for node, data in graph.nodes(data=True) if data.get("active", True)]
    subgraph = graph.subgraph(active_nodes).copy()
    inactive_edges = [
        (u, v)
        for u, v, data in subgraph.edges(data=True)
        if not data.get("active", True) or data.get("availability", 0.0) <= 0.0
    ]
    subgraph.remove_edges_from(inactive_edges)
    return subgraph


def draw_topology(graph: nx.Graph, path: str | Path, title: str) -> None:
    """Render a topology image with failed nodes and degraded links highlighted."""

    output_path = Path(path)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    _configure_chinese_fonts()

    pos = _stable_layout(graph)
    node_colors = []
    for _, data in graph.nodes(data=True):
        if not data.get("active", True):
            node_colors.append("#d64545")
        elif data.get("type") == "ground":
            node_colors.append("#5b8def")
        elif data.get("type") == "orbiter":
            node_colors.append("#8f6ccf")
        elif data.get("type") == "surface_relay":
            node_colors.append("#f0a33a")
        else:
            node_colors.append("#4fb06d")

    edge_colors = []
    widths = []
    for _, _, data in graph.edges(data=True):
        if not data.get("active", True) or data.get("availability", 0.0) <= 0.0:
            edge_colors.append("#c9c9c9")
            widths.append(1.0)
        elif data.get("availability", 1.0) < 0.998:
            edge_colors.append("#d98b32")
            widths.append(1.8)
        else:
            edge_colors.append("#5b6b7a")
            widths.append(1.4)

    plt.figure(figsize=(12, 8))
    nx.draw_networkx_edges(graph, pos, edge_color=edge_colors, width=widths, alpha=0.85)
    nx.draw_networkx_nodes(graph, pos, node_color=node_colors, node_size=1050, edgecolors="#222222")
    labels = {node: NODE_LABELS_ZH.get(node, node) for node in graph.nodes}
    nx.draw_networkx_labels(graph, pos, labels=labels, font_size=8, font_color="#111111")
    plt.title(title, fontsize=14)
    plt.legend(handles=_legend_handles(), loc="lower center", bbox_to_anchor=(0.5, -0.08), ncol=4, frameon=False)
    plt.axis("off")
    plt.tight_layout()
    plt.savefig(output_path, dpi=180)
    plt.close()


def _configure_chinese_fonts() -> None:
    plt.rcParams["font.sans-serif"] = ["Microsoft YaHei", "SimHei", "DejaVu Sans"]
    plt.rcParams["axes.unicode_minus"] = False


def _legend_handles() -> list[Patch | Line2D]:
    return [
        Patch(facecolor="#5b8def", edgecolor="#222222", label="蓝色：地球地面站"),
        Patch(facecolor="#8f6ccf", edgecolor="#222222", label="紫色：月轨中继"),
        Patch(facecolor="#f0a33a", edgecolor="#222222", label="橙色：备用中继"),
        Patch(facecolor="#4fb06d", edgecolor="#222222", label="绿色：正常月面节点"),
        Patch(facecolor="#d64545", edgecolor="#222222", label="红色：失效节点"),
        Line2D([0], [0], color="#5b6b7a", lw=2, label="深灰线：正常链路"),
        Line2D([0], [0], color="#d98b32", lw=2, label="橙色线：退化链路"),
        Line2D([0], [0], color="#c9c9c9", lw=2, label="浅灰线：失效链路"),
    ]


def _stable_layout(graph: nx.Graph) -> dict[str, tuple[float, float]]:
    fixed = {
        "ground_station": (0.0, 3.0),
        "lunar_orbiter": (0.0, 1.7),
        "lander_main_hub": (0.0, 0.3),
        "relay_backup_1": (-1.5, -0.3),
        "relay_backup_2": (1.5, -0.3),
        "edge_compute": (0.0, -0.8),
        "science_station": (-2.5, -1.3),
        "camera_station": (2.5, -1.3),
        "teleop_terminal": (1.0, -1.8),
        "rover_1": (-2.8, 0.1),
        "rover_2": (2.8, 0.1),
        "rover_3": (-1.2, -1.8),
    }
    return {node: fixed.get(node, (index, 0.0)) for index, node in enumerate(graph.nodes)}
