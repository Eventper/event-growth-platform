import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { usePageMeta } from "@/hooks/use-page-meta";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Star } from "lucide-react";

const eventKey = "iamher-2026-08-28";

export default function IAmHerDashboard() {
  usePageMeta({
    title: "I Am Her | Leadership Wellbeing Experience | The Woman Who Leads the Room",
    description: "I Am Her is a luxury leadership wellbeing experience for founders, executives, and women in leadership. Confidence, wellbeing, identity, and meaningful connection in a curated invitation-only setting.",
  });
  const daysToEvent = useMemo(() => {
    const now = new Date();
    const event = new Date("2026-10-30T00:00:00");
    return Math.max(0, Math.ceil((event.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
  }, []);
  const [summary, setSummary] = useState<any>(null);
  const [guestApplications, setGuestApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSubmittingContact, setIsSubmittingContact] = useState(false);
  const [contactNotice, setContactNotice] = useState<{ type: "success" | "error"; message: string } | null>(null);
  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch("/api/iam-her/summary")
        .then(async (r) => (r.ok ? r.json() : null))
        .catch(() => null),
      fetch(`/api/event-applications?eventKey=${encodeURIComponent(eventKey)}`)
        .then(async (r) => (r.ok ? r.json() : []))
        .catch(() => []),
    ]).then(([summaryData, guestData]) => {
      if (cancelled) return;
      setSummary(summaryData);
      setGuestApplications(Array.isArray(guestData) ? guestData : []);
      if (!summaryData) {
        setLoadError("Some live dashboard data could not be loaded right now.");
      }
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const tasks = summary?.tasks_total ?? 0;
  const completed = Math.max(0, tasks - (summary?.tasks_overdue ?? 0));
  const completionPercent = tasks > 0 ? Math.min(100, Math.max(0, (completed / tasks) * 100)) : 0;
  const audiencePoints = [
    "Founders, CEOs and CFOs who want high-value rooms and meaningful connections",
    "Executive women, directors, mothers and wives looking for a luxury women-led evening",
    "Wellness, beauty, aesthetics and non-invasive surgery leaders driving equality, visibility and collaboration",
    "Brands, sponsors and partners that want goody bag placement and brand visibility",
    "HR teams, CSR leads and diversity champions in Milton Keynes looking for aligned partnerships",
  ];
  const corporatePartners = [
    ["Cetaphil", "Tolu", "tolu@eventperfekt.com", "In progress", "Follow up next week"],
    ["Obagi", "Tolu", "tolu@eventperfekt.com", "In progress", "Send revised pack"],
    ["Lisardam", "Esther", "esther@eventperfekt.com", "Pending", "Call this week"],
  ];

  const experiencePoints = [
    "Champagne and meaningful connection in a carefully curated Buckinghamshire setting",
    "Beauty, aesthetics, hormones, wellness and leadership conversations with standout women",
    "A private evening built to help you take a break for you",
    "Brand placement, sponsorship partnership and co-create opportunities for aligned brands and founders",
    "A room for HR, CSR and diversity conversations with local companies",
    "Wine tasting moments designed to make the evening feel experiential and memorable",
    "Experiential discounts and partner offers for guests and aligned brands",
  ];

  const seoFaqs = [
    {
      q: "Who is I Am Her for?",
      a: "I Am Her is for founders, CEOs, CFOs, executives, directors, mothers, wives, wellness leaders, beauty founders and women who want a premium women-led evening.",
    },
    {
      q: "What kind of event is it?",
      a: "It is an invitation-only evening for founders, executives, and women who lead — focused on confidence, identity, wellbeing, connection, and meaningful presence.",
    },
    {
      q: "Where is it happening?",
      a: "The event is in Buckinghamshire and Milton Keynes, with the final venue shared privately with confirmed guests.",
    },
    {
      q: "Can brands partner with the event?",
      a: "Yes. Event Perfekt is curating a small number of sponsorship partnerships, co-create opportunities, goody bag placement and visibility opportunities for aligned sponsors and collaborators.",
    },
    {
      q: "Is this relevant for HR and CSR teams?",
      a: "Yes. The event is a strong fit for HR companies in Milton Keynes, CSR teams and diversity-focused partners who want to support women-led visibility and community building.",
    },
    {
      q: "Will there be wine tasting or experiential offers?",
      a: "Yes. We are exploring wine tasting moments and experiential discounts so the evening feels premium, interactive and memorable.",
    },
    {
      q: "How do sponsorship links and payment details work?",
      a: "Sponsorship and partnership enquiries are handled directly by Event Perfekt, with bank links or payment details shared privately during the next step once the fit is confirmed.",
    },
  ];

  return (
    <div className="min-h-screen bg-[#330311] text-white">
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        <div className="grid md:grid-cols-4 gap-4">
          {[
            ["Days to Event", daysToEvent],
            ["Co-Creators Confirmed", summary?.co_creators_confirmed ?? 0],
            ["Corporate Partners", summary?.corporate_partners_count ?? 0],
            ["Guest Applications", summary?.guest_applications_count ?? 0],
          ].map(([label, value]) => (
            <Card key={label as string} className="bg-white text-black">
              <CardContent className="p-5">
                <div className="text-xs uppercase tracking-[0.2em] text-gray-500">{label as string}</div>
                <div className="text-3xl font-bold mt-2">{value as number}</div>
              </CardContent>
            </Card>
          ))}
        </div>
        {loadError && (
          <Card className="bg-amber-50 border-amber-300 text-amber-900">
            <CardContent className="p-4 text-sm">{loadError}</CardContent>
          </Card>
        )}
        <div className="grid lg:grid-cols-2 gap-6">
          <Card className="bg-white text-black">
            <CardHeader><CardTitle>Overview</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p><strong>Event name:</strong> I Am Her</p>
              <p><strong>Date:</strong> Friday 30 October 2026</p>
              <p><strong>Location:</strong> Milton Keynes — the venue will be revealed to invited guests</p>
              <p><strong>Capacity:</strong> 100 women — invitation only</p>
              <p><strong>Project Lead:</strong> Tolu Johnson</p>
              <p><strong>Project Manager:</strong> Juliet Ike</p>
              <p><strong>Status:</strong> Active — In Planning</p>
              <p><strong>Experience:</strong> champagne, meaningful connection, leadership moments, beauty and wellness conversations, private brand activations and partner visibility.</p>
            </CardContent>
          </Card>
          <Card className="bg-white text-black">
            <CardHeader><CardTitle>Programme Timeline</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              {["7:00pm — Arrival and welcome drinks and goodie bag collection","7:30pm — Skin panel — Esther and colleague","8:30pm — Laser clinic — 10 minutes","8:45pm — Brand moments — 2 minutes each","9:00pm — Makeup","9:30pm — Open floor and wine","11:00pm — Close"].map(item => <div key={item}>{item}</div>)}
            </CardContent>
          </Card>
        </div>
        <Card className="bg-white text-black">
          <CardHeader><CardTitle>Co-Creators</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between border rounded-lg p-4">
              <div>
                <div className="font-semibold">Esther — Co-Creator</div>
                <div className="text-sm text-gray-500">Confirmed · 10 tasks</div>
              </div>
              <Link href="/iam-her/esther"><Button variant="outline">Open Portal</Button></Link>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white text-black">
          <CardHeader><CardTitle>Corporate Partners</CardTitle></CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left border-b"><th className="py-2">Company</th><th>Contact</th><th>Email / Phone</th><th>Status</th><th>Follow up</th></tr></thead>
              <tbody>{corporatePartners.map(([company, contact, email, status, followUp]) => <tr key={company} className="border-b"><td className="py-2">{company}</td><td>{contact}</td><td>{email}</td><td>{status}</td><td>{followUp}</td></tr>)}</tbody>
            </table>
          </CardContent>
        </Card>
        <Card className="bg-white text-black">
          <CardHeader><CardTitle>Guest List</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p className="text-gray-600">Pending applications first.</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-left border-b"><th className="py-2">Name</th><th>Email</th><th>Organisation</th><th>Applied</th><th>Status</th></tr></thead>
                <tbody>
                  {loading ? (
                    <tr><td className="py-3 text-gray-500" colSpan={5}>Loading live guest list…</td></tr>
                  ) : guestApplications.length === 0 ? (
                    <tr><td className="py-3 text-gray-500" colSpan={5}>No guest applications yet.</td></tr>
                  ) : guestApplications.map((g) => (
                    <tr key={g.id} className="border-b">
                      <td className="py-2">{g.first_name || g.firstName} {g.last_name || g.lastName}</td>
                      <td>{g.email}</td>
                      <td>{g.company || "—"}</td>
                      <td>{g.submitted_at || g.created_at ? new Date(g.submitted_at || g.created_at).toLocaleDateString("en-GB") : "—"}</td>
                      <td>{g.final_status || g.status || "pending"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white text-black">
          <CardHeader><CardTitle>What this event stands for</CardTitle></CardHeader>
          <CardContent className="grid gap-3 text-sm">
            {experiencePoints.map(point => (
              <div key={point} className="rounded-lg border border-gray-200 p-3">
                {point}
              </div>
            ))}
          </CardContent>
        </Card>
        <Card className="bg-white text-black">
          <CardHeader><CardTitle>Tasks</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-center justify-between text-sm mb-2"><span>Completion</span><span>{completed}/{tasks}</span></div>
            <Progress value={completionPercent} className="h-2 mb-4" />
            <div className="text-sm text-gray-600">{summary?.next_milestone || "Master task list is ready for the team."}</div>
          </CardContent>
        </Card>
        <Card className="bg-white text-black">
          <CardHeader><CardTitle>Documents</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {["Event brief","Co-creator packs","Corporate sponsorship pack","Guest list","Programme","Brand assets","Photography","Contracts and agreements"].map(item => <div key={item}>{item}</div>)}
          </CardContent>
        </Card>
        <Card className="bg-white text-black">
          <CardHeader><CardTitle>Chat with us</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p className="text-gray-600">Got a question about I Am Her? Drop us a message and we will get back to you within 24 hours.</p>
            <form onSubmit={async (e) => {
              e.preventDefault();
              setContactNotice(null);
              setIsSubmittingContact(true);
              const form = e.target as HTMLFormElement;
              const fd = new FormData(form);
              const payload = { name: fd.get("name"), email: fd.get("email"), message: fd.get("message"), website: fd.get("website"), event: "iam-her" };
              try {
                const response = await fetch("/api/event-august/contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
                if (!response.ok) {
                  const body = await response.json().catch(() => null);
                  throw new Error(body?.message || "Could not send your message. Please try again.");
                }
                form.reset();
                setContactNotice({ type: "success", message: "Message sent. We will be in touch soon." });
              } catch (error: any) {
                setContactNotice({ type: "error", message: error?.message || "Could not send your message. Please try again." });
              } finally {
                setIsSubmittingContact(false);
              }
            }} className="space-y-3">
              <input name="name" placeholder="Your name" required className="w-full px-3 py-2 border rounded text-sm" />
              <input name="email" type="email" placeholder="Your email" required className="w-full px-3 py-2 border rounded text-sm" />
              <textarea name="message" placeholder="Your question or message" required rows={3} className="w-full px-3 py-2 border rounded text-sm" />
              {/* Honeypot — hidden field, bots fill it, humans don't */}
              <div style={{ position: "absolute", left: "-9999px", opacity: 0, height: 0, overflow: "hidden" }} aria-hidden="true">
                <input type="text" name="website" tabIndex={-1} autoComplete="off" />
              </div>
              {contactNotice && (
                <div className={`text-xs ${contactNotice.type === "success" ? "text-green-700" : "text-red-700"}`}>
                  {contactNotice.message}
                </div>
              )}
              <Button type="submit" disabled={isSubmittingContact} className="bg-[#330311] text-white text-sm">
                {isSubmittingContact ? "Sending..." : "Send message"}
              </Button>
            </form>
          </CardContent>
        </Card>
        <div className="text-xs text-white/60 flex items-center gap-2"><Star className="h-4 w-4 text-[#E2C87A]" /> Public event page — eventperfekt.net/iamher</div>
      </div>
    </div>
  );
}