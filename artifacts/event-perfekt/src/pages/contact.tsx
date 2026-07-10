import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { usePageMeta } from "@/hooks/use-page-meta";
import { useVisitorTracking, trackFunnelEvent } from "@/hooks/use-visitor-tracking";

export default function ContactPage() {
  usePageMeta({
    title: "Contact Event Perfekt | UK & Nigeria Event Planning",
    description: "Get in touch with Event Perfekt for event planning, corporate events, government programmes, and 360 booth hire across the UK and Nigeria.",
    canonical: "https://eventperfekt.net/contact",
  });
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    company: "",
    phone: "",
    serviceType: "event-planning",
    inquiryType: "general", // "general" | "booth-inquiry" | "platform-inquiry"
    message: "",
  });

  const [submitted, setSubmitted] = useState(false);

  const contactMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const res = await apiRequest("POST", "/api/contact", data);
      if (!res.ok) throw new Error("Failed to send contact form");
      return res.json();
    },
    onSuccess: () => {
      setSubmitted(true);
      setFormData({
        name: "",
        email: "",
        company: "",
        phone: "",
        serviceType: "event-planning",
        inquiryType: "general",
        message: "",
      });
      setTimeout(() => setSubmitted(false), 5000);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    trackFunnelEvent('contact_form_submit', '/contact', { 
      inquiryType: formData.inquiryType,
      serviceType: formData.serviceType,
      source: 'contact_page'
    });
    contactMutation.mutate(formData);
  };

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section className="py-20 px-6 bg-[#330311]">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-light text-white mb-6">
            Let's Talk
          </h1>
          <p className="text-lg text-white text-opacity-80 font-light">
            Ready to transform your event or project? Get in touch with our
            team.
          </p>
        </div>
      </section>

      {/* Contact Form Section */}
      <section className="py-20 px-6">
        <div className="max-w-2xl mx-auto">
          {submitted && (
            <div className="mb-8 p-4 bg-green-50 border border-green-200 rounded">
              <p className="text-green-700 font-light">
                ✓ Thank you! We've received your message. We'll be in touch
                within 24 hours.
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name */}
            <div>
              <label className="block text-sm font-light text-black mb-2">
                Full Name *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 border border-black border-opacity-20 rounded focus:outline-none focus:border-[#330311] font-light"
                placeholder="Your name"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-light text-black mb-2">
                Email Address *
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 border border-black border-opacity-20 rounded focus:outline-none focus:border-[#330311] font-light"
                placeholder="your@email.com"
              />
            </div>

            {/* Company */}
            <div>
              <label className="block text-sm font-light text-black mb-2">
                Company / Organization
              </label>
              <input
                type="text"
                name="company"
                value={formData.company}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-black border-opacity-20 rounded focus:outline-none focus:border-[#330311] font-light"
                placeholder="Your company name"
              />
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-light text-black mb-2">
                Phone Number
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-black border-opacity-20 rounded focus:outline-none focus:border-[#330311] font-light"
                placeholder="+44 (0)20 XXXX XXXX"
              />
            </div>

            {/* Inquiry Type */}
            <div>
              <label className="block text-sm font-light text-black mb-2">
                What are you interested in? *
              </label>
              <select
                name="inquiryType"
                value={formData.inquiryType}
                onChange={(e) => {
                  handleChange(e);
                  // Auto-set serviceType based on inquiryType
                  if (e.target.value === "booth-inquiry") {
                    setFormData(prev => ({ ...prev, serviceType: "360-booth" }));
                  } else if (e.target.value === "platform-inquiry") {
                    setFormData(prev => ({ ...prev, serviceType: "platform" }));
                  }
                }}
                className="w-full px-4 py-3 border border-black border-opacity-20 rounded focus:outline-none focus:border-[#330311] font-light"
              >
                <option value="general">General Inquiry</option>
                <option value="booth-inquiry">📸 360 Booth Hire</option>
                <option value="platform-inquiry">🎯 The Human Behind The Title Platform</option>
              </select>
            </div>

            {/* Service Type */}
            <div>
              <label className="block text-sm font-light text-black mb-2">
                Service Type *
              </label>
              <select
                name="serviceType"
                value={formData.serviceType}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-black border-opacity-20 rounded focus:outline-none focus:border-[#330311] font-light"
              >
                {formData.inquiryType === "booth-inquiry" ? (
                  <>
                    <option value="360-booth">360 Photo Booth Hire</option>
                    <option value="booth-corporate">Corporate Event Booth</option>
                    <option value="booth-wedding">Wedding Photo Booth</option>
                    <option value="booth-custom">Custom Booth Package</option>
                  </>
                ) : formData.inquiryType === "platform-inquiry" ? (
                  <>
                    <option value="platform">Platform Information</option>
                    <option value="platform-corporate">Corporate Partnership</option>
                    <option value="platform-brand">Brand Partnership</option>
                    <option value="platform-event">Event Attendance</option>
                  </>
                ) : (
                  <>
                    <option value="event-planning">Full Event Planning</option>
                    <option value="day-coordination">Day Coordination</option>
                    <option value="venue-sourcing">Venue Sourcing</option>
                    <option value="design">Design & Experience</option>
                    <option value="project-management">Project Management</option>
                    <option value="tender-manager">Tender Manager</option>
                    <option value="other">Other</option>
                  </>
                )}
              </select>
            </div>

            {/* Message */}
            <div>
              <label className="block text-sm font-light text-black mb-2">
                Tell Us About Your Project *
              </label>
              <textarea
                name="message"
                value={formData.message}
                onChange={handleChange}
                required
                rows={6}
                className="w-full px-4 py-3 border border-black border-opacity-20 rounded focus:outline-none focus:border-[#330311] font-light resize-none"
                placeholder="What are you looking to achieve? When is your event or project?"
              />
            </div>

            {/* Submit Button */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={contactMutation.isPending}
                className="w-full bg-[#330311] text-white hover:bg-black transition py-4 font-light text-sm disabled:opacity-50"
              >
                {contactMutation.isPending ? "Sending..." : "Send Message"}
              </button>
            </div>
          </form>

          {/* Contact Info */}
          <div className="mt-16 pt-16 border-t border-black border-opacity-10">
            <h2 className="text-2xl font-light text-black mb-8">Other Ways to Reach Us</h2>
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h3 className="font-light text-[#330311] mb-2">Email</h3>
                <p className="text-black text-opacity-70 font-light">
                  hello@eventperfekt.com
                </p>
              </div>
              <div>
                <h3 className="font-light text-[#330311] mb-2">Phone</h3>
                <p className="text-black text-opacity-70 font-light">
                  +44 (0)20 XXXX XXXX
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
