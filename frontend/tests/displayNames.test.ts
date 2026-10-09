import { describe, expect, it } from "vitest";
import {
  artifactPurpose,
  engineeringTextDisplayName,
  faultDisplayName,
  indicatorDisplayMeta,
  nodeDisplayName,
  propagationEventDisplayName,
  routeSourceDisplayName,
  serviceDisplayName
} from "../src/i18n/displayNames";

describe("统一中文显示名称", () => {
  it("映射默认十二节点和四项业务", () => {
    expect(nodeDisplayName("lander_main_hub")).toBe("着陆器主通信枢纽");
    expect(nodeDisplayName("ground_station")).toBe("地球地面测控站");
    expect(serviceDisplayName("control_command")).toBe("地月遥控指令");
    expect(serviceDisplayName("teleoperation")).toBe("月面近实时遥操作");
  });

  it("用户自定义中文名称优先且不改变内部 ID", () => {
    const node = { id: "lander_main_hub", name: "自定义枢纽", type: "main_hub", role: "primary", active: true };
    expect(nodeDisplayName(node)).toBe("自定义枢纽");
    expect(node.id).toBe("lander_main_hub");
  });

  it("未知 ID 使用安全的可读回退", () => {
    expect(nodeDisplayName("future_orbit_node")).toContain("future orbit node");
    expect(serviceDisplayName("future_service")).toContain("future service");
  });

  it("覆盖故障传播、路由来源和十四项指标", () => {
    expect(faultDisplayName("main_hub_failure")).toBe("主通信枢纽失效");
    expect(propagationEventDisplayName("service_qos_drop")).toBe("业务服务质量下降");
    expect(routeSourceDisplayName("reroute_backup_path")).toBe("备用路径重路由");
    expect(indicatorDisplayMeta("science_data_interruption").name).toBe("科学数据回传中断时间");
  });

  it("为成果文件提供中文用途", () => {
    expect(artifactPurpose("service_routes.csv")).toBe("三阶段业务路径");
  });

  it("统一翻译真实后端工程短语并保留动态内部 ID", () => {
    expect(engineeringTextDisplayName("inactive node lander_main_hub")).toContain("着陆器主通信枢纽");
    expect(engineeringTextDisplayName("priority protection; delay target exceeded")).toBe("优先级保护；超过时延目标");
    expect(engineeringTextDisplayName("before_healing service reachable=false")).toBe("故障后、自愈前的业务不可达");
  });
});
