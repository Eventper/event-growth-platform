import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import PlannerSidebar from "@/components/PlannerSidebar";
import { useAuth } from "@/lib/auth";
import { ShieldAlert } from "lucide-react";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  BarChart3,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  Receipt,
  CreditCard,
  Printer,
} from "lucide-react";
import { openPrintWindow } from "@/lib/printUtils";
import { Button } from "@/components/ui/button";

interface InvoiceSummary {
  currency: string;
  total_invoiced: number;
  total_paid: number;
  total_outstanding: number;
  total_overdue: number;
  invoice_count: number;
}

interface BudgetSummary {
  currency: string;
  total_budget: number;
  total_spent: number;
  event_count: number;
}

interface EventBreakdown {
  id: number;
  name: string;
  type: string;
  event_category: string;
  currency: string;
  status: string;
  budget: number;
  total_invoiced: number;
  total_paid: number;
  total_estimated: number;
  total_actual: number;
}

interface MonthlyTrend {
  month: string;
  total: number;
  paid: number;
}

interface FinancialData {
  invoiceSummary: InvoiceSummary[];
  budgetSummary: BudgetSummary[];
  eventBreakdown: EventBreakdown[];
  monthlyTrend: MonthlyTrend[];
}

const CURRENCIES = ["NGN", "GBP", "USD", "EUR"] as const;
const EXCHANGE_RATES: Record<string, number> = {
  NGN: 1,
  GBP: 2000,
  USD: 1550,
  EUR: 1700,
};

function formatNumber(value: number, currency?: string): string {
  const formatted = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
  return currency ? `${currency} ${formatted}` : formatted;
}

function convertToBase(amount: number, fromCurrency: string, baseCurrency: string): number {
  const fromRate = EXCHANGE_RATES[fromCurrency] || 1;
  const toRate = EXCHANGE_RATES[baseCurrency] || 1;
  const inNGN = amount * fromRate;
  return inNGN / toRate;
}

export default function FinancialDashboard() {
  const { user } = useAuth();
  const [baseCurrency, setBaseCurrency] = useState<string>("NGN");
  const isManagement = user?.role === 'admin' || user?.role === 'planner';

  const { data, isLoading } = useQuery<FinancialData>({
    queryKey: ["/api/financial/summary"],
    enabled: isManagement,
  });

  if (!isManagement) {
    return (
      <div className="flex min-h-screen">
        <PlannerSidebar />
        <main className="flex-1 lg:ml-60 p-8 bg-gradient-to-br from-[#330311] to-[#2a0209] min-h-screen flex items-center justify-center">
          <div className="text-center text-white/80">
            <ShieldAlert className="w-16 h-16 mx-auto mb-4 text-white/40" />
            <h2 className="text-2xl font-bold text-white mb-2">Access Restricted</h2>
            <p>Financial data is only available to key management personnel.</p>
          </div>
        </main>
      </div>
    );
  }

  const invoiceSummary = data?.invoiceSummary || [];
  const budgetSummary = data?.budgetSummary || [];
  const eventBreakdown = data?.eventBreakdown || [];
  const monthlyTrend = data?.monthlyTrend || [];

  const totalRevenue = invoiceSummary.reduce(
    (sum, s) => sum + convertToBase(Number(s.total_invoiced) || 0, s.currency, baseCurrency),
    0
  );
  const totalCollected = invoiceSummary.reduce(
    (sum, s) => sum + convertToBase(Number(s.total_paid) || 0, s.currency, baseCurrency),
    0
  );
  const totalOutstanding = invoiceSummary.reduce(
    (sum, s) => sum + convertToBase(Number(s.total_outstanding) || 0, s.currency, baseCurrency),
    0
  );
  const totalOverdue = invoiceSummary.reduce(
    (sum, s) => sum + convertToBase(Number(s.total_overdue) || 0, s.currency, baseCurrency),
    0
  );

  const totalBudget = budgetSummary.reduce(
    (sum, b) => sum + convertToBase(Number(b.total_budget) || 0, b.currency, baseCurrency),
    0
  );
  const totalSpent = budgetSummary.reduce(
    (sum, b) => sum + convertToBase(Number(b.total_spent) || 0, b.currency, baseCurrency),
    0
  );
  const totalRemaining = totalBudget - totalSpent;
  const budgetUtilization = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

  const currencyDistribution = invoiceSummary.map((s) => {
    const converted = convertToBase(Number(s.total_invoiced) || 0, s.currency, baseCurrency);
    return { currency: s.currency, amount: converted, percentage: totalRevenue > 0 ? (converted / totalRevenue) * 100 : 0 };
  });

  const maxTrend = Math.max(...monthlyTrend.map((m) => Number(m.total) || 0), 1);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#330311] to-[#2a0209]">
      <PlannerSidebar />
      <main className="lg:ml-60 p-4 sm:p-6 lg:p-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <BarChart3 className="w-7 h-7 text-amber-400" />
              Financial Dashboard
            </h1>
            <p className="text-white/60 text-sm mt-1">Multi-currency financial overview</p>
          </div>
          <div className="flex items-center gap-2">
            {eventBreakdown.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="border-white/20 text-white hover:bg-white/10"
                onClick={() => {
                  openPrintWindow({
                    title: "Financial Dashboard",
                    subtitle: `Base Currency: ${baseCurrency} — Printed: ${new Date().toLocaleString()}`,
                    stats: [
                      { label: "Total Invoiced", value: formatNumber(totalRevenue, baseCurrency) },
                      { label: "Total Paid", value: formatNumber(totalCollected, baseCurrency) },
                      { label: "Outstanding", value: formatNumber(totalOutstanding, baseCurrency) },
                      { label: "Overdue", value: formatNumber(totalOverdue, baseCurrency) },
                      { label: "Total Budget", value: formatNumber(totalBudget, baseCurrency) },
                      { label: "Total Spent", value: formatNumber(totalSpent, baseCurrency) },
                      { label: "Remaining", value: formatNumber(Math.abs(totalRemaining), baseCurrency) },
                      { label: "Budget Utilization", value: `${budgetUtilization.toFixed(1)}%` },
                    ],
                    columns: [
                      { header: "Event", key: "name" },
                      { header: "Type", key: "type" },
                      { header: "Currency", key: "currency" },
                      { header: "Budget", key: "budget", align: "right" },
                      { header: "Invoiced", key: "invoiced", align: "right" },
                      { header: "Paid", key: "paid", align: "right" },
                      { header: "Spent", key: "spent", align: "right" },
                      { header: "Profit", key: "profit", align: "right" },
                      { header: "Margin", key: "margin", align: "right" },
                    ],
                    rows: eventBreakdown.map((evt) => {
                      const invoiced = convertToBase(Number(evt.total_invoiced) || 0, evt.currency || 'NGN', baseCurrency);
                      const actual = convertToBase(Number(evt.total_actual) || 0, evt.currency || 'NGN', baseCurrency);
                      const profit = invoiced - actual;
                      const margin = invoiced > 0 ? (profit / invoiced) * 100 : 0;
                      return {
                        name: evt.name,
                        type: evt.type,
                        currency: evt.currency || 'NGN',
                        budget: formatNumber(convertToBase(Number(evt.budget) || 0, evt.currency || 'NGN', baseCurrency), baseCurrency),
                        invoiced: formatNumber(invoiced, baseCurrency),
                        paid: formatNumber(convertToBase(Number(evt.total_paid) || 0, evt.currency || 'NGN', baseCurrency), baseCurrency),
                        spent: formatNumber(actual, baseCurrency),
                        profit: `${profit >= 0 ? "+" : ""}${formatNumber(profit, baseCurrency)}`,
                        margin: `${margin.toFixed(1)}%`,
                      };
                    }),
                    orientation: "landscape",
                  });
                }}
              >
                <Printer className="w-4 h-4 mr-2" />
                Print
              </Button>
            )}
            <span className="text-white/60 text-sm">Base Currency:</span>
            <div className="flex bg-white/10 backdrop-blur-sm rounded-lg overflow-hidden border border-white/10">
              {CURRENCIES.map((cur) => (
                <button
                  key={cur}
                  onClick={() => setBaseCurrency(cur)}
                  className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                    baseCurrency === cur
                      ? "bg-amber-500 text-black"
                      : "text-white/70 hover:text-white hover:bg-white/10"
                  }`}
                >
                  {cur}
                </button>
              ))}
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin w-10 h-10 border-3 border-amber-400 border-t-transparent rounded-full" />
          </div>
        ) : (
          <div className="space-y-6">
            <div>
              <h2 className="text-white/70 text-xs uppercase tracking-wider font-semibold mb-3">Revenue Overview</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <SummaryCard
                  title="Total Invoiced"
                  value={formatNumber(totalRevenue, baseCurrency)}
                  icon={<Receipt className="w-5 h-5" />}
                  iconBg="bg-blue-500/20"
                  iconColor="text-blue-400"
                  trend={<ArrowUpRight className="w-4 h-4 text-green-400" />}
                />
                <SummaryCard
                  title="Total Paid"
                  value={formatNumber(totalCollected, baseCurrency)}
                  icon={<TrendingUp className="w-5 h-5" />}
                  iconBg="bg-green-500/20"
                  iconColor="text-green-400"
                  trend={<ArrowUpRight className="w-4 h-4 text-green-400" />}
                />
                <SummaryCard
                  title="Outstanding"
                  value={formatNumber(totalOutstanding, baseCurrency)}
                  icon={<PieChart className="w-5 h-5" />}
                  iconBg="bg-amber-500/20"
                  iconColor="text-amber-400"
                  trend={totalOutstanding > 0 ? <ArrowDownRight className="w-4 h-4 text-amber-400" /> : null}
                />
                <SummaryCard
                  title="Overdue"
                  value={formatNumber(totalOverdue, baseCurrency)}
                  icon={<TrendingDown className="w-5 h-5" />}
                  iconBg="bg-red-500/20"
                  iconColor="text-red-400"
                  trend={totalOverdue > 0 ? <ArrowDownRight className="w-4 h-4 text-red-400" /> : null}
                />
              </div>
            </div>

            <div>
              <h2 className="text-white/70 text-xs uppercase tracking-wider font-semibold mb-3">Expense Tracking</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <SummaryCard
                  title="Total Budget"
                  value={formatNumber(totalBudget, baseCurrency)}
                  icon={<Wallet className="w-5 h-5" />}
                  iconBg="bg-purple-500/20"
                  iconColor="text-purple-400"
                  trend={null}
                />
                <SummaryCard
                  title="Total Spent"
                  value={formatNumber(totalSpent, baseCurrency)}
                  icon={<CreditCard className="w-5 h-5" />}
                  iconBg="bg-orange-500/20"
                  iconColor="text-orange-400"
                  trend={totalSpent > totalBudget ? <ArrowDownRight className="w-4 h-4 text-red-400" /> : <ArrowUpRight className="w-4 h-4 text-green-400" />}
                />
                <SummaryCard
                  title="Remaining"
                  value={formatNumber(Math.abs(totalRemaining), baseCurrency)}
                  icon={<DollarSign className="w-5 h-5" />}
                  iconBg={totalRemaining >= 0 ? "bg-green-500/20" : "bg-red-500/20"}
                  iconColor={totalRemaining >= 0 ? "text-green-400" : "text-red-400"}
                  trend={null}
                  subtitle={totalRemaining < 0 ? "Over budget" : undefined}
                />
                <div className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/10 p-5">
                  <p className="text-white/60 text-sm mb-2">Budget Utilization</p>
                  <p className="text-white text-xl font-bold">{budgetUtilization.toFixed(1)}%</p>
                  <div className="mt-3 h-2 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${budgetUtilization > 100 ? "bg-red-500" : budgetUtilization > 80 ? "bg-amber-500" : "bg-green-500"}`}
                      style={{ width: `${Math.min(budgetUtilization, 100)}%` }}
                    />
                  </div>
                  <p className="text-white/40 text-xs mt-1">{budgetSummary.reduce((s, b) => s + Number(b.event_count || 0), 0)} events tracked</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/10 p-6">
                <h2 className="text-white font-semibold text-lg mb-4 flex items-center gap-2">
                  <PieChart className="w-5 h-5 text-amber-400" />
                  Currency Breakdown
                </h2>
                {invoiceSummary.length === 0 ? (
                  <p className="text-white/40 text-sm">No invoice data available</p>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 flex-wrap mb-2">
                      {currencyDistribution.map((cd) => {
                        const colors: Record<string, string> = { NGN: "bg-blue-500", GBP: "bg-green-500", USD: "bg-amber-500", EUR: "bg-purple-500" };
                        return (
                          <div key={cd.currency} className="flex items-center gap-1.5 text-xs text-white/70">
                            <span className={`w-3 h-3 rounded ${colors[cd.currency] || "bg-white/30"}`} />
                            {cd.currency} ({cd.percentage.toFixed(1)}%)
                          </div>
                        );
                      })}
                    </div>
                    <div className="h-4 rounded-full overflow-hidden flex bg-white/5">
                      {currencyDistribution.map((cd) => {
                        const colors: Record<string, string> = { NGN: "bg-blue-500", GBP: "bg-green-500", USD: "bg-amber-500", EUR: "bg-purple-500" };
                        return cd.percentage > 0 ? (
                          <div
                            key={cd.currency}
                            className={`h-full ${colors[cd.currency] || "bg-white/30"} transition-all`}
                            style={{ width: `${cd.percentage}%` }}
                            title={`${cd.currency}: ${cd.percentage.toFixed(1)}%`}
                          />
                        ) : null;
                      })}
                    </div>
                    <div className="space-y-3 mt-4">
                      {invoiceSummary.map((s) => (
                        <div key={s.currency} className="bg-white/5 rounded-lg p-4 border border-white/5">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-white font-medium">{s.currency}</span>
                            <span className="text-white/60 text-sm">{s.invoice_count} invoices</span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>
                              <span className="text-white/50">Invoiced</span>
                              <p className="text-white font-medium">{formatNumber(Number(s.total_invoiced) || 0)}</p>
                            </div>
                            <div>
                              <span className="text-white/50">Paid</span>
                              <p className="text-green-400 font-medium">{formatNumber(Number(s.total_paid) || 0)}</p>
                            </div>
                            <div>
                              <span className="text-white/50">Outstanding</span>
                              <p className="text-amber-400 font-medium">{formatNumber(Number(s.total_outstanding) || 0)}</p>
                            </div>
                            <div>
                              <span className="text-white/50">Overdue</span>
                              <p className="text-red-400 font-medium">{formatNumber(Number(s.total_overdue) || 0)}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/10 p-6">
                <h2 className="text-white font-semibold text-lg mb-4 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-amber-400" />
                  Monthly Revenue Trend
                </h2>
                {monthlyTrend.length === 0 ? (
                  <p className="text-white/40 text-sm">No monthly data available</p>
                ) : (
                  <div className="space-y-3">
                    {monthlyTrend.map((m) => {
                      const total = Number(m.total) || 0;
                      const paid = Number(m.paid) || 0;
                      const totalWidth = (total / maxTrend) * 100;
                      const paidWidth = total > 0 ? (paid / total) * totalWidth : 0;
                      return (
                        <div key={m.month}>
                          <div className="flex items-center justify-between text-sm mb-1">
                            <span className="text-white/70">{m.month}</span>
                            <span className="text-white/50">{formatNumber(total)}</span>
                          </div>
                          <div className="relative h-6 bg-white/5 rounded-full overflow-hidden">
                            <div
                              className="absolute left-0 top-0 h-full bg-amber-500/30 rounded-full transition-all"
                              style={{ width: `${totalWidth}%` }}
                            />
                            <div
                              className="absolute left-0 top-0 h-full bg-green-500 rounded-full transition-all"
                              style={{ width: `${paidWidth}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                    <div className="flex items-center gap-4 mt-2 text-xs text-white/50">
                      <span className="flex items-center gap-1">
                        <span className="w-3 h-3 rounded bg-amber-500/30" /> Total
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-3 h-3 rounded bg-green-500" /> Paid
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/10 p-6">
              <h2 className="text-white font-semibold text-lg mb-4 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-amber-400" />
                Event-by-Event Financial Breakdown
              </h2>
              {eventBreakdown.length === 0 ? (
                <p className="text-white/40 text-sm">No event data available</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="text-left text-white/60 font-medium py-3 px-2">Event</th>
                        <th className="text-left text-white/60 font-medium py-3 px-2">Type</th>
                        <th className="text-left text-white/60 font-medium py-3 px-2">Currency</th>
                        <th className="text-right text-white/60 font-medium py-3 px-2">Budget</th>
                        <th className="text-right text-white/60 font-medium py-3 px-2">Invoiced</th>
                        <th className="text-right text-white/60 font-medium py-3 px-2">Paid</th>
                        <th className="text-right text-white/60 font-medium py-3 px-2">Spent</th>
                        <th className="text-right text-white/60 font-medium py-3 px-2">Profit</th>
                        <th className="text-right text-white/60 font-medium py-3 px-2">Margin</th>
                      </tr>
                    </thead>
                    <tbody>
                      {eventBreakdown.map((evt) => {
                        const budget = Number(evt.budget) || 0;
                        const invoiced = Number(evt.total_invoiced) || 0;
                        const paid = Number(evt.total_paid) || 0;
                        const actual = Number(evt.total_actual) || 0;
                        const profit = invoiced - actual;
                        const margin = invoiced > 0 ? (profit / invoiced) * 100 : 0;
                        const isPositive = profit >= 0;

                        const convertedBudget = convertToBase(budget, evt.currency || 'NGN', baseCurrency);
                        const convertedInvoiced = convertToBase(invoiced, evt.currency || 'NGN', baseCurrency);
                        const convertedPaid = convertToBase(paid, evt.currency || 'NGN', baseCurrency);
                        const convertedActual = convertToBase(actual, evt.currency || 'NGN', baseCurrency);
                        const convertedProfit = convertedInvoiced - convertedActual;

                        return (
                          <tr key={evt.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                            <td className="py-3 px-2 text-white font-medium max-w-[200px] truncate">{evt.name}</td>
                            <td className="py-3 px-2 text-white/70 capitalize">{evt.type}</td>
                            <td className="py-3 px-2 text-white/70">{evt.currency || 'NGN'}</td>
                            <td className="py-3 px-2 text-right text-white/70">{formatNumber(convertedBudget, baseCurrency)}</td>
                            <td className="py-3 px-2 text-right text-white/70">{formatNumber(convertedInvoiced, baseCurrency)}</td>
                            <td className="py-3 px-2 text-right text-green-400">{formatNumber(convertedPaid, baseCurrency)}</td>
                            <td className="py-3 px-2 text-right text-amber-400">{formatNumber(convertedActual, baseCurrency)}</td>
                            <td className={`py-3 px-2 text-right font-medium ${isPositive ? "text-green-400" : "text-red-400"}`}>
                              {isPositive ? "+" : ""}{formatNumber(convertedProfit, baseCurrency)}
                            </td>
                            <td className={`py-3 px-2 text-right font-medium ${isPositive ? "text-green-400" : "text-red-400"}`}>
                              {margin.toFixed(1)}%
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-white/20">
                        <td className="py-3 px-2 text-white font-bold" colSpan={3}>Totals ({baseCurrency})</td>
                        <td className="py-3 px-2 text-right text-white font-bold">
                          {formatNumber(
                            eventBreakdown.reduce((s, e) => s + convertToBase(Number(e.budget) || 0, e.currency || 'NGN', baseCurrency), 0),
                            baseCurrency
                          )}
                        </td>
                        <td className="py-3 px-2 text-right text-white font-bold">
                          {formatNumber(totalRevenue, baseCurrency)}
                        </td>
                        <td className="py-3 px-2 text-right text-green-400 font-bold">
                          {formatNumber(totalCollected, baseCurrency)}
                        </td>
                        <td className="py-3 px-2 text-right text-amber-400 font-bold">
                          {formatNumber(totalSpent, baseCurrency)}
                        </td>
                        <td className={`py-3 px-2 text-right font-bold ${totalRevenue - totalSpent >= 0 ? "text-green-400" : "text-red-400"}`}>
                          {totalRevenue - totalSpent >= 0 ? "+" : ""}{formatNumber(totalRevenue - totalSpent, baseCurrency)}
                        </td>
                        <td className={`py-3 px-2 text-right font-bold ${totalRevenue - totalSpent >= 0 ? "text-green-400" : "text-red-400"}`}>
                          {totalRevenue > 0 ? ((totalRevenue - totalSpent) / totalRevenue * 100).toFixed(1) : "0.0"}%
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/10 p-6">
              <h2 className="text-white font-semibold text-lg mb-4 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-amber-400" />
                Budget vs Actual by Currency
              </h2>
              {budgetSummary.length === 0 ? (
                <p className="text-white/40 text-sm">No budget data available</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {budgetSummary.map((b) => {
                    const budget = Number(b.total_budget) || 0;
                    const spent = Number(b.total_spent) || 0;
                    const remaining = budget - spent;
                    const pct = budget > 0 ? (spent / budget) * 100 : 0;
                    const overBudget = spent > budget;
                    return (
                      <div key={b.currency} className="bg-white/5 rounded-lg p-4 border border-white/5">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-white font-medium text-lg">{b.currency}</span>
                          <span className="text-white/50 text-sm">{b.event_count} events</span>
                        </div>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-white/50">Budget</span>
                            <span className="text-white font-medium">{formatNumber(budget)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-white/50">Spent</span>
                            <span className={overBudget ? "text-red-400 font-medium" : "text-amber-400 font-medium"}>
                              {formatNumber(spent)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-white/50">Remaining</span>
                            <span className={`font-medium ${remaining >= 0 ? "text-green-400" : "text-red-400"}`}>
                              {remaining >= 0 ? "" : "-"}{formatNumber(Math.abs(remaining))}
                            </span>
                          </div>
                        </div>
                        <div className="mt-3 h-2 bg-white/10 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${overBudget ? "bg-red-500" : "bg-green-500"}`}
                            style={{ width: `${Math.min(pct, 100)}%` }}
                          />
                        </div>
                        <p className="text-white/40 text-xs mt-1 text-right">{pct.toFixed(1)}% used</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function SummaryCard({
  title,
  value,
  icon,
  iconBg,
  iconColor,
  trend,
  subtitle,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  trend: React.ReactNode;
  subtitle?: string;
}) {
  return (
    <div className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/10 p-5">
      <div className="flex items-center justify-between mb-3">
        <div className={`p-2 rounded-lg ${iconBg}`}>
          <span className={iconColor}>{icon}</span>
        </div>
        {trend}
      </div>
      <p className="text-white/60 text-sm">{title}</p>
      <p className="text-white text-xl font-bold mt-1">{value}</p>
      {subtitle && <p className="text-red-400 text-xs mt-1">{subtitle}</p>}
    </div>
  );
}
