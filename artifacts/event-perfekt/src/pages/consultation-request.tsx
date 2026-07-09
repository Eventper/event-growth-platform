import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { usePageMeta } from "@/hooks/use-page-meta";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function ConsultationRequest() {
  usePageMeta({
    title: "Consultation Request | Event Perfekt Global Ltd",
    description: "Request a consultation or case study with Event Perfekt. Tell us about your governance, programme, or event project and we'll connect you with our team.",
    canonical: "https://eventperfekt.net/consultation-request",
  });

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    company: "",
    phone: "",
    projectType: "",
    projectScope: "",
    preferredDate: "",
    budget: "",
    description: "",
  });

  const [submitted, setSubmitted] = useState(false);

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Show success message
    setSubmitted(true);
    // Reset form after 2 seconds and redirect
    setTimeout(() => {
      window.location.href = "https://www.eventperfekt.com/contact-us";
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-white z-50 border-b border-black border-opacity-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <span className="font-bold text-xl text-black">Event Perfekt</span>
          <a href="/projects-and-programmes" className="text-sm uppercase tracking-wide text-black hover:text-[#4A0E1F] font-light">← Back</a>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-16 px-6 bg-white">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-light text-black mb-4 font-poppins">
            Request a Consultation
          </h1>
          <p className="text-lg text-black text-opacity-80 font-light">
            Tell us about your project and we'll connect you with our team to discuss your needs.
          </p>
        </div>
      </section>

      {/* Form */}
      <section className="py-24 px-6 bg-[#f9f7f4]">
        <div className="max-w-2xl mx-auto">
          {submitted ? (
            <div className="bg-white rounded-md shadow-sm p-12 text-center border-t-4 border-[#4A0E1F]">
              <h2 className="text-3xl font-light text-black mb-4 font-poppins">
                Thank You!
              </h2>
              <p className="text-base text-black text-opacity-80 font-light mb-8">
                Your consultation request has been received. We'll review your details and contact you shortly.
              </p>
              <p className="text-sm text-black text-opacity-60 font-light">
                Redirecting to our contact page...
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="bg-white rounded-md shadow-sm p-12 space-y-8">
              {/* Personal Info Section */}
              <div>
                <h2 className="text-2xl font-light text-black mb-6 font-poppins">Your Information</h2>
                
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-light text-black mb-2 font-poppins">
                      Full Name *
                    </label>
                    <Input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => handleChange("name", e.target.value)}
                      className="border border-black border-opacity-20 rounded-md px-4 py-2 font-light"
                      placeholder="John Doe"
                    />
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-light text-black mb-2 font-poppins">
                        Email *
                      </label>
                      <Input
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) => handleChange("email", e.target.value)}
                        className="border border-black border-opacity-20 rounded-md px-4 py-2 font-light"
                        placeholder="john@example.com"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-light text-black mb-2 font-poppins">
                        Phone Number
                      </label>
                      <Input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => handleChange("phone", e.target.value)}
                        className="border border-black border-opacity-20 rounded-md px-4 py-2 font-light"
                        placeholder="+44 (0) 123 456 7890"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-light text-black mb-2 font-poppins">
                      Company / Organisation *
                    </label>
                    <Input
                      type="text"
                      required
                      value={formData.company}
                      onChange={(e) => handleChange("company", e.target.value)}
                      className="border border-black border-opacity-20 rounded-md px-4 py-2 font-light"
                      placeholder="Your Company Name"
                    />
                  </div>
                </div>
              </div>

              {/* Project Details Section */}
              <div>
                <h2 className="text-2xl font-light text-black mb-6 font-poppins">Project Details</h2>
                
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-light text-black mb-2 font-poppins">
                      What type of project are you interested in? *
                    </label>
                    <Select value={formData.projectType} onValueChange={(value) => handleChange("projectType", value)}>
                      <SelectTrigger className="border border-black border-opacity-20 rounded-md px-4 py-2">
                        <SelectValue placeholder="Select project type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="governance">Governance & Compliance Programme</SelectItem>
                        <SelectItem value="regional">Regional Operations Support</SelectItem>
                        <SelectItem value="event">Event Planning & Production</SelectItem>
                        <SelectItem value="tender">Tender Management</SelectItem>
                        <SelectItem value="financial">Financial Coordination</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="block text-sm font-light text-black mb-2 font-poppins">
                      Project Scope *
                    </label>
                    <Select value={formData.projectScope} onValueChange={(value) => handleChange("projectScope", value)}>
                      <SelectTrigger className="border border-black border-opacity-20 rounded-md px-4 py-2">
                        <SelectValue placeholder="Select scope" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="case-study">Request a Case Study</SelectItem>
                        <SelectItem value="full-service">Full Service Programme</SelectItem>
                        <SelectItem value="advisory">Advisory Consultation</SelectItem>
                        <SelectItem value="partnership">Partnership Opportunity</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="block text-sm font-light text-black mb-2 font-poppins">
                      Estimated Budget Range
                    </label>
                    <Select value={formData.budget} onValueChange={(value) => handleChange("budget", value)}>
                      <SelectTrigger className="border border-black border-opacity-20 rounded-md px-4 py-2">
                        <SelectValue placeholder="Select budget range" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="under-25k">Under £25,000</SelectItem>
                        <SelectItem value="25k-50k">£25,000 - £50,000</SelectItem>
                        <SelectItem value="50k-100k">£50,000 - £100,000</SelectItem>
                        <SelectItem value="100k-250k">£100,000 - £250,000</SelectItem>
                        <SelectItem value="over-250k">£250,000+</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="block text-sm font-light text-black mb-2 font-poppins">
                      Preferred Consultation Date *
                    </label>
                    <Input
                      type="date"
                      required
                      value={formData.preferredDate}
                      onChange={(e) => handleChange("preferredDate", e.target.value)}
                      className="border border-black border-opacity-20 rounded-md px-4 py-2 font-light"
                    />
                  </div>
                </div>
              </div>

              {/* Project Description */}
              <div>
                <h2 className="text-2xl font-light text-black mb-6 font-poppins">Tell Us More</h2>
                
                <div>
                  <label className="block text-sm font-light text-black mb-2 font-poppins">
                    Describe your project and what you'd like help with *
                  </label>
                  <Textarea
                    required
                    value={formData.description}
                    onChange={(e) => handleChange("description", e.target.value)}
                    className="border border-black border-opacity-20 rounded-md px-4 py-3 font-light min-h-40"
                    placeholder="Tell us about your project, challenges, timeline, and what success looks like for you..."
                  />
                </div>
              </div>

              {/* Submit */}
              <div className="flex gap-4 pt-8">
                <Button
                  type="submit"
                  className="bg-[#4A0E1F] text-white hover:bg-black transition text-sm uppercase tracking-wide font-light px-8 py-3 rounded"
                >
                  Submit Consultation Request <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
                <a
                  href="/projects-and-programmes"
                  className="border border-[#4A0E1F] text-[#4A0E1F] hover:bg-[#4A0E1F] hover:text-white transition text-sm uppercase tracking-wide font-light px-8 py-3 rounded inline-block"
                >
                  Back to Programmes
                </a>
              </div>
            </form>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6 bg-white">
        <div className="max-w-4xl mx-auto text-center border border-black border-opacity-10 rounded-md p-12">
          <h2 className="text-3xl font-light text-black mb-6 font-poppins">
            Prefer to Contact Us Directly?
          </h2>
          <p className="text-base text-black text-opacity-80 font-light mb-8">
            Visit our main contact page to reach out to our team or find office locations.
          </p>
          <a
            href="https://www.eventperfekt.com/contact-us"
            className="inline-block bg-[#4A0E1F] text-white hover:bg-black transition text-sm uppercase tracking-wide font-light px-8 py-3 rounded"
          >
            Go to Contact Us Page <ChevronRight className="w-4 h-4 ml-2 inline" />
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-black text-white py-12 px-6">
        <div className="max-w-7xl mx-auto border-t border-white border-opacity-10 pt-8 text-center text-xs text-white text-opacity-60 font-light">
          <p>&copy; 2026 Event Perfekt Global Ltd. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
