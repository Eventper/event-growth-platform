import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  CheckCircle,
  Loader2,
  CreditCard,
  Banknote,
  Landmark,
  ShieldCheck,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Calendar,
  MapPin,
  User,
  Clock,
  PoundSterling,
} from "lucide-react";

/* ─── Agreement Text ─────────────────────────────────────────── */
const AGREEMENT_SECTIONS = [
  {
    title: "1. BOOKING CONFIRMATION",
    body: "A booking is only confirmed once the required booking deposit has been received and written confirmation has been issued by Event Perfekt.",
  },
  {
    title: "2. BOOKING DEPOSIT",
    body: "A 50% non-refundable booking deposit is required to secure the booking date. This deposit is non-refundable in the event of client cancellation.",
  },
  {
    title: "3. FINAL BALANCE PAYMENT",
    body: "The remaining balance must be paid no later than 7 days before the event date unless otherwise agreed in writing. Failure to pay may result in cancellation of booking and loss of booking deposit.",
  },
  {
    title: "4. CASH PAYMENT BOOKINGS",
    body: "Where cash payment has been agreed, FULL payment must be made BEFORE setup begins. The 360 booth will not be delivered, installed or operated unless full payment has been received where cash payment has been agreed. No exceptions.",
  },
  {
    title: "5. REFUNDABLE SECURITY DEPOSIT",
    body: "A refundable security deposit is required before the event. This deposit covers: damage to equipment, missing accessories, theft, guest misuse, spillages/liquid damage, excessive cleaning. Deposit will be refunded within 48 hours after event if no issues arise. Where damage exceeds deposit, client remains liable for full repair or replacement costs.",
  },
  {
    title: "6. NO PAYMENT NO SETUP",
    body: "Event Perfekt reserves the right to refuse setup, suspend service, withdraw equipment or cancel delivery where payment terms have not been met in full. No payment means no setup.",
  },
  {
    title: "7. ADDITIONAL HIRE TIME",
    body: "Additional booth hire is charged at an additional rate per hour and is subject to staff and equipment availability on the day. Payment must be made before additional time begins.",
  },
  {
    title: "8. EQUIPMENT USE & GUEST CONDUCT",
    body: "Guests must follow booth attendant instructions at all times. The following are prohibited: jumping on booth platform, unsafe or rough use, overloading platform, food/drinks on equipment, unsupervised children, intoxicated misuse, tampering with equipment. Event Perfekt may stop operation immediately where safety or equipment is at risk. No refund shall be issued in such circumstances.",
  },
  {
    title: "9. CLIENT RESPONSIBILITY FOR DAMAGE",
    body: "The client is responsible for damage, loss or theft caused by: guests, children, venue attendees, third parties associated with the booking. This includes: ring lights, tablets, cameras, booth platform, props, accessories, mounts, cables. Repair/replacement costs may be charged.",
  },
  {
    title: "10. SETUP REQUIREMENTS",
    body: "Client must provide: safe level setup area, nearby power supply, adequate operating space, safe guest access, weather protection for outdoor events. Event Perfekt reserves the right not to set up where venue conditions are unsafe.",
  },
  {
    title: "11. DELAYS",
    body: "Where event start is delayed due to venue/client issues, the originally agreed finish time may still apply. No refunds shall be issued for lost time caused by delays outside Event Perfekt's control.",
  },
  {
    title: "12. TRAVEL",
    body: "Travel within the standard service area is included in quoted pricing. Travel outside the standard area may incur an additional charge confirmed in advance.",
  },
  {
    title: "13. WEATHER / OUTDOOR EVENTS",
    body: "For outdoor events, suitable shelter must be provided. Event Perfekt may suspend or refuse operation in unsafe weather conditions including: rain, wind, excessive heat, unsafe surfaces.",
  },
  {
    title: "14. CANCELLATION POLICY",
    body: "Booking deposit is non-refundable. Cancellations: More than 14 days before event – booking deposit retained. Within 7 days of event – up to full hire balance may become payable. All cancellations must be made in writing.",
  },
  {
    title: "15. LIMITATION OF LIABILITY",
    body: "Event Perfekt is not liable for: venue issues, guest behaviour, network/internet sharing failures, client delays, power failures, force majeure events. Liability is limited to booking value paid.",
  },
  {
    title: "16. MEDIA & CONTENT USE",
    body: "Event footage/photos may be used for marketing purposes unless client requests opt-out in writing before the event.",
  },
  {
    title: "17. AGREEMENT",
    body: "By ticking the agreement checkbox, typing your name and proceeding with payment, you confirm your electronic acceptance of this Booking Agreement & Terms of Hire.",
  },
];

/* ─── Types ──────────────────────────────────────────────────── */
interface BoothBooking {
  id: string;
  token: string;
  clientName: string;
  clientEmail: string;
  clientPhone?: string;
  clientAddress?: string;
  eventDate: string;
  venue?: string;
  eventType?: string;
  eventStartTime?: string;
  eventEndTime?: string;
  duration?: string;
  guestCount?: number;
  service?: string;
  packageName: string;
  netAmount?: string;
  hireFee: string;
  vat: string;
  securityDeposit: string;
  totalDue: string;
  depositDue: string;
  balanceDue: string;
  balanceDueDate?: string;
  cashBalanceFlag?: boolean;
  status: string;
  paymentStatus: string;
  paymentMethod?: string;
  signedName?: string;
  agreementAccepted?: boolean;
  agreementAcceptedAt?: string;
  country?: string;
  currency?: string;
  createdAt: string;
}

/* ─── Page Component ───────────────────────────────────────── */
export default function BookingConfirmation() {
  const { token } = useParams();
  const { toast } = useToast();

  const [agreed, setAgreed] = useState(false);
  const [signature, setSignature] = useState("");
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"card" | "bank" | "cash" | null>(null);
  const [payLoading, setPayLoading] = useState(false);

  const today = new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const { data: booking, isLoading, error } = useQuery({
    queryKey: ["/api/booth-bookings", token],
    queryFn: async () => {
      const res = await fetch(`/api/booth-bookings/${token}`);
      if (!res.ok) throw new Error("Booking not found");
      return res.json() as Promise<BoothBooking>;
    },
    enabled: !!token,
  });

  const acceptMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/booth-bookings/${token}/accept`, {
        signedName: signature,
        agreementAccepted: true,
        paymentMethod,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/booth-bookings", token] });
      toast({
        title: "Agreement Accepted",
        description: "Your booking agreement has been recorded. Proceed to payment.",
      });
    },
    onError: (err: any) => {
      toast({
        title: "Error",
        description: err.message || "Failed to accept agreement",
        variant: "destructive",
      });
    },
  });

  const handlePay = async () => {
    if (!agreed || !signature.trim()) {
      toast({
        title: "Required",
        description: "Please read the agreement, tick the checkbox, and type your full name.",
        variant: "destructive",
      });
      return;
    }
    if (!paymentMethod) {
      toast({
        title: "Select Payment Method",
        description: "Please choose how you'd like to pay.",
        variant: "destructive",
      });
      return;
    }
    if (!booking) return;

    /* Accept agreement first if not already */
    if (booking.status === "pending") {
      await acceptMutation.mutateAsync();
    }

    if (paymentMethod === "bank") {
      toast({
        title: "Bank Transfer Details",
        description: bankTransferDesc,
      });
    } else if (paymentMethod === "cash") {
      toast({
        title: "Cash Booking",
        description:
          "Cash clients must still accept this agreement digitally. Booth will not be delivered until full payment is received.",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#330311]">
        <Loader2 className="w-10 h-10 animate-spin text-white" />
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#330311] px-4">
        <div className="bg-white rounded-xl p-8 max-w-md w-full text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-[#330311] mb-2">Booking Not Found</h1>
          <p className="text-gray-600">
            The booking link you followed may be invalid or expired. Please contact us at{" "}
            <a href="mailto:admin@eventperfekt.com" className="text-[#330311] underline">
              admin@eventperfekt.com
            </a>.
          </p>
        </div>
      </div>
    );
  }

  const isAccepted = booking.status === "accepted" || booking.status === "paid";
  const isNG = booking.country === "NG";
  const symbol = isNG ? "₦" : "£";
  const entityName = isNG ? "Event Perfekt Management Services Limited" : "Event Perfekt Global Ltd";
  const entityAddress = isNG ? "25 Kusenla Street, Lagos, Nigeria" : "20 Wenlock Road, London, England, N1 7PG";
  const entityEmail = isNG ? "info@eventperfekt.com" : "adminuk@eventperfekt.com";
  const bankName = isNG ? "GTBank (Guaranty Trust Bank)" : "Revolut Business";
  const bankAccName = isNG ? "Event Perfekt Management Services Limited" : "Event Perfekt Global Ltd";
  const bankAccNum = isNG ? "0740436407" : "78253411";
  const bankSortCode = isNG ? "" : "04-29-09";
  const bankCurrency = isNG ? "NGN" : "GBP";
  const bankTransferDesc = isNG
    ? `Account Name: ${bankAccName} | Account: ${bankAccNum} | Bank: GTBank. Use your name as reference.`
    : `Account Name: ${bankAccName} | Account: ${bankAccNum} | Sort Code: ${bankSortCode}. Use your name as reference.`;

  return (
    <div className="min-h-screen bg-[#f8f5f6]">
      {/* Header */}
      <header className="bg-[#330311] text-white py-8 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            Booking Confirmation
          </h1>
          <p className="mt-2 text-white/80 text-sm md:text-base">
            {entityName} — 360 Booth Hire
          </p>
          <p className="mt-1 text-white/60 text-xs">
            {entityAddress}
          </p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* ── Booking Summary ─────────────────────────── */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <Card className="border-0 shadow-md overflow-hidden">
            <div className="bg-[#330311] text-white px-6 py-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                Booking Summary
              </h2>
            </div>
            <CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <SummaryItem icon={<User className="w-4 h-4" />} label="Client Name" value={booking.clientName} />
                {booking.clientAddress && (
                  <SummaryItem icon={<MapPin className="w-4 h-4" />} label="Address" value={booking.clientAddress} />
                )}
                <SummaryItem icon={<Calendar className="w-4 h-4" />} label="Event Date" value={booking.eventDate} />
                <SummaryItem icon={<MapPin className="w-4 h-4" />} label="Venue" value={booking.venue || "—"} />
                {booking.eventStartTime && booking.eventEndTime && (
                  <SummaryItem icon={<Clock className="w-4 h-4" />} label="Time" value={`${booking.eventStartTime} – ${booking.eventEndTime}`} />
                )}
                {booking.duration && (
                  <SummaryItem icon={<Clock className="w-4 h-4" />} label="Duration" value={booking.duration} />
                )}
                <SummaryItem icon={<CheckCircle className="w-4 h-4" />} label="Package" value={booking.packageName} />
                {booking.service && (
                  <SummaryItem icon={<CheckCircle className="w-4 h-4" />} label="Service" value={booking.service} />
                )}
                {booking.eventType && (
                  <SummaryItem icon={<Clock className="w-4 h-4" />} label="Event Type" value={booking.eventType} />
                )}
                {booking.guestCount ? (
                  <SummaryItem icon={<User className="w-4 h-4" />} label="Guests" value={String(booking.guestCount)} />
                ) : null}
              </div>

              <div className="border-t pt-4 mt-4 space-y-2">
                {booking.netAmount && <PriceRow label="Net Amount" value={booking.netAmount} />}
                <PriceRow label="Hire Fee" value={booking.hireFee} />
                <PriceRow label="VAT" value={booking.vat} />
                <PriceRow label="Refundable Security Deposit" value={booking.securityDeposit} highlight />
                <div className="border-t pt-2 flex justify-between items-center font-bold text-[#330311]">
                  <span>Total Due</span>
                  <span>{booking.totalDue}</span>
                </div>
                <div className="flex justify-between items-center text-sm text-gray-600">
                  <span>Deposit Due Now</span>
                  <span className="font-semibold">{booking.depositDue}</span>
                </div>
                <div className="flex justify-between items-center text-sm text-gray-600">
                  <span>Balance Due</span>
                  <span>{booking.balanceDue}</span>
                </div>
                {booking.balanceDueDate && (
                  <div className="flex justify-between items-center text-sm text-gray-600">
                    <span>Balance Due Date</span>
                    <span>{booking.balanceDueDate}</span>
                  </div>
                )}
                {booking.cashBalanceFlag && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mt-2 flex gap-2 items-start">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-800">
                      <strong>Cash balance on event day:</strong> The remaining {symbol}{booking.balanceDue} balance must be paid in cash before setup begins on your event day.
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.section>

        {/* ── Agreement ─────────────────────────────── */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <Card className="border-0 shadow-md">
            <div className="bg-[#330311] text-white px-6 py-4 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5" />
              <h2 className="text-lg font-semibold">Booking Agreement & Terms of Hire</h2>
            </div>
            <CardContent className="p-6 space-y-4">
              <p className="text-sm text-gray-600 leading-relaxed">
                Thank you for choosing Event Perfekt for your 360 Booth Hire experience.
                These Terms & Conditions form part of your booking agreement and apply to all bookings
                confirmed with Event Perfekt.
              </p>

              {/* Scrollable agreement */}
              <div className="border rounded-lg bg-white max-h-[420px] overflow-y-auto p-4 space-y-3 text-sm">
                {AGREEMENT_SECTIONS.map((section) => (
                  <div key={section.title} className="border-b last:border-0 pb-3 last:pb-0">
                    <button
                      onClick={() =>
                        setExpandedSection(expandedSection === section.title ? null : section.title)
                      }
                      className="w-full flex items-center justify-between text-left font-semibold text-[#330311] py-1"
                    >
                      {section.title}
                      {expandedSection === section.title ? (
                        <ChevronUp className="w-4 h-4 shrink-0" />
                      ) : (
                        <ChevronDown className="w-4 h-4 shrink-0" />
                      )}
                    </button>
                    {(expandedSection === section.title || expandedSection === null) && (
                      <p className="text-gray-600 mt-1 leading-relaxed">{section.body}</p>
                    )}
                  </div>
                ))}
              </div>

              <p className="text-xs text-gray-500 italic">
                Click any section heading above to expand or collapse it. Please read all sections
                carefully before proceeding.
              </p>

              {/* ── Checkbox ─────────────────────────── */}
              <div className="flex items-start gap-3 pt-2">
                <Checkbox
                  id="agree"
                  checked={agreed}
                  onCheckedChange={(v) => setAgreed(v === true)}
                  className="mt-0.5 border-[#330311] data-[state=checked]:bg-[#330311] data-[state=checked]:text-white"
                />
                <label htmlFor="agree" className="text-sm text-gray-700 leading-snug cursor-pointer">
                  I confirm that I have read and agree to the Booking Agreement & Terms of Hire.
                </label>
              </div>

              {/* ── Signature + Date ─────────────────── */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Full Legal Name (Typed Signature)
                  </label>
                  <Input
                    value={signature}
                    onChange={(e) => setSignature(e.target.value)}
                    placeholder="Type your full legal name"
                    className="border-gray-300"
                    disabled={isAccepted}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                  <Input value={today} disabled className="bg-gray-50 text-gray-600" />
                </div>
              </div>

              <p className="text-xs text-gray-500">
                By ticking the box above, typing my name and proceeding with payment, I confirm my
                electronic acceptance of {entityName}'s Booking Agreement & Terms of Hire.
              </p>

              {isAccepted && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
                  <CheckCircle className="w-6 h-6 text-green-600 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-green-800">
                      Agreement Accepted
                    </p>
                    <p className="text-xs text-green-700">
                      Signed by {booking.signedName} on{" "}
                      {booking.agreementAcceptedAt
                        ? new Date(booking.agreementAcceptedAt).toLocaleDateString("en-GB")
                        : today}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.section>

        {/* ── Payment ───────────────────────────────── */}
        {!isAccepted && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
          >
            <Card className="border-0 shadow-md">
              <div className="bg-[#330311] text-white px-6 py-4 flex items-center gap-2">
                <PoundSterling className="w-5 h-5" />
                <h2 className="text-lg font-semibold">Payment Options</h2>
              </div>
              <CardContent className="p-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <PaymentOption
                    icon={<Landmark className="w-5 h-5" />}
                    label="Bank Transfer"
                    active={paymentMethod === "bank"}
                    onClick={() => setPaymentMethod("bank")}
                  />
                  <PaymentOption
                    icon={<Banknote className="w-5 h-5" />}
                    label="Cash on Event Day"
                    active={paymentMethod === "cash"}
                    onClick={() => setPaymentMethod("cash")}
                  />
                </div>

                {paymentMethod === "bank" && (
                  <div className="bg-gray-50 border rounded-lg p-4 text-sm space-y-1">
                    <p className="font-semibold text-[#330311]">Bank Transfer Details</p>
                    <p><span className="text-gray-500">Bank:</span> {bankName}</p>
                    <p><span className="text-gray-500">Account Name:</span> {bankAccName}</p>
                    <p><span className="text-gray-500">Account Number:</span> {bankAccNum}</p>
                    {!isNG && <p><span className="text-gray-500">Sort Code:</span> {bankSortCode}</p>}
                    <p><span className="text-gray-500">Currency:</span> {bankCurrency}</p>
                    <p><span className="text-gray-500">Reference:</span> Use your name & event date</p>
                    <p className="text-xs text-gray-500 mt-2">
                      Please send proof of transfer to {entityEmail}
                    </p>
                  </div>
                )}

                {paymentMethod === "cash" && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-sm text-amber-800">
                      Cash clients must still accept this agreement digitally. The 360 booth will
                      <strong> not</strong> be delivered or set up until full payment is received.
                    </p>
                  </div>
                )}

                <Button
                  onClick={handlePay}
                  disabled={payLoading || acceptMutation.isPending}
                  className="w-full bg-[#330311] hover:bg-[#4a041c] text-white py-6 text-base font-semibold"
                >
                  {payLoading || acceptMutation.isPending ? (
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  ) : null}
                  {paymentMethod === "bank"
                    ? "Accept Agreement & Confirm Bank Transfer"
                    : paymentMethod === "cash"
                    ? "Accept Agreement & Confirm Cash Booking"
                    : "Accept Agreement & Proceed"}
                </Button>
              </CardContent>
            </Card>
          </motion.section>
        )}

        {/* ── Already Paid / Accepted ───────────────── */}
        {isAccepted && booking.paymentStatus === "fully_paid" && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
            <CheckCircle className="w-10 h-10 text-green-600 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-green-800">Payment Complete</h3>
            <p className="text-sm text-green-700 mt-1">
              Thank you! Your booking is fully confirmed. A confirmation email has been sent to{" "}
              {booking.clientEmail}.
            </p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-[#330311] text-white/60 text-xs text-center py-6 mt-12">
        <p>{entityName} · {entityAddress}</p>
        <p className="mt-1">
          <a href={`mailto:${entityEmail}`} className="underline hover:text-white">
            {entityEmail}
          </a>
        </p>
        <p className="mt-2">...making yours perfekt</p>
      </footer>
    </div>
  );
}

/* ─── Helpers ───────────────────────────────────────────────── */
function SummaryItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 text-[#330311]">{icon}</div>
      <div>
        <p className="text-xs text-gray-500 uppercase tracking-wider">{label}</p>
        <p className="text-sm font-medium text-gray-900">{value}</p>
      </div>
    </div>
  );
}

function PriceRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex justify-between items-center text-sm">
      <span className={highlight ? "text-[#330311] font-medium" : "text-gray-600"}>{label}</span>
      <span className={highlight ? "text-[#330311] font-semibold" : "text-gray-900 font-medium"}>{value}</span>
    </div>
  );
}

function PaymentOption({
  icon,
  label,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center justify-center gap-2 rounded-lg border-2 py-4 px-3 transition-all ${
        active
          ? "border-[#330311] bg-[#330311]/5 text-[#330311]"
          : "border-gray-200 hover:border-gray-300 text-gray-600"
      }`}
    >
      {icon}
      <span className="text-sm font-medium">{label}</span>
    </button>
  );
}
