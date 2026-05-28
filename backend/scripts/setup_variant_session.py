"""One-time headed login for variant.com — saves cookies in the browser profile.

From the backend directory (not mapsLeadsFetcher):

    cd backend
    uv run patchright install chromium    # required once; use chromium, not chrome
    uv run python -m scripts.setup_variant_session

If you see VIRTUAL_ENV warnings, deactivate the mapsLeadsFetcher venv first.

Pre-fills VARIANT_SETUP_EMAIL (default hi@novine.dk). Enter the OTP from your inbox
in the browser window, then press Enter here when /projects loads.
"""
from __future__ import annotations

import os
import sys

from patchright.sync_api import sync_playwright

from workers.handlers.variant_browser import (
    DEFAULT_PROJECTS_URL,
    ensure_not_auth,
    profile_dir,
)

SETUP_EMAIL = os.environ.get("VARIANT_SETUP_EMAIL", "hi@novine.dk")
AUTH_URL = "https://variant.com/authentication?next=%2Fprojects"


def main() -> int:
    profile = profile_dir()
    profile.mkdir(parents=True, exist_ok=True)
    print(f"Profile directory: {profile}")
    print(f"Opening browser — sign in as {SETUP_EMAIL}")

    with sync_playwright() as p:
        try:
            context = p.chromium.launch_persistent_context(
                user_data_dir=str(profile),
                headless=False,
                viewport={"width": 1280, "height": 720},
            )
        except Exception as e:
            if "Executable doesn't exist" in str(e):
                print(
                    "Patchright Chromium is not installed for this venv.\n"
                    "Run from the backend folder:\n\n"
                    "  uv run patchright install chromium\n",
                    file=sys.stderr,
                )
            raise
        page = context.pages[0] if context.pages else context.new_page()
        page.goto(AUTH_URL, wait_until="domcontentloaded")

        try:
            ensure_not_auth(page)
            print("Already logged in — navigating to projects…")
            page.goto(DEFAULT_PROJECTS_URL, wait_until="domcontentloaded")
        except Exception:
            email = page.get_by_role("textbox", name="Email address")
            email.fill(SETUP_EMAIL)
            page.get_by_role("button", name="Continue with Email").click()
            print("Enter the verification code in the browser, then press Enter here…")
            input()

        page.goto(DEFAULT_PROJECTS_URL, wait_until="domcontentloaded", timeout=120_000)
        try:
            ensure_not_auth(page)
        except Exception as e:
            print(f"Still on auth page: {e}", file=sys.stderr)
            return 1

        print(f"Success — session saved. Projects URL: {page.url}")
        input("Press Enter to close the browser…")
        context.close()

    print("Done. Headless jobs can reuse this profile.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
