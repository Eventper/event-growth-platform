# Outstanding Work

_Last updated: 2026-06-30. Branch: `fix/contrast-no-gray-bold-headings`._

Consolidated from the four most recent change requests in `attached_assets/`. None of
these are committed yet — they are copy/positioning tightening plus one outreach-email
compliance fix.

---

## Status update — 2026-07-01

Most of this has since been applied on the codebase; remaining items are subjective
copy rewrites that want a visual check.

- **#1 Outreach opt-out — done, with a deliberate deviation.** No marketing-style
  unsubscribe footer exists anywhere. Per a later instruction, the soft opt-out line
  was removed from partner/sponsor/media entirely and kept **only on guest** (baked
  into the guest master template). Backend suppression / Do-Not-Contact / stop-on-reply
  remain intact. If you want the soft opt-out back on partner/sponsor/media, say so.
- **#3 Home page — done.** "Not a coaching room." present; the wellbeing session reads
  as a "grounded conversation" (Dr Sarah + Esther); no "Live music" / "special discounts".
- **#4 Stay & Explore — done.** No "special discounts" / "close to the venue" wording remains.
- **#2 About (The Human Behind The Title) — mostly done.** "senior professionals" in use;
  "personal development" and "community opportunities" removed; corporate section banner
  softened to "Corporate Conversations & Leadership Wellbeing". Still open: the full hero
  rewrite and per-section verbatim tightening from the source file.

Also shipped 2026-07-01 (not in the original list): I Am Her site performance —
WebP images, removed a dead 54MB hero video, lazy media (deploy 217MB → 156MB).

---

## 1. Outreach emails — remove marketing-style unsubscribe footer
_Source: `Pasted-You-re-right-For-this-kind-of-outreach-a-visible-unsubs_1782827858224.txt`_

Emails should read as direct one-to-one outreach from Lynda's desk, not a campaign blast.

- [ ] Remove any visible marketing-style unsubscribe footer from guest, partner, sponsor,
      media and civic outreach emails.
- [ ] Remove language like "unsubscribe here", "manage preferences", "marketing emails",
      "campaign subscription".
- [ ] Add a soft opt-out line only where needed:
  - Partner / sponsor / media: _"If this is not relevant, just reply 'not relevant' and I won't follow up."_
  - Guest invitations: _"If this is not relevant for you, no problem — just let me know and I won't follow up."_
- [ ] Keep backend compliance intact: suppression / Do Not Contact, stop on reply, stop on
      bounce, stop on opt-out, keep suppression list active.
- [ ] Negative reply or opt-out request → mark **Do Not Contact** and stop all follow-ups.
- [ ] Sender/signature: Lynda Johnson <lyndajohnson@eventperfekt.com>, Founder, Event Perfekt
      Global / The Woman Who Leads The Room / www.eventperfekt.net/iamher / 07984 331 651.

## 2. "About The Platform" page — tighten (too broad)
_Source: `Pasted-This-page-is-strategically-useful-but-it-is-currently-t_1782815454996.txt`_

Position **The Human Behind The Title** as the platform behind The Woman Who Leads The Room.
Don't sell everything at once.

- [ ] Rewrite hero → "The Platform Behind The Woman Who Leads The Room" + new body copy.
- [ ] Use "leadership wellbeing platform" once only; then speak plainly.
- [ ] Replace "community opportunities" → "future experiences, partnerships and speaker opportunities".
- [ ] Replace "professionals" → "senior professionals" (or the fuller founder/exec/director list).
- [ ] Remove "personal development" from the brand-partner section.
- [ ] Soften corporate section → "Corporate Conversations & Leadership Wellbeing" (not "Leadership Development" yet).
- [ ] Apply the per-section rewrites in the source file (hero, flagship experience, six pillars,
      For Organisations, For Brand Partners, Vision, waiting list, final CTA "Build With The Platform").

## 3. Home page — lead as a leadership dinner, not a wellbeing evening
_Source: `Pasted-Yes-the-home-page-is-nearly-fine-but-not-ready-yet-It-h_1782815157791.txt`_

Category fix, not a redesign. ~80% there.

- [ ] New hero: "A private leadership dinner for 100 accomplished women across the UK —
      founders, directors, executives, business owners and senior decision-makers." + subline
      (Milton Keynes, Fri 30 October 2026).
- [ ] Rename programme "Wellbeing Session" → "Leadership, Health & Confidence Conversation"
      (Dr Sarah Jenkins & Esther Emenike-Okorie).
- [ ] Add "Not a coaching room." to the not-this section.
- [ ] Remove "Live music" unless confirmed → "Music. Soft light. The right mood."
- [ ] Remove "special discounts" unless confirmed → "Guest stay options and local
      recommendations will be shared with confirmed guests."
- [ ] Compress the partner section to a single "Partnership Opportunities" block (don't turn
      the guest page into a sponsorship deck).

## 4. "Stay & Explore" page — shorten (too long)
_Source: `Pasted-This-page-is-too-long-Not-bad-Just-too-much-For-the-Sta_1782814820316.txt`_

Keep the structure; cut the padding. Job: make travelling to Milton Keynes feel easy and worth staying for.

- [ ] Tighten hero → "Turn the evening into a weekend." + "bring someone with you" (not "family" in hero).
- [ ] Add civic/visitor-economy line directly below hero (brings women from across the UK into MK,
      supports hotels/restaurants/retail/attractions).
- [ ] "Premium hotels close to the venue" → "...close to central Milton Keynes" (venue not public).
- [ ] Remove unconfirmed "special discounts" → confirmed-guest wording.
- [ ] EP Concierge heading → "Need help planning the weekend?" with less promise, more control.
- [ ] Apply per-section rewrites (Why stay, Where to stay, local business, visitor economy).

---

### Notes
- Items 2–4 are all "tighten/reposition existing pages" — no new features.
- Item 1 has a backend dimension (suppression logic must stay) plus a frontend copy change.
- Full verbatim copy blocks for each rewrite live in the linked source files under `attached_assets/`.
