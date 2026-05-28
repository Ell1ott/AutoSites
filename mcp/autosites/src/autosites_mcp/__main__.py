from __future__ import annotations


def main() -> None:
    from autosites_mcp.server import mcp

    mcp.run(transport="stdio")


if __name__ == "__main__":
    main()
