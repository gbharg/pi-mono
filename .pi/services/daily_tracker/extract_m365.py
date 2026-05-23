#!/usr/bin/env python3
"""Query Microsoft Graph for per-day mailbox counts.

Produces /Users/agent/pi-mono/.pi/services/daily_tracker/m365_daily.json
shape: {ym: {date: {mailbox_alias: count}}}
"""
from __future__ import annotations

import calendar
import datetime as dt
import json
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

sys.path.insert(0, "/Users/agent/pi-mono/.pi/services/daily_tracker")
from graph_util import GRAPH_V1, acquire_token, call
from kpi_schema import MONTHS

MAILBOXES = {
    "prescriptions": "prescriptions.rx@exulthealthcare.com",
    "shaye":         "shaye.lemieux@exulthealthcare.com",
    "referrals":     "referrals@exulthealthcare.com",
    "fax":           "fax@exulthealthcare.com",
}

# request@ is a Unified group mailbox — handled separately via /groups/{id}/conversations
GROUP_MAILBOXES = {
    "request": "0e6b44be-c3db-43c5-9a0a-fa112f81f6d0",  # Medical Record Requests
}

OUT_PATH = "/Users/agent/pi-mono/.pi/services/daily_tracker/m365_daily.json"
ERRORS_PATH = "/Users/agent/pi-mono/.pi/services/daily_tracker/m365_errors.json"


def day_iter(ym: str):
    y, m = map(int, ym.split("-"))
    n = calendar.monthrange(y, m)[1]
    for d in range(1, n + 1):
        yield f"{y:04d}-{m:02d}-{d:02d}"


def resolve_user_id(token: str, upn: str) -> str | None:
    try:
        resp = call("GET", f"{GRAPH_V1}/users/{urllib.parse.quote(upn)}", token)
        return resp.get("id") if resp else None
    except RuntimeError as e:
        if "404" in str(e):
            return None
        raise


def count_messages_for_day(token: str, user_id: str, day: str) -> int:
    """Use Graph $count on messages received in [day, day+1)."""
    start = f"{day}T00:00:00Z"
    next_day = (dt.date.fromisoformat(day) + dt.timedelta(days=1)).isoformat()
    end = f"{next_day}T00:00:00Z"
    filt = f"receivedDateTime ge {start} and receivedDateTime lt {end}"
    params = urllib.parse.urlencode({"$filter": filt, "$count": "true", "$top": "1"})
    url = f"{GRAPH_V1}/users/{user_id}/messages?{params}"
    resp = call("GET", url, token, extra_headers={"ConsistencyLevel": "eventual"})
    if resp is None:
        return 0
    return int(resp.get("@odata.count", 0))


def count_group_threads_for_day(token: str, group_id: str, day: str) -> int:
    """Count Unified-group conversation threads whose lastDeliveredDateTime falls in day."""
    start = f"{day}T00:00:00Z"
    next_day = (dt.date.fromisoformat(day) + dt.timedelta(days=1)).isoformat()
    end = f"{next_day}T00:00:00Z"
    filt = f"lastDeliveredDateTime ge {start} and lastDeliveredDateTime lt {end}"
    params = urllib.parse.urlencode({"$filter": filt, "$count": "true", "$top": "1"})
    url = f"{GRAPH_V1}/groups/{group_id}/threads?{params}"
    try:
        resp = call("GET", url, token, extra_headers={"ConsistencyLevel": "eventual"})
    except RuntimeError as e:
        # fallback: query conversations and filter client-side (slower, used only on 400)
        if "400" in str(e) or "501" in str(e):
            return count_group_threads_fallback(token, group_id, day)
        raise
    if resp is None:
        return 0
    return int(resp.get("@odata.count", len(resp.get("value", []))))


def count_group_threads_fallback(token: str, group_id: str, day: str) -> int:
    # Pull recent threads and count locally — last-resort slow path
    url = f"{GRAPH_V1}/groups/{group_id}/threads?$top=200&$orderby=lastDeliveredDateTime desc"
    resp = call("GET", url, token)
    items = resp.get("value", []) if resp else []
    return sum(1 for t in items if t.get("lastDeliveredDateTime", "").startswith(day))


def main():
    print("M365 email extractor")
    print("=" * 60)
    token = acquire_token()
    print("token acquired")

    # Resolve user ids (skip if not found)
    user_ids: dict[str, str] = {}
    for alias, upn in MAILBOXES.items():
        uid = resolve_user_id(token, upn)
        if uid:
            user_ids[alias] = uid
            print(f"  resolved {alias} ({upn}) -> {uid}")
        else:
            print(f"  NOT FOUND: {alias} ({upn}) — will skip")

    group_ids = dict(GROUP_MAILBOXES)
    for alias, gid in group_ids.items():
        print(f"  group mailbox: {alias} -> {gid}")

    data: dict[str, dict[str, dict[str, int]]] = {ym: {} for ym in MONTHS}
    errors: list[dict] = []
    total_calls = 0

    # Token has 60-min lifetime; refresh every ~50 min
    token_acquired_at = time.time()
    ncalls_since_refresh = 0

    for ym in MONTHS:
        print(f"  {ym}: fetching...", flush=True)
        for date in day_iter(ym):
            row: dict[str, int] = {}
            # periodically refresh token
            if time.time() - token_acquired_at > 45 * 60:
                token = acquire_token()
                token_acquired_at = time.time()
                print("  (refreshed token)")
            for alias, uid in user_ids.items():
                try:
                    n = count_messages_for_day(token, uid, date)
                    row[alias] = n
                except RuntimeError as e:
                    msg = str(e)
                    errors.append({"date": date, "mailbox": alias, "error": msg[:300]})
                    row[alias] = None
                total_calls += 1
                ncalls_since_refresh += 1
                if total_calls % 30 == 0:
                    time.sleep(0.3)
            for alias, gid in group_ids.items():
                try:
                    n = count_group_threads_for_day(token, gid, date)
                    row[alias] = n
                except RuntimeError as e:
                    msg = str(e)
                    errors.append({"date": date, "mailbox": alias, "error": msg[:300]})
                    row[alias] = None
                total_calls += 1
                if total_calls % 30 == 0:
                    time.sleep(0.3)
            if any(v is not None for v in row.values()):
                data[ym][date] = row
        # Print per-month subtotals
        all_aliases = list(user_ids.keys()) + list(group_ids.keys())
        totals = {a: sum((data[ym][d].get(a) or 0) for d in data[ym]) for a in all_aliases}
        print(f"    {ym} totals: {totals}")

    with open(OUT_PATH, "w") as f:
        json.dump(data, f, indent=2)
    with open(ERRORS_PATH, "w") as f:
        json.dump(errors, f, indent=2)
    print(f"  wrote {OUT_PATH}")
    print(f"  wrote {ERRORS_PATH} ({len(errors)} errors)")
    print(f"  total graph calls: {total_calls}")


if __name__ == "__main__":
    main()
