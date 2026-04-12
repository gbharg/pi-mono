#!/usr/bin/env python3
"""Probe M365 tenant for mailboxes matching request/prescriptions/shaye."""
import sys
import urllib.parse

sys.path.insert(0, "/Users/agent/pi-mono/.pi/services/daily_tracker")
from graph_util import GRAPH_V1, acquire_token, call

token = acquire_token()
print("token acquired")

# 1) List groups - request@ was supposedly a group
for target in ["request", "prescription", "shaye", "referral"]:
    url = f"{GRAPH_V1}/users?$filter=startswith(mail,'{target}')&$select=id,mail,userPrincipalName,displayName"
    try:
        resp = call("GET", url, token, extra_headers={"ConsistencyLevel": "eventual"})
        vs = resp.get("value", []) if resp else []
        print(f"USERS matching mail startswith '{target}':")
        for u in vs:
            print(f"  {u.get('mail','')}  ({u.get('displayName','')})  id={u['id']}")
    except Exception as e:
        print(f"user lookup err: {e}")

    url = f"{GRAPH_V1}/groups?$filter=startswith(mail,'{target}')&$select=id,mail,displayName,groupTypes,mailEnabled"
    try:
        resp = call("GET", url, token, extra_headers={"ConsistencyLevel": "eventual"})
        vs = resp.get("value", []) if resp else []
        print(f"GROUPS matching mail startswith '{target}':")
        for g in vs:
            print(f"  {g.get('mail','')}  ({g.get('displayName','')})  id={g['id']} types={g.get('groupTypes')}")
    except Exception as e:
        print(f"group lookup err: {e}")
    print()

# 2) Quick sanity: list all users
print("\nAll mailbox-enabled users (first 30):")
try:
    resp = call("GET", f"{GRAPH_V1}/users?$select=mail,displayName,id&$top=50", token)
    for u in resp.get("value", []):
        if u.get("mail"):
            print(f"  {u['mail']}  ({u['displayName']})")
except Exception as e:
    print(f"err: {e}")
