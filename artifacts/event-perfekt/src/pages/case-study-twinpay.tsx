import { Link } from "wouter";
import { usePageMeta } from "@/hooks/use-page-meta";
import logoPath from "@assets/3d_Logo_1772145137902.jpg";

export default function CaseStudyTwinpaay() {
  usePageMeta({
    title: "Cross-Border Payments Pilot (Twinpaay) Case Study | Event Perfekt Global Ltd",
    description: "Compliance-driven financial coordination across multiple markets.",
    canonical: "https://eventperfekt.net/case-studies/twinpay",
  });

  return (
    <div className="min-h-screen bg-white">
      {/* NAV */}
      <nav className="bg-black text-white py-4 px-6 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <Link href="/projects-and-programmes">
            <a className="text-sm font-light hover:text-gray-300 transition">Back to Programmes</a>
          </Link>
        </div>
      </nav>

      {/* HERO */}
      <section className="relative w-full bg-black overflow-hidden py-24">
        <div className="relative z-10 max-w-7xl mx-auto px-6">
          <h1 className="text-5xl font-light text-white mb-4">Cross-Border Payments Pilot</h1>
          <p className="text-xl text-white text-opacity-80 font-light max-w-2xl">Twinpaay – Compliance-Driven Financial Coordination</p>
        </div>
      </section>

      {/* OVERVIEW */}
      <section className="py-24 px-6 bg-white">
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-12 items-start">
          <div>
            <h2 className="text-3xl font-light text-black mb-6">Project Overview</h2>
            <p className="text-black text-opacity-80 font-light leading-relaxed mb-4">
              The Cross-Border Payments Pilot demonstrated compliance-driven financial coordination infrastructure across multiple international markets.
            </p>
            <p className="text-black text-opacity-80 font-light leading-relaxed">
              Event Perfekt provided comprehensive programme management, regulatory framework development, and operational oversight to deliver a successful multi-market payment coordination system.
            </p>
          </div>
          <div className="bg-[#330311] p-8">
            <h3 className="text-lg font-light text-white mb-6">Key Outcomes</h3>
            <p className="text-white text-opacity-80 font-light leading-relaxed">
              Compliance framework across three plus markets, audit-ready financial systems, cross-border payment infrastructure, regulatory alignment protocols, real-time transaction monitoring, and multi-currency support validated.
            </p>
          </div>
        </div>
      </section>

      {/* CHALLENGES & SOLUTIONS */}
      <section className="py-24 px-6 bg-[#330311]">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-light text-white mb-12 text-center">Challenges & Solutions</h2>
          <div className="grid md:grid-cols-2 gap-12">
            <div>
              <h3 className="text-lg font-light text-white mb-4">Challenge</h3>
              <p className="text-white text-opacity-80 font-light leading-relaxed">
                Creating a compliant cross-border payments system required navigating multiple regulatory frameworks, ensuring audit-readiness, and coordinating across diverse financial ecosystems.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-light text-white mb-4">Solution</h3>
              <p className="text-white text-opacity-80 font-light leading-relaxed">
                We developed a comprehensive compliance-first infrastructure with built-in audit capabilities, real-time monitoring, and regulatory alignment across all participating markets.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6 bg-white">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-3xl font-light text-black mb-6">Explore Payment Solutions</h2>
          <p className="text-black text-opacity-70 font-light max-w-2xl mx-auto mb-8">
            Discover how Event Perfekt delivers compliance-driven financial coordination and cross-border payment infrastructure.
          </p>
          <a href="https://twinpaay.com/twinpaay" target="_blank" rel="noopener noreferrer" className="inline-block bg-white text-black hover:bg-gray-200 transition text-sm font-light px-8 py-4 no-underline">
            Explore Twinpaay
          </a>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-black text-white py-12 px-6">
        <div className="max-w-7xl mx-auto border-t border-white border-opacity-10 pt-8 text-center text-xs text-white text-opacity-60 font-light">
          <p>&copy; 2026 Event Perfekt Global Ltd. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
