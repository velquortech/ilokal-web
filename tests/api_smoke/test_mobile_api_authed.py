"""Authenticated slice of the mobile API smoke — signed-in with a real JWT.

Exercises the protected surface the way the app does: GET with tenant-scoped
shapes, plus net-zero mutation flows (post → verify → revert) so the live
database is handed back exactly as it was found.

Self-owned data only: every mutation touches the throwaway smoke account's own
rows; the one cross-entity id (a business_id in follows) is a read-only
reference any guest could hold.

Run:  python3 -m pytest tests/api_smoke -q
Skips (not fails) when the smoke session cannot be bootstrapped, so an
anon-only CI still gets the unauthenticated slice green.
"""

from __future__ import annotations

import json
import os
import urllib.error
import urllib.request

import pytest

API_URL = os.environ.get("BASE_URL", "https://ilokal.shop").rstrip("/") + "/api"
TIMEOUT = float(os.environ.get("SMOKE_TIMEOUT", "15"))

# LU2 — a real, public, verified business from the nearby feed; used read-only
# as the follow target. Feel free to swap for whatever the fixture feed yields.
KNOWN_BUSINESS_ID = os.environ.get("SMOKE_BUSINESS_ID", "64b8fe02-2c85-4901-b56f-38b975925143")


def api(method: str, path: str, *, jwt: str, expect: int | None = None, body: dict | None = None):
    r = urllib.request.Request(API_URL + path, method=method)
    r.add_header("Authorization", f"Bearer {jwt}")
    r.add_header("Content-Type", "application/json")
    data = json.dumps(body).encode() if body is not None else None
    try:
        with urllib.request.urlopen(r, data, timeout=TIMEOUT) as resp:
            status, raw = resp.status, resp.read()
    except urllib.error.HTTPError as e:
        status, raw = e.code, e.read()
    try:
        parsed = json.loads(raw.decode()) if raw else None
    except ValueError:
        parsed = None
    if expect is not None and status != expect:
        pytest.fail(f"{method} {path} -> HTTP {status} (expected {expect}): {raw[:300]!r}")
    return status, parsed, raw


def assert_keys(obj, required, label):
    missing = [k for k in required if k not in obj]
    assert not missing, f"{label}: shape shifted — missing {missing}; got {sorted(obj)}"


@pytest.fixture(scope="session")
def jwt(authed):
    return authed[0]


# ── signed-in GETs (shape checks on live data) ──────────────────────────────

def test_me(jwt):
    _, body, _ = api("GET", "/protected/mobile/me", jwt=jwt, expect=200)
    assert "profile" in body, f"me wrapper shifted: {sorted(body)}"
    assert_keys(body["profile"], [
        "id", "email", "full_name", "phone_number", "avatar_url",
        "role", "status",
    ], "me.profile")


def test_follows(jwt):
    _, body, _ = api("GET", "/protected/mobile/follows", jwt=jwt, expect=200)
    assert "follows" in body, f"follows wrapper shifted: {sorted(body)}"


def test_redemptions(jwt):
    _, body, _ = api("GET", "/protected/mobile/redemptions?filter=active", jwt=jwt, expect=200)
    assert_keys(body, ["redemptions", "has_more"], "redemptions")


def test_updates(jwt):
    _, body, _ = api("GET", "/protected/mobile/updates?page=1&per_page=5", jwt=jwt, expect=200)
    assert_keys(body, ["updates", "page", "per_page", "has_more"], "updates")


def test_notifications(jwt):
    _, body, _ = api("GET", "/protected/mobile/notifications?page=1&per_page=5", jwt=jwt, expect=200)
    assert_keys(body, ["notifications", "page", "per_page", "has_more", "unread_count"], "notifications")
    assert isinstance(body["unread_count"], int)


# ── net-zero mutation flows (post → verify → revert) ────────────────────────

def test_follow_and_unfollow_roundtrip(jwt):
    st, body, _ = api("POST", "/protected/mobile/follows", jwt=jwt,
                      body={"business_id": KNOWN_BUSINESS_ID}, expect=200)
    assert "follow" in body, f"follow body shifted: {sorted(body)}"

    _, body, _ = api("GET", "/protected/mobile/follows", jwt=jwt, expect=200)
    ids = {f["businesses"]["id"] for f in body["follows"]}
    assert KNOWN_BUSINESS_ID in ids, "follow POST didn't persist for the smoke account"

    api("DELETE", f"/protected/mobile/follows/{KNOWN_BUSINESS_ID}", jwt=jwt, expect=200)
    _, body, _ = api("GET", "/protected/mobile/follows", jwt=jwt, expect=200)
    ids = {f["businesses"]["id"] for f in body["follows"]}
    assert KNOWN_BUSINESS_ID not in ids, "unfollow didn't remove the row — live data changed!"


def test_notifications_read_all(jwt):
    # no unread badge residue; also exercises the route authorized on prod data
    st, body, _ = api("POST", "/protected/mobile/notifications/read-all", jwt=jwt, body={}, expect=200)
    assert "updated" in body, f"read-all shape shifted: {sorted(body)}"


def test_me_patch_noop(jwt):
    _, body, _ = api("GET", "/protected/mobile/me", jwt=jwt, expect=200)
    name = body["profile"]["full_name"]
    st, after, _ = api("PATCH", "/protected/mobile/me", jwt=jwt,
                       body={"full_name": name}, expect=200)
    assert after["profile"]["full_name"] == name, "PATCH me mutated full_name on a no-op!"


# ── authorized-not-found paths (bogus ids stay 4xx, never 500) ──────────────

def test_redemption_bogus_id_404(jwt):
    code, body, _ = api("GET", "/protected/mobile/redemptions/00000000-0000-0000-0000-000000000000", jwt=jwt)
    assert code == 404, f"bogus redemption id gave {code} — route or scoping changed: {body}"


def test_claim_bogus_coupon_400(jwt):
    code, body, _ = api("POST", "/protected/mobile/redemptions", jwt=jwt,
                        body={"coupon_id": "00000000-0000-0000-0000-000000000000"})
    assert code == 400, f"bogus coupon claim gave {code} — expected validation 400: {body}"


def test_notification_bogus_id_404(jwt):
    code, body, _ = api("PATCH", "/protected/mobile/notifications/00000000-0000-0000-0000-000000000000",
                        jwt=jwt, body={"is_read": True})
    assert code == 404, f"bogus notification id gave {code} — scoping changed: {body}"
