#!/usr/bin/env node

/**
 * Growth Platform end-to-end smoke (Discovery -> Screen -> Outreach draft).
 *
 * Required env vars:
 * - GROWTH_SMOKE_BASE_URL (e.g. http://localhost:3000)
 * - GROWTH_SMOKE_TOKEN (JWT for an authenticated Growth user)
 *
 * Optional:
 * - GROWTH_SMOKE_EVENT_NAME (default: Growth Smoke Event)
 */

const BASE_URL = process.env.GROWTH_SMOKE_BASE_URL || "http://localhost:3000";
const TOKEN = process.env.GROWTH_SMOKE_TOKEN;
const EVENT_NAME = process.env.GROWTH_SMOKE_EVENT_NAME || "Growth Smoke Event";

if (!TOKEN) {
  console.error("Missing GROWTH_SMOKE_TOKEN");
  process.exit(1);
}

function authHeaders(extra) {
  return {
    Authorization: `Bearer ${TOKEN}`,
    "Content-Type": "application/json",
    ...(extra || {}),
  };
}

async function request(method, path, body) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: authHeaders(),
    body: body ? JSON.stringify(body) : undefined,
  });

  let data;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (!res.ok) {
    const msg = data?.error || `${method} ${path} failed (${res.status})`;
    throw new Error(msg);
  }

  return data;
}

async function main() {
  console.log("[smoke] Starting Growth E2E smoke flow");

  const eventsResp = await request("GET", "/api/growth/events");
  const events = Array.isArray(eventsResp) ? eventsResp : [];
  let event = events.find((e) => e && e.name === EVENT_NAME);

  if (!event) {
    console.log("[smoke] Creating event");
    event = await request("POST", "/api/growth/events", {
      name: EVENT_NAME,
      type: "general",
      status: "draft",
      location: "Milton Keynes",
      description: "Smoke test event",
    });
  }

  if (!event?.id) {
    throw new Error("Could not resolve event id");
  }

  if (!event.strategyPack) {
    throw new Error("Event has no strategy pack. Run wizard/strategy first, then rerun smoke.");
  }

  console.log("[smoke] Discovery search (audience)");
  const search = await request("POST", `/api/growth/events/${event.id}/prospects/search`, {
    prospectType: "audience",
  });
  console.log(`[smoke] Search result: found=${search.found || 0}, stored=${search.stored || 0}`);

  console.log("[smoke] Fetch prospects");
  const prospectsResp = await request("GET", `/api/growth/events/${event.id}/prospects?type=audience`);
  const prospects = Array.isArray(prospectsResp?.prospects) ? prospectsResp.prospects : [];
  if (!prospects.length) {
    throw new Error("No prospects available after discovery");
  }

  const prospect = prospects[0];
  console.log(`[smoke] Using prospect: ${prospect.name || prospect.id}`);

  if (!["approved", "approved_for_outreach"].includes(prospect.status || "")) {
    console.log("[smoke] Approving prospect");
    await request("POST", `/api/growth/prospects/${prospect.id}/approve`, {});
  }

  console.log("[smoke] Generate outreach");
  const generated = await request("POST", "/api/growth/outreach/generate", {
    prospectId: prospect.id,
    eventId: event.id,
  });

  const count = generated?.count || 0;
  if (count < 1) {
    throw new Error("Outreach generation returned zero messages");
  }

  console.log(`[smoke] PASS: generated ${count} outreach draft(s); manual approval/send gate still applies.`);
}

main().catch((err) => {
  console.error(`[smoke] FAIL: ${err.message}`);
  process.exit(1);
});
