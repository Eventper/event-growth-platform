#!/usr/bin/env node
/**
 * Tender SaaS Health Check — Verify operational readiness
 * Usage: node verify-tender-saas-health.mjs
 */

import { exec } from "child_process";
import { promisify } from "util";

const run = promisify(exec);

const checks = [
  {
    name: "Environment Variables",
    cmd: `echo "
DIGEST_RECIPIENT=${process.env.DIGEST_RECIPIENT || "NOT SET"}
LYNDA_EMAIL=${process.env.LYNDA_EMAIL ? "SET" : "NOT SET"}
LYNDA_EMAIL_PASSWORD=${process.env.LYNDA_EMAIL_PASSWORD ? "SET" : "NOT SET"}
GMAIL_EMAIL=${process.env.GMAIL_EMAIL ? "SET" : "NOT SET"}
GMAIL_PASSWORD=${process.env.GMAIL_PASSWORD ? "SET" : "NOT SET"}
OPS_RECIPIENT=${process.env.OPS_RECIPIENT || process.env.DIGEST_RECIPIENT || "NOT SET"}
TENDER_RELEVANCE_THRESHOLD=${process.env.TENDER_RELEVANCE_THRESHOLD || "30 (default)"}
SME_MAX_CONTRACT_VALUE=${process.env.SME_MAX_CONTRACT_VALUE || "£250,000 (default)"}
"`,
    critical: true,
  },
  {
    name: "Database Connection",
    cmd: `psql -h ${process.env.DB_HOST || "localhost"} -U ${process.env.DB_USER || "postgres"} -d ${process.env.DB_NAME || "tender_db"} -c "SELECT COUNT(*) as tender_count FROM saas_tenders LIMIT 1;" 2>&1`,
    critical: true,
  },
  {
    name: "Tender Count",
    cmd: `psql -h ${process.env.DB_HOST || "localhost"} -U ${process.env.DB_USER || "postgres"} -d ${process.env.DB_NAME || "tender_db"} -c "SELECT COUNT(*) FROM saas_tenders WHERE updated_at >= NOW() - INTERVAL '24 hours';" 2>&1`,
    critical: false,
  },
  {
    name: "Last Sweep Run",
    cmd: `psql -h ${process.env.DB_HOST || "localhost"} -U ${process.env.DB_USER || "postgres"} -d ${process.env.DB_NAME || "tender_db"} -c "SELECT action, result, timestamp FROM saas_automation_log WHERE action='sweep' ORDER BY id DESC LIMIT 1;" 2>&1`,
    critical: false,
  },
  {
    name: "Search Config Loaded",
    cmd: `psql -h ${process.env.DB_HOST || "localhost"} -U ${process.env.DB_USER || "postgres"} -d ${process.env.DB_NAME || "tender_db"} -c "SELECT COUNT(*) FROM saas_tender_search_config;" 2>&1`,
    critical: false,
  },
  {
    name: "Email Service (Namecheap SMTP)",
    cmd: `curl -s -m 5 smtp.namecheap.com:587 > /dev/null 2>&1 && echo "✓ SMTP reachable" || echo "✗ SMTP unreachable"`,
    critical: false,
  },
  {
    name: "Email Service (Gmail API)",
    cmd: `curl -s -m 5 https://smtp.gmail.com:587 > /dev/null 2>&1 && echo "✓ Gmail reachable" || echo "✗ Gmail unreachable"`,
    critical: false,
  },
];

console.log("\n╔════════════════════════════════════════════════════════════════╗");
console.log("║        Tender SaaS Operational Health Check                   ║");
console.log("║        Date: " + new Date().toISOString().split("T")[0] + "                                              ║");
console.log("╚════════════════════════════════════════════════════════════════╝\n");

let passed = 0;
let failed = 0;

for (const check of checks) {
  process.stdout.write(`\n[${check.name}]`);
  try {
    const { stdout, stderr } = await run(check.cmd);
    const output = (stdout + stderr).trim();
    if (output.includes("ERROR") || output.includes("error") || output.includes("failed")) {
      console.log(" ✗ FAILED");
      console.log(`  ${output.split("\n")[0]}`);
      if (check.critical) failed++;
      else passed++;
    } else {
      console.log(" ✓ OK");
      console.log(`  ${output.split("\n").slice(0, 2).join("\n  ")}`);
      passed++;
    }
  } catch (err) {
    console.log(" ✗ ERROR");
    console.log(`  ${(err as any).message}`);
    if (check.critical) failed++;
  }
}

console.log("\n╔════════════════════════════════════════════════════════════════╗");
console.log(`║ Result: ${passed} passed, ${failed} critical issues                       ║`);
console.log("║                                                                ║");
if (failed === 0) {
  console.log("║ Status: ✓ READY TO OPERATE                                    ║");
} else if (failed <= 2) {
  console.log("║ Status: ⚠️  PARTIAL (Some manual setup needed)               ║");
} else {
  console.log("║ Status: ✗ NOT READY (Critical issues block operation)       ║");
}
console.log("╚════════════════════════════════════════════════════════════════╝\n");

if (failed > 0) {
  console.log("REQUIRED ACTIONS:");
  console.log("1. Set missing environment variables in .env file");
  console.log("2. Restart API server: systemctl restart event-perfekt-api");
  console.log("3. Run health check again to verify\n");
}

process.exit(failed > 0 ? 1 : 0);
