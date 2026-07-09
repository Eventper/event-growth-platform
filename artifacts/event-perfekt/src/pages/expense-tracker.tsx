import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import PlannerSidebar from "@/components/PlannerSidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  Trash2,
  Receipt,
  Upload,
  DollarSign,
  Image as ImageIcon,
  FileText,
  Filter,
  Printer,
} from "lucide-react";
import { openPrintWindow } from "@/lib/printUtils";

const CATEGORIES = [
  { value: "venue", label: "Venue", color: "bg-blue-500" },
  { value: "catering", label: "Catering", color: "bg-orange-500" },
  { value: "decoration", label: "Decoration", color: "bg-pink-500" },
  { value: "transport", label: "Transport", color: "bg-green-500" },
  { value: "staff", label: "Staff", color: "bg-purple-500" },
  { value: "miscellaneous", label: "Misc", color: "bg-gray-500" },
];

function getCategoryInfo(cat: string) {
  return CATEGORIES.find((c) => c.value === cat) || CATEGORIES[5];
}

export default function ExpenseTracker() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [filterEvent, setFilterEvent] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");

  const [vendorName, setVendorName] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("NGN");
  const [category, setCategory] = useState("miscellaneous");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [eventId, setEventId] = useState("");
  const [notes, setNotes] = useState("");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);

  const { data: expenses = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/expenses"],
  });

  const { data: events = [] } = useQuery<any[]>({
    queryKey: ["/api/events"],
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const formData = new FormData();
      formData.append("vendor_name", vendorName);
      formData.append("amount", amount);
      formData.append("currency", currency);
      formData.append("category", category);
      formData.append("date", date);
      if (eventId) formData.append("event_id", eventId);
      if (notes) formData.append("notes", notes);
      if (receiptFile) formData.append("receipt", receiptFile);
      return apiRequest("POST", "/api/expenses", formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
      toast({ title: "Expense added successfully" });
      resetForm();
      setDialogOpen(false);
    },
    onError: (err: any) => {
      toast({ title: "Failed to add expense", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/expenses/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
      toast({ title: "Expense deleted" });
    },
  });

  function resetForm() {
    setVendorName("");
    setAmount("");
    setCurrency("NGN");
    setCategory("miscellaneous");
    setDate(new Date().toISOString().split("T")[0]);
    setEventId("");
    setNotes("");
    setReceiptFile(null);
  }

  const filtered = expenses.filter((e: any) => {
    if (filterEvent !== "all" && e.event_id !== filterEvent) return false;
    if (filterCategory !== "all" && e.category !== filterCategory) return false;
    return true;
  });

  const totalByCategory = CATEGORIES.map((cat) => {
    const items = filtered.filter((e: any) => e.category === cat.value);
    const total = items.reduce((s: number, e: any) => s + parseFloat(e.amount || "0"), 0);
    return { ...cat, total, count: items.length };
  }).filter((c) => c.count > 0);

  const grandTotal = filtered.reduce((s: number, e: any) => s + parseFloat(e.amount || "0"), 0);

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-[#16213e] via-[#1a1a2e] to-[#0f3460]">
      <PlannerSidebar />
      <main className="flex-1 lg:ml-60 p-6 space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white font-['Poppins']">Expense Receipt Tracker</h1>
            <p className="text-gray-400 text-sm">Track and manage event expense receipts</p>
          </div>
          <div className="flex items-center gap-2">
            {filtered.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="border-white/20 text-white hover:bg-white/10"
                onClick={() => {
                  openPrintWindow({
                    title: "Expense Receipt Tracker",
                    stats: [
                      { label: "Total Expenses", value: grandTotal.toLocaleString("en", { minimumFractionDigits: 2 }) },
                      { label: "Total Receipts", value: filtered.length },
                      { label: "Categories Used", value: totalByCategory.length },
                      { label: "With Receipts", value: filtered.filter((e: any) => e.receipt_url).length },
                    ],
                    columns: [
                      { header: "Vendor", key: "vendor" },
                      { header: "Amount", key: "amount", align: "right" },
                      { header: "Category", key: "category" },
                      { header: "Date", key: "date" },
                      { header: "Event", key: "event" },
                      { header: "Notes", key: "notes" },
                    ],
                    rows: filtered.map((e: any) => {
                      const catInfo = getCategoryInfo(e.category);
                      const currencySymbol = e.currency === "NGN" ? "₦" : e.currency === "GBP" ? "£" : e.currency === "USD" ? "$" : "€";
                      const eventName = events.find((ev: any) => String(ev.id) === String(e.event_id))?.name || "-";
                      return {
                        vendor: e.vendor_name,
                        amount: `${currencySymbol}${parseFloat(e.amount).toLocaleString("en", { minimumFractionDigits: 2 })}`,
                        category: catInfo.label,
                        date: e.date ? new Date(e.date).toLocaleDateString() : "-",
                        event: eventName,
                        notes: e.notes || "-",
                      };
                    }),
                  });
                }}
              >
                <Printer className="w-4 h-4 mr-2" />
                Print
              </Button>
            )}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-[#8B1538] hover:bg-[#a91d45] text-white">
                  <Plus className="w-4 h-4 mr-2" /> Add Expense
                </Button>
              </DialogTrigger>
            <DialogContent className="bg-[#1a1a2e] border-white/10 text-white max-w-md">
              <DialogHeader>
                <DialogTitle className="text-white">Add New Expense</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-2">
                <div>
                  <Label className="text-gray-300">Vendor Name *</Label>
                  <Input value={vendorName} onChange={(e) => setVendorName(e.target.value)} className="bg-white/10 border-white/20 text-white" placeholder="e.g. ABC Catering" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-gray-300">Amount *</Label>
                    <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="bg-white/10 border-white/20 text-white" placeholder="0.00" />
                  </div>
                  <div>
                    <Label className="text-gray-300">Currency</Label>
                    <Select value={currency} onValueChange={setCurrency}>
                      <SelectTrigger className="bg-white/10 border-white/20 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NGN">NGN (₦)</SelectItem>
                        <SelectItem value="GBP">GBP (£)</SelectItem>
                        <SelectItem value="USD">USD ($)</SelectItem>
                        <SelectItem value="EUR">EUR (€)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label className="text-gray-300">Category *</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger className="bg-white/10 border-white/20 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => (
                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-gray-300">Date *</Label>
                  <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="bg-white/10 border-white/20 text-white" />
                </div>
                <div>
                  <Label className="text-gray-300">Event</Label>
                  <Select value={eventId || "none"} onValueChange={(v) => setEventId(v === "none" ? "" : v)}>
                    <SelectTrigger className="bg-white/10 border-white/20 text-white">
                      <SelectValue placeholder="Select event (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No event</SelectItem>
                      {events.map((ev: any) => (
                        <SelectItem key={ev.id} value={String(ev.id)}>{ev.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-gray-300">Notes</Label>
                  <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="bg-white/10 border-white/20 text-white" placeholder="Optional notes..." rows={2} />
                </div>
                <div>
                  <Label className="text-gray-300">Receipt Image/PDF</Label>
                  <div className="mt-1">
                    <label className="flex items-center gap-2 cursor-pointer bg-white/10 border border-dashed border-white/30 rounded-md px-4 py-3 hover:bg-white/15 transition-colors">
                      <Upload className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-300">{receiptFile ? receiptFile.name : "Choose file..."}</span>
                      <input type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => setReceiptFile(e.target.files?.[0] || null)} />
                    </label>
                  </div>
                </div>
                <Button
                  className="w-full bg-[#8B1538] hover:bg-[#a91d45]"
                  disabled={!vendorName || !amount || !date || createMutation.isPending}
                  onClick={() => createMutation.mutate()}
                >
                  {createMutation.isPending ? "Saving..." : "Save Expense"}
                </Button>
              </div>
            </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-[#8B1538]/30">
                  <DollarSign className="w-5 h-5 text-[#8B1538]" />
                </div>
                <div>
                  <p className="text-xs text-gray-400">Total Expenses</p>
                  <p className="text-xl font-bold text-white">{grandTotal.toLocaleString("en", { minimumFractionDigits: 2 })}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/30">
                  <Receipt className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-xs text-gray-400">Total Receipts</p>
                  <p className="text-xl font-bold text-white">{filtered.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/30">
                  <FileText className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <p className="text-xs text-gray-400">Categories Used</p>
                  <p className="text-xl font-bold text-white">{totalByCategory.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-orange-500/30">
                  <ImageIcon className="w-5 h-5 text-orange-400" />
                </div>
                <div>
                  <p className="text-xs text-gray-400">With Receipts</p>
                  <p className="text-xl font-bold text-white">{filtered.filter((e: any) => e.receipt_url).length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {totalByCategory.length > 0 && (
          <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-white text-sm font-medium">Expenses by Category</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {totalByCategory.map((cat) => {
                  const pct = grandTotal > 0 ? (cat.total / grandTotal) * 100 : 0;
                  return (
                    <div key={cat.value} className="flex items-center gap-3">
                      <span className="text-gray-300 text-sm w-24">{cat.label}</span>
                      <div className="flex-1 h-4 bg-white/10 rounded-full overflow-hidden">
                        <div className={`h-full ${cat.color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-white text-sm font-medium w-28 text-right">{cat.total.toLocaleString("en", { minimumFractionDigits: 2 })}</span>
                      <span className="text-gray-400 text-xs w-12 text-right">{pct.toFixed(0)}%</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex flex-wrap gap-3 items-center">
          <Filter className="w-4 h-4 text-gray-400" />
          <Select value={filterEvent} onValueChange={setFilterEvent}>
            <SelectTrigger className="w-48 bg-white/10 border-white/20 text-white text-sm">
              <SelectValue placeholder="Filter by event" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Events</SelectItem>
              {events.map((ev: any) => (
                <SelectItem key={ev.id} value={String(ev.id)}>{ev.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-44 bg-white/10 border-white/20 text-white text-sm">
              <SelectValue placeholder="Filter by category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {CATEGORIES.map((c) => (
                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-gray-400">Loading expenses...</div>
        ) : filtered.length === 0 ? (
          <Card className="bg-white/5 border-white/10">
            <CardContent className="py-12 text-center">
              <Receipt className="w-12 h-12 mx-auto text-gray-500 mb-3" />
              <p className="text-gray-400">No expenses yet. Click "Add Expense" to get started.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((expense: any) => {
              const catInfo = getCategoryInfo(expense.category);
              const eventName = events.find((ev: any) => String(ev.id) === String(expense.event_id))?.name;
              const currencySymbol = expense.currency === "NGN" ? "₦" : expense.currency === "GBP" ? "£" : expense.currency === "USD" ? "$" : "€";
              return (
                <Card key={expense.id} className="bg-white/5 border-white/10 backdrop-blur-sm hover:bg-white/8 transition-colors group">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-white font-medium truncate">{expense.vendor_name}</h3>
                        <p className="text-lg font-bold text-white">{currencySymbol}{parseFloat(expense.amount).toLocaleString("en", { minimumFractionDigits: 2 })}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 hover:bg-red-500/20 h-8 w-8"
                        onClick={() => deleteMutation.mutate(expense.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2 mb-2">
                      <Badge variant="outline" className={`${catInfo.color} text-white border-0 text-xs`}>{catInfo.label}</Badge>
                      {eventName && <Badge variant="outline" className="border-white/20 text-gray-300 text-xs">{eventName}</Badge>}
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-400">
                      <span>{expense.date ? new Date(expense.date).toLocaleDateString() : "—"}</span>
                      {expense.receipt_url && (
                        <a href={expense.receipt_url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-blue-400 hover:text-blue-300">
                          <ImageIcon className="w-3 h-3" /> View receipt
                        </a>
                      )}
                    </div>
                    {expense.notes && <p className="text-xs text-gray-500 mt-2 truncate">{expense.notes}</p>}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}