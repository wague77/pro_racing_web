"""Backend tests for the sharing-detection feature and regression on admin dashboard."""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ["EXPO_PUBLIC_BACKEND_URL"].rstrip("/")

ADMIN_USER = "admin"
ADMIN_PASS = "TurfPro2026!"
DEMO_CODE = "TURFPRO1"


@pytest.fixture(scope="module")
def admin_token():
    r = requests.post(f"{BASE_URL}/api/admin/login",
                      json={"username": ADMIN_USER, "password": ADMIN_PASS}, timeout=15)
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


@pytest.fixture(scope="module")
def user_token():
    r = requests.post(f"{BASE_URL}/api/auth/redeem", json={"code": DEMO_CODE}, timeout=15)
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


def _auth(tok):
    return {"Authorization": f"Bearer {tok}"}


# --------- share-config ---------
class TestShareConfig:
    def test_requires_admin(self):
        r = requests.get(f"{BASE_URL}/api/admin/share-config", timeout=15)
        assert r.status_code == 401

    def test_get_default(self, admin_token):
        r = requests.get(f"{BASE_URL}/api/admin/share-config",
                         headers=_auth(admin_token), timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert "threshold" in data
        assert 2 <= data["threshold"] <= 20

    def test_set_and_persist(self, admin_token):
        r = requests.post(f"{BASE_URL}/api/admin/share-config",
                          headers=_auth(admin_token), json={"threshold": 5}, timeout=15)
        assert r.status_code == 200
        assert r.json()["threshold"] == 5
        # GET to verify persistence
        r2 = requests.get(f"{BASE_URL}/api/admin/share-config",
                          headers=_auth(admin_token), timeout=15)
        assert r2.json()["threshold"] == 5

    def test_clamp_low(self, admin_token):
        r = requests.post(f"{BASE_URL}/api/admin/share-config",
                          headers=_auth(admin_token), json={"threshold": 1}, timeout=15)
        assert r.status_code == 200
        assert r.json()["threshold"] == 2

    def test_clamp_high(self, admin_token):
        r = requests.post(f"{BASE_URL}/api/admin/share-config",
                          headers=_auth(admin_token), json={"threshold": 999}, timeout=15)
        assert r.status_code == 200
        assert r.json()["threshold"] == 20

    def test_restore_default(self, admin_token):
        # Reset to a value that won't trigger noise for other tests
        requests.post(f"{BASE_URL}/api/admin/share-config",
                      headers=_auth(admin_token), json={"threshold": 3}, timeout=15)


# --------- sharing-alerts ---------
class TestSharingAlerts:
    def test_requires_admin(self):
        r = requests.get(f"{BASE_URL}/api/admin/sharing-alerts", timeout=15)
        assert r.status_code == 401

    def test_shape(self, admin_token):
        r = requests.get(f"{BASE_URL}/api/admin/sharing-alerts",
                         headers=_auth(admin_token), timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert "threshold" in data
        assert "alerts" in data and isinstance(data["alerts"], list)
        assert "count" in data
        assert data["count"] == len(data["alerts"])

    def test_alert_triggered_by_multi_devices(self, admin_token, user_token):
        # Register 3 fake devices tied to TURFPRO1
        device_ids = [f"TEST_share_{uuid.uuid4().hex[:8]}" for _ in range(3)]
        for i, did in enumerate(device_ids):
            r = requests.post(f"{BASE_URL}/api/devices/register",
                              headers=_auth(user_token),
                              json={"deviceId": did,
                                    "platform": "android" if i % 2 == 0 else "ios",
                                    "osName": "Android" if i % 2 == 0 else "iOS",
                                    "model": f"TESTDEV-{i}"},
                              timeout=15)
            assert r.status_code == 200, r.text

        # Set threshold=2 so alert must fire
        requests.post(f"{BASE_URL}/api/admin/share-config",
                      headers=_auth(admin_token), json={"threshold": 2}, timeout=15)

        r = requests.get(f"{BASE_URL}/api/admin/sharing-alerts",
                         headers=_auth(admin_token), timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert data["threshold"] == 2
        alert = next((a for a in data["alerts"] if a["code"] == DEMO_CODE), None)
        assert alert is not None, f"expected TURFPRO1 alert, got {data}"
        # Structural assertions per PRD
        for key in ("code", "total", "active", "blocked", "platforms", "codeId", "codeActive"):
            assert key in alert, f"missing key {key} in {alert}"
        assert alert["active"] >= 2
        assert alert["codeActive"] is True
        # Save for next test class
        pytest.shared_state = {"device_ids": device_ids}


# --------- block-devices ---------
class TestBlockDevices:
    def test_requires_admin(self):
        r = requests.post(f"{BASE_URL}/api/admin/codes/TURFPRO1/block-devices", timeout=15)
        assert r.status_code == 401

    def test_block_and_validate_401(self, admin_token, user_token):
        # Ensure at least one device is registered for this token
        did = f"TEST_blk_{uuid.uuid4().hex[:8]}"
        requests.post(f"{BASE_URL}/api/devices/register",
                      headers=_auth(user_token),
                      json={"deviceId": did, "platform": "web", "model": "TEST"},
                      timeout=15)

        # Validate before block => 200
        r_pre = requests.get(f"{BASE_URL}/api/auth/validate",
                             params={"device_id": did},
                             headers=_auth(user_token), timeout=15)
        assert r_pre.status_code == 200

        # Block all devices for the code
        r_block = requests.post(f"{BASE_URL}/api/admin/codes/{DEMO_CODE}/block-devices",
                                headers=_auth(admin_token), timeout=15)
        assert r_block.status_code == 200
        body = r_block.json()
        assert body["ok"] is True
        assert body["blocked"] >= 1

        # Validate after block => 401 for the same device
        r_post = requests.get(f"{BASE_URL}/api/auth/validate",
                              params={"device_id": did},
                              headers=_auth(user_token), timeout=15)
        assert r_post.status_code == 401

    def test_unblock_cleanup(self, admin_token):
        # Cleanup: unblock all test devices so subsequent runs stay clean
        r = requests.get(f"{BASE_URL}/api/admin/devices",
                         headers=_auth(admin_token), timeout=15)
        assert r.status_code == 200
        for d in r.json().get("devices", []):
            if str(d.get("deviceId", "")).startswith("TEST_"):
                requests.post(f"{BASE_URL}/api/admin/devices/{d['deviceId']}/unblock",
                              headers=_auth(admin_token), timeout=15)


# --------- Regression on other admin endpoints ---------
class TestAdminRegression:
    def test_list_devices(self, admin_token):
        r = requests.get(f"{BASE_URL}/api/admin/devices",
                         headers=_auth(admin_token), timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert "devices" in d and "count" in d and "android" in d and "ios" in d

    def test_perf_config(self, admin_token):
        r = requests.get(f"{BASE_URL}/api/admin/perf-config",
                         headers=_auth(admin_token), timeout=15)
        assert r.status_code == 200
        assert "days" in r.json()

    def test_list_codes(self, admin_token):
        r = requests.get(f"{BASE_URL}/api/admin/access-codes",
                         headers=_auth(admin_token), timeout=15)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_free_access_status(self):
        r = requests.get(f"{BASE_URL}/api/settings/free-access", timeout=15)
        assert r.status_code == 200
        assert "active" in r.json()


################################################################################
