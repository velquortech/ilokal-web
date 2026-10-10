"""Mobile API contract smoke — pytest + urllib over the live `/api/mobile` surface.

Fails when a route the iLokal mobile app calls disappears (4xx-existence check)
or when a payload shape shifts (typed field checks on the record shapes).

Run:  python3 -m pytest tests/api_smoke -q                 (live: https://ilokal.shop)
      BASE_URL=http://localhost:3000 python3 -m pytest tests/api_smoke -q

Read-only by design: the only POSTs are view-count pings with an invalid
bearer, which the server rejects before writing (verified: 401, no row).

Evidence basis (verified live 2026-10-09): every public GET below returns 200;
protected GETs are 401-guarded without a token; the two view POSTs reject an
invalid token with 401 and reveal themselves as 405 to a plain GET.
"""

import json
import os
import urllib.error
import urllib.request

import pytest

BASE_URL = os.environ.get("BASE_URL", "https://ilokal.shop").rstrip("/") + "/api"
TIMEOUT = float(os.environ.get("SMOKE_TIMEOUT", "15"))


def request(method, path, expect=None, headers=None, body=None):
    """issue the call, return (status, parsed-json-or-None, raw-body)."""
    url = f"{BASE_URL}{path}"
    req = urllib.request.Request(url, method=method)
    for k, v in (headers or {}).items():
        req.add_header(k, v)
    data = None
    if body is not None:
        data = json.dumps(body).encode()
        req.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(req, data=data, timeout=TIMEOUT) as resp:
            status, raw = resp.status, resp.read()
    except urllib.error.HTTPError as e:
        status, raw = e.code, e.read()
    parsed = None
    if raw:
        try:
            parsed = json.loads(raw.decode())
        except ValueError:
            pass
    if expect is not None and status != expect:
        pytest.fail(f"{method} {path} -> HTTP {status} (expected {expect}): {raw[:300]!r}")
    return status, parsed, raw


def get(path, expect=200):
    return request("GET", path, expect=expect)


def assert_keys(obj, required, label):
    missing = [k for k in required if k not in obj]
    assert not missing, f"{label}: payload shape shifted — missing keys {missing}; got {sorted(obj)}"


def keys_of_first(items, label):
    assert items, f"{label}: sequence unexpectedly empty — cannot verify shape"
    return items[0]


# ── stolen feed ids shared by detail-route tests (module-scoped) ─────────────

@pytest.fixture(scope="session")
def a_business_id():
    _, body, _ = get("/mobile/businesses/nearby?lat=10.72&lng=122.56&radius=5000")
    biz = keys_of_first(body["businesses"], "nearby")
    return biz["business_id"]


@pytest.fixture(scope="session")
def a_product_id():
    _, body, _ = get("/mobile/popular-products?lat=10.72&lng=122.56&per_page=5")
    prod = keys_of_first(body["products"], "popular-products")
    return prod["product_id"]


# ── public feed & reference routes ───────────────────────────────────────────

def test_nearby_businesses():
    _, body, _ = get("/mobile/businesses/nearby?lat=10.72&lng=122.56&radius=5000")
    assert_keys(body, ["businesses", "category_counts"], "nearby")
    row = keys_of_first(body["businesses"], "nearby.businesses")
    # Fields the mobile home-feed card renders / schemas/ enforce. A renamed
    # field (e.g. distance_km instead of distance_meters) lands here.
    assert_keys(row, [
        "branch_id", "branch_name", "address", "branch_lat", "branch_lng",
        "distance_meters", "business_id", "business_name", "business_description",
        "logo_url", "banner_url", "interior_images", "average_rating",
        "rating_count", "business_type", "category_name", "weekly_view_count",
        "is_trending", "is_featured", "is_new", "total_followers",
    ], "nearby.businesses[0]")
    assert isinstance(row["weekly_view_count"], int)
    assert isinstance(row["distance_meters"], (int, float))
    for c in body["category_counts"]:
        assert_keys(c, ["business_type", "category_name", "count"], "nearby.category_counts")
        assert isinstance(c["count"], int)


def test_business_detail(a_business_id):
    _, body, _ = get(f"/mobile/businesses/{a_business_id}")
    assert "business" in body, f"business detail wrapper shifted: {sorted(body)}"
    b = body["business"]
    assert_keys(b, [
        "id", "shop_name", "description", "logo_url", "banner_url",
        "interior_images", "status", "owner_handle", "category", "branches",
        "total_followers", "operating_hours",
    ], "business")


def test_business_products(a_business_id):
    _, body, _ = get(f"/mobile/businesses/{a_business_id}/products?per_page=1")
    assert_keys(body, ["products"], "business products")


def test_business_coupons(a_business_id):
    _, body, _ = get(f"/mobile/businesses/{a_business_id}/coupons")
    assert "coupons" in body, f"coupons wrapper shifted: {sorted(body)}"


def test_business_ratings(a_business_id):
    _, body, _ = get(f"/mobile/businesses/{a_business_id}/ratings")
    assert_keys(body, ["average_rating", "total_ratings", "rating_distribution"], "ratings")
    for k in "12345":
        assert k in body["rating_distribution"], f"rating_distribution lost key {k}"


def test_business_share(a_business_id):
    _, body, _ = get(f"/mobile/businesses/{a_business_id}/share")
    assert_keys(body, ["share_url", "title", "description", "image_url", "platforms"], "share")
    for p in ("facebook", "twitter", "tiktok", "instagram"):
        assert p in body["platforms"], f"share.platforms lost {p}"


def test_business_types():
    _, body, _ = get("/mobile/business-types")
    types = keys_of_first(body["business_types"], "business-types")
    assert_keys(types, ["id", "name", "description", "icon", "business_categories"], "business-types")
    for cat in types["business_categories"]:
        assert_keys(cat, ["id", "name"], "business_categories[0]")


# ── deals & events (empty-safe shape checks) ────────────────────────────────

def test_deals():
    _, body, _ = get("/mobile/deals?per_page=1")
    assert_keys(body, ["featured", "flash", "explore", "explore_total", "explore_page",
                       "explore_per_page", "explore_has_more"], "deals")


def test_events():
    _, body, _ = get("/mobile/events?per_page=1")
    assert_keys(body, ["events", "total", "has_more"], "events")
    assert isinstance(body["total"], int)
    assert isinstance(body["has_more"], bool)


def test_events_nearby():
    _, body, _ = get("/mobile/events/nearby?lat=10.72&lng=122.56")
    assert_keys(body, ["events", "total", "has_more"], "events-nearby")


# ── popular products ────────────────────────────────────────────────────────

def test_popular_products():
    _, body, _ = get("/mobile/popular-products?lat=10.72&lng=122.56&per_page=1")
    assert_keys(body, ["products", "total", "page", "per_page", "has_more", "fresh",
                       "bida_of_the_day"], "popular-products")
    row = keys_of_first(body["products"], "popular-products.products")
    assert_keys(row, [
        "product_id", "product_name", "product_image_url", "price", "price_type",
        "price_unit", "weekly_view_count", "average_rating", "rating_count",
        "business_id", "business_name", "business_logo_url",
        "business_banner_url", "distance_meters", "is_new", "total_count",
    ], "popular-products.products[0]")
    assert isinstance(row["weekly_view_count"], int)


def test_popular_products_facets():
    _, body, _ = get("/mobile/popular-products/facets?lat=10.72&lng=122.56")
    facets = keys_of_first(body["facets"], "facets")
    assert_keys(facets, ["name", "count"], "facets[0]")
    assert isinstance(facets["count"], int)


# ── protected routes: route exists + auth guard, no valid token held ────────
# A 401 (not 404) proves the route is deployed AND still guarded.

@pytest.mark.parametrize("path", [
    "/protected/mobile/me",
    "/protected/mobile/follows",
    "/protected/mobile/redemptions",
    "/protected/mobile/updates",
    "/protected/mobile/notifications",
])
def test_protected_gets_guarded(path):
    code, _, raw = request("GET", path)
    assert code == 401, f"GET {path} returned {code} — guard moved or route vanished: {raw[:200]!r}"


@pytest.mark.parametrize("path", [
    "/protected/mobile/notifications/read-all",
]) 
def test_protected_posts_guarded_by_bad_bearer(path):
    code, _, raw = request("POST", path, headers={"Authorization": "Bearer smoke-invalid-token"},
                           body={})
    assert code == 401, f"POST {path} with a junk bearer returned {code}: {raw[:200]!r}"


# ── view-count POST routes: bearer-gated, not silently open ─────────────────

def test_business_view_post_requires_bearer(a_business_id):
    code, _, raw = request("POST", f"/mobile/businesses/{a_business_id}/view",
                           headers={"Authorization": "Bearer smoke-invalid-token"}, body={})
    assert code == 401, f"view POST accepted a junk bearer (code {code}) — count inflation risk: {raw[:200]!r}"
    # GET proves the path itself is deployed (405 = route exists, wrong verb).
    code, _, _ = request("GET", f"/mobile/businesses/{a_business_id}/view")
    assert code == 405, f"business view route vanished: GET gave {code}, expected Next's 405"


def test_product_view_post_requires_bearer(a_product_id):
    code, _, _ = request("POST", f"/mobile/products/{a_product_id}/view",
                         headers={"Authorization": "Bearer smoke-invalid-token"}, body={})
    assert code == 401
    code, _, _ = request("GET", f"/mobile/products/{a_product_id}/view")
    assert code == 405
