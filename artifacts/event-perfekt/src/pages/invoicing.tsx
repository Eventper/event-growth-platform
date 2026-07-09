import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Receipt, Plus, Clock, CheckCircle, AlertCircle, Printer, Trash2, Search, FileText, Pencil, Wand2, X, Save, Globe, Send, CreditCard, Loader2, Filter } from "lucide-react";
import PlannerLayout from "@/components/PlannerLayout";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import eventPerfektLogo from "@assets/3d_Logo_1772145137902.jpg";

interface LineItem {
  title: string;
  description: string;
  category: string;
  quantity: number;
  unitCost: number;
  amount: number;
}

interface TaxLine {
  name: string;
  rate: number;
}

const CURRENCY_META: Record<string, { symbol: string; label: string; flag: string; defaultTaxKey: string }> = {
  NGN: { symbol: "₦", label: "Nigerian Naira", flag: "🇳🇬", defaultTaxKey: "nigeria" },
  GBP: { symbol: "£", label: "British Pound", flag: "🇬🇧", defaultTaxKey: "uk" },
  USD: { symbol: "$", label: "US Dollar", flag: "🇺🇸", defaultTaxKey: "usa" },
  EUR: { symbol: "€", label: "Euro", flag: "🇪🇺", defaultTaxKey: "eu" },
  GHS: { symbol: "₵", label: "Ghanaian Cedi", flag: "🇬🇭", defaultTaxKey: "ghana" },
  KES: { symbol: "KSh", label: "Kenyan Shilling", flag: "🇰🇪", defaultTaxKey: "kenya" },
  ZAR: { symbol: "R", label: "South African Rand", flag: "🇿🇦", defaultTaxKey: "south_africa" },
  AED: { symbol: "AED", label: "UAE Dirham", flag: "🇦🇪", defaultTaxKey: "uae" },
  CAD: { symbol: "CA$", label: "Canadian Dollar", flag: "🇨🇦", defaultTaxKey: "canada" },
};

const CURRENCIES = Object.keys(CURRENCY_META);

const DEFAULT_TAXES: TaxLine[] = [
  { name: "Service Charge", rate: 15 },
  { name: "FIRS VAT", rate: 7.5 },
];

function getDefaultTaxesForCurrency(cur: string): TaxLine[] {
  const meta = CURRENCY_META[cur];
  if (!meta) return [];
  const preset = COUNTRY_TAX_PRESETS[meta.defaultTaxKey];
  return preset ? [...preset.taxes] : [];
}

function fmtCurrency(value: number, cur: string) {
  const symbol = CURRENCY_META[cur]?.symbol || cur;
  return `${symbol} ${(Number(value) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const COUNTRY_TAX_PRESETS: Record<string, { label: string; taxes: TaxLine[] }> = {
  nigeria: { label: "Nigeria", taxes: [{ name: "Service Charge", rate: 15 }, { name: "FIRS VAT", rate: 7.5 }] },
  uk: { label: "United Kingdom", taxes: [{ name: "UK VAT", rate: 20 }] },
  south_africa: { label: "South Africa", taxes: [{ name: "SA VAT", rate: 15 }] },
  kenya: { label: "Kenya", taxes: [{ name: "Kenya VAT", rate: 16 }] },
  ghana: { label: "Ghana", taxes: [{ name: "Ghana VAT", rate: 15 }, { name: "NHIL", rate: 2.5 }, { name: "GETFund", rate: 2.5 }] },
  eu: { label: "EU Standard", taxes: [{ name: "EU VAT", rate: 21 }] },
  uae: { label: "UAE", taxes: [{ name: "UAE VAT", rate: 5 }] },
  usa: { label: "United States", taxes: [{ name: "Sales Tax", rate: 0 }] },
  canada: { label: "Canada", taxes: [{ name: "GST", rate: 5 }, { name: "PST", rate: 7 }] },
  india: { label: "India", taxes: [{ name: "GST", rate: 18 }] },
  none: { label: "No Tax", taxes: [] },
};

function calcBreakdownWithTaxes(subtotal: number, taxes: TaxLine[]) {
  const taxLines = taxes.map(t => ({ name: t.name, rate: t.rate, amount: subtotal * (t.rate / 100) }));
  const totalTax = taxLines.reduce((s, t) => s + t.amount, 0);
  const total = subtotal + totalTax;
  return { subtotal, taxLines, totalTax, total };
}

function fmt(value: number | undefined | null) {
  return (Number(value) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function getInvoiceTaxes(inv: any): TaxLine[] {
  if (inv.taxes && Array.isArray(inv.taxes) && inv.taxes.length > 0) return inv.taxes;
  return DEFAULT_TAXES;
}

export default function Invoicing() {
  const [showCreate, setShowCreate] = useState(false);
  const [showAutoGen, setShowAutoGen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<any>(null);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterCurrency, setFilterCurrency] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: invoices = [], isLoading } = useQuery<any[]>({ queryKey: ["/api/invoices"] });
  const { data: events = [] } = useQuery<any[]>({ queryKey: ["/api/events"] });
  const { data: clients = [] } = useQuery<any[]>({ queryKey: ["/api/clients"] });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => apiRequest("PATCH", `/api/invoices/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      toast({ title: "Invoice updated" });
      setEditingInvoice(null);
    },
    onError: () => toast({ title: "Error", description: "Failed to update invoice", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/invoices/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      toast({ title: "Invoice deleted" });
    },
  });

  const [sendingId, setSendingId] = useState<string | null>(null);
  const sendPaymentMutation = useMutation({
    mutationFn: (id: string) => {
      setSendingId(id);
      return apiRequest("POST", `/api/invoices/${id}/send-payment-link`);
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      toast({ title: "Invoice Sent", description: data.message || "Payment link sent to client's email" });
      setSendingId(null);
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message || "Failed to send payment link", variant: "destructive" });
      setSendingId(null);
    },
  });

  const filtered = (invoices as any[]).filter((inv: any) => {
    const matchesStatus = filterStatus === "all" || inv.status === filterStatus;
    const matchesCurrency = filterCurrency === "all" || (inv.currency || "NGN") === filterCurrency;
    const matchesSearch = !searchQuery || inv.invoice_number?.toLowerCase().includes(searchQuery.toLowerCase())
      || inv.event_name?.toLowerCase().includes(searchQuery.toLowerCase())
      || inv.client_name?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesCurrency && matchesSearch;
  });

  // Per-currency totals for the active currency filter (or NGN + GBP side-by-side when "all")
  const activeCur = filterCurrency !== "all" ? filterCurrency : null;
  const baseSet = activeCur ? invoices.filter((i: any) => (i.currency || "NGN") === activeCur) : invoices;

  // Group totals by currency when "all" is selected
  const currenciesInUse = [...new Set((invoices as any[]).map((i: any) => i.currency || "NGN"))].sort() as string[];

  const totalPending = baseSet.filter((i: any) => i.status === "pending").reduce((s: number, i: any) => s + calcBreakdownWithTaxes(Number(i.amount || 0), getInvoiceTaxes(i)).total, 0);
  const totalPaid = baseSet.filter((i: any) => i.status === "paid").reduce((s: number, i: any) => s + calcBreakdownWithTaxes(Number(i.amount || 0), getInvoiceTaxes(i)).total, 0);
  const totalOverdue = baseSet.filter((i: any) => i.status === "overdue").reduce((s: number, i: any) => s + calcBreakdownWithTaxes(Number(i.amount || 0), getInvoiceTaxes(i)).total, 0);

  // Multi-currency summary (used when no currency filter active)
  const multiCurrTotals = currenciesInUse.map(cur => {
    const set = (invoices as any[]).filter((i: any) => (i.currency || "NGN") === cur);
    return {
      cur,
      pending: set.filter((i: any) => i.status === "pending").reduce((s: number, i: any) => s + calcBreakdownWithTaxes(Number(i.amount || 0), getInvoiceTaxes(i)).total, 0),
      paid: set.filter((i: any) => i.status === "paid").reduce((s: number, i: any) => s + calcBreakdownWithTaxes(Number(i.amount || 0), getInvoiceTaxes(i)).total, 0),
      overdue: set.filter((i: any) => i.status === "overdue").reduce((s: number, i: any) => s + calcBreakdownWithTaxes(Number(i.amount || 0), getInvoiceTaxes(i)).total, 0),
    };
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid": return <Badge className="bg-green-100 text-green-800">Paid</Badge>;
      case "overdue": return <Badge className="bg-red-100 text-red-800">Overdue</Badge>;
      case "cancelled": return <Badge className="bg-gray-100 text-gray-800">Cancelled</Badge>;
      default: return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
    }
  };

  const handlePrint = (invoice: any) => {
    const items: LineItem[] = invoice.line_items || [];
    const taxes = getInvoiceTaxes(invoice);
    const b = calcBreakdownWithTaxes(Number(invoice.amount), taxes);
    const cur = invoice.currency || 'NGN';
    const eventCountry = (invoice.event_country || '').toLowerCase().trim();
    const isUK = eventCountry === 'united kingdom' || eventCountry === 'uk' || eventCountry === 'england' || eventCountry === 'scotland' || eventCountry === 'wales';
    const companyName = isUK ? 'Event Perfekt Global Ltd' : 'Event Perfekt Management Services Limited';
    const companyAddress = isUK ? '20 Wenlock Road, London, N1 7PG' : '25 Kusenla Street, Lagos, Nigeria';
    const bankDetailsPrintHtml = isUK
      ? '<p style="margin-bottom:6px;"><strong>Bank Transfer Details:</strong></p><p><strong>Account Name:</strong> Event Perfekt Global Ltd<br/><strong>Account Number:</strong> 78253411<br/><strong>Sort Code:</strong> 04-29-09<br/><strong>Currency:</strong> GBP</p>'
      : '<p style="margin-bottom:6px;"><strong>Bank Transfer Details:</strong></p><p><strong>Account Name:</strong> Event Perfekt Management Services Limited<br/><strong>Account Number:</strong> 0740436407<br/><strong>Bank:</strong> GTBank</p>';
    const paymentLinkPrintHtml = invoice.payment_link
      ? '<p style="margin-top:8px;"><strong>Online Payment:</strong> <a href="' + invoice.payment_link + '" style="color:#8B1538;text-decoration:underline;">Click here to pay online</a></p>'
      : '';

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    let lineItemsHtml = '';
    if (items.length > 0) {
      lineItemsHtml = items.map((li: any) => {
        const qty = li.quantity || 1;
        const unit = li.unitCost || li.unitPrice || li.total || 0;
        const lineTotal = li.amount || li.total || (qty * unit);
        const descHtml = (li.description && li.title) ? '<div style="font-size:11px;color:#777;margin-top:2px;">' + li.description + '</div>' : '';
        return '<tr><td><div style="font-weight:500;">' + (li.title || li.description || 'Service') + '</div>' + descHtml + '</td>'
          + '<td>' + (li.category || '') + '</td>'
          + '<td style="text-align:center">' + qty + '</td>'
          + '<td style="text-align:right">' + fmt(unit) + '</td>'
          + '<td style="text-align:right">' + cur + ' ' + fmt(lineTotal) + '</td></tr>';
      }).join('');
    } else {
      lineItemsHtml = '<tr><td><div style="font-weight:500;">Event planning services</div>'
        + '<div style="font-size:11px;color:#777;margin-top:2px;">' + (invoice.event_name || 'Event') + ' — ' + invoice.type + ' payment</div></td>'
        + '<td style="text-transform:capitalize">' + invoice.type + '</td>'
        + '<td style="text-align:center">1</td>'
        + '<td style="text-align:right">' + fmt(b.subtotal) + '</td>'
        + '<td style="text-align:right">' + cur + ' ' + fmt(b.subtotal) + '</td></tr>';
    }

    const taxRowsHtml = b.taxLines.map(t => `
      <tr class="charge-row">
        <td colspan="4">${t.name} (${t.rate}%)</td>
        <td style="text-align:right">${cur} ${fmt(t.amount)}</td>
      </tr>
    `).join('');

    printWindow.document.write(`
      <html><head><title>Invoice ${invoice.invoice_number}</title>
      <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&family=Playfair+Display:wght@400;600;700&display=swap" rel="stylesheet">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Poppins', -apple-system, sans-serif; color: #1a1a1a; background: #fff; }
        .page { max-width: 800px; margin: 0 auto; padding: 48px; }
        .accent-bar { height: 6px; background: linear-gradient(90deg, #330311 0%, #8B1538 40%, #A53B5C 100%); }
        .header { display: flex; justify-content: space-between; align-items: flex-start; padding: 32px 0 28px; border-bottom: 1px solid #e8e0e2; }
        .brand { display: flex; align-items: center; gap: 14px; }
        .brand img { height: 52px; width: 52px; border-radius: 12px; box-shadow: 0 2px 8px rgba(51,3,17,0.15); }
        .brand-name { font-family: 'Poppins', sans-serif; }
        .brand-tagline { font-size: 11px; color: #8B1538; font-style: italic; letter-spacing: 1px; margin-top: 2px; }
        .inv-badge { text-align: right; }
        .inv-label { font-family: 'Poppins', sans-serif; }
        .inv-number { font-size: 13px; color: #666; margin-top: 6px; font-weight: 500; }
        .inv-date { font-size: 12px; color: #999; margin-top: 2px; }
        .details-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 32px; padding: 28px 0; }
        .detail-block h4 { font-size: 9px; font-weight: 600; text-transform: uppercase; letter-spacing: 2px; color: #8B1538; margin-bottom: 10px; }
        .detail-block p { font-size: 13px; line-height: 1.6; color: #444; }
        .detail-block strong { color: #1a1a1a; font-weight: 600; }
        .status { display: inline-block; padding: 5px 16px; border-radius: 20px; font-size: 11px; font-weight: 600; letter-spacing: 0.5px; }
        .status-paid { background: #ecfdf5; color: #065f46; border: 1px solid #a7f3d0; }
        .status-pending { background: #fffbeb; color: #92400e; border: 1px solid #fde68a; }
        .status-overdue { background: #fef2f2; color: #991b1b; border: 1px solid #fecaca; }
        .status-cancelled { background: #f9fafb; color: #6b7280; border: 1px solid #e5e7eb; }
        table { width: 100%; border-collapse: collapse; margin: 24px 0 0; }
        thead th { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 1.5px; color: #fff; background: linear-gradient(135deg, #330311, #8B1538); padding: 12px 14px; }
        thead th:first-child { border-radius: 8px 0 0 0; }
        thead th:last-child { border-radius: 0 8px 0 0; }
        tbody td { padding: 12px 14px; font-size: 13px; border-bottom: 1px solid #f0eded; color: #444; }
        tbody tr:hover { background: #fdf8f9; }
        .subtotal-row td { font-weight: 600; color: #333; border-top: 2px solid #e8e0e2; border-bottom: none; padding-top: 16px; }
        .charge-row td { color: #777; font-size: 12px; border-bottom: none; padding: 6px 14px; }
        .total-row { background: linear-gradient(135deg, #330311, #8B1538); }
        .total-row td { color: #fff; font-weight: 700; font-size: 15px; padding: 14px; border: none; letter-spacing: 0.3px; }
        .total-row td:first-child { border-radius: 0 0 0 8px; }
        .total-row td:last-child { border-radius: 0 0 8px 0; }
        .tax-note { background: #fdf8f9; border-left: 3px solid #8B1538; padding: 14px 18px; margin: 20px 0; font-size: 11px; color: #666; border-radius: 0 6px 6px 0; }
        .payment-section { background: #f9fafb; border-radius: 10px; padding: 20px 24px; margin: 24px 0; }
        .payment-section h4 { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 2px; color: #8B1538; margin-bottom: 10px; }
        .payment-section p { font-size: 12px; color: #555; line-height: 1.7; }
        .footer { text-align: center; padding: 28px 0 0; border-top: 1px solid #e8e0e2; margin-top: 32px; }
        .footer-brand { font-family: 'Poppins', sans-serif; }
        .footer-tagline { font-size: 11px; color: #8B1538; font-style: italic; margin-top: 4px; }
        .footer-thanks { font-size: 11px; color: #999; margin-top: 8px; }
        .watermark { font-family: 'Poppins', sans-serif; }
        @media print { 
          body { padding: 0; } 
          .page { padding: 32px; }
          tbody tr:hover { background: transparent; }
        }
      </style></head><body>
      <div class="accent-bar"></div>
      <div class="watermark">EP</div>
      <div class="page">
      <div class="header">
        <div class="brand">
          <img src="${eventPerfektLogo}" alt="Event Perfekt" />
          <div>
            <div class="brand-name">${companyName}</div>
            <div class="brand-tagline">...making yours perfekt</div>
            <div style="font-size:10px;color:#888;margin-top:2px;">${companyAddress}</div>
          </div>
        </div>
        <div class="inv-badge">
          <div class="inv-label">INVOICE</div>
          <div class="inv-number">${invoice.invoice_number}</div>
          <div class="inv-date">${invoice.created_at ? format(new Date(invoice.created_at), 'MMMM d, yyyy') : ''}</div>
        </div>
      </div>
      <div class="details-grid">
        <div class="detail-block">
          <h4>Billed To</h4>
          <p><strong>${invoice.client_name || 'Client'}</strong></p>
          <p>${invoice.client_email || ''}</p>
        </div>
        <div class="detail-block">
          <h4>Event</h4>
          <p><strong>${invoice.event_name || 'Event'}</strong></p>
        </div>
        <div class="detail-block" style="text-align:right">
          <h4>Status</h4>
          <span class="status status-${invoice.status}">${invoice.status?.toUpperCase()}</span>
          <p style="margin-top:10px;font-size:12px;color:#666;">Due: ${invoice.due_date ? format(new Date(invoice.due_date), 'MMM d, yyyy') : 'N/A'}</p>
        </div>
      </div>
      <table>
        <thead><tr><th>Item / Service</th><th>Category</th><th style="text-align:center">Qty</th><th style="text-align:right">Unit Price</th><th style="text-align:right">Amount (${cur})</th></tr></thead>
        <tbody>
          ${lineItemsHtml}
          <tr class="subtotal-row">
            <td colspan="4">Subtotal</td>
            <td style="text-align:right">${cur} ${fmt(b.subtotal)}</td>
          </tr>
          ${taxRowsHtml}
          <tr class="total-row">
            <td colspan="4">TOTAL DUE</td>
            <td style="text-align:right">${cur} ${fmt(b.total)}</td>
          </tr>
        </tbody>
      </table>
      ${taxes.length > 0 ? `<div class="tax-note">
        <strong>Tax Information:</strong> ${taxes.map(t => `${t.name} at ${t.rate}%`).join(', ')} applied as per applicable tax regulations.
      </div>` : ''}
      <div class="payment-section">
        <h4>Payment Information</h4>
        ${bankDetailsPrintHtml}
        <p style="margin-top:8px;">Payment Reference: <strong>${invoice.invoice_number}</strong></p>
        ${paymentLinkPrintHtml}
      </div>
      <div class="footer">
        <div class="footer-brand">${companyName}</div>
        <div class="footer-tagline">...making yours perfekt</div>
        <div class="footer-thanks">Thank you for trusting us with your event</div>
      </div>
      </div>
      </body></html>
    `);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 500);
  };

  return (
    <PlannerLayout>
      <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white">Invoicing</h1>
            <p className="text-xs sm:text-sm text-white/60">Create, manage, and track invoices for your events</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button onClick={() => setShowAutoGen(true)} className="bg-green-600 hover:bg-green-700 text-white font-bold text-xs sm:text-sm">
              <Wand2 className="w-4 h-4 mr-1 sm:mr-2" /> <span className="hidden sm:inline">Auto-Generate from Event</span><span className="sm:hidden">Auto-Gen</span>
            </Button>
            <Button onClick={() => setShowCreate(true)} className="bg-amber-500 hover:bg-amber-600 text-black font-bold text-xs sm:text-sm">
              <Plus className="w-4 h-4 mr-1 sm:mr-2" /> <span className="hidden sm:inline">Manual Invoice</span><span className="sm:hidden">Manual</span>
            </Button>
          </div>
        </div>

        {/* ── Currency / Region Toggle ── */}
        <div className="flex flex-wrap gap-2 items-center">
          <div className="flex items-center gap-1.5 text-xs text-white/60 mr-1">
            <Filter className="w-3.5 h-3.5" />
            <span>Currency:</span>
          </div>
          {[
            { value: "all", label: "All", flag: "🌍" },
            { value: "NGN", label: "₦ NGN", flag: "🇳🇬" },
            { value: "GBP", label: "£ GBP", flag: "🇬🇧" },
            { value: "USD", label: "$ USD", flag: "🇺🇸" },
            { value: "EUR", label: "€ EUR", flag: "🇪🇺" },
            { value: "GHS", label: "₵ GHS", flag: "🇬🇭" },
            { value: "KES", label: "KSh KES", flag: "🇰🇪" },
            { value: "ZAR", label: "R ZAR", flag: "🇿🇦" },
            { value: "AED", label: "AED", flag: "🇦🇪" },
            { value: "CAD", label: "CA$ CAD", flag: "🇨🇦" },
          ].filter(c => c.value === "all" || currenciesInUse.includes(c.value)).map(c => (
            <button
              key={c.value}
              onClick={() => setFilterCurrency(c.value)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                filterCurrency === c.value
                  ? "bg-[#8B1538] border-[#8B1538] text-white shadow-sm"
                  : "bg-white border-gray-300 text-gray-700 hover:border-[#8B1538] hover:text-[#8B1538]"
              }`}
            >
              {c.flag} {c.label}
            </button>
          ))}
        </div>

        {/* ── Summary Cards ── */}
        {filterCurrency === "all" && currenciesInUse.length > 1 ? (
          /* Multi-currency view: show a row per currency */
          <div className="space-y-2">
            <p className="text-xs text-white/50 font-medium uppercase tracking-wide">Totals by Currency — select a currency above to filter</p>
            <div className="grid gap-2">
              {multiCurrTotals.map(({ cur, pending, paid, overdue }) => (
                <Card key={cur} className="bg-white border-gray-200 cursor-pointer hover:border-[#8B1538]/40 transition-colors" onClick={() => setFilterCurrency(cur)}>
                  <CardContent className="p-3">
                    <div className="flex items-center gap-3 flex-wrap">
                      <div className="flex items-center gap-2 min-w-[100px]">
                        <span className="text-lg">{CURRENCY_META[cur]?.flag || "🌍"}</span>
                        <span className="font-bold text-gray-900 text-sm">{cur}</span>
                        <span className="text-gray-400 text-xs">{CURRENCY_META[cur]?.label}</span>
                      </div>
                      <div className="flex gap-4 flex-wrap flex-1">
                        <div className="text-center min-w-[100px]">
                          <p className="text-[10px] text-yellow-600 uppercase font-semibold tracking-wide">Pending</p>
                          <p className="text-sm font-bold text-gray-900">{fmtCurrency(pending, cur)}</p>
                        </div>
                        <div className="text-center min-w-[100px]">
                          <p className="text-[10px] text-green-600 uppercase font-semibold tracking-wide">Paid</p>
                          <p className="text-sm font-bold text-gray-900">{fmtCurrency(paid, cur)}</p>
                        </div>
                        {overdue > 0 && (
                          <div className="text-center min-w-[100px]">
                            <p className="text-[10px] text-red-600 uppercase font-semibold tracking-wide">Overdue</p>
                            <p className="text-sm font-bold text-red-700">{fmtCurrency(overdue, cur)}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ) : (
          /* Single-currency view: classic 4-card layout */
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-white border-gray-200">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg shrink-0"><FileText className="w-5 h-5 text-blue-700" /></div>
                <div className="min-w-0">
                  <p className="text-xs text-gray-500">
                    {activeCur ? `${CURRENCY_META[activeCur]?.flag || ""} ${activeCur} Invoices` : "Total Invoices"}
                  </p>
                  <p className="text-lg font-bold text-gray-900">{filtered.length}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-white border-gray-200">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 bg-yellow-100 rounded-lg shrink-0"><Clock className="w-5 h-5 text-yellow-700" /></div>
                <div className="min-w-0">
                  <p className="text-xs text-gray-500">Pending</p>
                  <p className="text-base font-bold text-gray-900 truncate" title={fmtCurrency(totalPending, activeCur || "NGN")}>
                    {activeCur ? fmtCurrency(totalPending, activeCur) : fmt(totalPending)}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-white border-gray-200">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg shrink-0"><CheckCircle className="w-5 h-5 text-green-700" /></div>
                <div className="min-w-0">
                  <p className="text-xs text-gray-500">Paid</p>
                  <p className="text-base font-bold text-gray-900 truncate" title={fmtCurrency(totalPaid, activeCur || "NGN")}>
                    {activeCur ? fmtCurrency(totalPaid, activeCur) : fmt(totalPaid)}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-white border-gray-200">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-lg shrink-0"><AlertCircle className="w-5 h-5 text-red-700" /></div>
                <div className="min-w-0">
                  <p className="text-xs text-gray-500">Overdue</p>
                  <p className="text-base font-bold text-gray-900 truncate" title={fmtCurrency(totalOverdue, activeCur || "NGN")}>
                    {activeCur ? fmtCurrency(totalOverdue, activeCur) : fmt(totalOverdue)}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <Card className="bg-white border-gray-200">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <Input placeholder="Search invoices..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 bg-gray-50 border-gray-300 text-gray-900" />
              </div>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-40 bg-gray-50 border-gray-300 text-gray-900"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-gray-200">
          <CardHeader className="pb-3 border-b border-gray-100">
            <CardTitle className="text-gray-900 text-base flex items-center">
              <Receipt className="w-5 h-5 mr-2 text-[#8B1538]" />
              Invoices ({filtered.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin w-8 h-8 border-2 border-[#8B1538] border-t-transparent rounded-full mx-auto" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12">
                <Receipt className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">No invoices found</p>
                <p className="text-gray-400 text-sm mt-1">Create your first invoice to get started</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {filtered.map((inv: any) => {
                  const taxes = getInvoiceTaxes(inv);
                  const b = calcBreakdownWithTaxes(Number(inv.amount || 0), taxes);
                  const items: LineItem[] = inv.line_items || [];
                  return (
                    <div key={inv.id} className="p-4 hover:bg-gray-50 transition-colors group">
                      <div className="flex flex-col gap-3">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className="font-mono text-sm font-semibold text-gray-900">{inv.invoice_number}</span>
                              {getStatusBadge(inv.status)}
                              <Badge variant="outline" className="text-xs capitalize text-gray-600">{inv.type}</Badge>
                              {items.length > 0 && <Badge variant="outline" className="text-xs text-blue-600 border-blue-200">{items.length} items</Badge>}
                              {inv.payment_sent_at && <Badge variant="outline" className="text-xs text-purple-600 border-purple-200"><Send className="w-2.5 h-2.5 mr-1" />Sent</Badge>}
                              {inv.payment_link && <Badge variant="outline" className="text-xs text-emerald-600 border-emerald-200"><CreditCard className="w-2.5 h-2.5 mr-1" />Payment Link</Badge>}
                            </div>
                            <div className="flex items-center gap-4 text-sm text-gray-500 flex-wrap">
                              <span className="truncate max-w-[200px]">{inv.event_name || 'Unknown Event'}</span>
                              <span>{inv.client_name || 'Unknown Client'}</span>
                              <span className="whitespace-nowrap">Due: {inv.due_date ? format(new Date(inv.due_date), 'MMM d, yyyy') : 'N/A'}</span>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-lg font-bold text-gray-900 whitespace-nowrap">{inv.currency || 'NGN'} {fmt(b.total)}</p>
                            <p className="text-[10px] text-gray-400 uppercase">Incl. taxes</p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 text-xs text-gray-400 flex-wrap">
                            <span>Subtotal: {inv.currency || 'NGN'} {fmt(b.subtotal)}</span>
                            {b.taxLines.map((t, i) => (
                              <span key={i}>+ {t.name} ({t.rate}%): {fmt(t.amount)}</span>
                            ))}
                          </div>
                          <div className="flex gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shrink-0 flex-wrap">
                            {inv.status !== 'paid' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => sendPaymentMutation.mutate(inv.id)}
                                disabled={sendingId === inv.id}
                                className="h-8 text-[#8B1538] border-[#8B1538]/30 hover:bg-[#8B1538]/5"
                                title={inv.payment_sent_at ? 'Resend payment link' : 'Send payment link via email'}
                              >
                                {sendingId === inv.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3 mr-1" />}
                                {inv.payment_sent_at ? 'Resend' : 'Send'}
                              </Button>
                            )}
                            <Button size="sm" variant="outline" onClick={() => setEditingInvoice(inv)} className="h-8 text-blue-600 border-blue-200 hover:bg-blue-50">
                              <Pencil className="w-3 h-3" />
                            </Button>
                            {inv.status === 'pending' && (
                              <Button size="sm" variant="outline" onClick={() => updateMutation.mutate({ id: inv.id, data: { status: 'paid' } })} className="text-green-700 border-green-300 hover:bg-green-50 h-8">
                                <CheckCircle className="w-3 h-3 mr-1" /> Paid
                              </Button>
                            )}
                            <Button size="sm" variant="outline" onClick={() => handlePrint(inv)} className="h-8">
                              <Printer className="w-3 h-3" />
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => { if (confirm("Delete this invoice?")) deleteMutation.mutate(inv.id); }} className="text-red-600 border-red-200 hover:bg-red-50 h-8">
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {showCreate && <CreateInvoiceDialog events={events as any[]} clients={clients as any[]} onClose={() => setShowCreate(false)} />}
        {showAutoGen && <AutoGenerateDialog events={events as any[]} clients={clients as any[]} onClose={() => setShowAutoGen(false)} />}
        {editingInvoice && (
          <EditInvoiceDialog
            invoice={editingInvoice}
            onClose={() => setEditingInvoice(null)}
            onSave={(data) => updateMutation.mutate({ id: editingInvoice.id, data })}
            isSaving={updateMutation.isPending}
          />
        )}
      </div>
    </PlannerLayout>
  );
}

function TaxEditor({ taxes, onChange }: { taxes: TaxLine[]; onChange: (taxes: TaxLine[]) => void }) {
  const [preset, setPreset] = useState("");

  const applyPreset = (key: string) => {
    if (key && COUNTRY_TAX_PRESETS[key]) {
      onChange([...COUNTRY_TAX_PRESETS[key].taxes]);
      setPreset(key);
    }
  };

  const updateTax = (index: number, field: keyof TaxLine, value: any) => {
    const updated = [...taxes];
    (updated[index] as any)[field] = field === 'rate' ? Number(value) : value;
    onChange(updated);
  };

  const addTax = () => onChange([...taxes, { name: "", rate: 0 }]);
  const removeTax = (index: number) => onChange(taxes.filter((_, i) => i !== index));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-gray-700 font-semibold flex items-center gap-1.5">
          <Globe className="w-4 h-4 text-gray-500" />
          Taxes & Charges
        </Label>
        <div className="flex items-center gap-2">
          <Select value={preset} onValueChange={applyPreset}>
            <SelectTrigger className="w-[180px] h-7 text-xs bg-gray-50 border-gray-300 text-gray-700">
              <SelectValue placeholder="Country preset..." />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(COUNTRY_TAX_PRESETS).map(([key, { label }]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" variant="outline" onClick={addTax} className="h-7 text-xs text-blue-600 border-blue-200">
            <Plus className="w-3 h-3 mr-1" /> Add Tax
          </Button>
        </div>
      </div>

      {taxes.length === 0 ? (
        <p className="text-xs text-gray-400 italic">No taxes applied. Use a country preset or add manually.</p>
      ) : (
        <div className="space-y-2">
          {taxes.map((tax, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input
                value={tax.name}
                onChange={(e) => updateTax(i, 'name', e.target.value)}
                placeholder="Tax name (e.g. UK VAT)"
                className="flex-1 h-8 text-xs bg-gray-50 border-gray-300 text-gray-900"
              />
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  value={tax.rate}
                  onChange={(e) => updateTax(i, 'rate', e.target.value)}
                  className="w-20 h-8 text-xs bg-gray-50 border-gray-300 text-gray-900 text-right"
                  step="0.1"
                />
                <span className="text-xs text-gray-500">%</span>
              </div>
              <Button size="sm" variant="ghost" onClick={() => removeTax(i)} className="h-7 w-7 p-0 text-gray-400 hover:text-red-500">
                <X className="w-3 h-3" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AutoGenerateDialog({ events, clients, onClose }: { events: any[]; clients: any[]; onClose: () => void }) {
  const [eventId, setEventId] = useState("");
  const [clientId, setClientId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [type, setType] = useState("final");
  const [currency, setCurrency] = useState("NGN");
  const [taxes, setTaxes] = useState<TaxLine[]>([...DEFAULT_TAXES]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const selectedEvent = events.find(e => e.id === eventId);

  // When event is selected, auto-set currency from it
  const handleEventSelect = (id: string) => {
    setEventId(id);
    const ev = events.find(e => e.id === id);
    if (ev?.currency && CURRENCIES.includes(ev.currency)) {
      setCurrency(ev.currency);
      setTaxes(getDefaultTaxesForCurrency(ev.currency));
    }
  };

  // When currency is manually changed, update taxes
  const handleCurrencyChange = (cur: string) => {
    setCurrency(cur);
    setTaxes(getDefaultTaxesForCurrency(cur));
  };

  const generateMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", `/api/events/${eventId}/generate-invoice`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      toast({ title: "Invoice auto-generated", description: "Invoice created from event services. You can edit it from the list." });
      onClose();
    },
    onError: () => toast({ title: "Error", description: "Failed to generate invoice", variant: "destructive" }),
  });

  const handleGenerate = () => {
    if (!eventId) { toast({ title: "Select an event", variant: "destructive" }); return; }
    generateMutation.mutate({ clientId: clientId || undefined, dueDate: dueDate || undefined, type, currency, taxes });
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg bg-white max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-gray-900 flex items-center gap-2">
            <Wand2 className="w-5 h-5 text-green-600" />
            Auto-Generate Invoice from Event
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            Automatically creates an invoice with all services and budget items from the event. You can edit it afterwards.
          </p>
          <div>
            <Label className="text-gray-700 text-sm">Event *</Label>
            <Select value={eventId} onValueChange={handleEventSelect}>
              <SelectTrigger className="bg-gray-50 border-gray-300 text-gray-900 mt-1"><SelectValue placeholder="Select event" /></SelectTrigger>
              <SelectContent>
                {events.map((e: any) => (
                  <SelectItem key={e.id} value={e.id}>
                    {CURRENCY_META[e.currency]?.flag || "🌍"} {e.name} — {e.currency || "NGN"} {Number(e.budget).toLocaleString()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {selectedEvent && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-800">
              <p className="font-medium">{selectedEvent.name}</p>
              <p className="text-xs text-green-600 mt-1">Budget: {selectedEvent.currency} {Number(selectedEvent.budget).toLocaleString()} · {selectedEvent.guestCount} guests · {selectedEvent.country || "Location TBC"}</p>
            </div>
          )}
          <div>
            <Label className="text-gray-700 text-sm">Client (optional)</Label>
            <Select value={clientId} onValueChange={setClientId}>
              <SelectTrigger className="bg-gray-50 border-gray-300 text-gray-900 mt-1"><SelectValue placeholder="Auto-detect from event" /></SelectTrigger>
              <SelectContent>
                {clients.map((c: any) => (
                  <SelectItem key={c.id} value={c.id}>{c.fullName || c.full_name || c.email}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-gray-700 text-sm">Currency</Label>
              <Select value={currency} onValueChange={handleCurrencyChange}>
                <SelectTrigger className="bg-gray-50 border-gray-300 text-gray-900 mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map(c => (
                    <SelectItem key={c} value={c}>{CURRENCY_META[c].flag} {c} — {CURRENCY_META[c].label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-gray-700 text-sm">Invoice Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger className="bg-gray-50 border-gray-300 text-gray-900 mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="deposit">Deposit</SelectItem>
                  <SelectItem value="interim">Interim</SelectItem>
                  <SelectItem value="final">Final</SelectItem>
                  <SelectItem value="additional">Additional</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-gray-700 text-sm">Due Date (optional)</Label>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="bg-gray-50 border-gray-300 text-gray-900 mt-1" />
            </div>
          </div>

          <TaxEditor taxes={taxes} onChange={setTaxes} />

          <div className="flex gap-3 pt-2">
            <Button onClick={handleGenerate} disabled={!eventId || generateMutation.isPending} className="flex-1 bg-green-600 hover:bg-green-700 text-white">
              {generateMutation.isPending ? "Generating..." : `Generate ${currency} Invoice`}
            </Button>
            <Button variant="outline" onClick={onClose} className="text-gray-700">Cancel</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function EditInvoiceDialog({ invoice, onClose, onSave, isSaving }: { invoice: any; onClose: () => void; onSave: (data: any) => void; isSaving: boolean }) {
  const [lineItems, setLineItems] = useState<LineItem[]>(invoice.line_items || []);
  const [taxes, setTaxes] = useState<TaxLine[]>(getInvoiceTaxes(invoice));
  const [currency, setCurrency] = useState(invoice.currency || 'NGN');
  const [type, setType] = useState(invoice.type || 'final');
  const [dueDate, setDueDate] = useState(invoice.due_date ? format(new Date(invoice.due_date), 'yyyy-MM-dd') : '');

  const handleCurrencyChange = (cur: string) => {
    setCurrency(cur);
    // Only auto-reset taxes if existing taxes look like the previous currency's defaults
    const newDefaults = getDefaultTaxesForCurrency(cur);
    if (newDefaults.length > 0) setTaxes(newDefaults);
  };

  const subtotal = lineItems.reduce((s, li) => s + (li.amount || 0), 0);
  const effectiveSubtotal = subtotal > 0 ? subtotal : Number(invoice.amount || 0);
  const b = calcBreakdownWithTaxes(effectiveSubtotal, taxes);

  const updateLineItem = (index: number, field: keyof LineItem, value: any) => {
    const updated = [...lineItems];
    (updated[index] as any)[field] = value;
    if (field === 'quantity' || field === 'unitCost') {
      updated[index].amount = (updated[index].quantity || 1) * (updated[index].unitCost || 0);
    }
    setLineItems(updated);
  };

  const addLineItem = () => setLineItems([...lineItems, { title: '', description: '', category: '', quantity: 1, unitCost: 0, amount: 0 }]);
  const removeLineItem = (index: number) => setLineItems(lineItems.filter((_, i) => i !== index));

  const handleSave = () => {
    const newSubtotal = lineItems.reduce((s, li) => s + (li.amount || 0), 0);
    onSave({
      lineItems,
      taxes,
      amount: newSubtotal > 0 ? newSubtotal : Number(invoice.amount),
      currency,
      type,
      dueDate: dueDate || undefined,
    });
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-3xl bg-white max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-gray-900 flex items-center gap-2">
            <Pencil className="w-5 h-5 text-blue-600" />
            Edit Invoice — {invoice.invoice_number}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <span>Event: <strong className="text-gray-900">{invoice.event_name}</strong></span>
            <span>Client: <strong className="text-gray-900">{invoice.client_name}</strong></span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <Label className="text-gray-700 text-sm">Currency</Label>
              <Select value={currency} onValueChange={handleCurrencyChange}>
                <SelectTrigger className="bg-gray-50 border-gray-300 text-gray-900 mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map(c => (
                    <SelectItem key={c} value={c}>{CURRENCY_META[c].flag} {c} ({CURRENCY_META[c].symbol})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-gray-700 text-sm">Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger className="bg-gray-50 border-gray-300 text-gray-900 mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="deposit">Deposit</SelectItem>
                  <SelectItem value="interim">Interim</SelectItem>
                  <SelectItem value="final">Final</SelectItem>
                  <SelectItem value="additional">Additional</SelectItem>
                  <SelectItem value="vendor">Vendor Payment</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-gray-700 text-sm">Due Date</Label>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="bg-gray-50 border-gray-300 text-gray-900 mt-1" />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-gray-700 font-semibold">Line Items</Label>
              <Button size="sm" variant="outline" onClick={addLineItem} className="h-7 text-xs text-blue-600 border-blue-200">
                <Plus className="w-3 h-3 mr-1" /> Add Item
              </Button>
            </div>
            {lineItems.length === 0 ? (
              <div className="text-center py-4 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                <p className="text-gray-400 text-sm">No line items. Click "Add Item" to add services.</p>
              </div>
            ) : (
              <div className="overflow-x-auto -mx-1">
                <div className="min-w-[520px] space-y-2 max-h-[250px] overflow-y-auto px-1">
                  <div className="grid grid-cols-12 gap-2 text-xs font-semibold text-gray-500">
                    <div className="col-span-4">Description</div>
                    <div className="col-span-2">Category</div>
                    <div className="col-span-1">Qty</div>
                    <div className="col-span-2">Unit Cost</div>
                    <div className="col-span-2">Amount</div>
                    <div className="col-span-1"></div>
                  </div>
                  {lineItems.map((li, i) => (
                    <div key={i} className="grid grid-cols-12 gap-2 items-center">
                      <Input value={li.description} onChange={(e) => updateLineItem(i, 'description', e.target.value)} placeholder="Service" className="col-span-4 h-8 text-xs bg-gray-50 border-gray-300 text-gray-900" />
                      <Input value={li.category} onChange={(e) => updateLineItem(i, 'category', e.target.value)} placeholder="Category" className="col-span-2 h-8 text-xs bg-gray-50 border-gray-300 text-gray-900" />
                      <Input type="number" value={li.quantity} onChange={(e) => updateLineItem(i, 'quantity', Number(e.target.value))} className="col-span-1 h-8 text-xs bg-gray-50 border-gray-300 text-gray-900" />
                      <Input type="number" value={li.unitCost} onChange={(e) => updateLineItem(i, 'unitCost', Number(e.target.value))} className="col-span-2 h-8 text-xs bg-gray-50 border-gray-300 text-gray-900" />
                      <div className="col-span-2 text-xs font-medium text-gray-700 pl-2">{currency} {fmt(li.amount || 0)}</div>
                      <Button size="sm" variant="ghost" onClick={() => removeLineItem(i)} className="col-span-1 h-7 w-7 p-0 text-gray-400 hover:text-red-500">
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <TaxEditor taxes={taxes} onChange={setTaxes} />

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-1.5">
            <div className="flex justify-between text-sm text-gray-700">
              <span>Subtotal</span>
              <span>{currency} {fmt(b.subtotal)}</span>
            </div>
            {b.taxLines.map((t, i) => (
              <div key={i} className="flex justify-between text-sm text-gray-500">
                <span>{t.name} ({t.rate}%)</span>
                <span>{currency} {fmt(t.amount)}</span>
              </div>
            ))}
            <div className="border-t border-gray-300 pt-1.5 mt-1.5 flex justify-between text-sm font-bold text-gray-900">
              <span>Total Due</span>
              <span>{currency} {fmt(b.total)}</span>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button onClick={handleSave} disabled={isSaving} className="flex-1 bg-[#8B1538] hover:bg-[#6d1029] text-white">
              <Save className="w-4 h-4 mr-2" />
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
            <Button variant="outline" onClick={onClose} className="text-gray-700">Cancel</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CreateInvoiceDialog({ events, clients, onClose }: { events: any[]; clients: any[]; onClose: () => void }) {
  const [eventId, setEventId] = useState("");
  const [clientId, setClientId] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("NGN");
  const [type, setType] = useState("deposit");
  const [dueDate, setDueDate] = useState("");
  const [taxes, setTaxes] = useState<TaxLine[]>([...DEFAULT_TAXES]);

  const handleCurrencyChange = (cur: string) => {
    setCurrency(cur);
    setTaxes(getDefaultTaxesForCurrency(cur));
  };
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/invoices", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      toast({ title: "Invoice created" });
      onClose();
    },
    onError: () => toast({ title: "Error", description: "Failed to create invoice", variant: "destructive" }),
  });

  const handleCreate = () => {
    if (!eventId || !clientId || !amount || !dueDate) {
      toast({ title: "Missing fields", description: "Please fill in all required fields", variant: "destructive" });
      return;
    }
    createMutation.mutate({ eventId, clientId, amount: Number(amount), currency, type, dueDate, taxes });
  };

  const b = calcBreakdownWithTaxes(Number(amount) || 0, taxes);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg bg-white max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-gray-900 flex items-center gap-2">
            <Receipt className="w-5 h-5 text-[#8B1538]" />
            Manual Invoice
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="text-gray-700 text-sm">Event *</Label>
            <Select value={eventId} onValueChange={setEventId}>
              <SelectTrigger className="bg-gray-50 border-gray-300 text-gray-900 mt-1"><SelectValue placeholder="Select event" /></SelectTrigger>
              <SelectContent>
                {events.map((e: any) => (<SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-gray-700 text-sm">Client *</Label>
            <Select value={clientId} onValueChange={setClientId}>
              <SelectTrigger className="bg-gray-50 border-gray-300 text-gray-900 mt-1"><SelectValue placeholder="Select client" /></SelectTrigger>
              <SelectContent>
                {clients.map((c: any) => (<SelectItem key={c.id} value={c.id}>{c.fullName || c.full_name || c.email}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-gray-700 text-sm">Service Amount *</Label>
              <Input type="number" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} className="bg-gray-50 border-gray-300 text-gray-900 mt-1" />
            </div>
            <div>
              <Label className="text-gray-700 text-sm">Currency</Label>
              <Select value={currency} onValueChange={handleCurrencyChange}>
                <SelectTrigger className="bg-gray-50 border-gray-300 text-gray-900 mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map(c => (
                    <SelectItem key={c} value={c}>{CURRENCY_META[c].flag} {c} ({CURRENCY_META[c].symbol})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <TaxEditor taxes={taxes} onChange={setTaxes} />

          {Number(amount) > 0 && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-1.5">
              <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Invoice Breakdown</p>
              <div className="flex justify-between text-sm text-gray-700"><span>Subtotal</span><span>{currency} {fmt(b.subtotal)}</span></div>
              {b.taxLines.map((t, i) => (
                <div key={i} className="flex justify-between text-sm text-gray-500"><span>{t.name} ({t.rate}%)</span><span>{currency} {fmt(t.amount)}</span></div>
              ))}
              <div className="border-t border-gray-300 pt-1.5 mt-1.5 flex justify-between text-sm font-bold text-gray-900"><span>Total Due</span><span>{currency} {fmt(b.total)}</span></div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-gray-700 text-sm">Invoice Type *</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger className="bg-gray-50 border-gray-300 text-gray-900 mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="deposit">Deposit</SelectItem>
                  <SelectItem value="interim">Interim</SelectItem>
                  <SelectItem value="final">Final</SelectItem>
                  <SelectItem value="additional">Additional</SelectItem>
                  <SelectItem value="vendor">Vendor Payment</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-gray-700 text-sm">Due Date *</Label>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="bg-gray-50 border-gray-300 text-gray-900 mt-1" />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <Button onClick={handleCreate} disabled={createMutation.isPending} className="flex-1 bg-[#8B1538] hover:bg-[#6d1029] text-white">
              {createMutation.isPending ? "Creating..." : "Create Invoice"}
            </Button>
            <Button variant="outline" onClick={onClose} className="text-gray-700">Cancel</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
