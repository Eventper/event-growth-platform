import { usePageMeta } from "@/hooks/use-page-meta";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { apiRequest } from "@/lib/queryClient";
import logoPath from "@assets/3d_Logo_1772145137902.jpg";

export default function BookingEnquiry() {
  usePageMeta({
    title: "Book an Event | Event Planning Enquiry — Event Perfekt",
    description: "Submit a booking enquiry with Event Perfekt. Tell us about your event — type, date, location, and guest count — and our team will be in touch to discuss how we can bring your vision to life.",
    canonical: "https://eventperfekt.net/booking-enquiry",
  });

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    organisation: "",
    eventType: "",
    eventDate: "",
    guestCount: "",
    location: "",
    budget: "",
    details: "",
    gdprConsent: false,
  });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!form.firstName || !form.email || !form.gdprConsent) return;
    setLoading(true);
    try {
      await apiRequest("POST", "/api/enquiries", {
        name: `${form.firstName} ${form.lastName}`.trim(),
        email: form.email,
        phone: form.phone || null,
        eventType: form.eventType || "other",
        guestCount: form.guestCount ? Number(form.guestCount) : null,
        preferredDate: form.eventDate || null,
        budgetRange: form.budget || null,
        country: form.location || null,
        message: [
          form.organisation ? `Organisation: ${form.organisation}` : "",
          form.details || "",
        ].filter(Boolean).join("\n\n") || null,
      });
      setSubmitted(true);
    } catch {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#330311] flex items-center justify-center p-8">
        <div className="bg-white rounded-xl p-10 max-w-md text-center">
          <img src={logoPath} alt="Event Perfekt logo" className="w-16 h-16 object-contain rounded-full mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-[#330311] mb-3">Enquiry Received</h1>
          <p className="text-gray-600">
            Thank you for getting in touch. A member of our team will review your enquiry and contact you
            within one business day.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-[#330311] text-white py-14 px-6 text-center">
        <img src={logoPath} alt="Event Perfekt logo" className="w-16 h-16 object-contain rounded-full mx-auto mb-4" />
        <h1 className="text-3xl font-bold mb-2">Book an Event with Event Perfekt</h1>
        <p className="text-white/80 max-w-xl mx-auto">
          Tell us about your event and one of our planners will be in touch to discuss how we can help
          make it perfekt.
        </p>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-12">
        <Card>
          <CardHeader>
            <CardTitle className="text-[#330311]">Event Booking Enquiry</CardTitle>
            <p className="text-sm text-gray-500">Fields marked with * are required.</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">First name *</label>
                <Input
                  placeholder="e.g. Sarah"
                  value={form.firstName}
                  onChange={e => setForm({ ...form, firstName: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Last name *</label>
                <Input
                  placeholder="e.g. Johnson"
                  value={form.lastName}
                  onChange={e => setForm({ ...form, lastName: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Email address *</label>
              <Input
                type="email"
                placeholder="e.g. sarah@example.com"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Phone number</label>
              <Input
                type="tel"
                placeholder="e.g. +44 7700 900000"
                value={form.phone}
                onChange={e => setForm({ ...form, phone: e.target.value })}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Organisation / Company</label>
              <Input
                placeholder="If this is a corporate event"
                value={form.organisation}
                onChange={e => setForm({ ...form, organisation: e.target.value })}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Type of event *</label>
              <Select value={form.eventType} onValueChange={v => setForm({ ...form, eventType: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select event type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="wedding">Wedding</SelectItem>
                  <SelectItem value="birthday">Birthday / Milestone celebration</SelectItem>
                  <SelectItem value="corporate-conference">Corporate conference</SelectItem>
                  <SelectItem value="corporate-dinner">Corporate dinner / Awards</SelectItem>
                  <SelectItem value="charity-gala">Charity gala</SelectItem>
                  <SelectItem value="product-launch">Product launch</SelectItem>
                  <SelectItem value="private-party">Private party</SelectItem>
                  <SelectItem value="community-event">Community event</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Event date</label>
                <Input
                  type="date"
                  value={form.eventDate}
                  onChange={e => setForm({ ...form, eventDate: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Expected guest count</label>
                <Input
                  placeholder="e.g. 150"
                  value={form.guestCount}
                  onChange={e => setForm({ ...form, guestCount: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Event location / country</label>
              <Input
                placeholder="e.g. London, UK or Lagos, Nigeria"
                value={form.location}
                onChange={e => setForm({ ...form, location: e.target.value })}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Approximate budget</label>
              <Select value={form.budget} onValueChange={v => setForm({ ...form, budget: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a budget range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="under-5k">Under £5,000 / ₦5M</SelectItem>
                  <SelectItem value="5k-15k">£5,000 – £15,000 / ₦5M – ₦15M</SelectItem>
                  <SelectItem value="15k-30k">£15,000 – £30,000 / ₦15M – ₦30M</SelectItem>
                  <SelectItem value="30k-50k">£30,000 – £50,000 / ₦30M – ₦50M</SelectItem>
                  <SelectItem value="50k-plus">£50,000+ / ₦50M+</SelectItem>
                  <SelectItem value="not-sure">Not sure yet</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Tell us about your event</label>
              <Textarea
                placeholder="Share any details about your vision, theme, special requirements, or anything else we should know."
                rows={4}
                value={form.details}
                onChange={e => setForm({ ...form, details: e.target.value })}
              />
            </div>

            <label className="flex items-start gap-3 text-sm text-gray-600 cursor-pointer">
              <Checkbox
                checked={form.gdprConsent}
                onCheckedChange={v => setForm({ ...form, gdprConsent: !!v })}
                className="mt-0.5"
              />
              <span>
                I agree to be contacted by Event Perfekt about my enquiry. Your data will be handled in
                accordance with our{" "}
                <a href="/privacy-policy" className="underline text-[#330311]">
                  Privacy Policy
                </a>
                . *
              </span>
            </label>

            <Button
              onClick={submit}
              disabled={loading || !form.firstName || !form.email || !form.gdprConsent}
              className="w-full bg-[#330311] text-white hover:bg-[#4a0419]"
            >
              {loading ? "Submitting…" : "Submit Booking Enquiry"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
