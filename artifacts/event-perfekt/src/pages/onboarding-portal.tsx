import { useState } from "react";
import PlannerLayout from "@/components/PlannerLayout";
import { useAuth } from "@/lib/auth";
import eventPerfektLogo from "@assets/3d_Logo_1772145137902.jpg";

const B = "#330311";
const MID = "#8B1538";
const GOLD = "#C9A84C";
const LIGHT = "#f8f0f2";

// ─── Shared styles ────────────────────────────────────────────────────────────
const mockScreen = (bg = "#f9fafb"): React.CSSProperties => ({
  background: bg, border: "1px solid #e5e7eb", borderRadius: 10,
  padding: "14px 18px", margin: "14px 0", fontSize: 12, color: "#333",
  boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
});
const mockBar = (bg = B): React.CSSProperties => ({
  background: bg, color: "#fff", borderRadius: "8px 8px 0 0",
  padding: "8px 14px", fontSize: 11, fontWeight: 700, letterSpacing: "0.06em",
  display: "flex", alignItems: "center", gap: 8,
});
const chip = (bg: string, col: string): React.CSSProperties => ({
  background: bg, color: col, fontSize: 10, padding: "2px 8px",
  borderRadius: 12, fontWeight: 700, display: "inline-block",
});

// ─── Walkthrough steps ────────────────────────────────────────────────────────
const WALKTHROUGH = [
  {
    id: "login", emoji: "🔐",
    title: "Step 1 — Logging In",
    content: `
      <p>You will receive a welcome email with a temporary password. Here's how to get started:</p>
      <p style="line-height:2.2;">To get started, go to <strong>eventperfekt.net</strong> and click <strong>Sign In</strong> in the top right corner. Enter your email address and temporary password, then reset your password immediately when prompted. Choose a strong password with at least 8 characters including numbers and symbols. Once set, your session stays active so you will be automatically logged in on your next visit.</p>
      <div style="background:#fff3cd;border-left:4px solid #f59e0b;padding:12px 16px;border-radius:6px;margin-top:14px;">
        <strong>⚠️ Locked out?</strong> Contact <strong>adminuk@eventperfekt.com</strong> — do not share your password with anyone. All actions are tracked in the Audit Trail.
      </div>
    `,
  },
  {
    id: "dashboard", emoji: "🏠",
    title: "Step 2 — Your Dashboard",
    content: `
      <p>After logging in you land on the <strong>Planner Dashboard</strong> — your daily home base. This is the first thing you should check every morning.</p>
      <p style="line-height:2.2;"><strong>Event Kanban Board</strong> — All events grouped by urgency: Urgent (red), Active (amber), Upcoming (green). <strong>Country Filter</strong> — Toggle between All / 🇬🇧 UK / 🇳🇬 Nigeria to view the right events. <strong>Search Bar</strong> — Find any event by name instantly. <strong>Quick Notes</strong> — Paste quick reminders attached to specific events. <strong>Team Chat</strong> — Live internal messaging panel for team coordination. <strong>Notifications</strong> — Reminders, approvals, and alerts appear here.</p>
      <div style="background:#d1fae5;border-left:4px solid #059669;padding:12px 16px;border-radius:6px;margin-top:14px;">
        <strong>Habit:</strong> Open the dashboard first every morning. Check for urgent events (red) and any new notifications.
      </div>
    `,
  },
  {
    id: "sidebar", emoji: "📋",
    title: "Step 3 — The Sidebar (Every Section Explained)",
    content: `
      <p>The sidebar on the left is your main navigation. Every major tool lives here. Here is a complete breakdown:</p>
      <table style="width:100%;border-collapse:collapse;margin-top:12px;font-size:13px;">
        <thead><tr style="background:${B};color:white;"><th style="padding:10px 12px;text-align:left;">Section</th><th style="padding:10px 12px;text-align:left;">What It Does</th><th style="padding:10px 12px;text-align:left;">Who Uses It</th></tr></thead>
        <tbody>
          <tr style="background:${LIGHT};"><td style="padding:9px 12px;border:1px solid #ddd;"><strong>Dashboard</strong></td><td style="padding:9px 12px;border:1px solid #ddd;">Home, assignments, calendar, reminders</td><td style="padding:9px 12px;border:1px solid #ddd;">Everyone</td></tr>
          <tr><td style="padding:9px 12px;border:1px solid #ddd;"><strong>Marketing & Sales</strong></td><td style="padding:9px 12px;border:1px solid #ddd;">Prospect Finder, Lead Pipeline, Booking Enquiries</td><td style="padding:9px 12px;border:1px solid #ddd;">Planners, Admins</td></tr>
          <tr style="background:${LIGHT};"><td style="padding:9px 12px;border:1px solid #ddd;"><strong>Event Intake</strong></td><td style="padding:9px 12px;border:1px solid #ddd;">Create Event wizard, Intake Queue</td><td style="padding:9px 12px;border:1px solid #ddd;">Planners, Managers</td></tr>
          <tr><td style="padding:9px 12px;border:1px solid #ddd;"><strong>Pre-Planning</strong></td><td style="padding:9px 12px;border:1px solid #ddd;">Proposals, contracts, client brief, venue sourcing</td><td style="padding:9px 12px;border:1px solid #ddd;">Planners</td></tr>
          <tr style="background:${LIGHT};"><td style="padding:9px 12px;border:1px solid #ddd;"><strong>Planning</strong></td><td style="padding:9px 12px;border:1px solid #ddd;">Budget, vendors, tasks, guest management, timeline</td><td style="padding:9px 12px;border:1px solid #ddd;">Planners, Staff</td></tr>
          <tr><td style="padding:9px 12px;border:1px solid #ddd;"><strong>Design & Experience</strong></td><td style="padding:9px 12px;border:1px solid #ddd;">Decor studio, 3D designer, floor plans, graphics, souvenirs</td><td style="padding:9px 12px;border:1px solid #ddd;">Planners, Design Staff</td></tr>
          <tr style="background:${LIGHT};"><td style="padding:9px 12px;border:1px solid #ddd;"><strong>Decor & Warehouse</strong></td><td style="padding:9px 12px;border:1px solid #ddd;">Inventory management for decor items and rental orders</td><td style="padding:9px 12px;border:1px solid #ddd;">Decor Lead, Admins</td></tr>
          <tr><td style="padding:9px 12px;border:1px solid #ddd;"><strong>Communication</strong></td><td style="padding:9px 12px;border:1px solid #ddd;">Marketing agent, WhatsApp/SMS, invitations, email campaigns</td><td style="padding:9px 12px;border:1px solid #ddd;">Planners</td></tr>
          <tr style="background:${LIGHT};"><td style="padding:9px 12px;border:1px solid #ddd;"><strong>Event Day</strong></td><td style="padding:9px 12px;border:1px solid #ddd;">Command centre, run sheet, QR check-in, badges, live polling, print materials</td><td style="padding:9px 12px;border:1px solid #ddd;">All Event Staff</td></tr>
          <tr><td style="padding:9px 12px;border:1px solid #ddd;"><strong>Post-Event</strong></td><td style="padding:9px 12px;border:1px solid #ddd;">Analytics, surveys, vendor ratings, photo gallery, closure</td><td style="padding:9px 12px;border:1px solid #ddd;">Planners, Admins</td></tr>
          <tr style="background:${LIGHT};"><td style="padding:9px 12px;border:1px solid #ddd;"><strong>Business & Admin</strong></td><td style="padding:9px 12px;border:1px solid #ddd;">Invoicing, expenses, P&L, employees, audit trail, documents</td><td style="padding:9px 12px;border:1px solid #ddd;">Admins, Planners</td></tr>
        </tbody>
      </table>
    `,
  },
  {
    id: "events", emoji: "🎪",
    title: "Step 4 — Creating & Opening Events",
    content: `
      <p>Every job starts with creating an event. Navigate to <strong>Create Event</strong> in the sidebar and follow the 5-step wizard:</p>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:14px 0;">
        <div style="background:#f0f4ff;border:1px solid #c7d2fe;border-radius:8px;padding:12px;"><strong style="color:#4338ca;">Step 1 — Details</strong><br/><span style="font-size:12px;color:#555;">Event name, category (wedding/corporate/celebration/children's/entertainment), description, dates</span></div>
        <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:12px;"><strong style="color:#166534;">Step 2 — Location</strong><br/><span style="font-size:12px;color:#555;">Country (UK / Nigeria), city, venue name, indoor or outdoor</span></div>
        <div style="background:#fefce8;border:1px solid #fde68a;border-radius:8px;padding:12px;"><strong style="color:#92400e;">Step 3 — Guests & Budget</strong><br/><span style="font-size:12px;color:#555;">Expected guest count, currency (GBP/NGN), budget estimate</span></div>
        <div style="background:#fdf4ff;border:1px solid #e9d5ff;border-radius:8px;padding:12px;"><strong style="color:#6b21a8;">Step 4 — Services & Style</strong><br/><span style="font-size:12px;color:#555;">Select required services, decor style, colour theme</span></div>
      </div>
      <div style="background:${LIGHT};border:1px solid #e5e7eb;border-radius:8px;padding:12px;"><strong style="color:${B};">Step 5 — Review & Create</strong> — Final check, then click Create Event to generate the full Event Dashboard</div>
      <p style="margin-top:14px;">Once created, click any event card on the dashboard to open its <strong>Event Dashboard</strong> — a full workspace with tabs for Tasks, Budget, Vendors, Guests, Services, Decor, Invoicing, and more.</p>
    `,
  },
  {
    id: "documents", emoji: "📄",
    title: "Step 5 — Documents & Contracts",
    content: `
      <p>The <strong>Documents</strong> section is where contracts, proposals, and files are shared with you and clients.</p>
      <p style="line-height:2.2;">Click <strong>View</strong> on any document to open the full-screen viewer, and the system will mark it as <strong>Read</strong> automatically. To <strong>sign</strong> a document, click "Approve and Sign", type your full legal name exactly, then click "Confirm and Sign" — EP is notified instantly. To <strong>request changes</strong>, click "Reject and Request Changes", select a reason, and write a clear explanation of at least 20 characters — your message goes to the EP team and the document chat. Use <strong>💬 Chat</strong> to ask questions about a specific document, and click <strong>Versions</strong> to see the full revision history.</p>
      <div style="background:#d1fae5;border-left:4px solid #059669;padding:12px 16px;border-radius:6px;margin-top:14px;">
        <strong>Auto-filing:</strong> Signed documents are automatically stored in the Document Repository and the EP team gets an email confirmation.
      </div>
    `,
  },
  {
    id: "daily", emoji: "☀️",
    title: "Step 6 — Daily Workflow",
    content: `
      <table style="width:100%;border-collapse:collapse;margin-top:10px;font-size:13px;">
        <tr style="background:${B};color:white;"><th style="padding:10px 12px;text-align:left;">Time</th><th style="padding:10px 12px;text-align:left;">Action</th></tr>
        <tr style="background:${LIGHT};"><td style="padding:9px 12px;border:1px solid #ddd;">Morning</td><td style="padding:9px 12px;border:1px solid #ddd;">Open the Dashboard. Check urgent events (red), notifications, and team messages</td></tr>
        <tr><td style="padding:9px 12px;border:1px solid #ddd;">During the day</td><td style="padding:9px 12px;border:1px solid #ddd;">Work on assigned tasks, update vendor statuses, respond to chat messages</td></tr>
        <tr style="background:${LIGHT};"><td style="padding:9px 12px;border:1px solid #ddd;">Document arrives</td><td style="padding:9px 12px;border:1px solid #ddd;">Open, read, and sign or request changes within 24 hours</td></tr>
        <tr><td style="padding:9px 12px;border:1px solid #ddd;">End of day</td><td style="padding:9px 12px;border:1px solid #ddd;">Mark tasks complete, update task progress, log any expenses</td></tr>
        <tr style="background:${LIGHT};"><td style="padding:9px 12px;border:1px solid #ddd;">End of week</td><td style="padding:9px 12px;border:1px solid #ddd;">Review completed work, file documents, update event statuses</td></tr>
      </table>
      <h4 style="color:${MID};margin-top:20px;">Ground Rules</h4>
      <p style="line-height:2;">Use this platform — not WhatsApp — for all official work communications. Never share client data outside the platform. Raise an Issue Ticket if anything looks wrong — don't ignore it. All actions are permanently recorded in the Audit Trail. Contact <strong>adminuk@eventperfekt.com</strong> for account or access issues.</p>
    `,
  },
];

// ─── Training modules ─────────────────────────────────────────────────────────
const MODULES: Array<{
  id: string; required: boolean; category: string; duration: string;
  title: string; description: string; emoji: string; content: string;
}> = [
  {
    id: "welcome", required: true, category: "Getting Started", duration: "10 min", emoji: "🏢",
    title: "Welcome to Event Perfekt",
    description: "Company overview, mission, values, and the two entities (UK & Nigeria)",
    content: `
      <h2 style="color:${B};border-bottom:2px solid ${MID};padding-bottom:8px;">Welcome to Event Perfekt</h2>
      <p>We are a comprehensive event planning company serving clients across the UK and Africa, specialising in transforming complex events into seamless, intelligent experiences.</p>
      <h3 style="color:${MID};margin-top:20px;">Our Two Companies</h3>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:12px 0;">
        <div style="background:${LIGHT};border:1px solid #ddd;border-radius:8px;padding:14px;">
          <div style="font-weight:800;color:${B};margin-bottom:4px;">🇳🇬 Event Perfekt Management Services Limited</div>
          <div style="font-size:12px;color:#555;">25 Kusenla Street, Lagos, Nigeria<br/>Bank: GTBank · A/C: 0740436407</div>
        </div>
        <div style="background:${LIGHT};border:1px solid #ddd;border-radius:8px;padding:14px;">
          <div style="font-weight:800;color:${B};margin-bottom:4px;">🇬🇧 Event Perfekt Global Ltd</div>
          <div style="font-size:12px;color:#555;">20 Wenlock Road, London N1 7PG<br/>A/C: 78253411 · Sort: 04-29-09</div>
        </div>
      </div>
      <h3 style="color:${MID};margin-top:20px;">Our Values</h3>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:10px 0;">
        ${["Excellence — Perfection in every detail","Integrity — Transparent and honest","Innovation — Technology first","Client-First — Every decision starts with the client","Teamwork — We succeed together","Discretion — Client data is sacred"].map(v=>`<div style="background:${LIGHT};border-radius:8px;padding:10px;font-size:12px;"><strong style="color:${B};">${v.split("—")[0]}</strong><br/>${v.split("—")[1]||""}</div>`).join("")}
      </div>
      <h3 style="color:${MID};margin-top:20px;">The Platform — What It Is</h3>
      <p>This platform is your all-in-one workspace. It replaces spreadsheets, WhatsApp, and email chains for everything event-related — from the first enquiry through to post-event analytics.</p>
    `,
  },
  {
    id: "dashboard", required: true, category: "Getting Started", duration: "15 min", emoji: "📊",
    title: "Dashboard & Navigation",
    description: "How to read the Planner Dashboard, use the kanban board, and navigate the sidebar",
    content: `
      <h2 style="color:${B};border-bottom:2px solid ${MID};padding-bottom:8px;">Dashboard & Navigation</h2>
      <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;margin:14px 0;">
        <div style="background:${B};color:#fff;padding:10px 14px;font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:space-between;">
          <span>📊 PLANNER DASHBOARD — Event Perfekt</span>
          <span style="background:${GOLD};color:#000;padding:2px 10px;border-radius:10px;font-size:10px;">LIVE</span>
        </div>
        <div style="padding:14px;display:grid;grid-template-columns:repeat(3,1fr);gap:8px;">
          <div style="background:#fee2e2;border:1px solid #fca5a5;border-radius:8px;padding:10px;text-align:center;"><div style="font-size:18px;font-weight:800;color:#991b1b;">3</div><div style="font-size:10px;color:#991b1b;font-weight:700;">URGENT (≤4 weeks)</div></div>
          <div style="background:#fef3c7;border:1px solid #fcd34d;border-radius:8px;padding:10px;text-align:center;"><div style="font-size:18px;font-weight:800;color:#92400e;">7</div><div style="font-size:10px;color:#92400e;font-weight:700;">ACTIVE (4–12 weeks)</div></div>
          <div style="background:#d1fae5;border:1px solid #6ee7b7;border-radius:8px;padding:10px;text-align:center;"><div style="font-size:18px;font-weight:800;color:#065f46;">12</div><div style="font-size:10px;color:#065f46;font-weight:700;">UPCOMING (12+ weeks)</div></div>
        </div>
        <div style="padding:0 14px 14px;display:flex;gap:8px;align-items:center;">
          <span style="font-size:11px;font-weight:700;color:#555;">FILTER:</span>
          <span style="background:${GOLD};color:#000;padding:3px 10px;border-radius:12px;font-size:10px;font-weight:700;">All</span>
          <span style="background:#f3f4f6;color:#555;padding:3px 10px;border-radius:12px;font-size:10px;font-weight:700;">🇬🇧 UK</span>
          <span style="background:#f3f4f6;color:#555;padding:3px 10px;border-radius:12px;font-size:10px;font-weight:700;">🇳🇬 Nigeria</span>
          <input style="margin-left:auto;padding:4px 10px;border:1px solid #e5e7eb;border-radius:8px;font-size:11px;width:140px;" placeholder="🔍 Search events..." readonly/>
        </div>
      </div>
      <h3 style="color:${MID};">Reading the Event Cards</h3>
      <p style="line-height:2.2;font-size:13px;"><strong>Event name & date</strong> — Top of each card. <strong>Week badge</strong> — e.g. "5w" = 5 weeks away (red = urgent). <strong>Guest count & currency/budget</strong> — Bottom of card. <strong>Click any card</strong> to open the full Event Dashboard for that event.</p>
      <h3 style="color:${MID};">Sidebar Navigation Tips</h3>
      <p style="line-height:2.2;font-size:13px;">Click any section header to expand its sub-menu. The <strong>collapse arrow</strong> («) collapses the sidebar to icons only — useful on smaller screens. Your role controls what you see — admin sees everything, staff sees their assigned events only.</p>
      <h3 style="color:${MID};margin-top:20px;">New dashboard tools added yesterday</h3>
      <p style="line-height:2.2;font-size:13px;"><strong>Enhanced Planner</strong> — event tasks now generate automatically when an event is created. <strong>Guest Hub</strong> — clearer guest workspace with QR check-in, seating, CSV export, and print tools. <strong>Invitation Send Centre</strong> — send invitations by email, WhatsApp, or both, with live tracking. <strong>Post-Event Hub</strong> — analytics, feedback, and surveys now live in a dedicated post-event workspace. <strong>Client-portal-style dashboards</strong> — richer burgundy hero sections and clearer action buttons.</p>
    `,
  },
  {
    id: "create-event", required: true, category: "Core Skills", duration: "20 min", emoji: "🎪",
    title: "Creating & Managing Events",
    description: "Master the 5-step event creation wizard and understand the Event Dashboard tabs",
    content: `
      <h2 style="color:${B};border-bottom:2px solid ${MID};padding-bottom:8px;">Creating Events — 5-Step Wizard</h2>
      <p>Go to <strong>Create Event</strong> in the sidebar. Complete all 5 steps:</p>
      <div style="display:flex;flex-direction:column;gap:10px;margin:14px 0;">
        ${[
          ["1","Event Details","Name, category (Wedding / Corporate / Celebration / Children's Party / Entertainment), description, start and end date/time","#f0f4ff","#4338ca"],
          ["2","Location & Venue","Country (UK or Nigeria — determines the company entity used in contracts and invoices), city, venue name, indoor/outdoor","#f0fdf4","#166534"],
          ["3","Guests & Budget","Expected guest count, currency (GBP or NGN), total budget estimate","#fefce8","#92400e"],
          ["4","Services & Style","Which EP services are required (tick all that apply), preferred decor style, colour theme","#fdf4ff","#6b21a8"],
          ["5","Review & Create","Final check of all details, then click Create Event","${LIGHT}","${B}"],
        ].map(([n,t,d,bg,col])=>`<div style="background:${bg};border:1px solid #e5e7eb;border-radius:8px;padding:12px;display:flex;gap:12px;align-items:flex-start;"><div style="background:${col};color:#fff;border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:12px;flex-shrink:0;">${n}</div><div><strong style="color:${col};">${t}</strong><br/><span style="font-size:12px;color:#555;">${d}</span></div></div>`).join("")}
      </div>
      <h3 style="color:${MID};margin-top:20px;">The Event Dashboard — All Tabs</h3>
      <p style="font-size:13px;">Once created, click an event card to open its full workspace. The tabs across the top are:</p>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:8px;margin:12px 0;">
        ${[
          ["📊 Overview","Summary KPIs, budget snapshot, recent activity"],
          ["📋 Tasks","Kanban tasks with assignees and deadlines"],
          ["💰 Budget","Estimated vs actual spend by category"],
          ["🤝 Vendors","Suppliers booked for this event"],
          ["👥 Staff","Team assigned to this event"],
          ["📅 Timeline","Gantt/timeline view of the event plan"],
          ["👥 Guests","Guest list, RSVPs, seating, invitations"],
          ["🛎️ Services","EP services with individual pricing"],
          ["🎨 Creative","Decor studio, themes, floor plan"],
          ["💼 Contracts","Auto-generated contracts and signing"],
          ["📄 Invoicing","Invoices for this event"],
          ["💬 Chat","Team chat thread for this event"],
        ].map(([t,d])=>`<div style="background:${LIGHT};border:1px solid #e5e7eb;border-radius:8px;padding:10px;"><div style="font-weight:700;font-size:12px;color:${B};">${t}</div><div style="font-size:11px;color:#777;margin-top:3px;">${d}</div></div>`).join("")}
      </div>
      <h3 style="color:${MID};margin-top:20px;">What’s new in event planning</h3>
      <p style="line-height:2.2;font-size:13px;"><strong>Auto planner generation</strong> — tasks are created automatically when an event is made. <strong>Manual planner trigger</strong> — planners can regenerate the planner from the event planner page. <strong>Post-event entry points</strong> — clear links now go to feedback, analytics, and reports. <strong>No fake demo events</strong> — training now reflects real workflows only.</p>
    `,
  },
  {
    id: "guests", required: true, category: "Core Skills", duration: "20 min", emoji: "👥",
    title: "Guest Management & Invitations",
    description: "Add guests, track RSVPs, send digital invitations, manage seating, and QR check-in",
    content: `
      <h2 style="color:${B};border-bottom:2px solid ${MID};padding-bottom:8px;">Guest Management</h2>
      <p>Open any event → click the <strong>Guests tab</strong>. You can also access the full Guest Hub from the Planning section in the sidebar.</p>

      <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;margin:14px 0;">
        <div style="background:${B};color:#fff;padding:8px 14px;font-size:11px;font-weight:700;">👥 GUEST MANAGEMENT — The Okafor Royal Wedding</div>
        <div style="padding:12px;display:flex;gap:8px;flex-wrap:wrap;">
          <div style="background:#d1fae5;border-radius:20px;padding:4px 12px;font-size:11px;font-weight:700;color:#065f46;">✓ Accepted: 312</div>
          <div style="background:#fef3c7;border-radius:20px;padding:4px 12px;font-size:11px;font-weight:700;color:#92400e;">⏳ Pending: 143</div>
          <div style="background:#fee2e2;border-radius:20px;padding:4px 12px;font-size:11px;font-weight:700;color:#991b1b;">✗ Declined: 45</div>
          <button style="margin-left:auto;background:${B};color:#fff;border:none;border-radius:8px;padding:5px 14px;font-size:11px;font-weight:700;cursor:pointer;">+ Add Guest</button>
        </div>
        <table style="width:100%;border-collapse:collapse;font-size:12px;">
          <tr style="background:#f3f4f6;"><th style="padding:8px 12px;text-align:left;border-bottom:1px solid #e5e7eb;">Name</th><th style="padding:8px 12px;text-align:left;border-bottom:1px solid #e5e7eb;">Email</th><th style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">RSVP</th><th style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">Table</th></tr>
          <tr><td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;">Adaeze Okafor</td><td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;">adaeze@email.com</td><td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;"><span style="background:#d1fae5;color:#065f46;padding:2px 8px;border-radius:10px;font-size:10px;font-weight:700;">Accepted</span></td><td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;">Table 1</td></tr>
          <tr style="background:#fafafa;"><td style="padding:8px 12px;">James Eze</td><td style="padding:8px 12px;">james@email.com</td><td style="padding:8px 12px;"><span style="background:#fef3c7;color:#92400e;padding:2px 8px;border-radius:10px;font-size:10px;font-weight:700;">Pending</span></td><td style="padding:8px 12px;">—</td></tr>
        </table>
      </div>

      <h3 style="color:${MID};">Key Features</h3>
      <p style="line-height:2.2;font-size:13px;"><strong>Add Guest</strong> — Name, email, phone, dietary requirements, meal choice, table assignment. <strong>CSV Import</strong> — Upload a spreadsheet to add hundreds of guests at once. <strong>RSVP Tracking</strong> — Pending / Accepted / Declined / Tentative. <strong>Digital Invitations</strong> — Design premium animated invitations and send by email. <strong>Seating Plan</strong> — Drag guests to table assignments. <strong>Find Your Seat</strong> — Generate a QR poster for the venue entrance — guests scan and see their table. <strong>QR Check-in</strong> — Scan guest QR codes on the day for instant attendance tracking. <strong>Daily Reminders</strong> — Automated email reminders sent to pending guests. <strong>Invitation Send Centre</strong> — choose Email, WhatsApp, or both; pick the guest group; then track opens and responses live. <strong>Live Activity Feed</strong> — see sent, opened, viewed, accepted, and declined updates in real time.</p>
    `,
  },
  {
    id: "invitation-centre", required: true, category: "Core Skills", duration: "15 min", emoji: "✉️",
    title: "Invitation Send Centre",
    description: "Understand exactly what gets sent and how tracking works end to end",
    content: `
      <h2 style="color:${B};border-bottom:2px solid ${MID};padding-bottom:8px;">Invitation Send Centre</h2>
      <p>This page sends branded invitations to the guest group you choose.</p>
      <p style="line-height:2.2;font-size:13px;"><strong>Email only</strong> sends the full invitation email with invite link, RSVP link, and tracking pixel. <strong>WhatsApp only</strong> sends the message to guests with phone numbers. <strong>Email + WhatsApp</strong> sends both channels. <strong>Who to send to</strong> lets you choose new guests, pending RSVPs, or everyone. <strong>Live Activity</strong> shows opens, views, RSVP replies, and failed sends.</p>
      <h3 style="color:${MID};margin-top:18px;">End-to-end flow</h3>
      <p style="line-height:2.2;font-size:13px;">You click Send. The server sends the invitation to the selected guests. Open and viewed events are logged automatically. Guests respond through the RSVP link. The Guest Tracking table updates with their latest status.</p>
    `,
  },
  {
    id: "vendors", required: true, category: "Core Skills", duration: "15 min", emoji: "🤝",
    title: "Vendor Management",
    description: "Add suppliers, track bookings, schedule meetings, approve vendors, and rate performance",
    content: `
      <h2 style="color:${B};border-bottom:2px solid ${MID};padding-bottom:8px;">Vendor Management</h2>
      <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;margin:14px 0;">
        <div style="background:${B};color:#fff;padding:8px 14px;font-size:11px;font-weight:700;">🤝 VENDOR MANAGEMENT</div>
        <div style="padding:12px;display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
          <span style="background:#d1fae5;color:#065f46;padding:3px 10px;border-radius:12px;font-size:10px;font-weight:700;">✓ Booked: 8</span>
          <span style="background:#fef3c7;color:#92400e;padding:3px 10px;border-radius:12px;font-size:10px;font-weight:700;">⏳ Pending: 3</span>
          <button style="margin-left:auto;background:${B};color:#fff;border:none;border-radius:8px;padding:5px 14px;font-size:11px;font-weight:700;cursor:pointer;">+ Add Vendor</button>
        </div>
        <div style="padding:0 12px 12px;display:grid;grid-template-columns:1fr 1fr;gap:8px;">
          ${[["🍽️ Lagos Catering Co.","Catering","Booked","#d1fae5","#065f46"],["🎵 DJ Kingsley","Entertainment","Booked","#d1fae5","#065f46"],["📸 Studio Lens","Photography","Pending","#fef3c7","#92400e"],["🌸 Floral Magic","Florals","Quoted","#f3f4f6","#555"]].map(([n,c,s,bg,col])=>`<div style="background:${bg};border:1px solid #e5e7eb;border-radius:8px;padding:10px;"><div style="font-weight:700;font-size:12px;color:${B};">${n}</div><div style="font-size:10px;color:#777;">${c}</div><span style="background:#fff;color:${col};border:1px solid ${col};padding:1px 8px;border-radius:10px;font-size:9px;font-weight:700;">${s}</span></div>`).join("")}
        </div>
      </div>
      <h3 style="color:${MID};">Step by Step</h3>
      <p style="line-height:2.2;font-size:13px;">Go to <strong>Vendor Management</strong> and click <strong>Add Vendor</strong>. Enter the company name, contact person, phone, email, service category, and price range. Set their status as <strong>Available, Booked, Unavailable, or Pending</strong>. Schedule a meeting via Google Meet, Zoom, Teams, Phone, or In-Person with an automatic calendar link. Attach contracts and notes to each vendor record, then after the event rate them on Quality, Punctuality, Communication, and Value from 1 to 5 stars. High-rated vendors are automatically surfaced in future recommendations.</p>
      <div style="background:#fff3cd;border-left:4px solid #f59e0b;padding:12px 16px;border-radius:6px;margin-top:14px;font-size:13px;">
        <strong>Vendor Directory</strong> — The full directory (accessible to Admins/Managers) maintains a master database of approved suppliers with ratings and contract history across all events.
      </div>
    `,
  },
  {
    id: "services", required: true, category: "Core Skills", duration: "15 min", emoji: "🛎️",
    title: "Event Services Tab",
    description: "Price and manage every EP service per event — Guest Management, Catering, Decor, Entertainment and more",
    content: `
      <h2 style="color:${B};border-bottom:2px solid ${MID};padding-bottom:8px;">Event Services Tab</h2>
      <p>Inside each Event Dashboard, click the <strong>🛎️ Services tab</strong>. This is where you attach and price every EP service being provided for that specific event.</p>

      <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;margin:14px 0;">
        <div style="background:${B};color:#fff;padding:8px 14px;font-size:11px;font-weight:700;display:flex;justify-content:space-between;align-items:center;">
          <span>🛎️ EVENT SERVICES — Johnson Wedding</span>
          <button style="background:${GOLD};color:#000;border:none;border-radius:6px;padding:3px 10px;font-size:10px;font-weight:700;cursor:pointer;">+ Add Service</button>
        </div>
        <div style="padding:12px;display:grid;grid-template-columns:repeat(4,1fr);gap:8px;">
          <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:10px;text-align:center;"><div style="font-size:16px;font-weight:800;color:#065f46;">4</div><div style="font-size:10px;color:#065f46;font-weight:700;">Services Booked</div></div>
          <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:10px;text-align:center;"><div style="font-size:14px;font-weight:800;color:#065f46;">£9,800</div><div style="font-size:10px;color:#065f46;font-weight:700;">Confirmed</div></div>
          <div style="background:#fefce8;border:1px solid #fde68a;border-radius:8px;padding:10px;text-align:center;"><div style="font-size:14px;font-weight:800;color:#92400e;">£2,400</div><div style="font-size:10px;color:#92400e;font-weight:700;">Quoted</div></div>
          <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:10px;text-align:center;"><div style="font-size:14px;font-weight:800;color:#1e40af;">£12,200</div><div style="font-size:10px;color:#1e40af;font-weight:700;">Total Pipeline</div></div>
        </div>
        <div style="padding:0 12px 12px;display:grid;grid-template-columns:1fr 1fr;gap:8px;">
          ${[["👥 Guest Management","Per Head · £15 × 180","Confirmed"],["🎨 Decoration & Styling","Package","Confirmed"],["🍽️ Catering & Food","Per Head · £65 × 180","Confirmed"],["🎤 Entertainment","Flat Fee · £800","Quoted"]].map(([n,p,s])=>`<div style="background:#fff;border:1px solid #e5e7eb;border-radius:8px;padding:10px;"><div style="font-weight:700;font-size:12px;color:${B};">${n}</div><div style="font-size:11px;color:#777;margin:3px 0;">${p}</div><span style="background:${s==="Confirmed"?"#d1fae5":"#fef3c7"};color:${s==="Confirmed"?"#065f46":"#92400e"};padding:1px 8px;border-radius:10px;font-size:9px;font-weight:700;">${s}</span></div>`).join("")}
        </div>
      </div>

      <h3 style="color:${MID};">The Service Catalogue — 18 Services Available</h3>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:6px;margin:10px 0;font-size:11px;">
        ${["👥 Guest Management","🎯 Full Coordination","🌸 Decoration & Styling","🎨 Décor Coordinator","🤵 Ushers","🍽️ Catering","🥂 Drinks Reception","🎤 Entertainment","📸 Photography","🎬 Videography","💐 Florals","💡 Sound & Lighting","🎙️ MC / Host","🛡️ Security","🎂 Cake & Desserts","🚌 Transport","📄 Printing & Stationery","📱 Guest Event App"].map(s=>`<div style="background:${LIGHT};border:1px solid #e5e7eb;border-radius:6px;padding:6px 8px;">${s}</div>`).join("")}
      </div>
      <h3 style="color:${MID};">Pricing Models</h3>
      <p style="line-height:2.2;font-size:13px;"><strong>Per Head</strong> pricing means unit price multiplied by guest count — for example, £65 per person for 180 guests equals £11,700. <strong>Flat Fee</strong> is a single fixed price such as £800 for a DJ. <strong>Package</strong> bundles multiple services together with one total price. <strong>Per Hour</strong> multiplies the hourly rate by the number of hours booked, commonly used for security officers. <strong>Quote Required</strong> is used when the price is not yet confirmed and remains to be advised.</p>
    `,
  },
  {
    id: "invitations", required: true, category: "Core Skills", duration: "20 min", emoji: "✉️",
    title: "Digital Invitations",
    description: "Design premium animated invitations and send them in bulk with delivery tracking",
    content: `
      <h2 style="color:${B};border-bottom:2px solid ${MID};padding-bottom:8px;">Digital Invitations</h2>
      <p>EP's invitation system is Paperless Post-grade. Invitations are animated, beautifully designed, and tracked from delivery to open.</p>

      <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;margin:14px 0;">
        <div style="background:${B};color:#fff;padding:8px 14px;font-size:11px;font-weight:700;">✉️ INVITATION SEND CENTRE</div>
        <div style="padding:14px;display:grid;grid-template-columns:repeat(3,1fr);gap:8px;">
          <div style="text-align:center;background:#eff6ff;border-radius:8px;padding:10px;"><div style="font-size:20px;font-weight:800;color:#1e40af;">312</div><div style="font-size:10px;color:#1e40af;font-weight:700;">SENT</div></div>
          <div style="text-align:center;background:#f0fdf4;border-radius:8px;padding:10px;"><div style="font-size:20px;font-weight:800;color:#065f46;">247</div><div style="font-size:10px;color:#065f46;font-weight:700;">OPENED</div></div>
          <div style="text-align:center;background:#fef3c7;border-radius:8px;padding:10px;"><div style="font-size:20px;font-weight:800;color:#92400e;">65</div><div style="font-size:10px;color:#92400e;font-weight:700;">NOT YET OPENED</div></div>
        </div>
        <div style="padding:0 14px 14px;background:#fff3cd;border-radius:0 0 10px 10px;margin:0 12px 12px;border:1px solid #fde68a;font-size:12px;padding:10px 14px;">
          <strong>Live Activity Feed:</strong> Adaeze Okafor opened her invitation · 2 min ago &nbsp;|&nbsp; James Eze opened · 7 min ago
        </div>
      </div>

      <h3 style="color:${MID};">How to Send Invitations</h3>
      <p style="line-height:2.2;font-size:13px;">Open the Event Dashboard → <strong>Guests tab</strong> → click <strong>Send Invitations</strong>. The system pulls all guests with email addresses automatically. Customise the invitation: event name, date, time, venue, dress code, and RSVP deadline. Choose envelope colour and liner style. Preview the full animated experience before sending. Click <strong>Send All</strong> — invitations go out instantly with tracking pixels. Monitor the <strong>Live Activity Feed</strong> to see who has opened theirs. Automated daily reminders are sent to guests who haven't opened yet.</p>
      <div style="background:#d1fae5;border-left:4px solid #059669;padding:12px 16px;border-radius:6px;margin-top:14px;font-size:13px;">
        <strong>Guest RSVP:</strong> Guests click the RSVP button inside their invitation — their response is recorded automatically in the Guest Management system.
      </div>
    `,
  },
  {
    id: "decor", required: false, category: "Design", duration: "20 min", emoji: "🎨",
    title: "Decor Studio & Design",
    description: "Design event spaces using the Decor Designer, 3D Designer, and Floor Plan Builder",
    content: `
      <h2 style="color:${B};border-bottom:2px solid ${MID};padding-bottom:8px;">Decor Studio</h2>
      <p>The Creative tab inside each Event Dashboard gives you a full design suite. Also accessible from <strong>Design & Experience</strong> in the sidebar.</p>

      <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;margin:14px 0;">
        <div style="background:#6b21a8;color:#fff;padding:8px 14px;font-size:11px;font-weight:700;">🎨 DESIGN STUDIO — Tabs</div>
        <div style="display:flex;gap:0;border-bottom:1px solid #e5e7eb;">
          ${["🎨 Themes & Style","✨ Decor Designer","🏠 3D Designer","📐 Floor Plan","🖼️ Graphics","🎁 Souvenirs"].map((t,i)=>`<div style="padding:8px 12px;font-size:11px;font-weight:700;${i===0?`background:${B};color:#fff;`:"color:#555;background:#f9fafb;"}">${t}</div>`).join("")}
        </div>
        <div style="padding:14px;">
          <div style="background:#fdf4ff;border:1px solid #e9d5ff;border-radius:8px;padding:12px;font-size:12px;">
            <strong style="color:#6b21a8;">Decor Designer</strong><br/>
            <span style="color:#555;">Tell us your theme, colours, and budget — we generate a complete decor brief with moodboard, supplier suggestions, and setup timeline.</span>
            <div style="margin-top:8px;background:#fff;border:1px solid #e9d5ff;border-radius:6px;padding:8px;font-size:11px;color:#777;font-style:italic;">"Create a luxury ivory and gold wedding décor plan for 300 guests at a London hotel ballroom, budget £15,000..."</div>
          </div>
        </div>
      </div>

      <h3 style="color:${MID};">Design Tools Available</h3>
      <p style="line-height:2.2;font-size:13px;"><strong>Themes & Style</strong> — Browse and apply theme templates (Luxury, Garden, Rustic, Modern, etc.). <strong>Decor Designer</strong> — Describe the event and get a complete design brief with layout, colour palette, and supplier checklist. <strong>3D Designer</strong> — Visualise the room in 3D using the Homestyler integration. <strong>Floor Plan Builder</strong> — Drag-and-drop table layout with export to PDF. <strong>Graphics & Branding</strong> — Design event stationery, social graphics, and menus. <strong>Souvenirs & Gifts</strong> — Plan and track souvenirs, favours, and gift bags.</p>

      <h3 style="color:${MID};">Decor Inventory & Warehouse</h3>
      <p style="font-size:13px;">Access <strong>Decor Inventory</strong> in the sidebar to manage the physical inventory of decor items — condition tracking, availability, and order-based rental workflow for each event.</p>
    `,
  },
  {
    id: "eventday", required: true, category: "Event Day", duration: "25 min", emoji: "📅",
    title: "Event Day Tools",
    description: "Run sheet, QR check-in, badge printing, live polling, and the Command Centre",
    content: `
      <h2 style="color:${B};border-bottom:2px solid ${MID};padding-bottom:8px;">Event Day Tools</h2>
      <p>On event day, everything you need is in the <strong>Event Day</strong> section of the sidebar.</p>

      <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;margin:14px 0;">
        <div style="background:#1e3a5f;color:#fff;padding:8px 14px;font-size:11px;font-weight:700;">🎛️ EVENT DAY COMMAND CENTRE — The Okafor Royal Wedding · 19 Jun 2026</div>
        <div style="padding:12px;display:grid;grid-template-columns:repeat(4,1fr);gap:8px;">
          <div style="background:#1e3a5f;color:#fff;border-radius:8px;padding:10px;text-align:center;"><div style="font-size:18px;font-weight:800;">247</div><div style="font-size:10px;opacity:0.7;">Checked In</div></div>
          <div style="background:#0f4c35;color:#fff;border-radius:8px;padding:10px;text-align:center;"><div style="font-size:18px;font-weight:800;">18</div><div style="font-size:10px;opacity:0.7;">Tasks Done</div></div>
          <div style="background:#78350f;color:#fff;border-radius:8px;padding:10px;text-align:center;"><div style="font-size:18px;font-weight:800;">3</div><div style="font-size:10px;opacity:0.7;">Pending</div></div>
          <div style="background:#3b0764;color:#fff;border-radius:8px;padding:10px;text-align:center;"><div style="font-size:18px;font-weight:800;">2</div><div style="font-size:10px;opacity:0.7;">Live Polls</div></div>
        </div>
      </div>

      <h3 style="color:${MID};">Tool by Tool</h3>
      <div style="display:flex;flex-direction:column;gap:10px;margin:10px 0;">
        ${[
          ["🎛️ Command Centre","/event-day-command","One-screen live view of check-ins, tasks, run sheet, and polls. Your war room on event day."],
          ["📋 Run Sheet","/run-sheet","Live timeline of every scheduled moment — ceremony, speeches, dinner service, entertainment. Staff see their cues in real time."],
          ["📲 QR Check-In","/event-day-command","Scan the QR code on each guest's invitation with any phone or tablet. Guest is marked as arrived instantly."],
          ["🏷️ Badge Generator","/badge-generator","Design and print name badges, lanyards, and VIP passes. Export to PDF for professional printing."],
          ["📊 Live Polling","/live-polling","Create real-time polls and Q&A sessions. Guests vote from their phones. Results display live on screen."],
          ["🖨️ Print Materials","/print-materials","Generate order of service, table plans, menus, and seating charts — ready to print in PDF."],
        ].map(([t,p,d])=>`<div style="background:${LIGHT};border:1px solid #e5e7eb;border-radius:8px;padding:12px;display:flex;gap:12px;align-items:flex-start;"><div style="font-size:20px;flex-shrink:0;">${t.split(" ")[0]}</div><div><div style="font-weight:700;font-size:13px;color:${B};">${t.substring(t.indexOf(" ")+1)}</div><div style="font-size:12px;color:#555;margin-top:3px;">${d}</div><a href="${p}" style="font-size:11px;color:${MID};font-weight:700;text-decoration:none;">Open → ${p}</a></div></div>`).join("")}
      </div>
    `,
  },
  {
    id: "financials", required: true, category: "Finance", duration: "25 min", emoji: "💰",
    title: "Financial Management",
    description: "Invoicing, budgets, payment plans, expense tracking, and profit & loss — with auto currency",
    content: `
      <h2 style="color:${B};border-bottom:2px solid ${MID};padding-bottom:8px;">Financial Management</h2>
      <div style="background:#fff3cd;border-left:4px solid #f59e0b;padding:10px 14px;border-radius:6px;margin-bottom:14px;font-size:12px;">
        <strong>Access:</strong> Financial tools are available to Planners and Admins only. The system automatically uses GBP for UK events and NGN for Nigeria events — the correct company entity appears on all invoices.
      </div>

      <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;margin:14px 0;">
        <div style="background:#065f46;color:#fff;padding:8px 14px;font-size:11px;font-weight:700;">💰 INVOICING</div>
        <div style="padding:12px;">
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:10px;">
            <div style="background:#f0fdf4;border-radius:8px;padding:10px;text-align:center;"><div style="font-size:16px;font-weight:800;color:#065f46;">£14,750</div><div style="font-size:10px;color:#065f46;">Paid</div></div>
            <div style="background:#fef3c7;border-radius:8px;padding:10px;text-align:center;"><div style="font-size:16px;font-weight:800;color:#92400e;">£8,000</div><div style="font-size:10px;color:#92400e;">Outstanding</div></div>
            <div style="background:#eff6ff;border-radius:8px;padding:10px;text-align:center;"><div style="font-size:16px;font-weight:800;color:#1e40af;">£22,750</div><div style="font-size:10px;color:#1e40af;">Total Billed</div></div>
          </div>
          <div style="background:#fff;border:1px solid #e5e7eb;border-radius:8px;padding:10px;font-size:12px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
              <strong>INV-0042 — Johnson Wedding</strong>
              <span style="background:#d1fae5;color:#065f46;padding:2px 8px;border-radius:10px;font-size:10px;font-weight:700;">PAID</span>
            </div>
            <div style="color:#777;">Due: 15 Oct 2026 · £5,800 · Event Perfekt Global Ltd</div>
          </div>
        </div>
      </div>

      <h3 style="color:${MID};">Financial Tools</h3>
      <p style="line-height:2.2;font-size:13px;"><strong>Invoicing</strong> — Create line-item invoices with auto tax. Send clients a public payment link (Flutterwave). Track paid and outstanding. <strong>Budget Planning</strong> — Set estimated costs per category (venue, catering, décor, etc.) and track actuals as you spend. <strong>Payment Plans</strong> — Split invoices into instalments with custom due dates. <strong>Expense Tracker</strong> — Upload receipts and log all event-related expenses. Request approvals for larger spends. <strong>Profit & Loss</strong> — Revenue vs costs per event and across all events. See margins clearly. <strong>Financial Dashboard</strong> — Multi-currency overview across UK and Nigeria portfolios.</p>
    `,
  },
  {
    id: "marketing", required: false, category: "Sales", duration: "20 min", emoji: "📈",
    title: "Marketing & Sales (Prospect Finder, Lead Pipeline)",
    description: "Find new prospects, track leads through the pipeline, and manage booking enquiries",
    content: `
      <h2 style="color:${B};border-bottom:2px solid ${MID};padding-bottom:8px;">Marketing & Sales</h2>

      <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;margin:14px 0;">
        <div style="background:#1e3a5f;color:#fff;padding:8px 14px;font-size:11px;font-weight:700;">🔍 PROSPECT FINDER</div>
        <div style="padding:12px;font-size:12px;">
          <p style="color:#555;margin:0 0 10px;">The Prospect Finder discovers corporate organisations, charities, and event buyers in your target territory who are likely to need EP services.</p>
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;">
            <div style="background:${LIGHT};border-radius:8px;padding:10px;text-align:center;"><div style="font-size:18px;font-weight:800;color:${B};">147</div><div style="font-size:10px;color:#555;">Prospects Found</div></div>
            <div style="background:${LIGHT};border-radius:8px;padding:10px;text-align:center;"><div style="font-size:18px;font-weight:800;color:${MID};">23</div><div style="font-size:10px;color:#555;">Contacted</div></div>
            <div style="background:${LIGHT};border-radius:8px;padding:10px;text-align:center;"><div style="font-size:18px;font-weight:800;color:#065f46;">5</div><div style="font-size:10px;color:#555;">Converted</div></div>
          </div>
        </div>
      </div>

      <h3 style="color:${MID};">Lead Pipeline</h3>
      <p style="font-size:13px;">Leads from the website enquiry form, prospect outreach, and direct referrals are tracked in the Kanban pipeline:</p>
      <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:6px;margin:10px 0;">
        ${["New Enquiry","Qualified","Proposal Sent","Negotiation","Won/Lost"].map((s,i)=>`<div style="background:${["#eff6ff","#f0fdf4","#fefce8","#fdf4ff","#f0fdf4"][i]};border:1px solid ${["#bfdbfe","#bbf7d0","#fde68a","#e9d5ff","#bbf7d0"][i]};border-radius:8px;padding:10px;text-align:center;font-size:10px;font-weight:700;color:${["#1e40af","#065f46","#92400e","#6b21a8","#065f46"][i]};">${s}</div>`).join("")}
      </div>

      <h3 style="color:${MID};">Booking Enquiries</h3>
      <p style="font-size:13px;">When a client fills in the booking form on the website, their submission appears in <strong>Website Enquiries</strong> (Lead Management → Website Enquiries). You can:</p>
      <p style="line-height:2.2;font-size:13px;">View all details of the enquiry. Move it to the lead pipeline with one click. Convert it to a full event when confirmed. Send a drafted reply directly from the platform.</p>
    `,
  },
  {
    id: "tender", required: false, category: "Business Development", duration: "20 min", emoji: "📑",
    title: "Tender Manager",
    description: "Track government and corporate tenders, write assisted bids, and manage your pipeline",
    content: `
      <h2 style="color:${B};border-bottom:2px solid ${MID};padding-bottom:8px;">Tender Manager</h2>
      <p>Access at <strong>/saas-tender-dashboard</strong> via the sidebar. The Tender Manager is EP's dedicated tool for winning government, charity, and corporate contracts.</p>

      <div style="background:#1a0a2e;border-radius:10px;padding:14px;margin:14px 0;color:#fff;">
        <div style="font-size:11px;font-weight:700;color:${GOLD};text-transform:uppercase;letter-spacing:0.1em;margin-bottom:12px;">📑 TENDER COMMAND CENTRE</div>
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;">
          <div style="background:rgba(255,255,255,0.08);border-radius:8px;padding:10px;text-align:center;"><div style="font-size:20px;font-weight:800;color:${GOLD};">34</div><div style="font-size:10px;opacity:0.6;">Active Tenders</div></div>
          <div style="background:rgba(255,255,255,0.08);border-radius:8px;padding:10px;text-align:center;"><div style="font-size:20px;font-weight:800;color:#4ade80;">8</div><div style="font-size:10px;opacity:0.6;">Bids Submitted</div></div>
          <div style="background:rgba(255,255,255,0.08);border-radius:8px;padding:10px;text-align:center;"><div style="font-size:20px;font-weight:800;color:#f87171;">3</div><div style="font-size:10px;opacity:0.6;">Closing This Week</div></div>
          <div style="background:rgba(255,255,255,0.08);border-radius:8px;padding:10px;text-align:center;"><div style="font-size:20px;font-weight:800;color:#60a5fa;">2</div><div style="font-size:10px;opacity:0.6;">Won YTD</div></div>
        </div>
      </div>

      <h3 style="color:${MID};">Key Features</h3>
      <p style="line-height:2.2;font-size:13px;"><strong>Tender Finder</strong> — Automatically discovers new tenders from government portals, Contracts Finder, and procurement databases every 6 hours. <strong>Bid Writer</strong> — Describe the tender and the platform drafts a full bid response using EP's company profile and past wins. <strong>Bid Vault (Knowledge Base)</strong> — Stores approved bid sections, case studies, and company certifications for reuse. <strong>Pipeline Dashboard</strong> — Track each tender through stages: Discovered, Evaluating, Bidding, Submitted, Result. <strong>Portal Registration Tracker</strong> — Tracks which procurement portals EP is registered on and renewal dates. <strong>Deadline Alerts</strong> — Daily email digests of tenders closing within 7 days.</p>
    `,
  },
  {
    id: "communication", required: false, category: "Communication", duration: "15 min", emoji: "📣",
    title: "Communication Tools",
    description: "WhatsApp/SMS, email campaigns, the Marketing Agent, and team chat",
    content: `
      <h2 style="color:${B};border-bottom:2px solid ${MID};padding-bottom:8px;">Communication Tools</h2>

      <div style="display:flex;flex-direction:column;gap:10px;margin:14px 0;">
        <div style="background:#dcfce7;border:1px solid #86efac;border-radius:8px;padding:12px;">
          <strong style="color:#166534;">📱 WhatsApp / SMS Centre</strong>
          <p style="font-size:12px;color:#555;margin:6px 0 0;">Send individual or bulk WhatsApp messages and SMS to guests and vendors. Track delivery and read receipts. Set up automated reminders. Access at <strong>/sms-center</strong>.</p>
        </div>
        <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:12px;">
          <strong style="color:#1e40af;">📧 Email Campaigns</strong>
          <p style="font-size:12px;color:#555;margin:6px 0 0;">Send branded email campaigns to your contact list. Track opens and clicks. Use for marketing, event announcements, newsletters, and follow-ups. Access at <strong>/email-campaigns</strong>.</p>
        </div>
        <div style="background:#fdf4ff;border:1px solid #e9d5ff;border-radius:8px;padding:12px;">
          <strong style="color:#6b21a8;">✨ Marketing Agent</strong>
          <p style="font-size:12px;color:#555;margin:6px 0 0;">Brief us on an event, audience, or campaign and we draft email copy, social posts, press releases, and outreach messages. Also does competitor and venue research. Access at <strong>/research</strong>.</p>
        </div>
        <div style="background:${LIGHT};border:1px solid #e5e7eb;border-radius:8px;padding:12px;">
          <strong style="color:${B};">💬 Team Chat</strong>
          <p style="font-size:12px;color:#555;margin:6px 0 0;">Live team messaging panel on the dashboard, plus per-event chat threads inside each Event Dashboard. Keep all communication inside the platform — not WhatsApp.</p>
        </div>
      </div>
    `,
  },
  {
    id: "postevent", required: false, category: "Post-Event", duration: "15 min", emoji: "📈",
    title: "Post-Event Tools",
    description: "Analytics, guest surveys, vendor ratings, photo gallery, and event closure",
    content: `
      <h2 style="color:${B};border-bottom:2px solid ${MID};padding-bottom:8px;">Post-Event Tools</h2>
      <p>After every event, use the <strong>Post-Event</strong> section to wrap up, measure success, and capture learnings.</p>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:14px 0;">
        <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:12px;">
          <div style="font-weight:700;font-size:13px;color:#065f46;">📈 Post-Event Analytics</div>
          <p style="font-size:12px;color:#555;line-height:1.9;margin:6px 0 0;">Attendance rate vs invited. Budget vs actual spend. Revenue and profit margin. Timeline adherence. Vendor performance scores.</p>
        </div>
        <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:12px;">
          <div style="font-weight:700;font-size:13px;color:#1e40af;">📋 Guest Surveys</div>
          <p style="font-size:12px;color:#555;line-height:1.9;margin:6px 0 0;">Build custom surveys. Send by email post-event. Track responses in real time. View results by question. Export to PDF or CSV.</p>
        </div>
        <div style="background:#fefce8;border:1px solid #fde68a;border-radius:8px;padding:12px;">
          <div style="font-weight:700;font-size:13px;color:#92400e;">⭐ Vendor Ratings</div>
          <p style="font-size:12px;color:#555;line-height:1.9;margin:6px 0 0;">Rate each vendor on 4 criteria. Scores feed into directory. Helps future event planning. Vendors with poor ratings flagged.</p>
        </div>
        <div style="background:#fdf4ff;border:1px solid #e9d5ff;border-radius:8px;padding:12px;">
          <div style="font-weight:700;font-size:13px;color:#6b21a8;">📸 Photo Gallery</div>
          <p style="font-size:12px;color:#555;line-height:1.9;margin:6px 0 0;">Upload event photos and videos. Organise into albums. Share with clients via link. Public gallery view for guests.</p>
        </div>
      </div>
      <div style="background:#fee2e2;border-left:4px solid #dc2626;padding:12px 16px;border-radius:6px;font-size:13px;">
        <strong>Event Closure:</strong> When all post-event tasks are done, mark the event as Closed in the Post-Event Hub. This locks the budget, files all documents, and archives the event from the active dashboard.
      </div>
      <h3 style="color:${MID};margin-top:20px;">What was added yesterday</h3>
      <p style="line-height:2.2;font-size:13px;"><strong>Post-event hub</strong> — a dedicated list of completed and closed events. <strong>Event feedback</strong> — feedback is now captured and linked to analytics. <strong>Analytics entry points</strong> — dashboards now link clearly to post-event reports.</p>
    `,
  },
  {
    id: "clientportal", required: false, category: "Client Management", duration: "15 min", emoji: "🏛️",
    title: "Client Portal",
    description: "The separate portal where clients track their project, view documents, make payments, and send messages",
    content: `
      <h2 style="color:${B};border-bottom:2px solid ${MID};padding-bottom:8px;">Client Portal</h2>
      <p>The Client Portal is a completely separate, branded portal for EP's consulting and management clients (not event guests). Clients log in at <strong>/client-portal/login</strong>.</p>

      <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;margin:14px 0;">
        <div style="background:${B};color:#fff;padding:8px 14px;font-size:11px;font-weight:700;">🏛️ CLIENT PORTAL — Kehinde B.</div>
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:0;border-bottom:1px solid #e5e7eb;">
          ${["📊 Overview","📅 Project","💬 Messages","📄 Documents"].map((t,i)=>`<div style="padding:8px 12px;font-size:11px;font-weight:700;text-align:center;${i===0?`background:${B};color:#fff;`:"color:#555;background:#f9fafb;border-left:1px solid #e5e7eb;"}">${t}</div>`).join("")}
        </div>
        <div style="padding:14px;display:grid;grid-template-columns:1fr 1fr;gap:10px;">
          <div style="background:#f0fdf4;border-radius:8px;padding:10px;font-size:12px;"><strong style="color:#065f46;">Project Progress</strong><br/><div style="background:#e5e7eb;border-radius:999px;height:8px;margin:6px 0;"><div style="background:#059669;width:72%;height:100%;border-radius:999px;"></div></div>72% Complete</div>
          <div style="background:${LIGHT};border-radius:8px;padding:10px;font-size:12px;"><strong style="color:${B};">Outstanding Invoice</strong><br/>INV-0044 · £3,200<br/><span style="color:#dc2626;font-size:11px;font-weight:700;">DUE 30 May</span></div>
        </div>
      </div>

      <h3 style="color:${MID};">What Clients Can Do</h3>
      <p style="line-height:2.2;font-size:13px;"><strong>Overview</strong> — Project summary, key milestones, progress percentage. <strong>Project</strong> — Deliverables, risks, issues, timeline, RAID log. <strong>Documents</strong> — View, read, sign, and request changes on contracts and reports. <strong>Messages</strong> — Direct messaging with their EP account manager. <strong>Payments</strong> — View invoices, outstanding balances, and pay online. <strong>Weekly Reports</strong> — Progress reports delivered into their portal. <strong>Meetings</strong> — Schedule and join meetings with the EP team.</p>
      <div style="background:#d1fae5;border-left:4px solid #059669;padding:12px 16px;border-radius:6px;margin-top:14px;font-size:13px;">
        <strong>As a Planner:</strong> You can update client-facing documents, send reports, reply to messages, and manage the project status from the EP-side tools (EP CRM → Client Detail).
      </div>
    `,
  },
  {
    id: "roles", required: true, category: "Getting Started", duration: "10 min", emoji: "🔑",
    title: "Roles & Permissions",
    description: "Understand what each role can access and why data security matters",
    content: `
      <h2 style="color:${B};border-bottom:2px solid ${MID};padding-bottom:8px;">Roles & Permissions</h2>
      <table style="width:100%;border-collapse:collapse;font-size:13px;margin:14px 0;">
        <tr style="background:${B};color:white;"><th style="padding:10px 12px;text-align:left;">Role</th><th style="padding:10px 12px;text-align:left;">Who</th><th style="padding:10px 12px;text-align:left;">Access Level</th></tr>
        <tr style="background:${LIGHT};"><td style="padding:10px 12px;border:1px solid #ddd;"><strong style="color:${B};">Admin</strong></td><td style="padding:10px 12px;border:1px solid #ddd;">Business directors / owners</td><td style="padding:10px 12px;border:1px solid #ddd;">Full access to everything including financials, audit trail, all events, employee management</td></tr>
        <tr><td style="padding:10px 12px;border:1px solid #ddd;"><strong style="color:${MID};">Planner</strong></td><td style="padding:10px 12px;border:1px solid #ddd;">Event managers</td><td style="padding:10px 12px;border:1px solid #ddd;">All assigned events, vendors, guests, financials for their events, communication tools</td></tr>
        <tr style="background:${LIGHT};"><td style="padding:10px 12px;border:1px solid #ddd;"><strong style="color:#1e40af;">Staff / Coordinator</strong></td><td style="padding:10px 12px;border:1px solid #ddd;">Team members, interns, day staff</td><td style="padding:10px 12px;border:1px solid #ddd;">Assigned events only, no financials, no admin tools</td></tr>
        <tr><td style="padding:10px 12px;border:1px solid #ddd;"><strong style="color:#6b21a8;">Client</strong></td><td style="padding:10px 12px;border:1px solid #ddd;">EP consulting clients</td><td style="padding:10px 12px;border:1px solid #ddd;">Their own project via Client Portal only — cannot see internal planning details</td></tr>
      </table>
      <div style="background:#fee2e2;border-left:4px solid #dc2626;padding:12px 16px;border-radius:6px;margin-top:14px;font-size:13px;">
        <strong>Non-negotiable rules:</strong> Never share a client's data with another client, never share your login credentials with anyone, never screenshot or download client data outside the platform, and remember that all actions are permanently logged in the Audit Trail — every click, every change.
      </div>
    `,
  },
  {
    id: "auditdocs", required: true, category: "Getting Started", duration: "10 min", emoji: "🔍",
    title: "Audit Trail & Security",
    description: "What the audit trail records, why it matters, and how to raise an issue ticket",
    content: `
      <h2 style="color:${B};border-bottom:2px solid ${MID};padding-bottom:8px;">Audit Trail & Security</h2>
      <p>The Audit Trail (accessible to Admins at <strong>/audit-trail</strong>) records every action taken on the platform:</p>
      <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;margin:14px 0;">
        <div style="background:#1f2937;color:#fff;padding:8px 14px;font-size:11px;font-weight:700;font-family:monospace;">🔍 AUDIT TRAIL</div>
        <div style="padding:12px;font-family:monospace;font-size:11px;display:flex;flex-direction:column;gap:6px;">
          ${[
            ["12:34:07","adminuk@eventperfekt.com","Created invoice INV-0045 for Johnson Wedding","#d1fae5"],
            ["12:28:44","planner@eventperfekt.com","Updated vendor status: Studio Lens → Booked","#eff6ff"],
            ["12:15:02","adminuk@eventperfekt.com","Signed contract CON-0023 — Okafor Wedding","#fef3c7"],
            ["11:59:31","staff@eventperfekt.com","Checked in guest Adaeze Okafor (QR)","#f0fdf4"],
          ].map(([t,u,a,bg])=>`<div style="background:${bg};border-radius:6px;padding:8px 10px;"><span style="color:#777;">${t}</span> · <strong>${u}</strong> · ${a}</div>`).join("")}
        </div>
      </div>
      <h3 style="color:${MID};">Issue Tickets</h3>
      <p style="font-size:13px;">If you spot a bug, error, or anything that doesn't look right, go to <strong>Issue Tickets</strong> in the sidebar and raise a ticket. Include what you were trying to do, what happened instead, which page or feature it was on, and any error message you saw.</p>
      <div style="background:#d1fae5;border-left:4px solid #059669;padding:12px 16px;border-radius:6px;margin-top:14px;font-size:13px;">
        <strong>Never ignore something that looks wrong</strong> — raise a ticket and it will be addressed. The platform is continuously improved based on staff feedback.
      </div>
    `,
  },
];

// ─── Checklist ────────────────────────────────────────────────────────────────
const CHECKLIST = [
  { id: "login", label: "Log in using your temporary password" },
  { id: "reset", label: "Reset your password to a secure one" },
  { id: "profile", label: "Review your profile and confirm your details" },
  { id: "dashboard", label: "Explore the Dashboard — check the event kanban and try the country filter" },
  { id: "sidebar", label: "Click through every sidebar section to see what it does" },
  { id: "event", label: "Open an event and explore all its tabs (Overview, Tasks, Budget, Guests, Services…)" },
  { id: "documents", label: "Open the Documents section and read any files shared with you" },
  { id: "tickets", label: "Find the Issue Tickets page so you know where it is" },
  { id: "training", label: "Complete all Required training modules below" },
];

const WELCOME_LETTER = (name: string) => `
<div style="font-family:'Poppins',sans-serif;color:#333;line-height:1.8;max-width:680px;">
  <div style="text-align:center;margin-bottom:24px;">
    <img src="${eventPerfektLogo}" alt="Event Perfekt" style="height:60px;border-radius:8px;object-fit:contain;"/>
    <div style="color:${B};font-size:11px;letter-spacing:0.1em;text-transform:uppercase;margin-top:8px;font-weight:700;">Event Perfekt Global Ltd · 20 Wenlock Road, London N1 7PG</div>
  </div>
  <p style="color:#666;font-size:12px;margin-bottom:4px;">${new Date().toLocaleDateString("en-GB",{day:"numeric",month:"long",year:"numeric"})}</p>
  <h2 style="color:${B};border-bottom:3px solid ${GOLD};padding-bottom:10px;margin-bottom:20px;">Welcome to the Event Perfekt Team — ${name || "New Team Member"}</h2>
  <p>Dear ${name || "Team Member"},</p>
  <p>On behalf of the entire Event Perfekt team, I am delighted to welcome you. You are joining a team that takes real pride in the work we do — whether that is a 500-person gala in Lagos, a government tender in London, or an intimate private celebration. Every event matters to us, and now it matters to you too.</p>
  <p>We are growing fast — across the UK and Africa — and this platform is the engine that makes it all work. It replaces spreadsheets, WhatsApp chains, and email threads. Everything lives here: events, guests, vendors, budgets, contracts, documents, and communication. Use it.</p>
  <h3 style="color:${MID};margin-top:20px;">What We Expect of You</h3>
  <p style="line-height:1.9;">Come prepared, curious, and ready to contribute every day. Use this platform — not personal WhatsApp — for all official work communication. Treat every client interaction and every document with the same care you would want shown to you. Ask questions — there are no silly ones here. And represent Event Perfekt with professionalism in everything you do, online and in person.</p>
  <h3 style="color:${MID};margin-top:20px;">Your First Week — What to Complete</h3>
  <p style="line-height:1.9;">Complete this onboarding walkthrough in full, then log into the platform and reset your password to something secure. Open every section of the sidebar and explore what is there, then open an existing event and click through all its tabs. Read every document shared with you in the Documents section, introduce yourself to your line manager via the Team Chat, and complete all Required training modules in the Training tab.</p>
  <p style="margin-top:20px;">We are genuinely glad to have you with us. Your energy, your ideas, and your commitment matter here — and we look forward to watching you grow with us.</p>
  <p>Warm regards,</p>
  <p style="font-weight:700;color:${B};">Tolu Johnson<br/>Founder and Director<br/>Event Perfekt Global Ltd</p>
  <div style="margin-top:24px;padding:14px 18px;background:${LIGHT};border-radius:8px;font-size:13px;color:#555;border-left:4px solid ${GOLD};">
    <strong>Platform:</strong> eventperfekt.net<br/>
    <strong>Support:</strong> adminuk@eventperfekt.com<br/>
    <strong>Tagline:</strong> ...making yours perfekt
  </div>
</div>
`;

const CHECKLIST_KEY = "ep_onboarding_checklist_v2";

// ─── Component ────────────────────────────────────────────────────────────────
export default function OnboardingPortal() {
  const { user } = useAuth();
  const userName = (user as any)?.name || (user as any)?.fullName || "Team Member";
  const [activeTab, setActiveTab] = useState<"letter" | "walkthrough" | "training">("letter");
  const [walkthroughStep, setWalkthroughStep] = useState(0);
  const [filterCat, setFilterCat] = useState("All");
  const [checked, setChecked] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem(CHECKLIST_KEY) || "[]")); } catch { return new Set(); }
  });
  const [selectedModule, setSelectedModule] = useState<typeof MODULES[0] | null>(null);
  const [completedModules, setCompletedModules] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem("ep_completed_modules_v2") || "[]")); } catch { return new Set(); }
  });

  function toggleCheck(id: string) {
    setChecked(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      localStorage.setItem(CHECKLIST_KEY, JSON.stringify([...next]));
      return next;
    });
  }

  function completeModule(id: string) {
    setCompletedModules(prev => {
      const next = new Set(prev);
      next.add(id);
      localStorage.setItem("ep_completed_modules_v2", JSON.stringify([...next]));
      return next;
    });
    setSelectedModule(null);
  }

  const checkedCount = checked.size;
  const completedReq = MODULES.filter(m => m.required && completedModules.has(m.id)).length;
  const totalReq = MODULES.filter(m => m.required).length;
  const overallPct = Math.round(((checkedCount + completedReq) / (CHECKLIST.length + totalReq)) * 100);

  const categories = ["All", ...Array.from(new Set(MODULES.map(m => m.category)))];
  const visibleModules = filterCat === "All" ? MODULES : MODULES.filter(m => m.category === filterCat);

  const tabStyle = (active: boolean): React.CSSProperties => ({
    padding: "11px 22px", border: "none", cursor: "pointer",
    fontFamily: "Poppins, sans-serif", fontSize: 13, fontWeight: 700,
    background: active ? "#fff" : "transparent",
    color: active ? B : "rgba(255,255,255,0.7)",
    borderBottom: active ? `3px solid ${GOLD}` : "3px solid transparent",
    transition: "all 0.15s", whiteSpace: "nowrap",
  });

  return (
    <PlannerLayout>
      <div style={{ maxWidth: 960, margin: "0 auto", padding: "24px 16px 80px", fontFamily: "'Poppins', sans-serif" }}>

        {/* Header */}
        <div style={{ background: `linear-gradient(135deg, ${B}, #5a1020)`, borderRadius: 14, padding: "28px 32px", marginBottom: 20, color: "#fff", display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
          <img src={eventPerfektLogo} alt="EP" style={{ height: 52, borderRadius: 8, flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: GOLD, fontWeight: 700, marginBottom: 4 }}>Staff Onboarding & Training Portal</div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>Welcome, {userName} 👋</h1>
            <p style={{ margin: "4px 0 0", color: "rgba(255,255,255,0.65)", fontSize: 13 }}>...making yours perfekt</p>
          </div>
          <div style={{ textAlign: "center", flexShrink: 0 }}>
            <div style={{ fontSize: 36, fontWeight: 900, color: GOLD, lineHeight: 1 }}>{overallPct}%</div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.55)", textTransform: "uppercase", letterSpacing: "0.08em", marginTop: 4 }}>Onboarding Complete</div>
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ height: 6, background: "rgba(255,255,255,0.12)", borderRadius: 999, marginBottom: 20, overflow: "hidden" }}>
          <div style={{ width: `${overallPct}%`, height: "100%", background: GOLD, borderRadius: 999, transition: "width 0.5s ease" }} />
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", background: `${B}`, borderRadius: "12px 12px 0 0", overflow: "hidden", flexWrap: "wrap" }}>
          <button style={tabStyle(activeTab === "letter")} onClick={() => setActiveTab("letter")}>📜 Welcome Letter</button>
          <button style={tabStyle(activeTab === "walkthrough")} onClick={() => setActiveTab("walkthrough")}>🗺️ System Walkthrough</button>
          <button style={tabStyle(activeTab === "training")} onClick={() => setActiveTab("training")}>
            📚 Training Modules
            {completedReq < totalReq && (
              <span style={{ marginLeft: 8, background: "#dc2626", color: "#fff", fontSize: 10, padding: "1px 7px", borderRadius: 12, fontWeight: 800 }}>
                {totalReq - completedReq} left
              </span>
            )}
          </button>
        </div>

        <div style={{ background: "#fff", borderRadius: "0 0 14px 14px", boxShadow: "0 4px 24px rgba(0,0,0,0.10)", minHeight: 500 }}>

          {/* ── WELCOME LETTER ── */}
          {activeTab === "letter" && (
            <div style={{ padding: "36px 40px" }}>
              <div dangerouslySetInnerHTML={{ __html: WELCOME_LETTER(userName) }} />
              <div style={{ marginTop: 40, background: LIGHT, borderRadius: 12, padding: 24 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
                  <h3 style={{ color: B, margin: 0, fontSize: 16, fontWeight: 800 }}>First Week Checklist</h3>
                  <span style={{ fontSize: 12, color: "#555" }}>{checkedCount} / {CHECKLIST.length} complete</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {CHECKLIST.map(item => (
                    <label key={item.id} onClick={() => toggleCheck(item.id)} style={{ display: "flex", alignItems: "flex-start", gap: 12, cursor: "pointer", padding: "11px 14px", background: checked.has(item.id) ? "#d1fae5" : "#fff", border: `1.5px solid ${checked.has(item.id) ? "#059669" : "#e5e7eb"}`, borderRadius: 8, transition: "all 0.15s" }}>
                      <span style={{ fontSize: 20, flexShrink: 0, marginTop: 1 }}>{checked.has(item.id) ? "✅" : "⬜"}</span>
                      <span style={{ fontSize: 13, color: checked.has(item.id) ? "#065f46" : "#333", fontWeight: 500, textDecoration: checked.has(item.id) ? "line-through" : "none", lineHeight: 1.5 }}>{item.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── WALKTHROUGH ── */}
          {activeTab === "walkthrough" && (
            <div>
              <div style={{ background: LIGHT, padding: "20px 32px", borderBottom: "1px solid #e5e7eb", display: "flex", gap: 8, flexWrap: "wrap" }}>
                {WALKTHROUGH.map((s, i) => (
                  <button key={s.id} onClick={() => setWalkthroughStep(i)} style={{ padding: "7px 16px", border: `1.5px solid ${walkthroughStep === i ? B : "#e5e7eb"}`, borderRadius: 20, cursor: "pointer", fontFamily: "Poppins, sans-serif", fontSize: 12, fontWeight: 700, background: walkthroughStep === i ? B : "#fff", color: walkthroughStep === i ? "#fff" : "#555", whiteSpace: "nowrap" }}>
                    {s.emoji} Step {i + 1}
                  </button>
                ))}
              </div>
              <div style={{ padding: "32px 40px" }}>
                <h2 style={{ color: B, fontSize: 18, fontWeight: 800, marginBottom: 4 }}>{WALKTHROUGH[walkthroughStep].title}</h2>
                <div style={{ height: 3, background: MID, width: 48, borderRadius: 999, marginBottom: 20 }} />
                <div style={{ color: "#333", lineHeight: 1.85, fontSize: 14 }} dangerouslySetInnerHTML={{ __html: WALKTHROUGH[walkthroughStep].content }} />
                <div style={{ display: "flex", gap: 10, marginTop: 32 }}>
                  <button disabled={walkthroughStep === 0} onClick={() => setWalkthroughStep(s => s - 1)} style={{ padding: "10px 22px", background: walkthroughStep === 0 ? "#f3f4f6" : LIGHT, color: walkthroughStep === 0 ? "#aaa" : "#333", border: "1px solid #e5e7eb", borderRadius: 8, fontFamily: "Poppins, sans-serif", fontWeight: 700, cursor: walkthroughStep === 0 ? "default" : "pointer", fontSize: 13 }}>← Back</button>
                  {walkthroughStep < WALKTHROUGH.length - 1 ? (
                    <button onClick={() => setWalkthroughStep(s => s + 1)} style={{ padding: "10px 24px", background: B, color: "#fff", border: "none", borderRadius: 8, fontFamily: "Poppins, sans-serif", fontWeight: 700, cursor: "pointer", fontSize: 13 }}>Next Step →</button>
                  ) : (
                    <button onClick={() => setActiveTab("training")} style={{ padding: "10px 24px", background: GOLD, color: "#000", border: "none", borderRadius: 8, fontFamily: "Poppins, sans-serif", fontWeight: 700, cursor: "pointer", fontSize: 13 }}>Go to Training Modules →</button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── TRAINING MODULES LIST ── */}
          {activeTab === "training" && !selectedModule && (
            <div style={{ padding: "32px 40px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
                <div>
                  <h2 style={{ color: B, margin: 0, fontSize: 18, fontWeight: 800 }}>Training Modules</h2>
                  <p style={{ color: "#666", margin: "4px 0 0", fontSize: 13 }}>{completedReq} of {totalReq} required modules completed · {MODULES.length} modules total</p>
                </div>
              </div>
              {/* Category filter */}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
                {categories.map(cat => (
                  <button key={cat} onClick={() => setFilterCat(cat)} style={{ padding: "6px 14px", border: `1.5px solid ${filterCat === cat ? B : "#e5e7eb"}`, borderRadius: 20, cursor: "pointer", fontFamily: "Poppins, sans-serif", fontSize: 11, fontWeight: 700, background: filterCat === cat ? B : "#fff", color: filterCat === cat ? "#fff" : "#555", transition: "all 0.15s" }}>{cat}</button>
                ))}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
                {visibleModules.map(m => {
                  const done = completedModules.has(m.id);
                  return (
                    <div key={m.id} onClick={() => setSelectedModule(m)} style={{ border: `2px solid ${done ? "#059669" : "#e5e7eb"}`, borderRadius: 12, padding: 18, cursor: "pointer", background: done ? "#f0fdf4" : "#fff", transition: "all 0.18s", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = done ? "#059669" : B; (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 16px rgba(51,3,17,0.12)"; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = done ? "#059669" : "#e5e7eb"; (e.currentTarget as HTMLElement).style.boxShadow = "0 1px 4px rgba(0,0,0,0.05)"; }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8, gap: 8 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 22 }}>{m.emoji}</span>
                          <span style={{ fontWeight: 800, fontSize: 13, color: B, lineHeight: 1.3 }}>{m.title}</span>
                        </div>
                        <span style={{ fontSize: 18, flexShrink: 0 }}>{done ? "✅" : "📖"}</span>
                      </div>
                      <p style={{ color: "#666", fontSize: 12, margin: "0 0 12px", lineHeight: 1.55 }}>{m.description}</p>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        <span style={{ background: m.required ? "#fee2e2" : "#f3f4f6", color: m.required ? "#991b1b" : "#555", fontSize: 10, padding: "2px 8px", borderRadius: 10, fontWeight: 700 }}>{m.required ? "⚠ Required" : "Optional"}</span>
                        <span style={{ background: "#f3f4f6", color: "#555", fontSize: 10, padding: "2px 8px", borderRadius: 10 }}>{m.category}</span>
                        <span style={{ background: "#f3f4f6", color: "#555", fontSize: 10, padding: "2px 8px", borderRadius: 10 }}>⏱ {m.duration}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── MODULE VIEWER ── */}
          {activeTab === "training" && selectedModule && (
            <div style={{ padding: "32px 40px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
                <button onClick={() => setSelectedModule(null)} style={{ background: LIGHT, border: "1px solid #e5e7eb", padding: "8px 16px", borderRadius: 8, cursor: "pointer", fontFamily: "Poppins, sans-serif", fontWeight: 700, color: "#333", fontSize: 12 }}>← All Modules</button>
                <span style={{ fontSize: 22 }}>{selectedModule.emoji}</span>
                <h2 style={{ color: B, margin: 0, fontSize: 17, fontWeight: 800 }}>{selectedModule.title}</h2>
                <span style={{ background: selectedModule.required ? "#fee2e2" : "#f3f4f6", color: selectedModule.required ? "#991b1b" : "#555", fontSize: 10, padding: "2px 9px", borderRadius: 10, fontWeight: 700 }}>{selectedModule.required ? "⚠ Required" : "Optional"}</span>
                <span style={{ background: "#f3f4f6", color: "#555", fontSize: 10, padding: "2px 9px", borderRadius: 10 }}>⏱ {selectedModule.duration}</span>
              </div>
              <div style={{ height: 2, background: `linear-gradient(90deg, ${MID}, transparent)`, marginBottom: 28 }} />
              <div style={{ color: "#333", lineHeight: 1.85, fontSize: 14 }} dangerouslySetInnerHTML={{ __html: selectedModule.content }} />
              <div style={{ marginTop: 32, paddingTop: 24, borderTop: "1px solid #e5e7eb", display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                <button onClick={() => completeModule(selectedModule.id)} style={{ padding: "12px 28px", background: completedModules.has(selectedModule.id) ? "#059669" : B, color: "#fff", border: "none", borderRadius: 8, fontFamily: "Poppins, sans-serif", fontWeight: 700, cursor: "pointer", fontSize: 14 }}>
                  {completedModules.has(selectedModule.id) ? "✅ Completed" : "Mark as Complete"}
                </button>
                <button onClick={() => setSelectedModule(null)} style={{ padding: "12px 20px", background: LIGHT, color: "#333", border: "1px solid #e5e7eb", borderRadius: 8, fontFamily: "Poppins, sans-serif", fontWeight: 600, cursor: "pointer", fontSize: 13 }}>← Back to Modules</button>
              </div>
            </div>
          )}

        </div>
      </div>
    </PlannerLayout>
  );
}
