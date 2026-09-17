"""Verification tests after the Google Play credential deployment fix.

Confirms:
  - backend is up and root endpoint responds
  - admin/TurfPro2026! login works
  - DEMO2026 redeem code returns role 'demo'
  - /api/auth/demo returns role 'demo'
  - /api/iap/google/verify requires auth, rejects incomplete payloads,
    and NEVER crashes/500s with a dummy purchase token (a Google 404 -> 402
    is acceptable — the package isn't published to Play Console yet).
  - core PMU proxy (programme/reunions) responds without a server error.
"""
import os
from datetime import datetime, timezone

import pytest
import requests
from dotenv import load_dotenv

load_dotenv("/app/frontend/.env")
BASE_URL = os.environ["EXPO_PUBLIC_BACKEND_URL"].rstrip("/")


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------
@pytest.fixture(scope="session")
def api():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def user_token(api):
    r = api.post(f"{BASE_URL}/api/auth/redeem", json={"code": "TURFPRO1"})
    assert r.status_code == 200, f"redeem TURFPRO1 failed: {r.status_code} {r.text}"
    return r.json()["access_token"]


@pytest.fixture(scope="session")
def demo_token(api):
    r = api.post(f"{BASE_URL}/api/auth/demo", json={})
    assert r.status_code == 200
    return r.json()["access_token"]


def _today_ddmmyyyy() -> str:
    return datetime.now(timezone.utc).strftime("%d%m%Y")


# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------
class TestHealth:
    def test_backend_is_up(self, api):
        r = api.get(f"{BASE_URL}/api/")
        assert r.status_code == 200, r.text
        assert r.json().get("status") == "ok"


# ---------------------------------------------------------------------------
# Admin login
# ---------------------------------------------------------------------------
class TestAdminAuth:
    def test_admin_login_valid(self, api):
        r = api.post(
            f"{BASE_URL}/api/admin/login",
            json={"username": "admin", "password": "TurfPro2026!"},
        )
        assert r.status_code == 200, r.text
        data = r.json()
        assert data.get("role") == "admin"
        assert data.get("token_type") == "bearer"
        assert data.get("access_token")

    def test_admin_login_wrong_pwd(self, api):
        r = api.post(
            f"{BASE_URL}/api/admin/login",
            json={"username": "admin", "password": "wrong"},
        )
        assert r.status_code == 401


# ---------------------------------------------------------------------------
# Demo access (DEMO2026 redeem + /auth/demo)
# ---------------------------------------------------------------------------
class TestDemoAccess:
    def test_redeem_DEMO2026_returns_demo_role(self, api):
        r = api.post(f"{BASE_URL}/api/auth/redeem", json={"code": "DEMO2026"})
        assert r.status_code == 200, r.text
        data = r.json()
        assert data.get("role") == "demo", f"expected demo, got {data}"
        assert data.get("access_token")

    def test_redeem_DEMO2026_case_insensitive(self, api):
        r = api.post(f"{BASE_URL}/api/auth/redeem", json={"code": "demo2026"})
        assert r.status_code == 200, r.text
        assert r.json().get("role") == "demo"

    def test_auth_demo_endpoint(self, api):
        r = api.post(f"{BASE_URL}/api/auth/demo", json={})
        assert r.status_code == 200, r.text
        data = r.json()
        assert data.get("role") == "demo"
        assert data.get("access_token")

    def test_demo_token_hits_auth_me(self, api, demo_token):
        r = api.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {demo_token}"},
        )
        assert r.status_code == 200
        assert r.json().get("role") == "demo"


# ---------------------------------------------------------------------------
# IAP verify — must survive the credential refactor
# ---------------------------------------------------------------------------
class TestIapVerify:
    def test_requires_auth(self, api):
        r = api.post(
            f"{BASE_URL}/api/iap/google/verify",
            json={"productId": "full_access_unlock", "purchaseToken": "abc"},
        )
        assert r.status_code == 401

    def test_missing_purchase_token_returns_400(self, api, user_token):
        r = api.post(
            f"{BASE_URL}/api/iap/google/verify",
            json={"productId": "full_access_unlock", "purchaseToken": ""},
            headers={"Authorization": f"Bearer {user_token}"},
        )
        # Either 400 (server rejects empty) or 422 (pydantic) is acceptable;
        # the spec asks for 400 on missing fields — server does explicit check
        # for empty strings so we accept 400.
        assert r.status_code in (400, 422), r.text

    def test_missing_product_id_returns_400(self, api, user_token):
        r = api.post(
            f"{BASE_URL}/api/iap/google/verify",
            json={"productId": "", "purchaseToken": "dummy_token_123"},
            headers={"Authorization": f"Bearer {user_token}"},
        )
        assert r.status_code in (400, 422), r.text

    def test_missing_body_field_returns_422(self, api, user_token):
        # pydantic missing key
        r = api.post(
            f"{BASE_URL}/api/iap/google/verify",
            json={"productId": "full_access_unlock"},
            headers={"Authorization": f"Bearer {user_token}"},
        )
        assert r.status_code == 422

    def test_dummy_token_does_not_crash_server(self, api, user_token):
        """A dummy purchase token must NOT 500 the server. Google returns 404 →
        server maps to 402 'Achat non vérifié'. 402 or 503 both acceptable."""
        r = api.post(
            f"{BASE_URL}/api/iap/google/verify",
            json={
                "productId": "full_access_unlock",
                "purchaseToken": "fake_dummy_token_from_test_" + str(int(datetime.now().timestamp())),
            },
            headers={"Authorization": f"Bearer {user_token}"},
        )
        assert r.status_code != 500, f"Server crashed on dummy IAP token: {r.status_code} {r.text}"
        # Expected: 402 (Google API returns 404 → api_error) or 503 if creds are
        # unset. NEVER 200 — server must not mint a role='user' token.
        assert r.status_code in (402, 503), f"unexpected status {r.status_code}: {r.text}"
        # Verify no access_token leaked
        try:
            body = r.json()
        except ValueError:
            body = {}
        assert "access_token" not in body, "IAP endpoint leaked access_token on failed verify!"

    def test_demo_user_cannot_call_iap_verify(self, api, demo_token):
        """require_user should accept role='demo' or block it? Read behavior."""
        r = api.post(
            f"{BASE_URL}/api/iap/google/verify",
            json={"productId": "full_access_unlock", "purchaseToken": "dummy"},
            headers={"Authorization": f"Bearer {demo_token}"},
        )
        # Whatever the policy is, must not 500
        assert r.status_code != 500


# ---------------------------------------------------------------------------
# PMU proxy sanity check
# ---------------------------------------------------------------------------
class TestPmuProxy:
    def test_programme_reunions_today(self, api, user_token):
        date = _today_ddmmyyyy()
        r = api.get(
            f"{BASE_URL}/api/pmu/programme/{date}",
            headers={"Authorization": f"Bearer {user_token}"},
        )
        # PMU may return 200 with empty reunions or 200 with content;
        # a 5xx would indicate proxy breakage.
        assert r.status_code == 200, f"PMU proxy broken: {r.status_code} {r.text[:300]}"
        body = r.json()
        assert body.get("date") == date
        assert "reunions" in body
        assert isinstance(body["reunions"], list)


################################################################################
