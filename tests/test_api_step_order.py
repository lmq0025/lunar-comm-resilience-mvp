from api_round1_helpers import client, create_session


def test_api_rejects_out_of_order_step() -> None:
    test_client = client()
    session_id = create_session(test_client)
    response = test_client.post(f"/api/v1/sessions/{session_id}/steps/inject-faults")
    assert response.status_code == 409
    error = response.json()["error"]
    assert error["code"] == "INVALID_STEP_ORDER"
    assert error["current_step"] == "created"
    assert error["required_step"] == "nominal_simulated"
