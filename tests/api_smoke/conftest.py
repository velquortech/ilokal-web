"""Session bootstrap for the authenticated slice of the mobile API smoke.

Creates a throwaway confirmed account on the live cloud Supabase project via
the service-role admin API, signs in with the password grant, and hands the
JWT to the pytest session. After the run the account is deleted again (admin
API), so the live project keeps no smoke residue.

Credentials + base URLs come from the environment so nothing secret is
committed:
  SMOKE_SUPABASE_URL       e.g. https://<ref>.supabase.co
  SMOKE_SUPABASE_ANON_KEY  publishable/anon key (password grant needs it)
  SMOKE_SERVICE_ROLE_KEY   admin API bootstrap; without it the authed slice
                           skips cleanly (the public tests still run)
  SMOKE_TEST_EMAIL / SMOKE_TEST_PASSWORD   override the throwaway identity
"""

from __future__ import annotations

import json
import os
import secrets
import urllib.error
import urllib.request

import pytest

SUPABASE_URL = os.environ.get("SMOKE_SUPABASE_URL", "https://skvgasimllpyhyudpycu.supabase.co").rstrip("/")
ANON_KEY = os.environ.get("SMOKE_SUPABASE_ANON_KEY", "sb_publishable_YAo-yu9IHTPYhenSX74xqw_fiiAzuRy")
SERVICE_KEY = os.environ.get("SMOKE_SERVICE_ROLE_KEY")  # not committed on purpose
TEST_EMAIL = os.environ.get("SMOKE_TEST_EMAIL", "smoke-probe@example.com")
# Random per run unless supplied: the lifecycle fixture creates the account with
# this password and deletes it afterwards, so a fixed default committed here
# would only ever be a sign-in credential for a leftover account.
TEST_PASSWORD = os.environ.get("SMOKE_TEST_PASSWORD") or secrets.token_urlsafe(24)


def _auth(method: str, path: str, *, bearer: str | None = None, body: dict | None = None, apikey: str | None = None):
    r = urllib.request.Request(SUPABASE_URL + path, method=method)
    r.add_header("apikey", apikey or ANON_KEY)
    r.add_header("Content-Type", "application/json")
    if bearer:
        r.add_header("Authorization", f"Bearer {bearer}")
    data = json.dumps(body).encode() if body is not None else None
    try:
        with urllib.request.urlopen(r, data, timeout=20) as resp:
            return resp.status, json.loads(resp.read().decode() or "{}")
    except urllib.error.HTTPError as e:
        try:
            return e.code, json.loads(e.read().decode() or "{}")
        except ValueError:
            return e.code, {}


@pytest.fixture(scope="session")
def authed():
    """(jwt, user_id) for the smoke account; skips cleanly if bootstrap fails."""
    status, tok = _auth("POST", "/auth/v1/token?grant_type=password",
                        body={"email": TEST_EMAIL, "password": TEST_PASSWORD})
    if status != 200 or not tok.get("access_token"):
        pytest.skip(f"cannot sign in the smoke account ({status}) — set SMOKE_TEST_EMAIL/PASSWORD")
    user = tok.get("user") or {}
    jwt = tok["access_token"]
    yield jwt, user.get("id")


@pytest.fixture(scope="session", autouse=True)
def _smoke_user_lifecycle():
    """Create the throwaway user up-front; delete it after the whole run.

    Needs the service-role key. Without it the authed slice is skipped
    entirely (the unauthenticated smoke still runs).
    """
    created = False
    if SERVICE_KEY and TEST_EMAIL.endswith("@example.com"):  # guard: only ever delete throwaways
        # Clear any stale rows with the smoke email first — the project history
        # shows repeated leftovers whose passwords can never be re-signed-in.
        _purge_smoke_user()
        # The admin create-user API is keyed under the service role, not the
        # anon key — pass SERVICE_KEY as the apikey (bearer alone is not enough).
        st, body = _auth(
            "POST",
            "/auth/v1/admin/users",
            bearer=SERVICE_KEY,
            apikey=SERVICE_KEY,
            body={"email": TEST_EMAIL, "password": TEST_PASSWORD, "email_confirm": True},
        )
        created = st == 200
        if not created:
            print(f"[smoke-lifecycle] user create gave HTTP {st}; authed tests will skip.")
    yield
    if SERVICE_KEY and created and TEST_EMAIL.endswith("@example.com"):
        _purge_smoke_user()


def _purge_smoke_user():
    """Delete every throwaway smoke account."""
    # The admin LIST endpoint does not honour ?email= (verified live: it returns
    # the unfiltered page), so resolve the id from the full user list instead.
    # Its admin auth also needs SERVICE_KEY as the apikey, mirroring the create path.
    r = _auth("GET", "/auth/v1/admin/users?per_page=50", bearer=SERVICE_KEY, apikey=SERVICE_KEY)
    users = r[1].get("users") if isinstance(r[1], dict) else r[1]
    ids = [u["id"] for u in (users or []) if u.get("email") == TEST_EMAIL]
    if not ids:
        print(f"[smoke-lifecycle] WARN: no auth rows found for {TEST_EMAIL} — nothing to delete.")
        return
    for uid in ids:
        _auth("DELETE", f"/auth/v1/admin/users/{uid}", bearer=SERVICE_KEY, apikey=SERVICE_KEY)
