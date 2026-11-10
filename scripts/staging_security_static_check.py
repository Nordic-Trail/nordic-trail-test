#!/usr/bin/env python3
"""Offline regression checks for the STAGING reporting UI. Does not connect to Supabase.

These are code assertions, NOT an RLS audit or authorization proof.
"""
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parent.parent

def read(path):
    return (ROOT / path).read_text(encoding="utf-8")

reports = read("staging-reports/index.html")
auth = read("staging-auth-audit/index.html")
write = read("staging-write-audit/index.html")
workflow = read(".github/workflows/staging-anonymous-rls-check.yml")
checks = [
    ("No hard-coded point 4 in read audit", "point #4" not in auth and "szkic #4" not in auth.lower()),
    ("No hard-coded point 4 in write audit", "szkic #4" not in write.lower()),
    ("Read audit checks other users' private points", ".neq('user_id',uid)" in auth and "foreignPoints" in auth),
    ("Read audit checks other users' reports", ".neq('user_id',uid)" in auth and "foreignReports" in auth),
    ("Read audit accepts RLS filtered 0 rows", "r.count===0" in auth),
    ("Write audit uses impossible id filters", ".eq('id',-1).eq('id',-2)" in write),
    ("Write audit uses dynamic counts", "snapshotCounts()" in write),
    ("Report submission checks authenticated user", "db.auth.getUser()" in reports),
    ("Reports are created pending", "review_status:'pending'" in reports),
    ("Reports use moderated RPC for decisions", "db.rpc('moderate_point_report'" in reports),
    ("Reports UI uses textContent rather than innerHTML", "li.textContent=" in reports and ".innerHTML" not in reports),
    ("Report duplicate error mapped to message", "err?.code==='23505'" in reports),
    ("Anonymous audit triggered by reports changes", "'staging-reports/**'" in workflow),
]
failures = []
for label, passed in checks:
    print(("PASS" if passed else "FAIL") + ": " + label)
    if not passed:
        failures.append(label)
print(f"Static checks: {len(checks)-len(failures)}/{len(checks)} passed.")
if failures:
    sys.exit(1)
