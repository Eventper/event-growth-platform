import { usePageMeta } from "@/hooks/use-page-meta";
import { useLocation } from "wouter";

export default function Platform() {
  const [, navigate] = useLocation();

  usePageMeta({
    title: "The Platform Behind The Woman Who Leads The Room | The Human Behind The Title",
    description: "The Human Behind The Title is a leadership platform exploring what leaders carry beneath success — pressure, identity, confidence, health, wellbeing and responsibility.",
    canonical: "https://eventperfekt.net/iamher/platform",
  });

  return (
    <div className="min-h-screen bg-white text-black">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-[#330311] to-[#4a0515] text-white py-20 px-6 text-center">
        <h1 className="text-5xl font-bold mb-6">The Platform Behind The Woman Who Leads The Room</h1>
        <p className="text-lg text-white/90 max-w-3xl mx-auto leading-relaxed mb-8">
          The Human Behind The Title is a leadership platform exploring what leaders carry beneath success — pressure, identity, confidence, health, money, appearance, wellbeing and responsibility.
        </p>
        <p className="text-base text-white/80 max-w-3xl mx-auto leading-relaxed mb-8">
          It exists for people who have reached important rooms, built serious things, and now need better conversations around how they sustain themselves, their work and their lives.
        </p>
        <p className="text-base text-white/80 max-w-3xl mx-auto leading-relaxed mb-12">
          The platform begins with women in leadership through its first flagship experience, The Woman Who Leads The Room, with future experiences expanding into wider leadership audiences.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => navigate("/")}
            className="px-8 py-3 bg-white text-[#330311] font-semibold rounded-lg hover:bg-gray-100 transition"
          >
            Explore The First Experience
          </button>
          <button
            onClick={() => navigate("/#partnerships")}
            className="px-8 py-3 border-2 border-white text-white font-semibold rounded-lg hover:bg-white/10 transition"
          >
            Explore Partnerships
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-16 space-y-16">
        
        {/* First Flagship Experience */}
        <section>
          <h2 className="text-4xl font-bold text-[#330311] mb-6">The First Flagship Experience</h2>
          <p className="text-lg text-gray-700 leading-relaxed mb-6">
            <strong>The Woman Who Leads The Room</strong> is the first flagship experience within The Human Behind The Title platform. Launching in Milton Keynes, it brings together carefully selected female founders, executives, directors, senior professionals and business owners for a private leadership dinner focused on confidence, health, visibility, connection and the woman behind the title.
          </p>
          <p className="text-lg text-gray-700 leading-relaxed mb-8">
            This first experience focuses on women because many senior women are carrying leadership pressure, business growth, identity shifts, health changes, financial decisions and personal responsibility at the same time.
          </p>
          <button
            onClick={() => navigate("/")}
            className="px-8 py-3 bg-[#330311] text-white font-semibold rounded-lg hover:bg-[#4a0515] transition"
          >
            View The Woman Who Leads The Room
          </button>
        </section>

        {/* Six Pillars */}
        <section>
          <h2 className="text-4xl font-bold text-[#330311] mb-3">Six Pillars That Shape Sustainable Leadership</h2>
          <p className="text-gray-600 mb-12 text-lg">
            Six interconnected areas that affect how leaders sustain themselves, their influence and their work over time.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                num: "1",
                title: "Confidence & Presence",
                desc: "How leaders show up, own their space and continue to lead with clarity.",
              },
              {
                num: "2",
                title: "Women's Health",
                desc: "Menopause, hormones, energy, intimate health and the physical realities that shape leadership.",
              },
              {
                num: "3",
                title: "Skin & Aesthetic Health",
                desc: "Confidence-led conversations around skin, aesthetic and intimate health as part of overall wellbeing.",
              },
              {
                num: "4",
                title: "Emotional Wellbeing",
                desc: "The private pressure, responsibility and emotional weight carried by high-performing women.",
              },
              {
                num: "5",
                title: "Financial Wellbeing",
                desc: "Money, property, growth, investment and sustainability decisions that affect leadership longevity.",
              },
              {
                num: "6",
                title: "Business Sustainability",
                desc: "Helping founders and leaders build businesses that last, not just businesses that look successful.",
              },
            ].map((pillar) => (
              <div key={pillar.num} className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                <div className="text-5xl font-bold text-[#330311]/20 mb-2">{pillar.num}</div>
                <h3 className="text-xl font-bold text-[#330311] mb-3">{pillar.title}</h3>
                <p className="text-gray-700 leading-relaxed">{pillar.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* For Organisations */}
        <section className="bg-gray-50 rounded-xl px-8 py-12 border border-gray-200">
          <h2 className="text-3xl font-bold text-[#330311] mb-2">For Organisations</h2>
          <p className="text-lg font-semibold text-gray-600 mb-6">Corporate Conversations & Leadership Wellbeing</p>
          <p className="text-lg text-gray-700 leading-relaxed mb-6">
            The Human Behind The Title gives organisations a more human way to engage with leadership, wellbeing, retention, confidence, inclusion and performance.
          </p>
          <p className="text-lg text-gray-700 leading-relaxed mb-8">
            It supports conversations around women in leadership, menopause and workplace wellbeing, executive confidence, founder sustainability, financial wellbeing, burnout prevention, talent retention and human-centred leadership.
          </p>
          <p className="text-base text-gray-600 italic mb-8">
            This is where corporate wellbeing meets leadership reality.
          </p>
          <button className="px-8 py-3 bg-[#330311] text-white font-semibold rounded-lg hover:bg-[#4a0515] transition">
            Discuss Corporate Programmes
          </button>
        </section>

        {/* For Brand Partners */}
        <section>
          <h2 className="text-3xl font-bold text-[#330311] mb-6">For Brand Partners</h2>
          <p className="text-lg text-gray-700 leading-relaxed mb-6">
            We work with carefully selected brands whose products, services and values support the people behind leadership roles.
          </p>
          <p className="text-lg text-gray-700 leading-relaxed mb-6">
            Our partners are not simply sponsors. They become part of the experience, the conversation and the guest journey.
          </p>
          <p className="text-lg text-gray-700 leading-relaxed mb-8">
            We create opportunities for aligned brands across women's health, skin health, luxury fragrance, beauty, aesthetics, financial wellbeing, business banking, hospitality, lifestyle and corporate wellbeing.
          </p>
          <button className="px-8 py-3 bg-[#330311] text-white font-semibold rounded-lg hover:bg-[#4a0515] transition">
            Explore Partnerships
          </button>
        </section>

        {/* Vision */}
        <section>
          <h2 className="text-3xl font-bold text-[#330311] mb-3">The Vision</h2>
          <p className="text-xl font-semibold text-gray-700 mb-6">UK, Europe, West Africa & Beyond</p>
          <p className="text-lg text-gray-700 leading-relaxed mb-6">
            The Woman Who Leads The Room launches in Milton Keynes, with future editions planned across selected UK cities and aligned international markets.
          </p>
          <p className="text-lg text-gray-700 leading-relaxed mb-6">
            Through Event Perfekt Global's delivery network, the long-term vision is to build leadership experiences across the UK, Europe, West Africa, the Middle East and wider EMEA.
          </p>
          <p className="text-lg text-gray-700 leading-relaxed font-semibold">
            The aim is simple: to help people not only reach the room, but stay in it.
          </p>
        </section>

        {/* Waiting List / Interest */}
        <section className="bg-[#330311] text-white rounded-xl px-8 py-12">
          <h2 className="text-3xl font-bold mb-6">Interested in The Platform?</h2>
          <p className="text-lg text-white/90 leading-relaxed mb-6">
            Interested in bringing The Human Behind The Title or The Woman Who Leads The Room to your organisation, city or region? Register your interest and be the first to hear about future launches, partnerships and future experiences.
          </p>
          <div className="space-y-3 mb-8">
            <p className="flex items-start gap-3">
              <span className="text-xl mt-1">✓</span>
              <span>Early access to new cities</span>
            </p>
            <p className="flex items-start gap-3">
              <span className="text-xl mt-1">✓</span>
              <span>Partnership enquiries</span>
            </p>
            <p className="flex items-start gap-3">
              <span className="text-xl mt-1">✓</span>
              <span>Speaker opportunities</span>
            </p>
            <p className="flex items-start gap-3">
              <span className="text-xl mt-1">✓</span>
              <span>Corporate programme updates</span>
            </p>
          </div>
          <button
            onClick={() => navigate("/contact")}
            className="px-8 py-3 bg-white text-[#330311] font-semibold rounded-lg hover:bg-gray-100 transition"
          >
            Register Your Interest
          </button>
        </section>

        {/* Final CTA */}
        <section className="text-center py-12">
          <h2 className="text-4xl font-bold text-[#330311] mb-6">Build With The Platform</h2>
          <p className="text-xl text-gray-700 leading-relaxed max-w-3xl mx-auto mb-12">
            Whether you are a guest, corporate organisation, brand partner, speaker, city leader or sponsor, The Human Behind The Title offers a way to align with a platform built around leadership, wellbeing, confidence and longevity.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => navigate("/")}
              className="px-8 py-3 bg-[#330311] text-white font-semibold rounded-lg hover:bg-[#4a0515] transition"
            >
              Apply for Your Invitation
            </button>
            <button
              onClick={() => navigate("/#partnerships")}
              className="px-8 py-3 border-2 border-[#330311] text-[#330311] font-semibold rounded-lg hover:bg-gray-50 transition"
            >
              Explore Partnerships
            </button>
            <button className="px-8 py-3 border-2 border-[#330311] text-[#330311] font-semibold rounded-lg hover:bg-gray-50 transition">
              Discuss Corporate Programmes
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
