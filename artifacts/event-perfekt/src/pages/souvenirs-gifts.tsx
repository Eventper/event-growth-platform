import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Gift, Plus, Package, Truck, CheckCircle, Clock, Search, Trash2, Pencil,
  ShoppingBag, Users, DollarSign, BarChart3, Filter, X, Printer
} from "lucide-react";
import { openPrintWindow } from "@/lib/printUtils";
import PlannerLayout from "@/components/PlannerLayout";
import { apiRequest, queryClient as qc } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

const GIFT_CATEGORIES = [
  "Party Favours",
  "Corporate Gifts",
  "Thank You Gifts",
  "VIP Gifts",
  "Welcome Packs",
  "Speaker Gifts",
  "Table Gifts",
  "Door Prizes",
  "Branded Merchandise",
  "Hampers & Baskets",
  "Custom Stationery",
  "Other",
];

const GIFT_STATUSES = [
  { value: "planning", label: "Planning", color: "bg-gray-100 text-gray-800" },
  { value: "sourcing", label: "Sourcing", color: "bg-blue-100 text-blue-800" },
  { value: "ordered", label: "Ordered", color: "bg-purple-100 text-purple-800" },
  { value: "in_production", label: "In Production", color: "bg-amber-100 text-amber-800" },
  { value: "delivered", label: "Delivered", color: "bg-green-100 text-green-800" },
  { value: "distributed", label: "Distributed", color: "bg-emerald-100 text-emerald-800" },
];

const RECIPIENT_GROUPS = [
  "All Guests",
  "VIP Guests",
  "Speakers",
  "Sponsors",
  "Staff",
  "Vendors",
  "Children",
  "Bridal Party",
  "Groomsmen",
  "Bridesmaids",
  "Family",
  "Corporate Clients",
  "Other",
];

interface GiftItem {
  id: string;
  eventId: string;
  name: string;
  description: string;
  category: string;
  quantity: number;
  unitCost: number;
  currency: string;
  totalCost: number;
  supplier: string;
  supplierContact: string;
  recipientGroup: string;
  recipientCount: number;
  status: string;
  notes: string;
  orderDate: string;
  deliveryDate: string;
  createdAt: string;
}

const fmt = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });

export default function SouvenirsGifts() {
  const [showCreate, setShowCreate] = useState(false);
  const [editingItem, setEditingItem] = useState<GiftItem | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterEvent, setFilterEvent] = useState("all");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: events = [] } = useQuery<any[]>({
    queryKey: ["/api/events"],
  });

  const { data: gifts = [], isLoading } = useQuery<GiftItem[]>({
    queryKey: ["/api/gift-items", filterEvent],
    queryFn: async () => {
      const url = filterEvent !== "all" ? `/api/gift-items?eventId=${filterEvent}` : "/api/gift-items";
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` },
      });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/gift-items/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/gift-items"] });
      toast({ title: "Gift item deleted" });
    },
  });

  const filtered = gifts.filter((g) => {
    if (searchQuery && !g.name.toLowerCase().includes(searchQuery.toLowerCase()) && !g.description?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (filterCategory !== "all" && g.category !== filterCategory) return false;
    if (filterStatus !== "all" && g.status !== filterStatus) return false;
    return true;
  });

  const totalBudget = filtered.reduce((s, g) => s + (g.totalCost || 0), 0);
  const totalItems = filtered.reduce((s, g) => s + (g.quantity || 0), 0);
  const orderedCount = filtered.filter((g) => ["ordered", "in_production", "delivered", "distributed"].includes(g.status)).length;
  const deliveredCount = filtered.filter((g) => ["delivered", "distributed"].includes(g.status)).length;

  const getStatusBadge = (status: string) => {
    const s = GIFT_STATUSES.find((gs) => gs.value === status);
    return <Badge className={s?.color || "bg-gray-100 text-gray-800"}>{s?.label || status}</Badge>;
  };

  return (
    <PlannerLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Gift className="w-7 h-7 text-[#8B1538]" />
              Souvenirs & Corporate Gifts
            </h1>
            <p className="text-sm text-gray-500 mt-1">Manage event souvenirs, party favours, corporate gifts, and giveaways</p>
          </div>
          <div className="flex gap-2">
            {filtered.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="border-gray-300 text-gray-700 hover:bg-gray-100"
                onClick={() => {
                  openPrintWindow({
                    title: "Souvenirs & Corporate Gifts",
                    stats: [
                      { label: "Gift Types", value: filtered.length },
                      { label: "Total Items", value: fmt(totalItems) },
                      { label: "Total Budget", value: fmt(totalBudget) },
                      { label: "Delivered/Ordered", value: `${deliveredCount}/${orderedCount}` },
                    ],
                    columns: [
                      { header: "Name", key: "name" },
                      { header: "Category", key: "category" },
                      { header: "Qty", key: "quantity", align: "right" },
                      { header: "Unit Cost", key: "unitCost", align: "right", format: (v: number, row: any) => `${row.currency || "NGN"} ${fmt(v)}` },
                      { header: "Total", key: "totalCost", align: "right", format: (v: number, row: any) => `${row.currency || "NGN"} ${fmt(v)}` },
                      { header: "Supplier", key: "supplier", format: (v: string) => v || "—" },
                      { header: "Recipients", key: "recipientGroup" },
                      { header: "Status", key: "status", format: (v: string) => GIFT_STATUSES.find(s => s.value === v)?.label || v },
                    ],
                    rows: filtered,
                  });
                }}
              >
                <Printer className="w-4 h-4 mr-2" /> Print
              </Button>
            )}
            <Button onClick={() => setShowCreate(true)} className="bg-[#8B1538] hover:bg-[#6d1029] text-white">
              <Plus className="w-4 h-4 mr-2" /> Add Gift Item
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-white border-gray-200">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <Package className="w-5 h-5 text-purple-700" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{filtered.length}</p>
                <p className="text-xs text-gray-500">Gift Types</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white border-gray-200">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <ShoppingBag className="w-5 h-5 text-blue-700" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{fmt(totalItems)}</p>
                <p className="text-xs text-gray-500">Total Items</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white border-gray-200">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-green-700" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{fmt(totalBudget)}</p>
                <p className="text-xs text-gray-500">Total Budget</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white border-gray-200">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                <Truck className="w-5 h-5 text-amber-700" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{deliveredCount}/{orderedCount}</p>
                <p className="text-xs text-gray-500">Delivered/Ordered</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search gifts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-white border-gray-300 text-gray-900"
            />
          </div>
          <Select value={filterEvent} onValueChange={setFilterEvent}>
            <SelectTrigger className="w-[180px] bg-white border-gray-300 text-gray-900">
              <SelectValue placeholder="All Events" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Events</SelectItem>
              {events.map((e: any) => (
                <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-[160px] bg-white border-gray-300 text-gray-900">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {GIFT_CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[140px] bg-white border-gray-300 text-gray-900">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {GIFT_STATUSES.map((s) => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Card className="bg-white border-gray-200">
          <CardHeader className="pb-3 border-b border-gray-100">
            <CardTitle className="text-gray-900 text-base flex items-center gap-2">
              <Gift className="w-5 h-5 text-[#8B1538]" />
              Gift Items ({filtered.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin w-8 h-8 border-2 border-[#8B1538] border-t-transparent rounded-full mx-auto" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12">
                <Gift className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">No gift items found</p>
                <p className="text-gray-400 text-sm mt-1">Add souvenirs, favours, or corporate gifts to get started</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {filtered.map((item) => (
                  <div key={item.id} className="p-4 hover:bg-gray-50 transition-colors group">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-1 flex-wrap">
                          <span className="font-semibold text-gray-900">{item.name}</span>
                          {getStatusBadge(item.status)}
                          <Badge variant="outline" className="text-xs text-gray-600">{item.category}</Badge>
                        </div>
                        {item.description && (
                          <p className="text-sm text-gray-500 mb-1 line-clamp-1">{item.description}</p>
                        )}
                        <div className="flex items-center gap-4 text-xs text-gray-400 flex-wrap">
                          <span className="flex items-center gap-1"><Package className="w-3 h-3" /> Qty: {item.quantity}</span>
                          <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" /> {item.currency || "NGN"} {fmt(item.unitCost)} x {item.quantity} = {item.currency || "NGN"} {fmt(item.totalCost)}</span>
                          {item.supplier && <span className="flex items-center gap-1"><Truck className="w-3 h-3" /> {item.supplier}</span>}
                          <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {item.recipientGroup}{item.recipientCount ? ` (${item.recipientCount})` : ""}</span>
                          {item.deliveryDate && <span>Delivery: {format(new Date(item.deliveryDate), "MMM d, yyyy")}</span>}
                        </div>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button size="sm" variant="outline" onClick={() => setEditingItem(item)} className="h-8 text-blue-600 border-blue-200">
                          <Pencil className="w-3 h-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => { if (confirm("Delete this gift item?")) deleteMutation.mutate(item.id); }}
                          className="h-8 text-red-600 border-red-200"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {showCreate && (
          <GiftItemDialog
            events={events}
            onClose={() => setShowCreate(false)}
            mode="create"
          />
        )}

        {editingItem && (
          <GiftItemDialog
            events={events}
            item={editingItem}
            onClose={() => setEditingItem(null)}
            mode="edit"
          />
        )}
      </div>
    </PlannerLayout>
  );
}

function GiftItemDialog({ events, item, onClose, mode }: { events: any[]; item?: GiftItem; onClose: () => void; mode: "create" | "edit" }) {
  const [name, setName] = useState(item?.name || "");
  const [description, setDescription] = useState(item?.description || "");
  const [category, setCategory] = useState(item?.category || "Party Favours");
  const [quantity, setQuantity] = useState(item?.quantity || 1);
  const [unitCost, setUnitCost] = useState(item?.unitCost || 0);
  const [currency, setCurrency] = useState(item?.currency || "NGN");
  const [supplier, setSupplier] = useState(item?.supplier || "");
  const [supplierContact, setSupplierContact] = useState(item?.supplierContact || "");
  const [recipientGroup, setRecipientGroup] = useState(item?.recipientGroup || "All Guests");
  const [recipientCount, setRecipientCount] = useState(item?.recipientCount || 0);
  const [status, setStatus] = useState(item?.status || "planning");
  const [notes, setNotes] = useState(item?.notes || "");
  const [orderDate, setOrderDate] = useState(item?.orderDate ? format(new Date(item.orderDate), "yyyy-MM-dd") : "");
  const [deliveryDate, setDeliveryDate] = useState(item?.deliveryDate ? format(new Date(item.deliveryDate), "yyyy-MM-dd") : "");
  const [eventId, setEventId] = useState(item?.eventId || "");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const totalCost = quantity * unitCost;

  const mutation = useMutation({
    mutationFn: (data: any) => {
      if (mode === "edit" && item) {
        return apiRequest("PATCH", `/api/gift-items/${item.id}`, data);
      }
      return apiRequest("POST", "/api/gift-items", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/gift-items"] });
      toast({ title: mode === "edit" ? "Gift item updated" : "Gift item created" });
      onClose();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to save gift item", variant: "destructive" });
    },
  });

  const handleSubmit = () => {
    if (!name || !eventId) {
      toast({ title: "Missing fields", description: "Please provide a name and select an event", variant: "destructive" });
      return;
    }
    mutation.mutate({
      eventId,
      name,
      description,
      category,
      quantity,
      unitCost,
      currency,
      totalCost,
      supplier,
      supplierContact,
      recipientGroup,
      recipientCount,
      status,
      notes,
      orderDate: orderDate || null,
      deliveryDate: deliveryDate || null,
    });
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-white max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-gray-900 flex items-center gap-2">
            <Gift className="w-5 h-5 text-[#8B1538]" />
            {mode === "edit" ? "Edit Gift Item" : "Add Gift Item"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="text-gray-700 text-sm">Event *</Label>
            <Select value={eventId} onValueChange={setEventId}>
              <SelectTrigger className="bg-gray-50 border-gray-300 text-gray-900 mt-1"><SelectValue placeholder="Select event" /></SelectTrigger>
              <SelectContent>
                {events.map((e: any) => (
                  <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-gray-700 text-sm">Item Name *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Custom Branded Mug" className="bg-gray-50 border-gray-300 text-gray-900 mt-1" />
            </div>
            <div>
              <Label className="text-gray-700 text-sm">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="bg-gray-50 border-gray-300 text-gray-900 mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {GIFT_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="text-gray-700 text-sm">Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Details about the gift item, specifications, colours, etc." className="bg-gray-50 border-gray-300 text-gray-900 mt-1" rows={2} />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <Label className="text-gray-700 text-sm">Quantity</Label>
              <Input type="number" value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} className="bg-gray-50 border-gray-300 text-gray-900 mt-1" />
            </div>
            <div>
              <Label className="text-gray-700 text-sm">Unit Cost</Label>
              <Input type="number" value={unitCost} onChange={(e) => setUnitCost(Number(e.target.value))} className="bg-gray-50 border-gray-300 text-gray-900 mt-1" />
            </div>
            <div>
              <Label className="text-gray-700 text-sm">Currency</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger className="bg-gray-50 border-gray-300 text-gray-900 mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="NGN">NGN (₦)</SelectItem>
                  <SelectItem value="USD">USD ($)</SelectItem>
                  <SelectItem value="GBP">GBP (£)</SelectItem>
                  <SelectItem value="EUR">EUR (€)</SelectItem>
                  <SelectItem value="GHS">GHS (₵)</SelectItem>
                  <SelectItem value="KES">KES (KSh)</SelectItem>
                  <SelectItem value="ZAR">ZAR (R)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-gray-700 text-sm">Total Cost</Label>
              <div className="mt-1 h-10 px-3 flex items-center bg-gray-100 border border-gray-300 rounded-md text-sm font-medium text-gray-900">
                {currency} {fmt(totalCost)}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-gray-700 text-sm">Supplier / Vendor</Label>
              <Input value={supplier} onChange={(e) => setSupplier(e.target.value)} placeholder="Vendor name" className="bg-gray-50 border-gray-300 text-gray-900 mt-1" />
            </div>
            <div>
              <Label className="text-gray-700 text-sm">Supplier Contact</Label>
              <Input value={supplierContact} onChange={(e) => setSupplierContact(e.target.value)} placeholder="Phone or email" className="bg-gray-50 border-gray-300 text-gray-900 mt-1" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <Label className="text-gray-700 text-sm">Recipient Group</Label>
              <Select value={recipientGroup} onValueChange={setRecipientGroup}>
                <SelectTrigger className="bg-gray-50 border-gray-300 text-gray-900 mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {RECIPIENT_GROUPS.map((g) => (
                    <SelectItem key={g} value={g}>{g}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-gray-700 text-sm">Recipient Count</Label>
              <Input type="number" value={recipientCount} onChange={(e) => setRecipientCount(Number(e.target.value))} className="bg-gray-50 border-gray-300 text-gray-900 mt-1" />
            </div>
            <div>
              <Label className="text-gray-700 text-sm">Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="bg-gray-50 border-gray-300 text-gray-900 mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {GIFT_STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-gray-700 text-sm">Order Date</Label>
              <Input type="date" value={orderDate} onChange={(e) => setOrderDate(e.target.value)} className="bg-gray-50 border-gray-300 text-gray-900 mt-1" />
            </div>
            <div>
              <Label className="text-gray-700 text-sm">Expected Delivery Date</Label>
              <Input type="date" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} className="bg-gray-50 border-gray-300 text-gray-900 mt-1" />
            </div>
          </div>

          <div>
            <Label className="text-gray-700 text-sm">Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any additional notes or special instructions..." className="bg-gray-50 border-gray-300 text-gray-900 mt-1" rows={2} />
          </div>

          <div className="flex gap-3 pt-2">
            <Button onClick={handleSubmit} disabled={mutation.isPending} className="flex-1 bg-[#8B1538] hover:bg-[#6d1029] text-white">
              {mutation.isPending ? "Saving..." : mode === "edit" ? "Update Gift Item" : "Add Gift Item"}
            </Button>
            <Button variant="outline" onClick={onClose} className="text-gray-700">Cancel</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
