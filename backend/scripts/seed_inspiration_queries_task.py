"""Seeder for the `generate_inspiration_queries` AI task row.

This task is consumed by `workers.handlers.generate_inspiration_queries` and
its config drives the Inspiration > Browsing UI in admin-next:

  - `galleries` is the list of gallery cards rendered as vertical sub-tabs.
    Each entry has an `id`, a display `name`, and a `url_template` with a
    `{{query}}` placeholder that the frontend substitutes with the LLM
    output (either a free-text query OR a chosen category slug).
  - `prompt_hint` (per gallery) is an extra instruction handed to the LLM
    when picking that gallery's value (e.g. "1-3 words" or "very short").
  - `categories` (per gallery) — if present, the gallery is enum-style:
    the LLM must pick ONE `slug` from the list (enforced via JSON schema),
    and that slug is substituted into `url_template`. If omitted/null, the
    gallery is free-text.
  - `meta_prompt` is the shared brief used to generate one value per gallery.
  - `output_field` is the dynamic key on the place row where the result lands
    (a dict of `{gallery_id: value_string}`).

Run with:

    uv run python -m scripts.seed_inspiration_queries_task
"""
from __future__ import annotations

import sys

from db.connection import session
from db.repos import ai_tasks


_NAME = "generate_inspiration_queries"
_LABEL = "Inspiration search queries"


# Full Lapa Ninja category list (from lapa.ninja sidebar).
_LAPA_CATEGORIES = [
    {"slug": "saas", "label": "SaaS"},
    {"slug": "business", "label": "Business"},
    {"slug": "minimal", "label": "Minimal"},
    {"slug": "agency", "label": "Agency"},
    {"slug": "portfolio", "label": "Portfolio"},
    {"slug": "studio", "label": "Studio"},
    {"slug": "web3", "label": "Web3"},
    {"slug": "3d-websites", "label": "3D Websites"},
    {"slug": "ecommerce", "label": "E-commerce"},
    {"slug": "technology", "label": "Technology"},
    {"slug": "corporate", "label": "Corporate"},
    {"slug": "productivity", "label": "Productivity"},
    {"slug": "product", "label": "Product"},
    {"slug": "artificial-intelligence", "label": "AI"},
    {"slug": "app", "label": "App"},
    {"slug": "software", "label": "Software"},
    {"slug": "development-tools", "label": "Dev Tools"},
    {"slug": "design-tools", "label": "Design Tools"},
    {"slug": "no-code", "label": "No-Code"},
    {"slug": "open-source", "label": "Open Source"},
    {"slug": "finance", "label": "Finance"},
    {"slug": "fintech", "label": "Fintech"},
    {"slug": "cryptocurrency", "label": "Cryptocurrency"},
    {"slug": "blockchain", "label": "Blockchain"},
    {"slug": "defi", "label": "DeFi"},
    {"slug": "marketing", "label": "Marketing"},
    {"slug": "ventures", "label": "Ventures"},
    {"slug": "product-management", "label": "Product Management"},
    {"slug": "creative", "label": "Creative"},
    {"slug": "illustration", "label": "Illustration"},
    {"slug": "photography", "label": "Photography"},
    {"slug": "typography", "label": "Typography"},
    {"slug": "gradient", "label": "Gradient"},
    {"slug": "pattern", "label": "Pattern"},
    {"slug": "bento-grid", "label": "Bento Grid"},
    {"slug": "isometric", "label": "Isometric"},
    {"slug": "retro-style", "label": "Retro Style"},
    {"slug": "blog", "label": "Blog"},
    {"slug": "news", "label": "News"},
    {"slug": "magazine", "label": "Magazine"},
    {"slug": "entertainment", "label": "Entertainment"},
    {"slug": "film", "label": "Film"},
    {"slug": "music", "label": "Music"},
    {"slug": "game", "label": "Game"},
    {"slug": "education", "label": "Education"},
    {"slug": "course", "label": "Course"},
    {"slug": "book", "label": "Book"},
    {"slug": "social-media", "label": "Social Media"},
    {"slug": "community", "label": "Community"},
    {"slug": "event", "label": "Event"},
    {"slug": "fashion", "label": "Fashion"},
    {"slug": "beauty", "label": "Beauty"},
    {"slug": "lifestyle", "label": "Lifestyle"},
    {"slug": "health-fitness", "label": "Health & Fitness"},
    {"slug": "food-drinks", "label": "Food & Drinks"},
    {"slug": "outdoors-travel", "label": "Outdoors Travel"},
    {"slug": "sports", "label": "Sports"},
    {"slug": "culture", "label": "Culture"},
    {"slug": "marketplace", "label": "Marketplace"},
    {"slug": "real-estate", "label": "Real Estate"},
    {"slug": "furniture-interiors", "label": "Furniture & Interiors"},
    {"slug": "home-living", "label": "Home & Living"},
    {"slug": "freelance", "label": "Freelance"},
    {"slug": "insurance", "label": "Insurance"},
    {"slug": "architecture", "label": "Architecture"},
    {"slug": "hosting", "label": "Hosting"},
    {"slug": "cms", "label": "CMS"},
    {"slug": "mail", "label": "Mail"},
    {"slug": "bot", "label": "Bot"},
    {"slug": "hardware", "label": "Hardware"},
    {"slug": "wearable", "label": "Wearable"},
    {"slug": "automotive", "label": "Automotive"},
    {"slug": "nft", "label": "NFT"},
    {"slug": "metaverse", "label": "Metaverse"},
    {"slug": "prototype", "label": "Prototype"},
    {"slug": "coming-soon", "label": "Coming Soon"},
    {"slug": "biotechnology", "label": "Biotechnology"},
    {"slug": "wellness", "label": "Wellness"},
    {"slug": "foundry", "label": "Foundry"},
    {"slug": "podcast", "label": "Podcast"},
    {"slug": "miscellaneous", "label": "Miscellaneous"},
]


# SiteInspire "Types" — slugs lifted from /websites/category/<slug> hrefs on
# the live Types tab at https://www.siteinspire.com/websites. 37 total.
_SITEINSPIRE_TYPES = [
    {"slug": "agencies-and-consultancies", "label": "Agencies & Consultancies"},
    {"slug": "annual-reports", "label": "Annual Reports"},
    {"slug": "awards", "label": "Awards"},
    {"slug": "blog", "label": "Blog"},
    {"slug": "cafes-bars-and-restaurants", "label": "Cafés, Bars & Restaurants"},
    {"slug": "community", "label": "Community"},
    {"slug": "conferences-and-festivals", "label": "Conferences & Festivals"},
    {"slug": "creative-showcase", "label": "Creative Showcase"},
    {"slug": "dance-and-theatre", "label": "Dance & Theatre"},
    {"slug": "e-commerce", "label": "E-Commerce"},
    {"slug": "educational-resource", "label": "Educational Resource"},
    {"slug": "event-calendar", "label": "Event Calendar"},
    {"slug": "exhibitions", "label": "Exhibitions"},
    {"slug": "florists", "label": "Florists"},
    {"slug": "galleries-and-museums", "label": "Galleries & Museums"},
    {"slug": "hotels-and-venues", "label": "Hotels & Venues"},
    {"slug": "magazines", "label": "Magazines"},
    {"slug": "medicine-and-pharmaceutical", "label": "Medicine & Pharmaceutical"},
    {"slug": "mobile-and-web-applications", "label": "Mobile & Web Applications"},
    {"slug": "music-artists-and-bands", "label": "Music Artists & Bands"},
    {"slug": "music-network", "label": "Music Network"},
    {"slug": "newspaper", "label": "Newspaper"},
    {"slug": "non-profit-and-charity", "label": "Non-profit & Charity"},
    {"slug": "personal", "label": "Personal"},
    {"slug": "portfolio", "label": "Portfolio"},
    {"slug": "product-catalogues-and-collections", "label": "Product Catalogues & Collections"},
    {"slug": "property", "label": "Property"},
    {"slug": "radio-and-podcasts", "label": "Radio & Podcasts"},
    {"slug": "recipes", "label": "Recipes"},
    {"slug": "record-labels", "label": "Record Labels"},
    {"slug": "reference-directories", "label": "Reference & Directories"},
    {"slug": "schools-colleges-and-universities", "label": "Schools, Colleges & Universities"},
    {"slug": "tech-start-ups", "label": "Tech Start-ups"},
    {"slug": "travel-agencies", "label": "Travel Agencies"},
    {"slug": "type-foundry", "label": "Type Foundry"},
    {"slug": "videos", "label": "Videos"},
    {"slug": "winery-vineyard", "label": "Winery & Vineyard"},
]


# Land-book industries — slugs lifted from `data-filter-value` on the live
# filter buttons at land-book.com (Industry section). 37 total.
_LANDBOOK_INDUSTRIES = [
    {"slug": "advertising", "label": "Advertising"},
    {"slug": "ai", "label": "AI"},
    {"slug": "animals", "label": "Animals"},
    {"slug": "architecture", "label": "Architecture"},
    {"slug": "art", "label": "Art"},
    {"slug": "automotive", "label": "Automotive"},
    {"slug": "beauty", "label": "Beauty"},
    {"slug": "charity", "label": "Charity"},
    {"slug": "design", "label": "Design"},
    {"slug": "ecommerce", "label": "Ecommerce"},
    {"slug": "education", "label": "Education"},
    {"slug": "event", "label": "Event"},
    {"slug": "fashion", "label": "Fashion"},
    {"slug": "finance", "label": "Finance"},
    {"slug": "food-and-drinks", "label": "Food & Drinks"},
    {"slug": "furniture-and-interiors", "label": "Furniture & Interiors"},
    {"slug": "gaming", "label": "Gaming"},
    {"slug": "health-and-fitness", "label": "Health & Fitness"},
    {"slug": "hr", "label": "HR"},
    {"slug": "kids", "label": "Kids"},
    {"slug": "local-business", "label": "Local Business"},
    {"slug": "magazine", "label": "Magazine"},
    {"slug": "marketing", "label": "Marketing"},
    {"slug": "medical", "label": "Medical"},
    {"slug": "movie", "label": "Movie"},
    {"slug": "music", "label": "Music"},
    {"slug": "nature", "label": "Nature"},
    {"slug": "news", "label": "News"},
    {"slug": "nft-crypto-web3", "label": "NFT / Crypto / Web3"},
    {"slug": "photography", "label": "Photography"},
    {"slug": "pr", "label": "PR"},
    {"slug": "productivity", "label": "Productivity"},
    {"slug": "real-estate", "label": "Real Estate"},
    {"slug": "sport", "label": "Sport"},
    {"slug": "tech", "label": "Tech"},
    {"slug": "travel", "label": "Travel"},
    {"slug": "writing", "label": "Writing"},
]


_CONFIG = {
    "model": "gemini-2.5-flash",
    "output_field": "inspiration_queries",
    "galleries": [
        {
            "id": "dribbble",
            "name": "Dribbble",
            "url_template": "https://dribbble.com/search/{{query}}?s=popular",
            "prompt_hint": (
                "Short query, 2-4 words, and ALWAYS include the word "
                "'website' (e.g. 'restaurant website', 'minimal saas "
                "website'). Do NOT use 'UI', 'UX', 'app', 'dashboard', "
                "'mobile', or other product/screen terms — we want full "
                "website shots only."
            ),
        },
        {
            "id": "behance",
            "name": "Behance",
            "url_template": (
                "https://www.behance.net/search/projects/{{query}}"
                "?tracking_source=typeahead_search_direct"
            ),
            # Mirror gallery: the LLM never sees Behance — it reuses the
            # exact query generated for Dribbble.
            "reuse_query_from": "dribbble",
        },
        {
            "id": "awwwards",
            "name": "Awwwards",
            "url_template": "https://www.awwwards.com/inspiration_search/?text={{query}}",
            "prompt_hint": (
                "2-4 words combining industry + style "
                "(e.g. 'fintech minimal portfolio'). Awwwards indexes "
                "full sites, so think landing-page energy."
            ),
        },
        {
            "id": "pinterest",
            "name": "Pinterest",
            "url_template": "https://www.pinterest.com/search/pins/?q={{query}}",
            "prompt_hint": (
                "Broader mood/aesthetic terms, 2-5 words "
                "(e.g. 'editorial typography layout', 'warm earthy brand')."
            ),
        },
        {
            "id": "lapa",
            "name": "Lapa Ninja",
            "url_template": "https://www.lapa.ninja/category/{{query}}/",
            "prompt_hint": (
                "Pick the SINGLE Lapa category whose industry/topic best "
                "matches the brief. Prefer industry slugs (saas, agency, "
                "ecommerce, fintech, etc.) over pure-style ones unless the "
                "brief is style-driven."
            ),
            "categories": _LAPA_CATEGORIES,
        },
        {
            "id": "siteinspire",
            "name": "SiteInspire",
            "url_template": "https://www.siteinspire.com/websites/category/{{query}}",
            "prompt_hint": (
                "Pick the SINGLE SiteInspire type that matches the brief's "
                "business model (e-commerce, portfolio, agencies, etc.)."
            ),
            "categories": _SITEINSPIRE_TYPES,
        },
        {
            "id": "landbook",
            "name": "Land-book",
            "url_template": "https://land-book.com/?industry={{query}}",
            "prompt_hint": (
                "Pick the SINGLE Land-book industry that matches the brief. "
                "Land-book is heavy on SaaS + startup landing pages."
            ),
            "categories": _LANDBOOK_INDUSTRIES,
        },
    ],
    "meta_prompt": (
        "You are picking search inputs for a design inspiration session for "
        "the website briefed below.\n\n"
        "Brief: {{design_prompt}}\n"
        "Business name: {{name}}\n"
        "Category: {{category}}\n\n"
        "For each gallery, follow ITS rule exactly: free-text galleries want "
        "a short search query tuned to what that gallery is known for; "
        "category galleries want you to pick ONE slug from their allowed list. "
        "Tailor each value to surface visually relevant inspiration for the "
        "brief above.\n\n"
        "AVOID generic design buzzwords in free-text queries — do NOT use "
        "'modern', 'clean', 'aesthetic', 'beautiful', 'stunning', 'sleek', "
        "'elegant', 'professional', 'creative', 'unique', 'awesome', or "
        "similar empty adjectives. They match everything and surface nothing. "
        "Use concrete, specific nouns instead (industry, business type, "
        "visual element, era/style name)."
    ),
}


def main() -> int:
    with session() as c:
        existing = ai_tasks.get(c, _NAME)
        ai_tasks.upsert(
            c,
            name=_NAME,
            label=(existing or {}).get("label") or _LABEL,
            config=_CONFIG,
            enabled=bool((existing or {}).get("enabled", True)),
            sort_order=int((existing or {}).get("sort_order") or 80),
            task_type="place",
        )
    print(f"seeded ai_task: {_NAME}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
