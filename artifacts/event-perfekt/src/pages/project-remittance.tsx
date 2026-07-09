import { usePageMeta } from "@/hooks/use-page-meta";
import { useQuery } from "@tanstack/react-query";
import { Home } from "lucide-react";

export default function ProjectRemittance() {
  usePageMeta({
    title: "Remittance & Financial Coordination | Event Perfekt Global Ltd",
    description: "Cross-border payment solutions with full compliance oversight.",
    canonical: "https://eventperfekt.net/projects/remittance",
  });

  const { data: projectImages } = useQuery({
    queryKey: ['/api/projects/remittance/images'],
    queryFn: async () => {
      const res = await fetch('/api/projects/remittance/images');
      return res.json();
    }
  });

  const heroImage = projectImages?.imageUrl || '/images/remittance-hero.jpg';

  return (
    <div className="min-h-screen bg-white">
      <nav className="fixed top-0 w-full bg-white z-50 border-b border-black border-opacity-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <span className="font-bold text-xl text-black">Event Perfekt</span>
          <a href="https://www.eventperfekt.com/" className="inline-flex items-center gap-2 text-sm text-black hover:text-[#4A0E1F] font-light border border-black/10 px-4 py-2 rounded-full transition">
            <Home className="w-4 h-4" />
            Home Page
          </a>
        </div>
      </nav>

      {/* HERO */}
      <section className="relative w-full bg-black overflow-hidden pt-20" style={{ minHeight: '50vh' }}>
        {projectImages?.videoUrl ? (
          <video src={projectImages.videoUrl} autoPlay muted loop className="absolute inset-0 w-full h-full object-cover opacity-30" />
        ) : (
          <img src={heroImage} alt="Remittance" className="absolute inset-0 w-full h-full object-cover opacity-30" />
        )}
        <div className="relative z-10 flex flex-col justify-center h-full">
          <div className="max-w-7xl mx-auto px-6 w-full">
            <h1 className="text-5xl font-light text-white mb-4">Remittance & Financial Coordination</h1>
            <p className="text-xl text-white text-opacity-80 font-light">Cross-border payments & compliance</p>
          </div>
        </div>
      </section>

      {/* OVERVIEW */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-4xl font-light text-black mb-6">Programme Overview</h2>
            <p className="text-black text-opacity-80 font-light leading-relaxed mb-6">
              Our Remittance & Financial Coordination programme provides compliance-driven cross-border payments infrastructure enabling secure, auditable international financial transactions.
            </p>
            <p className="text-black text-opacity-80 font-light leading-relaxed">
              We manage cross-border payment processing, compliance architecture, real-time transaction tracking, and multi-currency support across global markets.
            </p>
          </div>
          <img src="/images/remittance-card.png" alt="Remittance" className="w-full h-80 object-cover" />
        </div>
      </section>

      {/* APPROACH */}
      <section className="py-20 px-6 bg-[#330311]">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-3xl font-light text-white mb-4">Key Capabilities</h2>
          <p className="text-white text-opacity-80 font-light mb-12 max-w-2xl mx-auto">
            Payment processing, compliance architecture, and transaction tracking for secure cross-border operations.
          </p>
        </div>
      </section>

      {/* 3-COLUMN GRID */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-3 gap-12">
            <div>
              <h3 className="text-xl font-light text-black mb-4">Payment Processing</h3>
              <p className="text-black text-opacity-70 font-light text-sm">Secure cross-border payment processing with full compliance oversight</p>
            </div>
            <div>
              <h3 className="text-xl font-light text-black mb-4">Compliance Architecture</h3>
              <p className="text-black text-opacity-70 font-light text-sm">Comprehensive audit capabilities and regulatory alignment</p>
            </div>
            <div>
              <h3 className="text-xl font-light text-black mb-4">Transaction Tracking</h3>
              <p className="text-black text-opacity-70 font-light text-sm">Real-time transaction monitoring and reporting systems</p>
            </div>
          </div>
        </div>
      </section>

      {/* DELIVERABLES */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          <img src="/images/regional-ops.png" alt="Operations" className="w-full h-80 object-cover order-2 md:order-1" />
          <div className="order-1 md:order-2">
            <h2 className="text-3xl font-light text-black mb-6">Deliverables</h2>
            <p className="text-black text-opacity-80 font-light text-sm leading-relaxed">
              Cross-border payment processing infrastructure, compliance and audit capabilities, real-time transaction tracking, multi-currency support, financial reporting systems, risk management protocols, settlement operations, and regulatory documentation.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 bg-[#4A0E1F] text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-light mb-6">Ready to Transform Financial Operations?</h2>
          <p className="text-white text-opacity-80 font-light mb-8">Contact our team to discuss cross-border payment solutions.</p>
          <a href="https://www.eventperfekt.com/contact-us" className="inline-block bg-white text-[#4A0E1F] hover:bg-black hover:text-white transition text-sm font-light px-8 py-3 no-underline">
            Contact Us
          </a>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-black text-white py-12 px-6">
        <div className="max-w-7xl mx-auto border-t border-white border-opacity-10 pt-8 text-center text-xs text-white text-opacity-60 font-light">
          <p>&copy; 2026 Event Perfekt Global Ltd. All rights reserved.</p>
          <p className="mt-4"><a href="/projects-and-programmes" className="hover:text-[#4A0E1F] transition">Back to Programmes</a></p>
        </div>
      </footer>
    </div>
  );
}
