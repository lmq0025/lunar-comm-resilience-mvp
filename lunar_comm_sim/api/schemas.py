"""Pydantic request and response models for the backend API."""

from __future__ import annotations

from typing import Any, Literal, TypeAlias

from pydantic import BaseModel, ConfigDict, Field, model_validator


class NodePayload(BaseModel):
    model_config = ConfigDict(extra="allow")

    id: str = Field(min_length=1)
    type: str
    role: str
    name: str | None = None
    position_x: float | None = None
    position_y: float | None = None
    active: bool = True
    availability: float = Field(default=1.0, ge=0, le=1)
    node_processing_delay_ms: float = Field(default=0.0, ge=0)


class LinkPayload(BaseModel):
    model_config = ConfigDict(extra="allow")

    source: str
    target: str
    kind: str
    bandwidth_mbps: float = Field(gt=0)
    delay_ms: float = Field(ge=0)
    packet_loss_rate: float = Field(ge=0, le=1)
    availability: float = Field(ge=0, le=1)
    active: bool = True
    id: str | None = None
    name: str | None = None


class ServicePayload(BaseModel):
    model_config = ConfigDict(extra="allow")

    id: str = Field(min_length=1)
    name: str | None = None
    service_type: str | None = None
    source: str
    target: str
    priority: int = Field(ge=0)
    required_bandwidth_mbps: float = Field(gt=0)
    max_delay_ms: float | None = Field(default=None, ge=0)
    max_loss_rate: float | None = Field(default=None, ge=0, le=1)
    max_interruption_s: float | None = Field(default=None, ge=0)
    min_success_rate: float | None = Field(default=None, ge=0, le=1)
    degraded_bandwidth_mbps: float | None = Field(default=None, gt=0)

    @model_validator(mode="after")
    def validate_service_constraints(self) -> "ServicePayload":
        if self.source == self.target:
            raise ValueError("source and target must be different")
        if (
            self.degraded_bandwidth_mbps is not None
            and self.degraded_bandwidth_mbps > self.required_bandwidth_mbps
        ):
            raise ValueError("degraded_bandwidth_mbps must be <= required_bandwidth_mbps")
        return self


class FaultPayload(BaseModel):
    model_config = ConfigDict(extra="allow")

    id: str = Field(min_length=1)
    type: str
    start_s: float = Field(ge=0)
    duration_s: float = Field(ge=0)
    target: str
    severity: float = Field(ge=0, le=1)
    enabled: bool = True


class FaultSectionPayload(BaseModel):
    model_config = ConfigDict(extra="allow")

    enabled: list[str] = Field(default_factory=list)
    schedule: list[FaultPayload] = Field(default_factory=list)


class HealingSectionPayload(BaseModel):
    model_config = ConfigDict(extra="allow")

    enabled: list[str] = Field(default_factory=list)


class TechnicalIndicatorPayload(BaseModel):
    model_config = ConfigDict(extra="allow")

    id: str
    name: str
    layer: str
    operator: str
    threshold: float
    unit: str
    metric: str
    verification_method: str
    applicable_when: dict[str, Any] | None = None


class ScenarioPayload(BaseModel):
    model_config = ConfigDict(extra="allow")

    scenario: dict[str, Any]
    environment: dict[str, Any]
    nodes: list[NodePayload]
    links: list[LinkPayload]
    services: list[ServicePayload]
    faults: FaultSectionPayload
    healing: HealingSectionPayload
    technical_indicators: list[TechnicalIndicatorPayload] = Field(default_factory=list)


class SessionCreateRequest(BaseModel):
    scenario: ScenarioPayload


class ValidationIssueResponse(BaseModel):
    model_config = ConfigDict(extra="allow")

    field: str
    message: str
    type: str | None = None


class ScenarioValidationResponse(BaseModel):
    valid: bool
    errors: list[ValidationIssueResponse]
    warnings: list[ValidationIssueResponse]
    summary: dict[str, Any]


class HealthResponse(BaseModel):
    status: str
    application: str
    version: str


class CatalogItemResponse(BaseModel):
    model_config = ConfigDict(extra="allow")

    id: str
    code: str | None = None
    display_name_zh: str | None = None
    description_zh: str | None = None
    target_scope: str | None = None
    implementation_status: str | None = None
    implemented_effect: str | None = None
    name_zh: str | None = None
    name_en: str | None = None
    description: str | None = None


class CatalogResponse(BaseModel):
    node_types: list[CatalogItemResponse]
    link_types: list[CatalogItemResponse]
    fault_modes: list[CatalogItemResponse]
    healing_strategies: list[CatalogItemResponse]
    routing_strategies: list[CatalogItemResponse]
    simulation_steps: list[CatalogItemResponse]


class NonFiniteValueResponse(BaseModel):
    value: None = None
    value_status: Literal["nan", "positive_infinity", "negative_infinity"]


NonFiniteValue = NonFiniteValueResponse
JsonSafeFloat: TypeAlias = float | NonFiniteValueResponse
JsonSafeOptionalFloat: TypeAlias = float | NonFiniteValueResponse | None


class SessionSummaryResponse(BaseModel):
    session_id: str
    scenario_name: str | None = None
    current_step: str
    completed_steps: list[str]
    next_allowed_step: str | None = None
    created_at: str | None = None
    updated_at: str | None = None
    output_dir: str | None = None


class GraphSnapshotResponse(BaseModel):
    stage: str
    summary: dict[str, Any]
    nodes: list[dict[str, Any]]
    links: list[dict[str, Any]]
    routes: dict[str, Any]


class RouteSnapshotItemResponse(BaseModel):
    service_id: str
    source: str
    target: str
    path: list[str]
    valid: bool
    route_source: str | None = None
    notes: str = ""
    bottleneck_bandwidth_mbps: float | None = None
    total_delay_ms: float | None = None
    packet_loss_rate: float | None = None
    availability: float | None = None
    handover_disturbance_ms: float | None = None


class BuildTopologyStepResultResponse(BaseModel):
    topology: GraphSnapshotResponse


class CalculateRoutesStepResultResponse(BaseModel):
    routes: dict[str, RouteSnapshotItemResponse]
    topology: GraphSnapshotResponse


class StepResponse(BaseModel):
    session_id: str
    completed_step: str
    current_step: str
    completed_steps: list[str]
    next_allowed_step: str | None
    step_result: dict[str, Any]


class BuildTopologyStepResponse(BaseModel):
    session_id: str
    completed_step: str
    current_step: str
    completed_steps: list[str]
    next_allowed_step: str | None
    step_result: BuildTopologyStepResultResponse


class CalculateRoutesStepResponse(BaseModel):
    session_id: str
    completed_step: str
    current_step: str
    completed_steps: list[str]
    next_allowed_step: str | None
    step_result: CalculateRoutesStepResultResponse


class ServiceSimulationResultResponse(BaseModel):
    phase: str
    service_id: str
    source: str
    target: str
    path: str
    reachable: bool
    demand_mbps: float
    throughput_mbps: float
    end_to_end_delay_ms: JsonSafeFloat
    packet_loss_rate: float
    availability: float
    success_rate: float
    interruption_s: float
    degraded: bool
    route_valid: bool
    route_source: str | None = None
    failure_reason: str = ""
    notes: str = ""


class MetricRowResponse(BaseModel):
    model_config = ConfigDict(extra="allow")

    phase: str
    layer: str
    metric: str
    value: JsonSafeOptionalFloat


class PhysicalModelValidationItemResponse(BaseModel):
    model_config = ConfigDict(extra="allow")

    model: str
    input_temperature_c: float | str | None = None
    input_radiation_level: float | str | None = None
    input_dust_level: float | str | None = None
    predicted_value: float | None = None
    reference_value: float | None = None
    error_pct: float | None = None
    target_error_pct: float | None = None
    passed: bool
    reference_source: str
    verification_method: str


class PhysicalModelMetricsResponse(BaseModel):
    model_config = ConfigDict(extra="allow")

    rf_lifetime_prediction_error_pct: JsonSafeOptionalFloat = None
    dust_gain_loss_quantification_error_pct: JsonSafeOptionalFloat = None
    predicted_rf_lifetime_h: JsonSafeOptionalFloat = None
    reference_rf_lifetime_h: JsonSafeOptionalFloat = None
    predicted_gain_loss_db: JsonSafeOptionalFloat = None
    reference_gain_loss_db: JsonSafeOptionalFloat = None


class RunNominalStepResultResponse(BaseModel):
    services: list[ServiceSimulationResultResponse]
    metrics: list[MetricRowResponse]
    topology: GraphSnapshotResponse
    routes: dict[str, RouteSnapshotItemResponse]
    physical_model_validation: list[PhysicalModelValidationItemResponse]
    physical_model_metrics: PhysicalModelMetricsResponse


class RunNominalStepResponse(BaseModel):
    session_id: str
    completed_step: str
    current_step: str
    completed_steps: list[str]
    next_allowed_step: str | None
    step_result: RunNominalStepResultResponse


class FaultRecordResponse(BaseModel):
    fault_id: str
    fault_type: str
    target: str
    start_s: float
    duration_s: float
    severity: float
    applied_effect: str


class InjectFaultsStepResultResponse(BaseModel):
    fault_records: list[FaultRecordResponse]
    routes: dict[str, RouteSnapshotItemResponse]
    topology: GraphSnapshotResponse


class InjectFaultsStepResponse(BaseModel):
    session_id: str
    completed_step: str
    current_step: str
    completed_steps: list[str]
    next_allowed_step: str | None
    step_result: InjectFaultsStepResultResponse


class MetricDeltaResponse(BaseModel):
    layer: str
    metric: str
    nominal_value: JsonSafeOptionalFloat
    before_healing_value: JsonSafeOptionalFloat
    delta: JsonSafeOptionalFloat


class PropagationPredictionResponse(BaseModel):
    model_config = ConfigDict(extra="allow")

    root_fault: str
    predicted_effect: str
    predicted_layer: str
    predicted_probability: JsonSafeOptionalFloat
    predicted_delay_ms: JsonSafeOptionalFloat
    propagation_path: str
    confidence: JsonSafeOptionalFloat


class ObservedImpactResponse(BaseModel):
    model_config = ConfigDict(extra="allow")

    observed_effect: str
    observed_layer: str
    source: str
    observed_delay_ms: JsonSafeOptionalFloat
    evidence: str


class PropagationComparisonResponse(BaseModel):
    model_config = ConfigDict(extra="allow")

    predicted_effect: str
    observed: bool
    true_positive: bool
    false_positive: bool
    false_negative: bool
    predicted_delay_ms: JsonSafeOptionalFloat
    observed_delay_ms: JsonSafeOptionalFloat
    delay_error_pct: JsonSafeOptionalFloat


class PropagationMetricsResponse(BaseModel):
    model_config = ConfigDict(extra="allow")

    cascading_fault_prediction_accuracy: JsonSafeOptionalFloat = None
    fault_propagation_delay_error_pct: JsonSafeOptionalFloat = None
    propagation_true_positive_count: JsonSafeOptionalFloat = None
    propagation_false_positive_count: JsonSafeOptionalFloat = None
    propagation_false_negative_count: JsonSafeOptionalFloat = None


class FaultImpactSummaryResponse(BaseModel):
    affected_node_ids: list[str]
    failed_link_ids: list[str | None]
    degraded_link_ids: list[str | None]
    invalid_service_ids: list[str]
    unreachable_service_ids: list[str]
    qos_degraded_service_ids: list[str]
    metric_deltas: list[MetricDeltaResponse]
    propagation_predictions: list[PropagationPredictionResponse]
    observed_impacts: list[ObservedImpactResponse]
    propagation_comparison: list[PropagationComparisonResponse]
    propagation_metrics: PropagationMetricsResponse | dict[str, Any]
    summary: dict[str, Any]


class AnalyzeFaultImpactStepResultResponse(BaseModel):
    services: list[ServiceSimulationResultResponse]
    metrics: list[MetricRowResponse]
    fault_impact: FaultImpactSummaryResponse


class AnalyzeFaultImpactStepResponse(BaseModel):
    session_id: str
    completed_step: str
    current_step: str
    completed_steps: list[str]
    next_allowed_step: str | None
    step_result: AnalyzeFaultImpactStepResultResponse


class ArtifactItemResponse(BaseModel):
    filename: str
    relative_path: str
    exists: bool
    size_bytes: int


class ArtifactManifestResponse(BaseModel):
    artifacts: list[ArtifactItemResponse]


class DeleteSessionResponse(BaseModel):
    deleted: bool
    session_id: str


class ErrorDetailResponse(BaseModel):
    model_config = ConfigDict(extra="allow")

    code: str
    message: str
    current_step: str | None = None
    required_step: str | None = None


class ErrorResponse(BaseModel):
    error: ErrorDetailResponse
