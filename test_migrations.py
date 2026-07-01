#!/usr/bin/env python3
"""Test each Grid2 migration against CC database in a rollback transaction."""
import os, re, subprocess, sys

PG_URL = "postgresql://postgres:PersesBackup2026!@db.xcvacmreerrypygpritq.supabase.co:5432/postgres"
PSQL_BIN = "/opt/homebrew/Cellar/libpq/18.4/bin/psql"
ENV = {**os.environ, "PGPASSWORD": "PersesBackup2026!", "PATH": "/opt/homebrew/Cellar/libpq/18.4/bin:" + os.environ.get("PATH", "")}

MIGRATIONS_DIR = "/Users/davidmccarty/Desktop/Central Command/supabase/migrations"
files = sorted([f for f in os.listdir(MIGRATIONS_DIR) if f.endswith(".sql")])

results = []
for f in files:
    path = os.path.join(MIGRATIONS_DIR, f)
    with open(path, "r") as fh:
        sql = fh.read()
    # Wrap in a transaction that always rolls back
    test_sql = "BEGIN;\n" + sql + "\nROLLBACK;\n"
    proc = subprocess.run(
        [PSQL_BIN, PG_URL, "-v", "ON_ERROR_STOP=1", "-q", "-f", "-"],
        input=test_sql, capture_output=True, text=True, env=ENV
    )
    status = "PASS" if proc.returncode == 0 else "FAIL"
    err = (proc.stderr or "").strip()
    # Truncate long error output
    if len(err) > 500:
        err = err[:497] + "..."
    results.append((f, status, err))
    print(f"{f}: {status}")
    if status == "FAIL":
        print(err[:300])
        print("---")

print("\n" + "="*80)
print("SUMMARY:")
for f, status, err in results:
    print(f"{status:4} | {f}")
