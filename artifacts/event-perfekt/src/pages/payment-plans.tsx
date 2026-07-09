import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import PlannerLayout from "@/components/PlannerLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  CreditCard,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  Trash2,
  DollarSign,
  Banknote,
  Send,
  Printer,
} from "lucide-react";
import { openPrintWindow } from "@/lib/printUtils";

interface Installment {
  amount: number;
  due_date: string;
  status: "pending" | "paid" | "overdue";
  paid_at?: string;
  label?: string;
}

interface PaymentPlan {
  id: string;
  event_id: string | null;
  invoice_id: string | null;
  plan_name: string;
  total_amount: number;
  currency: string;
  installments: Installment[];
  status: string;
  created_by: string | null;
  created_at: string;
}

export default function PaymentPlans() {
  const { toast } = useToast();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string>("all");
  const [planName, setPlanName] = useState("Payment Plan");
  const [totalAmount, setTotalAmount] = useState("");
  const [currency, setCurrency] = useState("NGN");
  const [eventId, setEventId] = useState("");
  const [installmentCount, setInstallmentCount] = useState(3);
  const [installments, setInstallments] = useState<Installment[]>([]);

  const { data: events = [] } = useQuery<any[]>({
    queryKey: ["/api/events"],
  });

  const { data: plans = [], isLoading } = useQuery<PaymentPlan[]>({
    queryKey: ["/api/payment-plans"],
  });

  const filteredPlans = selectedEventId === "all"
    ? plans
    : plans.filter((p) => p.event_id === selectedEventId);

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/payment-plans", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payment-plans"] });
      setShowCreateDialog(false);
      resetForm();
      toast({ title: "Payment plan created successfully" });
    },
    onError: () => {
      toast({ title: "Failed to create payment plan", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      apiRequest("PATCH", `/api/payment-plans/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payment-plans"] });
      toast({ title: "Payment plan updated" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/payment-plans/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payment-plans"] });
      toast({ title: "Payment plan deleted" });
    },
  });

  function resetForm() {
    setPlanName("Payment Plan");
    setTotalAmount("");
    setCurrency("NGN");
    setEventId("");
    setInstallmentCount(3);
    setInstallments([]);
  }

  function generateInstallments() {
    const total = parseFloat(totalAmount);
    if (!total || total <= 0) return;
    const perInstallment = Math.round((total / installmentCount) * 100) / 100;
    const newInstallments: Installment[] = [];
    for (let i = 0; i < installmentCount; i++) {
      const dueDate = new Date();
      dueDate.setMonth(dueDate.getMonth() + i + 1);
      const isLast = i === installmentCount - 1;
      const amount = isLast ? total - perInstallment * (installmentCount - 1) : perInstallment;
      newInstallments.push({
        amount: Math.round(amount * 100) / 100,
        due_date: dueDate.toISOString().split("T")[0],
        status: "pending",
        label: `Installment ${i + 1}`,
      });
    }
    setInstallments(newInstallments);
  }

  function handleCreatePlan() {
    if (!totalAmount || installments.length === 0) {
      toast({ title: "Please fill in all fields and generate installments", variant: "destructive" });
      return;
    }
    createMutation.mutate({
      eventId: eventId || null,
      planName,
      totalAmount: parseFloat(totalAmount),
      currency,
      installments,
    });
  }

  function markInstallmentPaid(plan: PaymentPlan, index: number) {
    const updated = [...plan.installments];
    updated[index] = {
      ...updated[index],
      status: "paid",
      paid_at: new Date().toISOString(),
    };
    updateMutation.mutate({ id: plan.id, data: { installments: updated } });
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case "paid":
        return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30"><CheckCircle2 className="w-3 h-3 mr-1" />Paid</Badge>;
      case "overdue":
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30"><AlertCircle className="w-3 h-3 mr-1" />Overdue</Badge>;
      default:
        return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
    }
  }

  function getPlanProgress(plan: PaymentPlan) {
    const paid = plan.installments.filter((i) => i.status === "paid").length;
    return { paid, total: plan.installments.length, percentage: Math.round((paid / plan.installments.length) * 100) };
  }

  function formatCurrency(amount: number, curr: string) {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: curr }).format(amount);
  }

  function getEventName(eId: string | null) {
    if (!eId) return "No event linked";
    const event = events.find((e: any) => e.id === eId);
    return event?.name || "Unknown event";
  }

  const totalOutstanding = filteredPlans.reduce((sum, p) => {
    const unpaid = p.installments
      .filter((i) => i.status !== "paid")
      .reduce((s, i) => s + i.amount, 0);
    return sum + unpaid;
  }, 0);

  const totalCollected = filteredPlans.reduce((sum, p) => {
    const paid = p.installments
      .filter((i) => i.status === "paid")
      .reduce((s, i) => s + i.amount, 0);
    return sum + paid;
  }, 0);

  if (isLoading) {
    return (
      <PlannerLayout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#8B1538] mx-auto mb-4" />
            <p className="text-lg text-white/70">Loading payment plans...</p>
          </div>
        </div>
      </PlannerLayout>
    );
  }

  return (
    <PlannerLayout>
      <div className="px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <CreditCard className="w-7 h-7 text-[#8B1538]" />
              Payment Plans & Installments
            </h1>
            <p className="text-white/60 text-sm mt-1">Create and manage payment schedules for your events</p>
          </div>
          <div className="flex items-center gap-2">
            {filteredPlans.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="border-white/20 text-white hover:bg-white/10"
                onClick={() => {
                  const rows: Record<string, any>[] = [];
                  filteredPlans.forEach((plan) => {
                    plan.installments.forEach((inst, idx) => {
                      const isOverdue = inst.status === "pending" && new Date(inst.due_date) < new Date();
                      rows.push({
                        plan_name: plan.plan_name || "Payment Plan",
                        event: getEventName(plan.event_id),
                        installment: inst.label || `Installment ${idx + 1}`,
                        amount: formatCurrency(inst.amount, plan.currency || "NGN"),
                        due_date: new Date(inst.due_date).toLocaleDateString(),
                        status: isOverdue ? "Overdue" : inst.status === "paid" ? "Paid" : "Pending",
                        paid_at: inst.paid_at ? new Date(inst.paid_at).toLocaleDateString() : "-",
                      });
                    });
                  });
                  openPrintWindow({
                    title: "Payment Plans & Installments",
                    stats: [
                      { label: "Active Plans", value: filteredPlans.length },
                      { label: "Collected", value: formatCurrency(totalCollected, "NGN") },
                      { label: "Outstanding", value: formatCurrency(totalOutstanding, "NGN") },
                    ],
                    columns: [
                      { header: "Plan", key: "plan_name" },
                      { header: "Event", key: "event" },
                      { header: "Installment", key: "installment" },
                      { header: "Amount", key: "amount", align: "right" },
                      { header: "Due Date", key: "due_date" },
                      { header: "Status", key: "status", align: "center" },
                      { header: "Paid On", key: "paid_at" },
                    ],
                    rows,
                    orientation: "landscape",
                  });
                }}
              >
                <Printer className="w-4 h-4 mr-2" />
                Print
              </Button>
            )}
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button className="bg-[#8B1538] hover:bg-[#6d1029] text-white">
                  <Plus className="w-4 h-4 mr-2" />
                  New Payment Plan
                </Button>
              </DialogTrigger>
            <DialogContent className="max-w-lg bg-[#1a0a1a] border-[#8B1538]/30 text-white max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-white">Create Payment Plan</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <Label className="text-white/80">Plan Name</Label>
                  <Input
                    value={planName}
                    onChange={(e) => setPlanName(e.target.value)}
                    placeholder="e.g. Wedding Deposit Plan"
                    className="bg-white/5 border-white/10 text-white"
                  />
                </div>
                <div>
                  <Label className="text-white/80">Event (Optional)</Label>
                  <Select value={eventId} onValueChange={setEventId}>
                    <SelectTrigger className="bg-white/5 border-white/10 text-white">
                      <SelectValue placeholder="Link to event" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No event</SelectItem>
                      {events.map((event: any) => (
                        <SelectItem key={event.id} value={event.id}>{event.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-white/80">Total Amount</Label>
                    <Input
                      type="number"
                      value={totalAmount}
                      onChange={(e) => setTotalAmount(e.target.value)}
                      placeholder="0.00"
                      className="bg-white/5 border-white/10 text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-white/80">Currency</Label>
                    <Select value={currency} onValueChange={setCurrency}>
                      <SelectTrigger className="bg-white/5 border-white/10 text-white">
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
                  <Label className="text-white/80">Number of Installments</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      min={2}
                      max={12}
                      value={installmentCount}
                      onChange={(e) => setInstallmentCount(parseInt(e.target.value) || 3)}
                      className="bg-white/5 border-white/10 text-white"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={generateInstallments}
                      className="border-[#8B1538]/50 text-white hover:bg-[#8B1538]/20 whitespace-nowrap"
                    >
                      Generate
                    </Button>
                  </div>
                </div>
                {installments.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-white/80">Installment Schedule</Label>
                    {installments.map((inst, idx) => (
                      <div key={idx} className="flex items-center gap-2 p-2 rounded bg-white/5 border border-white/10">
                        <span className="text-sm text-white/60 w-24">{inst.label}</span>
                        <Input
                          type="number"
                          value={inst.amount}
                          onChange={(e) => {
                            const updated = [...installments];
                            updated[idx] = { ...updated[idx], amount: parseFloat(e.target.value) || 0 };
                            setInstallments(updated);
                          }}
                          className="bg-white/5 border-white/10 text-white h-8 w-28"
                        />
                        <Input
                          type="date"
                          value={inst.due_date}
                          onChange={(e) => {
                            const updated = [...installments];
                            updated[idx] = { ...updated[idx], due_date: e.target.value };
                            setInstallments(updated);
                          }}
                          className="bg-white/5 border-white/10 text-white h-8"
                        />
                      </div>
                    ))}
                  </div>
                )}
                <Button
                  onClick={handleCreatePlan}
                  disabled={createMutation.isPending}
                  className="w-full bg-[#8B1538] hover:bg-[#6d1029] text-white"
                >
                  {createMutation.isPending ? "Creating..." : "Create Payment Plan"}
                </Button>
              </div>
            </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-[#8B1538]/20">
                <Banknote className="w-5 h-5 text-[#8B1538]" />
              </div>
              <div>
                <p className="text-sm text-white/60">Active Plans</p>
                <p className="text-xl font-bold text-white">{filteredPlans.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/20">
                <DollarSign className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-sm text-white/60">Collected</p>
                <p className="text-xl font-bold text-emerald-400">{formatCurrency(totalCollected, "NGN")}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/20">
                <Clock className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <p className="text-sm text-white/60">Outstanding</p>
                <p className="text-xl font-bold text-amber-400">{formatCurrency(totalOutstanding, "NGN")}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mb-4">
          <Select value={selectedEventId} onValueChange={setSelectedEventId}>
            <SelectTrigger className="w-64 bg-white/5 border-white/10 text-white">
              <SelectValue placeholder="Filter by event" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Events</SelectItem>
              {events.map((event: any) => (
                <SelectItem key={event.id} value={event.id}>{event.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {filteredPlans.length === 0 ? (
          <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
            <CardContent className="p-12 text-center">
              <CreditCard className="w-12 h-12 text-white/20 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">No Payment Plans Yet</h3>
              <p className="text-white/60 mb-4">Create your first payment plan to track installments for your events.</p>
              <Button onClick={() => setShowCreateDialog(true)} className="bg-[#8B1538] hover:bg-[#6d1029] text-white">
                <Plus className="w-4 h-4 mr-2" />
                Create Payment Plan
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredPlans.map((plan) => {
              const progress = getPlanProgress(plan);
              return (
                <Card key={plan.id} className="bg-white/5 border-white/10 backdrop-blur-sm">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-white text-lg">{plan.plan_name || "Payment Plan"}</CardTitle>
                        <p className="text-sm text-white/50 mt-1">{getEventName(plan.event_id)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={plan.status === "active" ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" : "bg-white/10 text-white/50"}>
                          {plan.status}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteMutation.mutate(plan.id)}
                          className="text-red-400 hover:text-red-300 hover:bg-red-500/10 h-8 w-8 p-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4 mb-4">
                      <div>
                        <span className="text-sm text-white/50">Total</span>
                        <p className="text-lg font-bold text-white">{formatCurrency(Number(plan.total_amount), plan.currency || "NGN")}</p>
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-white/60">{progress.paid} of {progress.total} paid</span>
                          <span className="text-white/60">{progress.percentage}%</span>
                        </div>
                        <div className="w-full bg-white/10 rounded-full h-2">
                          <div
                            className="bg-gradient-to-r from-[#8B1538] to-emerald-500 h-2 rounded-full transition-all"
                            style={{ width: `${progress.percentage}%` }}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {plan.installments.map((inst, idx) => {
                        const isOverdue = inst.status === "pending" && new Date(inst.due_date) < new Date();
                        const displayStatus = isOverdue ? "overdue" : inst.status;
                        return (
                          <div
                            key={idx}
                            className={`flex items-center justify-between p-3 rounded-lg border ${
                              displayStatus === "paid"
                                ? "bg-emerald-500/5 border-emerald-500/20"
                                : displayStatus === "overdue"
                                ? "bg-red-500/5 border-red-500/20"
                                : "bg-white/5 border-white/10"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                                displayStatus === "paid" ? "bg-emerald-500/20 text-emerald-400" :
                                displayStatus === "overdue" ? "bg-red-500/20 text-red-400" :
                                "bg-white/10 text-white/60"
                              }`}>
                                {idx + 1}
                              </div>
                              <div>
                                <p className="text-sm font-medium text-white">{inst.label || `Installment ${idx + 1}`}</p>
                                <p className="text-xs text-white/50 flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  Due: {new Date(inst.due_date).toLocaleDateString()}
                                  {inst.paid_at && (
                                    <span className="ml-2 text-emerald-400">
                                      Paid: {new Date(inst.paid_at).toLocaleDateString()}
                                    </span>
                                  )}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="font-semibold text-white">
                                {formatCurrency(inst.amount, plan.currency || "NGN")}
                              </span>
                              {getStatusBadge(displayStatus)}
                              {displayStatus !== "paid" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => markInstallmentPaid(plan, idx)}
                                  disabled={updateMutation.isPending}
                                  className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 h-7 text-xs"
                                >
                                  <CheckCircle2 className="w-3 h-3 mr-1" />
                                  Mark Paid
                                </Button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </PlannerLayout>
  );
}
