import { usePageMeta } from "@/hooks/use-page-meta";
import { useQuery } from "@tanstack/react-query";

export default function ProjectTwinTrade() {
  usePageMeta({
    title: "Twin Trade Global | Event Perfekt Global Ltd",
    description: "Cross-border partnership ecosystem for strategic trade.",
    canonical: "https://eventperfekt.net/projects/twintrade",
  });

  const { data: projectImages } = useQuery({
    queryKey: ['/api/projects/twintrade/images'],
    queryFn: async () => {
      const res = await fetch('/api/projects/twintrade/images');
      return res.json();
    }
  });

  const heroImage = projectImages?.imageUrl || '/images/twintrade-hero.jpg';

  return (
    <div className="min-h-screen bg-white">
      <nav className="fixed top-0 w-full bg-white z-50 border-b border-black border-opacity-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <span className="font-bold text-xl text-black">Event Perfekt</span>
          <a href="/projects-and-programmes" className="text-sm text-black hover:text-[#4A0E1F] font-light">← Back to Programmes</a>
        </div>
      </nav>

      {/* HERO */}
      <section className="relative w-full bg-black overflow-hidden pt-20" style={{ minHeight: '50vh' }}>
        {projectImages?.videoUrl ? (
          <video src={projectImages.videoUrl} autoPlay muted loop className="absolute inset-0 w-full h-full object-cover opacity-30" />
        ) : (
          <img src={heroImage} alt="Twin Trade" className="absolute inset-0 w-full h-full object-cover opacity-30" />
        )}
        <div className="relative z-10 flex flex-col justify-center h-full">
          <div className="max-w-7xl mx-auto px-6 w-full">
            <h1 className="text-5xl font-light text-white mb-4">Twin Trade Global</h1>
            <p className="text-xl text-white text-opacity-80 font-light">Cross-border partnership ecosystem</p>
          </div>
        </div>
      </section>

      {/* OVERVIEW */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-4xl font-light text-black mb-6">Network Overview</h2>
            <p className="text-black text-opacity-80 font-light leading-relaxed mb-6">
              Twin Trade Global is a cross-border partnership ecosystem with governance oversight enabling strategic trade partnerships across multiple markets with full compliance alignment.
            </p>
            <p className="text-black text-opacity-80 font-light leading-relaxed">
              We provide partnership framework management, cross-border coordination, governance oversight, and ecosystem management across the UK, Africa, and Europe.
            </p>
          </div>
          <img src="/images/twintrade-card.png" alt="Twin Trade" className="w-full h-80 object-cover" />
        </div>
      </section>

      {/* APPROACH */}
      <section className="py-20 px-6 bg-[#330311]">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-3xl font-light text-white mb-4">Network Capabilities</h2>
          <p className="text-white text-opacity-80 font-light mb-12 max-w-2xl mx-auto">
            Partnership framework, cross-border coordination, and ecosystem management.
          </p>
        </div>
      </section>

      {/* 3-COLUMN GRID */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-3 gap-12">
            <div>
              <h3 className="text-xl font-light text-black mb-4">Partnership Framework</h3>
              <p className="text-black text-opacity-70 font-light text-sm">Structured partnership models with clear governance and compliance alignment</p>
            </div>
            <div>
              <h3 className="text-xl font-light text-black mb-4">Cross-Border Coordination</h3>
              <p className="text-black text-opacity-70 font-light text-sm">Multi-market coordination and strategic partnership management</p>
            </div>
            <div>
              <h3 className="text-xl font-light text-black mb-4">Ecosystem Management</h3>
              <p className="text-black text-opacity-70 font-light text-sm">Network ecosystem oversight and relationship management</p>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          <img src="/images/compliance-pmo.png" alt="Compliance" className="w-full h-80 object-cover order-2 md:order-1" />
          <div className="order-1 md:order-2">
            <h2 className="text-3xl font-light text-black mb-6">Key Features</h2>
            <p className="text-black text-opacity-80 font-light text-sm leading-relaxed">
              Strategic partnership framework, cross-border trade coordination, governance and compliance oversight, network ecosystem management, partner vetting and onboarding, relationship management, performance monitoring, and dispute resolution.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 bg-[#4A0E1F] text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-light mb-6">Ready to Join Our Network?</h2>
          <p className="text-white text-opacity-80 font-light mb-8">Contact our team to explore partnership opportunities and network membership.</p>
          <div className="flex gap-4 justify-center">
            <a href="https://www.thetwintrade.co.uk/" target="_blank" rel="noopener noreferrer" className="inline-block bg-white text-[#4A0E1F] hover:bg-black hover:text-white transition text-sm font-light px-8 py-3 no-underline">
              Explore Network
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
