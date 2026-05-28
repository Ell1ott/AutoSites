"""Run ``uv run python -m api`` from the ``backend`` directory."""

from __future__ import annotations

import os


def main() -> None:
    import uvicorn

    host = os.environ.get("BACKEND_HOST", "127.0.0.1")
    try:
        port = int(os.environ.get("BACKEND_PORT", "8888"))
    except ValueError:
        port = 8888

    uvicorn.run("api.main:app", host=host, port=port, reload=True)


if __name__ == "__main__":
    main()
