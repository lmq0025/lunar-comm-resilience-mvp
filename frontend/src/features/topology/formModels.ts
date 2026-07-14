import type { LinkPayload, NodePayload } from "../../api/contracts";

export interface NodeFormValues {
  id: string;
  name?: string | null;
  type: string;
  role: string;
  active: boolean;
  availability: number;
  node_processing_delay_ms: number;
  position_x?: number | null;
  position_y?: number | null;
}

export interface LinkFormValues {
  id?: string | null;
  name?: string | null;
  source: string;
  target: string;
  kind: string;
  bandwidth_mbps: number;
  delay_ms: number;
  packet_loss_rate: number;
  availability: number;
  active: boolean;
}

export function nodePayloadToFormValues(payload: NodePayload): NodeFormValues {
  return {
    id: payload.id,
    name: payload.name ?? null,
    type: payload.type,
    role: payload.role,
    active: payload.active ?? true,
    availability: payload.availability ?? 1,
    node_processing_delay_ms: payload.node_processing_delay_ms ?? 0,
    position_x: payload.position_x ?? null,
    position_y: payload.position_y ?? null
  };
}

export function nodeFormValuesToPayload(base: NodePayload, values: Partial<NodeFormValues>): NodePayload {
  return {
    ...base,
    ...values,
    id: base.id,
    active: values.active ?? base.active ?? true,
    availability: values.availability ?? base.availability ?? 1,
    node_processing_delay_ms: values.node_processing_delay_ms ?? base.node_processing_delay_ms ?? 0
  };
}

export function linkPayloadToFormValues(payload: LinkPayload): LinkFormValues {
  return {
    id: payload.id ?? null,
    name: payload.name ?? null,
    source: payload.source,
    target: payload.target,
    kind: payload.kind,
    bandwidth_mbps: payload.bandwidth_mbps,
    delay_ms: payload.delay_ms,
    packet_loss_rate: payload.packet_loss_rate,
    availability: payload.availability,
    active: payload.active ?? true
  };
}

export function linkFormValuesToPayload(base: LinkPayload, values: Partial<LinkFormValues>): LinkPayload {
  return {
    ...base,
    ...values,
    id: values.id ?? base.id,
    source: base.source,
    target: base.target,
    active: values.active ?? base.active ?? true
  };
}

export function makeLinkPayload(values: LinkFormValues): LinkPayload {
  return {
    id: values.id ?? null,
    name: values.name ?? null,
    source: values.source,
    target: values.target,
    kind: values.kind,
    bandwidth_mbps: values.bandwidth_mbps,
    delay_ms: values.delay_ms,
    packet_loss_rate: values.packet_loss_rate,
    availability: values.availability,
    active: values.active
  };
}
