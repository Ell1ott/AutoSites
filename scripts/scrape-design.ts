#!/usr/bin/env bun
import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const url = process.argv[2];
if (!url) {
  console.error("usage: bun scripts/scrape-design.ts <url> [outName]");
  process.exit(1);
}

const here = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(here, "../sites/design-test");
const host = new URL(url).hostname.replace(/^www\./, "");
const slug = (process.argv[3] || host).replace(/[^a-z0-9.-]+/gi, "-");
const htmlPath = resolve(outDir, `${slug}.html`);
const pngPath = resolve(outDir, `${slug}.png`);

const browser = await chromium.launch({ headless: false });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();

console.log(`→ ${url}`);
try {
  await page.goto(url, { waitUntil: "load", timeout: 30_000 });
} catch (e) {
  console.warn(`  load event timed out, continuing with whatever rendered: ${(e as Error).message.split("\n")[0]}`);
}
// Best-effort: wait for network to quiet, but don't fail if it never does
await page.waitForLoadState("networkidle", { timeout: 8_000 }).catch(() => {});
// Let lazy-loaded fonts/images settle
await page.waitForTimeout(1500);

await page.screenshot({ path: pngPath, fullPage: true });

// Collect stylesheets (external + inline) in document order, plus the base URL.
const sheets = await page.evaluate(() => {
  const out: { kind: "link" | "style"; href?: string; css?: string }[] = [];
  for (const el of Array.from(document.querySelectorAll('link[rel~="stylesheet"], style'))) {
    if (el.tagName === "LINK") {
      const href = (el as HTMLLinkElement).href;
      if (href) out.push({ kind: "link", href });
    } else {
      out.push({ kind: "style", css: el.textContent || "" });
    }
  }
  return out;
});

const baseHref = await page.evaluate(() => document.baseURI);

// Fetch every external stylesheet via the browser context so cookies/origin match.
async function fetchText(u: string): Promise<string | null> {
  try {
    const res = await ctx.request.get(u);
    if (!res.ok()) return null;
    return await res.text();
  } catch {
    return null;
  }
}

// Rewrite url(...) and @import in CSS so relative refs resolve from the sheet's URL.
function absolutizeCss(css: string, sheetUrl: string): string {
  const abs = (raw: string) => {
    const v = raw.trim().replace(/^['"]|['"]$/g, "");
    if (!v || v.startsWith("data:") || v.startsWith("#")) return raw;
    try {
      return `"${new URL(v, sheetUrl).toString()}"`;
    } catch {
      return raw;
    }
  };
  return css
    .replace(/url\(\s*([^)]+?)\s*\)/g, (_m, v) => `url(${abs(v)})`)
    .replace(/@import\s+(?:url\()?\s*(['"][^'"]+['"]|[^;)\s]+)\s*\)?\s*([^;]*);/g, (_m, v, media) => {
      return `@import url(${abs(v)})${media ? " " + media.trim() : ""};`;
    });
}

const inlinedSheets: string[] = [];
for (const s of sheets) {
  if (s.kind === "style" && s.css) {
    inlinedSheets.push(`<style>${absolutizeCss(s.css, baseHref)}</style>`);
  } else if (s.kind === "link" && s.href) {
    const css = await fetchText(s.href);
    if (css) {
      inlinedSheets.push(`<style data-from="${s.href}">${absolutizeCss(css, s.href)}</style>`);
    } else {
      // fall back to leaving the link so the file at least references it
      inlinedSheets.push(`<link rel="stylesheet" href="${s.href}">`);
    }
  }
}

// Get rendered HTML, strip the original stylesheets, and absolutize asset URLs.
let html = await page.content();

// Remove <link rel=stylesheet> and <style> — we'll inject our inlined versions.
html = html
  .replace(/<link[^>]+rel=["']?stylesheet["']?[^>]*>/gi, "")
  .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "");

// Absolutize src/href/srcset on remaining tags so images/fonts/icons still load.
function absolutize(attr: string, val: string): string {
  if (!val || val.startsWith("data:") || val.startsWith("#") || val.startsWith("javascript:")) return val;
  if (attr === "srcset") {
    return val
      .split(",")
      .map((part) => {
        const [u, ...rest] = part.trim().split(/\s+/);
        try { return [new URL(u, baseHref).toString(), ...rest].join(" "); }
        catch { return part.trim(); }
      })
      .join(", ");
  }
  try { return new URL(val, baseHref).toString(); }
  catch { return val; }
}
html = html.replace(/\s(src|href|srcset|poster)=("([^"]*)"|'([^']*)')/gi, (_m, attr, _q, dq, sq) => {
  const v = dq ?? sq ?? "";
  return ` ${attr}="${absolutize(attr.toLowerCase(), v).replace(/"/g, "&quot;")}"`;
});

// Inject our inlined stylesheets into <head> (or prepend if no head).
const injected = inlinedSheets.join("\n");
if (/<head[^>]*>/i.test(html)) {
  html = html.replace(/<head([^>]*)>/i, `<head$1>\n<!-- scraped from ${url} on ${new Date().toISOString()} -->\n${injected}\n`);
} else {
  html = `<!-- scraped from ${url} -->\n${injected}\n${html}`;
}

await mkdir(outDir, { recursive: true });
await writeFile(htmlPath, html, "utf8");

await browser.close();
console.log(`✓ ${htmlPath}`);
console.log(`✓ ${pngPath}`);
