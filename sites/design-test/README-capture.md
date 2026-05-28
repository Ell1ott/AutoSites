# Design inspiration capture

Grab a live site’s rendered HTML, CSS, screenshot, and metadata for use as AI design reference.

## Run

```bash
cd sites/design-test

bun capture-inspiration.mjs https://example.com

# or via package script
bun run capture https://example.com

# custom output folder
bun capture-inspiration.mjs https://example.com --out ./captures/example
```

## Output

| File | Contents |
|------|----------|
| `page.html` | DOM after JavaScript runs (same as “View Source” on the loaded page) |
| `styles.css` | All `<style>` blocks plus fetched linked stylesheets |
| `screenshot.png` | Full-page screenshot |
| `manifest.json` | URL, title, fonts, CSS variables, meta tags |

Point an agent at the whole folder, or paste `page.html` + `styles.css` + `screenshot.png` into context.
