from __future__ import annotations

import time
from threading import Thread
from typing import Any

import pandas as pd
from selenium import webdriver
from selenium.common.exceptions import TimeoutException, WebDriverException
from selenium.webdriver.chrome.options import Options

from backend.services.instagram_parser import write_csv, write_text
from backend.storage.store import EXPORTS_DIR, create_job, get_job, update_job, update_session


def create_chrome_driver() -> webdriver.Chrome:
    options = Options()
    options.add_argument("--headless=new")
    options.add_argument("--disable-gpu")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--window-size=1280,960")
    options.add_argument(
        "--user-agent=Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    )

    driver = webdriver.Chrome(options=options)
    driver.set_page_load_timeout(20)
    return driver


def _detect_account_state(html: str) -> str:
    content = html.lower()

    if '"user":null' in content:
        return "NOT FOUND"
    if "challenge_required" in content or "rate limit" in content:
        return "RATE LIMITED"
    if '"profile_page"' in content or '"username":"' in content:
        return "ACTIVE"
    return "DELETED/DEACTIVATED"


def start_inactive_check(session_id: str, usernames: list[str], delay_seconds: float = 1.0) -> str:
    payload = {
        "session_id": session_id,
        "status": "queued",
        "processed": 0,
        "total": len(usernames),
        "results": [],
        "error": None,
    }
    job_id = create_job(payload)

    worker = Thread(
        target=run_inactive_check,
        args=(job_id, session_id, usernames, delay_seconds),
        daemon=True,
    )
    worker.start()
    return job_id


def run_inactive_check(
    job_id: str, session_id: str, usernames: list[str], delay_seconds: float
) -> None:
    update_job(job_id, {"status": "running"})
    driver = None

    try:
        driver = create_chrome_driver()
        rows: list[dict[str, str]] = []

        for index, username in enumerate(usernames, start=1):
            url = f"https://www.instagram.com/{username}/"
            try:
                driver.get(url)
                time.sleep(delay_seconds)
                status = _detect_account_state(driver.page_source)
            except TimeoutException:
                status = "TIMEOUT"
            except WebDriverException as exc:
                status = "ERROR"
                if "net::" in str(exc).lower():
                    status = "NETWORK ERROR"

            rows.append({"username": username, "status": status, "url": url})
            update_job(
                job_id,
                {
                    "processed": index,
                    "results": rows.copy(),
                },
            )

        frame = pd.DataFrame(rows)
        session_export_dir = EXPORTS_DIR / session_id
        write_csv(frame["username"].tolist(), session_export_dir / "inactive_usernames.csv")
        frame.to_csv(session_export_dir / "inactive_results.csv", index=False)
        write_text(frame["username"].tolist(), session_export_dir / "inactive_results.txt")

        update_session(
            session_id,
            {
                "inactive_results": rows,
            },
        )
        update_job(job_id, {"status": "completed"})
    except WebDriverException as exc:
        message = (
            "Chrome could not be started. Make sure Google Chrome and a matching "
            "ChromeDriver are installed, then try again."
        )
        if "rate" in str(exc).lower():
            message = "Instagram rate-limited the checker. Please wait a bit and retry."
        update_job(job_id, {"status": "failed", "error": message})
    except Exception as exc:  # pragma: no cover - defensive guard
        update_job(job_id, {"status": "failed", "error": str(exc)})
    finally:
        if driver is not None:
            driver.quit()


def get_job_snapshot(job_id: str) -> dict[str, Any] | None:
    return get_job(job_id)
