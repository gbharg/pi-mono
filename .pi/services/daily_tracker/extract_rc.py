#!/usr/bin/env python3
"""Pull RingCentral call-log per day, aggregate PHN-* metrics.

RC call-log detailed view has a 3-month retention window. Anything older than
~2026-01-10 returns empty. We query per day anyway and mark missing days as
"N/A — beyond retention window" in Data_Quality.

Output: /Users/agent/pi-mono/.pi/services/daily_tracker/rc_daily.json
shape: {ym: {date: {PHN-1:, PHN-2:, PHN-3:, PHN-4:, PHN-5:, PHN-6:, PHN-7:, PHN-8:}}}
"""
from __future__ import annotations

import calendar
import datetime as dt
import json
import statistics
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

sys.path.insert(0, "/Users/agent/pi-mono/.pi/services/daily_tracker")
from kpi_schema import MONTHS

CFG = "/Users/agent/pi-mono/.config/exult/ringcentral.json"
RC_BASE = "https://platform.ringcentral.com"
OUT = "/Users/agent/pi-mono/.pi/services/daily_tracker/rc_daily.json"
ERRORS = "/Users/agent/pi-mono/.pi/services/daily_tracker/rc_errors.json"

# Call queue 55 "Front Office" id for PHN-7
QUEUE_55_ID = "881804009"
NEW_PT_EXT_ID = "63198650008"  # Shaye ext 201


def load_jwt() -> tuple[str, str]:
    cfg = json.load(open(CFG))
    return cfg["jwt"], cfg["client_id"] + ":" + cfg["client_secret"]


def acquire_access_token() -> str:
    cfg = json.load(open(CFG))
    data = urllib.parse.urlencode({
        "grant_type": "urn:ietf:params:oauth:grant-type:jwt-bearer",
        "assertion": cfg["jwt"],
    }).encode("utf-8")
    import base64
    creds = base64.b64encode(f"{cfg['client_id']}:{cfg['client_secret']}".encode()).decode()
    req = urllib.request.Request(
        f"{RC_BASE}/restapi/oauth/token",
        data=data,
        method="POST",
        headers={
            "Content-Type": "application/x-www-form-urlencoded",
            "Authorization": f"Basic {creds}",
            "Accept": "application/json",
        },
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read())["access_token"]


def rc_get(token: str, path: str, params: dict | None = None, retries: int = 6) -> dict:
    url = f"{RC_BASE}{path}"
    if params:
        url += "?" + urllib.parse.urlencode(params)
    for attempt in range(retries):
        req = urllib.request.Request(
            url,
            method="GET",
            headers={"Authorization": f"Bearer {token}", "Accept": "application/json"},
        )
        try:
            with urllib.request.urlopen(req, timeout=45) as resp:
                return json.loads(resp.read())
        except urllib.error.HTTPError as e:
            if e.code == 429 or e.code == 503:
                retry_after = int(e.headers.get("Retry-After", "5"))
                time.sleep(retry_after + 1)
                continue
            if e.code >= 500 and attempt < 3:
                time.sleep(2 ** attempt)
                continue
            body = e.read().decode("utf-8", errors="replace")
            raise RuntimeError(f"GET {path} -> {e.code}: {body[:300]}") from e
    raise RuntimeError(f"exceeded retries on {path}")


def day_iter(ym: str):
    y, m = map(int, ym.split("-"))
    n = calendar.monthrange(y, m)[1]
    for d in range(1, n + 1):
        yield f"{y:04d}-{m:02d}-{d:02d}"


def fetch_call_log_for_range(token: str, date_from: str, date_to: str) -> list[dict]:
    """Paginate /account/~/call-log for an arbitrary date window (UTC ISO)."""
    all_rows = []
    page = 1
    while True:
        params = {
            "dateFrom": date_from,
            "dateTo": date_to,
            "view": "Detailed",
            "perPage": 1000,
            "page": page,
            "withRecording": "false",
        }
        try:
            resp = rc_get(token, "/restapi/v1.0/account/~/call-log", params)
        except RuntimeError as e:
            msg = str(e)
            if "CLG-102" in msg or "retention" in msg.lower() or "period" in msg.lower() or "dateFrom" in msg:
                return None  # beyond retention
            raise
        rows = resp.get("records", [])
        all_rows.extend(rows)
        print(f"    page {page}: {len(rows)} rows (cumulative {len(all_rows)})", flush=True)
        nav = resp.get("navigation", {})
        if "nextPage" not in nav or not rows or len(rows) < 1000:
            break
        page += 1
        if page > 60:
            break
        # Pace: RC heavy-category limit is 10 req / 60 sec
        time.sleep(6.2)
    return all_rows


def aggregate(rows: list[dict]) -> dict:
    """Compute PHN-1..PHN-8 from a day's call-log records."""
    inbound = [r for r in rows if r.get("direction") == "Inbound"]
    outbound = [r for r in rows if r.get("direction") == "Outbound"]

    def is_answered(r):
        return r.get("result") in ("Accepted", "Call connected") and (r.get("duration") or 0) > 0

    def is_missed(r):
        res = r.get("result")
        return res in ("Missed", "Abandoned", "Rejected")

    def is_voicemail(r):
        res = r.get("result", "")
        return "Voicemail" in res or res == "Voicemail"

    answered = [r for r in inbound if is_answered(r)]
    missed = [r for r in inbound if is_missed(r)]
    voicemails = [r for r in inbound if is_voicemail(r)]

    # Queue 55 call volume — any leg touching queue 55
    q55 = 0
    for r in inbound:
        for leg in r.get("legs", []) or []:
            ext = leg.get("extension", {}) or {}
            if str(ext.get("id", "")) == QUEUE_55_ID or ext.get("extensionNumber") == "55":
                q55 += 1
                break

    # Longest hold: max duration on answered - (duration - talkTime)
    longest_hold = 0
    for r in answered:
        d = r.get("duration") or 0
        legs = r.get("legs") or []
        # sum of leg holdTime is available in some call-log shapes; fallback to max leg duration
        for leg in legs:
            h = leg.get("duration") or 0
            if h > longest_hold:
                longest_hold = h

    # Avg answer time (sec): first-leg duration for the inbound answered calls
    answer_times = []
    for r in answered:
        legs = r.get("legs") or []
        if not legs:
            continue
        # sum ring delays across legs by walking startTime deltas
        try:
            t0 = legs[0].get("startTime")
            ta = None
            for leg in legs:
                res = leg.get("result")
                if res in ("Accepted", "Call connected"):
                    ta = leg.get("startTime")
                    break
            if t0 and ta:
                t0d = dt.datetime.fromisoformat(t0.replace("Z", "+00:00"))
                tad = dt.datetime.fromisoformat(ta.replace("Z", "+00:00"))
                delta = (tad - t0d).total_seconds()
                if 0 <= delta <= 120:
                    answer_times.append(delta)
        except (KeyError, ValueError):
            pass

    return {
        "PHN-1": len(inbound),
        "PHN-2": len(answered),
        "PHN-3": len(missed),
        "PHN-4": len(voicemails),
        "PHN-5": round(statistics.median(answer_times), 1) if answer_times else 0,
        "PHN-6": len(outbound),
        "PHN-7": q55,
        "PHN-8": longest_hold,
    }


def main():
    print("RingCentral call-log extractor", flush=True)
    print("=" * 60, flush=True)
    token = acquire_access_token()
    print("access token acquired", flush=True)

    data: dict = {ym: {} for ym in MONTHS}
    errors: list[dict] = []
    retention_days: list[str] = []
    total_calls = 0

    for ym in MONTHS:
        total_calls += 1
        # Query the whole month in one range, then bucket per day
        y, m = map(int, ym.split("-"))
        n_days = calendar.monthrange(y, m)[1]
        date_from = f"{ym}-01T00:00:00.000Z"
        if m == 12:
            next_ym = f"{y + 1}-01"
        else:
            next_ym = f"{y:04d}-{m + 1:02d}"
        date_to = f"{next_ym}-01T00:00:00.000Z"
        print(f"  {ym}: fetching range {date_from[:10]}..{date_to[:10]}", flush=True)

        try:
            rows = fetch_call_log_for_range(token, date_from, date_to)
        except RuntimeError as e:
            msg = str(e)
            if "401" in msg:
                try:
                    token = acquire_access_token()
                    rows = fetch_call_log_for_range(token, date_from, date_to)
                except Exception as e2:
                    rows = None
                    errors.append({"month": ym, "error": str(e2)[:300]})
            elif "retention" in msg.lower() or "CLG-102" in msg:
                for d in day_iter(ym):
                    retention_days.append(d)
                continue
            else:
                errors.append({"month": ym, "error": msg[:300]})
                rows = None

        if rows is None:
            print(f"    {ym}: NO DATA", flush=True)
            for d in day_iter(ym):
                retention_days.append(d)
            continue

        # Bucket per day from startTime
        by_day: dict[str, list] = {}
        for r in rows:
            st = r.get("startTime", "")
            day = st[:10]
            if not day:
                continue
            by_day.setdefault(day, []).append(r)

        for date in day_iter(ym):
            agg = aggregate(by_day.get(date, []))
            data[ym][date] = agg

        n_inb = sum(b["PHN-1"] for b in data[ym].values())
        n_ans = sum(b["PHN-2"] for b in data[ym].values())
        print(f"    {ym}: {len(rows)} rows  PHN-1={n_inb}  PHN-2={n_ans}", flush=True)
        # Pace between months for rate limit
        time.sleep(6.5)

    with open(OUT, "w") as f:
        json.dump(data, f, indent=2)
    with open(ERRORS, "w") as f:
        json.dump({
            "errors": errors,
            "retention_blocked": retention_days,
            "total_days_queried": total_calls,
        }, f, indent=2)
    print(f"  wrote {OUT}")
    print(f"  retention-blocked days: {len(retention_days)}")
    print(f"  other errors: {len(errors)}")


if __name__ == "__main__":
    main()
