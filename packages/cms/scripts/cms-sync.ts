#!/usr/bin/env bun
/**
 * CMS sync — push local TSX fallbacks to the DB, or pull DB content back into TSX.
 *
 * Usage:
 *   bun packages/cms/scripts/cms-sync.ts <pull|push> [--site <slug|all>] [--dry-run]
 *
 * Without --site, an arrow-key picker lists all sites discovered under sites/*
 * (each site's slug is read from its own .env.local). Choosing "All" runs the
 * operation against every site in sequence.
 *
 * Each site provides its own Supabase credentials through .env.local:
 *   NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY (pull),
 *   SUPABASE_SERVICE_ROLE_KEY (push).
 *
 * Supported tags:
 *   <EditableText cmsKey="..." fallback="..." />
 *   <EditableImage cmsKey="..." fallback={{ src, alt }} />
 *   <EditableLink  cmsKey="..." fallback={{ href, label }} />
 *   <EditableList  cmsKey="..." fallback={[{ id, ...fields }, ...]} />
 *      (each item's fields become text rows at `${cmsKey}.${id}.${field}`,
 *       and the list row itself is upserted with `{ ids: [...] }`)
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import * as readline from "node:readline";

// ---------------------------------------------------------------------------
// Args
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);
const command = args[0] as "pull" | "push" | undefined;
const siteFlagIdx = args.indexOf("--site");
const explicitSite =
  siteFlagIdx !== -1 ? args[siteFlagIdx + 1]?.trim() : undefined;
const dryRun = args.includes("--dry-run");

if (!command || !["pull", "push"].includes(command)) {
  console.error(
    "Usage: cms-sync <pull|push> [--site <slug|all>] [--dry-run]",
  );
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Repo / site discovery
// ---------------------------------------------------------------------------

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, "..", "..", "..");
const SITES_DIR = path.join(REPO_ROOT, "sites");

type Site = { slug: string; siteDir: string };

function loadEnv(envPath: string): Record<string, string> {
  if (!fs.existsSync(envPath)) return {};
  const out: Record<string, string> = {};
  for (const raw of fs.readFileSync(envPath, "utf-8").split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!m) continue;
    let value = m[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[m[1]] = value;
  }
  return out;
}

function discoverSites(): Site[] {
  if (!fs.existsSync(SITES_DIR)) return [];
  const sites: Site[] = [];
  for (const entry of fs.readdirSync(SITES_DIR, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const siteDir = path.join(SITES_DIR, entry.name);
    const env = loadEnv(path.join(siteDir, ".env.local"));
    if (!env.SITE_SLUG) continue;
    sites.push({ slug: env.SITE_SLUG, siteDir });
  }
  return sites.sort((a, b) => a.slug.localeCompare(b.slug));
}

// ---------------------------------------------------------------------------
// Interactive arrow-key picker
// ---------------------------------------------------------------------------

async function pickFromList<T>(
  prompt: string,
  options: { label: string; value: T }[],
): Promise<T> {
  const stdin = process.stdin;
  const stdout = process.stdout;
  if (!stdin.isTTY) {
    throw new Error(
      "Interactive picker requires a TTY. Pass --site <slug|all> to skip.",
    );
  }

  return new Promise((resolve) => {
    let cursor = 0;
    let drawn = false;

    function render() {
      if (drawn) {
        stdout.write(`\x1b[${options.length}A`);
      }
      drawn = true;
      for (let i = 0; i < options.length; i++) {
        stdout.write("\r\x1b[K");
        if (i === cursor) {
          stdout.write(`\x1b[36m›\x1b[0m \x1b[1m${options[i].label}\x1b[0m\n`);
        } else {
          stdout.write(`  ${options[i].label}\n`);
        }
      }
    }

    stdout.write(`\n${prompt}\n\n`);
    render();

    readline.emitKeypressEvents(stdin);
    stdin.setRawMode(true);
    stdin.resume();

    function onKey(_str: string, key: readline.Key) {
      if (key.ctrl && key.name === "c") {
        cleanup();
        process.exit(130);
      }
      if (key.name === "up") {
        cursor = (cursor - 1 + options.length) % options.length;
        render();
      } else if (key.name === "down") {
        cursor = (cursor + 1) % options.length;
        render();
      } else if (key.name === "return") {
        cleanup();
        stdout.write("\n");
        resolve(options[cursor].value);
      }
    }

    function cleanup() {
      stdin.setRawMode(false);
      stdin.removeListener("keypress", onKey);
      stdin.pause();
    }

    stdin.on("keypress", onKey);
  });
}

// ---------------------------------------------------------------------------
// File walker
// ---------------------------------------------------------------------------

function walkTsx(dir: string): string[] {
  const out: string[] = [];
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".") || entry.name === "node_modules") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...walkTsx(full));
    } else if (entry.isFile() && entry.name.endsWith(".tsx")) {
      out.push(full);
    }
  }
  return out;
}

function getTsxFiles(siteDir: string): string[] {
  return [
    ...walkTsx(path.join(siteDir, "app")),
    ...walkTsx(path.join(siteDir, "components")),
  ];
}

// ---------------------------------------------------------------------------
// JSX self-closing tag extractor (brace-balanced so inner JSX doesn't trick us)
// ---------------------------------------------------------------------------

type TagMatch = { match: string; start: number; end: number };

function findSelfClosingTags(src: string, tagName: string): TagMatch[] {
  const results: TagMatch[] = [];
  const re = new RegExp(`<${tagName}\\b`, "g");
  let m: RegExpExecArray | null;
  while ((m = re.exec(src)) !== null) {
    const start = m.index;
    let i = start + m[0].length;
    let braceDepth = 0;
    while (i < src.length - 1) {
      const ch = src[i];
      if (ch === "{") braceDepth++;
      else if (ch === "}") braceDepth--;
      else if (
        braceDepth === 0 &&
        ch === "/" &&
        src[i + 1] === ">"
      ) {
        const end = i + 2;
        results.push({ match: src.slice(start, end), start, end });
        re.lastIndex = end;
        break;
      }
      i++;
    }
  }
  return results;
}

// ---------------------------------------------------------------------------
// Prop extraction
// ---------------------------------------------------------------------------

const CMS_KEY_RE = /cmsKey="([^"]+)"/;
const FALLBACK_STR_RE = /fallback="([^"]*)"/;
const FALLBACK_OBJ_RE = /fallback=\{\{([\s\S]*?)\}\}/;

function extractStringProp(obj: string, name: string): string | undefined {
  const re = new RegExp(`${name}\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"`, "s");
  const m = obj.match(re);
  return m ? m[1].replace(/\\(.)/g, "$1") : undefined;
}

/** Find `fallback={[ ... ]}` in a tag and return the bracket-balanced inner. */
function extractFallbackArrayBlock(tagSource: string): string | undefined {
  const idx = tagSource.indexOf("fallback={[");
  if (idx === -1) return undefined;
  // Position right after the opening `[`
  let i = idx + "fallback={".length;
  // Now src[i] === "[". Walk and balance.
  let bracketDepth = 0;
  let braceDepth = 0;
  const start = i + 1;
  for (; i < tagSource.length; i++) {
    const ch = tagSource[i];
    if (ch === "[") bracketDepth++;
    else if (ch === "]") {
      bracketDepth--;
      if (bracketDepth === 0 && braceDepth === 0) {
        return tagSource.slice(start, i);
      }
    } else if (ch === "{") braceDepth++;
    else if (ch === "}") braceDepth--;
  }
  return undefined;
}

type FallbackItem = { id: string; fields: Record<string, string> };

function parseFallbackArray(arrayInner: string): FallbackItem[] {
  const items: FallbackItem[] = [];
  let depth = 0;
  let start = -1;
  for (let i = 0; i < arrayInner.length; i++) {
    const ch = arrayInner[i];
    if (ch === "{") {
      if (depth === 0) start = i;
      depth++;
    } else if (ch === "}") {
      depth--;
      if (depth === 0 && start >= 0) {
        const block = arrayInner.slice(start, i + 1);
        const parsed = parseObjectLiteral(block);
        if (parsed.id) items.push(parsed);
        start = -1;
      }
    }
  }
  return items;
}

function parseObjectLiteral(text: string): FallbackItem {
  const fields: Record<string, string> = {};
  const propRe = /(\w+)\s*:\s*"((?:[^"\\]|\\.)*)"/g;
  let m: RegExpExecArray | null;
  while ((m = propRe.exec(text)) !== null) {
    fields[m[1]] = m[2].replace(/\\(.)/g, "$1");
  }
  const id = fields.id ?? "";
  delete fields.id;
  return { id, fields };
}

// ---------------------------------------------------------------------------
// Extraction model
// ---------------------------------------------------------------------------

type Extraction =
  | {
      kind: "text";
      key: string;
      value: { text: string };
      match: string;
      file: string;
    }
  | {
      kind: "image";
      key: string;
      value: { src: string; alt: string };
      match: string;
      file: string;
    }
  | {
      kind: "link";
      key: string;
      value: { href: string; label: string };
      match: string;
      file: string;
    }
  | {
      kind: "list";
      key: string;
      value: { ids: string[] };
      match: string;
      file: string;
      // Synthetic per-field rows derived from each fallback item.
      children: { key: string; value: { text: string } }[];
    };

function extractFromFile(filePath: string): Extraction[] {
  const src = fs.readFileSync(filePath, "utf-8");
  const results: Extraction[] = [];

  for (const tag of findSelfClosingTags(src, "EditableText")) {
    const key = tag.match.match(CMS_KEY_RE)?.[1];
    const fallback = tag.match.match(FALLBACK_STR_RE)?.[1];
    if (key && fallback !== undefined) {
      results.push({
        kind: "text",
        key,
        value: { text: fallback },
        match: tag.match,
        file: filePath,
      });
    }
  }

  for (const tag of findSelfClosingTags(src, "EditableImage")) {
    const key = tag.match.match(CMS_KEY_RE)?.[1];
    const obj = tag.match.match(FALLBACK_OBJ_RE)?.[1];
    if (key && obj) {
      const src_ = extractStringProp(obj, "src");
      const alt = extractStringProp(obj, "alt");
      if (src_ !== undefined && alt !== undefined) {
        results.push({
          kind: "image",
          key,
          value: { src: src_, alt },
          match: tag.match,
          file: filePath,
        });
      }
    }
  }

  for (const tag of findSelfClosingTags(src, "EditableLink")) {
    const key = tag.match.match(CMS_KEY_RE)?.[1];
    const obj = tag.match.match(FALLBACK_OBJ_RE)?.[1];
    if (key && obj) {
      const href = extractStringProp(obj, "href");
      const label = extractStringProp(obj, "label");
      if (href !== undefined && label !== undefined) {
        results.push({
          kind: "link",
          key,
          value: { href, label },
          match: tag.match,
          file: filePath,
        });
      }
    }
  }

  for (const tag of findSelfClosingTags(src, "EditableList")) {
    const key = tag.match.match(CMS_KEY_RE)?.[1];
    const arrayInner = extractFallbackArrayBlock(tag.match);
    if (!key || arrayInner === undefined) continue;
    const items = parseFallbackArray(arrayInner);
    const children = items.flatMap((it) =>
      Object.entries(it.fields).map(([field, value]) => ({
        key: `${key}.${it.id}.${field}`,
        value: { text: value },
      })),
    );
    results.push({
      kind: "list",
      key,
      value: { ids: items.map((it) => it.id) },
      match: tag.match,
      file: filePath,
      children,
    });
  }

  return results;
}

// ---------------------------------------------------------------------------
// Pull: DB → code (only updates content of EXISTING tags / fallback entries)
// ---------------------------------------------------------------------------

function escapeJsxString(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function replaceLeafFallback(
  tagSource: string,
  kind: "text" | "image" | "link",
  value: Record<string, unknown>,
): string {
  if (kind === "text") {
    const text = String(value.text ?? "");
    return tagSource.replace(
      /fallback="[^"]*"/,
      `fallback="${escapeJsxString(text)}"`,
    );
  }
  if (kind === "image") {
    let updated = tagSource.replace(
      /src:\s*"[^"]*"/,
      `src: "${escapeJsxString(String(value.src ?? ""))}"`,
    );
    updated = updated.replace(
      /alt:\s*"[^"]*"/,
      `alt: "${escapeJsxString(String(value.alt ?? ""))}"`,
    );
    return updated;
  }
  // link
  let updated = tagSource.replace(
    /href:\s*"[^"]*"/,
    `href: "${escapeJsxString(String(value.href ?? ""))}"`,
  );
  updated = updated.replace(
    /label:\s*"[^"]*"/,
    `label: "${escapeJsxString(String(value.label ?? ""))}"`,
  );
  return updated;
}

/** Replace `field: "..."` inside a single object literal block. */
function replaceObjectField(
  block: string,
  field: string,
  value: string,
): string {
  const re = new RegExp(`(${field}\\s*:\\s*)"(?:[^"\\\\]|\\\\.)*"`);
  if (!re.test(block)) return block;
  return block.replace(re, `$1"${escapeJsxString(value)}"`);
}

/**
 * Replace one item's fields inside a list tag's `fallback={[...]}`. Only
 * fields that already exist in the source block are written; we never add or
 * reorder entries during pull.
 */
function replaceListItemField(
  tagSource: string,
  itemId: string,
  field: string,
  value: string,
): string {
  const inner = extractFallbackArrayBlock(tagSource);
  if (inner === undefined) return tagSource;
  const innerStart = tagSource.indexOf(inner);
  if (innerStart === -1) return tagSource;

  let depth = 0;
  let blockStart = -1;
  for (let i = 0; i < inner.length; i++) {
    const ch = inner[i];
    if (ch === "{") {
      if (depth === 0) blockStart = i;
      depth++;
    } else if (ch === "}") {
      depth--;
      if (depth === 0 && blockStart >= 0) {
        const block = inner.slice(blockStart, i + 1);
        const idMatch = block.match(/id\s*:\s*"((?:[^"\\]|\\.)*)"/);
        if (idMatch && idMatch[1].replace(/\\(.)/g, "$1") === itemId) {
          const replaced = replaceObjectField(block, field, value);
          if (replaced === block) return tagSource;
          const before = tagSource.slice(0, innerStart + blockStart);
          const after = tagSource.slice(innerStart + i + 1);
          return before + replaced + after;
        }
        blockStart = -1;
      }
    }
  }
  return tagSource;
}

type CmsRow = { key: string; kind: string; value: Record<string, unknown> };

async function pull(supabase: SupabaseClient, siteId: string, siteDir: string) {
  const { data: rows, error } = await supabase
    .from("cms_content")
    .select("key, kind, value")
    .eq("site_id", siteId);
  if (error) throw new Error(`Failed to fetch content: ${error.message}`);

  const byKey = new Map<string, CmsRow>();
  for (const row of rows as CmsRow[]) byKey.set(row.key, row);

  const files = getTsxFiles(siteDir);
  let totalUpdated = 0;

  for (const filePath of files) {
    const extractions = extractFromFile(filePath);
    if (extractions.length === 0) continue;

    let src = fs.readFileSync(filePath, "utf-8");
    let fileUpdated = 0;
    const relPath = filePath.replace(REPO_ROOT + "/", "");

    for (const ext of extractions) {
      if (ext.kind === "list") {
        // For each child key in the source, update its corresponding entry's
        // field if a DB row exists.
        let nextTag = ext.match;
        for (const child of ext.children) {
          const dbRow = byKey.get(child.key);
          if (!dbRow || dbRow.kind !== "text") continue;
          const dbText = String(
            (dbRow.value as { text?: unknown }).text ?? "",
          );
          // child.key === `${list.key}.${id}.${field}`
          const rest = child.key.slice(ext.key.length + 1); // `${id}.${field}`
          const dot = rest.lastIndexOf(".");
          if (dot === -1) continue;
          const itemId = rest.slice(0, dot);
          const field = rest.slice(dot + 1);
          const replaced = replaceListItemField(nextTag, itemId, field, dbText);
          if (replaced !== nextTag) {
            nextTag = replaced;
            fileUpdated++;
            console.log(`  ${relPath}: ${child.key}`);
          }
        }
        if (nextTag !== ext.match) {
          src = src.replace(ext.match, nextTag);
        }
        continue;
      }

      const dbRow = byKey.get(ext.key);
      if (!dbRow) continue;
      if (dbRow.kind !== ext.kind) continue;
      const updated = replaceLeafFallback(ext.match, ext.kind, dbRow.value);
      if (updated !== ext.match) {
        src = src.replace(ext.match, updated);
        fileUpdated++;
        console.log(`  ${relPath}: ${ext.key}`);
      }
    }

    if (fileUpdated > 0 && !dryRun) {
      fs.writeFileSync(filePath, src, "utf-8");
    }
    totalUpdated += fileUpdated;
  }

  const prefix = dryRun ? "[DRY RUN] Would update" : "Updated";
  console.log(`\n${prefix} ${totalUpdated} fallback(s)`);
}

// ---------------------------------------------------------------------------
// Push: code → DB
// ---------------------------------------------------------------------------

async function push(supabase: SupabaseClient, siteId: string, siteDir: string) {
  const files = getTsxFiles(siteDir);
  const all: Extraction[] = [];
  for (const filePath of files) all.push(...extractFromFile(filePath));

  // Flatten list extractions into the wire shape — one row for the list itself
  // plus one row per child field.
  type WireRow = { key: string; kind: string; value: Record<string, unknown> };
  const rows: WireRow[] = [];
  for (const ext of all) {
    if (ext.kind === "list") {
      rows.push({ key: ext.key, kind: "list", value: ext.value });
      for (const child of ext.children) {
        rows.push({ key: child.key, kind: "text", value: child.value });
      }
    } else {
      rows.push({ key: ext.key, kind: ext.kind, value: ext.value });
    }
  }

  console.log(`Found ${rows.length} editable row(s) in code\n`);

  let upserted = 0;
  for (const row of rows) {
    if (dryRun) {
      console.log(`  [DRY RUN] ${row.key} (${row.kind})`);
      upserted++;
      continue;
    }
    const { error } = await supabase.from("cms_content").upsert(
      {
        site_id: siteId,
        key: row.key,
        kind: row.kind,
        value: row.value,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "site_id,key" },
    );
    if (error) {
      console.error(`  FAILED ${row.key}: ${error.message}`);
    } else {
      console.log(`  ${row.key} (${row.kind})`);
      upserted++;
    }
  }

  const prefix = dryRun ? "[DRY RUN] Would upsert" : "Upserted";
  console.log(`\n${prefix} ${upserted} row(s)`);
}

// ---------------------------------------------------------------------------
// Per-site driver
// ---------------------------------------------------------------------------

async function syncOneSite(site: Site) {
  const env = loadEnv(path.join(site.siteDir, ".env.local"));
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    command === "push"
      ? env.SUPABASE_SERVICE_ROLE_KEY
      : env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    console.error(
      `[${site.slug}] Missing ${command === "push" ? "SUPABASE_SERVICE_ROLE_KEY" : "NEXT_PUBLIC_SUPABASE_ANON_KEY"} or NEXT_PUBLIC_SUPABASE_URL in .env.local`,
    );
    return;
  }
  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: row, error } = await supabase
    .from("sites")
    .select("id")
    .eq("slug", site.slug)
    .single();
  if (error || !row) {
    console.error(`[${site.slug}] site not found in DB: ${error?.message}`);
    return;
  }

  console.log(`\n=== ${site.slug} (${row.id}) — ${command}${dryRun ? " (dry run)" : ""} ===`);
  if (command === "push") {
    await push(supabase, row.id as string, site.siteDir);
  } else {
    await pull(supabase, row.id as string, site.siteDir);
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const sites = discoverSites();
  if (sites.length === 0) {
    console.error("No sites discovered under sites/* with SITE_SLUG set.");
    process.exit(1);
  }

  let selected: Site[];
  if (explicitSite === "all") {
    selected = sites;
  } else if (explicitSite) {
    const found = sites.find((s) => s.slug === explicitSite);
    if (!found) {
      console.error(
        `Site "${explicitSite}" not found. Available: ${sites.map((s) => s.slug).join(", ")}`,
      );
      process.exit(1);
    }
    selected = [found];
  } else {
    const choice = await pickFromList(
      `Which site do you want to sync (${command})?`,
      [
        { label: "All", value: "all" as const },
        ...sites.map((s) => ({ label: s.slug, value: s.slug })),
      ],
    );
    selected = choice === "all" ? sites : [sites.find((s) => s.slug === choice)!];
  }

  for (const site of selected) {
    try {
      await syncOneSite(site);
    } catch (err) {
      console.error(
        `[${site.slug}] failed:`,
        err instanceof Error ? err.message : err,
      );
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
