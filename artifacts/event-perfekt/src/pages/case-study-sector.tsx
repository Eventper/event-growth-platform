import { useRoute, Link } from "wouter";
import { usePageMeta } from "@/hooks/use-page-meta";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import youthBoysImage from "@assets/WhatsApp_Image_2026-04-02_at_18.49.52_1775510039478.jpeg";

export default function CaseStudySector() {
  const [match, params] = useRoute("/case-studies/sector/:sector");

  if (!match) return null;

  const sectorId = params?.sector;

  usePageMeta({
    title: `${sectorId ? sectorId.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase()) : "Sector"} Case Studies | Event Perfekt Global`,
    description: "Explore Event Perfekt's sector-specific case studies across public sector, education, financial services, energy, and more.",
    canonical: `https://eventperfekt.net/case-studies/sector/${sectorId ?? ""}`,
  });

  // Fetch uploaded images for each case study
  const { data: cefasImages } = useQuery({
    queryKey: ['/api/projects/cefas-case/images'],
    queryFn: async () => { const res = await fetch('/api/projects/cefas-case/images'); return res.json(); }
  });

  const { data: oxfordImages } = useQuery({
    queryKey: ['/api/projects/oxford-case/images'],
    queryFn: async () => { const res = await fetch('/api/projects/oxford-case/images'); return res.json(); }
  });

  const { data: twinpayImages } = useQuery({
    queryKey: ['/api/projects/twinpay-case/images'],
    queryFn: async () => { const res = await fetch('/api/projects/twinpay-case/images'); return res.json(); }
  });

  const { data: energyImages } = useQuery({
    queryKey: ['/api/projects/energy-case/images'],
    queryFn: async () => { const res = await fetch('/api/projects/energy-case/images'); return res.json(); }
  });

  const caseStudyContent: Record<string, Array<{ id: string; title: string; summary: string; challenge: string; approach: string; result: string; image?: string }>> = {
    "public-sector": [
      {
        id: "public-sector",
        title: "UK Government Agency – Africa Regional Support Programme",
        summary: "A multi-country public sector delivery programme supporting regional operations and stakeholder engagement.",
        challenge: "The brief required consistent delivery across different locations, government expectations, and strict governance controls.",
        approach: "We coordinated schedules, stakeholders, logistics, and reporting with a single delivery structure and clear accountability.",
        result: "The programme was delivered with strong visibility, smooth coordination, and reliable compliance handling.",
        image: cefasImages?.imageUrl,
      },
    ],
    "education": [
      {
        id: "oxford",
        title: "University of Oxford – St Anne's Ball",
        summary: "A premium institutional event delivered with strong attention to detail and guest experience.",
        challenge: "The event needed an elegant experience that matched the university's standards and guest expectations.",
        approach: "We handled planning, styling, logistics, and event-day coordination with a polished, discreet delivery style.",
        result: "The evening ran smoothly and reflected the institution's quality and prestige.",
        image: oxfordImages?.imageUrl,
      },
    ],
    "financial-services": [
      {
        id: "twinpay",
        title: "Cross-Border Payments Pilot (TwinPaay)",
        summary: "A financial coordination case study focused on international payments and cross-border compliance.",
        challenge: "The project required safe handling of multiple currencies and international vendor transactions.",
        approach: "We structured the workflow around payment governance, cross-border checks, and controlled approvals.",
        result: "The pilot demonstrated a practical model for managing international event payments securely.",
        image: twinpayImages?.imageUrl,
      },
    ],
    "charity-community": [
      {
        id: "youth",
        title: "Community Pitch to Juventus Academy",
        summary: "A youth development initiative supporting football talent and community progression.",
        challenge: "The programme needed to present young talent professionally and create a credible route to opportunities.",
        approach: "We built the presentation, supported the programme story, and created a delivery narrative around development and impact.",
        result: "The initiative was positioned clearly and professionally for stakeholder and club engagement.",
        image: youthBoysImage,
      },
    ],
    "corporate-energy": [
      {
        id: "energy",
        title: "Major National Energy Corporation – Nigeria",
        summary: "A long-term retained partnership for large-scale corporate and CSR delivery.",
        challenge: "The work required consistent execution across multiple locations with high operational expectations.",
        approach: "We delivered planning, logistics, stakeholder coordination, and event execution under a retained structure.",
        result: "The partnership provided stable delivery support across a five-year period.",
        image: energyImages?.imageUrl,
      },
    ],
  };

  const sectorData: Record<string, { name: string; cases: Array<{ id: string; title: string; desc: string; image?: string }> }> = {
    "public-sector": {
      name: "Public Sector",
      cases: [
        { id: 'public-sector', title: 'UK Government Agency – Africa Regional Support Programme', desc: 'Governance-aligned delivery across multi-region operations.', image: cefasImages?.imageUrl },
      ]
    },
    "education": {
      name: "Education",
      cases: [
        { id: 'oxford', title: 'University of Oxford – St Anne\'s Ball', desc: 'End-to-end event delivery for a major institutional partner.', image: oxfordImages?.imageUrl },
      ]
    },
    "financial-services": {
      name: "Financial Services",
      cases: [
        { id: 'twinpay', title: 'Cross-Border Payments Pilot (TwinPaay)', desc: 'Compliance-driven financial coordination across multiple markets.', image: twinpayImages?.imageUrl },
      ]
    },
    "charity-community": {
      name: "Charity & Community",
      cases: [
        { id: 'youth', title: 'Community Pitch to Juventus Academy', desc: 'Youth football development programme with professional training and club placements.', image: youthBoysImage },
      ]
    },
    "corporate-energy": {
      name: "Corporate - Energy",
      cases: [
        { id: 'energy', title: 'Major National Energy Corporation – Nigeria', desc: 'Five-year retained delivery partnership delivering large-scale multi-location CSR events.', image: energyImages?.imageUrl },
      ]
    }
  };

  const sector = sectorData[sectorId || ""];
  const content = caseStudyContent[sectorId || ""];

  if (!sector) return <div className="text-center py-20">Sector not found</div>;

  usePageMeta({
    title: `${sector.name} Case Studies | Event Perfekt Global Ltd`,
    description: `Explore our ${sector.name.toLowerCase()} case studies and successful event delivery partnerships.`
  });

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-white z-50 border-b border-black border-opacity-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        </div>
      </nav>

      {/* Content */}
      <div className="pt-20 px-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-16"
          >
            <Link href="/projects-and-programmes">
              <a className="text-sm text-[#330311] hover:text-[#4A0E1F] mb-6 inline-block font-light">← Back to Sectors</a>
            </Link>
            <h1 className="text-4xl font-light text-black mb-4">{sector.name}</h1>
            <p className="text-lg text-black text-opacity-60 font-light">
              Explore our case studies and successful partnerships in {sector.name.toLowerCase()}.
            </p>
          </motion.div>

          {/* Case Studies Grid */}
          <div className="space-y-10 mb-20">
            {content.map((caseStudy, i) => (
              <motion.div
                key={caseStudy.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                viewport={{ once: true }}
                className="grid lg:grid-cols-[360px_1fr] border border-[#330311] border-opacity-20 rounded overflow-hidden hover:border-opacity-40 transition bg-white"
              >
                <div className="bg-[#1A0A0E]">
                  {caseStudy.image && <img src={caseStudy.image} alt={caseStudy.title} className="w-full h-full min-h-[280px] object-cover" />}
                </div>
                <div className="p-8 flex flex-col gap-5">
                  <div>
                    <h3 className="text-2xl font-light text-black mb-3">{caseStudy.title}</h3>
                    <p className="text-base text-black text-opacity-70 font-light">{caseStudy.summary}</p>
                  </div>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.25em] text-black/40 mb-2">Challenge</p>
                      <p className="text-sm text-black/80 font-light">{caseStudy.challenge}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.25em] text-black/40 mb-2">Approach</p>
                      <p className="text-sm text-black/80 font-light">{caseStudy.approach}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.25em] text-black/40 mb-2">Result</p>
                      <p className="text-sm text-black/80 font-light">{caseStudy.result}</p>
                    </div>
                  </div>
                  <Link href={`/case-studies/${caseStudy.id}`}>
                    <a className="inline-block border border-[#330311] text-[#330311] hover:bg-[#330311] hover:text-white transition text-sm font-light px-6 py-2 no-underline w-fit">
                      Read Full Case Study
                    </a>
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
