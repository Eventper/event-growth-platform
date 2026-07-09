import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/PageHeader";
import { apiGet } from "@/lib/api";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { TrendingUp, Mail, MessageSquare, CheckCircle, AlertCircle, Zap } from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────────────
interface FunnelMetric {
  imported: number;
  enriched: number;
  scored: number;
  approvedForOutreach: number;
  inSequence: number;
  replied: number;
  interested: number;
  declined: number;
  doNotContact: number;
}

interface ConversionRates {
  importToEnriched: number;
  importToApproved: number;
  importToReplied: number;
  importToInterested: number;
  sentToReplyRate: number;
  replyToInterestRate: number;
}

interface EmailPerformance {
  sent: number;
  bounced: number;
  delivered: number;
  unopened: number;
  opens: number;
  clicks: number;
}

interface ReplyClassification {
  interested: number;
  declined: number;
  needsCall: number;
  sendInfo: number;
  autoReply: number;
  other: number;
}

interface CategoryMetric {
  category: string;
  total: number;
  approved: number;
  sent: number;
  approvalRate: number;
}

interface DashboardCard {
  title: string;
  metrics: Array<{
    label: string;
    value: number;
    detail: string;
    rate?: number;
  }>;
}

interface ResponseMetrics {
  title: string;
  metrics: Array<{
    label: string;
    value: number;
    detail: string;
    rate?: number;
  }>;
}

interface Insight {
  type: "success" | "warning" | "error" | "info";
  message: string;
  action?: string;
}

interface HealthCheck {
  name: string;
  status: "ok" | "warning" | "error";
  message: string;
}

interface DashboardData {
  pipelineCard: DashboardCard;
  responseCard: ResponseMetrics;
  insights: Insight[];
  categoryCard: {
    title: string;
    data: CategoryMetric[];
  };
  healthCheck: {
    title: string;
    status: "healthy" | "degraded" | "unhealthy";
    checks: HealthCheck[];
  };
}

// ── Outreach Analytics Page ──────────────────────────────────────────────────
export default function OutreachAnalyticsDashboard() {
  const eventId = new URLSearchParams(window.location.search).get("eventId");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Fetch analytics dashboard data
  const { data: dashboardData, isLoading: isDashLoading, error: dashError } = useQuery({
    queryKey: ["outreach-analytics-dashboard", eventId],
    queryFn: async () => {
      const response = await apiGet(`/api/growth/outreach/analytics-dashboard?eventId=${eventId}`);
      return response.dashboard as DashboardData;
    },
    staleTime: 60000, // 1 minute
  });

  // Fetch funnel analytics data
  const { data: funnelData, isLoading: isFunnelLoading } = useQuery({
    queryKey: ["outreach-funnel-analytics", eventId],
    queryFn: async () => {
      const response = await apiGet(`/api/growth/outreach/funnel-analytics?eventId=${eventId}`);
      return response;
    },
    staleTime: 60000,
  });

  const isLoading = isDashLoading || isFunnelLoading;
  const error = dashError;

  if (error) {
    return (
      <div className="p-8">
        <PageHeader title="Outreach Analytics" subtitle="Campaign performance & insights" />
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-red-800">
          <AlertCircle className="w-5 h-5 inline mr-2" />
          Failed to load analytics: {(error as any)?.message}
        </div>
      </div>
    );
  }

  if (isLoading || !dashboardData) {
    return (
      <div className="p-8">
        <PageHeader title="Outreach Analytics" subtitle="Campaign performance & insights" />
        <div className="animate-pulse space-y-4">
          <div className="h-48 bg-gray-200 rounded-lg" />
          <div className="grid grid-cols-2 gap-4">
            <div className="h-32 bg-gray-200 rounded-lg" />
            <div className="h-32 bg-gray-200 rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  // Prepare chart data for funnel
  const funnelChartData = funnelData
    ? [
        { stage: "Imported", count: funnelData.funnelMetrics.imported },
        { stage: "Enriched", count: funnelData.funnelMetrics.enriched },
        { stage: "Approved", count: funnelData.funnelMetrics.approvedForOutreach },
        { stage: "Sent", count: funnelData.funnelMetrics.inSequence },
        { stage: "Replied", count: funnelData.funnelMetrics.replied },
        { stage: "Interested", count: funnelData.funnelMetrics.interested },
      ]
    : [];

  // Prepare chart data for replies
  const replyChartData = funnelData?.replyClassifications
    ? [
        { name: "Interested", value: funnelData.replyClassifications.interested, fill: "#10b981" },
        { name: "Needs Follow-up", value: funnelData.replyClassifications.needsCall, fill: "#f59e0b" },
        { name: "Send Info", value: funnelData.replyClassifications.sendInfo, fill: "#3b82f6" },
        { name: "Declined", value: funnelData.replyClassifications.declined, fill: "#ef4444" },
        { name: "Auto-reply", value: funnelData.replyClassifications.autoReply, fill: "#6b7280" },
      ].filter((d) => d.value > 0)
    : [];

  const getHealthIcon = (status: string) => {
    switch (status) {
      case "ok":
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case "warning":
        return <AlertCircle className="w-4 h-4 text-yellow-600" />;
      default:
        return <AlertCircle className="w-4 h-4 text-red-600" />;
    }
  };

  const getHealthColor = (status: string) => {
    switch (status) {
      case "ok":
        return "text-green-600";
      case "warning":
        return "text-yellow-600";
      default:
        return "text-red-600";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-8">
      <PageHeader
        title="Outreach Analytics"
        subtitle="Real-time campaign performance, funnel metrics, and conversion insights"
      />

      <Tabs defaultValue="overview" className="mt-8 space-y-6">
        <TabsList className="grid w-full grid-cols-4 lg:grid-cols-7 gap-2">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="funnel">Funnel</TabsTrigger>
          <TabsTrigger value="responses">Responses</TabsTrigger>
          <TabsTrigger value="category">Category</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
          <TabsTrigger value="health">Health</TabsTrigger>
        </TabsList>

        {/* ── OVERVIEW TAB ────────────────────────────────────────────────── */}
        <TabsContent value="overview" className="space-y-6">
          {/* Pipeline Overview Card */}
          <Card className="bg-slate-700 border-slate-600">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5" />
                {dashboardData.pipelineCard.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {dashboardData.pipelineCard.metrics.map((metric, idx) => (
                  <div key={idx} className="bg-slate-600 rounded-lg p-4">
                    <p className="text-sm text-slate-300">{metric.label}</p>
                    <p className="text-3xl font-bold mt-2">{metric.value}</p>
                    <p className="text-xs text-slate-400 mt-1">{metric.detail}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Response Metrics Card */}
          <Card className="bg-slate-700 border-slate-600">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                {dashboardData.responseCard.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {dashboardData.responseCard.metrics.map((metric, idx) => (
                  <div key={idx} className="bg-slate-600 rounded-lg p-4">
                    <p className="text-sm text-slate-300">{metric.label}</p>
                    <p className="text-3xl font-bold mt-2">{metric.value}</p>
                    {metric.rate !== undefined && (
                      <div className="flex items-center gap-1 mt-2">
                        <TrendingUp className="w-4 h-4 text-green-400" />
                        <span className="text-sm text-green-400">{metric.rate}%</span>
                      </div>
                    )}
                    <p className="text-xs text-slate-400 mt-1">{metric.detail}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── FUNNEL TAB ──────────────────────────────────────────────────── */}
        <TabsContent value="funnel" className="space-y-6">
          <Card className="bg-slate-700 border-slate-600">
            <CardHeader>
              <CardTitle>Funnel Conversion (Import → Interest)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={funnelChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#4b5563" />
                  <XAxis dataKey="stage" stroke="#9ca3af" />
                  <YAxis stroke="#9ca3af" />
                  <Tooltip
                    contentStyle={{ background: "#1f2937", border: "1px solid #4b5563" }}
                    labelStyle={{ color: "#f3f4f6" }}
                  />
                  <Bar dataKey="count" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>

              {/* Conversion Rates Table */}
              <div className="mt-6 bg-slate-600 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <tbody>
                    {[
                      {
                        label: "Import → Enriched",
                        rate: funnelData?.conversionRates.importToEnriched,
                      },
                      {
                        label: "Import → Approved",
                        rate: funnelData?.conversionRates.importToApproved,
                      },
                      {
                        label: "Import → Interested",
                        rate: funnelData?.conversionRates.importToInterested,
                      },
                      {
                        label: "Sent → Replied",
                        rate: funnelData?.conversionRates.sentToReplyRate,
                      },
                      {
                        label: "Reply → Interested",
                        rate: funnelData?.conversionRates.replyToInterestRate,
                      },
                    ].map((row, idx) => (
                      <tr
                        key={idx}
                        className={
                          idx % 2 === 0 ? "bg-slate-600" : "bg-slate-700"
                        }
                      >
                        <td className="px-4 py-3 text-slate-300">{row.label}</td>
                        <td className="px-4 py-3 text-right">
                          <span className="font-bold text-lg">
                            {row.rate}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── RESPONSES TAB ───────────────────────────────────────────────── */}
        <TabsContent value="responses" className="space-y-6">
          <Card className="bg-slate-700 border-slate-600">
            <CardHeader>
              <CardTitle>Reply Classification</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col lg:flex-row gap-8">
                <div className="flex-1">
                  {replyChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={replyChartData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={(entry) => `${entry.name}: ${entry.value}`}
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {replyChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{ background: "#1f2937", border: "1px solid #4b5563" }}
                          labelStyle={{ color: "#f3f4f6" }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-64 text-slate-400">
                      No replies yet
                    </div>
                  )}
                </div>
                <div className="flex-1 space-y-3">
                  {[
                    { label: "Interested", value: funnelData?.replyClassifications.interested, color: "bg-green-600" },
                    { label: "Needs Follow-up", value: funnelData?.replyClassifications.needsCall, color: "bg-yellow-600" },
                    { label: "Send Info", value: funnelData?.replyClassifications.sendInfo, color: "bg-blue-600" },
                    { label: "Declined", value: funnelData?.replyClassifications.declined, color: "bg-red-600" },
                    { label: "Auto-reply", value: funnelData?.replyClassifications.autoReply, color: "bg-gray-600" },
                  ].map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${item.color}`} />
                        <span className="text-slate-300">{item.label}</span>
                      </div>
                      <span className="font-bold">{item.value || 0}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── CATEGORY TAB ────────────────────────────────────────────────── */}
        <TabsContent value="category" className="space-y-6">
          <Card className="bg-slate-700 border-slate-600">
            <CardHeader>
              <CardTitle>Performance by Category</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {dashboardData.categoryCard.data.map((cat) => (
                  <div
                    key={cat.category}
                    className="bg-slate-600 rounded-lg p-4 cursor-pointer hover:bg-slate-500 transition"
                    onClick={() => setSelectedCategory(cat.category)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold capitalize">{cat.category}</h3>
                      <Badge variant="secondary">{cat.approvalRate}% approval</Badge>
                    </div>
                    <div className="grid grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-slate-400">Total</p>
                        <p className="text-lg font-bold">{cat.total}</p>
                      </div>
                      <div>
                        <p className="text-slate-400">Approved</p>
                        <p className="text-lg font-bold text-blue-400">
                          {cat.approved}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-400">Sent</p>
                        <p className="text-lg font-bold text-green-400">
                          {cat.sent}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-400">Rate</p>
                        <p className="text-lg font-bold">
                          {cat.total > 0
                            ? Math.round((cat.sent / cat.total) * 100)
                            : 0}
                          %
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── INSIGHTS TAB ────────────────────────────────────────────────── */}
        <TabsContent value="insights" className="space-y-6">
          <div className="space-y-4">
            {dashboardData.insights.map((insight, idx) => {
              const iconMap = {
                success: <CheckCircle className="w-5 h-5 text-green-400" />,
                warning: <AlertCircle className="w-5 h-5 text-yellow-400" />,
                error: <AlertCircle className="w-5 h-5 text-red-400" />,
                info: <Zap className="w-5 h-5 text-blue-400" />,
              };

              const bgMap = {
                success: "bg-green-950 border-green-700",
                warning: "bg-yellow-950 border-yellow-700",
                error: "bg-red-950 border-red-700",
                info: "bg-blue-950 border-blue-700",
              };

              return (
                <Card key={idx} className={`border ${bgMap[insight.type]}`}>
                  <CardContent className="pt-6">
                    <div className="flex gap-4">
                      <div className="flex-shrink-0">
                        {iconMap[insight.type]}
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold">{insight.message}</p>
                        {insight.action && (
                          <p className="text-sm text-slate-300 mt-2">
                            💡 {insight.action}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* ── HEALTH TAB ──────────────────────────────────────────────────── */}
        <TabsContent value="health" className="space-y-6">
          <Card className="bg-slate-700 border-slate-600">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{dashboardData.healthCheck.title}</CardTitle>
                <Badge
                  variant={
                    dashboardData.healthCheck.status === "healthy"
                      ? "default"
                      : dashboardData.healthCheck.status === "degraded"
                        ? "secondary"
                        : "destructive"
                  }
                >
                  {dashboardData.healthCheck.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {dashboardData.healthCheck.checks.map((check, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between bg-slate-600 rounded-lg p-4"
                  >
                    <div className="flex items-center gap-3">
                      {getHealthIcon(check.status)}
                      <div>
                        <p className="font-semibold">{check.name}</p>
                        <p className="text-sm text-slate-300">
                          {check.message}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`text-sm font-semibold capitalize ${getHealthColor(check.status)}`}
                    >
                      {check.status}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
