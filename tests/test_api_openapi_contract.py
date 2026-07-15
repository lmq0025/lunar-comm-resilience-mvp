from api_round1_helpers import STEP_ENDPOINTS, client


def _ref_name(schema: dict) -> str:
    return schema["$ref"].rsplit("/", 1)[-1]


def test_scenario_validate_request_uses_scenario_payload() -> None:
    schema = client().get("/openapi.json").json()
    request_schema = schema["paths"]["/api/v1/scenarios/validate"]["post"]["requestBody"]["content"]["application/json"]["schema"]
    assert _ref_name(request_schema) == "ScenarioPayload"


def test_create_session_request_uses_session_create_request() -> None:
    schema = client().get("/openapi.json").json()
    request_schema = schema["paths"]["/api/v1/sessions"]["post"]["requestBody"]["content"]["application/json"]["schema"]
    assert _ref_name(request_schema) == "SessionCreateRequest"


def test_step_success_responses_use_step_response() -> None:
    schema = client().get("/openapi.json").json()
    for endpoint in STEP_ENDPOINTS:
        response_schema = (
            schema["paths"][f"/api/v1/sessions/{{session_id}}/steps/{endpoint}"]["post"]["responses"]["200"]["content"]["application/json"]["schema"]
        )
        expected = {
            "build-topology": "BuildTopologyStepResponse",
            "calculate-routes": "CalculateRoutesStepResponse",
            "run-nominal": "RunNominalStepResponse",
            "inject-faults": "InjectFaultsStepResponse",
            "analyze-fault-impact": "AnalyzeFaultImpactStepResponse",
            "execute-healing": "ExecuteHealingStepResponse",
            "recalculate-routes": "RecalculateRoutesStepResponse",
            "run-after-healing": "RunAfterHealingStepResponse",
            "verify-indicators": "VerifyIndicatorsStepResponse",
        }.get(endpoint, "StepResponse")
        assert _ref_name(response_schema) == expected


def test_round4_step_response_models_are_precise() -> None:
    schema = client().get("/openapi.json").json()
    components = schema["components"]["schemas"]
    assert "ServiceSimulationResultResponse" in components
    assert "FaultRecordResponse" in components
    assert "FaultImpactSummaryResponse" in components
    assert "PropagationMetricsResponse" in components

    run_nominal = components["RunNominalStepResultResponse"]["properties"]
    assert run_nominal["services"]["items"]["$ref"].endswith("/ServiceSimulationResultResponse")
    assert run_nominal["physical_model_validation"]["items"]["$ref"].endswith("/PhysicalModelValidationItemResponse")

    inject_faults = components["InjectFaultsStepResultResponse"]["properties"]
    assert inject_faults["fault_records"]["items"]["$ref"].endswith("/FaultRecordResponse")

    analyze_fault = components["AnalyzeFaultImpactStepResultResponse"]["properties"]
    assert analyze_fault["fault_impact"]["$ref"].endswith("/FaultImpactSummaryResponse")


def test_round5_step_response_models_are_precise() -> None:
    schema = client().get("/openapi.json").json()
    components = schema["components"]["schemas"]
    assert "HealingActionResponse" in components
    assert "IndicatorCheckResponse" in components

    step6 = components["ExecuteHealingStepResultResponse"]["properties"]
    assert step6["healing_actions"]["items"]["$ref"].endswith("/HealingActionResponse")
    assert step6["routes"]["additionalProperties"]["$ref"].endswith("/RouteSnapshotItemResponse")

    step8 = components["RunAfterHealingStepResultResponse"]["properties"]
    assert step8["services"]["items"]["$ref"].endswith("/ServiceSimulationResultResponse")

    step9 = components["VerifyIndicatorsStepResultResponse"]["properties"]
    assert step9["indicators"]["items"]["$ref"].endswith("/IndicatorCheckResponse")
    assert step9["artifacts"]["items"]["$ref"].endswith("/ArtifactItemResponse")


def test_get_session_response_uses_session_summary_response() -> None:
    schema = client().get("/openapi.json").json()
    response_schema = (
        schema["paths"]["/api/v1/sessions/{session_id}"]["get"]["responses"]["200"]["content"]["application/json"]["schema"]
    )
    assert _ref_name(response_schema) == "SessionSummaryResponse"
