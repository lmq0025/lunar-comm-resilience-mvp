import json

from api_round1_helpers import STEP_ENDPOINTS, client, create_session


def test_api_step_responses_are_strict_json_without_nan_or_infinity() -> None:
    test_client = client()
    session_id = create_session(test_client)
    for step in STEP_ENDPOINTS:
        response = test_client.post(f"/api/v1/sessions/{session_id}/steps/{step}")
        assert response.status_code == 200, response.text
        assert "NaN" not in response.text
        assert "Infinity" not in response.text
        assert "-Infinity" not in response.text
        json.loads(response.text)
