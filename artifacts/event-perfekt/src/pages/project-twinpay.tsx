import { usePageMeta } from "@/hooks/use-page-meta";
import { useQuery } from "@tanstack/react-query";
import { Home } from "lucide-react";

export default function ProjectTwinPay() {
  usePageMeta({
    title: "Twinpaay Platform | Event Perfekt Global Ltd",
    description: "Compliance-driven cross-border payments platform.",
    canonical: "https://eventperfekt.net/projects/twinpay",
  });

  const { data: projectImages } = useQuery({
    queryKey: ['/api/projects/twinpay/images'],
    queryFn: async () => {
      const res = await fetch('/api/projects/twinpay/images');
      return res.json();
    }
  });

  const heroImage = projectImages?.imageUrl || '/images/twinpay-hero.jpg';

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
          <img src={heroImage} alt="TwinPaay" className="absolute inset-0 w-full h-full object-cover opacity-30" />
        )}
        <div className="relative z-10 flex flex-col justify-center h-full">
          <div className="max-w-7xl mx-auto px-6 w-full">
            <h1 className="text-5xl font-light text-white mb-4">Twinpaay Platform</h1>
            <p className="text-xl text-white text-opacity-80 font-light">Compliance-driven cross-border payments</p>
          </div>
        </div>
      </section>

      {/* OVERVIEW */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-4xl font-light text-black mb-6">Platform Overview</h2>
            <p className="text-black text-opacity-80 font-light leading-relaxed mb-6">
              Twinpaay is a compliance-driven cross-border payments platform designed to enable secure, auditable international financial transactions with enterprise-grade security and transparency.
            </p>
            <p className="text-black text-opacity-80 font-light leading-relaxed">
              Our platform combines payment processing infrastructure, compliance architecture, real-time tracking, and multi-currency support for global financial operations.
            </p>
          </div>
          <img src="/images/twinpay-card.png" alt="TwinPaay" className="w-full h-80 object-cover" />
        </div>
      </section>

      {/* APPROACH */}
      <section className="py-20 px-6 bg-[#330311]">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-3xl font-light text-white mb-4">Platform Features</h2>
          <p className="text-white text-opacity-80 font-light mb-12 max-w-2xl mx-auto">
            Enterprise-grade security, compliance capabilities, and real-time transaction tracking.
          </p>
        </div>
      </section>

      {/* 3-COLUMN GRID */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-3 gap-12">
            <div>
              <h3 className="text-xl font-light text-black mb-4">Secure Processing</h3>
              <p className="text-black text-opacity-70 font-light text-sm">Enterprise-grade encryption and security protocols for all transactions</p>
            </div>
            <div>
              <h3 className="text-xl font-light text-black mb-4">Compliance First</h3>
              <p className="text-black text-opacity-70 font-light text-sm">Built-in compliance and audit capabilities for regulatory alignment</p>
            </div>
            <div>
              <h3 className="text-xl font-light text-black mb-4">Real-Time Tracking</h3>
              <p className="text-black text-opacity-70 font-light text-sm">Instant transaction monitoring and comprehensive reporting</p>
            </div>
          </div>
        </div>
      </section>

      {/* CAPABILITIES */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          <img src="/images/impact-results.png" alt="Results" className="w-full h-80 object-cover order-2 md:order-1" />
          <div className="order-1 md:order-2">
            <h2 className="text-3xl font-light text-black mb-6">Key Capabilities</h2>
            <p className="text-black text-opacity-80 font-light text-sm leading-relaxed">
              Cross-border payment processing, compliance and audit architecture, real-time transaction tracking, multi-currency support, API integration, settlement automation, financial dashboards, and risk management tools.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 bg-[#4A0E1F] text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-light mb-6">Ready to Upgrade Your Payment Infrastructure?</h2>
          <p className="text-white text-opacity-80 font-light mb-8">Contact our team to schedule a platform demonstration and discuss your payment requirements.</p>
          <div className="flex gap-4 justify-center">
            <a href="https://twinpaay.com/twinpaay" target="_blank" rel="noopener noreferrer" className="inline-block bg-white text-[#4A0E1F] hover:bg-black hover:text-white transition text-sm font-light px-8 py-3 no-underline">
              Visit Twinpaay
            </a>
            <a href="https://www.eventperfekt.com/contact-us" className="inline-block border border-white text-white hover:bg-white hover:text-[#4A0E1F] transition text-sm font-light px-8 py-3 no-underline">
              Contact Us
            </a>
          </div>
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
