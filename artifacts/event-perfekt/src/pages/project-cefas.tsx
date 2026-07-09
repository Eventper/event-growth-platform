import { usePageMeta } from "@/hooks/use-page-meta";
import { useQuery } from "@tanstack/react-query";

export default function ProjectPublicSector() {
  usePageMeta({
    title: "UK Government Agency Project | Event Perfekt Global Ltd",
    description: "Africa Regional Support Programme for UK Government agencies.",
    canonical: "https://eventperfekt.net/projects/public-sector",
  });

  const { data: projectImages } = useQuery({
    queryKey: ['/api/projects/cefas/images'],
    queryFn: async () => {
      const res = await fetch('/api/projects/cefas/images');
      return res.json();
    }
  });

  const heroImage = projectImages?.imageUrl || '/images/public-sector-hero.jpg';

  return (
    <div className="min-h-screen bg-white">
      <nav className="fixed top-0 w-full bg-white z-50 border-b border-black border-opacity-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <span className="font-bold text-xl text-black">Event Perfekt</span>
          <div className="flex items-center gap-4">
            <a href="https://www.eventperfekt.com" target="_blank" rel="noopener noreferrer" className="text-sm text-black hover:text-[#4A0E1F] font-light">Home</a>
            <a href="/projects-and-programmes" className="text-sm text-black hover:text-[#4A0E1F] font-light">← Back to Programmes</a>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="relative w-full bg-black overflow-hidden pt-20" style={{ minHeight: '50vh' }}>
        {projectImages?.videoUrl ? (
          <video src={projectImages.videoUrl} autoPlay muted loop className="absolute inset-0 w-full h-full object-cover opacity-30" />
        ) : (
          <img src={heroImage} alt="UK Government Programme" className="absolute inset-0 w-full h-full object-cover opacity-30" />
        )}
        <div className="relative z-10 flex flex-col justify-center h-full">
          <div className="max-w-7xl mx-auto px-6 w-full">
            <h1 className="text-5xl font-light text-white mb-4">UK Government Agency</h1>
            <p className="text-xl text-white text-opacity-80 font-light">Africa Regional Support Programme</p>
          </div>
        </div>
      </section>

      {/* OVERVIEW */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-4xl font-light text-black mb-6">Programme Overview</h2>
            <p className="text-black text-opacity-80 font-light leading-relaxed mb-6">
              The UK Government Agency Africa Regional Support Programme delivers governance-aligned programme management for UK Government agencies across multiple African markets.
            </p>
            <p className="text-black text-opacity-80 font-light leading-relaxed">
              We provide PMO leadership, compliance oversight, regional operations coordination, and audit-ready reporting aligned with UK government standards.
            </p>
          </div>
          <img src="/images/public-sector-card.png" alt="UK Government Programme" className="w-full h-80 object-cover" />
        </div>
      </section>

      {/* APPROACH */}
      <section className="py-20 px-6 bg-[#330311]">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-3xl font-light text-white mb-4">Key Programme Areas</h2>
          <p className="text-white text-opacity-80 font-light mb-12 max-w-2xl mx-auto">
            Governance excellence, PMO leadership, and compliance management aligned with UK government requirements.
          </p>
        </div>
      </section>

      {/* 3-COLUMN GRID */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-3 gap-12">
            <div>
              <h3 className="text-xl font-light text-black mb-4">Governance Excellence</h3>
              <p className="text-black text-opacity-70 font-light text-sm">Audit-ready governance frameworks aligned with UK government standards</p>
            </div>
            <div>
              <h3 className="text-xl font-light text-black mb-4">PMO Leadership</h3>
              <p className="text-black text-opacity-70 font-light text-sm">Dedicated project management office leadership and operational support</p>
            </div>
            <div>
              <h3 className="text-xl font-light text-black mb-4">Compliance Management</h3>
              <p className="text-black text-opacity-70 font-light text-sm">Comprehensive compliance architecture and risk management oversight</p>
            </div>
          </div>
        </div>
      </section>

      {/* DELIVERABLES */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          <img src="/images/governance.png" alt="Governance" className="w-full h-80 object-cover order-2 md:order-1" />
          <div className="order-1 md:order-2">
            <h2 className="text-3xl font-light text-black mb-6">Deliverables</h2>
            <p className="text-black text-opacity-80 font-light text-sm leading-relaxed">
              Governance framework implementation, regional operations coordination, compliance and risk management, PMO leadership support, stakeholder management, audit trail systems, executive-level reporting, and capacity building programmes.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 bg-[#4A0E1F] text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-light mb-6">Ready to Learn More?</h2>
          <p className="text-white text-opacity-80 font-light mb-8">Contact our team to discuss your governance and programme management requirements.</p>
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
