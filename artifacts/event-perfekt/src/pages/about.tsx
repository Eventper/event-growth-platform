import { usePageMeta } from "@/hooks/use-page-meta";
import logoPath from "@assets/3d_Logo_1772145137902.jpg";

export default function About() {
  usePageMeta({
    title: "About Event Perfekt — Professional Event Planning in Nigeria & the UK",
    description: "Event Perfekt is a full-service event management company operating in Nigeria and the UK. We plan, design, and deliver unforgettable private and corporate events — from intimate gatherings to large-scale conferences.",
    canonical: "https://eventperfekt.net/about",
  });

  return (
    <div className="min-h-screen bg-white text-black">
      <div className="bg-[#330311] text-white py-16 px-6 text-center">
        <img src={logoPath} alt="Event Perfekt logo" className="w-20 h-20 object-contain rounded-full mx-auto mb-6" />
        <h1 className="text-4xl font-bold mb-3">About Event Perfekt</h1>
        <p className="text-lg text-white/80 max-w-2xl mx-auto">...making yours perfekt</p>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-14 space-y-12">

        <section>
          <h2 className="text-2xl font-semibold text-[#330311] mb-4">Who We Are</h2>
          <p className="text-gray-700 leading-relaxed">
            Event Perfekt is a professional event planning and management company with a presence in Nigeria
            and the United Kingdom. We exist to take the stress out of event planning and replace it with
            confidence, creativity, and flawless execution. Whether you are hosting a private celebration,
            a corporate conference, a charity gala, or a community gathering, our team brings the expertise
            and attention to detail that turns your vision into reality.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-[#330311] mb-4">What We Do</h2>
          <p className="text-gray-700 leading-relaxed mb-6">
            We offer a comprehensive suite of event services, covering every stage of the planning journey —
            from initial concept to post-event reporting. Our work spans both the private and corporate sectors,
            and we are equally comfortable managing an intimate dinner of 20 guests as we are orchestrating
            a multi-day conference for 500 attendees.
          </p>
          <p className="text-gray-700 leading-relaxed">
            Full event planning and coordination, venue sourcing and negotiation, guest management and digital invitations, décor design and styling, vendor management and procurement, catering coordination, audio-visual and production, event day operations and run-sheet management, budget planning and financial reporting, and post-event analytics and surveys.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-[#330311] mb-4">Our Markets</h2>
          <p className="text-gray-700 leading-relaxed">
            We operate through two country entities, each rooted in its local market and governed by its own
            regulatory framework.
          </p>
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="border border-gray-200 rounded-lg p-6">
              <h3 className="font-semibold text-[#330311] text-lg mb-2">Nigeria</h3>
              <p className="text-sm text-gray-600 font-medium">Event Perfekt Management Services Limited</p>
              <p className="text-sm text-gray-500 mt-1">25 Kusenla Street, Lagos, Nigeria</p>
              <p className="text-sm text-gray-600 mt-3">
                Serving clients across Lagos and the wider Nigerian market, delivering world-class events
                that reflect Nigerian culture, hospitality, and scale.
              </p>
            </div>
            <div className="border border-gray-200 rounded-lg p-6">
              <h3 className="font-semibold text-[#330311] text-lg mb-2">United Kingdom</h3>
              <p className="text-sm text-gray-600 font-medium">Event Perfekt Global Ltd</p>
              <p className="text-sm text-gray-500 mt-1">20 Wenlock Road, London, N1 7PG</p>
              <p className="text-sm text-gray-600 mt-3">
                Operating across England and Wales, we bring structured, high-quality event delivery to
                corporate clients, charities, and private clients throughout the UK.
              </p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-[#330311] mb-4">Why Event Perfekt</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              {
                heading: "End-to-end ownership",
                body: "We manage every element of your event so you never have to chase suppliers or worry about gaps on the day.",
              },
              {
                heading: "Technology-driven planning",
                body: "Our proprietary platform gives clients real-time visibility into budgets, timelines, guest lists, and progress — at any time.",
              },
              {
                heading: "Dual-market expertise",
                body: "With deep roots in both Nigeria and the UK, we understand the nuances of planning events in each market and can coordinate international events seamlessly.",
              },
            ].map(({ heading, body }) => (
              <div key={heading} className="bg-gray-50 rounded-lg p-6">
                <h3 className="font-semibold text-[#330311] mb-2">{heading}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-[#330311] text-white rounded-xl px-8 py-10 text-center">
          <h2 className="text-2xl font-semibold mb-3">Ready to start planning?</h2>
          <p className="text-white/80 mb-6 max-w-xl mx-auto">
            Tell us about your event and one of our planners will be in touch to discuss how we can help.
          </p>
          <a
            href="/booking-enquiry"
            className="inline-block bg-white text-[#330311] font-semibold px-8 py-3 rounded-lg hover:bg-gray-100 transition-colors"
          >
            Make a Booking Enquiry
          </a>
        </section>

      </div>
    </div>
  );
}
