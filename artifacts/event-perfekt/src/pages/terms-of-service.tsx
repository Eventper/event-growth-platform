import { Link } from "wouter";
import { usePageMeta } from "@/hooks/use-page-meta";
import { FileText, ArrowLeft, Mail, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import logoPath from "@assets/3d_Logo_1772145137902.jpg";

export default function TermsOfService() {
  usePageMeta({ title: "Terms of Service — Event Perfekt", description: "Event Perfekt's terms and conditions for event planning and management services.", canonical: "https://eventperfekt.net/terms-of-service" });

  return (
    <div className="min-h-screen bg-white">
      <header className="bg-[#330311] text-white py-6 px-6">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img src={logoPath} alt="Event Perfekt" className="w-10 h-10 rounded-lg object-cover" />
            <div>
              <h1 className="text-xl font-bold">Terms of Service</h1>
              <p className="text-white/60 text-sm">Event Perfekt — Terms & Conditions</p>
            </div>
          </div>
          <Link href="/"><Button variant="ghost" className="text-white/60 hover:text-white"><ArrowLeft className="w-4 h-4 mr-2" /> Back to Site</Button></Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10">
        <div className="prose prose-slate max-w-none text-sm leading-relaxed">
          <p className="text-gray-500 text-xs mb-6">Last updated: 1 March 2026 | Effective: 1 March 2026</p>

          <section className="mb-8">
            <h2 className="text-lg font-bold text-[#330311] mb-3 flex items-center gap-2"><FileText className="w-5 h-5" /> 1. Introduction</h2>
            <p className="text-gray-700">These Terms of Service ("Terms") govern your access to and use of the Event Perfekt platform ("Platform"), provided by Event Perfekt Management Services Limited (Nigeria) and Event Perfekt Global Ltd (UK), collectively referred to as "Event Perfekt", "we", "us", or "our".</p>
            <p className="text-gray-700 mt-2">By accessing or using the Platform, you agree to be bound by these Terms. If you do not agree, you must not use the Platform.</p>
          </section>

          <section className="mb-8">
            <h2 className="text-lg font-bold text-[#330311] mb-3">2. Services</h2>
            <p className="text-gray-700">Event Perfekt provides a comprehensive event planning and management platform including but not limited to:</p>
            <p className="text-gray-700 mt-2 leading-relaxed">Event creation, planning, and management tools. Guest management, RSVP tracking, and digital invitations. Vendor management and coordination. Budget management, invoicing, and payment processing. Contract generation and digital signing. Decor inventory and rental management. Communication tools including email, SMS, and chat. Reporting, analytics, and document management. Client and vendor portals.</p>
          </section>

          <section className="mb-8">
            <h2 className="text-lg font-bold text-[#330311] mb-3">3. User Accounts</h2>
            <p className="text-gray-700 leading-relaxed">You must provide accurate, complete, and current information when creating an account. You are responsible for maintaining the confidentiality of your login credentials. You must immediately notify us of any unauthorised use of your account. We reserve the right to suspend or terminate accounts that violate these Terms. One person or entity may not maintain multiple accounts without prior written consent.</p>
          </section>

          <section className="mb-8">
            <h2 className="text-lg font-bold text-[#330311] mb-3">4. User Roles & Access</h2>
            <p className="text-gray-700 mb-2">The Platform operates with role-based access control:</p>
            <p className="text-gray-700 leading-relaxed"><strong>Admin:</strong> Full system access and management capabilities. <strong>Planner:</strong> Access to assigned events and planning tools. <strong>Staff/Collaborator:</strong> Limited access to assigned events only. <strong>Client:</strong> Access to client-facing dashboard and event information. <strong>Vendor:</strong> Access to vendor portal and assigned event details.</p>
            <p className="text-gray-600 mt-2">Users must only access features and data appropriate to their assigned role.</p>
          </section>

          <section className="mb-8">
            <h2 className="text-lg font-bold text-[#330311] mb-3">5. Acceptable Use</h2>
            <p className="text-gray-700 mb-2">You agree not to:</p>
            <p className="text-gray-700 leading-relaxed">Use the Platform for any unlawful purpose. Upload malicious code, viruses, or harmful content. Attempt to gain unauthorised access to any part of the Platform. Reverse engineer, decompile, or disassemble any part of the Platform. Use automated tools such as bots or scrapers to access the Platform without consent. Interfere with the Platform's operation or other users' access. Share login credentials with unauthorised parties. Upload or share content that infringes intellectual property rights. Misuse personal data of guests, clients, or vendors.</p>
          </section>

          <section className="mb-8">
            <h2 className="text-lg font-bold text-[#330311] mb-3">6. Intellectual Property</h2>
            <p className="text-gray-700 leading-relaxed">The Platform, its design, features, and content are owned by Event Perfekt and protected by copyright, trademark, and other intellectual property laws. You retain ownership of content you upload such as documents, images, and event data. By uploading, you grant us a limited licence to process and display this content to provide our services. You may not copy, modify, distribute, or create derivative works from the Platform without our express written permission.</p>
          </section>

          <section className="mb-8">
            <h2 className="text-lg font-bold text-[#330311] mb-3">7. Payments & Financial Terms</h2>
            <p className="text-gray-700 leading-relaxed">Payment processing is handled by third-party providers such as Flutterwave. We do not store credit or debit card details. Invoices are payable within the terms stated on each invoice. We reserve the right to charge interest on overdue payments. Prices and fees may be updated with reasonable notice. All fees are exclusive of applicable taxes unless stated otherwise.</p>
          </section>

          <section className="mb-8">
            <h2 className="text-lg font-bold text-[#330311] mb-3">8. Data Protection</h2>
            <p className="text-gray-700">We process personal data in accordance with our <Link href="/privacy-policy" className="text-[#8B1538] hover:underline">Privacy Policy</Link>, the UK GDPR, Data Protection Act 2018, and Nigeria's NDPR. By using the Platform, you acknowledge that you have read and understood our Privacy Policy.</p>
          </section>

          <section className="mb-8">
            <h2 className="text-lg font-bold text-[#330311] mb-3">9. Confidentiality</h2>
            <p className="text-gray-700">Both parties agree to keep confidential all non-public information exchanged through the Platform. This obligation survives termination of these Terms for a period of 2 years.</p>
          </section>

          <section className="mb-8">
            <h2 className="text-lg font-bold text-[#330311] mb-3">10. Limitation of Liability</h2>
            <p className="text-gray-700 leading-relaxed">The Platform is provided "as is" without warranties of any kind, express or implied. We do not guarantee uninterrupted, error-free, or secure access to the Platform. To the maximum extent permitted by law, our total liability shall not exceed the fees paid by you in the 12 months preceding the claim. We are not liable for indirect, incidental, special, or consequential damages. We are not liable for any loss or damage resulting from vendor performance, event outcomes, or third-party services.</p>
          </section>

          <section className="mb-8">
            <h2 className="text-lg font-bold text-[#330311] mb-3">11. Termination</h2>
            <p className="text-gray-700 leading-relaxed">You may terminate your account at any time by contacting us or using the account deletion feature. We may suspend or terminate your account for violation of these Terms with immediate effect. Upon termination, you may request export of your data within 30 days, after which it will be deleted in accordance with our retention policy.</p>
          </section>

          <section className="mb-8">
            <h2 className="text-lg font-bold text-[#330311] mb-3">12. Governing Law & Disputes</h2>
            <div className="grid md:grid-cols-2 gap-4 mt-3">
              <div className="p-4 bg-gray-50 rounded-lg border">
                <p className="font-semibold text-[#330311]">Nigeria Operations</p>
                <p className="text-gray-600 text-xs mt-1">Governed by the laws of the Federal Republic of Nigeria. Disputes subject to the jurisdiction of Lagos State courts.</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg border">
                <p className="font-semibold text-[#330311]">UK Operations</p>
                <p className="text-gray-600 text-xs mt-1">Governed by the laws of England and Wales. Disputes subject to the jurisdiction of the courts of England and Wales.</p>
              </div>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-lg font-bold text-[#330311] mb-3">13. Contact Us</h2>
            <div className="p-4 bg-gray-50 rounded-lg border">
              <p className="text-gray-600 text-xs flex items-center gap-1"><Mail className="w-3 h-3" /> <a href="mailto:legal@eventperfekt.com" className="text-[#8B1538]">legal@eventperfekt.com</a></p>
              <p className="text-gray-600 text-xs flex items-center gap-1 mt-1"><MapPin className="w-3 h-3" /> 25 Kusenla Street, Lagos, Nigeria | 20 Wenlock Road, London, N1 7PG</p>
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
