/**
 * Build-time SEO prerender.
 *
 * The production website is served as STATIC files from dist/public by the
 * Replit edge CDN (see artifacts/event-perfekt/.replit-artifact/artifact.toml).
 * That means the server-side SEO middleware in the api-server
 * (artifacts/api-server/src/seo-meta-injector.ts) NEVER runs for the pages a
 * visitor or crawler actually loads — every route would otherwise serve the
 * generic homepage index.html with no per-route Open Graph / Twitter / JSON-LD.
 *
 * This script closes that gap WITHOUT changing the routing: after `vite build`,
 * it takes the built index.html and, for every route that has custom SEO,
 * writes a baked-in per-route file at dist/public/<route>/index.html using the
 * SAME rewrite logic the runtime injector uses. The CDN's `/* -> /index.html`
 * rewrite serves the deepest matching file, so /iamher gets /iamher/index.html.
 *
 * Runs via Node's built-in TypeScript type-stripping (Node >= 23.6, and the
 * deploy pins nodejs-24), so it imports the injector's .ts directly — single
 * source of truth, no duplicated SEO data.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// Single source of truth — reused from the api-server injector.
import { ROUTE_SEO, rewriteHtml } from "../../api-server/src/seo-meta-injector.ts";

const here = dirname(fileURLToPath(import.meta.url));
const distDir = resolve(here, "..", "dist", "public");
const baseIndexPath = join(distDir, "index.html");

let baseHtml: string;
try {
  baseHtml = readFileSync(baseIndexPath, "utf-8");
} catch {
  console.error(`[prerender-seo] FATAL: ${baseIndexPath} not found — did 'vite build' run first?`);
  process.exit(1);
}

const routes = Object.keys(ROUTE_SEO).filter((r) => r !== "/");
let written = 0;
const failures: string[] = [];

for (const route of routes) {
  try {
    const html = rewriteHtml(baseHtml, ROUTE_SEO[route], route);
    // Sanity: the rewrite must have actually changed the title, else the
    // homepage-default regexes didn't match and the page would ship generic SEO.
    if (html === baseHtml || !html.includes(`<title>`)) {
      failures.push(`${route} (no rewrite applied)`);
      continue;
    }
    const outPath = join(distDir, route.replace(/^\//, ""), "index.html");
    mkdirSync(dirname(outPath), { recursive: true });
    writeFileSync(outPath, html, "utf-8");
    written++;
  } catch (err) {
    failures.push(`${route} (${(err as Error).message})`);
  }
}

console.log(`[prerender-seo] wrote ${written}/${routes.length} per-route SEO files into ${distDir}`);
if (failures.length) {
  console.error(`[prerender-seo] FAILED for ${failures.length} route(s):\n  - ${failures.join("\n  - ")}`);
  // Fail the build loudly — silent SEO loss is exactly the bug this fixes.
  process.exit(1);
}
