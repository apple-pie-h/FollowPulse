from __future__ import annotations

import json
from io import BytesIO
from pathlib import Path

import pandas as pd
from werkzeug.datastructures import FileStorage


class InstagramExportError(ValueError):
    """Raised when the uploaded file is not a valid Instagram export file."""


def validate_json_extension(file_storage: FileStorage) -> None:
    filename = (file_storage.filename or "").lower()
    if not filename.endswith(".json"):
        raise InstagramExportError(
            f"{file_storage.filename or 'Uploaded file'} must be a .json file."
        )


def _read_json(file_storage: FileStorage) -> object:
    raw = file_storage.read()
    file_storage.stream.seek(0)

    try:
        # Instagram exports can include a UTF-8 BOM; utf-8-sig handles both BOM and non-BOM files.
        return json.loads(raw.decode("utf-8-sig"))
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise InstagramExportError(
            f"{file_storage.filename} is not valid UTF-8 JSON."
        ) from exc


def _extract_username_from_string_list_data(value: object) -> str | None:
    if not isinstance(value, list):
        return None

    for item in value:
        if not isinstance(item, dict):
            continue
        candidate = item.get("value")
        if isinstance(candidate, str) and candidate.strip():
            return candidate.strip()
    return None


def _extract_username_from_entry(entry: object) -> str | None:
    if not isinstance(entry, dict):
        return None

    for key in ("title", "username", "value"):
        candidate = entry.get(key)
        if isinstance(candidate, str) and candidate.strip():
            return candidate.strip()

    return _extract_username_from_string_list_data(entry.get("string_list_data"))


def _extract_following_username_from_entry(entry: object) -> str | None:
    if not isinstance(entry, dict):
        return None

    for key in ("title", "username", "value"):
        candidate = entry.get(key)
        if isinstance(candidate, str) and candidate.strip():
            return candidate.strip()

    return None


def _extract_usernames_from_list(entries: object) -> list[str]:
    if not isinstance(entries, list):
        return []

    usernames = {
        username
        for username in (_extract_username_from_entry(entry) for entry in entries)
        if username
    }
    return sorted(usernames)


def _extract_following_usernames_from_list(entries: object) -> list[str]:
    if not isinstance(entries, list):
        return []

    usernames = {
        username
        for username in (_extract_following_username_from_entry(entry) for entry in entries)
        if username
    }
    return sorted(usernames)


def extract_followers(file_storage: FileStorage) -> list[str]:
    validate_json_extension(file_storage)
    data = _read_json(file_storage)
    if not isinstance(data, list):
        raise InstagramExportError(
            f"{file_storage.filename or 'This file'} has an unexpected structure. Expected follower data."
        )

    cleaned = _extract_usernames_from_list(data)

    if not cleaned:
        raise InstagramExportError(
            f"{file_storage.filename or 'This file'} did not contain any usernames."
        )

    return cleaned


def extract_following(file_storage: FileStorage) -> list[str]:
    validate_json_extension(file_storage)
    data = _read_json(file_storage)

    relationships: object
    if isinstance(data, dict):
        relationships = data.get("relationships_following")
    elif isinstance(data, list):
        relationships = data
    else:
        raise InstagramExportError(
            f"{file_storage.filename or 'This file'} has an unexpected structure. Expected following data."
        )

    cleaned = _extract_following_usernames_from_list(relationships)

    if not cleaned:
        raise InstagramExportError(
            f"{file_storage.filename or 'This file'} did not contain any usernames."
        )

    return cleaned


def detect_export_type(file_storage: FileStorage) -> str:
    validate_json_extension(file_storage)
    data = _read_json(file_storage)

    if isinstance(data, dict):
        if isinstance(data.get("relationships_following"), list):
            return "following"

    if isinstance(data, list):
        sample = [item for item in data[:10] if isinstance(item, dict)]
        if sample:
            has_non_empty_title = any(
                isinstance(item.get("title"), str) and item.get("title").strip()
                for item in sample
            )
            has_string_list_value = any(
                _extract_username_from_string_list_data(item.get("string_list_data"))
                for item in sample
            )
            if has_non_empty_title and not has_string_list_value:
                return "following"
            if has_string_list_value:
                return "followers"

    raise InstagramExportError(
        f"{file_storage.filename or 'This file'} is not a supported Instagram followers/following export."
    )


def build_result_sets(followers: list[str], following: list[str]) -> dict[str, list[str]]:
    followers_set = set(followers)
    following_set = set(following)

    mutuals = sorted(followers_set & following_set)
    fans = sorted(followers_set - following_set)
    not_following_back = sorted(following_set - followers_set)

    return {
        "mutuals": mutuals,
        "followers_not_followed_back": fans,
        "following_not_following_back": not_following_back,
    }


def write_csv(usernames: list[str], destination: Path, column_name: str = "username") -> Path:
    destination.parent.mkdir(parents=True, exist_ok=True)
    pd.DataFrame({column_name: usernames}).to_csv(destination, index=False)
    return destination


def write_text(usernames: list[str], destination: Path) -> Path:
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text("\n".join(usernames), encoding="utf-8")
    return destination


def dataframe_to_csv_bytes(frame: pd.DataFrame) -> bytes:
    buffer = BytesIO()
    frame.to_csv(buffer, index=False)
    return buffer.getvalue()
