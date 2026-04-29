#!/usr/bin/env python3
# /// script
# requires-python = ">=3.11"
# dependencies = [
#     "matplotlib>=3.8",
# ]
# ///
"""Scatter / point plot: Google review count (x) vs. visuel_rating (y) from maps_businesses.json.

Run: uv run plot_reviews_vs_visuel_rating.py [maps_businesses.json] [-o out.png]
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path

# Non-interactive backend for headless / CI; avoids needing a display.
os.environ.setdefault(
    "MPLCONFIGDIR",
    str(Path(__file__).resolve().parent / ".matplotlib_cache"),
)

import matplotlib

matplotlib.use("Agg")

import matplotlib.pyplot as plt


def load_points(json_path: Path) -> tuple[list[float], list[float], list[str]]:
    """Return (review_counts, visuel_ratings, labels) for places that have both fields."""
    with json_path.open(encoding="utf-8") as f:
        data = json.load(f)

    places = data.get("api_response", {}).get("places", [])
    xs: list[float] = []
    ys: list[float] = []
    labels: list[str] = []

    for p in places:
        raw_vr = p.get("visuel_rating")
        if raw_vr is None or raw_vr == "":
            continue
        try:
            y = float(str(raw_vr).strip().replace(",", "."))
        except ValueError:
            continue

        n = p.get("userRatingCount")
        if n is None:
            continue
        try:
            x = float(n)
        except (TypeError, ValueError):
            continue

        xs.append(x)
        ys.append(y)
        name = (p.get("displayName") or {}).get("text") or p.get("id") or ""
        labels.append(str(name))

    return xs, ys, labels


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "json_path",
        nargs="?",
        default=Path(__file__).resolve().parent / "maps_businesses.json",
        type=Path,
        help="Path to maps_businesses.json (default: alongside this script)",
    )
    parser.add_argument(
        "-o",
        "--output",
        type=Path,
        default=None,
        help="Save figure to this path (default: reviews_vs_visuel_rating.png next to JSON)",
    )
    args = parser.parse_args()

    json_path = args.json_path.resolve()
    if not json_path.is_file():
        print(f"Not found: {json_path}", file=sys.stderr)
        sys.exit(1)

    xs, ys, _labels = load_points(json_path)
    if not xs:
        print("No places with both userRatingCount and visuel_rating.", file=sys.stderr)
        sys.exit(1)

    out = args.output
    if out is None:
        out = json_path.parent / "reviews_vs_visuel_rating.png"

    fig, ax = plt.subplots(figsize=(10, 6), dpi=120)
    ax.scatter(xs, ys, alpha=0.6, s=36, edgecolors="black", linewidths=0.3)
    ax.set_xlabel("Number of reviews (userRatingCount)")
    ax.set_ylabel("Visuel rating")
    ax.set_title("Reviews vs. visuel rating")
    ax.grid(True, alpha=0.3)
    fig.tight_layout()
    fig.savefig(out, bbox_inches="tight")
    plt.close(fig)
    print(f"Plotted {len(xs)} points → {out}")


if __name__ == "__main__":
    main()
