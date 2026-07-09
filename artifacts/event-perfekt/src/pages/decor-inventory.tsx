import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import PlannerLayout from "@/components/PlannerLayout";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Package, Plus, Search, Edit2, Trash2, Printer, ArrowRightLeft,
  Palette, Calendar, Loader2, X, Upload,
  CheckCircle, AlertCircle, Clock, ArrowLeft, Hash,
  ShieldCheck, FileText, ArrowDownToLine, ArrowUpFromLine, UserCheck,
  AlertTriangle, ClipboardList, Users, Briefcase, MapPin, DollarSign,
  Send, ThumbsDown, ThumbsUp, Warehouse, ClipboardCheck,
} from "lucide-react";
import { openPrintWindow } from "@/lib/printUtils";

interface DecorItem {
  id: number;
  name: string;
  category: string;
  colour: string | null;
  description: string | null;
  quantity: number;
  available_quantity: number;
  unit_cost: string | null;
  rental_price: string | null;
  condition: string;
  location: string | null;
  image_url: string | null;
  notes: string | null;
  status: string;
  created_at: string;
}

interface Checkout {
  id: number;
  inventory_id: number;
  event_id: string | null;
  event_name: string | null;
  quantity: number;
  checked_out_date: string | null;
  expected_return_date: string | null;
  actual_return_date: string | null;
  checked_out_by: string | null;
  return_condition: string | null;
  charge_amount: string | null;
  notes: string | null;
  status: string;
  created_at: string;
  reference_number: string | null;
  condition_at_checkout: string | null;
  approved_by: string | null;
  approval_date: string | null;
  checked_in_by: string | null;
  deposit_amount: string | null;
  damage_cost: string | null;
  damage_notes: string | null;
  client_name: string | null;
  planner_name: string | null;
  item_name?: string;
  item_category?: string;
  request_type?: string | null;
  requested_by_user_id?: string | null;
  requested_by_name?: string | null;
  manager_approved_by?: string | null;
  manager_approval_date?: string | null;
  manager_notes?: string | null;
  warehouse_approved_by?: string | null;
  warehouse_approval_date?: string | null;
  warehouse_notes?: string | null;
}

const CATEGORIES = [
  "Tablecloths & Linens", "Vases", "Flowers & Florals", "Lighting", "Cake & Dessert Tables",
  "Centrepieces", "Chairs & Covers", "Backdrops", "Candles & Holders", "Tableware",
  "Signage & Boards", "Draping & Fabric", "Arches & Stands", "Props & Accessories",
  "Balloons", "Ribbons & Bows", "Napkins & Rings", "Runners & Overlays", "Other",
];

const COLOURS = [
  "White", "Ivory", "Gold", "Silver", "Rose Gold", "Burgundy", "Navy Blue",
  "Blush Pink", "Red", "Black", "Green", "Purple", "Royal Blue", "Champagne",
  "Coral", "Teal", "Peach", "Lilac", "Bronze", "Copper", "Clear", "Multi-colour", "Other",
];

const CONDITIONS = ["new", "excellent", "good", "fair", "worn", "damaged"];

const conditionColor = (c: string) => {
  const map: Record<string, string> = {
    new: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    excellent: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    good: "bg-green-500/20 text-green-300 border-green-500/30",
    fair: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
    worn: "bg-orange-500/20 text-orange-300 border-orange-500/30",
    damaged: "bg-red-500/20 text-red-300 border-red-500/30",
  };
  return map[c] || "bg-gray-500/20 text-gray-300 border-gray-500/30";
};

const statusColor = (s: string) => {
  const map: Record<string, string> = {
    checked_out: "bg-amber-500/20 text-amber-300 border-amber-500/30",
    returned: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    damaged: "bg-red-500/20 text-red-300 border-red-500/30",
    pending_manager: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
    manager_approved: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    manager_rejected: "bg-red-500/20 text-red-300 border-red-500/30",
    warehouse_rejected: "bg-orange-500/20 text-orange-300 border-orange-500/30",
    warehouse_approved: "bg-teal-500/20 text-teal-300 border-teal-500/30",
  };
  return map[s] || "bg-gray-500/20 text-gray-300 border-gray-500/30";
};

const statusLabel = (s: string) => {
  const map: Record<string, string> = {
    checked_out: "Checked Out",
    returned: "Returned",
    damaged: "Returned (Damaged)",
    pending_manager: "Awaiting Manager",
    manager_approved: "Manager Approved",
    manager_rejected: "Manager Rejected",
    warehouse_rejected: "Warehouse Rejected",
    warehouse_approved: "Warehouse Approved",
  };
  return map[s] || s;
};

const fmtDate = (d: string | null | undefined) => {
  if (!d) return "-";
  try { return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }); } catch { return d; }
};

const fmtMoney = (v: string | number | null) => {
  const n = parseFloat(String(v || "0"));
  return isNaN(n) ? "0.00" : n.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export default function DecorInventory() {
  const { toast } = useToast();
  const { user } = useAuth();
  const userRole = user?.role || "planner";
  const isManagerOrAdmin = ["manager", "admin", "planner"].includes(userRole);
  const isWarehouseManager = ["warehouse_manager", "admin"].includes(userRole);
  const isAdmin = userRole === "admin";
  const isPlanner = userRole === "planner";

  const [activeTab, setActiveTab] = useState("checkouts");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [checkoutFilterStatus, setCheckoutFilterStatus] = useState("all");

  const [showItemForm, setShowItemForm] = useState(false);
  const [editingItem, setEditingItem] = useState<DecorItem | null>(null);
  const [showCheckoutForm, setShowCheckoutForm] = useState(false);
  const [showReturnDialog, setShowReturnDialog] = useState(false);
  const [returnCheckout, setReturnCheckout] = useState<Checkout | null>(null);
  const [detailCheckout, setDetailCheckout] = useState<Checkout | null>(null);
  const [itemHistory, setItemHistory] = useState<{ item: DecorItem; show: boolean } | null>(null);

  const [itemName, setItemName] = useState("");
  const [itemCategory, setItemCategory] = useState("");
  const [itemColour, setItemColour] = useState("");
  const [itemDescription, setItemDescription] = useState("");
  const [itemQuantity, setItemQuantity] = useState("1");
  const [itemUnitCost, setItemUnitCost] = useState("");
  const [itemRentalPrice, setItemRentalPrice] = useState("");
  const [itemCondition, setItemCondition] = useState("good");
  const [itemLocation, setItemLocation] = useState("");
  const [itemNotes, setItemNotes] = useState("");
  const [itemImageUrl, setItemImageUrl] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);

  const [coInventoryId, setCoInventoryId] = useState("");
  const [coQuantity, setCoQuantity] = useState("1");
  const [coEventName, setCoEventName] = useState("");
  const [coClientName, setCoClientName] = useState("");
  const [coPlannerName, setCoPlannerName] = useState("");
  const [coCheckedOutBy, setCoCheckedOutBy] = useState("");
  const [coApprovedBy, setCoApprovedBy] = useState("");
  const [coCondition, setCoCondition] = useState("good");
  const [coCheckoutDate, setCoCheckoutDate] = useState("");
  const [coReturnDate, setCoReturnDate] = useState("");
  const [coChargeAmount, setCoChargeAmount] = useState("");
  const [coDepositAmount, setCoDepositAmount] = useState("");
  const [coNotes, setCoNotes] = useState("");

  const [retCheckedInBy, setRetCheckedInBy] = useState("");
  const [retCondition, setRetCondition] = useState("good");
  const [retDamageNotes, setRetDamageNotes] = useState("");
  const [retDamageCost, setRetDamageCost] = useState("");

  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [approveCheckout, setApproveCheckout] = useState<Checkout | null>(null);
  const [approverName, setApproverName] = useState("");

  // --- Planner request flow state ---
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [reqInventoryId, setReqInventoryId] = useState("");
  const [reqQuantity, setReqQuantity] = useState("1");
  const [reqEventId, setReqEventId] = useState("");
  const [reqReturnDate, setReqReturnDate] = useState("");
  const [reqNotes, setReqNotes] = useState("");

  // --- Manager/Warehouse approval action state ---
  const [showManagerActionDialog, setShowManagerActionDialog] = useState(false);
  const [showWarehouseActionDialog, setShowWarehouseActionDialog] = useState(false);
  const [actionRequest, setActionRequest] = useState<Checkout | null>(null);
  const [actionNotes, setActionNotes] = useState("");

  const { data: items = [], isLoading: loadingItems } = useQuery<DecorItem[]>({ queryKey: ["/api/decor-inventory"] });
  const { data: checkouts = [], isLoading: loadingCheckouts } = useQuery<Checkout[]>({ queryKey: ["/api/decor-checkouts"] });
  const { data: events = [] } = useQuery<any[]>({ queryKey: ["/api/events"] });
  const { data: myRequests = [], isLoading: loadingMyRequests } = useQuery<Checkout[]>({ queryKey: ["/api/decor-requests/my"] });
  const { data: managerQueue = [], isLoading: loadingManagerQueue } = useQuery<Checkout[]>({ queryKey: ["/api/decor-requests/pending-manager"], enabled: isManagerOrAdmin });
  const { data: warehouseQueue = [], isLoading: loadingWarehouseQueue } = useQuery<Checkout[]>({ queryKey: ["/api/decor-requests/pending-warehouse"], enabled: isWarehouseManager });

  const createItemMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/decor-inventory", data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/decor-inventory"] }); toast({ title: "Item Added" }); resetItemForm(); },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const updateItemMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => apiRequest("PATCH", `/api/decor-inventory/${id}`, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/decor-inventory"] }); toast({ title: "Item Updated" }); resetItemForm(); },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteItemMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/decor-inventory/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/decor-inventory"] }); toast({ title: "Item Removed" }); },
  });

  const createCheckoutMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/decor-checkouts", data),
    onSuccess: (co: Checkout) => {
      queryClient.invalidateQueries({ queryKey: ["/api/decor-checkouts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/decor-inventory"] });
      toast({ title: "Item Checked Out", description: `Reference: ${co.reference_number}` });
      setShowCheckoutForm(false);
      resetCheckoutForm();
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const approveCheckoutMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => apiRequest("PATCH", `/api/decor-checkouts/${id}/approve`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/decor-checkouts"] });
      toast({ title: "Checkout Approved" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const returnCheckoutMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => apiRequest("PATCH", `/api/decor-checkouts/${id}/return`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/decor-checkouts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/decor-inventory"] });
      toast({ title: "Item Returned" });
      setShowReturnDialog(false);
      setReturnCheckout(null);
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const createRequestMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/decor-requests", data),
    onSuccess: (req: Checkout) => {
      queryClient.invalidateQueries({ queryKey: ["/api/decor-requests/my"] });
      toast({ title: "Request Submitted", description: `Reference: ${req.reference_number} — awaiting manager approval` });
      setShowRequestForm(false);
      setReqInventoryId(""); setReqQuantity("1"); setReqEventId(""); setReqReturnDate(""); setReqNotes("");
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const managerApproveMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => apiRequest("PATCH", `/api/decor-requests/${id}/manager-approve`, data),
    onSuccess: (_data: any, vars: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/decor-requests/pending-manager"] });
      queryClient.invalidateQueries({ queryKey: ["/api/decor-requests/pending-warehouse"] });
      queryClient.invalidateQueries({ queryKey: ["/api/decor-requests/my"] });
      const action = vars.data?.action === 'approve' ? "Approved" : "Rejected";
      toast({ title: `Request ${action}` });
      setShowManagerActionDialog(false);
      setActionRequest(null);
      setActionNotes("");
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const warehouseApproveMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => apiRequest("PATCH", `/api/decor-requests/${id}/warehouse-approve`, data),
    onSuccess: (_data: any, vars: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/decor-requests/pending-warehouse"] });
      queryClient.invalidateQueries({ queryKey: ["/api/decor-requests/my"] });
      queryClient.invalidateQueries({ queryKey: ["/api/decor-checkouts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/decor-inventory"] });
      const action = vars.data?.action === 'approve' ? "Approved — item checked out" : "Rejected";
      toast({ title: `Warehouse ${action}` });
      setShowWarehouseActionDialog(false);
      setActionRequest(null);
      setActionNotes("");
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const resetItemForm = () => {
    setShowItemForm(false); setEditingItem(null);
    setItemName(""); setItemCategory(""); setItemColour(""); setItemDescription("");
    setItemQuantity("1"); setItemUnitCost(""); setItemRentalPrice("");
    setItemCondition("good"); setItemLocation(""); setItemNotes(""); setItemImageUrl("");
  };

  const resetCheckoutForm = () => {
    setCoInventoryId(""); setCoQuantity("1"); setCoEventName(""); setCoClientName("");
    setCoPlannerName(""); setCoCheckedOutBy(""); setCoApprovedBy(""); setCoCondition("good");
    setCoCheckoutDate(""); setCoReturnDate(""); setCoChargeAmount(""); setCoDepositAmount(""); setCoNotes("");
  };

  const openEditItem = (item: DecorItem) => {
    setEditingItem(item); setItemName(item.name); setItemCategory(item.category);
    setItemColour(item.colour || ""); setItemDescription(item.description || "");
    setItemQuantity(String(item.quantity)); setItemUnitCost(item.unit_cost || "");
    setItemRentalPrice(item.rental_price || ""); setItemCondition(item.condition);
    setItemLocation(item.location || ""); setItemNotes(item.notes || "");
    setItemImageUrl(item.image_url || ""); setShowItemForm(true);
  };

  const handleSubmitItem = () => {
    if (!itemName || !itemCategory) { toast({ title: "Required", description: "Name and category are required", variant: "destructive" }); return; }
    const data = {
      name: itemName, category: itemCategory, colour: itemColour || null,
      description: itemDescription || null, quantity: parseInt(itemQuantity) || 1,
      unit_cost: parseFloat(itemUnitCost) || 0, rental_price: parseFloat(itemRentalPrice) || 0,
      condition: itemCondition, location: itemLocation || null, notes: itemNotes || null,
      image_url: itemImageUrl || null,
    };
    if (editingItem) updateItemMutation.mutate({ id: editingItem.id, data });
    else createItemMutation.mutate(data);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      const token = localStorage.getItem('token') || localStorage.getItem('auth_token');
      const res = await fetch('/api/decor-inventory/upload', {
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        body: formData,
      });
      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json();
      setItemImageUrl(data.image_url);
      toast({ title: "Image Uploaded" });
    } catch (err: any) {
      toast({ title: "Upload Error", description: err.message, variant: "destructive" });
    } finally {
      setUploadingImage(false);
    }
  };

  const handleCreateCheckout = () => {
    if (!coInventoryId || !coCheckedOutBy) {
      toast({ title: "Required", description: "Select an item and enter who is checking out", variant: "destructive" }); return;
    }
    const inv = items.find(i => String(i.id) === coInventoryId);
    createCheckoutMutation.mutate({
      inventory_id: parseInt(coInventoryId),
      quantity: parseInt(coQuantity) || 1,
      event_name: coEventName || null,
      client_name: coClientName || null,
      planner_name: coPlannerName || null,
      checked_out_by: coCheckedOutBy,
      approved_by: coApprovedBy || null,
      condition_at_checkout: coCondition,
      checked_out_date: coCheckoutDate || new Date().toISOString().split("T")[0],
      expected_return_date: coReturnDate || null,
      charge_amount: parseFloat(coChargeAmount) || (inv ? parseFloat(inv.rental_price || "0") * (parseInt(coQuantity) || 1) : 0),
      deposit_amount: parseFloat(coDepositAmount) || 0,
      notes: coNotes || null,
    });
  };

  const handleReturn = () => {
    if (!returnCheckout || !retCheckedInBy) {
      toast({ title: "Required", description: "Enter who is checking this item back in", variant: "destructive" }); return;
    }
    returnCheckoutMutation.mutate({
      id: returnCheckout.id,
      data: {
        checked_in_by: retCheckedInBy,
        return_condition: retCondition,
        damage_notes: retDamageNotes || null,
        damage_cost: parseFloat(retDamageCost) || 0,
      },
    });
  };

  const openReturnDialog = (co: Checkout) => {
    setReturnCheckout(co);
    setReturnByFields();
    setShowReturnDialog(true);
  };

  const setReturnByFields = () => {
    setRetCheckedInBy(""); setRetCondition("good"); setRetDamageNotes(""); setRetDamageCost("");
  };

  const handleApprove = (co: Checkout) => {
    setApproveCheckout(co);
    setApproverName("");
    setShowApproveDialog(true);
  };

  const submitApproval = () => {
    if (!approveCheckout || !approverName.trim()) return;
    approveCheckoutMutation.mutate({ id: approveCheckout.id, data: { approved_by: approverName.trim() } });
    setShowApproveDialog(false);
    setApproveCheckout(null);
    setApproverName("");
  };

  const isOverdue = (co: Checkout) => co.status === "checked_out" && co.expected_return_date && new Date(co.expected_return_date) < new Date();

  const filteredItems = items.filter(item => {
    const matchesSearch = !searchQuery || item.name.toLowerCase().includes(searchQuery.toLowerCase()) || item.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = filterCategory === "all" || item.category === filterCategory;
    return matchesSearch && matchesCat;
  });

  const filteredCheckouts = checkouts.filter(co => checkoutFilterStatus === "all" || co.status === checkoutFilterStatus);

  const stats = {
    totalItems: items.length,
    totalStock: items.reduce((sum, i) => sum + i.quantity, 0),
    checkedOut: items.reduce((sum, i) => sum + (i.quantity - i.available_quantity), 0),
    totalValue: items.reduce((sum, i) => sum + (parseFloat(i.unit_cost || "0") * i.quantity), 0),
    totalCheckouts: checkouts.length,
    activeCheckouts: checkouts.filter(co => co.status === "checked_out").length,
    overdueCheckouts: checkouts.filter(co => isOverdue(co)).length,
    pendingApproval: checkouts.filter(co => co.status === "checked_out" && !co.approved_by).length,
  };

  const itemCheckoutHistory = (itemId: number) => checkouts.filter(co => co.inventory_id === itemId);

  const printCheckoutReceipt = (co: Checkout) => {
    const inv = items.find(i => i.id === co.inventory_id);
    openPrintWindow({
      title: `Checkout Receipt — ${co.reference_number}`,
      customHtml: `
        <div style="border:2px solid #330311; border-radius:8px; padding:24px;">
          <div style="display:flex; justify-content:space-between; margin-bottom:16px;">
            <div><strong style="font-size:18px; color:#330311;">DECOR INVENTORY — CHECKOUT RECEIPT</strong></div>
            <div style="text-align:right;"><strong>Ref:</strong> ${co.reference_number || "-"}</div>
          </div>
          <hr style="border:1px solid #eee; margin:12px 0;" />
          <table style="width:100%; border-collapse:collapse; font-size:14px; margin-bottom:16px;">
            <tr><td style="padding:4px 0; width:30%; color:#666;">Item</td><td style="padding:4px 0; font-weight:bold;">${co.item_name || inv?.name || "-"}</td>
                <td style="padding:4px 0; width:30%; color:#666;">Category</td><td style="padding:4px 0;">${co.item_category || inv?.category || "-"}</td></tr>
            <tr><td style="padding:4px 0; color:#666;">Quantity</td><td style="padding:4px 0; font-weight:bold;">${co.quantity}</td>
                <td style="padding:4px 0; color:#666;">Condition at Checkout</td><td style="padding:4px 0;">${co.condition_at_checkout || "-"}</td></tr>
            <tr><td style="padding:4px 0; color:#666;">Client</td><td style="padding:4px 0; font-weight:bold;">${co.client_name || "-"}</td>
                <td style="padding:4px 0; color:#666;">Event</td><td style="padding:4px 0;">${co.event_name || "-"}</td></tr>
            <tr><td style="padding:4px 0; color:#666;">Planner (Accountable)</td><td style="padding:4px 0; font-weight:bold;">${co.planner_name || "-"}</td>
                <td style="padding:4px 0; color:#666;">Checked Out By</td><td style="padding:4px 0; font-weight:bold;">${co.checked_out_by || "-"}</td></tr>
            <tr><td style="padding:4px 0; color:#666;">Checkout Date</td><td style="padding:4px 0;">${fmtDate(co.checked_out_date)}</td>
                <td style="padding:4px 0; color:#666;">Expected Return</td><td style="padding:4px 0; font-weight:bold;">${fmtDate(co.expected_return_date)}</td></tr>
          </table>
          <div style="display:flex; gap:30px; margin-bottom:16px; padding:12px; background:#f8f8f8; border-radius:4px;">
            <div><strong>Charge:</strong> £${fmtMoney(co.charge_amount)}</div>
            <div><strong>Deposit:</strong> £${fmtMoney(co.deposit_amount)}</div>
            <div><strong>Balance:</strong> £${fmtMoney(parseFloat(co.charge_amount || "0") - parseFloat(co.deposit_amount || "0"))}</div>
          </div>
          <table style="width:100%; border-collapse:collapse; font-size:14px; margin-bottom:20px;">
            <tr><td style="padding:4px 0; width:40%; color:#666;">Approved/Authorised By</td><td style="padding:4px 0; font-weight:bold;">${co.approved_by || "Pending Approval"}</td></tr>
            ${co.approval_date ? `<tr><td style="padding:4px 0; color:#666;">Approval Date</td><td style="padding:4px 0;">${fmtDate(co.approval_date)}</td></tr>` : ""}
          </table>
          ${co.notes ? `<div style="margin-bottom:16px; padding:10px; background:#f8f8f8; border-radius:4px; font-size:13px;"><strong>Notes:</strong> ${co.notes}</div>` : ""}
          <div style="display:flex; gap:40px; margin-top:30px;">
            <div style="flex:1; text-align:center;"><div style="border-top:2px solid #333; margin-top:50px; padding-top:8px; font-size:12px;">Checked Out By (Signature)</div></div>
            <div style="flex:1; text-align:center;"><div style="border-top:2px solid #333; margin-top:50px; padding-top:8px; font-size:12px;">Authorised By (Signature)</div></div>
          </div>
        </div>
      `,
    });
  };

  const printReturnReceipt = (co: Checkout) => {
    const inv = items.find(i => i.id === co.inventory_id);
    openPrintWindow({
      title: `Return Receipt — ${co.reference_number}`,
      customHtml: `
        <div style="border:2px solid #330311; border-radius:8px; padding:24px;">
          <div style="display:flex; justify-content:space-between; margin-bottom:16px;">
            <div><strong style="font-size:18px; color:#330311;">DECOR INVENTORY — RETURN RECEIPT</strong></div>
            <div style="text-align:right;"><strong>Ref:</strong> ${co.reference_number || "-"}</div>
          </div>
          <hr style="border:1px solid #eee; margin:12px 0;" />
          <table style="width:100%; border-collapse:collapse; font-size:14px; margin-bottom:16px;">
            <tr><td style="padding:4px 0; width:30%; color:#666;">Item</td><td style="padding:4px 0; font-weight:bold;">${co.item_name || inv?.name || "-"}</td>
                <td style="padding:4px 0; width:30%; color:#666;">Quantity</td><td style="padding:4px 0;">${co.quantity}</td></tr>
            <tr><td style="padding:4px 0; color:#666;">Condition at Checkout</td><td style="padding:4px 0;">${co.condition_at_checkout || "-"}</td>
                <td style="padding:4px 0; color:#666;">Condition on Return</td><td style="padding:4px 0; font-weight:bold; ${co.return_condition === "damaged" ? "color:#c00;" : ""}">${co.return_condition || "-"}</td></tr>
            <tr><td style="padding:4px 0; color:#666;">Client</td><td style="padding:4px 0;">${co.client_name || "-"}</td>
                <td style="padding:4px 0; color:#666;">Event</td><td style="padding:4px 0;">${co.event_name || "-"}</td></tr>
            <tr><td style="padding:4px 0; color:#666;">Checkout Date</td><td style="padding:4px 0;">${fmtDate(co.checked_out_date)}</td>
                <td style="padding:4px 0; color:#666;">Returned Date</td><td style="padding:4px 0;">${fmtDate(co.actual_return_date)}</td></tr>
          </table>
          <div style="display:flex; gap:30px; margin-bottom:16px; padding:12px; background:#f8f8f8; border-radius:4px;">
            <div><strong>Charge:</strong> £${fmtMoney(co.charge_amount)}</div>
            <div><strong>Deposit:</strong> £${fmtMoney(co.deposit_amount)}</div>
            <div><strong style="color:#c00;">Damage Cost:</strong> £${fmtMoney(co.damage_cost)}</div>
            <div><strong>Net Settlement:</strong> £${fmtMoney(parseFloat(co.charge_amount || "0") - parseFloat(co.deposit_amount || "0") + parseFloat(co.damage_cost || "0"))}</div>
          </div>
          ${co.damage_notes ? `<div style="margin-bottom:12px; padding:10px; background:#fff0f0; border:1px solid #fcc; border-radius:4px; font-size:13px;"><strong style="color:#c00;">Damage Notes:</strong> ${co.damage_notes}</div>` : ""}
          <table style="width:100%; border-collapse:collapse; font-size:14px; margin-bottom:20px;">
            <tr><td style="padding:4px 0; width:40%; color:#666;">Checked Out By</td><td style="padding:4px 0;">${co.checked_out_by || "-"}</td></tr>
            <tr><td style="padding:4px 0; color:#666;">Checked In / Received By</td><td style="padding:4px 0; font-weight:bold;">${co.checked_in_by || "-"}</td></tr>
            <tr><td style="padding:4px 0; color:#666;">Approved By</td><td style="padding:4px 0;">${co.approved_by || "-"}</td></tr>
          </table>
          <div style="display:flex; gap:40px; margin-top:30px;">
            <div style="flex:1; text-align:center;"><div style="border-top:2px solid #333; margin-top:50px; padding-top:8px; font-size:12px;">Returned By (Signature)</div></div>
            <div style="flex:1; text-align:center;"><div style="border-top:2px solid #333; margin-top:50px; padding-top:8px; font-size:12px;">Received By (Signature)</div></div>
            <div style="flex:1; text-align:center;"><div style="border-top:2px solid #333; margin-top:50px; padding-top:8px; font-size:12px;">Authorised By (Signature)</div></div>
          </div>
        </div>
      `,
    });
  };

  const handlePrintInventory = () => {
    openPrintWindow({
      title: "Decor Inventory Register",
      stats: [
        { label: "Total Items", value: stats.totalItems }, { label: "Total Stock", value: stats.totalStock },
        { label: "Checked Out", value: stats.checkedOut }, { label: "Total Value", value: `£${stats.totalValue.toLocaleString()}` },
      ],
      columns: [
        { header: "Name", key: "name" }, { header: "Category", key: "category" }, { header: "Colour", key: "colour" },
        { header: "Qty", key: "quantity", align: "center" as const }, { header: "Available", key: "available", align: "center" as const },
        { header: "Unit Cost", key: "unit_cost", align: "right" as const }, { header: "Rental Price", key: "rental_price", align: "right" as const },
        { header: "Condition", key: "condition" }, { header: "Location", key: "location" },
      ],
      rows: filteredItems.map(i => ({
        name: i.name, category: i.category, colour: i.colour || "-", quantity: i.quantity, available: i.available_quantity,
        unit_cost: i.unit_cost ? `£${parseFloat(i.unit_cost).toLocaleString()}` : "-",
        rental_price: i.rental_price ? `£${parseFloat(i.rental_price).toLocaleString()}` : "-",
        condition: i.condition, location: i.location || "-",
      })),
      orientation: "landscape",
    });
  };

  if (detailCheckout) {
    const co = checkouts.find(c => c.id === detailCheckout.id) || detailCheckout;
    const inv = items.find(i => i.id === co.inventory_id);
    return (
      <PlannerLayout>
        <header className="bg-gradient-to-r from-[#330311] to-[#1a0209] border-b border-white/10 px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" className="text-white/60 hover:text-white" onClick={() => setDetailCheckout(null)}><ArrowLeft className="w-5 h-5" /></Button>
              <div>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs text-white/50 bg-[#330311] px-2 py-0.5 rounded">{co.reference_number}</span>
                  <Badge className={statusColor(co.status)}>{statusLabel(co.status)}</Badge>
                  {isOverdue(co) && <Badge className="bg-red-500/20 text-red-300 border-red-500/30">OVERDUE</Badge>}
                  {co.status === "checked_out" && !co.approved_by && <Badge className="bg-yellow-500/20 text-yellow-300 border-yellow-500/30">PENDING APPROVAL</Badge>}
                </div>
                <h1 className="text-xl font-bold text-white mt-1">{co.item_name || inv?.name || "Unknown Item"}</h1>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {co.status === "checked_out" && (
                <>
                  {!co.approved_by && (
                    <Button size="sm" className="bg-emerald-600 text-white hover:bg-emerald-700" onClick={() => handleApprove(co)}>
                      <ShieldCheck className="w-4 h-4 mr-2" /> Approve
                    </Button>
                  )}
                  <Button size="sm" className="bg-blue-600 text-white hover:bg-blue-700" onClick={() => openReturnDialog(co)}>
                    <ArrowDownToLine className="w-4 h-4 mr-2" /> Check In / Return
                  </Button>
                </>
              )}
              <Button variant="outline" size="sm" className="border-white/20 text-white hover:bg-white/10"
                onClick={() => co.status === "checked_out" ? printCheckoutReceipt(co) : printReturnReceipt(co)}>
                <Printer className="w-4 h-4 mr-2" /> Print Receipt
              </Button>
            </div>
          </div>
        </header>
        <div className="max-w-4xl mx-auto px-6 py-6 space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-[#2a020d] border-[#4a0a1e]"><CardContent className="p-4">
              <p className="text-white/50 text-xs mb-1">Client</p><p className="text-white font-semibold">{co.client_name || "-"}</p>
            </CardContent></Card>
            <Card className="bg-[#2a020d] border-[#4a0a1e]"><CardContent className="p-4">
              <p className="text-white/50 text-xs mb-1">Event</p><p className="text-white font-semibold">{co.event_name || "-"}</p>
            </CardContent></Card>
            <Card className="bg-[#2a020d] border-[#4a0a1e]"><CardContent className="p-4">
              <p className="text-white/50 text-xs mb-1">Planner</p><p className="text-white font-semibold">{co.planner_name || "-"}</p>
            </CardContent></Card>
            <Card className="bg-[#2a020d] border-[#4a0a1e]"><CardContent className="p-4">
              <p className="text-white/50 text-xs mb-1">Charge</p><p className="text-emerald-400 font-bold text-lg">£{fmtMoney(co.charge_amount)}</p>
            </CardContent></Card>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
            {[
              { label: "Quantity", value: `${co.quantity}` },
              { label: "Checkout Date", value: fmtDate(co.checked_out_date) },
              { label: "Expected Return", value: fmtDate(co.expected_return_date), highlight: isOverdue(co) },
              { label: "Deposit", value: `£${fmtMoney(co.deposit_amount)}` },
              { label: "Condition Out", value: co.condition_at_checkout || "-" },
            ].map((d, i) => (
              <div key={i} className="bg-[#2a020d] border border-[#4a0a1e] rounded-lg p-3">
                <p className="text-white/50 text-xs">{d.label}</p>
                <p className={`font-medium ${d.highlight ? "text-red-400" : "text-white"}`}>{d.value}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="bg-[#2a020d] border border-[#4a0a1e] rounded-lg p-3">
              <p className="text-white/50 text-xs">Checked Out By</p><p className="text-white font-medium">{co.checked_out_by || "-"}</p>
            </div>
            <div className="bg-[#2a020d] border border-[#4a0a1e] rounded-lg p-3">
              <p className="text-white/50 text-xs">Approved By</p>
              <p className={`font-medium ${co.approved_by ? "text-emerald-400" : "text-yellow-400"}`}>{co.approved_by || "Pending"}</p>
            </div>
            {co.status !== "checked_out" && (
              <>
                <div className="bg-[#2a020d] border border-[#4a0a1e] rounded-lg p-3">
                  <p className="text-white/50 text-xs">Checked In By</p><p className="text-white font-medium">{co.checked_in_by || "-"}</p>
                </div>
                <div className="bg-[#2a020d] border border-[#4a0a1e] rounded-lg p-3">
                  <p className="text-white/50 text-xs">Returned Date</p><p className="text-white font-medium">{fmtDate(co.actual_return_date)}</p>
                </div>
              </>
            )}
          </div>

          {co.approved_by && (
            <div className="flex items-center gap-2 text-sm text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3">
              <ShieldCheck className="w-4 h-4" /> Approved by <strong>{co.approved_by}</strong> on {fmtDate(co.approval_date)}
            </div>
          )}

          {(co.return_condition === "damaged" || co.damage_notes || parseFloat(co.damage_cost || "0") > 0) && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
              <div className="flex items-center gap-2 text-red-300 font-semibold mb-2"><AlertTriangle className="w-4 h-4" /> Damage Assessment</div>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div><p className="text-white/50 text-xs">Condition on Return</p><Badge className={conditionColor(co.return_condition || "good")}>{co.return_condition}</Badge></div>
                <div><p className="text-white/50 text-xs">Damage Cost</p><p className="text-red-400 font-bold">£{fmtMoney(co.damage_cost)}</p></div>
                <div><p className="text-white/50 text-xs">Damage Notes</p><p className="text-white/80 text-sm">{co.damage_notes || "-"}</p></div>
              </div>
            </div>
          )}

          {co.notes && (
            <div className="bg-[#2a020d] border border-[#4a0a1e] rounded-lg p-4">
              <p className="text-white/50 text-xs mb-1">Notes</p><p className="text-white text-sm">{co.notes}</p>
            </div>
          )}

          <div className="bg-[#2a020d] border border-[#4a0a1e] rounded-lg p-4">
            <p className="text-white/50 text-xs mb-1">Financial Summary</p>
            <div className="flex gap-8 mt-2 text-sm">
              <div><span className="text-white/50">Charge:</span> <span className="text-white font-medium">£{fmtMoney(co.charge_amount)}</span></div>
              <div><span className="text-white/50">Deposit:</span> <span className="text-white font-medium">£{fmtMoney(co.deposit_amount)}</span></div>
              <div><span className="text-white/50">Damage:</span> <span className="text-red-400 font-medium">£{fmtMoney(co.damage_cost)}</span></div>
              <div><span className="text-white/50">Net:</span> <span className="text-emerald-400 font-bold">£{fmtMoney(parseFloat(co.charge_amount || "0") - parseFloat(co.deposit_amount || "0") + parseFloat(co.damage_cost || "0"))}</span></div>
            </div>
          </div>
        </div>
      </PlannerLayout>
    );
  }

  if (itemHistory) {
    const item = itemHistory.item;
    const history = itemCheckoutHistory(item.id);
    return (
      <PlannerLayout>
        <header className="bg-gradient-to-r from-[#330311] to-[#1a0209] border-b border-white/10 px-6 py-5">
          <div className="flex items-center gap-4">
            <Button variant="ghost" className="text-white/60 hover:text-white" onClick={() => setItemHistory(null)}><ArrowLeft className="w-5 h-5" /></Button>
            <div>
              <h1 className="text-xl font-bold text-white">{item.name}</h1>
              <p className="text-white/60 text-sm">{item.category} · Checkout History</p>
            </div>
          </div>
        </header>
        <div className="max-w-4xl mx-auto px-6 py-6 space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <Card className="bg-[#2a020d] border-[#4a0a1e]"><CardContent className="p-4 text-center">
              <p className="text-xl font-bold text-white">{history.length}</p><p className="text-white/50 text-xs">Total Checkouts</p>
            </CardContent></Card>
            <Card className="bg-[#2a020d] border-[#4a0a1e]"><CardContent className="p-4 text-center">
              <p className="text-xl font-bold text-amber-400">{history.filter(h => h.status === "checked_out").length}</p><p className="text-white/50 text-xs">Currently Out</p>
            </CardContent></Card>
            <Card className="bg-[#2a020d] border-[#4a0a1e]"><CardContent className="p-4 text-center">
              <p className="text-xl font-bold text-emerald-400">{history.filter(h => h.status === "returned").length}</p><p className="text-white/50 text-xs">Returned OK</p>
            </CardContent></Card>
            <Card className="bg-[#2a020d] border-[#4a0a1e]"><CardContent className="p-4 text-center">
              <p className="text-xl font-bold text-red-400">{history.filter(h => h.status === "damaged").length}</p><p className="text-white/50 text-xs">Returned Damaged</p>
            </CardContent></Card>
          </div>
          {history.length === 0 ? (
            <div className="text-center py-12 text-white/50">No checkout history for this item</div>
          ) : history.map(co => (
            <Card key={co.id} className="bg-[#2a020d] border-[#4a0a1e] hover:border-[#8B1538]/50 cursor-pointer" onClick={() => setDetailCheckout(co)}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-xs text-white/50 bg-[#330311] px-2 py-0.5 rounded">{co.reference_number}</span>
                      <Badge className={statusColor(co.status)}>{statusLabel(co.status)}</Badge>
                      {isOverdue(co) && <Badge className="text-[10px] bg-red-500/20 text-red-300">OVERDUE</Badge>}
                    </div>
                    <div className="flex gap-4 text-xs text-white/50">
                      <span>Qty: {co.quantity}</span>
                      {co.client_name && <span>{co.client_name}</span>}
                      {co.event_name && <span>{co.event_name}</span>}
                      <span>Out: {fmtDate(co.checked_out_date)}</span>
                      {co.actual_return_date && <span>In: {fmtDate(co.actual_return_date)}</span>}
                    </div>
                  </div>
                  <p className="text-emerald-400 font-bold">£{fmtMoney(co.charge_amount)}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </PlannerLayout>
    );
  }

  return (
    <PlannerLayout>
      <header className="bg-gradient-to-r from-[#330311] to-[#1a0209] border-b border-white/10 px-6 py-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#8B1538] to-[#330311] flex items-center justify-center">
              <Package className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Decor Inventory & Rentals</h1>
              <p className="text-white/60 text-sm">Manage inventory, track check-outs, approvals & returns</p>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <Button variant="outline" size="sm" className="border-white/20 text-white hover:bg-white/10" onClick={handlePrintInventory}>
              <Printer className="w-4 h-4 mr-2" /> Print Inventory
            </Button>
            <Button size="sm" variant="outline" className="border-purple-500/30 text-purple-300 hover:bg-purple-500/10"
              onClick={() => { setReqInventoryId(""); setReqQuantity("1"); setReqEventId(""); setReqReturnDate(""); setReqNotes(""); setShowRequestForm(true); setActiveTab("my-requests"); }}>
              <Send className="w-4 h-4 mr-2" /> Request Items
            </Button>
            {isManagerOrAdmin && (
              <Button size="sm" variant="outline" className="border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10"
                onClick={() => { resetCheckoutForm(); setShowCheckoutForm(true); }}>
                <ArrowUpFromLine className="w-4 h-4 mr-2" /> Direct Checkout
              </Button>
            )}
            {(isAdmin || isManagerOrAdmin) && (
              <Button size="sm" className="bg-[#8B1538] text-white hover:bg-[#6d1029]" onClick={() => { resetItemForm(); setShowItemForm(true); }}>
                <Plus className="w-4 h-4 mr-2" /> Add Item
              </Button>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 mb-6">
          {[
            { val: stats.totalItems, label: "Inventory Items", color: "text-white" },
            { val: stats.totalStock, label: "Total Stock", color: "text-blue-400" },
            { val: stats.checkedOut, label: "Checked Out", color: "text-amber-400" },
            { val: `£${stats.totalValue.toLocaleString()}`, label: "Inventory Value", color: "text-emerald-400" },
            { val: stats.totalCheckouts, label: "All Checkouts", color: "text-purple-400" },
            { val: stats.activeCheckouts, label: "Active", color: "text-orange-400" },
            { val: stats.pendingApproval, label: "Pending Approval", color: "text-yellow-400" },
            { val: stats.overdueCheckouts, label: "Overdue", color: "text-red-400" },
          ].map((s, i) => (
            <Card key={i} className="bg-[#2a020d] border-[#4a0a1e]">
              <CardContent className="p-3 text-center">
                <p className={`text-xl font-bold ${s.color}`}>{s.val}</p>
                <p className="text-[10px] text-white/60">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="bg-[#2a020d] border border-[#4a0a1e] flex-wrap h-auto gap-1">
            <TabsTrigger value="checkouts" className="data-[state=active]:bg-[#8B1538] data-[state=active]:text-white text-white/60">
              <ArrowRightLeft className="w-4 h-4 mr-2" /> Checkouts ({checkouts.length})
            </TabsTrigger>
            <TabsTrigger value="my-requests" className="data-[state=active]:bg-[#8B1538] data-[state=active]:text-white text-white/60">
              <Send className="w-4 h-4 mr-2" /> My Requests ({myRequests.length})
            </TabsTrigger>
            {isManagerOrAdmin && (
              <TabsTrigger value="manager-queue" className="data-[state=active]:bg-[#8B1538] data-[state=active]:text-white text-white/60">
                <ClipboardCheck className="w-4 h-4 mr-2" /> Manager Queue {managerQueue.length > 0 && <Badge className="ml-1 text-[9px] bg-yellow-500/30 text-yellow-300 border-0">{managerQueue.length}</Badge>}
              </TabsTrigger>
            )}
            {isWarehouseManager && (
              <TabsTrigger value="warehouse-queue" className="data-[state=active]:bg-[#8B1538] data-[state=active]:text-white text-white/60">
                <Warehouse className="w-4 h-4 mr-2" /> Warehouse Queue {warehouseQueue.length > 0 && <Badge className="ml-1 text-[9px] bg-blue-500/30 text-blue-300 border-0">{warehouseQueue.length}</Badge>}
              </TabsTrigger>
            )}
            <TabsTrigger value="inventory" className="data-[state=active]:bg-[#8B1538] data-[state=active]:text-white text-white/60">
              <Package className="w-4 h-4 mr-2" /> Inventory ({items.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="checkouts" className="space-y-4">
            <div className="flex items-center gap-3 flex-wrap">
              <Select value={checkoutFilterStatus} onValueChange={setCheckoutFilterStatus}>
                <SelectTrigger className="w-[180px] bg-[#2a020d] border-[#4a0a1e] text-white"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="checked_out">Checked Out</SelectItem>
                  <SelectItem value="returned">Returned</SelectItem>
                  <SelectItem value="damaged">Returned (Damaged)</SelectItem>
                </SelectContent>
              </Select>
              {stats.pendingApproval > 0 && (
                <Badge className="bg-yellow-500/20 text-yellow-300 border-yellow-500/30 text-xs cursor-pointer" onClick={() => setCheckoutFilterStatus("checked_out")}>
                  {stats.pendingApproval} pending approval
                </Badge>
              )}
              {stats.overdueCheckouts > 0 && (
                <Badge className="bg-red-500/20 text-red-300 border-red-500/30 text-xs cursor-pointer" onClick={() => setCheckoutFilterStatus("checked_out")}>
                  {stats.overdueCheckouts} overdue
                </Badge>
              )}
            </div>

            {loadingCheckouts ? (
              <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-white/40 animate-spin" /></div>
            ) : filteredCheckouts.length === 0 ? (
              <div className="text-center py-20">
                <ArrowRightLeft className="w-16 h-16 text-white/20 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white/60 mb-2">No Checkouts</h3>
                {isManagerOrAdmin ? (
                  <>
                    <p className="text-white/40 mb-4">Check out a decor item to get started</p>
                    <Button className="bg-emerald-600 text-white hover:bg-emerald-700" onClick={() => { resetCheckoutForm(); setShowCheckoutForm(true); }}>
                      <ArrowUpFromLine className="w-4 h-4 mr-2" /> New Checkout
                    </Button>
                  </>
                ) : (
                  <>
                    <p className="text-white/40 mb-4">Submit a request to borrow decor items for your event</p>
                    <Button className="bg-[#8B1538] text-white hover:bg-[#6d1029]" onClick={() => { setReqInventoryId(""); setReqQuantity("1"); setReqEventId(""); setReqReturnDate(""); setReqNotes(""); setShowRequestForm(true); }}>
                      <Send className="w-4 h-4 mr-2" /> Request Items
                    </Button>
                  </>
                )}
              </div>
            ) : (
              <div className="grid gap-3">
                {filteredCheckouts.map(co => {
                  const inv = items.find(i => i.id === co.inventory_id);
                  return (
                    <Card key={co.id} className={`bg-[#2a020d] border-[#4a0a1e] hover:border-[#8B1538]/50 transition-all cursor-pointer ${isOverdue(co) ? "border-red-500/50" : ""}`}
                      onClick={() => setDetailCheckout(co)}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                              co.status === "checked_out" ? (isOverdue(co) ? "bg-red-500/20" : "bg-amber-500/20") :
                              co.status === "damaged" ? "bg-red-500/20" : "bg-emerald-500/20"
                            }`}>
                              {co.status === "checked_out" ? (isOverdue(co) ? <AlertTriangle className="w-5 h-5 text-red-400" /> : <ArrowUpFromLine className="w-5 h-5 text-amber-400" />) :
                               co.status === "damaged" ? <AlertCircle className="w-5 h-5 text-red-400" /> :
                               <CheckCircle className="w-5 h-5 text-emerald-400" />}
                            </div>
                            <div>
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <span className="font-mono text-xs text-white/50 bg-[#330311] px-2 py-0.5 rounded">{co.reference_number}</span>
                                <span className="text-white font-medium text-sm">{co.item_name || inv?.name || "Unknown"}</span>
                                <Badge className={`text-[10px] ${statusColor(co.status)}`}>{statusLabel(co.status)}</Badge>
                                {isOverdue(co) && <Badge className="text-[10px] bg-red-500/20 text-red-300 border-red-500/30">OVERDUE</Badge>}
                                {co.status === "checked_out" && !co.approved_by && <Badge className="text-[10px] bg-yellow-500/20 text-yellow-300 border-yellow-500/30">NEEDS APPROVAL</Badge>}
                              </div>
                              <div className="flex items-center gap-4 text-xs text-white/50 flex-wrap">
                                <span>×{co.quantity}</span>
                                {co.client_name && <span><Users className="w-3 h-3 inline mr-1" />{co.client_name}</span>}
                                {co.event_name && <span><Calendar className="w-3 h-3 inline mr-1" />{co.event_name}</span>}
                                <span>{fmtDate(co.checked_out_date)} → {co.expected_return_date ? fmtDate(co.expected_return_date) : "?"}</span>
                                {co.notes && <span className="italic truncate max-w-[200px]">{co.notes}</span>}
                              </div>
                            </div>
                          </div>
                          <div className="text-right flex items-center gap-3">
                            <div>
                              <p className="text-emerald-400 font-bold">£{fmtMoney(co.charge_amount)}</p>
                              {co.approved_by && <p className="text-emerald-400 text-[10px]"><ShieldCheck className="w-3 h-3 inline" /> {co.approved_by}</p>}
                            </div>
                            {co.status === "checked_out" && (
                              <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                                {!co.approved_by && (
                                  <Button size="sm" variant="ghost" className="text-yellow-400 hover:text-yellow-300 h-8 px-2" onClick={() => handleApprove(co)} title="Approve">
                                    <ShieldCheck className="w-4 h-4" />
                                  </Button>
                                )}
                                <Button size="sm" variant="ghost" className="text-blue-400 hover:text-blue-300 h-8 px-2" onClick={() => openReturnDialog(co)} title="Return">
                                  <ArrowDownToLine className="w-4 h-4" />
                                </Button>
                                <Button size="sm" variant="ghost" className="text-white/40 hover:text-white h-8 px-2"
                                  onClick={() => printCheckoutReceipt(co)} title="Print">
                                  <Printer className="w-4 h-4" />
                                </Button>
                              </div>
                            )}
                            {co.status !== "checked_out" && (
                              <Button size="sm" variant="ghost" className="text-white/40 hover:text-white h-8 px-2"
                                onClick={e => { e.stopPropagation(); printReturnReceipt(co); }} title="Print Return Receipt">
                                <Printer className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* MY REQUESTS TAB */}
          <TabsContent value="my-requests" className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-white/60 text-sm">Your decor item requests and their current status</p>
              <Button size="sm" className="bg-[#8B1538] text-white hover:bg-[#6d1029]" onClick={() => { setReqInventoryId(""); setReqQuantity("1"); setReqEventId(""); setReqReturnDate(""); setReqNotes(""); setShowRequestForm(true); }}>
                <Plus className="w-4 h-4 mr-2" /> Request Items
              </Button>
            </div>
            {loadingMyRequests ? (
              <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-white/40 animate-spin" /></div>
            ) : myRequests.length === 0 ? (
              <div className="text-center py-20">
                <Send className="w-16 h-16 text-white/20 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white/60 mb-2">No Requests Yet</h3>
                <p className="text-white/40 mb-4">Submit a request to borrow decor items for your event</p>
                <Button className="bg-[#8B1538] text-white" onClick={() => setShowRequestForm(true)}>
                  <Plus className="w-4 h-4 mr-2" /> Request Items
                </Button>
              </div>
            ) : (
              <div className="grid gap-3">
                {myRequests.map(req => {
                  const inv = items.find(i => i.id === req.inventory_id);
                  return (
                    <Card key={req.id} className="bg-[#2a020d] border-[#4a0a1e]">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className="font-mono text-xs text-white/50 bg-[#330311] px-2 py-0.5 rounded">{req.reference_number}</span>
                              <span className="text-white font-medium">{req.item_name || inv?.name || "Unknown Item"}</span>
                              <Badge className={`text-[10px] ${statusColor(req.status)}`}>{statusLabel(req.status)}</Badge>
                            </div>
                            <div className="flex items-center gap-4 text-xs text-white/50 flex-wrap">
                              <span>×{req.quantity}</span>
                              {req.event_name && <span><Calendar className="w-3 h-3 inline mr-1" />{req.event_name}</span>}
                              {req.expected_return_date && <span>Return by: {fmtDate(req.expected_return_date)}</span>}
                              <span>{fmtDate(req.created_at)}</span>
                            </div>
                            <div className="mt-2 flex flex-col gap-1">
                              {req.manager_approved_by && (
                                <p className="text-xs text-blue-300"><ShieldCheck className="w-3 h-3 inline mr-1" />Manager: {req.manager_approved_by} on {fmtDate(req.manager_approval_date)}{req.manager_notes ? ` — "${req.manager_notes}"` : ""}</p>
                              )}
                              {req.warehouse_approved_by && req.status === "checked_out" && (
                                <p className="text-xs text-emerald-300"><Warehouse className="w-3 h-3 inline mr-1" />Warehouse: {req.warehouse_approved_by} — Checked out {fmtDate(req.checked_out_date)}</p>
                              )}
                              {req.status === "manager_rejected" && (
                                <p className="text-xs text-red-300"><AlertCircle className="w-3 h-3 inline mr-1" />Rejected{req.manager_notes ? `: "${req.manager_notes}"` : ""}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            {req.status === "pending_manager" && <Clock className="w-5 h-5 text-yellow-400" />}
                            {req.status === "manager_approved" && <ShieldCheck className="w-5 h-5 text-blue-400" />}
                            {req.status === "checked_out" && <CheckCircle className="w-5 h-5 text-emerald-400" />}
                            {req.status === "manager_rejected" && <AlertCircle className="w-5 h-5 text-red-400" />}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* MANAGER APPROVAL QUEUE */}
          {isManagerOrAdmin && (
            <TabsContent value="manager-queue" className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-white/60 text-sm">Planner requests awaiting your approval</p>
                {managerQueue.length > 0 && <Badge className="bg-yellow-500/20 text-yellow-300 border-yellow-500/30">{managerQueue.length} pending</Badge>}
              </div>
              {loadingManagerQueue ? (
                <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-white/40 animate-spin" /></div>
              ) : managerQueue.length === 0 ? (
                <div className="text-center py-20">
                  <ClipboardCheck className="w-16 h-16 text-white/20 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-white/60 mb-2">No Pending Requests</h3>
                  <p className="text-white/40">All planner requests have been reviewed</p>
                </div>
              ) : (
                <div className="grid gap-3">
                  {managerQueue.map(req => {
                    const inv = items.find(i => i.id === req.inventory_id);
                    return (
                      <Card key={req.id} className="bg-[#2a020d] border-[#4a0a1e] border-l-4 border-l-yellow-500/50">
                        <CardContent className="p-4">
                          <div className="flex items-start gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <span className="font-mono text-xs text-white/50 bg-[#330311] px-2 py-0.5 rounded">{req.reference_number}</span>
                                <span className="text-white font-semibold">{req.item_name || inv?.name || "Unknown"}</span>
                                <Badge className="text-[10px] bg-yellow-500/20 text-yellow-300">Awaiting Manager</Badge>
                              </div>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3 text-xs">
                                <div><p className="text-white/40">Requested By</p><p className="text-white font-medium">{req.requested_by_name || req.planner_name || "-"}</p></div>
                                <div><p className="text-white/40">Quantity</p><p className="text-white font-medium">×{req.quantity}</p></div>
                                <div><p className="text-white/40">Event</p><p className="text-white font-medium">{req.event_name || "-"}</p></div>
                                <div><p className="text-white/40">Return By</p><p className="text-white font-medium">{fmtDate(req.expected_return_date)}</p></div>
                              </div>
                              {req.notes && <p className="mt-2 text-xs text-white/50 italic">"{req.notes}"</p>}
                              <p className="mt-1 text-[10px] text-white/30">Submitted {fmtDate(req.created_at)}</p>
                            </div>
                            <div className="flex flex-col gap-2 flex-shrink-0">
                              <Button size="sm" className="bg-emerald-600 text-white hover:bg-emerald-700"
                                onClick={() => { setActionRequest(req); setActionNotes(""); setShowManagerActionDialog(true); }}>
                                <ThumbsUp className="w-4 h-4 mr-1" /> Review
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          )}

          {/* WAREHOUSE APPROVAL QUEUE */}
          {(isWarehouseManager || isAdmin) && (
            <TabsContent value="warehouse-queue" className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-white/60 text-sm">Manager-approved requests awaiting warehouse sign-off and checkout</p>
                {warehouseQueue.length > 0 && <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30">{warehouseQueue.length} pending</Badge>}
              </div>
              {loadingWarehouseQueue ? (
                <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-white/40 animate-spin" /></div>
              ) : warehouseQueue.length === 0 ? (
                <div className="text-center py-20">
                  <Warehouse className="w-16 h-16 text-white/20 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-white/60 mb-2">No Items Awaiting Warehouse Approval</h3>
                  <p className="text-white/40">Manager-approved requests will appear here</p>
                </div>
              ) : (
                <div className="grid gap-3">
                  {warehouseQueue.map(req => {
                    const inv = items.find(i => i.id === req.inventory_id);
                    return (
                      <Card key={req.id} className="bg-[#2a020d] border-[#4a0a1e] border-l-4 border-l-blue-500/50">
                        <CardContent className="p-4">
                          <div className="flex items-start gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <span className="font-mono text-xs text-white/50 bg-[#330311] px-2 py-0.5 rounded">{req.reference_number}</span>
                                <span className="text-white font-semibold">{req.item_name || inv?.name || "Unknown"}</span>
                                <Badge className="text-[10px] bg-blue-500/20 text-blue-300">Manager Approved</Badge>
                              </div>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3 text-xs">
                                <div><p className="text-white/40">Requested By</p><p className="text-white font-medium">{req.requested_by_name || req.planner_name || "-"}</p></div>
                                <div><p className="text-white/40">Quantity Requested</p><p className="text-white font-medium">×{req.quantity} <span className="text-white/40">(avail: {inv?.available_quantity ?? "?"})</span></p></div>
                                <div><p className="text-white/40">Event</p><p className="text-white font-medium">{req.event_name || "-"}</p></div>
                                <div><p className="text-white/40">Return By</p><p className="text-white font-medium">{fmtDate(req.expected_return_date)}</p></div>
                              </div>
                              {req.manager_approved_by && (
                                <p className="mt-2 text-xs text-blue-300"><ShieldCheck className="w-3 h-3 inline mr-1" />Manager approved by {req.manager_approved_by} on {fmtDate(req.manager_approval_date)}{req.manager_notes ? ` — "${req.manager_notes}"` : ""}</p>
                              )}
                            </div>
                            <div className="flex flex-col gap-2 flex-shrink-0">
                              <Button size="sm" className="bg-emerald-600 text-white hover:bg-emerald-700"
                                onClick={() => { setActionRequest(req); setActionNotes(""); setShowWarehouseActionDialog(true); }}>
                                <Warehouse className="w-4 h-4 mr-1" /> Review
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          )}

          <TabsContent value="inventory" className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                <Input placeholder="Search items..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10 bg-[#2a020d] border-[#4a0a1e] text-white placeholder:text-white/40" />
              </div>
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="w-[180px] bg-[#2a020d] border-[#4a0a1e] text-white"><SelectValue placeholder="Category" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {loadingItems ? (
              <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-white/40 animate-spin" /></div>
            ) : filteredItems.length === 0 ? (
              <div className="text-center py-20">
                <Package className="w-16 h-16 text-white/20 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white/60 mb-2">{items.length === 0 ? "No Decor Items Yet" : "No Results"}</h3>
                <p className="text-white/40 mb-4">{items.length === 0 ? "Add your first decor item to get started" : "Try adjusting your filters"}</p>
                {items.length === 0 && <Button className="bg-[#8B1538] text-white" onClick={() => setShowItemForm(true)}><Plus className="w-4 h-4 mr-2" /> Add First Item</Button>}
              </div>
            ) : (
              <div className="grid gap-3">
                {filteredItems.map(item => {
                  const activeOut = checkouts.filter(co => co.inventory_id === item.id && co.status === "checked_out").length;
                  const totalHist = checkouts.filter(co => co.inventory_id === item.id).length;
                  return (
                    <Card key={item.id} className="bg-[#2a020d] border-[#4a0a1e] hover:border-[#8B1538]/50 transition-all">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-4">
                          {item.image_url ? (
                            <img src={item.image_url} alt={item.name} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-[#330311] flex items-center justify-center flex-shrink-0"><Package className="w-5 h-5 text-white/40" /></div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <h3 className="font-semibold text-white">{item.name}</h3>
                              <Badge className="text-[10px] bg-[#330311]/80 text-white/70 border-white/10">{item.category}</Badge>
                              {item.colour && <Badge className="text-[10px] bg-purple-500/20 text-purple-300 border-purple-500/30"><Palette className="w-3 h-3 mr-1" />{item.colour}</Badge>}
                              <Badge className={`text-[10px] ${conditionColor(item.condition)}`}>{item.condition}</Badge>
                            </div>
                            <div className="flex items-center gap-4 text-xs text-white/50 flex-wrap">
                              <span><Hash className="w-3 h-3 inline mr-1" />{item.available_quantity}/{item.quantity} available</span>
                              {item.rental_price && <span><DollarSign className="w-3 h-3 inline mr-1" />£{parseFloat(item.rental_price).toLocaleString()} rental</span>}
                              {item.location && <span><MapPin className="w-3 h-3 inline mr-1" />{item.location}</span>}
                              {activeOut > 0 && <span className="text-amber-400">{activeOut} currently out</span>}
                              {totalHist > 0 && (
                                <button className="text-blue-400 hover:text-blue-300 underline" onClick={() => setItemHistory({ item, show: true })}>
                                  {totalHist} checkout{totalHist !== 1 ? "s" : ""} history
                                </button>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button size="sm" variant="ghost" className="text-purple-400/70 hover:text-purple-300 h-8 px-2 text-xs"
                              onClick={() => { setReqInventoryId(String(item.id)); setReqQuantity("1"); setReqEventId(""); setReqReturnDate(""); setReqNotes(""); setShowRequestForm(true); setActiveTab("my-requests"); }}>
                              <Send className="w-3 h-3 mr-1" /> Request
                            </Button>
                            {isManagerOrAdmin && <Button size="sm" variant="ghost" className="text-white/40 hover:text-white h-8 w-8 p-0" onClick={() => openEditItem(item)}><Edit2 className="w-4 h-4" /></Button>}
                            {isManagerOrAdmin && <Button size="sm" variant="ghost" className="text-red-400/60 hover:text-red-400 h-8 w-8 p-0"
                              onClick={() => { if (confirm(`Delete "${item.name}"?`)) deleteItemMutation.mutate(item.id); }}><Trash2 className="w-4 h-4" /></Button>}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={showItemForm} onOpenChange={(open) => { if (!open) resetItemForm(); }}>
        <DialogContent className="bg-[#1a0209] border-[#4a0a1e] text-white max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingItem ? "Edit Item" : "Add Inventory Item"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label className="text-white/70">Item Name *</Label><Input value={itemName} onChange={e => setItemName(e.target.value)} className="bg-[#2a020d] border-[#4a0a1e] text-white" placeholder="e.g. Gold Sequin Tablecloth" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label className="text-white/70">Category *</Label>
                <Select value={itemCategory} onValueChange={setItemCategory}>
                  <SelectTrigger className="bg-[#2a020d] border-[#4a0a1e] text-white"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label className="text-white/70">Colour</Label>
                <Select value={itemColour} onValueChange={setItemColour}>
                  <SelectTrigger className="bg-[#2a020d] border-[#4a0a1e] text-white"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{COLOURS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div><Label className="text-white/70">Description</Label><Textarea value={itemDescription} onChange={e => setItemDescription(e.target.value)} className="bg-[#2a020d] border-[#4a0a1e] text-white" rows={2} /></div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div><Label className="text-white/70">Quantity</Label><Input type="number" min="1" value={itemQuantity} onChange={e => setItemQuantity(e.target.value)} className="bg-[#2a020d] border-[#4a0a1e] text-white" /></div>
              <div><Label className="text-white/70">Unit Cost (£)</Label><Input type="number" step="0.01" value={itemUnitCost} onChange={e => setItemUnitCost(e.target.value)} className="bg-[#2a020d] border-[#4a0a1e] text-white" /></div>
              <div><Label className="text-white/70">Rental Price (£)</Label><Input type="number" step="0.01" value={itemRentalPrice} onChange={e => setItemRentalPrice(e.target.value)} className="bg-[#2a020d] border-[#4a0a1e] text-white" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label className="text-white/70">Condition</Label>
                <Select value={itemCondition} onValueChange={setItemCondition}>
                  <SelectTrigger className="bg-[#2a020d] border-[#4a0a1e] text-white"><SelectValue /></SelectTrigger>
                  <SelectContent>{CONDITIONS.map(c => <SelectItem key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label className="text-white/70">Location</Label><Input value={itemLocation} onChange={e => setItemLocation(e.target.value)} className="bg-[#2a020d] border-[#4a0a1e] text-white" placeholder="e.g. Warehouse A" /></div>
            </div>
            <div><Label className="text-white/70">Notes</Label><Textarea value={itemNotes} onChange={e => setItemNotes(e.target.value)} className="bg-[#2a020d] border-[#4a0a1e] text-white" rows={2} /></div>
            <div>
              <Label className="text-white/70">Item Image</Label>
              {itemImageUrl ? (
                <div className="relative mt-2">
                  <img src={itemImageUrl} alt="Item preview" className="w-full h-40 object-cover rounded-lg border border-[#4a0a1e]" />
                  <Button size="sm" variant="ghost" className="absolute top-2 right-2 bg-black/60 text-white hover:bg-black/80 h-7 w-7 p-0" onClick={() => setItemImageUrl("")}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <label className="mt-2 flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-[#4a0a1e] rounded-lg cursor-pointer hover:border-[#8B1538]/50 transition-colors bg-[#2a020d]">
                  {uploadingImage ? (
                    <Loader2 className="w-6 h-6 text-white/40 animate-spin" />
                  ) : (
                    <>
                      <Upload className="w-6 h-6 text-white/40 mb-1" />
                      <span className="text-xs text-white/40">Click to upload image</span>
                    </>
                  )}
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploadingImage} />
                </label>
              )}
            </div>
            <Button className="w-full bg-[#8B1538] text-white hover:bg-[#6d1029]" onClick={handleSubmitItem}
              disabled={createItemMutation.isPending || updateItemMutation.isPending}>
              {(createItemMutation.isPending || updateItemMutation.isPending) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingItem ? "Update Item" : "Add Item"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showCheckoutForm} onOpenChange={(open) => { if (!open) setShowCheckoutForm(false); }}>
        <DialogContent className="bg-[#1a0209] border-[#4a0a1e] text-white max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><ArrowUpFromLine className="w-5 h-5 text-amber-400" /> Check Out Item</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label className="text-white/70">Select Item *</Label>
              <Select value={coInventoryId} onValueChange={(v) => {
                setCoInventoryId(v);
                const inv = items.find(i => String(i.id) === v);
                if (inv) { setCoCondition(inv.condition); setCoChargeAmount(inv.rental_price || ""); }
              }}>
                <SelectTrigger className="bg-[#2a020d] border-[#4a0a1e] text-white"><SelectValue placeholder="Choose item" /></SelectTrigger>
                <SelectContent>
                  {items.filter(i => i.available_quantity > 0).map(i => (
                    <SelectItem key={i.id} value={String(i.id)}>
                      {i.name} — {i.category} ({i.available_quantity} avail.)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label className="text-white/70">Quantity</Label><Input type="number" min="1" value={coQuantity} onChange={e => setCoQuantity(e.target.value)} className="bg-[#2a020d] border-[#4a0a1e] text-white" /></div>
              <div><Label className="text-white/70">Condition at Checkout</Label>
                <Select value={coCondition} onValueChange={setCoCondition}>
                  <SelectTrigger className="bg-[#2a020d] border-[#4a0a1e] text-white"><SelectValue /></SelectTrigger>
                  <SelectContent>{CONDITIONS.map(c => <SelectItem key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label className="text-white/70">Event Name</Label><Input value={coEventName} onChange={e => setCoEventName(e.target.value)} className="bg-[#2a020d] border-[#4a0a1e] text-white" /></div>
              <div><Label className="text-white/70">Client Name</Label><Input value={coClientName} onChange={e => setCoClientName(e.target.value)} className="bg-[#2a020d] border-[#4a0a1e] text-white" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label className="text-white/70">Planner (Accountable)</Label><Input value={coPlannerName} onChange={e => setCoPlannerName(e.target.value)} className="bg-[#2a020d] border-[#4a0a1e] text-white" /></div>
              <div><Label className="text-white/70">Checked Out By *</Label><Input value={coCheckedOutBy} onChange={e => setCoCheckedOutBy(e.target.value)} className="bg-[#2a020d] border-[#4a0a1e] text-white" placeholder="Who is taking the items?" /></div>
            </div>
            <div><Label className="text-white/70">Approved / Authorised By</Label><Input value={coApprovedBy} onChange={e => setCoApprovedBy(e.target.value)} className="bg-[#2a020d] border-[#4a0a1e] text-white" placeholder="Manager sign-off (or approve later)" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label className="text-white/70">Checkout Date</Label><Input type="date" value={coCheckoutDate} onChange={e => setCoCheckoutDate(e.target.value)} className="bg-[#2a020d] border-[#4a0a1e] text-white" /></div>
              <div><Label className="text-white/70">Expected Return Date</Label><Input type="date" value={coReturnDate} onChange={e => setCoReturnDate(e.target.value)} className="bg-[#2a020d] border-[#4a0a1e] text-white" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label className="text-white/70">Charge Amount (£)</Label><Input type="number" step="0.01" value={coChargeAmount} onChange={e => setCoChargeAmount(e.target.value)} className="bg-[#2a020d] border-[#4a0a1e] text-white" /></div>
              <div><Label className="text-white/70">Deposit Amount (£)</Label><Input type="number" step="0.01" value={coDepositAmount} onChange={e => setCoDepositAmount(e.target.value)} className="bg-[#2a020d] border-[#4a0a1e] text-white" /></div>
            </div>
            <div><Label className="text-white/70">Notes</Label><Textarea value={coNotes} onChange={e => setCoNotes(e.target.value)} className="bg-[#2a020d] border-[#4a0a1e] text-white" rows={2} placeholder="Internal notes, key contacts, special handling..." /></div>
            <Button className="w-full bg-amber-600 text-white hover:bg-amber-700" onClick={handleCreateCheckout}
              disabled={createCheckoutMutation.isPending || !coInventoryId || !coCheckedOutBy}>
              {createCheckoutMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              <ArrowUpFromLine className="w-4 h-4 mr-2" /> Check Out Item
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showApproveDialog} onOpenChange={(open) => { if (!open) { setShowApproveDialog(false); setApproveCheckout(null); } }}>
        <DialogContent className="bg-[#1a0209] border-[#4a0a1e] text-white max-w-md">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-emerald-400" /> Approve Checkout</DialogTitle></DialogHeader>
          {approveCheckout && (
            <div className="space-y-4">
              <div className="p-3 bg-[#330311]/40 rounded-lg text-sm">
                <p className="text-white font-medium">{approveCheckout.reference_number} — {approveCheckout.item_name}</p>
                <p className="text-white/50">Qty: {approveCheckout.quantity} · By: {approveCheckout.checked_out_by}</p>
                {approveCheckout.event_name && <p className="text-white/50">Event: {approveCheckout.event_name}</p>}
                {approveCheckout.client_name && <p className="text-white/50">Client: {approveCheckout.client_name}</p>}
              </div>
              <div>
                <Label className="text-white/70">Approved / Authorised By *</Label>
                <Input value={approverName} onChange={e => setApproverName(e.target.value)} className="bg-[#2a020d] border-[#4a0a1e] text-white" placeholder="Manager or authoriser name" />
              </div>
              <Button className="w-full bg-emerald-600 text-white hover:bg-emerald-700" onClick={submitApproval}
                disabled={approveCheckoutMutation.isPending || !approverName.trim()}>
                {approveCheckoutMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                <ShieldCheck className="w-4 h-4 mr-2" /> Confirm Approval
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showReturnDialog} onOpenChange={(open) => { if (!open) { setShowReturnDialog(false); setReturnCheckout(null); } }}>
        <DialogContent className="bg-[#1a0209] border-[#4a0a1e] text-white max-w-lg">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><ArrowDownToLine className="w-5 h-5 text-blue-400" /> Return / Check-In</DialogTitle></DialogHeader>
          {returnCheckout && (
            <div className="space-y-4">
              <div className="p-3 bg-[#330311]/40 rounded-lg text-sm">
                <p className="text-white font-medium">{returnCheckout.reference_number} — {returnCheckout.item_name}</p>
                <p className="text-white/50">Qty: {returnCheckout.quantity} · Out: {fmtDate(returnCheckout.checked_out_date)} · By: {returnCheckout.checked_out_by}</p>
              </div>
              <div><Label className="text-white/70">Received / Checked In By *</Label>
                <Input value={retCheckedInBy} onChange={e => setRetCheckedInBy(e.target.value)} className="bg-[#2a020d] border-[#4a0a1e] text-white" placeholder="Who is receiving these items back?" />
              </div>
              <div><Label className="text-white/70">Condition on Return</Label>
                <Select value={retCondition} onValueChange={setRetCondition}>
                  <SelectTrigger className="bg-[#2a020d] border-[#4a0a1e] text-white"><SelectValue /></SelectTrigger>
                  <SelectContent>{CONDITIONS.map(c => <SelectItem key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              {(retCondition === "damaged" || retCondition === "worn" || retCondition === "fair") && (
                <>
                  <div><Label className="text-white/70">Damage Notes</Label>
                    <Textarea value={retDamageNotes} onChange={e => setRetDamageNotes(e.target.value)} className="bg-[#2a020d] border-[#4a0a1e] text-white" rows={2} placeholder="Describe the damage..." />
                  </div>
                  <div><Label className="text-white/70">Damage Cost (£)</Label>
                    <Input type="number" step="0.01" value={retDamageCost} onChange={e => setRetDamageCost(e.target.value)} className="bg-[#2a020d] border-[#4a0a1e] text-white" placeholder="0.00" />
                  </div>
                </>
              )}
              <Button className="w-full bg-blue-600 text-white hover:bg-blue-700" onClick={handleReturn}
                disabled={returnCheckoutMutation.isPending || !retCheckedInBy}>
                {returnCheckoutMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                <ArrowDownToLine className="w-4 h-4 mr-2" /> Confirm Return
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
      {/* REQUEST ITEMS DIALOG */}
      <Dialog open={showRequestForm} onOpenChange={(open) => { if (!open) setShowRequestForm(false); }}>
        <DialogContent className="bg-[#1a0209] border-[#4a0a1e] text-white max-w-lg">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Send className="w-5 h-5 text-[#8B1538]" /> Request Decor Items</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-white/70">Select Item *</Label>
              <Select value={reqInventoryId} onValueChange={setReqInventoryId}>
                <SelectTrigger className="bg-[#2a020d] border-[#4a0a1e] text-white"><SelectValue placeholder="Choose an inventory item..." /></SelectTrigger>
                <SelectContent>
                  {items.filter(i => i.available_quantity > 0).map(i => (
                    <SelectItem key={i.id} value={String(i.id)}>
                      {i.name} — {i.category} ({i.available_quantity} avail)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {reqInventoryId && (() => {
                const sel = items.find(i => String(i.id) === reqInventoryId);
                return sel ? (
                  <p className="text-xs text-white/40 mt-1">
                    {sel.colour && `Colour: ${sel.colour} · `}
                    {sel.rental_price && `Rental: £${parseFloat(sel.rental_price).toFixed(2)} · `}
                    Condition: {sel.condition}
                  </p>
                ) : null;
              })()}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label className="text-white/70">Quantity *</Label>
                <Input type="number" min="1" value={reqQuantity} onChange={e => setReqQuantity(e.target.value)} className="bg-[#2a020d] border-[#4a0a1e] text-white" />
              </div>
              <div><Label className="text-white/70">Expected Return Date</Label>
                <Input type="date" value={reqReturnDate} onChange={e => setReqReturnDate(e.target.value)} className="bg-[#2a020d] border-[#4a0a1e] text-white" />
              </div>
            </div>
            <div><Label className="text-white/70">Event</Label>
              <Select value={reqEventId} onValueChange={setReqEventId}>
                <SelectTrigger className="bg-[#2a020d] border-[#4a0a1e] text-white">
                  <SelectValue placeholder="Select event (optional)" />
                </SelectTrigger>
                <SelectContent className="bg-[#1a0209] border-[#4a0a1e]">
                  <SelectItem value="none">No specific event</SelectItem>
                  {events.map((ev: any) => (
                    <SelectItem key={ev.id} value={String(ev.id)} className="text-white">{ev.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div><Label className="text-white/70">Notes / Reason</Label>
              <Textarea value={reqNotes} onChange={e => setReqNotes(e.target.value)} className="bg-[#2a020d] border-[#4a0a1e] text-white" rows={2} placeholder="Add any additional context..." />
            </div>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" className="border-white/20 text-white hover:bg-white/10" onClick={() => setShowRequestForm(false)}>Cancel</Button>
              <Button className="bg-[#8B1538] text-white hover:bg-[#6d1029]"
                disabled={!reqInventoryId || createRequestMutation.isPending}
                onClick={() => createRequestMutation.mutate({
                  inventory_id: parseInt(reqInventoryId),
                  quantity: parseInt(reqQuantity) || 1,
                  event_id: (reqEventId && reqEventId !== "none") ? parseInt(reqEventId) : null,
                  expected_return_date: reqReturnDate || null,
                  notes: reqNotes || null,
                })}>
                {createRequestMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                Submit Request
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* MANAGER APPROVAL DIALOG */}
      <Dialog open={showManagerActionDialog} onOpenChange={(open) => { if (!open) { setShowManagerActionDialog(false); setActionRequest(null); setActionNotes(""); } }}>
        <DialogContent className="bg-[#1a0209] border-[#4a0a1e] text-white max-w-lg">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><ClipboardCheck className="w-5 h-5 text-blue-400" /> Manager Review</DialogTitle></DialogHeader>
          {actionRequest && (
            <div className="space-y-4">
              <div className="p-3 bg-[#330311]/40 rounded-lg text-sm space-y-1">
                <p className="text-white font-semibold">{actionRequest.item_name} ×{actionRequest.quantity}</p>
                <p className="text-white/60">Requested by: <strong className="text-white">{actionRequest.requested_by_name || actionRequest.planner_name}</strong></p>
                {actionRequest.event_name && <p className="text-white/60">Event: <strong className="text-white">{actionRequest.event_name}</strong></p>}
                {actionRequest.expected_return_date && <p className="text-white/60">Return by: {fmtDate(actionRequest.expected_return_date)}</p>}
                {actionRequest.notes && <p className="text-white/50 italic">"{actionRequest.notes}"</p>}
              </div>
              <div><Label className="text-white/70">Notes (optional)</Label>
                <Textarea value={actionNotes} onChange={e => setActionNotes(e.target.value)} className="bg-[#2a020d] border-[#4a0a1e] text-white" rows={2} placeholder="Add a note for the planner..." />
              </div>
              <DialogFooter className="flex gap-3">
                <Button variant="outline" className="border-red-500/30 text-red-400 hover:bg-red-500/10 flex-1"
                  disabled={managerApproveMutation.isPending}
                  onClick={() => managerApproveMutation.mutate({ id: actionRequest.id, data: { action: 'reject', notes: actionNotes } })}>
                  <ThumbsDown className="w-4 h-4 mr-2" /> Reject
                </Button>
                <Button className="bg-emerald-600 text-white hover:bg-emerald-700 flex-1"
                  disabled={managerApproveMutation.isPending}
                  onClick={() => managerApproveMutation.mutate({ id: actionRequest.id, data: { action: 'approve', notes: actionNotes } })}>
                  {managerApproveMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ThumbsUp className="w-4 h-4 mr-2" />}
                  Approve
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* WAREHOUSE APPROVAL DIALOG */}
      <Dialog open={showWarehouseActionDialog} onOpenChange={(open) => { if (!open) { setShowWarehouseActionDialog(false); setActionRequest(null); setActionNotes(""); } }}>
        <DialogContent className="bg-[#1a0209] border-[#4a0a1e] text-white max-w-lg">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Warehouse className="w-5 h-5 text-teal-400" /> Warehouse Final Approval</DialogTitle></DialogHeader>
          {actionRequest && (() => {
            const inv = items.find(i => i.id === actionRequest.inventory_id);
            const hasStock = inv && actionRequest.quantity <= inv.available_quantity;
            return (
              <div className="space-y-4">
                <div className="p-3 bg-[#330311]/40 rounded-lg text-sm space-y-1">
                  <p className="text-white font-semibold">{actionRequest.item_name} ×{actionRequest.quantity}</p>
                  <p className="text-white/60">Planner: <strong className="text-white">{actionRequest.requested_by_name || actionRequest.planner_name}</strong></p>
                  {actionRequest.event_name && <p className="text-white/60">Event: <strong className="text-white">{actionRequest.event_name}</strong></p>}
                  {actionRequest.expected_return_date && <p className="text-white/60">Return by: {fmtDate(actionRequest.expected_return_date)}</p>}
                  {actionRequest.manager_approved_by && <p className="text-blue-300 text-xs"><ShieldCheck className="w-3 h-3 inline mr-1" />Manager: {actionRequest.manager_approved_by}</p>}
                </div>
                <div className={`p-3 rounded-lg text-sm border ${hasStock ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300" : "bg-red-500/10 border-red-500/30 text-red-300"}`}>
                  <p className="font-medium">{hasStock ? "Stock Available" : "Insufficient Stock"}</p>
                  <p className="text-xs mt-0.5">Available: {inv?.available_quantity ?? "?"} · Requested: {actionRequest.quantity}</p>
                  {!hasStock && <p className="text-xs mt-1">You may reject or wait for items to be returned.</p>}
                </div>
                <div><Label className="text-white/70">Warehouse Notes (optional)</Label>
                  <Textarea value={actionNotes} onChange={e => setActionNotes(e.target.value)} className="bg-[#2a020d] border-[#4a0a1e] text-white" rows={2} placeholder="Add notes..." />
                </div>
                <DialogFooter className="flex gap-3">
                  <Button variant="outline" className="border-red-500/30 text-red-400 hover:bg-red-500/10 flex-1"
                    disabled={warehouseApproveMutation.isPending}
                    onClick={() => warehouseApproveMutation.mutate({ id: actionRequest.id, data: { action: 'reject', notes: actionNotes } })}>
                    <ThumbsDown className="w-4 h-4 mr-2" /> Reject
                  </Button>
                  <Button className="bg-teal-600 text-white hover:bg-teal-700 flex-1"
                    disabled={warehouseApproveMutation.isPending || !hasStock}
                    onClick={() => warehouseApproveMutation.mutate({ id: actionRequest.id, data: { action: 'approve', notes: actionNotes } })}>
                    {warehouseApproveMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Warehouse className="w-4 h-4 mr-2" />}
                    Approve & Check Out
                  </Button>
                </DialogFooter>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </PlannerLayout>
  );
}
