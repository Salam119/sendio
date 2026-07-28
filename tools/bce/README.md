# Sendio BCE index

This tool builds and maintains a private SQLite processing database from Belgian BCE/KBO Open Data. It does not write BCE records to Supabase and the public website does not read the SQLite database directly.

## Data flow

```text
BCE Full.zip -> private SQLite -> compressed R2 shards -> Sendio lookup API
```

The raw BCE archives and SQLite database stay outside Git. R2 receives only the generated lookup shards.

## Files kept outside Git

- `data/bce/sendio-bce.sqlite`
- BCE `Full.zip` and `Update.zip` downloads
- generated R2 index directories

## Inspect an archive

```powershell
python tools/bce/bce_index.py inspect-archive --zip "C:\path\KboOpenData_Full.zip"
```

## Build the first database

```powershell
python tools/bce/bce_index.py build-full --zip "C:\path\KboOpenData_Full.zip" --db "data\bce\sendio-bce.sqlite"
```

## Apply one daily update

Apply update files in extract-number order. The tool rejects an update that is already included in the database and rejects sequence gaps. It creates one local backup before applying a valid update.

```powershell
python tools/bce/bce_index.py apply-update --zip "C:\path\KboOpenData_Update.zip" --db "data\bce\sendio-bce.sqlite"
```

## Inspect one enterprise

```powershell
python tools/bce/bce_index.py inspect --db "data\bce\sendio-bce.sqlite" --number "0123.456.789"
```

## Export compressed lookup shards

```powershell
python tools/bce/bce_index.py export-shards --db "data\bce\sendio-bce.sqlite" --out "data\bce\r2-index" --prefix-length 3
```

The output contains:

- `current.json`
- a versioned directory such as `v433`
- `manifest.json`
- gzip-compressed NDJSON shards

## Upload the generated index to R2

The uploader reads the existing Cloudflare R2 variables from `.env.local`, uploads the versioned shards first, verifies each uploaded object, uploads the manifest, and switches `bce/current.json` last.

```powershell
node tools/bce/upload-r2.mjs --index "data\bce\r2-index"
```

Required variables:

```text
CLOUDFLARE_R2_ENDPOINT
CLOUDFLARE_R2_ACCESS_KEY_ID
CLOUDFLARE_R2_SECRET_ACCESS_KEY
CLOUDFLARE_R2_BUCKET_NAME
```

## Safety rules

- Never commit raw BCE archives, generated shards, or SQLite files.
- Never upload the raw BCE archive or SQLite database to R2.
- Build from one current `Full.zip`, then apply later `Update.zip` files in order.
- Never apply an `Update.zip` with the same extract number as the `Full.zip`; that update is already represented by the full snapshot.
- Upload `bce/current.json` only after every versioned shard and the manifest have been verified.
