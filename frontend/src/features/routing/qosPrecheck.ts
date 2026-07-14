import type { RouteSnapshotItemResponse, ServicePayload } from "../../api/contracts";

export type QosOverallStatus = "pass" | "fail" | "unknown";

export interface QosCheckItem {
  key: string;
  label: string;
  status: "pass" | "fail" | "info" | "unknown";
  detail: string;
}

export interface QosPrecheckResult {
  overallStatus: QosOverallStatus;
  passed: boolean;
  applicableCount: number;
  passedCount: number;
  failedCount: number;
  unknownCount: number;
  items: QosCheckItem[];
}

export function evaluateQosPrecheck(service: ServicePayload, route?: RouteSnapshotItemResponse): QosPrecheckResult {
  const items: QosCheckItem[] = [];
  if (!route || !route.valid) {
    items.push({
      key: "route",
      label: "路径可达性",
      status: "fail",
      detail: route?.notes || "当前活动拓扑中无可达路径"
    });
    return summarize(items);
  }

  items.push({ key: "route", label: "路径可达性", status: "pass", detail: "当前活动拓扑中存在可达路径" });
  addNumericCheck(items, {
    key: "bandwidth",
    label: "瓶颈带宽",
    actual: route.bottleneck_bandwidth_mbps,
    expected: service.required_bandwidth_mbps,
    pass: (actual, expected) => actual >= expected,
    passText: (actual, expected) => `${formatNumber(actual)} Mbps >= ${formatNumber(expected)} Mbps`,
    failText: (actual, expected) => `${formatNumber(actual)} Mbps < ${formatNumber(expected)} Mbps`
  });

  if (service.max_delay_ms != null) {
    addNumericCheck(items, {
      key: "delay",
      label: "总时延",
      actual: route.total_delay_ms,
      expected: service.max_delay_ms,
      pass: (actual, expected) => actual <= expected,
      passText: (actual, expected) => `${formatNumber(actual)} ms <= ${formatNumber(expected)} ms`,
      failText: (actual, expected) => `${formatNumber(actual)} ms > ${formatNumber(expected)} ms`
    });
  }

  if (service.max_loss_rate != null) {
    addNumericCheck(items, {
      key: "loss",
      label: "路径丢包率",
      actual: route.packet_loss_rate,
      expected: service.max_loss_rate,
      pass: (actual, expected) => actual <= expected,
      passText: (actual, expected) => `${formatScientific(actual)} <= ${formatScientific(expected)}`,
      failText: (actual, expected) => `${formatScientific(actual)} > ${formatScientific(expected)}`
    });
  }

  if (service.min_success_rate != null) {
    const successRate = route.packet_loss_rate == null ? null : 1 - route.packet_loss_rate;
    addNumericCheck(items, {
      key: "success-rate",
      label: "链路级成功率近似",
      actual: successRate,
      expected: service.min_success_rate,
      pass: (actual, expected) => actual >= expected,
      passText: (actual, expected) => `${formatNumber(actual, 6)} >= ${formatNumber(expected, 6)}（链路级成功率近似）`,
      failText: (actual, expected) => `${formatNumber(actual, 6)} < ${formatNumber(expected, 6)}（链路级成功率近似）`
    });
  }

  if (service.max_interruption_s != null) {
    items.push({
      key: "interruption",
      label: "最大中断时间",
      status: "info",
      detail: "需在后续故障/业务仿真中验证"
    });
  }

  if (service.degraded_bandwidth_mbps != null) {
    items.push({
      key: "degraded-bandwidth",
      label: "降级带宽",
      status: "info",
      detail: `${formatNumber(service.degraded_bandwidth_mbps)} Mbps，自愈或降级策略备用参数`
    });
  }

  return summarize(items);
}

function addNumericCheck(
  items: QosCheckItem[],
  check: {
    key: string;
    label: string;
    actual: number | null | undefined;
    expected: number;
    pass: (actual: number, expected: number) => boolean;
    passText: (actual: number, expected: number) => string;
    failText: (actual: number, expected: number) => string;
  }
) {
  if (check.actual == null) {
    items.push({ key: check.key, label: check.label, status: "unknown", detail: "后端未返回该路径指标" });
    return;
  }
  const passed = check.pass(check.actual, check.expected);
  items.push({
    key: check.key,
    label: check.label,
    status: passed ? "pass" : "fail",
    detail: passed ? check.passText(check.actual, check.expected) : check.failText(check.actual, check.expected)
  });
}

function summarize(items: QosCheckItem[]): QosPrecheckResult {
  const hardItems = items.filter((item) => item.status !== "info");
  const passedCount = hardItems.filter((item) => item.status === "pass").length;
  const failedCount = hardItems.filter((item) => item.status === "fail").length;
  const unknownCount = hardItems.filter((item) => item.status === "unknown").length;
  const overallStatus: QosOverallStatus = failedCount > 0 ? "fail" : unknownCount > 0 ? "unknown" : "pass";
  return {
    overallStatus,
    passed: overallStatus === "pass",
    applicableCount: hardItems.length,
    passedCount,
    failedCount,
    unknownCount,
    items
  };
}

export function formatNumber(value: number | null | undefined, digits = 3): string {
  if (value == null || Number.isNaN(value)) return "-";
  return Number(value).toLocaleString("zh-CN", { maximumFractionDigits: digits });
}

export function formatScientific(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "-";
  return Math.abs(value) > 0 && Math.abs(value) < 0.001 ? value.toExponential(3) : formatNumber(value, 6);
}
