import type { JsonSafeOptionalNumber } from "../../api/contracts";

export function formatSimulationNumber(value: JsonSafeOptionalNumber, digits = 3): string {
  if (value == null) return "-";
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return "无法计算";
    if (Math.abs(value) >= 1000 || (Math.abs(value) > 0 && Math.abs(value) < 0.001)) {
      return value.toExponential(digits);
    }
    return Number(value.toFixed(digits)).toString();
  }
  if (value.value_status === "positive_infinity") return "∞";
  if (value.value_status === "negative_infinity") return "-∞";
  return "无法计算";
}

export function finiteNumber(value: JsonSafeOptionalNumber): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}
