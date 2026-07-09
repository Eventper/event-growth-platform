import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import PlannerLayout from "@/components/PlannerLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Loader2,
  PoundSterling,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Clock,
  Users,
  CreditCard,
  Copy,
  CheckCircle,
} from "lucide-react";

export default function AdminBoothNew() {
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const [form, setForm] = useState({
    clientName: "",
    clientAddress: "",
    clientEmail: "",
    clientPhone: "",
    eventType: "",
    eventDate: "",
    eventStartTime: "",
    eventEndTime: "",
    duration: "",
    venue: "",
    guestCount: "",
    service: "360 Booth Hire",
    packageName: "",
    netAmount: "",
    depositPercentage: "80",
    hireFee: "",
    vat: "",
    totalDue: "",
    depositDue: "",
    balanceDue: "",
    cashBalanceFlag: false,
    balanceDueDate: "",
    country: "GB",
    currency: "GBP",
  });

  const [generatedLink, setGeneratedLink] = useState("");
  const [copied, setCopied] = useState(false);

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/booth-bookings", form);
      return res.json();
    },
    onSuccess: (data) => {
      const link = `https://eventperfekt.net/booking-confirmation/${data.token}`;
      setGeneratedLink(link);
      toast({
        title: "Booking Created",
        description: `Secure link generated for ${data.clientName}`,
      });
    },
    onError: (err: any) => {
      toast({
        title: "Error",
        description: err.message || "Failed to create booking",
        variant: "destructive",
      });
    },
  });

  const updateField = (key: string, val: string | boolean) => {
    const next = { ...form, [key]: val };
    if (key === "country") {
      next.currency = val === "NG" ? "NGN" : "GBP";
    }
    if (key === "netAmount" || key === "depositPercentage" || key === "country") {
      const net = parseFloat(next.netAmount || "0");
      const vatRate = next.country === "NG" ? 0.075 : 0.2;
      const vat = (net * vatRate).toFixed(2);
      const total = (net + parseFloat(vat)).toFixed(2);
      const pct = parseFloat(next.depositPercentage || "80");
      const deposit = (net * (pct / 100)).toFixed(2);
      const balance = (net - parseFloat(deposit)).toFixed(2);
      next.hireFee = net.toFixed(2);
      next.vat = vat;
      next.totalDue = total;
      next.depositDue = deposit;
      next.balanceDue = balance;
    }
    setForm(next);
  };

  const currencySymbol = form.country === "NG" ? "₦" : "£";
  const vatLabel = form.country === "NG" ? "VAT (7.5%)" : "VAT (20%)";

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <PlannerLayout>
    <div className="min-h-screen bg-[#f8f5f6]">
      <header className="bg-[#330311] text-white py-6 px-4">
        <div className="max-w-5xl mx-auto flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/admin/booth-bookings")}
            className="text-white hover:bg-white/10"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-xl font-bold">New Photo Booth Booking</h1>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        {generatedLink && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-green-50 border border-green-200 rounded-xl p-5"
          >
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <h3 className="font-semibold text-green-800">Booking Created Successfully</h3>
            </div>
            <p className="text-sm text-green-700 mb-3">
              Share this secure link with your client:
            </p>
            <div className="flex items-center gap-2 bg-white border rounded-lg p-2">
              <input
                readOnly
                value={generatedLink}
                className="flex-1 text-sm bg-transparent outline-none text-gray-700"
              />
              <Button size="sm" onClick={handleCopy} className="bg-[#330311] hover:bg-[#4a041c]">
                {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>
          </motion.div>
        )}

        {/* CLIENT DETAILS */}
        <Card className="border-0 shadow-md">
          <div className="bg-[#330311] text-white px-6 py-3 flex items-center gap-2">
            <User className="w-5 h-5" />
            <h2 className="font-semibold">Client Details</h2>
          </div>
          <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <span className="inline-flex items-center mr-1 text-[#330311]"><MapPin className="w-4 h-4" /></span>
                Country
              </label>
              <select
                value={form.country}
                onChange={(e) => updateField("country", e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm bg-white"
              >
                <option value="GB">United Kingdom (GBP)</option>
                <option value="NG">Nigeria (NGN)</option>
              </select>
            </div>
            <Field
              icon={<User className="w-4 h-4" />}
              label="Full Name"
              value={form.clientName}
              onChange={(v) => updateField("clientName", v)}
              placeholder="e.g. Jane Smith"
            />
            <Field
              icon={<MapPin className="w-4 h-4" />}
              label="Address"
              value={form.clientAddress}
              onChange={(v) => updateField("clientAddress", v)}
              placeholder="Full address"
            />
            <Field
              icon={<Mail className="w-4 h-4" />}
              label="Email"
              type="email"
              value={form.clientEmail}
              onChange={(v) => updateField("clientEmail", v)}
              placeholder="client@email.com"
            />
            <Field
              icon={<Phone className="w-4 h-4" />}
              label="Phone"
              value={form.clientPhone}
              onChange={(v) => updateField("clientPhone", v)}
              placeholder={form.country === "NG" ? "+234 80x xxx xxxx" : "07900 123456"}
            />
          </CardContent>
        </Card>

        {/* EVENT DETAILS */}
        <Card className="border-0 shadow-md">
          <div className="bg-[#330311] text-white px-6 py-3 flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            <h2 className="font-semibold">Event Details</h2>
          </div>
          <CardContent className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <Field
              label="Event Type"
              value={form.eventType}
              onChange={(v) => updateField("eventType", v)}
              placeholder="Wedding, Birthday..."
            />
            <Field
              icon={<Calendar className="w-4 h-4" />}
              label="Event Date"
              value={form.eventDate}
              onChange={(v) => updateField("eventDate", v)}
              placeholder="Saturday 15 June 2026"
            />
            <Field
              icon={<Clock className="w-4 h-4" />}
              label="Start Time"
              value={form.eventStartTime}
              onChange={(v) => updateField("eventStartTime", v)}
              placeholder="7:00 PM"
            />
            <Field
              icon={<Clock className="w-4 h-4" />}
              label="End Time"
              value={form.eventEndTime}
              onChange={(v) => updateField("eventEndTime", v)}
              placeholder="10:00 PM"
            />
            <Field
              icon={<Clock className="w-4 h-4" />}
              label="Duration"
              value={form.duration}
              onChange={(v) => updateField("duration", v)}
              placeholder="3 hours"
            />
            <Field
              icon={<MapPin className="w-4 h-4" />}
              label="Venue"
              value={form.venue}
              onChange={(v) => updateField("venue", v)}
              placeholder="Venue name & address"
            />
            <Field
              icon={<Users className="w-4 h-4" />}
              label="Guest Count"
              value={form.guestCount}
              onChange={(v) => updateField("guestCount", v)}
              placeholder="100"
            />
            <Field
              label="Package"
              value={form.packageName}
              onChange={(v) => updateField("packageName", v)}
              placeholder="Signature Package"
            />
            <Field
              label="Service"
              value={form.service}
              onChange={(v) => updateField("service", v)}
              placeholder="360 Booth Hire"
            />
          </CardContent>
        </Card>

        {/* PRICING */}
        <Card className="border-0 shadow-md">
          <div className="bg-[#330311] text-white px-6 py-3 flex items-center gap-2">
            <PoundSterling className="w-5 h-5" />
            <h2 className="font-semibold">Pricing ({form.country === "NG" ? "NGN — ₦" : "GBP — £"})</h2>
          </div>
          <CardContent className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <Field
              icon={<span className="font-bold text-xs">{currencySymbol}</span>}
              label={`Net Amount (${currencySymbol})`}
              value={form.netAmount}
              onChange={(v) => updateField("netAmount", v)}
              placeholder={form.country === "NG" ? "250000" : "350.00"}
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Deposit %</label>
              <select
                value={form.depositPercentage}
                onChange={(e) => updateField("depositPercentage", e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm bg-white"
              >
                <option value="100">100% (Full upfront)</option>
                <option value="80">80% (Standard)</option>
                <option value="50">50%</option>
                <option value="25">25%</option>
              </select>
            </div>
            <Field label={`${vatLabel} (auto)`} value={form.vat} onChange={() => {}} readOnly />
            <Field label={`Total (auto) — ${currencySymbol}`} value={form.totalDue} onChange={() => {}} readOnly />
            <Field label={`Deposit Due (auto) — ${currencySymbol}`} value={form.depositDue} onChange={() => {}} readOnly />
            <Field label={`Balance Due (auto) — ${currencySymbol}`} value={form.balanceDue} onChange={() => {}} readOnly />
            <Field
              label="Balance Due Date"
              value={form.balanceDueDate}
              onChange={(v) => updateField("balanceDueDate", v)}
              placeholder="e.g. 8 June 2026"
            />
            <div className="flex items-center gap-2 md:col-span-2">
              <input
                type="checkbox"
                id="cash"
                checked={form.cashBalanceFlag}
                onChange={(e) => updateField("cashBalanceFlag", e.target.checked)}
                className="w-4 h-4 accent-[#330311]"
              />
              <label htmlFor="cash" className="text-sm text-gray-700 cursor-pointer">
                Cash balance on event day (client pays remaining balance in cash before setup)
              </label>
            </div>
          </CardContent>
        </Card>

        {/* BANK DETAILS */}
        <Card className="border-0 shadow-md">
          <div className="bg-[#330311] text-white px-6 py-3 flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            <h2 className="font-semibold">Bank Transfer Details (Auto-displayed to client)</h2>
          </div>
          <CardContent className="p-6 bg-gray-50 text-sm space-y-1">
            {form.country === "NG" ? (
              <>
                <p><span className="text-gray-500">Bank:</span>{" "}<span className="font-medium text-gray-800">GTBank (Guaranty Trust Bank)</span></p>
                <p><span className="text-gray-500">Account Name:</span>{" "}<span className="font-medium text-gray-800">Event Perfekt Management Services Limited</span></p>
                <p><span className="text-gray-500">Account Number:</span>{" "}<span className="font-medium text-gray-800">0740436407</span></p>
                <p><span className="text-gray-500">Currency:</span>{" "}<span className="font-medium text-gray-800">NGN</span></p>
              </>
            ) : (
              <>
                <p><span className="text-gray-500">Bank:</span>{" "}<span className="font-medium text-gray-800">Revolut Business</span></p>
                <p><span className="text-gray-500">Account Name:</span>{" "}<span className="font-medium text-gray-800">Event Perfekt Global Ltd</span></p>
                <p><span className="text-gray-500">Account Number:</span>{" "}<span className="font-medium text-gray-800">78253411</span></p>
                <p><span className="text-gray-500">Sort Code:</span>{" "}<span className="font-medium text-gray-800">04-29-09</span></p>
              </>
            )}
            <p className="text-xs text-gray-400 mt-2">
              Payment reference auto-generated from client name.
            </p>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={() => navigate("/admin/booth-bookings")}
            className="border-[#330311] text-[#330311]"
          >
            Cancel
          </Button>
          <Button
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending || !form.clientName || !form.clientEmail || !form.eventDate}
            className="bg-[#330311] hover:bg-[#4a041c] text-white px-8"
          >
            {createMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : null}
            Create Booking & Generate Link
          </Button>
        </div>
      </main>
    </div>
    </PlannerLayout>
  );
}

function Field({
  icon,
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  readOnly = false,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  readOnly?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {icon && <span className="inline-flex items-center mr-1 text-[#330311]">{icon}</span>}
        {label}
      </label>
      <Input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        readOnly={readOnly}
        className={readOnly ? "bg-gray-50 text-gray-600" : ""}
      />
    </div>
  );
}
