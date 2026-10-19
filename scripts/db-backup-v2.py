#!/usr/bin/env python3
"""
nextbiz-studio — Postgres daily backup → Cloudflare R2 (joyverse-backups bucket).

- pg_dump (custom format, compressed) from the nextbiz_db docker container
- uploads to R2 bucket `joyverse-backups` (private, generic machine-data bucket)
  via S3-compatible API, using the backups-scoped token
- key layout: nextbiz-studio/db/daily/nextbiz-<stamp>.dump
- keeps 30 daily backups (older pruned by this script)
- creds: ~/.hermes/profiles/kira/.env.cloudflare-r2-backups
  (R2_BACKUPS_ACCESS_KEY_ID / R2_BACKUPS_SECRET_ACCESS_KEY / R2_BACKUPS_BUCKET)
- exit codes: 0 ok, 1 failure (cron can alert on this)

Migration note (Oct 18): v1 of this script uploaded to `joyverse-user-data`
(the MCP user-files partition — wrong bucket). 4 dumps landed there under
backups/nextbiz-db/daily/ before the fix. This v2 uses joyverse-backups with
key prefix nextbiz-studio/db/daily/.
"""
import os
import subprocess
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

import boto3
from botocore.client import Config as BotoConfig

CREDS_FILE = Path.home() / ".hermes/profiles/kira/.env.cloudflare-r2-backups"
CONTAINER = "nextbiz_db"
PG_USER = "nextbiz"
PG_DB = "nextbiz"
KEEP_DAYS = 30
PREFIX = "nextbiz-studio/db/daily/"


def load_creds() -> dict:
    creds = {}
    with open(CREDS_FILE) as f:
        for line in f:
            line = line.strip()
            if "=" in line and not line.startswith("#"):
                k, v = line.split("=", 1)
                creds[k.strip()] = v.strip().strip('\"').strip("'")
    return creds


def main() -> int:
    now = datetime.now(timezone.utc)
    stamp = now.strftime("%Y-%m-%dT%H%M%SZ")
    fname = f"nextbiz-{stamp}.dump"
    tmp = Path(f"/tmp/{fname}")

    creds = load_creds()
    key_id = creds.get("R2_BACKUPS_ACCESS_KEY_ID")
    secret = creds.get("R2_BACKUPS_SECRET_ACCESS_KEY")
    account_id = creds.get("CLOUDFLARE_ACCOUNT_ID")
    bucket = creds.get("R2_BACKUPS_BUCKET", "joyverse-backups")

    if not (key_id and secret and account_id):
        print("[backup] ERROR: incomplete creds in", CREDS_FILE, file=sys.stderr)
        return 1

    # 1. pg_dump from the container (custom format = compressed + restorable)
    print(f"[backup] dumping {PG_DB} from {CONTAINER} ...")
    with open(tmp, "wb") as out:
        rc = subprocess.call(
            [ "docker", "exec", CONTAINER, "pg_dump", "-U", PG_USER, "-d", PG_DB, "-Fc" ],
            stdout=out,
        )
    if rc != 0 or not tmp.exists() or tmp.stat().st_size == 0:
        print(f"[backup] FAILED: pg_dump rc={rc}", file=sys.stderr)
        tmp.unlink(missing_ok=True)
        return 1
    print(f"[backup] dump ok: {fname} ({tmp.stat().st_size} bytes)")

    s3 = boto3.client(
        "s3",
        endpoint_url=f"https://{account_id}.r2.cloudflarestorage.com",
        aws_access_key_id=key_id,
        aws_secret_access_key=secret,
        region_name="auto",
        config=BotoConfig(signature_version="s3v4"),
    )

    # 2. upload
    key = f"{PREFIX}{fname}"
    try:
        s3.upload_file(str(tmp), bucket, key)
    except Exception as e:
        print(f"[backup] FAILED upload: {e}", file=sys.stderr)
        tmp.unlink(missing_ok=True)
        return 1
    print(f"[backup] uploaded s3://{bucket}/{key}")

    # 3. prune > KEEP_DAYS
    try:
        cutoff = (now - timedelta(days=KEEP_DAYS)).strftime("%Y-%m-%dT")
        resp = s3.list_objects_v2(Bucket=bucket, Prefix=PREFIX)
        for obj in resp.get("Contents", []):
            key = obj["Key"]
            if key.split("/")[-1] < cutoff:
                s3.delete_object(Bucket=bucket, Key=key)
                print(f"[backup] pruned {key}")
    except Exception as e:
        print(f"[backup] WARN: prune failed (non-fatal): {e}", file=sys.stderr)

    # 4. verify by head (size match = upload integrity)
    try:
        head = s3.head_object(Bucket=bucket, Key=key)
        if head["ContentLength"] != tmp.stat().st_size:
            print(f"[backup] FAILED verify: size mismatch", file=sys.stderr)
            return 1
        print(f"[backup] verified: s3://{bucket}/{key} ({head['ContentLength']} bytes)")
    except Exception as e:
        print(f"[backup] WARN: verify head failed: {e}", file=sys.stderr)

    tmp.unlink(missing_ok=True)
    print("[backup] done")
    return 0


if __name__ == "__main__":
    sys.exit(main())
