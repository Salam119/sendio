#!/usr/bin/env python3
from __future__ import annotations

import argparse
import csv
import gzip
import hashlib
import io
import json
import re
import shutil
import sqlite3
import sys
import tempfile
import zipfile
from pathlib import Path
from typing import Iterable, Iterator, Sequence

SCHEMA_VERSION = 2
NUMBER_CLEANER = re.compile(r"\D+")
BATCH_SIZE = 100_000


def normalize_number(value: str) -> str:
    digits = NUMBER_CLEANER.sub("", value or "")
    return digits.zfill(10) if digits else ""


def open_rows(archive: zipfile.ZipFile, filename: str) -> Iterator[list[str]]:
    try:
        raw = archive.open(filename)
    except KeyError as exc:
        raise RuntimeError(f"Missing {filename} in {archive.filename}") from exc
    text = io.TextIOWrapper(raw, encoding="utf-8-sig", newline="")
    reader = csv.reader(text)
    next(reader, None)
    yield from reader


def open_dict_rows(archive: zipfile.ZipFile, filename: str) -> Iterator[dict[str, str]]:
    try:
        raw = archive.open(filename)
    except KeyError as exc:
        raise RuntimeError(f"Missing {filename} in {archive.filename}") from exc
    text = io.TextIOWrapper(raw, encoding="utf-8-sig", newline="")
    yield from csv.DictReader(text)


def read_meta(archive: zipfile.ZipFile) -> dict[str, str]:
    return {
        row.get("Variable", "").strip(): row.get("Value", "").strip()
        for row in open_dict_rows(archive, "meta.csv")
        if row.get("Variable")
    }


def validate_archive_meta(meta: dict[str, str], expected_type: str) -> None:
    if meta.get("ExtractType", "").lower() != expected_type:
        raise RuntimeError(
            f"Expected ExtractType={expected_type}, found {meta.get('ExtractType', '')!r}"
        )
    if not meta.get("ExtractNumber") or not meta.get("SnapshotDate"):
        raise RuntimeError("Archive metadata is missing ExtractNumber or SnapshotDate")


def connect_db(path: Path, fast_build: bool = False) -> sqlite3.Connection:
    path.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(path)
    connection.execute("PRAGMA foreign_keys=ON")
    connection.execute("PRAGMA busy_timeout=30000")
    if fast_build:
        connection.execute("PRAGMA journal_mode=OFF")
        connection.execute("PRAGMA synchronous=OFF")
        connection.execute("PRAGMA locking_mode=EXCLUSIVE")
        connection.execute("PRAGMA temp_store=MEMORY")
        connection.execute("PRAGMA cache_size=-262144")
    else:
        connection.execute("PRAGMA journal_mode=WAL")
        connection.execute("PRAGMA synchronous=FULL")
    return connection


def create_schema(connection: sqlite3.Connection) -> None:
    connection.executescript(
        """
        CREATE TABLE IF NOT EXISTS metadata (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
        ) WITHOUT ROWID;

        CREATE TABLE IF NOT EXISTS enterprises (
          enterprise_number TEXT PRIMARY KEY,
          status_code TEXT NOT NULL,
          juridical_situation_code TEXT,
          enterprise_type_code TEXT,
          legal_form_code TEXT,
          legal_form_cac_code TEXT,
          start_date TEXT
        ) WITHOUT ROWID;

        CREATE TABLE IF NOT EXISTS selected_names (
          entity_number TEXT PRIMARY KEY,
          language_code TEXT NOT NULL,
          denomination_type_code TEXT NOT NULL,
          denomination TEXT NOT NULL
        ) WITHOUT ROWID;

        CREATE TABLE IF NOT EXISTS selected_addresses (
          entity_number TEXT PRIMARY KEY,
          address_type_code TEXT NOT NULL,
          country_nl TEXT,
          country_fr TEXT,
          zipcode TEXT,
          municipality_nl TEXT,
          municipality_fr TEXT,
          street_nl TEXT,
          street_fr TEXT,
          house_number TEXT,
          box TEXT,
          extra_info TEXT,
          striking_off_date TEXT
        ) WITHOUT ROWID;

        CREATE TABLE IF NOT EXISTS codes (
          category TEXT NOT NULL,
          code TEXT NOT NULL,
          language TEXT NOT NULL,
          description TEXT NOT NULL,
          PRIMARY KEY (category, code, language)
        ) WITHOUT ROWID;
        """
    )


def batched(rows: Iterable[tuple], size: int = BATCH_SIZE) -> Iterator[list[tuple]]:
    batch: list[tuple] = []
    for row in rows:
        batch.append(row)
        if len(batch) >= size:
            yield batch
            batch = []
    if batch:
        yield batch


def load_many(connection: sqlite3.Connection, sql: str, rows: Iterable[tuple]) -> int:
    count = 0
    for batch in batched(rows):
        connection.executemany(sql, batch)
        count += len(batch)
    return count


def enterprise_rows(rows: Iterable[Sequence[str]]) -> Iterator[tuple]:
    for row in rows:
        if len(row) < 7:
            continue
        number = normalize_number(row[0])
        if number:
            yield (
                number,
                row[1].strip(),
                row[2].strip(),
                row[3].strip(),
                row[4].strip(),
                row[5].strip(),
                row[6].strip(),
            )


def name_priority(row: Sequence[str]) -> tuple[int, int, str]:
    type_priority = {"001": 0, "002": 1, "003": 2}
    language_priority = {"2": 0, "1": 1, "3": 2, "4": 3, "0": 4}
    return (
        type_priority.get(row[2].strip(), 9),
        language_priority.get(row[1].strip(), 9),
        row[3].strip(),
    )


def selected_name_rows(
    rows: Iterable[Sequence[str]],
    allowed_numbers: set[str] | None = None,
) -> Iterator[tuple]:
    current_number = ""
    candidates: list[Sequence[str]] = []
    previous_number = ""

    def emit(number: str, values: list[Sequence[str]]) -> tuple | None:
        valid = [row for row in values if len(row) >= 4 and row[3].strip()]
        if not number or not valid:
            return None
        if allowed_numbers is not None and number not in allowed_numbers:
            return None
        best = min(valid, key=name_priority)
        return (number, best[1].strip(), best[2].strip(), best[3].strip())

    for row in rows:
        if len(row) < 4:
            continue
        number = normalize_number(row[0])
        if not number:
            continue
        if previous_number and number < previous_number:
            raise RuntimeError("denomination.csv is not sorted by EntityNumber")
        previous_number = number
        if current_number and number != current_number:
            result = emit(current_number, candidates)
            if result:
                yield result
            candidates = []
        current_number = number
        candidates.append(row)

    result = emit(current_number, candidates)
    if result:
        yield result


def address_priority(row: Sequence[str]) -> tuple[int, int, str]:
    active_priority = 0 if not row[12].strip() else 1
    type_priority = 0 if row[1].strip() == "REGO" else 1
    return (active_priority, type_priority, row[1].strip())


def selected_address_rows(
    rows: Iterable[Sequence[str]],
    allowed_numbers: set[str] | None = None,
) -> Iterator[tuple]:
    current_number = ""
    candidates: list[Sequence[str]] = []
    previous_number = ""

    def emit(number: str, values: list[Sequence[str]]) -> tuple | None:
        valid = [row for row in values if len(row) >= 13]
        if not number or not valid:
            return None
        if allowed_numbers is not None and number not in allowed_numbers:
            return None
        best = min(valid, key=address_priority)
        return (
            number,
            best[1].strip(),
            best[2].strip(),
            best[3].strip(),
            best[4].strip(),
            best[5].strip(),
            best[6].strip(),
            best[7].strip(),
            best[8].strip(),
            best[9].strip(),
            best[10].strip(),
            best[11].strip(),
            best[12].strip(),
        )

    for row in rows:
        if len(row) < 13:
            continue
        number = normalize_number(row[0])
        if not number:
            continue
        if previous_number and number < previous_number:
            raise RuntimeError("address.csv is not sorted by EntityNumber")
        previous_number = number
        if current_number and number != current_number:
            result = emit(current_number, candidates)
            if result:
                yield result
            candidates = []
        current_number = number
        candidates.append(row)

    result = emit(current_number, candidates)
    if result:
        yield result


def code_rows(rows: Iterable[Sequence[str]]) -> Iterator[tuple]:
    for row in rows:
        if len(row) >= 4:
            yield tuple(value.strip() for value in row[:4])


def replace_metadata(connection: sqlite3.Connection, values: dict[str, str]) -> None:
    connection.executemany(
        "INSERT OR REPLACE INTO metadata(key, value) VALUES (?, ?)", values.items()
    )


def remove_database_files(db_path: Path) -> None:
    db_path.unlink(missing_ok=True)
    Path(f"{db_path}-wal").unlink(missing_ok=True)
    Path(f"{db_path}-shm").unlink(missing_ok=True)


def build_full(full_zip: Path, db_path: Path) -> None:
    remove_database_files(db_path)
    connection = connect_db(db_path, fast_build=True)
    create_schema(connection)

    with zipfile.ZipFile(full_zip) as archive:
        meta = read_meta(archive)
        validate_archive_meta(meta, "full")

        print("Loading enterprise.csv...", flush=True)
        enterprise_count = load_many(
            connection,
            "INSERT INTO enterprises VALUES (?, ?, ?, ?, ?, ?, ?)",
            enterprise_rows(open_rows(archive, "enterprise.csv")),
        )
        connection.commit()

        enterprise_numbers = {
            row[0] for row in connection.execute("SELECT enterprise_number FROM enterprises")
        }

        print("Selecting names from denomination.csv...", flush=True)
        name_count = load_many(
            connection,
            "INSERT INTO selected_names VALUES (?, ?, ?, ?)",
            selected_name_rows(
                open_rows(archive, "denomination.csv"), enterprise_numbers
            ),
        )
        connection.commit()

        print("Selecting addresses from address.csv...", flush=True)
        address_count = load_many(
            connection,
            "INSERT INTO selected_addresses VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            selected_address_rows(
                open_rows(archive, "address.csv"), enterprise_numbers
            ),
        )
        connection.commit()
        del enterprise_numbers

        print("Loading code.csv...", flush=True)
        code_count = load_many(
            connection,
            "INSERT OR REPLACE INTO codes VALUES (?, ?, ?, ?)",
            code_rows(open_rows(archive, "code.csv")),
        )

    metadata = {
        "schema_version": str(SCHEMA_VERSION),
        "source_full_file": full_zip.name,
        "enterprise_count": str(enterprise_count),
        "selected_name_count": str(name_count),
        "selected_address_count": str(address_count),
        "code_count": str(code_count),
        **{f"bce_{key}": value for key, value in meta.items()},
    }
    replace_metadata(connection, metadata)
    connection.commit()
    connection.execute("PRAGMA optimize")
    connection.close()
    print(f"Built {db_path}", flush=True)


def values_from_column(
    archive: zipfile.ZipFile, filename: str, column_index: int = 0
) -> list[str]:
    values: list[str] = []
    for row in open_rows(archive, filename):
        if len(row) > column_index:
            number = normalize_number(row[column_index])
            if number:
                values.append(number)
    return values


def delete_numbers(connection: sqlite3.Connection, table: str, column: str, numbers: list[str]) -> None:
    for batch in batched(((number,) for number in numbers)):
        connection.executemany(f"DELETE FROM {table} WHERE {column} = ?", batch)


def get_metadata(connection: sqlite3.Connection) -> dict[str, str]:
    return dict(connection.execute("SELECT key, value FROM metadata"))


def append_entity_number(rows: Iterable[tuple]) -> Iterator[tuple]:
    for row in rows:
        yield (*row, row[0])


def apply_update(update_zip: Path, db_path: Path) -> None:
    if not db_path.exists():
        raise RuntimeError(f"Database does not exist: {db_path}")

    with zipfile.ZipFile(update_zip) as archive:
        meta = read_meta(archive)
        validate_archive_meta(meta, "update")

        connection = connect_db(db_path)
        create_schema(connection)
        current = get_metadata(connection)
        current_extract = int(current.get("bce_ExtractNumber", "0"))
        update_extract = int(meta["ExtractNumber"])

        if update_extract <= current_extract:
            connection.close()
            raise RuntimeError(
                f"Update extract {update_extract} is not newer than database extract {current_extract}"
            )
        if current_extract and update_extract != current_extract + 1:
            connection.close()
            raise RuntimeError(
                f"Missing update sequence: database is {current_extract}, update is {update_extract}"
            )

        backup_path = db_path.with_suffix(db_path.suffix + ".before-update.bak")
        connection.close()
        shutil.copy2(db_path, backup_path)

        connection = connect_db(db_path)
        connection.execute("BEGIN IMMEDIATE")
        try:
            enterprise_deletes = values_from_column(archive, "enterprise_delete.csv")
            denomination_deletes = values_from_column(archive, "denomination_delete.csv")
            address_deletes = values_from_column(archive, "address_delete.csv")

            delete_numbers(connection, "selected_names", "entity_number", enterprise_deletes)
            delete_numbers(connection, "selected_addresses", "entity_number", enterprise_deletes)
            delete_numbers(connection, "enterprises", "enterprise_number", enterprise_deletes)
            delete_numbers(connection, "selected_names", "entity_number", denomination_deletes)
            delete_numbers(connection, "selected_addresses", "entity_number", address_deletes)

            load_many(
                connection,
                "INSERT OR REPLACE INTO enterprises VALUES (?, ?, ?, ?, ?, ?, ?)",
                enterprise_rows(open_rows(archive, "enterprise_insert.csv")),
            )
            load_many(
                connection,
                """
                INSERT OR REPLACE INTO selected_names
                SELECT ?, ?, ?, ?
                WHERE EXISTS (
                  SELECT 1 FROM enterprises WHERE enterprise_number = ?
                )
                """,
                append_entity_number(
                    selected_name_rows(open_rows(archive, "denomination_insert.csv"))
                ),
            )
            load_many(
                connection,
                """
                INSERT OR REPLACE INTO selected_addresses
                SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
                WHERE EXISTS (
                  SELECT 1 FROM enterprises WHERE enterprise_number = ?
                )
                """,
                append_entity_number(
                    selected_address_rows(open_rows(archive, "address_insert.csv"))
                ),
            )
            connection.execute("DELETE FROM codes")
            load_many(
                connection,
                "INSERT OR REPLACE INTO codes VALUES (?, ?, ?, ?)",
                code_rows(open_rows(archive, "code.csv")),
            )
            replace_metadata(
                connection,
                {
                    "last_update_file": update_zip.name,
                    **{f"bce_{key}": value for key, value in meta.items()},
                },
            )
            connection.commit()
        except Exception:
            connection.rollback()
            connection.close()
            shutil.copy2(backup_path, db_path)
            raise
        connection.execute("PRAGMA optimize")
        connection.close()
        print(f"Applied {update_zip.name}", flush=True)


def code_map(connection: sqlite3.Connection, category: str, language: str) -> dict[str, str]:
    return dict(
        connection.execute(
            "SELECT code, description FROM codes WHERE category = ? AND language = ?",
            (category, language),
        )
    )


def shard_record(row: sqlite3.Row, maps: dict[str, dict[str, str]]) -> dict[str, str]:
    legal_code = row["legal_form_code"] or ""
    status_code = row["status_code"] or ""
    return {
        "number": row["enterprise_number"],
        "name": row["denomination"] or "",
        "status_code": status_code,
        "status_fr": maps["status_fr"].get(status_code, ""),
        "status_nl": maps["status_nl"].get(status_code, ""),
        "legal_form_code": legal_code,
        "legal_form_fr": maps["legal_fr"].get(legal_code, ""),
        "legal_form_nl": maps["legal_nl"].get(legal_code, ""),
        "start_date": row["start_date"] or "",
        "postal_code": row["zipcode"] or "",
        "city_fr": row["municipality_fr"] or "",
        "city_nl": row["municipality_nl"] or "",
        "street_fr": row["street_fr"] or row["street_nl"] or "",
        "street_nl": row["street_nl"] or row["street_fr"] or "",
        "house_number": row["house_number"] or "",
        "box": row["box"] or "",
        "country_fr": row["country_fr"] or "",
        "country_nl": row["country_nl"] or "",
    }


def export_shards(db_path: Path, output_dir: Path, prefix_length: int = 3) -> None:
    if prefix_length < 2 or prefix_length > 5:
        raise ValueError("prefix-length must be between 2 and 5")

    connection = sqlite3.connect(db_path)
    connection.row_factory = sqlite3.Row
    metadata = get_metadata(connection)
    extract_number = metadata.get("bce_ExtractNumber", "unknown")

    maps = {
        "status_fr": code_map(connection, "Status", "FR"),
        "status_nl": code_map(connection, "Status", "NL"),
        "legal_fr": code_map(connection, "JuridicalForm", "FR"),
        "legal_nl": code_map(connection, "JuridicalForm", "NL"),
    }

    prefix_rows = connection.execute(
        "SELECT substr(enterprise_number, 1, ?), COUNT(*) "
        "FROM enterprises GROUP BY 1 ORDER BY 1",
        (prefix_length,),
    ).fetchall()

    output_dir.parent.mkdir(parents=True, exist_ok=True)
    temp_dir = Path(tempfile.mkdtemp(prefix="bce-shards-", dir=output_dir.parent))
    version_dir = temp_dir / f"v{extract_number}"
    version_dir.mkdir(parents=True)

    shard_metadata: list[dict[str, str | int]] = []
    total = 0

    query = """
      SELECT
        e.enterprise_number, e.status_code, e.legal_form_code, e.start_date,
        n.denomination,
        a.zipcode, a.municipality_fr, a.municipality_nl,
        a.street_fr, a.street_nl, a.house_number, a.box,
        a.country_fr, a.country_nl
      FROM enterprises e
      LEFT JOIN selected_names n ON n.entity_number = e.enterprise_number
      LEFT JOIN selected_addresses a ON a.entity_number = e.enterprise_number
      WHERE e.enterprise_number >= ? AND e.enterprise_number < ?
      ORDER BY e.enterprise_number
    """

    try:
        for index, (prefix, expected_count) in enumerate(prefix_rows, start=1):
            lower_bound = prefix + ("0" * (10 - prefix_length))
            upper_prefix = str(int(prefix) + 1).zfill(prefix_length)
            upper_bound = upper_prefix + ("0" * (10 - prefix_length))
            shard_path = version_dir / f"{prefix}.ndjson.gz"
            actual_count = 0

            print(
                f"Exporting shard {index}/{len(prefix_rows)}: {prefix}",
                flush=True,
            )

            with gzip.open(
                shard_path,
                "wt",
                encoding="utf-8",
                newline="\n",
                compresslevel=6,
            ) as handle:
                for row in connection.execute(query, (lower_bound, upper_bound)):
                    handle.write(
                        json.dumps(
                            shard_record(row, maps),
                            ensure_ascii=False,
                            separators=(",", ":"),
                        )
                        + "\n"
                    )
                    actual_count += 1

            if actual_count != expected_count:
                raise RuntimeError(
                    f"Shard {prefix} count mismatch: expected {expected_count}, found {actual_count}"
                )

            digest = hashlib.sha256(shard_path.read_bytes()).hexdigest()
            shard_metadata.append(
                {
                    "prefix": prefix,
                    "key": f"bce/v{extract_number}/{prefix}.ndjson.gz",
                    "count": actual_count,
                    "sha256": digest,
                    "size_bytes": shard_path.stat().st_size,
                }
            )
            total += actual_count

        manifest = {
            "schema_version": SCHEMA_VERSION,
            "format": "ndjson+gzip",
            "prefix_length": prefix_length,
            "extract_number": extract_number,
            "snapshot_date": metadata.get("bce_SnapshotDate", ""),
            "extract_timestamp": metadata.get("bce_ExtractTimestamp", ""),
            "enterprise_count": total,
            "version_prefix": f"bce/v{extract_number}",
            "shards": shard_metadata,
        }
        (version_dir / "manifest.json").write_text(
            json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8"
        )
        (temp_dir / "current.json").write_text(
            json.dumps(
                {
                    "extract_number": extract_number,
                    "manifest_key": f"bce/v{extract_number}/manifest.json",
                },
                ensure_ascii=False,
                indent=2,
            ),
            encoding="utf-8",
        )

        if output_dir.exists():
            shutil.rmtree(output_dir)
        temp_dir.rename(output_dir)
    except Exception:
        shutil.rmtree(temp_dir, ignore_errors=True)
        raise
    finally:
        connection.close()

    print(f"Exported {total} enterprises into {len(shard_metadata)} shards", flush=True)

def inspect_company(db_path: Path, number: str) -> None:
    normalized = normalize_number(number)
    connection = sqlite3.connect(db_path)
    connection.row_factory = sqlite3.Row
    row = connection.execute(
        """
        SELECT e.*, n.denomination, a.*
        FROM enterprises e
        LEFT JOIN selected_names n ON n.entity_number = e.enterprise_number
        LEFT JOIN selected_addresses a ON a.entity_number = e.enterprise_number
        WHERE e.enterprise_number = ?
        """,
        (normalized,),
    ).fetchone()
    result = {"found": row is not None, "number": normalized}
    if row is not None:
        result["company"] = dict(row)
    print(json.dumps(result, ensure_ascii=False, indent=2))
    connection.close()


def inspect_archive(path: Path) -> None:
    with zipfile.ZipFile(path) as archive:
        meta = read_meta(archive)
        result = {
            "file": path.name,
            "size_bytes": path.stat().st_size,
            "uncompressed_bytes": sum(item.file_size for item in archive.infolist()),
            "metadata": meta,
            "files": [
                {
                    "name": item.filename,
                    "size_bytes": item.file_size,
                    "compressed_bytes": item.compress_size,
                }
                for item in archive.infolist()
            ],
        }
    print(json.dumps(result, ensure_ascii=False, indent=2))


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Build and maintain the Sendio BCE lookup index")
    sub = parser.add_subparsers(dest="command", required=True)

    archive = sub.add_parser("inspect-archive")
    archive.add_argument("--zip", required=True, type=Path)

    build = sub.add_parser("build-full")
    build.add_argument("--zip", required=True, type=Path)
    build.add_argument("--db", required=True, type=Path)

    update = sub.add_parser("apply-update")
    update.add_argument("--zip", required=True, type=Path)
    update.add_argument("--db", required=True, type=Path)

    export = sub.add_parser("export-shards")
    export.add_argument("--db", required=True, type=Path)
    export.add_argument("--out", required=True, type=Path)
    export.add_argument("--prefix-length", type=int, default=3)

    inspect = sub.add_parser("inspect")
    inspect.add_argument("--db", required=True, type=Path)
    inspect.add_argument("--number", required=True)

    return parser.parse_args()


def main() -> int:
    args = parse_args()
    if args.command == "inspect-archive":
        inspect_archive(args.zip)
    elif args.command == "build-full":
        build_full(args.zip, args.db)
    elif args.command == "apply-update":
        apply_update(args.zip, args.db)
    elif args.command == "export-shards":
        export_shards(args.db, args.out, args.prefix_length)
    elif args.command == "inspect":
        inspect_company(args.db, args.number)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
