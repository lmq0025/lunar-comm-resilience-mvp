from api_round1_helpers import client


def test_api_health() -> None:
    response = client().get("/api/v1/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"
