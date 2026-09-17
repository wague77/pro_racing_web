"""TurfPro backend API tests.

Uses the public EXPO_PUBLIC_BACKEND_URL for end-to-end verification through
the ingress. All endpoints must be prefixed with /api.
"""
import os
from datetime import datetime, timezone

import pytest
import requests
from dotenv import load_dotenv

# Load frontend/.env to get EXPO_PUBLIC_BACKEND_URL
load_dotenv("/app/frontend/.env")

BASE_URL = os.environ["EXPO_PUBLIC_BACKEND_URL"].rstrip("/")


# ---------------------------------------------------------------------------
# Shared fixtures / helpers
# ---------------------------------------------------------------------------
@pytest.fixture(scope="session")
def api():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def user_token(api):
    r = api.post(f"{BASE_URL}/api/auth/redeem", json={"code": "TURFPRO1"})
    assert r.status_code == 200, f"redeem failed: {r.status_code} {r.text}"
    data = r.json()
    assert data.get("role") == "user"
    assert data.get("access_token")
    return data["access_token"]


@pytest.fixture(scope="session")
def admin_token(api):
    r = api.post(
        f"{BASE_URL}/api/admin/login",
        json={"username": "admin", "password": "TurfPro2026!"},
    )
    assert r.status_code == 200, f"admin login failed: {r.status_code} {r.text}"
    data = r.json()
    assert data.get("role") == "admin"
    return data["access_token"]


def _today_ddmmyyyy() -> str:
    return datetime.now(timezone.utc).strftime("%d%m%Y")


# ---------------------------------------------------------------------------
# Health / root
# ---------------------------------------------------------------------------
class TestHealth:
    def test_root(self, api):
        r = api.get(f"{BASE_URL}/api/")
        assert r.status_code == 200
        body = r.json()
        assert body.get("status") == "ok"


# ---------------------------------------------------------------------------
# Auth flows
# ---------------------------------------------------------------------------
class TestAuth:
    def test_redeem_valid(self, api):
        r = api.post(f"{BASE_URL}/api/auth/redeem", json={"code": "TURFPRO1"})
        assert r.status_code == 200
        d = r.json()
        assert d["role"] == "user"
        assert d["token_type"] == "bearer"
        assert d["access_token"]

    def test_redeem_case_insensitive(self, api):
        r = api.post(f"{BASE_URL}/api/auth/redeem", json={"code": "turfpro1"})
        assert r.status_code == 200
        assert r.json()["role"] == "user"

    def test_redeem_invalid(self, api):
        r = api.post(f"{BASE_URL}/api/auth/redeem", json={"code": "NOPE_XYZ_123"})
        assert r.status_code == 400
        assert "invalide" in r.json()["detail"].lower()

    def test_admin_login_valid(self, api):
        r = api.post(
            f"{BASE_URL}/api/admin/login",
            json={"username": "admin", "password": "TurfPro2026!"},
        )
        assert r.status_code == 200
        assert r.json()["role"] == "admin"

    def test_admin_login_invalid(self, api):
        r = api.post(
            f"{BASE_URL}/api/admin/login",
            json={"username": "admin", "password": "wrong"},
        )
        assert r.status_code == 401

    def test_me_requires_token(self, api):
        r = api.get(f"{BASE_URL}/api/auth/me")
        assert r.status_code == 401

    def test_me_with_token(self, api, user_token):
        r = api.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {user_token}"},
        )
        assert r.status_code == 200
        assert r.json()["role"] == "user"


# ---------------------------------------------------------------------------
# Protected route guard
# ---------------------------------------------------------------------------
class TestProtected:
    def test_programme_no_token_returns_401(self, api):
        r = api.get(f"{BASE_URL}/api/pmu/programme/{_today_ddmmyyyy()}")
        assert r.status_code == 401

    def test_participants_no_token_returns_401(self, api):
        r = api.get(f"{BASE_URL}/api/pmu/course/{_today_ddmmyyyy()}/1/1/participants")
        assert r.status_code == 401

    def test_pronostic_no_token_returns_401(self, api):
        r = api.get(f"{BASE_URL}/api/pmu/pronostic/{_today_ddmmyyyy()}/1/1")
        assert r.status_code == 401

    def test_admin_route_requires_admin_role(self, api, user_token):
        r = api.get(
            f"{BASE_URL}/api/admin/access-codes",
            headers={"Authorization": f"Bearer {user_token}"},
        )
        assert r.status_code == 403


# ---------------------------------------------------------------------------
# PMU proxy endpoints - use today's date; if no data, try yesterday
# ---------------------------------------------------------------------------
def _find_active_reunion(api, token):
    """Return (date, reunion, course) with participants, or None."""
    from datetime import timedelta

    now = datetime.now(timezone.utc)
    for delta in (0, -1, 1, -2):
        date = (now + timedelta(days=delta)).strftime("%d%m%Y")
        r = api.get(
            f"{BASE_URL}/api/pmu/programme/{date}",
            headers={"Authorization": f"Bearer {token}"},
        )
        if r.status_code != 200:
            continue
        reunions = r.json().get("reunions", [])
        for reu in reunions:
            r_num = reu.get("numOfficiel") or reu.get("numExterne")
            for c in reu.get("courses", []):
                c_num = c.get("numExterne") or c.get("numOrdre")
                if r_num and c_num:
                    return date, r_num, c_num
    return None


class TestPMU:
    def test_programme_today(self, api, user_token):
        date = _today_ddmmyyyy()
        r = api.get(
            f"{BASE_URL}/api/pmu/programme/{date}",
            headers={"Authorization": f"Bearer {user_token}"},
        )
        assert r.status_code == 200
        body = r.json()
        assert body["date"] == date
        assert isinstance(body["reunions"], list)

    def test_programme_returns_reunions_with_courses(self, api, user_token):
        found = _find_active_reunion(api, user_token)
        assert found is not None, "No PMU reunion with courses found in +/- 2 days"
        date, r_num, c_num = found
        r = api.get(
            f"{BASE_URL}/api/pmu/programme/{date}",
            headers={"Authorization": f"Bearer {user_token}"},
        )
        reunions = r.json()["reunions"]
        assert len(reunions) > 0
        assert any(len(reu["courses"]) > 0 for reu in reunions)
        first = reunions[0]
        assert "hippodrome" in first
        assert "libelleCourt" in first["hippodrome"]

    def test_participants_endpoint(self, api, user_token):
        found = _find_active_reunion(api, user_token)
        if not found:
            pytest.skip("No PMU data available")
        date, r_num, c_num = found
        r = api.get(
            f"{BASE_URL}/api/pmu/course/{date}/{r_num}/{c_num}/participants",
            headers={"Authorization": f"Bearer {user_token}"},
        )
        assert r.status_code == 200
        parts = r.json()["participants"]
        assert isinstance(parts, list)
        if parts:
            p = parts[0]
            # Fields the frontend depends on
            for k in ("numPmu", "nom", "musique", "nombreCourses",
                       "nombreVictoires", "gainsCarriere"):
                assert k in p, f"Missing field {k} in participant"

    def test_pronostic_endpoint(self, api, user_token):
        found = _find_active_reunion(api, user_token)
        if not found:
            pytest.skip("No PMU data available")
        date, r_num, c_num = found
        r = api.get(
            f"{BASE_URL}/api/pmu/pronostic/{date}/{r_num}/{c_num}",
            headers={"Authorization": f"Bearer {user_token}"},
        )
        assert r.status_code == 200
        body = r.json()
        assert "selection" in body
        selection = body["selection"]
        assert isinstance(selection, list)
        assert len(selection) <= 8
        if selection:
            top = selection[0]
            for k in ("numPmu", "nom", "score", "rank", "confidence",
                       "reasoning", "breakdown"):
                assert k in top, f"Missing pronostic field {k}"
            assert top["rank"] == 1
            # scores must be sorted desc
            scores = [s["score"] for s in selection]
            assert scores == sorted(scores, reverse=True)


# ---------------------------------------------------------------------------
# Admin access-code management
# ---------------------------------------------------------------------------
class TestAdminCodes:
    _created_id = None
    _created_code = None

    def test_create_code_requires_admin(self, api):
        r = api.post(f"{BASE_URL}/api/admin/access-codes", json={"label": "TEST"})
        assert r.status_code == 401

    def test_create_and_list_and_toggle(self, api, admin_token):
        h = {"Authorization": f"Bearer {admin_token}"}

        # Create
        r = api.post(
            f"{BASE_URL}/api/admin/access-codes",
            json={"label": "TEST_pytest", "max_uses": 5},
            headers=h,
        )
        assert r.status_code == 200, r.text
        created = r.json()
        assert created["active"] is True
        assert created["usage_count"] == 0
        assert created["max_uses"] == 5
        assert created["label"] == "TEST_pytest"
        code_id = created["id"]
        code_value = created["code"]
        assert len(code_value) == 8
        TestAdminCodes._created_id = code_id
        TestAdminCodes._created_code = code_value

        # List and find it
        r = api.get(f"{BASE_URL}/api/admin/access-codes", headers=h)
        assert r.status_code == 200
        codes = r.json()
        assert isinstance(codes, list)
        assert any(c["id"] == code_id for c in codes)

        # Redeem the newly created code (public)
        r = api.post(f"{BASE_URL}/api/auth/redeem", json={"code": code_value})
        assert r.status_code == 200
        assert r.json()["role"] == "user"

        # Revoke
        r = api.post(
            f"{BASE_URL}/api/admin/access-codes/{code_id}/revoke", headers=h
        )
        assert r.status_code == 200
        assert r.json()["active"] is False

        # Redeem revoked -> 400
        r = api.post(f"{BASE_URL}/api/auth/redeem", json={"code": code_value})
        assert r.status_code == 400
        assert "désactivé" in r.json()["detail"].lower() or "desactive" in r.json()["detail"].lower()

        # Activate again
        r = api.post(
            f"{BASE_URL}/api/admin/access-codes/{code_id}/activate", headers=h
        )
        assert r.status_code == 200
        assert r.json()["active"] is True

        # Redeem should now succeed
        r = api.post(f"{BASE_URL}/api/auth/redeem", json={"code": code_value})
        assert r.status_code == 200

    def test_revoke_missing_returns_404(self, api, admin_token):
        h = {"Authorization": f"Bearer {admin_token}"}
        # Valid ObjectId format but unlikely to exist
        r = api.post(
            f"{BASE_URL}/api/admin/access-codes/000000000000000000000000/revoke",
            headers=h,
        )
        assert r.status_code == 404


################################################################################
