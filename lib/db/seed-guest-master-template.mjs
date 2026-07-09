import pg from "pg";
const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Approved MASTER guest invitation (the calibre-of-the-room copy). Double-brace
// merge fields are filled from the prospect's LOCKED guest-intelligence fields
// (first_name, company, guest_reason, room_contribution, why_this_room_matters_to_her
// — role_context was removed and is no longer used). The body ends at "Warm regards,"
// — the send pipeline appends the canonical Lynda signature (identical lines).
// House style: no em-dashes; no soft opt-out line; contribution stated as £300 plus VAT.
const NAME = "Guest Invitation — The Woman Who Leads The Room (Master)";
const SUBJECT = "Private invitation to The Woman Who Leads The Room";
const BODY = `Hi {{first_name}},

I'm Lynda Johnson, founder of The Woman Who Leads The Room.

I'm personally hand-picking the first 100 women for this room, and your work at {{company}} stood out because {{guest_reason}}.

The Woman Who Leads The Room is a UK-wide leadership platform, with Milton Keynes hosting the first room on Friday 30 October 2026. It brings together accomplished women who are building, leading and carrying real responsibility.

The most accomplished women rarely get a room of true peers, women from other industries who understand the weight of leadership without needing it explained.

That is why this evening exists.

The mission is to reshape how women are recognised, supported and retained in leadership and business by making visible the realities that affect long-term success: confidence, visibility, women's health, financial health, emotional load, identity, decision-making and responsibility.

Guests will hear from Dr Sarah Jenkins and Esther Emenike-Okorie, with the real value found around the tables, where founders, directors, executives and business owners bring lived experience and commercial insight.

You bring {{room_contribution}}.

This room gives you {{why_this_room_matters_to_her}}.

Each guest is also connected to the I Am Her campaign, an editorial visibility piece spotlighting the woman behind the title and the responsibility she carries.

You are not just attending a dinner. You are part of the founding 100 helping shape a platform built to make organisations listen.

Guest contribution is £300 plus VAT.

You can see the full evening here:
www.eventperfekt.net/iamher

Reply and I'll send the next details.

Warm regards,`;

try {
  // Idempotent upsert by name (no unique constraint exists, so delete-then-insert).
  await pool.query(`DELETE FROM growth_email_templates WHERE name = $1`, [NAME]);
  const r = await pool.query(
    `INSERT INTO growth_email_templates (owner_id, name, category, subject, body, include_phone, sender_id, sequence_step)
     VALUES ('system', $1, 'guest_invite', $2, $3, false, 'lynda', 1)
     RETURNING id`,
    [NAME, SUBJECT, BODY]
  );
  console.log("Master guest template stored. id =", r.rows[0].id);
  console.log("Merge fields used:", [...BODY.matchAll(/\{\{\s*([\w.]+)\s*\}\}/g)].map((m) => m[1]).join(", "));
  // Guard: refuse to regress to a version that carries em-dashes or the opt-out line.
  if (/[—–]/.test(SUBJECT + BODY)) throw new Error("Refusing to seed: em-dash found");
  if (/not relevant for you/i.test(BODY)) throw new Error("Refusing to seed: soft opt-out line found");
  console.log("OK");
} catch (e) {
  console.error("SEED ERROR:", e.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
