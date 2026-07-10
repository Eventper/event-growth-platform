import { useEffect, useState } from "react";
import { usePageMeta } from "@/hooks/use-page-meta";

interface FunnelMetric {
  name: string;
  count: number;
  conversion?: number;
}

interface AnalyticsData {
  platformPageViews: number;
  boothCtaClicks: number;
  contactFormSubmits: number;
  boothInquiries: number;
  platformInquiries: number;
  topCtaButtons: { [key: string]: number };
  conversionRate: number;
}

export default function AnalyticsDashboard() {
  usePageMeta({
    title: "Analytics Dashboard | Event Perfekt",
    description: "Real-time analytics for booth inquiries, platform traffic, and conversion funnels",
    canonical: "https://eventperfekt.net/analytics",
  });

  const [analytics, setAnalytics] = useState<AnalyticsData>({
    platformPageViews: 0,
    boothCtaClicks: 0,
    contactFormSubmits: 0,
    boothInquiries: 0,
    platformInquiries: 0,
    topCtaButtons: {},
    conversionRate: 0,
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const res = await fetch("/api/analytics/funnel");
        if (res.ok) {
          const data = await res.json();
          setAnalytics(data);
        }
      } catch (error) {
        console.error("Failed to fetch analytics:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
    // Refresh every 30 seconds
    const interval = setInterval(fetchAnalytics, 30000);
    return () => clearInterval(interval);
  }, []);

  const funnelSteps: FunnelMetric[] = [
    { name: "Platform Page Views", count: analytics.platformPageViews },
    { name: "Booth CTA Clicks", count: analytics.boothCtaClicks, conversion: analytics.platformPageViews > 0 ? (analytics.boothCtaClicks / analytics.platformPageViews) * 100 : 0 },
    { name: "Contact Form Visits", count: analytics.contactFormSubmits },
    { name: "Booth Inquiries", count: analytics.boothInquiries, conversion: analytics.contactFormSubmits > 0 ? (analytics.boothInquiries / analytics.contactFormSubmits) * 100 : 0 },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-[#330311] text-white py-12 px-6">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-4xl font-bold mb-2">Analytics Dashboard</h1>
          <p className="text-white/80">Real-time metrics for booth inquiries and platform conversion</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-12">
        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-600">Loading analytics...</p>
          </div>
        ) : (
          <>
            {/* Key Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
              <div className="bg-white rounded-lg shadow p-6 border-l-4 border-[#330311]">
                <p className="text-gray-600 text-sm font-semibold mb-1">Platform Page Views</p>
                <p className="text-4xl font-bold text-[#330311]">{analytics.platformPageViews}</p>
              </div>
              <div className="bg-white rounded-lg shadow p-6 border-l-4 border-[#C9A84C]">
                <p className="text-gray-600 text-sm font-semibold mb-1">Booth CTA Clicks</p>
                <p className="text-4xl font-bold text-[#C9A84C]">{analytics.boothCtaClicks}</p>
              </div>
              <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-600">
                <p className="text-gray-600 text-sm font-semibold mb-1">Booth Inquiries</p>
                <p className="text-4xl font-bold text-green-600">{analytics.boothInquiries}</p>
              </div>
              <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-600">
                <p className="text-gray-600 text-sm font-semibold mb-1">Overall Conv. Rate</p>
                <p className="text-4xl font-bold text-blue-600">{analytics.conversionRate.toFixed(1)}%</p>
              </div>
            </div>

            {/* Inquiry Type Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-bold text-[#330311] mb-6">Inquiry Type Breakdown</h2>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-gray-700 font-semibold">📸 Booth Inquiries</span>
                      <span className="text-[#C9A84C] font-bold">{analytics.boothInquiries}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-[#C9A84C] h-2 rounded-full" 
                        style={{ width: `${analytics.contactFormSubmits > 0 ? (analytics.boothInquiries / analytics.contactFormSubmits) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-gray-700 font-semibold">🎯 Platform Inquiries</span>
                      <span className="text-blue-600 font-bold">{analytics.platformInquiries}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full" 
                        style={{ width: `${analytics.contactFormSubmits > 0 ? (analytics.platformInquiries / analytics.contactFormSubmits) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Top CTAs */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-bold text-[#330311] mb-6">Top Converting CTAs</h2>
                <div className="space-y-3">
                  {Object.entries(analytics.topCtaButtons)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 5)
                    .map(([cta, count]) => (
                      <div key={cta} className="flex justify-between items-center pb-3 border-b">
                        <span className="text-gray-700 text-sm">{cta.replace(/_/g, " ")}</span>
                        <span className="bg-[#330311] text-white px-3 py-1 rounded-full text-sm font-bold">{count}</span>
                      </div>
                    ))}
                </div>
              </div>
            </div>

            {/* Conversion Funnel */}
            <div className="bg-white rounded-lg shadow p-8">
              <h2 className="text-lg font-bold text-[#330311] mb-8">Conversion Funnel: Platform → Booth</h2>
              <div className="space-y-4">
                {funnelSteps.map((step, idx) => (
                  <div key={step.name}>
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-semibold text-gray-700">{step.name}</span>
                      <div className="text-right">
                        <span className="text-2xl font-bold text-[#330311]">{step.count}</span>
                        {step.conversion !== undefined && (
                          <p className="text-xs text-gray-500">
                            {step.conversion.toFixed(1)}% conversion
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div 
                        className="bg-gradient-to-r from-[#330311] to-[#C9A84C] h-3 rounded-full transition-all" 
                        style={{ width: `${(step.count / Math.max(...funnelSteps.map(s => s.count), 1)) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer Note */}
            <div className="mt-12 p-4 bg-blue-50 border border-blue-200 rounded">
              <p className="text-sm text-gray-600">
                <strong>Last Updated:</strong> {new Date().toLocaleTimeString()} | 
                <strong className="ml-4">Auto-refresh:</strong> Every 30 seconds
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
