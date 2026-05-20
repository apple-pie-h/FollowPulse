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
        return json.loads(raw.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise InstagramExportError(
            f"{file_storage.filename} is not valid UTF-8 JSON."
        ) from exc


def extract_followers(file_storage: FileStorage) -> list[str]:
    validate_json_extension(file_storage)
    data = _read_json(file_storage)
    if not isinstance(data, list):
        raise InstagramExportError(
            f"{file_storage.filename or 'This file'} has an unexpected structure. Expected follower data."
        )

    frame = pd.DataFrame(data)
    if "string_list_data" not in frame.columns:
        raise InstagramExportError(
            f"{file_storage.filename or 'This file'} is missing the string_list_data field."
        )

    followers = (
        frame["string_list_data"]
        .apply(
            lambda entries: entries[0].get("value")
            if isinstance(entries, list) and entries
            else None
        )
        .dropna()
        .astype(str)
        .str.strip()
    )
    cleaned = sorted({username for username in followers if username})

    if not cleaned:
        raise InstagramExportError(
            f"{file_storage.filename or 'This file'} did not contain any usernames."
        )

    return cleaned


def extract_following(file_storage: FileStorage) -> list[str]:
    validate_json_extension(file_storage)
    data = _read_json(file_storage)
    if not isinstance(data, dict):
        raise InstagramExportError(
            f"{file_storage.filename or 'This file'} has an unexpected structure. Expected following data."
        )

    relationships = data.get("relationships_following")
    if not isinstance(relationships, list):
        raise InstagramExportError(
            f"{file_storage.filename or 'This file'} is missing the relationships_following list."
        )

    frame = pd.DataFrame(relationships)
    if "title" not in frame.columns:
        raise InstagramExportError(
            f"{file_storage.filename or 'This file'} is missing the title field."
        )

    following = frame["title"].dropna().astype(str).str.strip()
    cleaned = sorted({username for username in following if username})

    if not cleaned:
        raise InstagramExportError(
            f"{file_storage.filename or 'This file'} did not contain any usernames."
        )

    return cleaned


def detect_export_type(file_storage: FileStorage) -> str:
    validate_json_extension(file_storage)
    data = _read_json(file_storage)

    if isinstance(data, list):
        if all(
            isinstance(item, dict) and "string_list_data" in item
            for item in data[:3]
        ):
            return "followers"

    if isinstance(data, dict) and isinstance(data.get("relationships_following"), list):
        return "following"

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
