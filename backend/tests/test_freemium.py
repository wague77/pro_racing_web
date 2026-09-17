"""Backend tests for the Demo + Paid Full Access freemium model.

Covers:
- POST /api/auth/demo -> role 'demo' token
- GET /api/pmu/programme, /api/pmu/course/../participants accept demo (200)
- Premium endpoints (pronostic, cotes-analysis, performance) BLOCK demo -> 403
- GET /api/auth/validate with demo token -> {valid: true}
- POST /api/iap/google/verify with demo token -> role 'user' + unlocks premium
- POST /api/auth/redeem TURFPRO1 -> role 'user' + unlocks premium
- Admin regression (login unaffected)
"""
import os
from datetime import datetime, timezone, timedelta

import pytest
import requests
from dotenv import load_dotenv

load_dotenv("/app/frontend/.env")
BASE_URL = os.environ["EXPO_PUBLIC_BACKEND_URL"].rstrip("/")


@pytest.fixture(scope="session")
def api():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def demo_token(api):
    r = api.post(f"{BASE_URL}/api/auth/demo")
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["role"] == "demo"
    assert d["token_type"] == "bearer"
    assert d["access_token"]
    return d["access_token"]


@pytest.fixture(scope="session")
def user_token(api):
    r = api.post(f"{BASE_URL}/api/auth/redeem", json={"code": "TURFPRO1"})
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


@pytest.fixture(scope="session")
def admin_token(api):
    r = api.post(
        f"{BASE_URL}/api/admin/login",
        json={"username": "admin", "password": "TurfPro2026!"},
    )
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


def _find_active(api, token):
    now = datetime.now(timezone.utc)
    for delta in (0, -1, 1, -2):
        date = (now + timedelta(days=delta)).strftime("%d%m%Y")
        r = api.get(
            f"{BASE_URL}/api/pmu/programme/{date}",
            headers={"Authorization": f"Bearer {token}"},
        )
        if r.status_code != 200:
            continue
        for reu in r.json().get("reunions", []):
            rn = reu.get("numOfficiel") or reu.get("numExterne")
            for c in reu.get("courses", []):
                cn = c.get("numExterne") or c.get("numOrdre")
                if rn and cn:
                    return date, rn, cn
    return None


# ---------------------------------------------------------------------------
# Demo login
# ---------------------------------------------------------------------------
class TestDemoLogin:
    def test_demo_login_no_body(self, api):
        r = api.post(f"{BASE_URL}/api/auth/demo")
        assert r.status_code == 200
        d = r.json()
        assert d["role"] == "demo"
        assert d["token_type"] == "bearer"
        assert isinstance(d["access_token"], str) and len(d["access_token"]) > 10

    def test_demo_me(self, api, demo_token):
        r = api.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {demo_token}"},
        )
        assert r.status_code == 200
        assert r.json()["role"] == "demo"

    def test_demo_validate_stays_valid(self, api, demo_token):
        r = api.get(
            f"{BASE_URL}/api/auth/validate",
            headers={"Authorization": f"Bearer {demo_token}"},
        )
        assert r.status_code == 200
        assert r.json() == {"valid": True}

    def test_demo_validate_with_device_id_stays_valid(self, api, demo_token):
        r = api.get(
            f"{BASE_URL}/api/auth/validate?device_id=TEST_demo_device_xyz",
            headers={"Authorization": f"Bearer {demo_token}"},
        )
        assert r.status_code == 200
        assert r.json()["valid"] is True


# ---------------------------------------------------------------------------
# Demo allowed on public / non-premium PMU endpoints
# ---------------------------------------------------------------------------
class TestDemoAllowed:
    def test_demo_can_get_programme(self, api, demo_token):
        date = datetime.now(timezone.utc).strftime("%d%m%Y")
        r = api.get(
            f"{BASE_URL}/api/pmu/programme/{date}",
            headers={"Authorization": f"Bearer {demo_token}"},
        )
        assert r.status_code == 200
        body = r.json()
        assert body["date"] == date
        assert isinstance(body["reunions"], list)

    def test_demo_can_get_participants(self, api, demo_token):
        found = _find_active(api, demo_token)
        if not found:
            pytest.skip("No PMU data available")
        date, r_num, c_num = found
        r = api.get(
            f"{BASE_URL}/api/pmu/course/{date}/{r_num}/{c_num}/participants",
            headers={"Authorization": f"Bearer {demo_token}"},
        )
        assert r.status_code == 200
        assert isinstance(r.json().get("participants"), list)


# ---------------------------------------------------------------------------
# Demo BLOCKED on premium endpoints (403 via require_full)
# ---------------------------------------------------------------------------
class TestDemoBlocked:
    def test_demo_blocked_on_pronostic(self, api, demo_token):
        date = datetime.now(timezone.utc).strftime("%d%m%Y")
        r = api.get(
            f"{BASE_URL}/api/pmu/pronostic/{date}/1/1",
            headers={"Authorization": f"Bearer {demo_token}"},
        )
        assert r.status_code == 403, f"expected 403, got {r.status_code}: {r.text}"
        assert "complet" in r.json().get("detail", "").lower()

    def test_demo_blocked_on_cotes_analysis(self, api, demo_token):
        date = datetime.now(timezone.utc).strftime("%d%m%Y")
        r = api.get(
            f"{BASE_URL}/api/pmu/cotes-analysis/{date}/1/1",
            headers={"Authorization": f"Bearer {demo_token}"},
        )
        assert r.status_code == 403

    def test_demo_blocked_on_performance(self, api, demo_token):
        r = api.get(
            f"{BASE_URL}/api/performance",
            headers={"Authorization": f"Bearer {demo_token}"},
        )
        assert r.status_code == 403


# ---------------------------------------------------------------------------
# IAP verify unlocks full access
# ---------------------------------------------------------------------------
class TestIapVerify:
    def test_iap_verify_requires_token(self, api):
        r = api.post(
            f"{BASE_URL}/api/iap/google/verify",
            json={"productId": "full_access_unlock", "purchaseToken": "TEST_x"},
        )
        assert r.status_code == 401

    def test_iap_verify_missing_token_body(self, api, demo_token):
        r = api.post(
            f"{BASE_URL}/api/iap/google/verify",
            json={"productId": "full_access_unlock", "purchaseToken": ""},
            headers={"Authorization": f"Bearer {demo_token}"},
        )
        assert r.status_code == 400

    def test_iap_verify_upgrades_demo_to_user(self, api, demo_token):
        purchase_token = f"TEST_iap_{datetime.now(timezone.utc).timestamp()}"
        r = api.post(
            f"{BASE_URL}/api/iap/google/verify",
            json={
                "productId": "full_access_unlock",
                "purchaseToken": purchase_token,
                "packageName": "com.turfpro.wague",
            },
            headers={"Authorization": f"Bearer {demo_token}"},
        )
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["role"] == "user"
        assert d["token_type"] == "bearer"
        full_token = d["access_token"]

        # New token should allow premium routes
        date = datetime.now(timezone.utc).strftime("%d%m%Y")
        r2 = api.get(
            f"{BASE_URL}/api/pmu/pronostic/{date}/1/1",
            headers={"Authorization": f"Bearer {full_token}"},
        )
        # 200 (data ok) or 502 (PMU upstream throttle) is acceptable — must NOT be 403
        assert r2.status_code != 403
        assert r2.status_code in (200, 502)

        # /auth/validate must accept the IAP token (code == "IAP")
        r3 = api.get(
            f"{BASE_URL}/api/auth/validate",
            headers={"Authorization": f"Bearer {full_token}"},
        )
        assert r3.status_code == 200
        assert r3.json() == {"valid": True}


# ---------------------------------------------------------------------------
# Access-code path still works
# ---------------------------------------------------------------------------
class TestCodeUnlock:
    def test_redeem_turfpro1_grants_full_access(self, api, user_token):
        date = datetime.now(timezone.utc).strftime("%d%m%Y")
        r = api.get(
            f"{BASE_URL}/api/pmu/pronostic/{date}/1/1",
            headers={"Authorization": f"Bearer {user_token}"},
        )
        assert r.status_code != 403
        assert r.status_code in (200, 502)

    def test_user_token_validate(self, api, user_token):
        r = api.get(
            f"{BASE_URL}/api/auth/validate",
            headers={"Authorization": f"Bearer {user_token}"},
        )
        assert r.status_code == 200
        assert r.json()["valid"] is True


# ---------------------------------------------------------------------------
# Admin regression
# ---------------------------------------------------------------------------
class TestAdminRegression:
    def test_admin_login_still_works(self, api):
        r = api.post(
            f"{BASE_URL}/api/admin/login",
            json={"username": "admin", "password": "TurfPro2026!"},
        )
        assert r.status_code == 200
        assert r.json()["role"] == "admin"

    def test_admin_can_list_codes(self, api, admin_token):
        r = api.get(
            f"{BASE_URL}/api/admin/access-codes",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_admin_perf_config_reachable(self, api, admin_token):
        r = api.get(
            f"{BASE_URL}/api/admin/perf-config",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert r.status_code == 200
        assert isinstance(r.json().get("days"), int)


################################################################################
