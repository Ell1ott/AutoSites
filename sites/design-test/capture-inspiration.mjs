#!/usr/bin/env node
/**
 * Capture a live webpage for AI design inspiration.
 *
 * Usage:
 *   node capture-inspiration.mjs <url> [--out ./captures/my-site]
 *   npm run capture -- https://example.com
 *
 * Output folder:
 *   page.html      — rendered DOM after JS runs
 *   styles.css     — inline <style> blocks + fetched stylesheet text
 *   screenshot.png — full-page screenshot
 *   manifest.json  — url, title, fonts, meta, file list
 */

import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const DEFAULT_VIEWPORT = { width: 1440, height: 900 };

function usage() {
  console.error(`Usage: node capture-inspiration.mjs <url> [--out <dir>]

Options:
  --out <dir>   Output directory (default: ./captures/<hostname>-<timestamp>)
`);
  process.exit(1);
}

function parseArgs(argv) {
  const positional = [];
  let outDir = null;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--out" || arg === "-o") {
      outDir = argv[++i];
      if (!outDir) usage();
    } else if (arg.startsWith("-")) {
      console.error(`Unknown option: ${arg}`);
      usage();
    } else {
      positional.push(arg);
    }
  }

  const url = positional[0];
  if (!url) usage();

  return { url, outDir };
}

async function launchBrowser() {
  const opts = { headless: false };
  try {
    return await chromium.launch(opts);
  } catch {
    // Use installed Chrome when Playwright browsers aren't downloaded
    return await chromium.launch({ ...opts, channel: "chrome" });
  }
}

function defaultOutDir(url) {
  const { hostname } = new URL(url);
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  return path.join("captures", `${hostname}-${stamp}`);
}

/** Pull all CSS text the page uses (style tags + linked sheets). */
async function collectCss(page) {
  return page.evaluate(async () => {
    const chunks = [];
    const origin = location.origin;

    for (const el of document.querySelectorAll("style")) {
      if (el.textContent?.trim()) {
        chunks.push(`/* <style> */\n${el.textContent}`);
      }
    }

    const links = [...document.querySelectorAll('link[rel="stylesheet"]')];
    for (const link of links) {
      const href = link.href;
      if (!href) continue;
      try {
        const res = await fetch(href);
        if (!res.ok) {
          chunks.push(`/* failed: ${href} (${res.status}) */`);
          continue;
        }
        const css = await res.text();
        const label = href.startsWith(origin) ? href.replace(origin, "") : href;
        chunks.push(`/* ${label} */\n${css}`);
      } catch (err) {
        chunks.push(`/* failed: ${href} — ${err?.message ?? err} */`);
      }
    }

    return chunks.join("\n\n/* --- */\n\n");
  });
}

/** Sample fonts and CSS variables useful for design briefs. */
async function collectDesignTokens(page) {
  return page.evaluate(() => {
    const fonts = new Set();
    const cssVars = new Map();

    const rootStyles = getComputedStyle(document.documentElement);
    for (let i = 0; i < rootStyles.length; i++) {
      const name = rootStyles[i];
      if (name.startsWith("--")) {
        cssVars.set(name, rootStyles.getPropertyValue(name).trim());
      }
    }

    const sample = document.querySelectorAll(
      "h1,h2,h3,p,a,button,nav,header,footer,main,section,article,li,span"
    );
    const limit = Math.min(sample.length, 80);
    for (let i = 0; i < limit; i++) {
      const el = sample[i];
      const font = getComputedStyle(el).fontFamily;
      if (font) fonts.add(font);
    }

    const metas = {};
    for (const m of document.querySelectorAll("meta[name], meta[property]")) {
      const key = m.getAttribute("name") || m.getAttribute("property");
      const content = m.getAttribute("content");
      if (key && content) metas[key] = content;
    }

    return {
      fonts: [...fonts].sort(),
      cssVariables: Object.fromEntries(
        [...cssVars.entries()].sort(([a], [b]) => a.localeCompare(b))
      ),
      meta: metas,
    };
  });
}

async function main() {
  const { url, outDir: outArg } = parseArgs(process.argv.slice(2));
  const outDir = path.resolve(outArg ?? defaultOutDir(url));
  await mkdir(outDir, { recursive: true });

  console.log(`Capturing ${url}`);
  console.log(`Output: ${outDir}`);

  const browser = await launchBrowser();
  const context = await browser.newContext({
    viewport: DEFAULT_VIEWPORT,
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  });
  const page = await context.newPage();

  try {
    // "networkidle" often never fires (analytics, Webflow, websockets).
    try {
      await page.goto(url, { waitUntil: "load", timeout: 30_000 });
    } catch (e) {
      console.warn(
        `  load timed out, continuing with whatever rendered: ${e.message.split("\n")[0]}`
      );
    }
    await page.waitForLoadState("networkidle", { timeout: 8_000 }).catch(() => {});
    await page.waitForTimeout(1500);

    const [html, css, tokens, title] = await Promise.all([
      page.content(),
      collectCss(page),
      collectDesignTokens(page),
      page.title(),
    ]);

    await page.screenshot({
      path: path.join(outDir, "screenshot.png"),
      fullPage: true,
    });

    const manifest = {
      capturedAt: new Date().toISOString(),
      url: page.url(),
      requestedUrl: url,
      title,
      viewport: DEFAULT_VIEWPORT,
      fonts: tokens.fonts,
      cssVariables: tokens.cssVariables,
      meta: tokens.meta,
      files: ["page.html", "styles.css", "screenshot.png", "manifest.json"],
    };

    await Promise.all([
      writeFile(path.join(outDir, "page.html"), html, "utf8"),
      writeFile(path.join(outDir, "styles.css"), css || "/* no CSS collected */\n", "utf8"),
      writeFile(path.join(outDir, "manifest.json"), JSON.stringify(manifest, null, 2), "utf8"),
    ]);

    console.log("Done:");
    for (const f of manifest.files) {
      console.log(`  ${path.join(outDir, f)}`);
    }
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
