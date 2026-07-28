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
from urllib.parse import urlparse

SCHEMA_VERSION = 2
NUMBER_CLEANER = re.compile(r"\D+")
EMAIL_PATTERN = re.compile(
    r"^[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?"
    r"(?:\.[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?)+$",
    re.IGNORECASE,
)
BATCH_SIZE = 100_000


def configure_utf8_output() -> None:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="strict")


configure_utf8_output()


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


def open_dict_rows(
    archive: zipfile.ZipFile,
    filename: str,
) -> Iterator[dict[str, str]]:
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


def validate_archive_meta(meta: dict[str, str]) -> None:
    if meta.get("ExtractType", "").lower() != "full":
        raise RuntimeError(
            f"Expected ExtractType=full, found {meta.get('ExtractType', '')!r}"
        )

    if not meta.get("ExtractNumber") or not meta.get("SnapshotDate"):
        raise RuntimeError(
            "Archive metadata is missing ExtractNumber or SnapshotDate"
        )


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

        CREATE TABLE IF NOT EXISTS establishments (
          establishment_number TEXT PRIMARY KEY,
          enterprise_number TEXT NOT NULL,
          start_date TEXT,
          FOREIGN KEY (enterprise_number)
            REFERENCES enterprises(enterprise_number)
            ON DELETE CASCADE
        ) WITHOUT ROWID;

        CREATE INDEX IF NOT EXISTS idx_establishments_enterprise
          ON establishments(enterprise_number);

        CREATE TABLE IF NOT EXISTS branches (
          branch_number TEXT PRIMARY KEY,
          enterprise_number TEXT NOT NULL,
          start_date TEXT,
          FOREIGN KEY (enterprise_number)
            REFERENCES enterprises(enterprise_number)
            ON DELETE CASCADE
        ) WITHOUT ROWID;

        CREATE INDEX IF NOT EXISTS idx_branches_enterprise
          ON branches(enterprise_number);

        CREATE TABLE IF NOT EXISTS entities (
          entity_number TEXT PRIMARY KEY,
          enterprise_number TEXT NOT NULL,
          entity_scope TEXT NOT NULL
            CHECK (entity_scope IN ('ENT', 'EST', 'BRA'))
        ) WITHOUT ROWID;

        CREATE INDEX IF NOT EXISTS idx_entities_enterprise
          ON entities(enterprise_number, entity_scope);

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

        CREATE TABLE IF NOT EXISTS selected_activities (
          entity_number TEXT NOT NULL,
          sort_order INTEGER NOT NULL,
          activity_group TEXT NOT NULL,
          nace_version TEXT NOT NULL,
          nace_code TEXT NOT NULL,
          classification TEXT NOT NULL,
          PRIMARY KEY (entity_number, sort_order)
        ) WITHOUT ROWID;

        CREATE INDEX IF NOT EXISTS idx_selected_activities_entity
          ON selected_activities(entity_number);

        CREATE TABLE IF NOT EXISTS contacts (
          entity_number TEXT NOT NULL,
          entity_contact TEXT NOT NULL
            CHECK (entity_contact IN ('ENT', 'EST', 'BRA')),
          contact_type TEXT NOT NULL
            CHECK (contact_type IN ('EMAIL', 'TEL', 'WEB')),
          raw_value TEXT NOT NULL,
          normalized_value TEXT NOT NULL,
          PRIMARY KEY (
            entity_number,
            entity_contact,
            contact_type,
            normalized_value
          )
        ) WITHOUT ROWID;

        CREATE INDEX IF NOT EXISTS idx_contacts_entity
          ON contacts(entity_number, contact_type);

        CREATE TABLE IF NOT EXISTS codes (
          category TEXT NOT NULL,
          code TEXT NOT NULL,
          language TEXT NOT NULL,
          description TEXT NOT NULL,
          PRIMARY KEY (category, code, language)
        ) WITHOUT ROWID;
        """
    )


def batched(
    rows: Iterable[tuple],
    size: int = BATCH_SIZE,
) -> Iterator[list[tuple]]:
    batch: list[tuple] = []

    for row in rows:
        batch.append(row)

        if len(batch) >= size:
            yield batch
            batch = []

    if batch:
        yield batch


def load_many(
    connection: sqlite3.Connection,
    sql: str,
    rows: Iterable[tuple],
) -> int:
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


def establishment_rows(
    rows: Iterable[Sequence[str]],
) -> Iterator[tuple]:
    for row in rows:
        if len(row) < 3:
            continue

        establishment_number = normalize_number(row[0])
        enterprise_number = normalize_number(row[2])

        if establishment_number and enterprise_number:
            yield (
                establishment_number,
                enterprise_number,
                row[1].strip(),
            )


def branch_rows(rows: Iterable[Sequence[str]]) -> Iterator[tuple]:
    for row in rows:
        if len(row) < 3:
            continue

        branch_number = normalize_number(row[0])
        enterprise_number = normalize_number(row[2])

        if branch_number and enterprise_number:
            yield (
                branch_number,
                enterprise_number,
                row[1].strip(),
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
) -> Iterator[tuple]:
    current_number = ""
    candidates: list[Sequence[str]] = []
    previous_number = ""

    def emit(
        number: str,
        values: list[Sequence[str]],
    ) -> tuple | None:
        valid = [
            row
            for row in values
            if len(row) >= 4 and row[3].strip()
        ]

        if not number or not valid:
            return None

        best = min(valid, key=name_priority)

        return (
            number,
            best[1].strip(),
            best[2].strip(),
            best[3].strip(),
        )

    for row in rows:
        if len(row) < 4:
            continue

        number = normalize_number(row[0])

        if not number:
            continue

        if previous_number and number < previous_number:
            raise RuntimeError(
                "denomination.csv is not sorted by EntityNumber"
            )

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

    return (
        active_priority,
        type_priority,
        row[1].strip(),
    )


def selected_address_rows(
    rows: Iterable[Sequence[str]],
) -> Iterator[tuple]:
    current_number = ""
    candidates: list[Sequence[str]] = []
    previous_number = ""

    def emit(
        number: str,
        values: list[Sequence[str]],
    ) -> tuple | None:
        valid = [row for row in values if len(row) >= 13]

        if not number or not valid:
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
            raise RuntimeError(
                "address.csv is not sorted by EntityNumber"
            )

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


def normalize_email(value: str) -> str | None:
    normalized = value.strip().lower()

    if not normalized or len(normalized) > 320:
        return None

    if " " in normalized or not EMAIL_PATTERN.fullmatch(normalized):
        return None

    return normalized


def normalize_phone(value: str) -> str | None:
    cleaned = value.strip()

    if not cleaned:
        return None

    cleaned = re.sub(r"\(0\)", "", cleaned)
    cleaned = re.split(
        r"(?:ext\.?|extension|poste|post)\s*\d+",
        cleaned,
        maxsplit=1,
        flags=re.IGNORECASE,
    )[0].strip()

    has_plus = cleaned.startswith("+")
    digits = NUMBER_CLEANER.sub("", cleaned)

    if cleaned.startswith("00"):
        has_plus = True
        digits = digits[2:]

    if has_plus:
        normalized = f"+{digits}"
    elif digits.startswith("32") and 10 <= len(digits) <= 11:
        normalized = f"+{digits}"
    elif digits.startswith("0") and 9 <= len(digits) <= 10:
        normalized = f"+32{digits[1:]}"
    else:
        return None

    international_digits = NUMBER_CLEANER.sub("", normalized)

    if not 8 <= len(international_digits) <= 15:
        return None

    return normalized


def normalize_website(value: str) -> str | None:
    cleaned = value.strip()

    if not cleaned:
        return None

    candidate = cleaned

    if not re.match(r"^[a-z][a-z0-9+.-]*://", candidate, re.IGNORECASE):
        candidate = f"https://{candidate}"

    parsed = urlparse(candidate)
    hostname = (parsed.hostname or "").strip().lower().rstrip(".")

    if not hostname or "." not in hostname:
        return None

    if any(part == "" for part in hostname.split(".")):
        return None

    return hostname


def activity_priority(row: Sequence[str]) -> tuple[int, int, str, str]:
    version_priority = {"2025": 0, "2008": 1, "2003": 2}
    classification_priority = {"MAIN": 0, "SECO": 1, "ANCI": 2}

    return (
        version_priority.get(row[2].strip(), 9),
        classification_priority.get(row[4].strip().upper(), 9),
        row[1].strip(),
        row[3].strip(),
    )


def selected_activity_rows(
    rows: Iterable[Sequence[str]],
    limit_per_entity: int = 3,
) -> Iterator[tuple]:
    current_number = ""
    candidates: list[Sequence[str]] = []
    previous_number = ""

    def emit(
        number: str,
        values: list[Sequence[str]],
    ) -> Iterator[tuple]:
        if not number:
            return

        valid = [
            row
            for row in values
            if len(row) >= 5
            and row[2].strip() in {"2025", "2008", "2003"}
            and row[3].strip()
            and row[4].strip().upper() in {"MAIN", "SECO", "ANCI"}
        ]

        seen_codes: set[tuple[str, str]] = set()
        selected: list[Sequence[str]] = []

        for row in sorted(valid, key=activity_priority):
            key = (row[2].strip(), row[3].strip())

            if key in seen_codes:
                continue

            seen_codes.add(key)
            selected.append(row)

            if len(selected) >= limit_per_entity:
                break

        for index, row in enumerate(selected):
            yield (
                number,
                index,
                row[1].strip(),
                row[2].strip(),
                row[3].strip(),
                row[4].strip().upper(),
            )

    for row in rows:
        if len(row) < 5:
            continue

        number = normalize_number(row[0])

        if not number:
            continue

        if previous_number and number < previous_number:
            raise RuntimeError(
                "activity.csv is not sorted by EntityNumber"
            )

        previous_number = number

        if current_number and number != current_number:
            yield from emit(current_number, candidates)
            candidates = []

        current_number = number
        candidates.append(row)

    yield from emit(current_number, candidates)


def contact_rows(
    rows: Iterable[Sequence[str]],
) -> Iterator[tuple]:
    for row in rows:
        if len(row) < 4:
            continue

        entity_number = normalize_number(row[0])
        entity_contact = row[1].strip().upper()
        contact_type = row[2].strip().upper()
        raw_value = row[3].strip()

        if not entity_number:
            continue

        if entity_contact not in {"ENT", "EST", "BRA"}:
            continue

        if contact_type == "EMAIL":
            normalized_value = normalize_email(raw_value)
        elif contact_type == "TEL":
            normalized_value = normalize_phone(raw_value)
        elif contact_type == "WEB":
            normalized_value = normalize_website(raw_value)
        else:
            continue

        if normalized_value:
            yield (
                entity_number,
                entity_contact,
                contact_type,
                raw_value,
                normalized_value,
            )


def code_rows(rows: Iterable[Sequence[str]]) -> Iterator[tuple]:
    for row in rows:
        if len(row) >= 4:
            yield tuple(value.strip() for value in row[:4])


def replace_metadata(
    connection: sqlite3.Connection,
    values: dict[str, str],
) -> None:
    connection.executemany(
        "INSERT OR REPLACE INTO metadata(key, value) VALUES (?, ?)",
        values.items(),
    )


def remove_database_files(db_path: Path) -> None:
    db_path.unlink(missing_ok=True)
    Path(f"{db_path}-wal").unlink(missing_ok=True)
    Path(f"{db_path}-shm").unlink(missing_ok=True)


def build_entity_links(connection: sqlite3.Connection) -> None:
    connection.execute(
        """
        INSERT INTO entities(entity_number, enterprise_number, entity_scope)
        SELECT enterprise_number, enterprise_number, 'ENT'
        FROM enterprises
        """
    )
    connection.execute(
        """
        INSERT INTO entities(entity_number, enterprise_number, entity_scope)
        SELECT establishment_number, enterprise_number, 'EST'
        FROM establishments
        """
    )
    connection.execute(
        """
        INSERT INTO entities(entity_number, enterprise_number, entity_scope)
        SELECT branch_number, enterprise_number, 'BRA'
        FROM branches
        """
    )


def delete_orphan_entity_data(connection: sqlite3.Connection) -> None:
    connection.execute(
        """
        DELETE FROM selected_names
        WHERE NOT EXISTS (
          SELECT 1
          FROM entities
          WHERE entities.entity_number = selected_names.entity_number
        )
        """
    )
    connection.execute(
        """
        DELETE FROM selected_addresses
        WHERE NOT EXISTS (
          SELECT 1
          FROM entities
          WHERE entities.entity_number = selected_addresses.entity_number
        )
        """
    )
    connection.execute(
        """
        DELETE FROM selected_activities
        WHERE NOT EXISTS (
          SELECT 1
          FROM entities
          WHERE entities.entity_number = selected_activities.entity_number
        )
        """
    )
    connection.execute(
        """
        DELETE FROM contacts
        WHERE NOT EXISTS (
          SELECT 1
          FROM entities
          WHERE entities.entity_number = contacts.entity_number
        )
        """
    )


def build_full(full_zip: Path, db_path: Path) -> None:
    remove_database_files(db_path)
    connection = connect_db(db_path, fast_build=True)
    create_schema(connection)

    try:
        with zipfile.ZipFile(full_zip) as archive:
            meta = read_meta(archive)
            validate_archive_meta(meta)

            print("Loading enterprise.csv...", flush=True)
            enterprise_count = load_many(
                connection,
                "INSERT INTO enterprises VALUES (?, ?, ?, ?, ?, ?, ?)",
                enterprise_rows(open_rows(archive, "enterprise.csv")),
            )
            connection.commit()

            print("Loading establishment.csv...", flush=True)
            establishment_count = load_many(
                connection,
                "INSERT INTO establishments VALUES (?, ?, ?)",
                establishment_rows(
                    open_rows(archive, "establishment.csv")
                ),
            )
            connection.commit()

            print("Loading branch.csv...", flush=True)
            branch_count = load_many(
                connection,
                "INSERT INTO branches VALUES (?, ?, ?)",
                branch_rows(open_rows(archive, "branch.csv")),
            )
            connection.commit()

            print("Building entity links...", flush=True)
            build_entity_links(connection)
            connection.commit()

            print("Selecting names from denomination.csv...", flush=True)
            selected_name_count = load_many(
                connection,
                "INSERT INTO selected_names VALUES (?, ?, ?, ?)",
                selected_name_rows(
                    open_rows(archive, "denomination.csv")
                ),
            )
            connection.commit()

            print("Selecting addresses from address.csv...", flush=True)
            selected_address_count = load_many(
                connection,
                """
                INSERT INTO selected_addresses
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                selected_address_rows(open_rows(archive, "address.csv")),
            )
            connection.commit()

            print("Loading valid contacts from contact.csv...", flush=True)
            contact_count = load_many(
                connection,
                """
                INSERT OR IGNORE INTO contacts
                VALUES (?, ?, ?, ?, ?)
                """,
                contact_rows(open_rows(archive, "contact.csv")),
            )
            connection.commit()

            print("Selecting activities from activity.csv...", flush=True)
            selected_activity_count = load_many(
                connection,
                """
                INSERT INTO selected_activities
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                selected_activity_rows(open_rows(archive, "activity.csv")),
            )
            connection.commit()

            print("Removing orphan entity data...", flush=True)
            delete_orphan_entity_data(connection)
            connection.commit()

            print("Loading code.csv...", flush=True)
            code_count = load_many(
                connection,
                "INSERT OR REPLACE INTO codes VALUES (?, ?, ?, ?)",
                code_rows(open_rows(archive, "code.csv")),
            )

        counts = {
            "enterprise_count": connection.execute(
                "SELECT COUNT(*) FROM enterprises"
            ).fetchone()[0],
            "establishment_count": connection.execute(
                "SELECT COUNT(*) FROM establishments"
            ).fetchone()[0],
            "branch_count": connection.execute(
                "SELECT COUNT(*) FROM branches"
            ).fetchone()[0],
            "entity_count": connection.execute(
                "SELECT COUNT(*) FROM entities"
            ).fetchone()[0],
            "selected_name_count": connection.execute(
                "SELECT COUNT(*) FROM selected_names"
            ).fetchone()[0],
            "selected_address_count": connection.execute(
                "SELECT COUNT(*) FROM selected_addresses"
            ).fetchone()[0],
            "contact_count": connection.execute(
                "SELECT COUNT(*) FROM contacts"
            ).fetchone()[0],
            "selected_activity_count": connection.execute(
                "SELECT COUNT(*) FROM selected_activities"
            ).fetchone()[0],
            "code_count": connection.execute(
                "SELECT COUNT(*) FROM codes"
            ).fetchone()[0],
        }

        metadata = {
            "schema_version": str(SCHEMA_VERSION),
            "source_full_file": full_zip.name,
            "loaded_enterprise_rows": str(enterprise_count),
            "loaded_establishment_rows": str(establishment_count),
            "loaded_branch_rows": str(branch_count),
            "loaded_selected_name_rows": str(selected_name_count),
            "loaded_selected_address_rows": str(selected_address_count),
            "loaded_contact_rows_before_orphan_cleanup": str(contact_count),
            "loaded_selected_activity_rows": str(selected_activity_count),
            "loaded_code_rows": str(code_count),
            **{key: str(value) for key, value in counts.items()},
            **{f"bce_{key}": value for key, value in meta.items()},
        }

        replace_metadata(connection, metadata)
        connection.commit()
        connection.execute("PRAGMA optimize")
    finally:
        connection.close()

    print(f"Built {db_path}", flush=True)


def get_metadata(connection: sqlite3.Connection) -> dict[str, str]:
    return dict(connection.execute("SELECT key, value FROM metadata"))


def get_entity_contact_options(
    connection: sqlite3.Connection,
    entity_number: str,
) -> list[dict[str, str]]:
    rows = connection.execute(
        """
        SELECT entity_contact, contact_type, normalized_value
        FROM contacts
        WHERE entity_number = ?
        ORDER BY
          CASE contact_type
            WHEN 'TEL' THEN 0
            WHEN 'EMAIL' THEN 1
            WHEN 'WEB' THEN 2
            ELSE 3
          END,
          normalized_value
        """,
        (entity_number,),
    ).fetchall()

    return [
        {
            "scope": row[0],
            "type": row[1],
            "value": row[2],
        }
        for row in rows
    ]


def get_entity_activities(
    connection: sqlite3.Connection,
    entity_number: str,
) -> list[dict[str, str]]:
    rows = connection.execute(
        """
        SELECT
          a.activity_group,
          a.nace_version,
          a.nace_code,
          a.classification,
          fr.description AS description_fr,
          nl.description AS description_nl
        FROM selected_activities a
        LEFT JOIN codes fr
          ON fr.category = 'Nace' || a.nace_version
         AND fr.code = a.nace_code
         AND fr.language = 'FR'
        LEFT JOIN codes nl
          ON nl.category = 'Nace' || a.nace_version
         AND nl.code = a.nace_code
         AND nl.language = 'NL'
        WHERE a.entity_number = ?
        ORDER BY a.sort_order
        """,
        (entity_number,),
    ).fetchall()

    return [
        {
            "activity_group": row[0],
            "nace_version": row[1],
            "nace_code": row[2],
            "classification": row[3],
            "description_fr": row[4] or "",
            "description_nl": row[5] or "",
        }
        for row in rows
    ]



def _range_clause(column: str, prefix: str, prefix_length: int) -> tuple[str, tuple[str, ...]]:
    lower_bound = prefix + ("0" * (10 - prefix_length))
    next_prefix_number = int(prefix) + 1

    if next_prefix_number >= 10**prefix_length:
        return f"{column} >= ?", (lower_bound,)

    upper_prefix = str(next_prefix_number).zfill(prefix_length)
    upper_bound = upper_prefix + ("0" * (10 - prefix_length))
    return f"{column} >= ? AND {column} < ?", (lower_bound, upper_bound)


def _load_registration_shard_records(
    connection: sqlite3.Connection,
    prefix: str,
    prefix_length: int,
) -> list[dict[str, object]]:
    enterprise_where, enterprise_params = _range_clause(
        "e.enterprise_number",
        prefix,
        prefix_length,
    )
    linked_where, linked_params = _range_clause(
        "links.enterprise_number",
        prefix,
        prefix_length,
    )
    establishment_where, establishment_params = _range_clause(
        "est.enterprise_number",
        prefix,
        prefix_length,
    )
    branch_where, branch_params = _range_clause(
        "bra.enterprise_number",
        prefix,
        prefix_length,
    )

    enterprise_rows = connection.execute(
        f"""
        SELECT
          e.*,
          n.denomination,
          a.address_type_code,
          a.country_nl,
          a.country_fr,
          a.zipcode,
          a.municipality_nl,
          a.municipality_fr,
          a.street_nl,
          a.street_fr,
          a.house_number,
          a.box,
          a.extra_info,
          a.striking_off_date
        FROM enterprises e
        LEFT JOIN selected_names n
          ON n.entity_number = e.enterprise_number
        LEFT JOIN selected_addresses a
          ON a.entity_number = e.enterprise_number
        WHERE {enterprise_where}
        ORDER BY e.enterprise_number
        """,
        enterprise_params,
    ).fetchall()

    records_by_enterprise: dict[str, dict[str, object]] = {}
    entity_targets: dict[str, tuple[list[dict[str, str]], list[dict[str, str]]]] = {}

    for row in enterprise_rows:
        enterprise_number = row["enterprise_number"]
        record: dict[str, object] = {
            "number": enterprise_number,
            "enterprise": dict(row),
            "enterprise_contacts": [],
            "enterprise_activities": [],
            "establishments": [],
            "branches": [],
        }
        records_by_enterprise[enterprise_number] = record
        entity_targets[enterprise_number] = (
            record["enterprise_contacts"],
            record["enterprise_activities"],
        )

    establishment_rows = connection.execute(
        f"""
        SELECT
          est.enterprise_number,
          est.establishment_number,
          est.start_date,
          n.denomination,
          a.address_type_code,
          a.country_nl,
          a.country_fr,
          a.zipcode,
          a.municipality_nl,
          a.municipality_fr,
          a.street_nl,
          a.street_fr,
          a.house_number,
          a.box,
          a.extra_info,
          a.striking_off_date
        FROM establishments est
        LEFT JOIN selected_names n
          ON n.entity_number = est.establishment_number
        LEFT JOIN selected_addresses a
          ON a.entity_number = est.establishment_number
        WHERE {establishment_where}
        ORDER BY est.enterprise_number, est.establishment_number
        """,
        establishment_params,
    ).fetchall()

    for row in establishment_rows:
        enterprise_number = row["enterprise_number"]
        record = records_by_enterprise.get(enterprise_number)

        if not record:
            continue

        child = dict(row)
        child.pop("enterprise_number", None)
        child["contacts"] = []
        child["activities"] = []
        record["establishments"].append(child)
        entity_targets[row["establishment_number"]] = (
            child["contacts"],
            child["activities"],
        )

    branch_rows = connection.execute(
        f"""
        SELECT
          bra.enterprise_number,
          bra.branch_number,
          bra.start_date,
          n.denomination,
          a.address_type_code,
          a.country_nl,
          a.country_fr,
          a.zipcode,
          a.municipality_nl,
          a.municipality_fr,
          a.street_nl,
          a.street_fr,
          a.house_number,
          a.box,
          a.extra_info,
          a.striking_off_date
        FROM branches bra
        LEFT JOIN selected_names n
          ON n.entity_number = bra.branch_number
        LEFT JOIN selected_addresses a
          ON a.entity_number = bra.branch_number
        WHERE {branch_where}
        ORDER BY bra.enterprise_number, bra.branch_number
        """,
        branch_params,
    ).fetchall()

    for row in branch_rows:
        enterprise_number = row["enterprise_number"]
        record = records_by_enterprise.get(enterprise_number)

        if not record:
            continue

        child = dict(row)
        child.pop("enterprise_number", None)
        child["contacts"] = []
        child["activities"] = []
        record["branches"].append(child)
        entity_targets[row["branch_number"]] = (
            child["contacts"],
            child["activities"],
        )

    contact_rows = connection.execute(
        f"""
        SELECT
          links.entity_number,
          c.entity_contact,
          c.contact_type,
          c.normalized_value
        FROM entities links
        JOIN contacts c
          ON c.entity_number = links.entity_number
        WHERE {linked_where}
        ORDER BY
          links.enterprise_number,
          links.entity_number,
          CASE c.contact_type
            WHEN 'TEL' THEN 0
            WHEN 'EMAIL' THEN 1
            WHEN 'WEB' THEN 2
            ELSE 3
          END,
          c.normalized_value
        """,
        linked_params,
    ).fetchall()

    for row in contact_rows:
        target = entity_targets.get(row["entity_number"])

        if not target:
            continue

        target[0].append(
            {
                "scope": row["entity_contact"],
                "type": row["contact_type"],
                "value": row["normalized_value"],
            }
        )

    activity_rows = connection.execute(
        f"""
        SELECT
          links.entity_number,
          a.activity_group,
          a.nace_version,
          a.nace_code,
          a.classification,
          fr.description AS description_fr,
          nl.description AS description_nl
        FROM entities links
        JOIN selected_activities a
          ON a.entity_number = links.entity_number
        LEFT JOIN codes fr
          ON fr.category = 'Nace' || a.nace_version
         AND fr.code = a.nace_code
         AND fr.language = 'FR'
        LEFT JOIN codes nl
          ON nl.category = 'Nace' || a.nace_version
         AND nl.code = a.nace_code
         AND nl.language = 'NL'
        WHERE {linked_where}
        ORDER BY links.enterprise_number, links.entity_number, a.sort_order
        """,
        linked_params,
    ).fetchall()

    for row in activity_rows:
        target = entity_targets.get(row["entity_number"])

        if not target:
            continue

        target[1].append(
            {
                "activity_group": row["activity_group"],
                "nace_version": row["nace_version"],
                "nace_code": row["nace_code"],
                "classification": row["classification"],
                "description_fr": row["description_fr"] or "",
                "description_nl": row["description_nl"] or "",
            }
        )

    return list(records_by_enterprise.values())


def export_registration_shards(
    db_path: Path,
    output_dir: Path,
    prefix_length: int = 3,
) -> None:
    if prefix_length < 2 or prefix_length > 5:
        raise ValueError("prefix-length must be between 2 and 5")

    connection = sqlite3.connect(db_path)
    connection.row_factory = sqlite3.Row
    metadata = get_metadata(connection)
    extract_number = metadata.get("bce_ExtractNumber", "").strip()

    if not extract_number.isdigit():
        connection.close()
        raise RuntimeError("The registration database has no valid BCE extract number.")

    prefix_rows = connection.execute(
        "SELECT substr(enterprise_number, 1, ?), COUNT(*) "
        "FROM enterprises GROUP BY 1 ORDER BY 1",
        (prefix_length,),
    ).fetchall()

    output_dir.parent.mkdir(parents=True, exist_ok=True)
    temp_dir = Path(
        tempfile.mkdtemp(
            prefix="bce-registration-shards-",
            dir=output_dir.parent,
        )
    )
    version_dir = temp_dir / f"v{extract_number}"
    version_dir.mkdir(parents=True)
    shard_metadata: list[dict[str, str | int]] = []
    total = 0

    try:
        for index, (prefix, expected_count) in enumerate(prefix_rows, start=1):
            print(
                f"Exporting registration shard {index}/{len(prefix_rows)}: {prefix}",
                flush=True,
            )
            records = _load_registration_shard_records(
                connection,
                prefix,
                prefix_length,
            )
            actual_count = len(records)

            if actual_count != expected_count:
                raise RuntimeError(
                    f"Registration shard {prefix} count mismatch: "
                    f"expected {expected_count}, found {actual_count}"
                )

            shard_path = version_dir / f"{prefix}.ndjson.gz"

            with gzip.open(
                shard_path,
                "wt",
                encoding="utf-8",
                newline="\n",
                compresslevel=6,
            ) as handle:
                for record in records:
                    handle.write(
                        json.dumps(
                            record,
                            ensure_ascii=False,
                            separators=(",", ":"),
                        )
                        + "\n"
                    )

            digest = hashlib.sha256(shard_path.read_bytes()).hexdigest()
            shard_metadata.append(
                {
                    "prefix": prefix,
                    "key": (
                        f"bce-registration/v{extract_number}/"
                        f"{prefix}.ndjson.gz"
                    ),
                    "count": actual_count,
                    "sha256": digest,
                    "size_bytes": shard_path.stat().st_size,
                }
            )
            total += actual_count

        manifest = {
            "schema_version": 1,
            "source_schema_version": SCHEMA_VERSION,
            "format": "ndjson+gzip",
            "prefix_length": prefix_length,
            "extract_number": extract_number,
            "snapshot_date": metadata.get("bce_SnapshotDate", ""),
            "extract_timestamp": metadata.get("bce_ExtractTimestamp", ""),
            "enterprise_count": total,
            "version_prefix": f"bce-registration/v{extract_number}",
            "contains_private_contacts": True,
            "shards": shard_metadata,
        }
        (version_dir / "manifest.json").write_text(
            json.dumps(manifest, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
        (temp_dir / "current.json").write_text(
            json.dumps(
                {
                    "schema_version": 1,
                    "extract_number": extract_number,
                    "manifest_key": (
                        f"bce-registration/v{extract_number}/manifest.json"
                    ),
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

    print(
        f"Exported {total} registration enterprises into "
        f"{len(shard_metadata)} shards",
        flush=True,
    )


def inspect_company(db_path: Path, number: str) -> None:
    normalized = normalize_number(number)
    connection = sqlite3.connect(db_path)
    connection.row_factory = sqlite3.Row

    enterprise = connection.execute(
        """
        SELECT
          e.*,
          n.denomination,
          a.address_type_code,
          a.country_nl,
          a.country_fr,
          a.zipcode,
          a.municipality_nl,
          a.municipality_fr,
          a.street_nl,
          a.street_fr,
          a.house_number,
          a.box,
          a.extra_info,
          a.striking_off_date
        FROM enterprises e
        LEFT JOIN selected_names n
          ON n.entity_number = e.enterprise_number
        LEFT JOIN selected_addresses a
          ON a.entity_number = e.enterprise_number
        WHERE e.enterprise_number = ?
        """,
        (normalized,),
    ).fetchone()

    result: dict[str, object] = {
        "found": enterprise is not None,
        "number": normalized,
    }

    if enterprise is None:
        print(json.dumps(result, ensure_ascii=False, indent=2))
        connection.close()
        return

    result["enterprise"] = dict(enterprise)
    result["enterprise_contacts"] = get_entity_contact_options(
        connection,
        normalized,
    )
    result["enterprise_activities"] = get_entity_activities(
        connection,
        normalized,
    )

    establishments = connection.execute(
        """
        SELECT
          est.establishment_number,
          est.start_date,
          n.denomination,
          a.address_type_code,
          a.country_nl,
          a.country_fr,
          a.zipcode,
          a.municipality_nl,
          a.municipality_fr,
          a.street_nl,
          a.street_fr,
          a.house_number,
          a.box,
          a.extra_info,
          a.striking_off_date
        FROM establishments est
        LEFT JOIN selected_names n
          ON n.entity_number = est.establishment_number
        LEFT JOIN selected_addresses a
          ON a.entity_number = est.establishment_number
        WHERE est.enterprise_number = ?
        ORDER BY est.establishment_number
        """,
        (normalized,),
    ).fetchall()

    result["establishments"] = [
        {
            **dict(row),
            "contacts": get_entity_contact_options(
                connection,
                row["establishment_number"],
            ),
            "activities": get_entity_activities(
                connection,
                row["establishment_number"],
            ),
        }
        for row in establishments
    ]

    branches = connection.execute(
        """
        SELECT
          bra.branch_number,
          bra.start_date,
          n.denomination,
          a.address_type_code,
          a.country_nl,
          a.country_fr,
          a.zipcode,
          a.municipality_nl,
          a.municipality_fr,
          a.street_nl,
          a.street_fr,
          a.house_number,
          a.box,
          a.extra_info,
          a.striking_off_date
        FROM branches bra
        LEFT JOIN selected_names n
          ON n.entity_number = bra.branch_number
        LEFT JOIN selected_addresses a
          ON a.entity_number = bra.branch_number
        WHERE bra.enterprise_number = ?
        ORDER BY bra.branch_number
        """,
        (normalized,),
    ).fetchall()

    result["branches"] = [
        {
            **dict(row),
            "contacts": get_entity_contact_options(
                connection,
                row["branch_number"],
            ),
            "activities": get_entity_activities(
                connection,
                row["branch_number"],
            ),
        }
        for row in branches
    ]

    print(json.dumps(result, ensure_ascii=False, indent=2))
    connection.close()


def report(db_path: Path) -> None:
    connection = sqlite3.connect(db_path)
    metadata = get_metadata(connection)

    direct_contact = connection.execute(
        """
        SELECT COUNT(DISTINCT entity_number)
        FROM contacts
        WHERE entity_contact = 'ENT'
          AND contact_type IN ('TEL', 'EMAIL')
        """
    ).fetchone()[0]

    any_contact = connection.execute(
        """
        SELECT COUNT(DISTINCT entities.enterprise_number)
        FROM contacts
        JOIN entities
          ON entities.entity_number = contacts.entity_number
        WHERE contacts.contact_type IN ('TEL', 'EMAIL')
        """
    ).fetchone()[0]

    phone_enterprises = connection.execute(
        """
        SELECT COUNT(DISTINCT entities.enterprise_number)
        FROM contacts
        JOIN entities
          ON entities.entity_number = contacts.entity_number
        WHERE contacts.contact_type = 'TEL'
        """
    ).fetchone()[0]

    email_enterprises = connection.execute(
        """
        SELECT COUNT(DISTINCT entities.enterprise_number)
        FROM contacts
        JOIN entities
          ON entities.entity_number = contacts.entity_number
        WHERE contacts.contact_type = 'EMAIL'
        """
    ).fetchone()[0]

    website_enterprises = connection.execute(
        """
        SELECT COUNT(DISTINCT entities.enterprise_number)
        FROM contacts
        JOIN entities
          ON entities.entity_number = contacts.entity_number
        WHERE contacts.contact_type = 'WEB'
        """
    ).fetchone()[0]

    enterprise_count = connection.execute(
        "SELECT COUNT(*) FROM enterprises"
    ).fetchone()[0]

    result = {
        "extract_number": metadata.get("bce_ExtractNumber", ""),
        "snapshot_date": metadata.get("bce_SnapshotDate", ""),
        "enterprise_count": enterprise_count,
        "enterprise_with_direct_phone_or_email": direct_contact,
        "enterprise_with_phone_any_scope": phone_enterprises,
        "enterprise_with_email_any_scope": email_enterprises,
        "enterprise_with_phone_or_email_any_scope": any_contact,
        "enterprise_with_website_any_scope": website_enterprises,
        "enterprise_without_phone_or_email": max(
            0,
            enterprise_count - any_contact,
        ),
        "automatic_contact_verification_percent": (
            round((any_contact / enterprise_count) * 100, 2)
            if enterprise_count
            else 0
        ),
    }

    print(json.dumps(result, ensure_ascii=False, indent=2))
    connection.close()


def inspect_archive(path: Path) -> None:
    with zipfile.ZipFile(path) as archive:
        meta = read_meta(archive)
        result = {
            "file": path.name,
            "size_bytes": path.stat().st_size,
            "uncompressed_bytes": sum(
                item.file_size
                for item in archive.infolist()
            ),
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
    parser = argparse.ArgumentParser(
        description=(
            "Build a private BCE registration-verification database "
            "without changing the production lookup index"
        )
    )
    sub = parser.add_subparsers(dest="command", required=True)

    inspect_archive_parser = sub.add_parser("inspect-archive")
    inspect_archive_parser.add_argument(
        "--zip",
        required=True,
        type=Path,
    )

    build = sub.add_parser("build-full")
    build.add_argument("--zip", required=True, type=Path)
    build.add_argument("--db", required=True, type=Path)

    inspect = sub.add_parser("inspect")
    inspect.add_argument("--db", required=True, type=Path)
    inspect.add_argument("--number", required=True)

    report_parser = sub.add_parser("report")
    report_parser.add_argument("--db", required=True, type=Path)

    export_parser = sub.add_parser("export-registration-shards")
    export_parser.add_argument("--db", required=True, type=Path)
    export_parser.add_argument("--out", required=True, type=Path)
    export_parser.add_argument("--prefix-length", type=int, default=3)

    return parser.parse_args()


def main() -> int:
    args = parse_args()

    if args.command == "inspect-archive":
        inspect_archive(args.zip)
    elif args.command == "build-full":
        build_full(args.zip, args.db)
    elif args.command == "inspect":
        inspect_company(args.db, args.number)
    elif args.command == "report":
        report(args.db)
    elif args.command == "export-registration-shards":
        export_registration_shards(
            args.db,
            args.out,
            args.prefix_length,
        )

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
