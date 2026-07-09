import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { usePageMeta } from "@/hooks/use-page-meta";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Loader2, CheckCircle, CreditCard, Building2, Copy, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import eventPerfektLogo from "@assets/3d_Logo_1772145137902.jpg";
import FormHelperBot from "@/components/FormHelperBot";

interface TaxLine {
  name: string;
  rate: number;
}

function fmt(value: number | undefined | null) {
  return (Number(value) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function calcBreakdown(subtotal: number, taxes: TaxLine[]) {
  const taxLines = taxes.map(t => ({ name: t.name, rate: t.rate, amount: subtotal * (t.rate / 100) }));
  const totalTax = taxLines.reduce((s, t) => s + t.amount, 0);
  const total = subtotal + totalTax;
  return { subtotal, taxLines, totalTax, total };
}

export default function InvoicePayment() {
  usePageMeta({ title: "Invoice Payment — Event Perfekt" });

  const { invoiceId } = useParams<{ invoiceId: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  const searchParams = new URLSearchParams(window.location.search);
  const txStatus = searchParams.get("status");
  const txRef = searchParams.get("tx_ref");
  const transactionId = searchParams.get("transaction_id");

  const { data: invoice, isLoading, error } = useQuery<any>({
    queryKey: ["/api/invoices/public", invoiceId],
    queryFn: async () => {
      const res = await fetch(`/api/invoices/public/${invoiceId}`);
      if (!res.ok) throw new Error("Invoice not found");
      return res.json();
    },
    enabled: !!invoiceId,
  });

  useEffect(() => {
    if (txStatus === "successful" && transactionId && invoice) {
      setPaymentSuccess(true);
    }
  }, [txStatus, transactionId, invoice]);

  const payMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/invoices/${invoiceId}/pay`);
    },
    onSuccess: (data: any) => {
      if (data.link) {
        window.location.href = data.link;
      } else {
        toast({ title: "Payment initialized", description: "Redirecting to payment..." });
      }
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to initialize payment. Please try bank transfer.", variant: "destructive" });
    },
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied to clipboard" });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#8B1538]" />
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center p-8">
          <img src={eventPerfektLogo} alt="Event Perfekt" className="w-16 h-16 rounded-full mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Invoice Not Found</h2>
          <p className="text-gray-500">This invoice link may be invalid or expired.</p>
        </Card>
      </div>
    );
  }

  if (paymentSuccess || invoice.status === "paid") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center p-8">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Payment Confirmed</h2>
          <p className="text-gray-500 mb-4">
            Invoice <span className="font-semibold">{invoice.invoice_number}</span> has been paid successfully.
          </p>
          {invoice.paid_date && (
            <p className="text-sm text-gray-400">
              Paid on {new Date(invoice.paid_date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
            </p>
          )}
          <div className="mt-6">
            <img src={eventPerfektLogo} alt="Event Perfekt" className="w-10 h-10 rounded-full mx-auto" />
            <p className="text-xs text-[#8B1538] italic mt-1">...making yours perfekt</p>
          </div>
        </Card>
      </div>
    );
  }

  const taxes: TaxLine[] = invoice.taxes && Array.isArray(invoice.taxes) && invoice.taxes.length > 0
    ? invoice.taxes
    : [{ name: "Service Charge", rate: 15 }, { name: "FIRS VAT", rate: 7.5 }];

  const subtotal = Number(invoice.amount || 0);
  const breakdown = calcBreakdown(subtotal, taxes);
  const cur = invoice.currency || "NGN";
  const lineItems = invoice.line_items || [];

  const eventCountry = (invoice.event_country || "").toLowerCase().trim();
  const isUK = eventCountry === "united kingdom" || eventCountry === "uk" || cur === "GBP";

  const companyName = isUK ? "Event Perfekt Global Ltd" : "Event Perfekt Management Services Limited";
  const companyAddress = isUK ? "20 Wenlock Road, London, N1 7PG" : "25 Kusenla Street, Lagos, Nigeria";

  const bankDetails = isUK
    ? { accountName: "Event Perfekt Global Ltd", accountNumber: "78253411", sortCode: "04-29-09", bank: "", currency: "GBP" }
    : { accountName: "Event Perfekt Management Services Limited", accountNumber: "0740436407", sortCode: "", bank: "GTBank", currency: "NGN" };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="h-1.5 bg-gradient-to-r from-[#330311] via-[#8B1538] to-[#A53B5C]" />

      <div className="max-w-2xl mx-auto p-4 sm:p-8 py-8 sm:py-12">
        <div className="text-center mb-8">
          <img src={eventPerfektLogo} alt="Event Perfekt" className="w-16 h-16 rounded-full mx-auto mb-3 shadow-md" />
          <h1 className="text-2xl font-bold text-[#330311]">Invoice Payment</h1>
          <p className="text-[#8B1538] italic text-sm">...making yours perfekt</p>
        </div>

        <Card className="mb-6 border-0 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-[#330311] to-[#8B1538] text-white rounded-t-lg p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-white/70 text-xs uppercase tracking-widest font-medium">Invoice</p>
                <p className="text-xl font-bold mt-1">{invoice.invoice_number}</p>
              </div>
              <Badge className="bg-white/20 text-white hover:bg-white/30 border-0 text-sm">
                {invoice.type?.charAt(0).toUpperCase() + invoice.type?.slice(1)}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-400 text-xs uppercase tracking-wider font-medium">Event</p>
                <p className="font-semibold text-gray-800 mt-1">{invoice.event_name || "—"}</p>
              </div>
              <div>
                <p className="text-gray-400 text-xs uppercase tracking-wider font-medium">Client</p>
                <p className="font-semibold text-gray-800 mt-1">{invoice.client_name || "—"}</p>
              </div>
              <div>
                <p className="text-gray-400 text-xs uppercase tracking-wider font-medium">Due Date</p>
                <p className="font-semibold text-gray-800 mt-1">
                  {invoice.due_date
                    ? new Date(invoice.due_date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
                    : "—"}
                </p>
              </div>
              <div>
                <p className="text-gray-400 text-xs uppercase tracking-wider font-medium">From</p>
                <p className="font-semibold text-gray-800 mt-1">{companyName}</p>
                <p className="text-gray-500 text-xs">{companyAddress}</p>
              </div>
            </div>

            {lineItems.length > 0 && (
              <>
                <Separator />
                <div>
                  <p className="text-xs uppercase tracking-wider font-medium text-gray-400 mb-3">Line Items</p>
                  <div className="space-y-2">
                    {lineItems.map((item: any, idx: number) => (
                      <div key={idx} className="flex justify-between text-sm py-2 border-b border-gray-100 last:border-0">
                        <div>
                          <p className="font-medium text-gray-800">{item.title || item.description}</p>
                          {item.description && item.title && <p className="text-gray-500 text-xs">{item.description}</p>}
                          {item.quantity > 1 && <p className="text-gray-400 text-xs">{item.quantity} × {cur} {fmt(item.unitCost)}</p>}
                        </div>
                        <p className="font-medium text-gray-800">{cur} {fmt(item.amount)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            <Separator />

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Subtotal</span>
                <span className="font-medium">{cur} {fmt(breakdown.subtotal)}</span>
              </div>
              {breakdown.taxLines.map((t, i) => (
                <div key={i} className="flex justify-between text-gray-500">
                  <span>{t.name} ({t.rate}%)</span>
                  <span>{cur} {fmt(t.amount)}</span>
                </div>
              ))}
              <Separator />
              <div className="flex justify-between text-lg font-bold text-[#330311] pt-2">
                <span>Total Due</span>
                <span>{cur} {fmt(breakdown.total)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Button
            onClick={() => payMutation.mutate()}
            disabled={payMutation.isPending}
            className="w-full bg-gradient-to-r from-[#330311] to-[#8B1538] hover:from-[#4a0518] hover:to-[#a51d45] text-white py-6 text-base font-semibold rounded-lg shadow-lg"
          >
            {payMutation.isPending ? (
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
            ) : (
              <CreditCard className="w-5 h-5 mr-2" />
            )}
            Pay {cur} {fmt(breakdown.total)} Now
          </Button>
          <p className="text-center text-xs text-gray-400">
            Secure payment via Flutterwave (Card, Bank Transfer, USSD, Mobile Money)
          </p>

          <Card className="border-l-4 border-l-[#8B1538] shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <Building2 className="w-4 h-4 text-[#8B1538]" />
                <p className="text-xs uppercase tracking-widest font-semibold text-[#8B1538]">
                  Bank Transfer Details
                </p>
              </div>
              <div className="space-y-2 text-sm text-gray-700">
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Account Name</span>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{bankDetails.accountName}</span>
                    <button onClick={() => copyToClipboard(bankDetails.accountName)} className="text-gray-400 hover:text-[#8B1538]">
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Account Number</span>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{bankDetails.accountNumber}</span>
                    <button onClick={() => copyToClipboard(bankDetails.accountNumber)} className="text-gray-400 hover:text-[#8B1538]">
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                {bankDetails.sortCode && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">Sort Code</span>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{bankDetails.sortCode}</span>
                      <button onClick={() => copyToClipboard(bankDetails.sortCode)} className="text-gray-400 hover:text-[#8B1538]">
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
                {bankDetails.bank && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Bank</span>
                    <span className="font-medium">{bankDetails.bank}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-500">Currency</span>
                  <span className="font-medium">{bankDetails.currency}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Reference</span>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-[#8B1538]">{invoice.invoice_number}</span>
                    <button onClick={() => copyToClipboard(invoice.invoice_number)} className="text-gray-400 hover:text-[#8B1538]">
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-3">
                Please use your invoice number as payment reference
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="text-center mt-8 text-xs text-gray-400">
          <p>Thank you for your business.</p>
          <p className="mt-1">{companyName} · {companyAddress}</p>
        </div>
      </div>
      <FormHelperBot formContext="invoice-payment" welcomeMessage="Hi! I can help you understand your invoice or the payment process. Just ask." suggestedQuestions={["How do I make a payment?", "Can I pay in instalments?", "What do these charges mean?"]} />
    </div>
  );
}