from fastapi.testclient import TestClient

from plumbline_api.main import app


def test_health_reports_ok_and_version() -> None:
    client = TestClient(app)
    response = client.get("/v1/health")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert body["version"]


def test_cors_allows_the_vite_dev_origin() -> None:
    client = TestClient(app)
    response = client.options(
        "/v1/health",
        headers={"Origin": "http://localhost:5173", "Access-Control-Request-Method": "GET"},
    )
    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://localhost:5173"
