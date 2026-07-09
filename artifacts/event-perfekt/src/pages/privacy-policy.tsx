import { Link } from "wouter";
import { usePageMeta } from "@/hooks/use-page-meta";
import { Shield, ArrowLeft, Mail, MapPin, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import logoPath from "@assets/3d_Logo_1772145137902.jpg";

export default function PrivacyPolicy() {
  usePageMeta({ title: "Privacy Policy — Event Perfekt", description: "Event Perfekt's privacy policy. How we handle your data under UK GDPR, DPA 2018, and Nigeria's NDPR.", canonical: "https://eventperfekt.net/privacy-policy" });

  return (
    <div className="min-h-screen bg-white">
      <header className="bg-[#330311] text-white py-6 px-6">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img src={logoPath} alt="Event Perfekt" className="w-10 h-10 rounded-lg object-cover" />
            <div>
              <h1 className="text-xl font-bold">Privacy Policy</h1>
              <p className="text-white/60 text-sm">Event Perfekt — Data Protection & Privacy</p>
            </div>
          </div>
          <Link href="/"><Button variant="ghost" className="text-white/60 hover:text-white"><ArrowLeft className="w-4 h-4 mr-2" /> Back to Site</Button></Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10">
        <div className="prose prose-slate max-w-none text-sm leading-relaxed">
          <p className="text-gray-500 text-xs mb-6">Last updated: 1 March 2026 | Effective: 1 March 2026</p>

          <section className="mb-8">
            <h2 className="text-lg font-bold text-[#330311] mb-3 flex items-center gap-2"><Shield className="w-5 h-5" /> 1. Who We Are</h2>
            <p className="text-gray-700">This Privacy Policy applies to services provided by:</p>
            <div className="grid md:grid-cols-2 gap-4 mt-3">
              <div className="p-4 bg-gray-50 rounded-lg border">
                <p className="font-semibold text-[#330311]">Event Perfekt Management Services Limited</p>
                <p className="text-gray-600 text-xs flex items-center gap-1 mt-1"><MapPin className="w-3 h-3" /> 25 Kusenla Street, Lagos, Nigeria</p>
                <p className="text-gray-600 text-xs">Data Controller under NDPR</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg border">
                <p className="font-semibold text-[#330311]">Event Perfekt Global Ltd</p>
                <p className="text-gray-600 text-xs flex items-center gap-1 mt-1"><MapPin className="w-3 h-3" /> 20 Wenlock Road, London, N1 7PG, UK</p>
                <p className="text-gray-600 text-xs">Data Controller under UK GDPR & DPA 2018</p>
              </div>
            </div>
            <p className="text-gray-600 text-xs mt-2 flex items-center gap-1"><Mail className="w-3 h-3" /> Data Protection Officer: <a href="mailto:privacy@eventperfekt.com" className="text-[#8B1538]">privacy@eventperfekt.com</a></p>
          </section>

          <section className="mb-8">
            <h2 className="text-lg font-bold text-[#330311] mb-3">2. Data We Collect</h2>
            <p className="text-gray-700 mb-2">We collect and process the following categories of personal data:</p>
            <table className="w-full text-xs border-collapse border border-gray-200">
              <thead><tr className="bg-[#330311] text-white"><th className="p-2 text-left">Category</th><th className="p-2 text-left">Examples</th><th className="p-2 text-left">Legal Basis</th></tr></thead>
              <tbody>
                <tr className="border-b"><td className="p-2 font-medium">Identity Data</td><td className="p-2 text-gray-600">Full name, job title, company name</td><td className="p-2 text-gray-600">Contract performance</td></tr>
                <tr className="border-b bg-gray-50"><td className="p-2 font-medium">Contact Data</td><td className="p-2 text-gray-600">Email, phone, postal address</td><td className="p-2 text-gray-600">Contract / Legitimate interest</td></tr>
                <tr className="border-b"><td className="p-2 font-medium">Account Data</td><td className="p-2 text-gray-600">Username, encrypted password, role</td><td className="p-2 text-gray-600">Contract performance</td></tr>
                <tr className="border-b bg-gray-50"><td className="p-2 font-medium">Event Data</td><td className="p-2 text-gray-600">Guest lists, dietary requirements, RSVP status</td><td className="p-2 text-gray-600">Contract / Consent</td></tr>
                <tr className="border-b"><td className="p-2 font-medium">Financial Data</td><td className="p-2 text-gray-600">Invoice details, payment records (not card data)</td><td className="p-2 text-gray-600">Contract / Legal obligation</td></tr>
                <tr className="border-b bg-gray-50"><td className="p-2 font-medium">Technical Data</td><td className="p-2 text-gray-600">IP address, browser type, device info</td><td className="p-2 text-gray-600">Legitimate interest</td></tr>
                <tr className="border-b"><td className="p-2 font-medium">Usage Data</td><td className="p-2 text-gray-600">Pages visited, features used, timestamps</td><td className="p-2 text-gray-600">Legitimate interest</td></tr>
                <tr className="bg-gray-50"><td className="p-2 font-medium">Employee Data</td><td className="p-2 text-gray-600">Emergency contacts, bank details, ID documents</td><td className="p-2 text-gray-600">Contract / Legal obligation</td></tr>
              </tbody>
            </table>
          </section>

          <section className="mb-8">
            <h2 className="text-lg font-bold text-[#330311] mb-3">3. How We Use Your Data</h2>
            <p className="text-gray-700 leading-relaxed">To provide and manage our event planning services. To process payments and manage invoicing. To communicate with you about your events and account. To manage guest lists, RSVPs, and dietary requirements. To generate reports, proposals, and contracts. To send service-related emails such as invoices, confirmations, and reminders. To improve our platform and user experience. To comply with legal and regulatory obligations. To maintain security and prevent fraud.</p>
            <p className="text-gray-600 mt-3">We do <strong>not</strong> sell your personal data. We do <strong>not</strong> use your data for automated decision-making or profiling.</p>
          </section>

          <section className="mb-8">
            <h2 className="text-lg font-bold text-[#330311] mb-3">4. Data Sharing</h2>
            <p className="text-gray-700 mb-2">We share personal data only with:</p>
            <p className="text-gray-700 leading-relaxed"><strong>Vendors and suppliers</strong> — only what is necessary for event delivery such as guest count and dietary requirements. <strong>Payment processors</strong> — Flutterwave processes payments; we do not store card numbers. <strong>Email service providers</strong> — SendGrid for transactional emails. <strong>Cloud infrastructure</strong> — data stored on secure, encrypted servers. <strong>Legal authorities</strong> — when required by law or court order.</p>
            <p className="text-gray-600 mt-2">All third-party processors are bound by data processing agreements and are GDPR-compliant or provide adequate safeguards.</p>
          </section>

          <section className="mb-8">
            <h2 className="text-lg font-bold text-[#330311] mb-3">5. International Data Transfers</h2>
            <p className="text-gray-700">Data may be transferred between our Nigeria and UK entities. For transfers outside the UK/EEA, we rely on Standard Contractual Clauses (SCCs) or adequacy decisions as appropriate. Nigeria's NDPR provides the framework for data processed within Nigeria.</p>
          </section>

          <section className="mb-8">
            <h2 className="text-lg font-bold text-[#330311] mb-3">6. Data Retention</h2>
            <p className="text-gray-700 leading-relaxed"><strong>Active accounts:</strong> Data retained for the duration of your account. <strong>Event data:</strong> Retained for 2 years after event completion for reference and disputes. <strong>Financial records:</strong> Retained for 7 years as required by UK and Nigerian tax law. <strong>Employee records:</strong> Retained for 6 years after employment ends. <strong>Audit logs:</strong> Retained for 3 years for security purposes. <strong>Deleted accounts:</strong> Personal data anonymised within 30 days of deletion request.</p>
          </section>

          <section className="mb-8">
            <h2 className="text-lg font-bold text-[#330311] mb-3">7. Your Rights</h2>
            <p className="text-gray-700 mb-2">Under GDPR, UK DPA 2018, and NDPR, you have the right to:</p>
            <div className="grid md:grid-cols-2 gap-2">
              {[
                { right: "Access", desc: "Request a copy of all personal data we hold about you" },
                { right: "Rectification", desc: "Correct any inaccurate or incomplete personal data" },
                { right: "Erasure", desc: "Request deletion of your personal data ('right to be forgotten')" },
                { right: "Restrict Processing", desc: "Limit how we use your data in certain circumstances" },
                { right: "Data Portability", desc: "Receive your data in a machine-readable format (JSON/CSV)" },
                { right: "Object", desc: "Object to processing based on legitimate interests" },
                { right: "Withdraw Consent", desc: "Withdraw consent at any time where consent is the legal basis" },
                { right: "Lodge a Complaint", desc: "Complain to the ICO (UK) or NITDA (Nigeria)" },
              ].map(r => (
                <div key={r.right} className="p-3 bg-gray-50 rounded border text-xs">
                  <p className="font-semibold text-[#330311]">{r.right}</p>
                  <p className="text-gray-600">{r.desc}</p>
                </div>
              ))}
            </div>
            <p className="text-gray-600 mt-3">To exercise these rights, email <a href="mailto:privacy@eventperfekt.com" className="text-[#8B1538]">privacy@eventperfekt.com</a> or use the data export/deletion tools in your account settings. We will respond within 30 days.</p>
          </section>

          <section className="mb-8">
            <h2 className="text-lg font-bold text-[#330311] mb-3">8. Security Measures</h2>
            <p className="text-gray-700 leading-relaxed">All data encrypted in transit using TLS 1.2 plus and at rest. Passwords hashed using bcrypt with 12 salt rounds. JWT tokens with expiry for session management. Rate limiting on authentication endpoints. Security headers including HSTS, CSP, X-Frame-Options, and X-Content-Type-Options. Role-based access control with the principle of least privilege. Comprehensive audit trail for all system activities. Regular security reviews and vulnerability assessments.</p>
          </section>

          <section className="mb-8">
            <h2 className="text-lg font-bold text-[#330311] mb-3">9. Cookies</h2>
            <p className="text-gray-700 mb-2">We use the following types of cookies:</p>
            <table className="w-full text-xs border-collapse border border-gray-200">
              <thead><tr className="bg-[#330311] text-white"><th className="p-2 text-left">Type</th><th className="p-2 text-left">Purpose</th><th className="p-2 text-left">Duration</th></tr></thead>
              <tbody>
                <tr className="border-b"><td className="p-2 font-medium">Essential</td><td className="p-2 text-gray-600">Authentication, CSRF protection, session management</td><td className="p-2 text-gray-600">Session / 7 days</td></tr>
                <tr className="border-b bg-gray-50"><td className="p-2 font-medium">Functional</td><td className="p-2 text-gray-600">Theme, sidebar, layout preferences</td><td className="p-2 text-gray-600">1 year</td></tr>
                <tr><td className="p-2 font-medium">Analytics</td><td className="p-2 text-gray-600">Usage patterns (anonymised)</td><td className="p-2 text-gray-600">90 days</td></tr>
              </tbody>
            </table>
            <p className="text-gray-600 mt-2">You can manage cookie preferences through the cookie banner shown on first visit.</p>
          </section>

          <section className="mb-8">
            <h2 className="text-lg font-bold text-[#330311] mb-3">10. Children's Privacy</h2>
            <p className="text-gray-700">Our platform is not directed at children under 16. We do not knowingly collect personal data from children. If you believe a child has provided data to us, contact us immediately.</p>
          </section>

          <section className="mb-8">
            <h2 className="text-lg font-bold text-[#330311] mb-3">11. Changes to This Policy</h2>
            <p className="text-gray-700">We may update this Privacy Policy. Material changes will be communicated via email or platform notification. Continued use after changes constitutes acceptance of the updated policy.</p>
          </section>

          <section className="mb-8">
            <h2 className="text-lg font-bold text-[#330311] mb-3">12. Contact & Complaints</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg border">
                <p className="font-semibold text-[#330311]">Data Protection Officer</p>
                <p className="text-gray-600 text-xs flex items-center gap-1 mt-1"><Mail className="w-3 h-3" /> privacy@eventperfekt.com</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg border">
                <p className="font-semibold text-[#330311]">Supervisory Authorities</p>
                <p className="text-gray-600 text-xs mt-1">UK: Information Commissioner's Office (ICO) — ico.org.uk</p>
                <p className="text-gray-600 text-xs">Nigeria: NITDA — nitda.gov.ng</p>
              </div>
            </div>
          </section>
        </div>
      </main>

      <footer className="bg-[#330311] text-white/60 text-center py-4 text-xs">
        Event Perfekt Management Services Limited / Event Perfekt Global Ltd — ...making yours perfekt
      </footer>
    </div>
  );
}
