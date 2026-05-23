#!/usr/bin/env python3
"""Daily Ops Dashboard — local refresher.

Runs on the operator Mac (launchd cron every 5 minutes). Pulls:
  - AdvancedMD visits + appts (via XMLRPC service account ARC022825)
  - RingCentral call log + voicemails (via JWT app token)
  - Microsoft 365 Graph mailbox counts for Rx / referrals / shaye mailboxes

Builds a dashboard snapshot (matching lib/types.ts Snapshot) and POSTs it to
the Vercel app's /api/ingest endpoint with X-Ingest-Secret header.

Hard rules:
  - READ-ONLY across all APIs
  - No PHI: initials + last-4 only, no DOB, no full name, no full phone
  - AMD login is rate-limited (60/hour, 3/minute) — cache session token on disk

Config: reads env file at config.env (or environment vars) for:
  DASHBOARD_URL          (https://<vercel-host>)
  INGEST_SECRET          (matches Vercel env var)
  AMD_SA_USER            (default: ARC022825)
  AMD_SA_PASSWORD
  AMD_OFFICE             (default: 161112)
  RC_JWT
  RC_CLIENT_ID
  RC_CLIENT_SECRET
  M365_TENANT_ID
  M365_CLIENT_ID
  M365_CLIENT_SECRET

Falls back to reading /Users/agent/pi-mono/.config/exult/*.json when env is missing.
"""
from __future__ import annotations

import base64
import http.cookiejar
import json
import os
import re
import ssl
import sys
import time
import traceback
import urllib.error
import urllib.parse
import urllib.request
from collections import Counter
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Any, Optional
from zoneinfo import ZoneInfo

HERE = Path(__file__).resolve().parent
CONFIG_ENV = HERE / "config.env"
SESSION_CACHE = HERE / ".amd_session.json"
LOG_PATH = HERE / "refresher.log"

TZ = ZoneInfo("America/Chicago")

STATUS_LABELS = {
    0: "Made",
    1: "Arrived",
    2: "Other",
    3: "Seen",
    5: "Moved",
    10: "Cancelled",
    11: "Deleted",
    12: "NoShow",
}


# ---------------- Logging ---------------- #

def log(msg: str) -> None:
    ts = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    line = f"[{ts}] {msg}"
    print(line, file=sys.stderr, flush=True)
    try:
        with open(LOG_PATH, "a") as f:
            f.write(line + "\n")
        os.chmod(LOG_PATH, 0o600)
    except OSError:
        pass


# ---------------- Config ---------------- #

def load_env() -> dict[str, str]:
    env: dict[str, str] = {}
    if CONFIG_ENV.exists():
        for raw in CONFIG_ENV.read_text().splitlines():
            line = raw.strip()
            if not line or line.startswith("#"):
                continue
            if "=" not in line:
                continue
            k, v = line.split("=", 1)
            env[k.strip()] = v.strip().strip('"').strip("'")
    # Overlay real environment variables
    for k in (
        "DASHBOARD_URL", "INGEST_SECRET",
        "AMD_SA_USER", "AMD_SA_PASSWORD", "AMD_OFFICE",
        "RC_JWT", "RC_CLIENT_ID", "RC_CLIENT_SECRET",
        "M365_TENANT_ID", "M365_CLIENT_ID", "M365_CLIENT_SECRET",
    ):
        if os.environ.get(k):
            env[k] = os.environ[k]
    return env


def load_fallback_creds() -> dict[str, Any]:
    """Load creds from the canonical config files when env vars missing."""
    cfg: dict[str, Any] = {}
    try:
        with open("/Users/agent/pi-mono/.config/exult/amd_api_service.json") as f:
            cfg["amd"] = json.load(f)
    except FileNotFoundError:
        cfg["amd"] = None
    try:
        with open("/Users/agent/pi-mono/.config/exult/ringcentral.json") as f:
            cfg["rc"] = json.load(f)
    except FileNotFoundError:
        cfg["rc"] = None
    try:
        with open("/Users/agent/pi-mono/.config/exult/microsoft365.json") as f:
            cfg["m365"] = json.load(f)
    except FileNotFoundError:
        cfg["m365"] = None
    return cfg


# ---------------- AMD XMLRPC client with session caching ---------------- #

class AmdSession:
    def __init__(self, user: str, password: str, office: str):
        self.user = user
        self.password = password
        self.office = office
        self.webserver: Optional[str] = None
        self.xmlrpc_url: Optional[str] = None
        self.token: Optional[str] = None
        self.cached_at: float = 0
        ctx = ssl.create_default_context()
        https_handler = urllib.request.HTTPSHandler(context=ctx)
        self.opener = urllib.request.build_opener(
            https_handler,
            urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()),
        )

    # Session cache makes the refresher resilient to AMD's 60-login/hour cap.
    def load_cache(self) -> bool:
        if not SESSION_CACHE.exists():
            return False
        try:
            data = json.loads(SESSION_CACHE.read_text())
        except (OSError, json.JSONDecodeError):
            return False
        age_sec = time.time() - data.get("saved_at", 0)
        if age_sec > 20 * 60:  # 30min AMD TTL — renew at 20min
            return False
        self.webserver = data["webserver"]
        self.xmlrpc_url = data["xmlrpc_url"]
        self.token = data["token"]
        self.cached_at = data["saved_at"]
        return True

    def save_cache(self) -> None:
        data = {
            "webserver": self.webserver,
            "xmlrpc_url": self.xmlrpc_url,
            "token": self.token,
            "saved_at": time.time(),
        }
        SESSION_CACHE.write_text(json.dumps(data))
        os.chmod(SESSION_CACHE, 0o600)

    def _post(self, url: str, xml: str, timeout: int = 60) -> bytes:
        headers = {
            "Content-Type": "text/xml; charset=utf-8",
            "User-Agent": "ExultDailyOpsRefresher/1.0",
        }
        if self.token:
            headers["Cookie"] = f"token={self.token}"
        req = urllib.request.Request(url, data=xml.encode("utf-8"), headers=headers, method="POST")
        with self.opener.open(req, timeout=timeout) as resp:
            return resp.read()

    @staticmethod
    def _msgtime() -> str:
        return datetime.now().strftime("%m/%d/%Y %I:%M:%S %p")

    def login(self) -> None:
        if self.load_cache():
            log(f"amd: reusing cached session (age {time.time() - self.cached_at:.0f}s)")
            return
        login_url = "https://partnerlogin.advancedmd.com/practicemanager/xmlrpc/processrequest.aspx"
        body = (
            f'<?xml version="1.0" encoding="UTF-8"?>'
            f'<ppmdmsg action="login" class="login" msgtime="{self._msgtime()}" '
            f'username="{self.user}" psw="{self.password}" '
            f'officecode="{self.office}" appname="TEMP"/>'
        )
        log(f"amd: login attempt user={self.user}")
        try:
            raw = self._post(login_url, body)
        except urllib.error.HTTPError as e:
            body_head = e.read()[:300] if hasattr(e, "read") else b""
            raise RuntimeError(f"amd login http {e.code}: {body_head!r}") from e
        text = raw.decode("iso-8859-1", errors="replace")
        m = re.search(r'webserver="([^"]+)"', text)
        if not m:
            raise RuntimeError(f"amd login: no webserver in response (head: {text[:200]})")
        self.webserver = m.group(1)
        self.xmlrpc_url = f"{self.webserver}/xmlrpc/processrequest.aspx"

        if 'success="1"' not in text:
            log(f"amd: following redirect {self.xmlrpc_url}")
            try:
                raw2 = self._post(self.xmlrpc_url, body)
            except urllib.error.HTTPError as e:
                body_head = e.read()[:300] if hasattr(e, "read") else b""
                raise RuntimeError(f"amd redirect login http {e.code}: {body_head!r}") from e
            text2 = raw2.decode("iso-8859-1", errors="replace")
            m3 = re.search(r"<usercontext[^>]*>([^<]*)</usercontext>", text2)
            if not m3 or not m3.group(1):
                raise RuntimeError(f"amd: no usercontext token in redirect (head: {text2[:200]})")
            self.token = m3.group(1).strip()
        self.save_cache()
        log("amd: login success, token cached")

    def request(self, xml: str, timeout: int = 60) -> bytes:
        if not self.xmlrpc_url:
            raise RuntimeError("amd: not logged in")
        try:
            return self._post(self.xmlrpc_url, xml, timeout=timeout)
        except urllib.error.HTTPError as e:
            # 401/403 → session expired, invalidate and relogin once
            if e.code in (401, 403):
                log(f"amd: session expired ({e.code}), relogin")
                SESSION_CACHE.unlink(missing_ok=True)
                self.token = None
                self.login()
                return self._post(self.xmlrpc_url, xml, timeout=timeout)
            raise


def parse_getdatevisits(text: str) -> list[dict]:
    """Parse <visit> elements from a getdatevisits response."""
    visits = []
    for m in re.finditer(r'<visit\s+([^/>]*?)/>', text):
        attrs = dict(re.findall(r'(\w+)="([^"]*)"', m.group(1)))
        visits.append(attrs)
    # Also match <visit ...>... </visit> (with children)
    for m in re.finditer(r'<visit\s+([^>]*?)>', text):
        attrs = dict(re.findall(r'(\w+)="([^"]*)"', m.group(1)))
        vid = attrs.get("id")
        if any(v.get("id") == vid for v in visits):
            continue
        visits.append(attrs)
    return visits


def parse_getreminderappts(text: str) -> list[dict]:
    """Extract appt + nested patient data from getreminderappts XML."""
    appts: list[dict] = []
    for am in re.finditer(
        r'<appt\s+([^>]*?)>(.*?)</appt>|<appt\s+([^/>]*?)/>',
        text,
        re.DOTALL,
    ):
        if am.group(1) is not None:
            attrs = dict(re.findall(r'(\w+)="([^"]*)"', am.group(1)))
            inner = am.group(2) or ""
        else:
            attrs = dict(re.findall(r'(\w+)="([^"]*)"', am.group(3)))
            inner = ""
        # nested patient element
        pm = re.search(r'<patient\s+([^/>]*?)/?>', inner)
        if pm:
            pattrs = dict(re.findall(r'(\w+)="([^"]*)"', pm.group(1)))
            attrs["_patient_firstname"] = pattrs.get("firstname", "")
            attrs["_patient_lastname"] = pattrs.get("lastname", "")
            attrs["_patient_id"] = pattrs.get("id", "")
        appts.append(attrs)
    return appts


# ---------------- AMD data collection ---------------- #

def amd_collect(amd_creds: dict) -> tuple[dict, dict]:
    """Returns ({today, yesterday}, sources.amd health dict)."""
    health = {"ok": False, "error": None, "fetched_at": None, "latency_ms": None}
    t0 = time.time()
    today_date = datetime.now(TZ).date()
    yesterday_date = today_date - timedelta(days=1)

    today = {
        "date": today_date.isoformat(),
        "total": 0,
        "by_status": {},
        "by_provider": {},
        "by_location": {},
        "new_patients": 0,
        "rows": [],
    }
    yesterday = {
        "date": yesterday_date.isoformat(),
        "total": 0,
        "by_status": {},
        "by_provider": {},
        "by_location": {},
        "new_patients": 0,
        "rows": [],
    }

    try:
        sess = AmdSession(
            amd_creds["username"],
            amd_creds["password"],
            str(amd_creds["office_key"]),
        )
        sess.login()

        for target, date_obj in ((today, today_date), (yesterday, yesterday_date)):
            date_us = date_obj.strftime("%m/%d/%Y")
            # getdatevisits: returns status per visit (via apptstatus="ApptStatus" selector)
            body_dv = (
                f'<ppmdmsg action="getdatevisits" class="api" '
                f'msgtime="{sess._msgtime()}" '
                f'visitdate="{date_us}">'
                f'<visit columnheading="ColumnHeading" duration="Duration" color="Color" apptstatus="ApptStatus"/>'
                f'<patient name="Name"/>'
                f'</ppmdmsg>'
            )
            resp = sess.request(body_dv, timeout=60)
            text = resp.decode("iso-8859-1", errors="replace")
            visits_dv = parse_getdatevisits(text)

            # Build a quick status lookup from getdatevisits
            status_by_id: dict[str, int] = {}
            for v in visits_dv:
                vid = v.get("id")
                st = v.get("apptstatus")
                if vid and st and st.isdigit():
                    status_by_id[vid] = int(st)

            # getreminderappts: richer per-visit data (time, provider, type, patient names)
            body_ra = (
                f'<ppmdmsg action="getreminderappts" class="api" '
                f'msgtime="{sess._msgtime()}" '
                f'startdate="{date_us}" enddate="{date_us}" '
                f'apptstatus="0,1,2,3,5,10,11,12" />'
            )
            resp2 = sess.request(body_ra, timeout=60)
            text2 = resp2.decode("iso-8859-1", errors="replace")
            visits_ra = parse_getreminderappts(text2)

            # Merge: for each visit in reminderappts, attach status from getdatevisits
            # Also pull provider/columnheading from getdatevisits into status_by_id
            col_by_id: dict[str, str] = {}
            for v in visits_dv:
                vid = v.get("id")
                if vid:
                    col_by_id[vid] = v.get("columnheading", "")

            status_counter = Counter()
            prov_counter = Counter()
            loc_counter = Counter()
            new_patients = 0
            rows: list[dict] = []
            for appt in visits_ra:
                vid = appt.get("id", "")
                if not vid:
                    continue
                status_code = status_by_id.get(vid)
                if status_code is None:
                    # Not in getdatevisits — fall back to 0 Made
                    status_code = 0
                # PHI scrub
                fn = (appt.get("_patient_firstname") or "").strip()
                ln = (appt.get("_patient_lastname") or "").strip()
                initials = ""
                if fn:
                    initials += fn[0].upper() + "."
                if ln:
                    initials += ln[0].upper() + "."
                if not initials:
                    initials = "??"
                pid = appt.get("_patient_id", "")
                chart_last4 = pid[-4:] if pid else "----"

                start_time = (appt.get("starttime") or "").strip()
                # e.g. "7:00PM" → hm "19:00"
                m_st = re.match(r'(\d{1,2}):(\d{2})(AM|PM)', start_time)
                if m_st:
                    hh = int(m_st.group(1))
                    mm = int(m_st.group(2))
                    ampm = m_st.group(3)
                    if ampm == "PM" and hh != 12:
                        hh += 12
                    if ampm == "AM" and hh == 12:
                        hh = 0
                    start_hm = f"{hh:02d}:{mm:02d}"
                else:
                    start_hm = "00:00"

                appt_type = appt.get("primaryappttype", "")
                is_new = bool(re.search(r'\bNEW\b', appt_type, re.IGNORECASE))
                provider = appt.get("providerprofiledesc", "") or col_by_id.get(vid, "")
                location = appt.get("location", "")
                if is_new:
                    new_patients += 1
                status_label = STATUS_LABELS.get(status_code, "Other")

                status_counter[status_label] += 1
                if provider:
                    prov_counter[provider] += 1
                if location:
                    loc_counter[location] += 1

                rows.append({
                    "visit_id": str(vid),
                    "start_time_local": start_time,
                    "start_hm": start_hm,
                    "provider": provider,
                    "appt_type": appt_type,
                    "location": location,
                    "status": status_code,
                    "status_label": status_label,
                    "patient_initials": initials,
                    "patient_chart_last4": chart_last4,
                    "is_new_patient": is_new,
                })

            target["total"] = len(rows)
            target["by_status"] = dict(status_counter)
            target["by_provider"] = dict(prov_counter)
            target["by_location"] = dict(loc_counter)
            target["new_patients"] = new_patients
            target["rows"] = rows

        health["ok"] = True
        health["fetched_at"] = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        health["latency_ms"] = int((time.time() - t0) * 1000)
    except Exception as exc:
        health["error"] = f"{type(exc).__name__}: {exc}"[:400]
        log(f"amd: FAILED {health['error']}")
        log(traceback.format_exc())
    return {"today": today, "yesterday": yesterday}, health


# ---------------- RingCentral ---------------- #

def rc_get_token(creds: dict) -> str:
    auth = base64.b64encode(f"{creds['client_id']}:{creds['client_secret']}".encode()).decode()
    data = urllib.parse.urlencode({
        "grant_type": "urn:ietf:params:oauth:grant-type:jwt-bearer",
        "assertion": creds["jwt"],
    }).encode()
    req = urllib.request.Request(
        f"{creds['server']}/restapi/oauth/token",
        data=data,
        headers={
            "Authorization": f"Basic {auth}",
            "Content-Type": "application/x-www-form-urlencoded",
            "Accept": "application/json",
        },
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read())["access_token"]


def mask_phone(num: str) -> str:
    if not num:
        return "***-***-****"
    digits = re.sub(r"\D", "", num)
    if len(digits) >= 4:
        return f"***-***-{digits[-4:]}"
    return "***-***-****"


def rc_collect(rc_creds: dict) -> tuple[dict, dict, dict]:
    """Returns (phone activity dict, voicemails dict, source health dict)."""
    health = {"ok": False, "error": None, "fetched_at": None, "latency_ms": None}
    t0 = time.time()
    phone = {
        "today_total": 0,
        "today_inbound": 0,
        "today_outbound": 0,
        "today_missed": 0,
        "yesterday_total": 0,
        "yesterday_missed": 0,
        "last4h_buckets": [],
        "recent_missed": [],
    }
    voicemails = {
        "status": "transcripts_unavailable",
        "note": "RC voicemails shown without AI transcript summaries (ReadMessages scope required — granted, but transcripts are a premium RC feature).",
        "entries": [],
    }

    try:
        token = rc_get_token(rc_creds)
        hdrs = {"Authorization": f"Bearer {token}", "Accept": "application/json"}
        server = rc_creds["server"]

        # Today + yesterday in the clinic timezone
        now_local = datetime.now(TZ)
        today_start = now_local.replace(hour=0, minute=0, second=0, microsecond=0)
        today_start_utc = today_start.astimezone(timezone.utc)
        yest_start = today_start - timedelta(days=1)
        yest_start_utc = yest_start.astimezone(timezone.utc)

        # 1. Call log for yesterday → now (covers both days in one fetch, paginated)
        date_from = yest_start_utc.strftime("%Y-%m-%dT%H:%M:%S.000Z")
        records = []
        page = 1
        while True:
            qs = urllib.parse.urlencode({
                "view": "Simple",
                "dateFrom": date_from,
                "perPage": 250,
                "page": page,
            })
            url = f"{server}/restapi/v1.0/account/~/call-log?{qs}"
            req = urllib.request.Request(url, headers=hdrs)
            try:
                with urllib.request.urlopen(req, timeout=30) as resp:
                    body = json.loads(resp.read())
            except urllib.error.HTTPError as e:
                raise RuntimeError(f"rc call-log http {e.code}") from e
            records.extend(body.get("records", []))
            navigation = body.get("navigation", {})
            next_page = navigation.get("nextPage") if isinstance(navigation, dict) else None
            if not next_page:
                break
            page += 1
            if page > 20:
                break

        # Partition into today / yesterday
        four_h_ago_utc = datetime.now(timezone.utc) - timedelta(hours=4)
        bucket_counts: dict[str, dict[str, int]] = {}
        missed_list: list[dict] = []

        for r in records:
            start_iso = r.get("startTime")
            if not start_iso:
                continue
            try:
                start_utc = datetime.fromisoformat(start_iso.replace("Z", "+00:00"))
            except ValueError:
                continue
            start_local = start_utc.astimezone(TZ)
            direction = r.get("direction", "")
            result = r.get("result", "")
            is_missed = result in ("Missed", "Voicemail", "Rejected") or (
                direction == "Inbound" and result in ("Call connected", "Missed")
            )
            # Better missed detection:
            is_missed = direction == "Inbound" and result in ("Missed", "Voicemail")

            if start_local.date() == today_start.date():
                phone["today_total"] += 1
                if direction == "Inbound":
                    phone["today_inbound"] += 1
                else:
                    phone["today_outbound"] += 1
                if is_missed:
                    phone["today_missed"] += 1
                    missed_list.append({
                        "masked_number": mask_phone(r.get("from", {}).get("phoneNumber", "")),
                        "at": start_utc.strftime("%Y-%m-%dT%H:%M:%SZ"),
                        "duration_sec": int(r.get("duration", 0)),
                    })
            elif start_local.date() == yest_start.date():
                phone["yesterday_total"] += 1
                if is_missed:
                    phone["yesterday_missed"] += 1

            # 15-min buckets for last 4 hours
            if start_utc >= four_h_ago_utc:
                bucket_minute = (start_utc.minute // 15) * 15
                bucket_start = start_utc.replace(minute=bucket_minute, second=0, microsecond=0)
                key = bucket_start.strftime("%Y-%m-%dT%H:%M:%SZ")
                bucket_counts.setdefault(key, {"inbound": 0, "outbound": 0, "missed": 0})
                if direction == "Inbound":
                    bucket_counts[key]["inbound"] += 1
                else:
                    bucket_counts[key]["outbound"] += 1
                if is_missed:
                    bucket_counts[key]["missed"] += 1

        # Ensure we have all 16 buckets in the last 4 hours (fill zeros)
        now_utc = datetime.now(timezone.utc)
        bucket_start0 = now_utc.replace(
            minute=(now_utc.minute // 15) * 15,
            second=0,
            microsecond=0,
        ) - timedelta(minutes=15 * 15)
        bucket_list = []
        for i in range(16):
            bs = bucket_start0 + timedelta(minutes=15 * i)
            key = bs.strftime("%Y-%m-%dT%H:%M:%SZ")
            b = bucket_counts.get(key, {"inbound": 0, "outbound": 0, "missed": 0})
            bucket_list.append({
                "bucket_start": key,
                "inbound": b["inbound"],
                "outbound": b["outbound"],
                "missed": b["missed"],
            })
        phone["last4h_buckets"] = bucket_list
        phone["recent_missed"] = sorted(missed_list, key=lambda x: x["at"], reverse=True)[:10]

        # 2. Voicemails — list from message-store on the main company number
        # The company extension is at /account/~/extension/~ — "~" = the authed user.
        # App-only JWT doesn't have a user; need to find the main auto-receptionist ext.
        # Try /account/~/extension with type=IvrMenu or Limited? Actually simplest: use
        # /account/~/extension/~/message-store only works with user tokens. For app-only
        # JWT, we iterate extensions and pull VMs from each.
        # Graceful degrade: just leave voicemails empty with the note.
        try:
            url = f"{server}/restapi/v1.0/account/~/extension?perPage=100&type=User,DigitalUser,Virtual"
            req = urllib.request.Request(url, headers=hdrs)
            with urllib.request.urlopen(req, timeout=30) as resp:
                exts = json.loads(resp.read()).get("records", [])
            vm_entries: list[dict] = []
            for ext in exts[:30]:  # cap to avoid rate limits
                ext_id = ext.get("id")
                if not ext_id:
                    continue
                try:
                    url2 = f"{server}/restapi/v1.0/account/~/extension/{ext_id}/message-store?messageType=VoiceMail&dateFrom={date_from}&perPage=20"
                    req2 = urllib.request.Request(url2, headers=hdrs)
                    with urllib.request.urlopen(req2, timeout=20) as resp2:
                        msgs = json.loads(resp2.read()).get("records", [])
                except urllib.error.HTTPError:
                    continue
                except Exception:
                    continue
                for m in msgs:
                    creation = m.get("creationTime", "")
                    vm_entries.append({
                        "id": f"{ext_id}-{m.get('id')}",
                        "masked_from": mask_phone(m.get("from", {}).get("phoneNumber", "")),
                        "at": creation,
                        "duration_sec": int(m.get("attachments", [{}])[0].get("vmDuration", 0) or 0),
                        "transcript_available": False,
                        "transcript_summary": None,
                    })
            if vm_entries:
                voicemails["status"] = "live"
                voicemails["note"] = f"Showing voicemails from {len(exts)} scanned extensions. Transcripts not fetched."
                voicemails["entries"] = sorted(vm_entries, key=lambda x: x.get("at", ""), reverse=True)[:10]
        except Exception as e:
            voicemails["status"] = "transcripts_unavailable"
            voicemails["note"] = (
                "VM list query returned error — app-only JWT may lack user-context "
                "for message-store on shared extensions. Transcripts require a "
                "premium RC add-on separately. "
                f"(detail: {str(e)[:120]})"
            )

        health["ok"] = True
        health["fetched_at"] = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        health["latency_ms"] = int((time.time() - t0) * 1000)
    except Exception as exc:
        health["error"] = f"{type(exc).__name__}: {exc}"[:400]
        log(f"rc: FAILED {health['error']}")

    return phone, voicemails, health


# ---------------- Microsoft 365 Graph ---------------- #

def m365_get_token(creds: dict) -> str:
    data = urllib.parse.urlencode({
        "grant_type": "client_credentials",
        "client_id": creds["client_id"],
        "client_secret": creds["client_secret"],
        "scope": "https://graph.microsoft.com/.default",
    }).encode()
    req = urllib.request.Request(
        creds["token_endpoint"],
        data=data,
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read())["access_token"]


def m365_unread_age_hours(token: str, upn: str, older_than_hours: float) -> tuple[int, float | None]:
    """Returns (count of unread messages older than X hours, oldest age hours)."""
    cutoff = (datetime.now(timezone.utc) - timedelta(hours=older_than_hours)).strftime("%Y-%m-%dT%H:%M:%SZ")
    qs = urllib.parse.urlencode({
        "$filter": f"isRead eq false and receivedDateTime lt {cutoff}",
        "$select": "id,receivedDateTime,isRead,subject",
        "$top": "50",
        "$orderby": "receivedDateTime asc",
    })
    url = f"https://graph.microsoft.com/v1.0/users/{urllib.parse.quote(upn)}/mailFolders/inbox/messages?{qs}"
    req = urllib.request.Request(url, headers={"Authorization": f"Bearer {token}"})
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read())
    except urllib.error.HTTPError as e:
        raise RuntimeError(f"graph {upn} http {e.code}") from e
    msgs = data.get("value", [])
    if not msgs:
        return 0, None
    oldest = msgs[0].get("receivedDateTime")
    if oldest:
        try:
            oldest_dt = datetime.fromisoformat(oldest.replace("Z", "+00:00"))
            age_h = (datetime.now(timezone.utc) - oldest_dt).total_seconds() / 3600
        except ValueError:
            age_h = None
    else:
        age_h = None
    return len(msgs), age_h


def m365_collect(m365_creds: dict) -> tuple[list[dict], int, dict]:
    """Returns (pending_queue list, inquiries_today_estimate, source health dict)."""
    health = {"ok": False, "error": None, "fetched_at": None, "latency_ms": None}
    t0 = time.time()
    pending: list[dict] = []
    inquiries_today = 0
    try:
        token = m365_get_token(m365_creds)

        mailboxes = [
            ("prescriptions.rx@exulthealthcare.com", "Rx requests >24h", 24, "prescriptions.rx@"),
            ("referrals@exulthealthcare.com", "Referrals >48h", 48, "referrals@"),
            ("shaye.lemieux@exulthealthcare.com", "Shaye unread >8h", 8, "shaye.lemieux@"),
        ]
        for upn, label, hours, src in mailboxes:
            try:
                count, oldest_h = m365_unread_age_hours(token, upn, hours)
                pending.append({
                    "label": label,
                    "count": count,
                    "oldest_age_hours": oldest_h,
                    "source": src,
                })
            except Exception as e:
                pending.append({
                    "label": label,
                    "count": 0,
                    "oldest_age_hours": None,
                    "source": f"{src} (error: {str(e)[:60]})",
                })

        # Inquiries today: emails received today in shaye + referrals (proxy for inbound new-patient interest)
        midnight_utc = datetime.now(TZ).replace(hour=0, minute=0, second=0, microsecond=0).astimezone(timezone.utc)
        cutoff = midnight_utc.strftime("%Y-%m-%dT%H:%M:%SZ")
        for upn in ("shaye.lemieux@exulthealthcare.com", "referrals@exulthealthcare.com"):
            qs = urllib.parse.urlencode({
                "$filter": f"receivedDateTime ge {cutoff}",
                "$select": "id",
                "$top": "200",
                "$count": "true",
            })
            url = f"https://graph.microsoft.com/v1.0/users/{urllib.parse.quote(upn)}/mailFolders/inbox/messages?{qs}"
            req = urllib.request.Request(url, headers={"Authorization": f"Bearer {token}", "ConsistencyLevel": "eventual"})
            try:
                with urllib.request.urlopen(req, timeout=30) as resp:
                    data = json.loads(resp.read())
                inquiries_today += int(data.get("@odata.count") or len(data.get("value", [])))
            except urllib.error.HTTPError:
                pass

        health["ok"] = True
        health["fetched_at"] = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        health["latency_ms"] = int((time.time() - t0) * 1000)
    except Exception as exc:
        health["error"] = f"{type(exc).__name__}: {exc}"[:400]
        log(f"m365: FAILED {health['error']}")

    return pending, inquiries_today, health


# ---------------- Assemble snapshot + POST ---------------- #

def build_snapshot(
    amd_data: dict,
    amd_health: dict,
    phone: dict,
    voicemails: dict,
    rc_health: dict,
    pending: list[dict],
    inquiries_today: int,
    m365_health: dict,
) -> dict:
    today_date = datetime.now(TZ).date()
    yest_date = today_date - timedelta(days=1)

    today = amd_data["today"]
    yesterday = amd_data["yesterday"]

    # Build funnel (rough proxy: inquiries = today's emails to shaye/referrals;
    # booked = today's appts with NEW in type; arrived = status Seen or Arrived; first_charge = 0 blocked)
    booked_today = today["new_patients"]
    arrived_today = (today["by_status"].get("Seen", 0) + today["by_status"].get("Arrived", 0))
    first_charge_today = 0
    funnel_today = {
        "date": today_date.isoformat(),
        "inquiries": inquiries_today,
        "booked": booked_today,
        "arrived": arrived_today,
        "first_charge": first_charge_today,
    }
    conv = None
    if inquiries_today > 0:
        conv = 100.0 * booked_today / inquiries_today

    snapshot = {
        "generated_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "schema_version": 1,
        "timezone": "America/Chicago",
        "today_date": today_date.isoformat(),
        "yesterday_date": yest_date.isoformat(),
        "hero": {
            "visits_seen_today": today["by_status"].get("Seen", 0),
            "visits_scheduled_today": today["total"],
            "collections_today_usd": None,
            "collections_mtd_usd": None,
            "new_patients_today": today["new_patients"],
            "missed_calls_today": phone["today_missed"],
        },
        "today": today,
        "yesterday": yesterday,
        "phone": phone,
        "funnel": {
            "today": funnel_today,
            "last_30d": [],
            "conversion_inquiry_to_booked_pct": conv,
        },
        "pending": pending,
        "revenue": {
            "today_collected_usd": None,
            "mtd_collected_usd": None,
            "last_month_mtd_collected_usd": None,
            "collections_rate_pct": None,
            "status": "blocked",
            "note": "AMD billing API not yet unblocked — need gettxhistory privilege on service account.",
        },
        "voicemails": voicemails,
        "sources": {
            "amd": amd_health,
            "ringcentral": rc_health,
            "microsoft365": m365_health,
        },
    }
    return snapshot


def post_snapshot(snapshot: dict, dashboard_url: str, secret: str) -> bool:
    url = f"{dashboard_url.rstrip('/')}/api/ingest"
    data = json.dumps(snapshot).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data,
        headers={
            "Content-Type": "application/json",
            "X-Ingest-Secret": secret,
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            body = resp.read()
            log(f"ingest: {resp.status} {body[:120]!r}")
            return resp.status < 300
    except urllib.error.HTTPError as e:
        log(f"ingest: HTTP {e.code} {e.read()[:200]!r}")
        return False
    except Exception as e:
        log(f"ingest: FAIL {e}")
        return False


def main() -> int:
    env = load_env()
    fallback = load_fallback_creds()

    amd_creds = {
        "username": env.get("AMD_SA_USER") or (fallback["amd"] or {}).get("username"),
        "password": env.get("AMD_SA_PASSWORD") or (fallback["amd"] or {}).get("password"),
        "office_key": env.get("AMD_OFFICE") or (fallback["amd"] or {}).get("office_key"),
    }
    rc_creds = {
        "client_id": env.get("RC_CLIENT_ID") or (fallback["rc"] or {}).get("client_id"),
        "client_secret": env.get("RC_CLIENT_SECRET") or (fallback["rc"] or {}).get("client_secret"),
        "jwt": env.get("RC_JWT") or (fallback["rc"] or {}).get("jwt"),
        "server": (fallback["rc"] or {}).get("server", "https://platform.ringcentral.com"),
    }
    m365_creds = {
        "client_id": env.get("M365_CLIENT_ID") or (fallback["m365"] or {}).get("client_id"),
        "client_secret": env.get("M365_CLIENT_SECRET") or (fallback["m365"] or {}).get("client_secret"),
        "tenant_id": env.get("M365_TENANT_ID") or (fallback["m365"] or {}).get("tenant_id"),
        "token_endpoint": (fallback["m365"] or {}).get("token_endpoint"),
    }
    if not m365_creds.get("token_endpoint") and m365_creds.get("tenant_id"):
        m365_creds["token_endpoint"] = (
            f"https://login.microsoftonline.com/{m365_creds['tenant_id']}/oauth2/v2.0/token"
        )

    dashboard_url = env.get("DASHBOARD_URL")
    secret = env.get("INGEST_SECRET")
    if not dashboard_url or not secret:
        log(f"refresher: missing DASHBOARD_URL or INGEST_SECRET in {CONFIG_ENV} / env")
        # Still run the data collection to help debugging, but write snapshot to disk

    log("refresher: starting data collection")

    amd_data, amd_health = amd_collect(amd_creds)
    phone, voicemails, rc_health = rc_collect(rc_creds)
    pending, inquiries_today, m365_health = m365_collect(m365_creds)

    snapshot = build_snapshot(
        amd_data,
        amd_health,
        phone,
        voicemails,
        rc_health,
        pending,
        inquiries_today,
        m365_health,
    )

    # Write local snapshot for debugging
    debug_path = HERE / "last_snapshot.json"
    debug_path.write_text(json.dumps(snapshot, indent=2))
    os.chmod(debug_path, 0o600)
    log(f"refresher: snapshot written to {debug_path}")

    if dashboard_url and secret:
        ok = post_snapshot(snapshot, dashboard_url, secret)
        if not ok:
            log("refresher: ingest POST failed")
            return 2
    else:
        log("refresher: skipping POST (no DASHBOARD_URL)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
