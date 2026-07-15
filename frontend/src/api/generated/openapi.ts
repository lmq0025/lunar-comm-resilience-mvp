export interface NodePayload {
  id: string;
  type: string;
  role: string;
  name?: string | null;
  position_x?: number | null;
  position_y?: number | null;
  active?: boolean;
  availability?: number;
  node_processing_delay_ms?: number;
  [key: string]: unknown;
}

export interface LinkPayload {
  source: string;
  target: string;
  kind: string;
  bandwidth_mbps: number;
  delay_ms: number;
  packet_loss_rate: number;
  availability: number;
  active?: boolean;
  id?: string | null;
  name?: string | null;
  [key: string]: unknown;
}

export interface ServicePayload {
  id: string;
  name?: string | null;
  service_type?: string | null;
  source: string;
  target: string;
  priority: number;
  required_bandwidth_mbps: number;
  max_delay_ms?: number | null;
  max_loss_rate?: number | null;
  max_interruption_s?: number | null;
  min_success_rate?: number | null;
  degraded_bandwidth_mbps?: number | null;
  [key: string]: unknown;
}

export interface FaultPayload {
  id: string;
  type: string;
  start_s: number;
  duration_s: number;
  target: string;
  severity: number;
  enabled?: boolean;
  [key: string]: unknown;
}

export interface FaultSectionPayload {
  enabled: string[];
  schedule: FaultPayload[];
  [key: string]: unknown;
}

export interface HealingSectionPayload {
  enabled: string[];
  [key: string]: unknown;
}

export interface TechnicalIndicatorPayload {
  id: string;
  name: string;
  layer: string;
  operator: string;
  threshold: number;
  unit: string;
  metric: string;
  verification_method: string;
  applicable_when?: Record<string, unknown> | null;
  [key: string]: unknown;
}

export interface ScenarioPayload {
  scenario: Record<string, unknown>;
  environment: Record<string, unknown>;
  nodes: NodePayload[];
  links: LinkPayload[];
  services: ServicePayload[];
  faults: FaultSectionPayload;
  healing: HealingSectionPayload;
  technical_indicators: TechnicalIndicatorPayload[];
  model_parameters?: Record<string, unknown>;
  physical_model_config?: Record<string, unknown>;
  fault_propagation?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface ValidationIssueResponse {
  field: string;
  message: string;
  type?: string | null;
  [key: string]: unknown;
}

export interface ScenarioValidationResponse {
  valid: boolean;
  errors: ValidationIssueResponse[];
  warnings: ValidationIssueResponse[];
  summary: Record<string, unknown>;
}

export interface CatalogItemResponse {
  id: string;
  code?: string | null;
  display_name_zh?: string | null;
  description_zh?: string | null;
  target_scope?: string | null;
  execution_step?: number | null;
  strategy_category?: string | null;
  target_summary_zh?: string | null;
  preconditions_zh?: string | null;
  implementation_status?: string | null;
  implemented_effect?: string | null;
  name_zh?: string | null;
  name_en?: string | null;
  description?: string | null;
  [key: string]: unknown;
}

export interface CatalogResponse {
  node_types: CatalogItemResponse[];
  link_types: CatalogItemResponse[];
  fault_modes: CatalogItemResponse[];
  healing_strategies: CatalogItemResponse[];
  routing_strategies: CatalogItemResponse[];
  simulation_steps: CatalogItemResponse[];
}

export interface HealthResponse {
  status: string;
  application: string;
  version: string;
}

export interface SessionCreateRequest {
  scenario: ScenarioPayload;
  project_id?: string | null;
  project_revision?: number | null;
}

export interface SessionSummaryResponse {
  session_id: string;
  run_id?: string | null;
  project_id?: string | null;
  project_revision?: number | null;
  scenario_name?: string | null;
  current_step: string;
  completed_steps: string[];
  next_allowed_step?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  output_dir?: string | null;
}

export interface GraphSnapshotResponse {
  stage: string;
  summary: Record<string, unknown>;
  nodes: Record<string, unknown>[];
  links: Record<string, unknown>[];
  routes: Record<string, unknown>;
}

export interface RouteSnapshotItemResponse {
  service_id: string;
  source: string;
  target: string;
  path: string[];
  valid: boolean;
  route_source?: string | null;
  notes: string;
  bottleneck_bandwidth_mbps?: number | null;
  total_delay_ms?: number | null;
  packet_loss_rate?: number | null;
  availability?: number | null;
  handover_disturbance_ms?: number | null;
}

export interface BuildTopologyStepResultResponse {
  topology: GraphSnapshotResponse;
}

export interface CalculateRoutesStepResultResponse {
  routes: Record<string, RouteSnapshotItemResponse>;
  topology: GraphSnapshotResponse;
}

export interface StepResponse<TResult = Record<string, unknown>> {
  session_id: string;
  completed_step: string;
  current_step: string;
  completed_steps: string[];
  next_allowed_step?: string | null;
  step_result: TResult;
}

export type BuildTopologyStepResponse = StepResponse<BuildTopologyStepResultResponse>;
export type CalculateRoutesStepResponse = StepResponse<CalculateRoutesStepResultResponse>;

export interface NonFiniteValueResponse {
  value?: null;
  value_status: "nan" | "positive_infinity" | "negative_infinity";
}

export type JsonSafeNumber = number | NonFiniteValueResponse;
export type JsonSafeOptionalNumber = number | NonFiniteValueResponse | null;

export interface ServiceSimulationResultResponse {
  phase: string;
  service_id: string;
  source: string;
  target: string;
  path: string;
  reachable: boolean;
  demand_mbps: number;
  throughput_mbps: number;
  end_to_end_delay_ms: JsonSafeNumber;
  packet_loss_rate: number;
  availability: number;
  success_rate: number;
  interruption_s: number;
  degraded: boolean;
  route_valid: boolean;
  route_source?: string | null;
  failure_reason: string;
  notes: string;
}

export interface MetricRowResponse {
  phase: string;
  layer: string;
  metric: string;
  value: JsonSafeOptionalNumber;
  [key: string]: unknown;
}

export interface PhysicalModelValidationItemResponse {
  model: string;
  input_temperature_c?: number | string | null;
  input_radiation_level?: number | string | null;
  input_dust_level?: number | string | null;
  predicted_value?: number | null;
  reference_value?: number | null;
  error_pct?: number | null;
  target_error_pct?: number | null;
  passed: boolean;
  reference_source: string;
  verification_method: string;
  [key: string]: unknown;
}

export interface PhysicalModelMetricsResponse {
  rf_lifetime_prediction_error_pct?: JsonSafeOptionalNumber;
  dust_gain_loss_quantification_error_pct?: JsonSafeOptionalNumber;
  predicted_rf_lifetime_h?: JsonSafeOptionalNumber;
  reference_rf_lifetime_h?: JsonSafeOptionalNumber;
  predicted_gain_loss_db?: JsonSafeOptionalNumber;
  reference_gain_loss_db?: JsonSafeOptionalNumber;
  [key: string]: unknown;
}

export interface RunNominalStepResultResponse {
  services: ServiceSimulationResultResponse[];
  metrics: MetricRowResponse[];
  topology: GraphSnapshotResponse;
  routes: Record<string, RouteSnapshotItemResponse>;
  physical_model_validation: PhysicalModelValidationItemResponse[];
  physical_model_metrics: PhysicalModelMetricsResponse;
}

export type RunNominalStepResponse = StepResponse<RunNominalStepResultResponse>;

export interface FaultRecordResponse {
  fault_id: string;
  fault_type: string;
  target: string;
  start_s: number;
  duration_s: number;
  severity: number;
  applied_effect: string;
}

export interface InjectFaultsStepResultResponse {
  fault_records: FaultRecordResponse[];
  routes: Record<string, RouteSnapshotItemResponse>;
  topology: GraphSnapshotResponse;
}

export type InjectFaultsStepResponse = StepResponse<InjectFaultsStepResultResponse>;

export interface MetricDeltaResponse {
  layer: string;
  metric: string;
  nominal_value: JsonSafeOptionalNumber;
  before_healing_value: JsonSafeOptionalNumber;
  delta: JsonSafeOptionalNumber;
}

export interface PropagationPredictionResponse {
  root_fault: string;
  predicted_effect: string;
  predicted_layer: string;
  predicted_probability: JsonSafeOptionalNumber;
  predicted_delay_ms: JsonSafeOptionalNumber;
  propagation_path: string;
  confidence: JsonSafeOptionalNumber;
  [key: string]: unknown;
}

export interface ObservedImpactResponse {
  observed_effect: string;
  observed_layer: string;
  source: string;
  observed_delay_ms: JsonSafeOptionalNumber;
  evidence: string;
  [key: string]: unknown;
}

export interface PropagationComparisonResponse {
  predicted_effect: string;
  observed: boolean;
  true_positive: boolean;
  false_positive: boolean;
  false_negative: boolean;
  predicted_delay_ms: JsonSafeOptionalNumber;
  observed_delay_ms: JsonSafeOptionalNumber;
  delay_error_pct: JsonSafeOptionalNumber;
  [key: string]: unknown;
}

export interface PropagationMetricsResponse {
  cascading_fault_prediction_accuracy?: JsonSafeOptionalNumber;
  fault_propagation_delay_error_pct?: JsonSafeOptionalNumber;
  propagation_true_positive_count?: JsonSafeOptionalNumber;
  propagation_false_positive_count?: JsonSafeOptionalNumber;
  propagation_false_negative_count?: JsonSafeOptionalNumber;
  [key: string]: unknown;
}

export interface FaultImpactSummaryResponse {
  affected_node_ids: string[];
  failed_link_ids: Array<string | null>;
  degraded_link_ids: Array<string | null>;
  invalid_service_ids: string[];
  unreachable_service_ids: string[];
  qos_degraded_service_ids: string[];
  metric_deltas: MetricDeltaResponse[];
  propagation_predictions: PropagationPredictionResponse[];
  observed_impacts: ObservedImpactResponse[];
  propagation_comparison: PropagationComparisonResponse[];
  propagation_metrics: PropagationMetricsResponse | Record<string, unknown>;
  summary: Record<string, unknown>;
}

export interface AnalyzeFaultImpactStepResultResponse {
  services: ServiceSimulationResultResponse[];
  metrics: MetricRowResponse[];
  fault_impact: FaultImpactSummaryResponse;
}

export type AnalyzeFaultImpactStepResponse = StepResponse<AnalyzeFaultImpactStepResultResponse>;

export interface HealingActionResponse {
  time_s: number;
  strategy: string;
  target: string;
  action: string;
  success: boolean;
  measured_response_ms: JsonSafeNumber;
  notes: string;
}

export interface ExecuteHealingStepResultResponse {
  healing_actions: HealingActionResponse[];
  pending_route_recalculation: boolean;
  routes: Record<string, RouteSnapshotItemResponse>;
  topology: GraphSnapshotResponse;
}

export type ExecuteHealingStepResponse = StepResponse<ExecuteHealingStepResultResponse>;

export interface RecalculateRoutesStepResultResponse {
  healing_actions: HealingActionResponse[];
  pending_route_recalculation: boolean;
  routes: Record<string, RouteSnapshotItemResponse>;
  topology: GraphSnapshotResponse;
}

export type RecalculateRoutesStepResponse = StepResponse<RecalculateRoutesStepResultResponse>;

export interface RunAfterHealingStepResultResponse {
  services: ServiceSimulationResultResponse[];
  metrics: MetricRowResponse[];
  topology: GraphSnapshotResponse;
  healing_actions: HealingActionResponse[];
  routes: Record<string, RouteSnapshotItemResponse>;
}

export type RunAfterHealingStepResponse = StepResponse<RunAfterHealingStepResultResponse>;

export interface IndicatorCheckResponse {
  id: string;
  indicator: string;
  layer: string;
  metric: string;
  operator: "<=" | ">=";
  threshold: number;
  actual: JsonSafeNumber;
  unit: string;
  applicable: boolean;
  status: "passed" | "failed" | "not_applicable";
  not_applicable_reason: string;
  passed: boolean;
  verification_method: string;
}

export interface ArtifactItemResponse {
  filename: string;
  relative_path: string;
  exists: boolean;
  size_bytes: number;
  file_type?: string | null;
  purpose_zh?: string | null;
}

export interface ArtifactManifestResponse {
  artifacts: ArtifactItemResponse[];
}

export interface VerifyIndicatorsStepResultResponse {
  indicators: IndicatorCheckResponse[];
  applicable_count: number;
  passed_count: number;
  failed_count: number;
  not_applicable_count: number;
  artifacts: ArtifactItemResponse[];
}

export type VerifyIndicatorsStepResponse = StepResponse<VerifyIndicatorsStepResultResponse>;

export interface UserResponse {
  user_id: string;
  username: string;
  role: string;
  is_active: boolean;
  auth_mode?: string | null;
}

export interface ProjectResponse {
  project_id: string;
  owner_user_id: string;
  name: string;
  description: string;
  revision: number;
  deleted: boolean;
  created_at: string;
  updated_at: string;
  scenario?: ScenarioPayload | null;
  editor?: Record<string, unknown> | null;
}

export interface ProjectListResponse {
  projects: ProjectResponse[];
}

export interface ProjectCreateRequest {
  name: string;
  description: string;
  scenario: ScenarioPayload;
  editor?: Record<string, unknown>;
}

export interface ProjectUpdateRequest {
  expected_revision?: number | null;
  name?: string | null;
  description?: string | null;
  scenario?: ScenarioPayload | null;
  editor?: Record<string, unknown> | null;
}

export interface ProjectVersionResponse {
  version_id: string;
  project_id: string;
  revision: number;
  name: string;
  description: string;
  scenario: ScenarioPayload;
  editor: Record<string, unknown>;
  created_at: string;
  created_by_user_id: string;
}

export interface ProjectVersionListResponse {
  versions: ProjectVersionResponse[];
}

export interface RunStepHistoryResponse {
  step_name: string;
  step_index: number;
  response: StepResponse<Record<string, unknown>>;
  created_at: string;
}

export interface SimulationRunResponse {
  run_id: string;
  session_id: string;
  project_id?: string | null;
  project_revision?: number | null;
  owner_user_id: string;
  scenario_name?: string | null;
  status: string;
  current_step: string;
  completed_steps: string[];
  output_dir?: string | null;
  created_at: string;
  updated_at: string;
  steps: RunStepHistoryResponse[];
  artifacts: ArtifactItemResponse[];
}

export interface SimulationRunListResponse {
  runs: SimulationRunResponse[];
}

export interface RestoreRunSessionResponse {
  session: SessionSummaryResponse;
  run: SimulationRunResponse;
}

export interface JobResponse {
  job_id: string;
  run_id: string;
  step_name: string;
  status: string;
  cancellation_requested: boolean;
  result?: Record<string, unknown> | null;
  error?: Record<string, unknown> | null;
  created_at: string;
  started_at?: string | null;
  finished_at?: string | null;
}

export interface ClientErrorRequest {
  message: string;
  stack?: string | null;
  url?: string | null;
  user_agent?: string | null;
  context?: Record<string, unknown>;
}

export interface ClientErrorResponse {
  recorded: boolean;
  request_id?: string | null;
}
