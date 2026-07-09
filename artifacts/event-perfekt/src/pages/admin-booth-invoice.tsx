import { useState, useRef } from "react";
import { useLocation, useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import PlannerLayout from "@/components/PlannerLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Printer,
  Download,
  Send,
  Loader2,
  CheckCircle,
} from "lucide-react";

type BoothBooking = {
  id: string;
  token: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string | null;
  clientAddress: string | null;
  eventDate: string;
  venue: string | null;
  eventStartTime: string | null;
  eventEndTime: string | null;
  duration: string | null;
  service: string | null;
  packageName: string | null;
  netAmount: string | null;
  hireFee: string | null;
  vat: string | null;
  securityDeposit: string | null;
  totalDue: string | null;
  depositDue: string | null;
  balanceDue: string | null;
  status: string;
  country: string | null;
  currency: string | null;
  invoiceNumber: string | null;
};

export default function AdminBoothInvoice() {
  const [, navigate] = useLocation();
  const params = useParams<{ token?: string }>();
  const token = params.token;
  const { toast } = useToast();
  const printRef = useRef<HTMLDivElement>(null);
  const [sending, setSending] = useState(false);

  const { data: booking, isLoading } = useQuery({
    queryKey: ["/api/booth-bookings", token],
    queryFn: async () => {
      const res = await fetch(`/api/booth-bookings/${token}`);
      if (!res.ok) throw new Error("Booking not found");
      return res.json() as Promise<BoothBooking>;
    },
    enabled: !!token,
  });

  const handlePrint = () => {
    if (printRef.current) {
      const printWindow = window.open("", "_blank");
      if (!printWindow) return;
      printWindow.document.write(`
        <html><head><title>Invoice – ${booking?.clientName || ""}</title>
        <style>
          @page { margin: 20mm; }
          body { font-family: Arial, sans-serif; color: #333; max-width: 800px; margin: 0 auto; }
          .header { background: #330311; color: white; padding: 24px; border-radius: 8px; margin-bottom: 24px; }
          .header h1 { margin: 0; font-size: 28px; }
          .header p { margin: 4px 0 0; opacity: 0.8; }
          .section { margin-bottom: 20px; }
          .section h3 { color: #330311; border-bottom: 2px solid #330311; padding-bottom: 6px; margin-bottom: 12px; }
          table { width: 100%; border-collapse: collapse; }
          th, td { padding: 10px 12px; text-align: left; }
          th { background: #f8f5f6; font-weight: 600; }
          tr:nth-child(even) { background: #fafafa; }
          .total-row { font-weight: bold; background: #330311 !important; color: white; }
          .footer { margin-top: 30px; padding-top: 16px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
          .bank { background: #f8f5f6; padding: 16px; border-radius: 8px; margin-top: 16px; }
        </style></head><body>
        ${printRef.current.innerHTML}
        </body></html>
      `);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 250);
    }
  };

  const handleSendEmail = async () => {
    if (!token || !booking) return;
    setSending(true);
    try {
      const res = await fetch(`/api/booth-bookings/${token}/send-invoice`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        toast({ title: "Invoice sent", description: data.message || `Sent to ${booking.clientEmail}` });
      } else {
        toast({ title: "Failed", description: data.message || "Could not send invoice", variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  if (isLoading) {
    return (
      <PlannerLayout>
        <div className="min-h-screen bg-[#f8f5f6] flex justify-center items-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#330311]" />
        </div>
      </PlannerLayout>
    );
  }

  if (!booking) {
    return (
      <PlannerLayout>
        <div className="min-h-screen bg-[#f8f5f6] flex justify-center items-center text-gray-500">
          Booking not found.
        </div>
      </PlannerLayout>
    );
  }

  const invoiceNum = booking.invoiceNumber || `EPB-${new Date().getFullYear()}-${booking.id.slice(-4).toUpperCase()}`;
  const issueDate = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  const isNG = booking.country === "NG";
  const symbol = isNG ? "₦" : "£";
  const entityName = isNG ? "Event Perfekt Management Services Limited" : "Event Perfekt Global Ltd";
  const entityAddress = isNG ? "25 Kusenla Street, Lagos, Nigeria" : "20 Wenlock Road, London, N1 7PG";
  const entityEmail = isNG ? "info@eventperfekt.com" : "adminuk@eventperfekt.com | info@eventperfekt.com";
  const vatLabel = isNG ? "VAT (7.5%)" : "VAT (20%)";

  return (
    <PlannerLayout>
    <div className="min-h-screen bg-[#f8f5f6]">
      <header className="bg-[#330311] text-white py-6 px-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/admin/booth-bookings")} className="text-white hover:bg-white/10">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-xl font-bold">Invoice {isNG && <span className="text-sm font-normal text-white/60 ml-2">(Nigeria)</span>}</h1>
              <p className="text-white/70 text-sm">{booking.clientName} — {invoiceNum}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={handlePrint} variant="outline" className="border-white/30 text-white hover:bg-white/10">
              <Printer className="w-4 h-4 mr-2" /> Print
            </Button>
            <Button onClick={handleSendEmail} disabled={sending} className="bg-white text-[#330311] hover:bg-white/90">
              {sending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
              Send
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        <div ref={printRef}>
          {/* Invoice Header */}
          <div className="bg-[#330311] text-white p-8 rounded-lg mb-6">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-3xl font-bold mb-1">INVOICE</h1>
                <p className="text-white/80 text-sm">{entityName}</p>
                <p className="text-white/70 text-sm">{entityAddress}</p>
                <p className="text-white/70 text-sm">{entityEmail}</p>
              </div>
              <div className="text-right">
                <p className="text-white/60 text-sm">Invoice No</p>
                <p className="text-xl font-bold">{invoiceNum}</p>
                <p className="text-white/60 text-sm mt-2">Date</p>
                <p className="font-semibold">{issueDate}</p>
                <p className="text-white/60 text-sm mt-2">Due Date</p>
                <p className="font-semibold">{booking.eventDate || "On confirmation"}</p>
              </div>
            </div>
          </div>

          {/* Bill To */}
          <Card className="border-0 shadow-sm mb-6">
            <CardContent className="p-6">
              <h3 className="text-sm font-semibold text-[#330311] mb-3 uppercase tracking-wide">Bill To</h3>
              <p className="font-semibold text-lg">{booking.clientName}</p>
              {booking.clientAddress && <p className="text-gray-600">{booking.clientAddress}</p>}
              {booking.clientEmail && <p className="text-gray-600">{booking.clientEmail}</p>}
              {booking.clientPhone && <p className="text-gray-600">{booking.clientPhone}</p>}
            </CardContent>
          </Card>

          {/* Event Details */}
          <Card className="border-0 shadow-sm mb-6">
            <CardContent className="p-6">
              <h3 className="text-sm font-semibold text-[#330311] mb-3 uppercase tracking-wide">Event Details</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Date</p>
                  <p className="font-medium">{booking.eventDate || "TBC"}</p>
                </div>
                <div>
                  <p className="text-gray-500">Time</p>
                  <p className="font-medium">{booking.eventStartTime && booking.eventEndTime ? `${booking.eventStartTime} – ${booking.eventEndTime}` : "TBC"}</p>
                </div>
                <div>
                  <p className="text-gray-500">Duration</p>
                  <p className="font-medium">{booking.duration || "TBC"}</p>
                </div>
                <div>
                  <p className="text-gray-500">Venue</p>
                  <p className="font-medium">{booking.venue || "TBC"}</p>
                </div>
                <div>
                  <p className="text-gray-500">Service</p>
                  <p className="font-medium">{booking.service || "360 Booth Hire"}</p>
                </div>
                <div>
                  <p className="text-gray-500">Package</p>
                  <p className="font-medium">{booking.packageName || "Signature Package"}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Line Items */}
          <Card className="border-0 shadow-sm mb-6">
            <CardContent className="p-6">
              <h3 className="text-sm font-semibold text-[#330311] mb-3 uppercase tracking-wide">Charges</h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-2">Description</th>
                    <th className="text-right py-2 px-2">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-gray-100">
                    <td className="py-3 px-2">
                      <p className="font-medium">{booking.service || "360 Booth Hire"} — {booking.packageName || "Signature Package"}</p>
                      <p className="text-gray-500 text-xs">{booking.eventDate} | {booking.venue}</p>
                    </td>
                    <td className="text-right py-3 px-2 font-medium">{symbol}{Number(booking.hireFee || 0).toFixed(2)}</td>
                  </tr>
                  <tr className="border-b border-gray-100">
                    <td className="py-3 px-2 text-gray-600">{vatLabel}</td>
                    <td className="text-right py-3 px-2 font-medium">{symbol}{Number(booking.vat || 0).toFixed(2)}</td>
                  </tr>
                  <tr className="border-b border-gray-100">
                    <td className="py-3 px-2 text-gray-600">Refundable Security Deposit</td>
                    <td className="text-right py-3 px-2 font-medium">{symbol}{Number(booking.securityDeposit || 0).toFixed(2)}</td>
                  </tr>
                  <tr className="bg-[#330311] text-white">
                    <td className="py-4 px-2 font-bold">Total Amount Due</td>
                    <td className="text-right py-4 px-2 font-bold text-lg">{symbol}{Number(booking.totalDue || 0).toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>

              {booking.depositDue && (
                <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle className="w-4 h-4 text-amber-600" />
                    <span className="font-semibold text-amber-800">Deposit Required</span>
                  </div>
                  <p className="text-amber-700 text-sm">
                    A deposit of <strong>{symbol}{Number(booking.depositDue).toFixed(2)}</strong> is required to secure your booking.
                    Balance of <strong>{symbol}{Number(booking.balanceDue || 0).toFixed(2)}</strong> due by event date.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Bank Details */}
          <Card className="border-0 shadow-sm mb-6">
            <CardContent className="p-6">
              <h3 className="text-sm font-semibold text-[#330311] mb-3 uppercase tracking-wide">Payment Details</h3>
              <div className="bg-[#f8f5f6] rounded-lg p-4 space-y-2 text-sm">
                <p className="font-medium">Bank Transfer (Preferred)</p>
                {isNG ? (
                  <>
                    <p><strong>Bank:</strong> GTBank (Guaranty Trust Bank)</p>
                    <p><strong>Account Name:</strong> Event Perfekt Management Services Limited</p>
                    <p><strong>Account Number:</strong> 0740436407</p>
                    <p><strong>Currency:</strong> NGN</p>
                  </>
                ) : (
                  <>
                    <p><strong>Account Name:</strong> Event Perfekt Global Ltd</p>
                    <p><strong>Account Number:</strong> 78253411</p>
                    <p><strong>Sort Code:</strong> 04-29-09</p>
                    <p><strong>Currency:</strong> GBP</p>
                  </>
                )}
                <p className="text-gray-500 mt-2">Please include your invoice number ({invoiceNum}) as payment reference.</p>
              </div>
            </CardContent>
          </Card>

          {/* Terms */}
          <div className="text-xs text-gray-500 border-t pt-4 mt-4">
            <p className="font-semibold text-[#330311] mb-1">Terms &amp; Conditions</p>
            <p>Payment is due within 7 days of invoice date. The refundable security deposit will be returned within 7 working days after the event, subject to no damage to equipment. Cancellations within 14 days of the event date forfeit the deposit.</p>
            <p className="mt-2">© {new Date().getFullYear()} {entityName}.
              {entityAddress}. {entityEmail}
            </p>
          </div>
        </div>
      </main>
    </div>
    </PlannerLayout>
  );
}
