import type { ServicePayload } from "../../api/contracts";

export interface ServicePreset {
  id: string;
  label: string;
  description: string;
  values: Partial<ServicePayload>;
}

export const servicePresets: ServicePreset[] = [
  {
    id: "control_command",
    label: "控制指令",
    description: "默认建议值，可编辑",
    values: {
      service_type: "control_command",
      priority: 1,
      required_bandwidth_mbps: 1,
      max_delay_ms: 1450,
      max_loss_rate: 1e-5
    }
  },
  {
    id: "teleoperation",
    label: "遥操作",
    description: "默认建议值，可编辑",
    values: {
      service_type: "teleoperation",
      priority: 2,
      required_bandwidth_mbps: 4,
      max_delay_ms: 160,
      max_loss_rate: 2e-5
    }
  },
  {
    id: "science_data",
    label: "科学数据",
    description: "默认建议值，可编辑",
    values: {
      service_type: "science_data",
      priority: 3,
      required_bandwidth_mbps: 8,
      max_delay_ms: 1800,
      max_interruption_s: 1
    }
  },
  {
    id: "hd_video",
    label: "高清影像",
    description: "默认建议值，可编辑",
    values: {
      service_type: "hd_video",
      priority: 4,
      required_bandwidth_mbps: 30,
      degraded_bandwidth_mbps: 12,
      max_delay_ms: 1850,
      min_success_rate: 0.999
    }
  },
  {
    id: "custom",
    label: "自定义业务",
    description: "默认建议值，可编辑",
    values: {
      service_type: "custom",
      priority: 5,
      required_bandwidth_mbps: 1
    }
  }
];

export function serviceTypeLabel(type: string | null | undefined): string {
  return servicePresets.find((preset) => preset.id === type)?.label ?? type ?? "未设置";
}

export function servicePresetById(id: string): ServicePreset {
  return servicePresets.find((preset) => preset.id === id) ?? servicePresets[servicePresets.length - 1];
}
