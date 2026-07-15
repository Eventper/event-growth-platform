#!/usr/bin/env node
/* Fetch analytics endpoints and save JSON report for the last 30 days.
   Usage: node scripts/analytics/fetch-and-save.mjs [BASE_URL]
*/
import fs from 'fs';
import path from 'path';
const base = process.argv[2] || process.env.BASE_URL || 'https://eventperfekt.net';
const outDir = path.resolve(process.cwd(), 'reports');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

async function fetchJson(url) {
  const r = await fetch(url, { headers: { 'Accept': 'application/json' } });
  const txt = await r.text();
  try { return JSON.parse(txt); } catch (e) { return { raw: txt }; }
}

(async function main(){
  const now = new Date().toISOString().slice(0,19).replace(/:/g,'-');
  const report = { meta: { base, generatedAt: new Date().toISOString() }, data: {} };
  const endpoints = [
    '/api/analytics/funnel',
    '/api/analytics/contact-routing',
    '/api/analytics/top-pages',
    '/api/analytics/realtime',
  ];

  for (const ep of endpoints) {
    try {
      report.data[ep] = await fetchJson(base + ep);
    } catch (e) {
      report.data[ep] = { error: String(e) };
    }
  }

  const outPath = path.join(outDir, `analytics-report-${now}.json`);
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2), 'utf8');
  console.log('Wrote', outPath);
})();
