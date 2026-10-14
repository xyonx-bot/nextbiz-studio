#!/usr/bin/env python3
"""
nextbiz-studio — Postgres daily backup → Cloudflare R2.

- pg_dump (custom format, compressed) from the nextbiz_db docker container
- uploads to R2 bucket `nextbiz-db-backups` (private) via S3-compatible API
- keeps 30 daily backups in R2 (older ones deleted by this script — R2
  lifecycle rules could do it too, but self-contained is simpler here)
- creds: ~/.hermes/profiles/mira/.env.cloudflare-r2 (account-level R2 keys)
- exit codes: 0 ok, 1 failure (cron can alert on this)
"""
import os
import subprocess
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

import boto3
from botocore.client import Config as BotoConfig

CREDS_FILE = Path.home() / ".hermes/profiles/mira/.env.cloudflare-r2"
BUCKET = os.environ.get("R2_BACKUP_BUCKET", "joyverse-user-data")
CONTAINER = "nextbiz_db"
PG_USER = "nextbiz"
PG_DB = "nextbiz"
KEEP_DAYS = 30


def load_creds() -> dict:
    creds = {}
    with open(CREDS_FILE) as f:
        for line in f:
            line = line.strip()
            if "=" in line and not line.startswith("#"):
                k, v = line.split("=", 1)
                creds[k.strip()] = v.strip().strip('"').strip("'")
    return creds


def main() -> int:
    now = datetime.now(timezone.utc)
    stamp = now.strftime("%Y-%m-%dT%H%M%SZ")
    fname = f"nextbiz-{stamp}.dump"
    tmp = Path(f"/tmp/{fname}")

    # 1. pg_dump from the container (custom format = compressed + restorable)
    print(f"[backup] dumping {PG_DB} from {CONTAINER} …")
    with open(tmp, "wb") as out:
        rc = subprocess.call(
            ["docker", "exec", CONTAINER, "pg_dump", "-U", PG_USER, "-d", PG_DB, "-Fc"],
            stdout=out,
        )
    if rc != 0:
        print("[backup] FAILED: pg_dump exited non-zero", file=sys.stderr)
        return 1
    size = tmp.stat().st_size
    print(f"[backup] dump ok: {fname} ({size} bytes)")

    # 2. upload to R2 (S3-compatible endpoint, account R2 keys)
    creds = load_creds()
    s3 = boto3.client(
        "s3",
        endpoint_url=creds["R2_S3_ENDPOINT"],
        aws_access_key_id=creds["CLOUDFLARE_R2_ACCESS_KEY_ID"],
        aws_secret_access_key=creds["CLOUDFLARE_R2_SECRET_ACCESS_KEY"],
        config=BotoConfig(signature_version="s3v4"),
        region_name="auto",
    )

    # ensure bucket exists (idempotent; R2 S3 API supports CreateBucket)
    try:
        s3.head_bucket(Bucket=BUCKET)
    except Exception:
        s3.create_bucket(Bucket=BUCKET)
        print(f"[backup] created bucket {BUCKET}")

    key = f"backups/nextbiz-db/daily/{fname}"
    s3.upload_file(str(tmp), BUCKET, key)
    print(f"[backup] uploaded s3://{BUCKET}/{key}")

    # 3. prune: keep last KEEP_DAYS daily dumps
    cutoff = (now - timedelta(days=KEEP_DAYS)).strftime("%Y-%m-%dT")
    resp = s3.list_objects_v2(Bucket=BUCKET, Prefix="backups/nextbiz-db/daily/")
    objs = [o for o in resp.get("Contents", []) if o["Key"] < f"backups/nextbiz-db/daily/nextbiz-{cutoff}"]
    for o in objs:
        s3.delete_object(Bucket=BUCKET, Key=o["Key"])
        print(f"[backup] pruned {o['Key']}")

    tmp.unlink(missing_ok=True)
    print("[backup] done")
    return 0


if __name__ == "__main__":
    sys.exit(main())
