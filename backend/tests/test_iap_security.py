"""Security & regression tests for TurfPro backend.

Focus: POST /api/iap/google/verify must NOT trust the client.
With GOOGLE_PLAY_SERVICE_ACCOUNT_JSON empty, all verify attempts must
return 503 and NEVER issue a role='user' JWT.
"""
import os
import jwt as pyjwt
import pytest
import requests

BASE_URL = "https://pmu-predictor-8.preview.emergentagent.com"
API = f"{BASE_URL}/api"


@pytest.fixture(scope="module")
def api():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def demo_token(api):
    r = api.post(f"{API}/auth/demo")
    assert r.status_code == 200, r.text
    body = r.json()
    assert body.get("role") == "demo"
    return body["access_token"]


@pytest.fixture(scope="module")
def full_token(api):
    r = api.post(f"{API}/auth/redeem", json={"code": "TURFPRO1"})
    assert r.status_code == 200, r.text
    body = r.json()
    assert body.get("role") == "user"
    return body["access_token"]


@pytest.fixture(scope="module")
def admin_token(api):
    r = api.post(f"{API}/admin/login", json={"username": "admin", "password": "TurfPro2026!"})
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


def _decode(token: str) -> dict:
    return pyjwt.decode(token, options={"verify_signature": False})


# ---------------------------------------------------------------------------
# SECURITY — IAP verify
# ---------------------------------------------------------------------------
class TestIapSecurity:
    def test_verify_with_fake_token_returns_503_no_access(self, api, demo_token):
        """CRITICAL: fake purchaseToken must NOT return a user role token."""
        r = api.post(
            f"{API}/iap/google/verify",
            json={"productId": "full_access_unlock", "purchaseToken": "FAKE_CLIENT_TOKEN_ABC123"},
            headers={"Authorization": f"Bearer {demo_token}"},
        )
        assert r.status_code == 503, f"Expected 503, got {r.status_code}: {r.text}"
        body = r.json()
        assert body.get("detail") == "Vérification des achats indisponible (configuration serveur manquante)."
        # MUST NOT return access_token
        assert "access_token" not in body, "SECURITY BUG: access_token leaked in 503 response"
        assert body.get("role") != "user"

    def test_verify_with_full_user_token_still_503(self, api, full_token):
        """Even with a legit full-access session, fake token must still 503 (not silently upgrade)."""
        r = api.post(
            f"{API}/iap/google/verify",
            json={"productId": "full_access_unlock", "purchaseToken": "another_fake_xyz"},
            headers={"Authorization": f"Bearer {full_token}"},
        )
        assert r.status_code == 503
        assert "access_token" not in r.json()

    def test_verify_missing_purchase_token_400(self, api, demo_token):
        r = api.post(
            f"{API}/iap/google/verify",
            json={"productId": "full_access_unlock", "purchaseToken": ""},
            headers={"Authorization": f"Bearer {demo_token}"},
        )
        # Empty string triggers our 'Achat incomplet' branch (400)
        assert r.status_code == 400, r.text
        assert "Achat incomplet" in r.json().get("detail", "")

    def test_verify_missing_product_id_400(self, api, demo_token):
        r = api.post(
            f"{API}/iap/google/verify",
            json={"productId": "", "purchaseToken": "some_token"},
            headers={"Authorization": f"Bearer {demo_token}"},
        )
        assert r.status_code == 400, r.text
        assert "Achat incomplet" in r.json().get("detail", "")

    def test_verify_missing_purchase_token_field_422(self, api, demo_token):
        """Pydantic validation: missing field -> 422."""
        r = api.post(
            f"{API}/iap/google/verify",
            json={"productId": "full_access_unlock"},
            headers={"Authorization": f"Bearer {demo_token}"},
        )
        # Either 400 (custom) or 422 (pydantic) is acceptable; must NOT be 200.
        assert r.status_code in (400, 422), r.text

    def test_verify_no_auth_header_401(self, api):
        r = api.post(
            f"{API}/iap/google/verify",
            json={"productId": "full_access_unlock", "purchaseToken": "whatever"},
        )
        assert r.status_code == 401, r.text

    def test_no_user_role_token_ever_issued_by_iap(self, api, demo_token):
        """Repeat with several attacker-shaped payloads: never returns role='user'."""
        payloads = [
            {"productId": "full_access_unlock", "purchaseToken": "AAA"},
            {"productId": "full_access_unlock", "purchaseToken": "BBB", "packageName": "com.evil"},
            {"productId": "premium_lifetime", "purchaseToken": "CCC"},
        ]
        for p in payloads:
            r = api.post(f"{API}/iap/google/verify", json=p, headers={"Authorization": f"Bearer {demo_token}"})
            assert r.status_code != 200, f"BYPASS: {p} returned 200"
            body = r.json() if r.headers.get("content-type", "").startswith("application/json") else {}
            assert "access_token" not in body, f"BYPASS: access_token leaked for {p}"


# ---------------------------------------------------------------------------
# REGRESSION — demo
# ---------------------------------------------------------------------------
class TestDemoRegression:
    def test_demo_login_role(self, demo_token):
        payload = _decode(demo_token)
        assert payload.get("role") == "demo"

    def test_demo_programme_200(self, api, demo_token):
        # Any date; endpoint should reach PMU but at least accept auth (not 401/403)
        r = api.get(f"{API}/pmu/programme/01012026", headers={"Authorization": f"Bearer {demo_token}"})
        assert r.status_code == 200, f"demo programme not accessible: {r.status_code} {r.text[:200]}"

    def test_demo_pronostic_403(self, api, demo_token):
        r = api.get(
            f"{API}/pmu/pronostic/01012026/1/1",
            headers={"Authorization": f"Bearer {demo_token}"},
        )
        assert r.status_code == 403, r.text

    def test_demo_performance_403(self, api, demo_token):
        r = api.get(f"{API}/performance", headers={"Authorization": f"Bearer {demo_token}"})
        assert r.status_code == 403, r.text

    def test_demo_validate_true(self, api, demo_token):
        r = api.get(f"{API}/auth/validate", headers={"Authorization": f"Bearer {demo_token}"})
        assert r.status_code == 200, r.text
        assert r.json().get("valid") is True


# ---------------------------------------------------------------------------
# REGRESSION — redeem codes
# ---------------------------------------------------------------------------
class TestRedeemRegression:
    def test_demo_code_uppercase(self, api):
        r = api.post(f"{API}/auth/redeem", json={"code": "DEMO2026"})
        assert r.status_code == 200, r.text
        assert r.json().get("role") == "demo"

    def test_demo_code_lowercase(self, api):
        r = api.post(f"{API}/auth/redeem", json={"code": "demo2026"})
        assert r.status_code == 200, r.text
        assert r.json().get("role") == "demo"

    def test_full_code_role_user(self, full_token):
        payload = _decode(full_token)
        assert payload.get("role") == "user"

    def test_full_token_can_call_pronostic(self, api, full_token):
        r = api.get(
            f"{API}/pmu/pronostic/01012026/1/1",
            headers={"Authorization": f"Bearer {full_token}"},
        )
        # 200 or 404 (no race that day) both prove auth passed. 403 would be a bug.
        assert r.status_code != 403, f"Full-access token was refused: {r.text[:200]}"


# ---------------------------------------------------------------------------
# REGRESSION — admin
# ---------------------------------------------------------------------------
class TestAdminRegression:
    def test_admin_login(self, admin_token):
        payload = _decode(admin_token)
        assert payload.get("role") == "admin"

    def test_admin_list_codes(self, api, admin_token):
        r = api.get(f"{API}/admin/access-codes", headers={"Authorization": f"Bearer {admin_token}"})
        assert r.status_code == 200, r.text
        assert isinstance(r.json(), list)


################################################################################
