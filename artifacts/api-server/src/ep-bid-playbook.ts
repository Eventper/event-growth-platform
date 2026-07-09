// EventPerfekt — Bid Playbook (the "tender brain").
//
// Single source of truth the bid-writer (EP Agent) draws from and CITES. It never
// invents a client, number, or credential. Two exports:
//   • EP_PLAYBOOK_CORE — condensed, authoritative facts + guardrails. Embedded in
//     EP_AGENT_SYSTEM_PROMPT so EVERY generation carries the verified facts and rules
//     (kept tight to control per-call token cost).
//   • EP_BID_PLAYBOOK — the full v2.0 playbook, the canonical doc for the bid vault /
//     citation / retrieval (not sent on every call).
//
// Facts here are VERIFIED and override any older hardcoded values. Provenance: user-
// supplied Bid Playbook v2.0 (2026-06-27), built from EventPerfekt's CEFAS contract and
// winning bid. Two fragments in the source paste were corrupted in transit and have
// been repaired conservatively (a loss-table row label, and the closing sentence).

export const EP_PLAYBOOK_CORE = `
═══ EP BID PLAYBOOK — CORE (authoritative; cite, never invent) ═══

GUARDRAILS (apply to every bid):
- Draw ONLY on this playbook, the bid vault, the learning vault, and the tender pack. CITE every factual claim ([Doc]/[Vault]/[Win]/[Loss]). If a fact is missing, FLAG the gap — never invent a client, number, capability, certification, or track record.
- State certifications EXACTLY as recorded — held vs in-progress. "Aligned with ISO 9001" ✓; "ISO 9001 certified" ✗.
- ISO 9001 / 14001 / 20121 = ALIGNED, NOT certified. Cyber Essentials = IN PROGRESS. Castor Vali (assurance partner) holds ISO 9001/14001/45001 + Cyber Essentials — cite only as the partner's, never EP's own.
- Insurance HELD (Markel, policy CD63843): Professional Indemnity, Public/Products Liability, Employers' Liability. NOT held: Cyber & Data Risks (note honestly if a bid weights cyber insurance), D&O, Property Damage, Business Interruption. Exact limits: confirm from the policy schedule.
- NEVER include the company's bank details anywhere.

VERIFIED COMPANY FACTS (these override anything conflicting):
- UK entity (UK bids): Event Perfekt Global Ltd — Company No. 15875326 — 20 Wenlock Road, London, N1 7GU. Incorporated 6 August 2024. VAT 497657910. First-year turnover £14,822 (to 31 Aug 2025). 5 FTE. SIC 82300.
- Experience: cite "~20 years through our parent company, Event Perfekt Ltd (Co. No. 05332996, est. 2005)" — Global Ltd itself is ~1 year old. Do NOT say "25-year legacy".
- Nigeria entity (Nigeria bids only): Event Perfekt Management Services.
- Director / signatory: Lynda Tolulope (Tolu) Kumolu-Johnson.
- Director's Cabinet Office PM role (~2007–2010) and AJ Adesanya's HMRC experience = INDIVIDUAL CVs only, never company activations (company incorporated 2024).

FLAGSHIP CREDENTIAL — lead every bid with this:
- CEFAS25-35 Africa Regional Support (Cefas, a Defra executive agency). Won via competitive tender under the Procurement Act 2023. Term 9 Jun 2025 – 9 Jun 2027. 10% commission; call-off up to £130,000 inc VAT. Real in-country delivery: Nigeria, Ghana, Uganda, Senegal, Zambia, South Africa, Sierra Leone, Mozambique, Kenya.

SECTOR CAPABILITY — EDUCATION / UNIVERSITIES (present as CAPABILITY, not completed track record): EP supports universities on international student recruitment, market engagement & lead generation, enquiry-to-enrolment conversion, admissions & compliance coordination, and event delivery/stakeholder engagement — full-funnel from first contact to enrolment, to institutional targets, brand and quality standards. Strongest on AFRICA-FACING recruitment, tied to EP's real in-country network (§3 footprint). See §2A. University client references + the Oxford University contract are ⟨confirm⟩ until uploaded — until then do NOT assert a completed university engagement.

KEY PEOPLE: DPO / GDPR lead = Olaolu Eliase (use whenever a bid asks for the DPO). Data assurance & cybersecurity lead = AJ Adesanya. Regional Data & Privacy Officer = Grace Nwokoye. Group Risk Consultant = Lara Shomuyiwa. Africa Regional Delivery Lead = Fayeraome Ransome Otaji.

WIN THEMES (thread through every bid):
1) Genuine in-country African delivery network (real teams, not subcontracted-on-paper).
2) UK PMO governance + regional agility (central control, 24–72h mobilisation).
3) Lived, measurable social value (youth, women-led enterprise, disability inclusion — quantified and local).
4) Current central-government track record (CEFAS / Defra).

SOCIAL VALUE: write only quantified, local, measured commitments from the SV bank (e.g. 70% women-owned catering suppliers across Zambia/Uganda/Nigeria; Ghana youth illustrator mentored into a permanent role). Always tie social value to the SPECIFIC host city/region.

LOCALITY RULE (biggest loss lesson): EP wins where it has real ties (London + Africa/diaspora). For place-based bids elsewhere, name credible local partners/contractors based in that city — or no-bid. Generic/national social value scores poorly on place-based bids.

BID / NO-BID: confirm you understand the evaluation criteria and weighting; check for a minimum-turnover / financial-standing threshold (commonly ~2× contract value). Given the modest first-year turnover, for larger contracts lean on the parent company, offer a parent-company guarantee, or bid in a consortium; keep contract size proportionate to financial standing.

RECURRING WEAKNESSES TO FIX IN EVERY BID: strategic framing (architect of strategy, not just delivery); clear methodology flow (Theory of Change / MSP / hybrid); specific legislative insight; named creatives with bios + visuals; VFM with tiered options + ROI (never a bare price); localised case studies; authored engagement/MEL design.
`;

export const EP_BID_PLAYBOOK = `# EventPerfekt — Bid Playbook
*The single source of truth the bid-writer draws from. Built from EventPerfekt's verified CEFAS contract and winning bid, plus a best-practice response framework. Version 2.0.*

## How to use this & the two tags
The bid-writer assembles bids from what's recorded here and cites it — it never invents a client, number, or credential. Flow: Playbook → Bid Vault → AI writer cites it → evaluator sees specifics, not adjectives.
- ⟨confirm⟩ — a fact not yet in any document shared (e.g. insurance limits, references). The user supplies it.
Golden rule: never state a credential as held when it is in progress. "Aligned with ISO 9001" is true; "ISO 9001 certified" is not.

## 1. Company facts (verified)
UK entity (UK bids): Event Perfekt Global Ltd — Company No. 15875326 — Registered address 20 Wenlock Road, London, N1 7GU — Incorporated 6 August 2024 (company ~1 year old; lean on the ~20-year parent heritage and the director's track record for depth; the CEFAS bid's "2023" was an error) — VAT 497657910 — Annual turnover £14,822 (first period to 31 Aug 2025) — Employees (FTE) 5.
Parent / heritage: Event Perfekt Ltd, Company No. 05332996, established 2005 (~20 years to 2025). Always phrase as experience through the parent company, never as Global Ltd's own trading history. Use "~20 years through our parent company, est. 2005" (do not say "25-year").
Nigeria entity (Nigeria bids only): Event Perfekt Management Services.
Director / signatory: Lynda Tolulope Kumolu-Johnson.
Never load the company's bank details (the Revolut account/sort code on the CEFAS order form) into the vault or anywhere near the AI writer. Strip it.
Financial standing: first-year turnover is modest (£14,822) — normal for a 2024 company but matters for bidding. Many public tenders set a minimum-turnover / economic-and-financial-standing threshold (often ~2× annual contract value) and assess accounts. For larger contracts, lean on the parent (est. 2005), offer a parent-company guarantee, or bid in a consortium; keep contract size proportionate (see §11A).

Capabilities matrix: Government contracts → CEFAS-001 (§3); International events → WIN-002 (§3); Community engagement → WIN-003 (§3); PMO governance → Methodology (§4), team PRINCE2-qualified; Social value → SV-001..SV-003 (§5); Data protection → Compliance (§6), named DPO Olaolu Eliase; Risk management → Methodology (§4), Group Risk Consultant Lara Shomuyiwa.

## 2. Capability statement
Event Perfekt delivers strategic, end-to-end event solutions for government, donor and corporate clients, blending UK PMO governance with embedded in-country regional teams. Principal activities: Events & Experiential (physical/hybrid/digital — policy summits, conferences, community outreach, leadership/training, stakeholder programmes); Creative & Design (branding, signage, delegate materials, 3D venue layouts); Merchandise & Gifting (delivered on the NNPC programme); Project / PMO Management (central PMO control, governance, risk, delivery assurance across countries); Stakeholder & delegate coordination (registration, CRM tracking, multilingual access, subsistence disbursement via mobile money / online banking / controlled cash); Logistics & delivery support (visa facilitation, transport, accommodation, AV/staging, catering, in-country procurement).
Differentiators (evidenced): genuine in-country African delivery network; current central-government science-agency contract (CEFAS); lived, measurable social value; procurement governance via a documented three-quote process.

## 2A. Education & international student recruitment (sector capability — universities)
Present this as CAPABILITY (what EP can deliver), not as a completed university track record, until the Oxford University contract and named references are uploaded (⟨confirm⟩). Tie any "experience" claim to EP's VERIFIED Africa footprint (§3), never to unevidenced university wins.
EP is an education- and delivery-focused organisation with practical capability across international student recruitment, cross-border engagement, and remote operational coordination. Work spans education consultancy, student pathway support, in-market and virtual outreach, and structured support for enquiry handling, conversion and follow-up.
Particular relevance to Africa-facing recruitment and international delivery: EP works across different markets, time zones and stakeholder groups — combining market-facing engagement with reliable back-office execution — drawing on the same real in-country African network used on CEFAS (Nigeria, Ghana, Uganda, Senegal, Zambia, South Africa, Sierra Leone, Mozambique, Kenya). This lets EP support universities needing both market-facing engagement and dependable back-office execution.
Approach: responsiveness, compliance, and measurable outcomes — managing the full recruitment funnel, supporting students from first contact through to enrolment, in line with institutional targets, brand requirements and quality standards.
University support offer:
- In-country and remote student recruitment support
- Market engagement and lead generation
- Enquiry handling and conversion activity
- Admissions and compliance coordination
- Event delivery, stakeholder engagement and partner collaboration
- Reporting, tracking and continuous improvement
Positioning for target markets (e.g. Africa): combine education-sector knowledge with operational discipline to increase applications, improve conversion, and support sustainable enrolment growth.
Evidence to add (⟨confirm⟩): Oxford University contract (to be uploaded → promote to a §3 proof point once signed/held); named university references with permission; any recruitment/conversion numbers (applications, conversion %, enrolments) — quantify only from real records, never invent.

## 3. Proof points — track record
- CEFAS-001 — Cefas (Defra executive agency), contract CEFAS25-35 — Africa Regional Support: event logistics, subsistence disbursement, venue/accommodation/AV/catering procurement, visa support across African nations — call-off up to £130,000 inc VAT (commission), 10% management rate — Won via competitive tender under the Procurement Act 2023; term 9 Jun 2025 – 9 Jun 2027 — Lane: Events/Development — Evidence: signed contract (held). FLAGSHIP — lead bids with it.
- WIN-002 — 3Consulting (West Africa) — cross-border GDPR/data-protection workshop series (venue, catering, AV, interpretation, delegate registration, mobile-money disbursement, ministerial alignment) — 650+ participants, 4 countries, 12 facilitators — ongoing — Evidence: CEFAS bid Annex 4.
- WIN-003 — Nigerian National Petroleum Company (NNPC) — annual CSR community engagement (venue, catering, transport, branding, merchandise, entertainment, on-site risk management) — 1,000+ beneficiaries, 20+ in-country staff, renewed on outcomes — Evidence: CEFAS bid Annex 4.
Regional delivery footprint: Nigeria, Ghana, Uganda, Senegal, Zambia, South Africa, Sierra Leone, Mozambique, Kenya.
References (named contact + permission confirmed): ⟨confirm⟩
Director's public-sector experience: EP's director, Lynda (Tolu) Kumolu-Johnson, worked as a project manager at the Cabinet Office (~2007–2010). Present as the director's individual track record / CV, never as an EP company activation.
HMRC — part of AJ Adesanya's collective professional experience. Use as AJ's individual credential / CV, never as an EP company activation.

## 4. Reusable methodology answers
- Delivery methodology: apply the method best fitted to each programme — PRINCE2 and MSP for governance/gateway control, Agile for adaptive planning, Waterfall for documentation-led delivery, Lean for resource efficiency, Theory of Change for outcome/impact framing. Central PMO + embedded regional teams. The team holds PRINCE2 qualifications — "PRINCE2-governed delivery" is a stateable credential; name the certified individuals and keep certificates in the toolkit.
- Mobilisation/transition: request-to-mobilisation 24–72 hours; secure PMO portal; Regional Delivery Manager assigned; spec/budget confirmed with client before supplier engagement.
- Governance: formal RACI; RAID logs; shared delivery dashboards; gateway reviews and milestone sign-offs.
- Procurement governance: documented three-quote process; vendor vetting (safeguarding, H&S, public-sector standards); VFM logs; substitution/contingency protocols; SLAs.
- Risk management: country-specific risk registers across five domains (political, infrastructure, public safety, logistics, compliance); pre-approved contingency plans; quarterly mitigation review. Real examples: Ghana power cuts → standby generators; Nigeria protests → secure rerouting + police liaison; Zambia floods → pre-approved alternative venue within 24h; Kenya cash controls → shift to mobile payments; Uganda dialect shift → multilingual staff + interpretation.
- Quality management: SOPs, checklists, delivery trackers reviewed quarterly; live Lessons Learned register; CAPA register. Aligned with ISO 9001:2015 — not yet certified.
- Stakeholder management: Programme Director/Manager as client lead; weekly briefings; live client access to delivery logs, RAID reports and spend tracking.

## 5. Social value bank (real, quantified, local)
- SV-001 — Youth skills/employment for those facing barriers — Ghana (2023): young illustrator identified at an event, paid for live artwork, mentored into a permanent creative role; Senegal: student delegates hired into paid coordination roles, two now junior associates — Mechanism: paid roles + mentoring — Measurement: number onboarded/progressed.
- SV-002 — Local economic empowerment / women-led enterprise — 70% of catering providers across Zambia/Uganda/Nigeria are women-owned rural enterprises; Lagos female-led kitchen cooperative given safety + allergen training, went on to win further contracts — Measurement: % spend with MSMEs.
- SV-003 — Disability inclusion & accessibility — Zambia (2022): autistic local artist engaged for delegate sketches in a therapeutic breakout; founder has lived experience raising a child with autism, shaping inclusive planning.
Supplier mentoring/legacy: micro-enterprises briefed on safeguarding, financial records and safety documentation to help them formalise and become eligible for future public contracts.
Standing measurement commitments: % spend with MSMEs; number of trainees/local hires onboarded; reported post-delivery.

## 6. Compliance & policy facts (held vs in progress)
Held / true now: acts as Data Processor; complies with UK GDPR + DPA 2018 (and Nigeria NDPA where relevant). Named DPO, legal & compliance lead: Olaolu Eliase. AJ Adesanya = data assurance & cybersecurity lead (was the DPO named on the historical CEFAS contract). Regional Data Lead: Grace Nwokoye. Policies maintained/submitted: Data Protection Policy, Information Management Policy, IT Security Policy; DPIAs for new/high-risk processing; ICO-aligned incident response. Secure cloud (encrypted at rest/in transit), role-based access, MFA; no personal data on local devices.
In progress / aligned-but-not-certified (state exactly this way): ISO 9001:2015 — aligned, audit readiness on 2025 roadmap, not certified; ISO 14001 / ISO 20121 — aligning with ISO 20121, not certified; Cyber Essentials — pre-certification phase.
Partner assurance (cite as the partner's, never EP's own): Castor Vali holds ISO 9001/14001/45001 (bid also cites 28001) and Cyber Essentials.
Insurance — held (all with Markel International Insurance Company Limited, policy CD63843): Professional Indemnity (limit ⟨confirm⟩; excludes liability from construction/erection/alteration/repair of buildings, structures, support rigs or scaffold per endorsement D00102, 30 Aug 2025 — relevant only for staging/rigging-heavy work); Public (incl. Products) Liability (limit ⟨confirm⟩; £250 excess on property-damage claims); Employers' Liability (held, legally mandatory; limit ⟨confirm⟩, statutory minimum £5m).
Not currently held: Directors & Officers, Cyber & Data Risks, Property Damage, Business Interruption, Portable Equipment, Occupational Personal Accident, Legal Expenses. Note honestly if a cyber-insurance question is asked.

Vault evidence documents (held in the Bid Vault → "Policies"/"Audited Accounts"; treat as truth, cite by ID):
- POL-001 Customer Complaints Procedure Policy → §11C continuous improvement.
- POL-002 Cyber Certification Status & Mitigation Statement → §6 data security (evidences Cyber Essentials = in progress, with mitigations).
- POL-003 Health and Safety Policy → §6 / §11C health & safety.
- POL-004 ISO 27001 Alignment Policy → §6 information security (aligned, not certified).
- POL-005 Modern Slavery Policy → §6 / §11C (Modern Slavery statement — now SUPPLIED).
- POL-006 Quality Assurance Monitoring Policy → §4 quality management.
- POL-007 Safeguarding Policy → §6 / §11C safeguarding.
- POL-008 Sustainability Policy → §11C sustainability / Net Zero.
- FIN-001 First-Year Accounts / Turnover → §1 financial standing & §11A financial-standing check.
Still to supply: EDI (equality & diversity) policy ⟨confirm⟩.

## 7. Win themes
1) Genuine in-country African delivery network (real teams). 2) UK PMO governance + regional agility (24–72h mobilisation). 3) Lived, measurable social value (youth, women-led enterprise, disability inclusion). 4) Current central-government track record (CEFAS/Defra).

## 8. Key personnel
Lynda (Tolu) Kumolu-Johnson — Director & Contract Lead. Fayeraome Ransome Otaji — Africa Regional Delivery Lead. Grace Nwokoye — Regional Data & Privacy Officer. AJ Adesanya — Data Assurance & Cybersecurity Lead. Olaolu Eliase — Legal, Compliance & GDPR Lead (named DPO). Lara Shomuyiwa — Group Risk Consultant.

## 9. Pricing approach
Transparent percentage-commission model (10% on CEFAS) on third-party services arranged — flexible across event sizes; covers coordination, governance, reconciliation and reporting. Always: clear structure aligned to the buyer's stated budget; assumptions and exclusions stated; costs broken down against fair market value; confirm pricing weighting per ITT. Sefton lesson: price judged high vs perceived value — always pair the number with an ROI / value justification and tiered options where allowed, never a bare price. GM BGH pricing lesson ⟨confirm⟩.

## 10. Lessons learned
- GM BGH — Loss — social value needs quantitative data + local relevance; pricing ⟨confirm⟩.
- Swansea Events Strategy (Swansea Council) — Loss 61.8% — weak strategy evidence (3/5), unclear vision, weak legislative insight (2/5). Fix: position as author of the events strategy; cite Welsh Govt strategy (National Events Strategy for Wales, Well-being of Future Generations Act); one cohesive methodology.
- Didcot (creative commission) — Loss — creative ownership not demonstrated. Fix: name the creative team; supply moodboards, past commissions and references; own the artistic direction. [source line repaired]
- Sefton Council — Loss — no NW-England case studies; strategy not evidenced; pricing seen as high vs value. Fix: localised case studies + named regional partners; ROI narrative.
- CEFAS25-35 — Win — flagship credential, real in-country evidence, quantified social value. Replicate this structure.
Biggest pattern — locality: the council losses were place-based bids where EP had no local footprint; CEFAS won by playing to EP's real footprint (London + Africa/diaspora). Rule: bid where you have relevance; tie social value to the specific city/region; if no local presence, bring in city-based contractors/partners.
Recurring weaknesses to fix: strategic framing (architect, not just delivery); methodology with a visual flow; specific legislative insight; named creatives + visuals; VFM with tiered options + ROI; localised case studies; authored engagement/MEL design.
Pipeline/next actions: monitor Contracts Finder for PMO/governance opportunities; track DEFRA and JNCC; quantify every social-value section; line up Greater Manchester + regional partners; build ROI-backed tiered pricing; assemble a tender toolkit folder (CVs by bid grade, legislation quick-reference, pre-approved case-study library, pricing-justification templates, accreditation/insurance docs).

## 11. Best-Practice Bid Response Framework
A) Qualify first (bid/no-bid): understand the evaluation criteria and weighting; is the value proposition a realistic win; map all key timings. Local-presence check: does the tender require/weight local presence? EP is strongest in London + Africa/diaspora; for place-based contracts elsewhere line up a credible local partner or no-bid; tie social value to that city. Financial-standing check: minimum turnover (~2× contract value) or 2–3 years of accounts — screen early; bid via parent/consortium with a guarantee if needed.
B) Know the buyer: strategic objectives and priorities; org structure and decision-makers; budget/funding; political/economic context.
C) Answer the recurring question themes with EP evidence (lead with evidence, not adjectives): Value for money (10% commission, three-quote VFM logs); Social value (§5 SV bank); Sustainability (local sourcing, reusable materials, DEFRA Greening alignment, ISO 20121 alignment — not certified); Risk management (RAID, country risk registers, real mitigation table §4); Health & safety (⟨confirm policy⟩); Data security (Processor role, UK GDPR/DPA 2018, encrypted platforms, DPIAs; Cyber Essentials in progress); Accessibility & inclusion (multilingual staff, local content, disability examples §5); Implementation/transition (PMO portal, 24–72h mobilisation); TUPE (flag and address whenever relevant); Continuous improvement (Lessons Learned, CAPA); KPIs/SLA (dashboards, RACI, weekly reporting); Supply chain (three-quote vetting, SLAs, substitution); People/team (§8 + CVs); Insurance (⟨confirm levels⟩); Digital capabilities (secure platforms, registration/CRM, hybrid delivery); Pricing (§9); USP/value proposition (§7 win themes); Case studies (§3); Exit strategy; Strategic alignment; Evaluation & MEL (pre/post surveys, behavioural indicators, feedback loops, dashboards); Inclusive & immersive design; Full-lifecycle delivery (site visits, registration, AV, rehearsals, creative concepting, set design, show-calling, risk/compliance assurance).
C2) Standard components per bid: Vision → Discovery → Engagement → Design → Delivery → Evaluation; strategic case studies (§3); creative asset pack (moodboards, named creatives + bios, past commissions); pricing & ROI toolkit (§9); tender toolkit folder (CVs, accreditations, insurance §6, risk maps, policy refs); evaluation frameworks (MEL templates, survey tools, dashboards).
D) Final check before submission: every mandatory question answered and evidenced; plain English; realistic deliverables; all dimensions covered (technical, commercial, environmental, legal, social value, governance); strategic alignment shown; named creative team with bios/visuals; local relevance and community uplift; ROI/VFM narrative; MEL tools included; sustainability/Net Zero alignment; accessible/inclusive design; full-lifecycle capability; every factual claim cited; nothing generic; no credential stated as held when in progress; and no figure or client that conflicts with the verified facts. [closing line repaired]
`;
