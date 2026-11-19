#!/usr/bin/env python3
"""NORDIC TRAIL / STAGING: anonymous REST metadata audit (no row bodies).

The response is intentionally interpreted conservatively. An empty result is
not proof that other users' rows exist. No write requests are sent.
"""
from __future__ import annotations

import os
import re
import sys
from dataclasses import dataclass
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

BASE = "https://bairmdubhnodwplioxld.supabase.co/rest/v1"
PUBLIC_STATUS = frozenset({200, 206})
DENIED_STATUS = frozenset({401, 403})
KEY_PATTERN = re.compile(r"sb_publishable_[A-Za-z0-9_-]{10,}\Z")


@dataclass(frozen=True)
class Result:
    status: str
    note: str


def classify(http_status: int | None, count: int | None, mode: str) -> Result:
    """Return PASS, FAIL, REVIEW based only on response metadata.

    'hidden' applies to protected rows or tables.
    'column' probes whether a sensitive column is selectable; HTTP 200 is
    REVIEW because this signals potential exposure if public rows exist.
    """
    if http_status is None:
        return Result("REVIEW", "No reliable HTTP response")
    if mode == "public":
        if http_status in PUBLIC_STATUS and count is not None:
            return Result("PASS", "Public endpoint responds; row count readable")
        if http_status in DENIED_STATUS:
            return Result("FAIL", "Expected public endpoint denied")
        return Result("REVIEW", "Public endpoint returned an unexpected response")
    if mode == "hidden":
        if http_status in DENIED_STATUS:
            return Result("PASS", "Access denied")
        if http_status in PUBLIC_STATUS and count == 0:
            return Result("PASS", "Zero rows visible (existence of private rows unproven)")
        if http_status in PUBLIC_STATUS and count is not None and count > 0:
            return Result("FAIL", "Protected rows visible anonymously")
        return Result("REVIEW", "Response or count inconclusive")
    if mode == "column":
        if http_status in DENIED_STATUS:
            return Result("PASS", "Column access rejected")
        if http_status in PUBLIC_STATUS:
            return Result("REVIEW", "Column selectable anonymously; examine actual privileges")
        return Result("REVIEW", "Unexpected response; verify in PostgreSQL")
    raise ValueError("Unknown test mode")


def probe(key: str, table: str, filters: dict[str, str] | None = None,
          column: str = "id") -> tuple[int | None, int | None]:
    query = urlencode({"select": column, **(filters or {})})
    req = Request(
        f"{BASE}/{table}?{query}",
        method="HEAD",
        headers={
            "apikey": key,
            "Prefer": "count=exact",
            "Range": "0-0",
            "Accept": "application/json",
        },
    )
    try:
        with urlopen(req, timeout=15) as response:
            http_status = response.status
            content_range = response.headers.get("Content-Range", "")
    except HTTPError as error:
        http_status = error.code
        content_range = error.headers.get("Content-Range", "")
        error.close()
    except (URLError, TimeoutError, OSError):
        return None, None
    match = re.search(r"/(\d+)\s*$", content_range)
    return http_status, int(match.group(1)) if match else None


def main() -> int:
    key = os.environ.get("STAGING_PUBLISHABLE_KEY", "").strip()
    if not KEY_PATTERN.fullmatch(key):
        print("REVIEW: Missing or invalid publishable key in GitHub Actions secret")
        return 2
    checks = [
        ("Public approved map points", "map_points",
         {"visibility": "eq.public", "review_status": "eq.approved"}, "public", "id"),
        ("Private map points hidden", "map_points",
         {"visibility": "eq.private"}, "hidden", "id"),
        ("Unapproved map points hidden", "map_points",
         {"review_status": "neq.approved"}, "hidden", "id"),
        ("Private reports hidden", "point_reports", {}, "hidden", "id"),
        ("Administrator memberships hidden", "app_admins", {}, "hidden", "user_id"),
        ("Report moderation history hidden", "moderation_history", {}, "hidden", "id"),
        ("Point moderation history hidden", "point_moderation_history", {}, "hidden", "id"),
    ]
    results: list[Result] = []
    for label, table, filters, mode, column in checks:
        status, count = probe(key, table, filters, column)
        result = classify(status, count, mode)
        print(f"{result.status}: {label} | HTTP {status} | {result.note}; no row bodies fetched")
        results.append(result)

    # Risk discovery only, not a conclusion about whether user_id should be public.
    status, count = probe(key, "map_points", {
        "visibility": "eq.public", "review_status": "eq.approved"
    }, "user_id")
    column = classify(status, count, "column")
    print(f"{column.status}: Anonymous SELECT of map_points.user_id | HTTP {status} | {column.note}")
    if column.status == "REVIEW":
        print("::warning::Review anonymous access to map_points.user_id; no values were downloaded")

    if any(r.status == "FAIL" for r in results):
        print("FAIL: Protected data was visible, or the public endpoint was denied")
        return 1
    if any(r.status == "REVIEW" for r in results):
        print("REVIEW: Core audit inconclusive; do not treat as security PASS")
        return 2
    print("PASS: Observed anonymous API behavior matches the tested expectations; not an RLS certification")
    return 0


if __name__ == "__main__":
    sys.exit(main())
