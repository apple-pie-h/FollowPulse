from __future__ import annotations

import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from flask import Flask, jsonify, request, send_file
from flask_cors import CORS
from werkzeug.utils import secure_filename

from backend.services.inactive_checker import get_job_snapshot, start_inactive_check
from backend.services.instagram_parser import (
    detect_export_type,
    InstagramExportError,
    build_result_sets,
    extract_followers,
    extract_following,
    write_csv,
    write_text,
)
from backend.storage.store import EXPORTS_DIR, UPLOADS_DIR, create_session, get_session


app = Flask(__name__)
CORS(app)


def _serialize_session(session_id: str, results: dict[str, list[str]]) -> dict[str, object]:
    return {
        "session_id": session_id,
        "counts": {key: len(value) for key, value in results.items()},
        "results": results,
    }


@app.post("/upload")
def upload_exports():
    upload_files = request.files.getlist("files")

    if not upload_files:
        legacy_followers = request.files.get("followers")
        legacy_following = request.files.get("following")
        upload_files = [
            file_storage
            for file_storage in (legacy_followers, legacy_following)
            if file_storage is not None
        ]

    if len(upload_files) != 2:
        return (
            jsonify(
                {
                    "error": "Please upload exactly two Instagram JSON files: one followers export and one following export.",
                }
            ),
            400,
        )

    try:
        detected_files: dict[str, object] = {}
        for file_storage in upload_files:
            export_type = detect_export_type(file_storage)
            if export_type in detected_files:
                raise InstagramExportError(
                    "Two files of the same type were uploaded. Please upload one followers export and one following export."
                )
            detected_files[export_type] = file_storage

        followers_file = detected_files.get("followers")
        following_file = detected_files.get("following")
        if followers_file is None or following_file is None:
            raise InstagramExportError(
                "Please upload one followers export file and one following export file."
            )

        followers = extract_followers(followers_file)
        following = extract_following(following_file)
        results = build_result_sets(followers, following)
    except InstagramExportError as exc:
        return jsonify({"error": str(exc)}), 400

    session_id = create_session(
        {
            "followers": followers,
            "following": following,
            **results,
            "inactive_results": [],
        }
    )

    session_upload_dir = UPLOADS_DIR / session_id
    session_export_dir = EXPORTS_DIR / session_id
    session_upload_dir.mkdir(parents=True, exist_ok=True)
    session_export_dir.mkdir(parents=True, exist_ok=True)

    followers_file.stream.seek(0)
    following_file.stream.seek(0)
    followers_path = session_upload_dir / secure_filename(
        followers_file.filename or "followers-upload.json"
    )
    following_path = session_upload_dir / secure_filename(
        following_file.filename or "following-upload.json"
    )
    followers_file.save(followers_path)
    following_file.save(following_path)

    export_map = {
        "mutuals": results["mutuals"],
        "followers_not_followed_back": results["followers_not_followed_back"],
        "following_not_following_back": results["following_not_following_back"],
    }

    for export_type, usernames in export_map.items():
        write_csv(usernames, session_export_dir / f"{export_type}.csv")
        write_text(usernames, session_export_dir / f"{export_type}.txt")

    return jsonify(_serialize_session(session_id, results))


@app.post("/check-inactive")
def check_inactive():
    payload = request.get_json(silent=True) or {}
    session_id = payload.get("session_id")
    delay_seconds = float(payload.get("delay_seconds", 1.0))

    if not session_id:
        return jsonify({"error": "session_id is required."}), 400

    session = get_session(session_id)
    if session is None:
        return jsonify({"error": "Session not found. Please upload files again."}), 404

    usernames = session.get("following_not_following_back", [])
    if not usernames:
        return (
            jsonify(
                {
                    "error": "No usernames available to check. Upload files first.",
                }
            ),
            400,
        )

    job_id = start_inactive_check(session_id, usernames, delay_seconds=delay_seconds)
    return jsonify(
        {
            "job_id": job_id,
            "status": "queued",
            "total": len(usernames),
        }
    )


@app.get("/check-inactive/<job_id>")
def get_inactive_job(job_id: str):
    snapshot = get_job_snapshot(job_id)
    if snapshot is None:
        return jsonify({"error": "Job not found."}), 404
    return jsonify(snapshot)


@app.get("/download/<result_type>")
def download_result(result_type: str):
    session_id = request.args.get("session_id", "")
    format_type = request.args.get("format", "csv").lower()

    if not session_id:
        return jsonify({"error": "session_id is required."}), 400

    session = get_session(session_id)
    if session is None:
        return jsonify({"error": "Session not found."}), 404

    allowed_types = {
        "mutuals",
        "followers_not_followed_back",
        "following_not_following_back",
        "inactive_results",
    }
    if result_type not in allowed_types:
        return jsonify({"error": "Unknown download type."}), 404

    session_export_dir = EXPORTS_DIR / session_id
    extension = "csv" if format_type == "csv" else "txt"
    file_name = f"{result_type}.{extension}"
    file_path = session_export_dir / file_name

    if result_type == "inactive_results" and not file_path.exists():
        return (
            jsonify(
                {
                    "error": "Inactive check results are not ready yet.",
                }
            ),
            400,
        )

    if not file_path.exists():
        return jsonify({"error": "Download file not found."}), 404

    return send_file(
        file_path,
        as_attachment=True,
        download_name=file_name,
        mimetype="text/csv" if extension == "csv" else "text/plain",
    )


@app.get("/health")
def health_check():
    return jsonify({"status": "ok"})


if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)
