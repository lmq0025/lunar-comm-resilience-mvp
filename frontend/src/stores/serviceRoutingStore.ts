import { create } from "zustand";
import type {
  FaultImpactSummaryResponse,
  FaultPayload,
  FaultRecordResponse,
  GraphSnapshotResponse,
  MetricRowResponse,
  PhysicalModelMetricsResponse,
  PhysicalModelValidationItemResponse,
  RouteSnapshotItemResponse,
  ScenarioPayload,
  ServicePayload,
  ServiceSimulationResultResponse
} from "../api/contracts";
import { ApiClientError } from "../api/client";
import { validateScenario } from "../api/scenarios";
import {
  analyzeFaultImpactStep,
  buildTopologyStep,
  calculateRoutesStep,
  createSession,
  deleteSession,
  injectFaultsStep,
  runNominalStep
} from "../api/routing";
import { servicePresetById } from "../features/services/servicePresets";
import { useProjectStore } from "./projectStore";

const NOT_BUILT = "\u672a\u6784\u5efa";
const BUILDING = "\u6784\u5efa\u4e2d";
const BUILT = "\u5df2\u6784\u5efa";
const EXPIRED = "\u5df2\u8fc7\u671f";
const FAILED = "\u5931\u8d25";

const NOT_CALCULATED = "\u672a\u8ba1\u7b97";
const CALCULATING = "\u8ba1\u7b97\u4e2d";
const CALCULATED = "\u5df2\u8ba1\u7b97";

const NOT_RUN = "\u672a\u8fd0\u884c";
const RUNNING = "\u8fd0\u884c\u4e2d";
const COMPLETED = "\u5df2\u5b8c\u6210";

const NOT_INJECTED = "\u672a\u6ce8\u5165";
const INJECTING = "\u6ce8\u5165\u4e2d";
const INJECTED = "\u5df2\u6ce8\u5165";

const NOT_ANALYZED = "\u672a\u5206\u6790";
const ANALYZING = "\u5206\u6790\u4e2d";

export type BackendTopologyStatus = typeof NOT_BUILT | typeof BUILDING | typeof BUILT | typeof EXPIRED | typeof FAILED;
export type RouteStatus = typeof NOT_CALCULATED | typeof CALCULATING | typeof CALCULATED | typeof EXPIRED | typeof FAILED;
export type NominalStatus = typeof NOT_RUN | typeof RUNNING | typeof COMPLETED | typeof EXPIRED | typeof FAILED;
export type FaultInjectionStatus = typeof NOT_INJECTED | typeof INJECTING | typeof INJECTED | typeof EXPIRED | typeof FAILED;
export type FaultImpactStatus = typeof NOT_ANALYZED | typeof ANALYZING | typeof COMPLETED | typeof EXPIRED | typeof FAILED;
export type SelectedStage = "nominal" | "before_healing" | "comparison";
export type RuntimeInvalidationReason =
  | "topology_changed"
  | "service_changed"
  | "fault_changed"
  | "project_changed"
  | "scenario_imported"
  | "environment_changed";

interface ServiceRoutingState {
  runtimeProjectId: string | null;
  sessionId: string | null;
  backendTopologyStatus: BackendTopologyStatus;
  routeStatus: RouteStatus;
  nominalStatus: NominalStatus;
  faultInjectionStatus: FaultInjectionStatus;
  faultImpactStatus: FaultImpactStatus;
  topologySnapshot: GraphSnapshotResponse | null;
  routes: Record<string, RouteSnapshotItemResponse>;
  nominalTopology: GraphSnapshotResponse | null;
  nominalRoutes: Record<string, RouteSnapshotItemResponse>;
  nominalServices: ServiceSimulationResultResponse[];
  nominalMetrics: MetricRowResponse[];
  physicalModelValidation: PhysicalModelValidationItemResponse[];
  physicalModelMetrics: PhysicalModelMetricsResponse | null;
  faultRecords: FaultRecordResponse[];
  faultedRoutes: Record<string, RouteSnapshotItemResponse>;
  faultedTopology: GraphSnapshotResponse | null;
  beforeHealingServices: ServiceSimulationResultResponse[];
  beforeHealingMetrics: MetricRowResponse[];
  faultImpact: FaultImpactSummaryResponse | null;
  selectedStage: SelectedStage;
  selectedServiceId: string | null;
  selectedFaultId: string | null;
  selectedNodeIds: string[];
  selectedLinkIds: string[];
  routingStrategy: "shortest_delay";
  error: string | null;
  lastInvalidatedAt: string | null;
  lastInvalidationReason: RuntimeInvalidationReason | null;
  operationSeq: number;
  addService: (presetId?: string) => ServicePayload;
  updateService: (serviceId: string, patch: Partial<ServicePayload>) => void;
  duplicateService: (serviceId: string) => ServicePayload | null;
  deleteService: (serviceId: string) => void;
  addFault: (faultType?: string) => FaultPayload;
  updateFault: (faultId: string, patch: Partial<FaultPayload>) => void;
  duplicateFault: (faultId: string) => FaultPayload | null;
  deleteFault: (faultId: string) => void;
  toggleFault: (faultId: string, enabled: boolean) => void;
  selectService: (serviceId: string | null) => void;
  selectStage: (stage: SelectedStage) => void;
  selectFault: (faultId: string | null) => void;
  selectTopologyNode: (nodeId: string | null) => void;
  selectTopologyLink: (linkId: string | null) => void;
  clearTopologySelection: () => void;
  ensureProjectContext: (projectId: string | null, serviceIds?: string[]) => void;
  invalidateRuntime: (reason: RuntimeInvalidationReason) => void;
  markResultsStale: () => void;
  resetRuntime: () => void;
  buildBackendTopology: () => Promise<void>;
  calculateRoutes: () => Promise<void>;
  runNominal: () => Promise<void>;
  injectFaults: () => Promise<void>;
  analyzeFaultImpact: () => Promise<void>;
}

const INITIAL_RUNTIME = {
  sessionId: null,
  backendTopologyStatus: NOT_BUILT as BackendTopologyStatus,
  routeStatus: NOT_CALCULATED as RouteStatus,
  nominalStatus: NOT_RUN as NominalStatus,
  faultInjectionStatus: NOT_INJECTED as FaultInjectionStatus,
  faultImpactStatus: NOT_ANALYZED as FaultImpactStatus,
  topologySnapshot: null,
  routes: {},
  nominalTopology: null,
  nominalRoutes: {},
  nominalServices: [],
  nominalMetrics: [],
  physicalModelValidation: [],
  physicalModelMetrics: null,
  faultRecords: [],
  faultedRoutes: {},
  faultedTopology: null,
  beforeHealingServices: [],
  beforeHealingMetrics: [],
  faultImpact: null,
  selectedStage: "nominal" as SelectedStage,
  selectedFaultId: null,
  selectedNodeIds: [],
  selectedLinkIds: [],
  error: null,
  lastInvalidatedAt: null,
  lastInvalidationReason: null
};

export const useServiceRoutingStore = create<ServiceRoutingState>((set, get) => ({
  runtimeProjectId: null,
  ...INITIAL_RUNTIME,
  selectedServiceId: null,
  routingStrategy: "shortest_delay",
  operationSeq: 0,

  addService: (presetId = "custom") => {
    const projectStore = useProjectStore.getState();
    const scenario = requireScenario(projectStore.getCurrentScenario());
    const preset = servicePresetById(presetId);
    const source = scenario.nodes[0]?.id ?? "";
    const target = scenario.nodes.find((node) => node.id !== source)?.id ?? "";
    const service: ServicePayload = {
      id: `service_${crypto.randomUUID().slice(0, 8)}`,
      name: preset.label,
      service_type: preset.id,
      source,
      target,
      priority: 5,
      required_bandwidth_mbps: 1,
      ...preset.values
    };
    ensureValidService(service);
    projectStore.updateDraftScenario((base) => ({ ...base, services: [...base.services, service] }));
    set({ selectedServiceId: service.id });
    get().invalidateRuntime("service_changed");
    return service;
  },

  updateService: (serviceId, patch) => {
    const projectStore = useProjectStore.getState();
    const scenario = requireScenario(projectStore.getCurrentScenario());
    const existing = scenario.services.find((service) => service.id === serviceId);
    if (!existing) throw new Error("\u4e1a\u52a1\u4e0d\u5b58\u5728");
    const updated = { ...existing, ...patch, id: existing.id };
    ensureValidService(updated);
    projectStore.updateDraftScenario((base) => ({
      ...base,
      services: base.services.map((service) => (service.id === serviceId ? updated : service))
    }));
    get().invalidateRuntime("service_changed");
  },

  duplicateService: (serviceId) => {
    const projectStore = useProjectStore.getState();
    const scenario = requireScenario(projectStore.getCurrentScenario());
    const source = scenario.services.find((service) => service.id === serviceId);
    if (!source) return null;
    const duplicated: ServicePayload = {
      ...source,
      id: `service_${crypto.randomUUID().slice(0, 8)}`,
      name: `${source.name || source.id} \u526f\u672c`
    };
    projectStore.updateDraftScenario((base) => ({ ...base, services: [...base.services, duplicated] }));
    set({ selectedServiceId: duplicated.id });
    get().invalidateRuntime("service_changed");
    return duplicated;
  },

  deleteService: (serviceId) => {
    const projectStore = useProjectStore.getState();
    const scenario = requireScenario(projectStore.getCurrentScenario());
    const remaining = scenario.services.filter((service) => service.id !== serviceId);
    projectStore.updateDraftScenario((base) => ({ ...base, services: remaining }));
    set((state) => ({
      selectedServiceId:
        state.selectedServiceId === serviceId
          ? remaining[0]?.id ?? null
          : state.selectedServiceId && remaining.some((service) => service.id === state.selectedServiceId)
            ? state.selectedServiceId
            : remaining[0]?.id ?? null
    }));
    get().invalidateRuntime("service_changed");
  },

  addFault: (faultType = "main_hub_failure") => {
    const projectStore = useProjectStore.getState();
    const scenario = requireScenario(projectStore.getCurrentScenario());
    const fault: FaultPayload = {
      id: nextFaultId(scenario.faults.schedule),
      type: faultType,
      target: scenario.nodes[0]?.id ?? "global",
      start_s: 0,
      duration_s: Math.min(10, Number(scenario.scenario.duration_s ?? 120)),
      severity: 0.5,
      enabled: true
    };
    ensureValidFault(fault);
    projectStore.updateDraftScenario((base) => {
      const schedule = [...base.faults.schedule, fault];
      return { ...base, faults: { ...base.faults, enabled: synchronizeFaultTypeWhitelist(schedule), schedule } };
    });
    set({ selectedFaultId: fault.id });
    get().invalidateRuntime("fault_changed");
    return fault;
  },

  updateFault: (faultId, patch) => {
    const projectStore = useProjectStore.getState();
    const scenario = requireScenario(projectStore.getCurrentScenario());
    const existing = scenario.faults.schedule.find((fault) => fault.id === faultId);
    if (!existing) throw new Error("\u6545\u969c\u4e0d\u5b58\u5728");
    const updated = { ...existing, enabled: existing.enabled ?? true, ...patch, id: existing.id };
    ensureValidFault(updated);
    projectStore.updateDraftScenario((base) => {
      const schedule = base.faults.schedule.map((fault) => (fault.id === faultId ? updated : fault));
      return { ...base, faults: { ...base.faults, enabled: synchronizeFaultTypeWhitelist(schedule), schedule } };
    });
    set({ selectedFaultId: faultId });
    get().invalidateRuntime("fault_changed");
  },

  duplicateFault: (faultId) => {
    const projectStore = useProjectStore.getState();
    const scenario = requireScenario(projectStore.getCurrentScenario());
    const source = scenario.faults.schedule.find((fault) => fault.id === faultId);
    if (!source) return null;
    const duplicated: FaultPayload = {
      ...source,
      enabled: source.enabled ?? true,
      id: nextFaultId(scenario.faults.schedule)
    };
    projectStore.updateDraftScenario((base) => {
      const schedule = [...base.faults.schedule, duplicated];
      return { ...base, faults: { ...base.faults, enabled: synchronizeFaultTypeWhitelist(schedule), schedule } };
    });
    set({ selectedFaultId: duplicated.id });
    get().invalidateRuntime("fault_changed");
    return duplicated;
  },

  deleteFault: (faultId) => {
    const projectStore = useProjectStore.getState();
    let nextSelectedFaultId: string | null = null;
    projectStore.updateDraftScenario((base) => {
      const schedule = base.faults.schedule.filter((fault) => fault.id !== faultId);
      nextSelectedFaultId = schedule[0]?.id ?? null;
      return { ...base, faults: { ...base.faults, enabled: synchronizeFaultTypeWhitelist(schedule), schedule } };
    });
    set((state) => ({ selectedFaultId: state.selectedFaultId === faultId ? nextSelectedFaultId : state.selectedFaultId }));
    get().invalidateRuntime("fault_changed");
  },

  toggleFault: (faultId, enabled) => {
    get().updateFault(faultId, { enabled });
  },

  selectService: (selectedServiceId) => set({ selectedServiceId }),
  selectStage: (selectedStage) => set({ selectedStage }),
  selectFault: (selectedFaultId) => set({ selectedFaultId }),
  selectTopologyNode: (nodeId) => set({ selectedNodeIds: nodeId ? [nodeId] : [], selectedLinkIds: [] }),
  selectTopologyLink: (linkId) => set({ selectedLinkIds: linkId ? [linkId] : [], selectedNodeIds: [] }),
  clearTopologySelection: () => set({ selectedNodeIds: [], selectedLinkIds: [] }),

  ensureProjectContext: (projectId, serviceIds = []) => {
    const state = get();
    const selectedServiceId =
      state.selectedServiceId && serviceIds.includes(state.selectedServiceId)
        ? state.selectedServiceId
        : serviceIds[0] ?? null;

    if (state.runtimeProjectId === projectId) {
      if (state.selectedServiceId !== selectedServiceId) {
        set({ selectedServiceId });
      }
      return;
    }

    const oldSessionId = state.sessionId;
    if (oldSessionId) {
      void deleteSession(oldSessionId).catch(() => undefined);
    }
    set({
      runtimeProjectId: projectId,
      ...INITIAL_RUNTIME,
      selectedServiceId,
      operationSeq: state.operationSeq + 1
    });
  },

  invalidateRuntime: (reason) => {
    const state = get();
    const oldSessionId = state.sessionId;
    if (oldSessionId) {
      void deleteSession(oldSessionId).catch(() => undefined);
    }
    const hadRuntimeData = hasRuntimeData(state);
    set({
      ...INITIAL_RUNTIME,
      sessionId: null,
      backendTopologyStatus: hadRuntimeData ? EXPIRED : NOT_BUILT,
      routeStatus: hadRuntimeData ? EXPIRED : NOT_CALCULATED,
      nominalStatus: hadRuntimeData ? EXPIRED : NOT_RUN,
      faultInjectionStatus: hadRuntimeData ? EXPIRED : NOT_INJECTED,
      faultImpactStatus: hadRuntimeData ? EXPIRED : NOT_ANALYZED,
      selectedServiceId: state.selectedServiceId,
      selectedFaultId: state.selectedFaultId,
      lastInvalidatedAt: new Date().toISOString(),
      lastInvalidationReason: reason,
      operationSeq: state.operationSeq + 1
    });
  },

  markResultsStale: () => {
    get().invalidateRuntime("topology_changed");
  },

  resetRuntime: () => set((state) => ({
    ...INITIAL_RUNTIME,
    runtimeProjectId: null,
    selectedServiceId: null,
    operationSeq: state.operationSeq + 1
  })),

  buildBackendTopology: async () => {
    const state = get();
    if (isBusy(state)) return;
    const scenario = requireScenario(useProjectStore.getState().getCurrentScenario());
    const oldSessionId = state.sessionId;
    const operationSeq = state.operationSeq + 1;
    set({
      ...clearDownstreamResults(),
      operationSeq,
      sessionId: null,
      backendTopologyStatus: BUILDING,
      routeStatus: NOT_CALCULATED,
      topologySnapshot: null,
      routes: {},
      error: null
    });

    let newlyCreatedSessionId: string | null = null;
    try {
      const validation = await validateScenario(scenario);
      if (get().operationSeq !== operationSeq) return;
      useProjectStore.getState().setValidation(validation.valid ? "\u9a8c\u8bc1\u901a\u8fc7" : "\u9a8c\u8bc1\u5931\u8d25", validation);
      if (!validation.valid) {
        setBuildFailed(operationSeq, firstValidationMessage(validation.errors));
        return;
      }
      if (oldSessionId) {
        await deleteSession(oldSessionId).catch(() => undefined);
      }
      const session = await createSession(scenario);
      newlyCreatedSessionId = session.session_id;
      if (get().operationSeq !== operationSeq) {
        await deleteSession(newlyCreatedSessionId).catch(() => undefined);
        return;
      }
      const step = await buildTopologyStep(newlyCreatedSessionId);
      if (get().operationSeq !== operationSeq) {
        await deleteSession(newlyCreatedSessionId).catch(() => undefined);
        return;
      }
      set({
        sessionId: newlyCreatedSessionId,
        backendTopologyStatus: BUILT,
        routeStatus: NOT_CALCULATED,
        topologySnapshot: step.step_result.topology,
        routes: {},
        error: null
      });
    } catch (error) {
      if (newlyCreatedSessionId) {
        await deleteSession(newlyCreatedSessionId).catch(() => undefined);
      }
      setBuildFailed(operationSeq, errorMessage(error));
    }
  },

  calculateRoutes: async () => {
    const state = get();
    if (isBusy(state)) return;
    const sessionId = state.sessionId;
    if (!sessionId || state.backendTopologyStatus !== BUILT) {
      set({ routeStatus: FAILED, routes: {}, error: "\u8bf7\u5148\u5b8c\u6210\u6b65\u9aa4 1 \u6784\u5efa\u62d3\u6251" });
      return;
    }
    const operationSeq = state.operationSeq + 1;
    set({ ...clearDownstreamResults(), operationSeq, routeStatus: CALCULATING, routes: {}, error: null });
    try {
      const step = await calculateRoutesStep(sessionId);
      if (get().operationSeq !== operationSeq) return;
      set({
        backendTopologyStatus: BUILT,
        routeStatus: CALCULATED,
        topologySnapshot: step.step_result.topology,
        routes: step.step_result.routes,
        error: null
      });
    } catch (error) {
      if (get().operationSeq !== operationSeq) return;
      set({ routeStatus: FAILED, routes: {}, error: errorMessage(error) });
    }
  },

  runNominal: async () => {
    const state = get();
    if (isBusy(state)) return;
    const sessionId = state.sessionId;
    if (!sessionId || state.routeStatus !== CALCULATED) {
      set({ nominalStatus: FAILED, error: "\u8bf7\u5148\u5b8c\u6210\u6b65\u9aa4 2 \u8ba1\u7b97\u8def\u5f84" });
      return;
    }
    const operationSeq = state.operationSeq + 1;
    set({ ...clearNominalAndFaultResults(), operationSeq, nominalStatus: RUNNING, error: null });
    try {
      const step = await runNominalStep(sessionId);
      if (get().operationSeq !== operationSeq) return;
      set({
        nominalStatus: COMPLETED,
        faultInjectionStatus: NOT_INJECTED,
        faultImpactStatus: NOT_ANALYZED,
        nominalServices: step.step_result.services,
        nominalMetrics: step.step_result.metrics,
        nominalTopology: step.step_result.topology,
        nominalRoutes: step.step_result.routes,
        physicalModelValidation: step.step_result.physical_model_validation,
        physicalModelMetrics: step.step_result.physical_model_metrics,
        error: null
      });
    } catch (error) {
      if (get().operationSeq !== operationSeq) return;
      set({ ...clearNominalAndFaultResults(), nominalStatus: FAILED, error: errorMessage(error) });
    }
  },

  injectFaults: async () => {
    const state = get();
    if (isBusy(state)) return;
    const sessionId = state.sessionId;
    if (!sessionId || state.nominalStatus !== COMPLETED) {
      set({ faultInjectionStatus: FAILED, error: "\u8bf7\u5148\u5b8c\u6210\u6b65\u9aa4 3 \u8fd0\u884c\u6b63\u5e38\u72b6\u6001" });
      return;
    }
    const operationSeq = state.operationSeq + 1;
    set({
      ...clearFaultResults(),
      operationSeq,
      faultInjectionStatus: INJECTING,
      error: null
    });
    try {
      const step = await injectFaultsStep(sessionId);
      if (get().operationSeq !== operationSeq) return;
      set({
        faultInjectionStatus: INJECTED,
        faultImpactStatus: NOT_ANALYZED,
        faultRecords: step.step_result.fault_records,
        faultedRoutes: step.step_result.routes,
        faultedTopology: step.step_result.topology,
        selectedStage: "before_healing",
        error: null
      });
    } catch (error) {
      if (get().operationSeq !== operationSeq) return;
      set({ ...clearFaultResults(), faultInjectionStatus: FAILED, error: errorMessage(error) });
    }
  },

  analyzeFaultImpact: async () => {
    const state = get();
    if (isBusy(state)) return;
    const sessionId = state.sessionId;
    if (!sessionId || state.faultInjectionStatus !== INJECTED) {
      set({ faultImpactStatus: FAILED, error: "\u8bf7\u5148\u5b8c\u6210\u6b65\u9aa4 4 \u6ce8\u5165\u6545\u969c" });
      return;
    }
    const operationSeq = state.operationSeq + 1;
    set({
      operationSeq,
      faultImpactStatus: ANALYZING,
      beforeHealingServices: [],
      beforeHealingMetrics: [],
      faultImpact: null,
      error: null
    });
    try {
      const step = await analyzeFaultImpactStep(sessionId);
      if (get().operationSeq !== operationSeq) return;
      set({
        faultImpactStatus: COMPLETED,
        beforeHealingServices: step.step_result.services,
        beforeHealingMetrics: step.step_result.metrics,
        faultImpact: step.step_result.fault_impact,
        error: null
      });
    } catch (error) {
      if (get().operationSeq !== operationSeq) return;
      set({ faultImpactStatus: FAILED, beforeHealingServices: [], beforeHealingMetrics: [], faultImpact: null, error: errorMessage(error) });
    }
  }
}));

function clearDownstreamResults(): Partial<ServiceRoutingState> {
  return {
    ...clearNominalAndFaultResults(),
    nominalStatus: NOT_RUN,
    faultInjectionStatus: NOT_INJECTED,
    faultImpactStatus: NOT_ANALYZED
  };
}

function clearNominalAndFaultResults(): Partial<ServiceRoutingState> {
  return {
    nominalTopology: null,
    nominalRoutes: {},
    nominalServices: [],
    nominalMetrics: [],
    physicalModelValidation: [],
    physicalModelMetrics: null,
    ...clearFaultResults()
  };
}

function clearFaultResults(): Partial<ServiceRoutingState> {
  return {
    faultRecords: [],
    faultedRoutes: {},
    faultedTopology: null,
    beforeHealingServices: [],
    beforeHealingMetrics: [],
    faultImpact: null,
    faultImpactStatus: NOT_ANALYZED,
    selectedNodeIds: [],
    selectedLinkIds: []
  };
}

export function synchronizeFaultTypeWhitelist(schedule: FaultPayload[]): string[] {
  const seen = new Set<string>();
  const enabled: string[] = [];
  for (const fault of schedule) {
    const type = fault.type.trim();
    if (type && !seen.has(type)) {
      seen.add(type);
      enabled.push(type);
    }
  }
  return enabled;
}

function setBuildFailed(operationSeq: number, error: string): void {
  if (useServiceRoutingStore.getState().operationSeq !== operationSeq) return;
  useServiceRoutingStore.setState({
    sessionId: null,
    backendTopologyStatus: FAILED,
    routeStatus: NOT_CALCULATED,
    topologySnapshot: null,
    routes: {},
    ...clearDownstreamResults(),
    error
  });
}

function requireScenario(scenario: ScenarioPayload | null): ScenarioPayload {
  if (!scenario) throw new Error("\u8bf7\u5148\u6253\u5f00\u9879\u76ee");
  return scenario;
}

function ensureValidService(service: ServicePayload): void {
  if (!service.id.trim()) throw new Error("\u4e1a\u52a1 ID \u4e0d\u80fd\u4e3a\u7a7a");
  if (service.source === service.target) throw new Error("\u6e90\u8282\u70b9\u548c\u76ee\u6807\u8282\u70b9\u4e0d\u80fd\u76f8\u540c");
  if (service.required_bandwidth_mbps <= 0) throw new Error("\u9700\u6c42\u5e26\u5bbd\u5fc5\u987b\u5927\u4e8e 0");
  if (service.max_loss_rate != null && (service.max_loss_rate < 0 || service.max_loss_rate > 1)) {
    throw new Error("\u6700\u5927\u4e22\u5305\u7387\u5fc5\u987b\u5728 0 \u5230 1 \u4e4b\u95f4");
  }
  if (service.min_success_rate != null && (service.min_success_rate < 0 || service.min_success_rate > 1)) {
    throw new Error("\u6700\u5c0f\u6210\u529f\u7387\u5fc5\u987b\u5728 0 \u5230 1 \u4e4b\u95f4");
  }
  if (service.max_delay_ms != null && service.max_delay_ms < 0) throw new Error("\u6700\u5927\u65f6\u5ef6\u4e0d\u80fd\u4e3a\u8d1f\u6570");
  if (service.max_interruption_s != null && service.max_interruption_s < 0) throw new Error("\u6700\u5927\u4e2d\u65ad\u65f6\u95f4\u4e0d\u80fd\u4e3a\u8d1f\u6570");
  if (service.degraded_bandwidth_mbps != null && service.degraded_bandwidth_mbps > service.required_bandwidth_mbps) {
    throw new Error("\u964d\u7ea7\u5e26\u5bbd\u4e0d\u80fd\u5927\u4e8e\u9700\u6c42\u5e26\u5bbd");
  }
}

function ensureValidFault(fault: FaultPayload): void {
  if (!fault.id.trim()) throw new Error("\u6545\u969c ID \u4e0d\u80fd\u4e3a\u7a7a");
  if (!fault.type.trim()) throw new Error("\u6545\u969c\u7c7b\u578b\u4e0d\u80fd\u4e3a\u7a7a");
  if (!fault.target.trim()) throw new Error("\u6545\u969c\u76ee\u6807\u4e0d\u80fd\u4e3a\u7a7a");
  if (fault.start_s < 0) throw new Error("\u5f00\u59cb\u65f6\u95f4\u4e0d\u80fd\u4e3a\u8d1f\u6570");
  if (fault.duration_s < 0) throw new Error("\u6301\u7eed\u65f6\u95f4\u4e0d\u80fd\u4e3a\u8d1f\u6570");
  if (fault.severity < 0 || fault.severity > 1) throw new Error("\u4e25\u91cd\u7a0b\u5ea6\u5fc5\u987b\u5728 0 \u5230 1 \u4e4b\u95f4");
}

function nextFaultId(faults: FaultPayload[]): string {
  const used = new Set(faults.map((fault) => fault.id));
  for (let index = faults.length + 1; ; index += 1) {
    const candidate = `F${index}`;
    if (!used.has(candidate)) return candidate;
  }
}

function firstValidationMessage(errors: { field: string; message: string }[]): string {
  return errors[0] ? `${errors[0].field}: ${errors[0].message}` : "\u573a\u666f\u9a8c\u8bc1\u5931\u8d25";
}

function errorMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    if (error.body.code === "CONFLICT") {
      const details = error.body.details as { error?: { current_step?: string; required_step?: string } } | undefined;
      const current = details?.error?.current_step;
      const required = details?.error?.required_step;
      return current && required
        ? `\u6b65\u9aa4\u987a\u5e8f\u9519\u8bef\uff1a\u5f53\u524d ${current}\uff0c\u8981\u6c42 ${required}`
        : error.body.message;
    }
    return error.body.message;
  }
  if (error instanceof Error) return error.message;
  return "\u64cd\u4f5c\u5931\u8d25";
}

function isBusy(state: ServiceRoutingState): boolean {
  return (
    state.backendTopologyStatus === BUILDING ||
    state.routeStatus === CALCULATING ||
    state.nominalStatus === RUNNING ||
    state.faultInjectionStatus === INJECTING ||
    state.faultImpactStatus === ANALYZING
  );
}

function hasRuntimeData(state: ServiceRoutingState): boolean {
  return (
    Boolean(state.sessionId) ||
    Boolean(state.topologySnapshot) ||
    Object.keys(state.routes).length > 0 ||
    state.nominalServices.length > 0 ||
    state.nominalMetrics.length > 0 ||
    state.faultRecords.length > 0 ||
    Boolean(state.faultedTopology) ||
    state.beforeHealingServices.length > 0 ||
    Boolean(state.faultImpact) ||
    state.backendTopologyStatus === BUILT ||
    state.routeStatus === CALCULATED ||
    state.nominalStatus === COMPLETED ||
    state.faultInjectionStatus === INJECTED ||
    state.faultImpactStatus === COMPLETED
  );
}
