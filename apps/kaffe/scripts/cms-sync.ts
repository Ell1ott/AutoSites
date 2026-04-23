import { createClient } from "@supabase/supabase-js";
import { globSync } from "glob";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

// ---------------------------------------------------------------------------
// ENV
// ---------------------------------------------------------------------------

function env(name: string): string {
  const v = process.env[name];
  if (!v) {
    console.error(`Missing env var: ${name}`);
    process.exit(1);
  }
  return v;
}

// Use service role key for push (bypasses RLS), fall back to anon key for pull
const command_ = process.argv[2];
const key =
  command_ === "push"
    ? env("SUPABASE_SERVICE_ROLE_KEY")
    : env("NEXT_PUBLIC_SUPABASE_ANON_KEY");

const supabase = createClient(env("NEXT_PUBLIC_SUPABASE_URL"), key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);
const command = args[0]; // "pull" | "push"
const siteFlag = args.indexOf("--site");
const siteSlug = siteFlag !== -1 ? args[siteFlag + 1] : undefined;
const dryRun = args.includes("--dry-run");

if (!command || !["pull", "push"].includes(command)) {
  console.error("Usage: cms-sync <pull|push> --site <slug> [--dry-run]");
  process.exit(1);
}
if (!siteSlug) {
  console.error("Missing --site <slug>");
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type CmsKind = "text" | "image" | "link";

interface CmsRow {
  key: string;
  kind: CmsKind;
  value: Record<string, unknown>;
}

interface Extraction {
  key: string;
  kind: CmsKind;
  value: Record<string, unknown>;
  /** full matched substring for replacement */
  match: string;
  file: string;
}

// ---------------------------------------------------------------------------
// Helpers — resolve site
// ---------------------------------------------------------------------------

async function resolveSiteId(slug: string): Promise<string> {
  const { data, error } = await supabase
    .from("sites")
    .select("id")
    .eq("slug", slug)
    .single();
  if (error || !data) {
    console.error(`Site "${slug}" not found`);
    process.exit(1);
  }
  return data.id;
}

// ---------------------------------------------------------------------------
// Helpers — glob tsx files
// ---------------------------------------------------------------------------

const ROOT = resolve(import.meta.dirname, "..");

function getTsxFiles(): string[] {
  const patterns = ["app/**/*.tsx", "components/**/*.tsx"];
  const files: string[] = [];
  for (const pattern of patterns) {
    files.push(
      ...globSync(pattern, { cwd: ROOT }).map((f) => resolve(ROOT, f)),
    );
  }
  return files;
}

// ---------------------------------------------------------------------------
// Regex helpers
// ---------------------------------------------------------------------------

// Match an entire self-closing JSX tag, including multi-line.
// e.g. <EditableText ... />  or  <EditableImage\n  ...\n/>
const TAG_RE = (name: string) =>
  new RegExp(`<${name}\\b[\\s\\S]*?/>`, "g");

const CMS_KEY_RE = /cmsKey="([^"]+)"/;
const FALLBACK_STR_RE = /fallback="([^"]*)"/;
const FALLBACK_OBJ_RE = /fallback=\{\{([\s\S]*?)\}\}/;

function extractProp(obj: string, prop: string): string | undefined {
  const re = new RegExp(`${prop}:\\s*"([^"]*)"`, "s");
  return obj.match(re)?.[1];
}

// ---------------------------------------------------------------------------
// Extract all editable usages from a file
// ---------------------------------------------------------------------------

function extractFromFile(filePath: string): Extraction[] {
  const src = readFileSync(filePath, "utf-8");
  const results: Extraction[] = [];

  // EditableText
  for (const m of src.matchAll(TAG_RE("EditableText"))) {
    const tag = m[0];
    const key = tag.match(CMS_KEY_RE)?.[1];
    const fallback = tag.match(FALLBACK_STR_RE)?.[1];
    if (key && fallback !== undefined) {
      results.push({ key, kind: "text", value: { text: fallback }, match: tag, file: filePath });
    }
  }

  // EditableImage
  for (const m of src.matchAll(TAG_RE("EditableImage"))) {
    const tag = m[0];
    const key = tag.match(CMS_KEY_RE)?.[1];
    const obj = tag.match(FALLBACK_OBJ_RE)?.[1];
    if (key && obj) {
      const src_ = extractProp(obj, "src");
      const alt = extractProp(obj, "alt");
      if (src_ !== undefined && alt !== undefined) {
        results.push({ key, kind: "image", value: { src: src_, alt }, match: tag, file: filePath });
      }
    }
  }

  // EditableLink
  for (const m of src.matchAll(TAG_RE("EditableLink"))) {
    const tag = m[0];
    const key = tag.match(CMS_KEY_RE)?.[1];
    const obj = tag.match(FALLBACK_OBJ_RE)?.[1];
    if (key && obj) {
      const href = extractProp(obj, "href");
      const label = extractProp(obj, "label");
      if (href !== undefined && label !== undefined) {
        results.push({ key, kind: "link", value: { href, label }, match: tag, file: filePath });
      }
    }
  }

  return results;
}

// ---------------------------------------------------------------------------
// Pull: DB → code
// ---------------------------------------------------------------------------

function replaceFallback(
  tagSource: string,
  kind: CmsKind,
  value: Record<string, unknown>,
): string {
  switch (kind) {
    case "text": {
      const text = String(value.text ?? "");
      return tagSource.replace(/fallback="[^"]*"/, `fallback="${escapeJsx(text)}"`);
    }
    case "image": {
      const src = String(value.src ?? "");
      const alt = String(value.alt ?? "");
      // Replace src and alt individually inside the fallback={{ }} block
      let updated = tagSource.replace(
        /src:\s*"[^"]*"/,
        `src: "${escapeJsx(src)}"`,
      );
      updated = updated.replace(
        /alt:\s*"[^"]*"/,
        `alt: "${escapeJsx(alt)}"`,
      );
      return updated;
    }
    case "link": {
      const href = String(value.href ?? "");
      const label = String(value.label ?? "");
      let updated = tagSource.replace(
        /href:\s*"[^"]*"/,
        `href: "${escapeJsx(href)}"`,
      );
      updated = updated.replace(
        /label:\s*"[^"]*"/,
        `label: "${escapeJsx(label)}"`,
      );
      return updated;
    }
  }
}

function escapeJsx(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

async function pull(siteId: string) {
  // Fetch all content rows
  const { data: rows, error } = await supabase
    .from("cms_content")
    .select("key, kind, value")
    .eq("site_id", siteId);

  if (error) {
    console.error("Failed to fetch content:", error.message);
    process.exit(1);
  }

  const contentMap = new Map<string, CmsRow>();
  for (const row of rows as CmsRow[]) {
    contentMap.set(row.key, row);
  }

  console.log(`Fetched ${contentMap.size} content rows from DB\n`);

  const files = getTsxFiles();
  let totalUpdated = 0;

  for (const filePath of files) {
    const extractions = extractFromFile(filePath);
    if (extractions.length === 0) continue;

    let src = readFileSync(filePath, "utf-8");
    let fileUpdated = 0;
    const relPath = filePath.replace(ROOT + "/", "");

    for (const ext of extractions) {
      const dbRow = contentMap.get(ext.key);
      if (!dbRow) continue;

      const updated = replaceFallback(ext.match, dbRow.kind, dbRow.value);
      if (updated !== ext.match) {
        src = src.replace(ext.match, updated);
        fileUpdated++;
        console.log(`  ${relPath}: ${ext.key}`);
      }
    }

    if (fileUpdated > 0 && !dryRun) {
      writeFileSync(filePath, src, "utf-8");
    }

    totalUpdated += fileUpdated;
  }

  const prefix = dryRun ? "[DRY RUN] Would update" : "Updated";
  console.log(`\n${prefix} ${totalUpdated} fallback(s)`);
}

// ---------------------------------------------------------------------------
// Push: code → DB
// ---------------------------------------------------------------------------

async function push(siteId: string) {
  const files = getTsxFiles();
  const allExtractions: Extraction[] = [];

  for (const filePath of files) {
    allExtractions.push(...extractFromFile(filePath));
  }

  console.log(`Found ${allExtractions.length} editable components in code\n`);

  let upserted = 0;

  for (const ext of allExtractions) {
    const relPath = ext.file.replace(ROOT + "/", "");

    if (dryRun) {
      console.log(`  [DRY RUN] ${ext.key} (${ext.kind}) from ${relPath}`);
      upserted++;
      continue;
    }

    const { error } = await supabase.from("cms_content").upsert(
      {
        site_id: siteId,
        key: ext.key,
        kind: ext.kind,
        value: ext.value,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "site_id,key" },
    );

    if (error) {
      console.error(`  FAILED ${ext.key}: ${error.message}`);
    } else {
      console.log(`  ${ext.key} (${ext.kind}) from ${relPath}`);
      upserted++;
    }
  }

  const prefix = dryRun ? "[DRY RUN] Would upsert" : "Upserted";
  console.log(`\n${prefix} ${upserted} row(s)`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const siteId = await resolveSiteId(siteSlug!);
  console.log(`Site: ${siteSlug} (${siteId})`);
  console.log(`Mode: ${command}${dryRun ? " (dry run)" : ""}\n`);

  if (command === "pull") {
    await pull(siteId);
  } else {
    await push(siteId);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
