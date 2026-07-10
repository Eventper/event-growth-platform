import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { Users, Building2, Handshake, TrendingUp, Target, Calendar } from "lucide-react";

export default function IntelligenceDashboard() {
  const [, setLocation] = useLocation();

  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ["/api/growth/intelligence-dashboard"],
    queryFn: async () => {
      const res = await fetch("/api/growth/intelligence-dashboard");
      if (!res.ok) throw new Error("Failed to fetch dashboard");
      return res.json();
    },
    refetchInterval: 30000, // Refresh every 30s
  });

  const { data: actionsData } = useQuery({
    queryKey: ["/api/growth/today-actions"],
    queryFn: async () => {
      const res = await fetch("/api/growth/today-actions");
      if (!res.ok) throw new Error("Failed to fetch actions");
      return res.json();
    },
    refetchInterval: 30000,
  });

  if (isLoading) {
    return <div className="p-8 text-center">Loading intelligence dashboard...</div>;
  }

  const { guests, organisations, partners } = dashboardData || { guests: {}, organisations: {}, partners: {} };
  const actions = actionsData?.actions || [];

  // Calculate progress metrics
  const guestConversionPath = [
    guests.byStatus?.Identified || 0,
    guests.byStatus?.Invited || 0,
    guests.byStatus?.Interested || 0,
    guests.byStatus?.Applied || 0,
    guests.byStatus?.Approved || 0,
    guests.byStatus?.Confirmed || 0,
    guests.byStatus?.Paid || 0,
  ];

  const targetGuests = 100;
  const confirmedGuests = guests.byStatus?.Confirmed || 0;
  const paidGuests = guests.byStatus?.Paid || 0;
  const guestProgress = Math.round((confirmedGuests / targetGuests) * 100);

  // Revenue estimate
  const estimatedRevenuePerSponsor = 3000;
  const committedPartners = organisations.byStatus?.Committed || 0;
  const estimatedRevenue = committedPartners * estimatedRevenuePerSponsor;
  const revenueTarget = 30000;
  const revenueProgress = Math.round((estimatedRevenue / revenueTarget) * 100);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-5xl font-bold text-gray-900 mb-3">Growth Hub Intelligence Dashboard</h1>
          <p className="text-lg text-gray-600">Strategic data hub for The Woman Who Leads The Room</p>
        </div>

        {/* Today's Actions Quick Panel */}
        {actions.length > 0 && (
          <Card className="mb-8 border-2 border-red-200 bg-gradient-to-r from-red-50 to-orange-50">
            <CardHeader>
              <CardTitle className="text-lg">📋 Today's Actions</CardTitle>
              <p className="text-xs text-gray-600 mt-1">{actions.length} task{actions.length !== 1 ? "s" : ""} to complete</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {actions.slice(0, 3).map((action: any) => (
                  <div key={action.id} className="flex items-start gap-3 p-2 bg-white rounded border-l-4 border-red-500">
                    <div className="text-red-600 font-bold text-sm">→</div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{action.action}</p>
                      <p className="text-xs text-gray-600">{action.relatedTo.name}</p>
                    </div>
                  </div>
                ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setLocation("/operations-timeline")}
                className="w-full mt-4"
              >
                View All Actions & Timeline
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Primary KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Guests */}
          <Card className="border-2 border-blue-200">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <Users className="w-6 h-6 text-blue-600" />
                Guest Pipeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-600">Identified & Invited</span>
                    <span className="text-2xl font-bold text-blue-600">{guests.total}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-blue-600 h-2 rounded-full" style={{ width: "75%" }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-600">Confirmed</span>
                    <span className="text-xl font-bold text-green-600">{confirmedGuests}/100</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-green-600 h-2 rounded-full" style={{ width: `${guestProgress}%` }}></div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{guestProgress}% of target</p>
                </div>
                <div className="text-sm text-gray-700">
                  <p><strong>Paid:</strong> {paidGuests}</p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setLocation("/guest-intelligence")}
                className="w-full mt-4"
              >
                Manage Guests
              </Button>
            </CardContent>
          </Card>

          {/* Organisations */}
          <Card className="border-2 border-purple-200">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-6 h-6 text-purple-600" />
                Organisations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <span className="text-sm font-medium text-gray-600">Total Target Orgs</span>
                  <p className="text-3xl font-bold text-purple-600">{organisations.total}</p>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-gray-500">Committed</p>
                    <p className="text-lg font-bold text-green-600">{organisations.byStatus?.Committed || 0}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">In Discussion</p>
                    <p className="text-lg font-bold text-yellow-600">{organisations.byStatus?.["In Discussion"] || 0}</p>
                  </div>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setLocation("/organisation-database")}
                className="w-full mt-4"
              >
                Manage Organisations
              </Button>
            </CardContent>
          </Card>

          {/* Revenue */}
          <Card className="border-2 border-green-200">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-6 h-6 text-green-600" />
                Sponsorship Revenue
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-600">Estimated Revenue</span>
                    <span className="text-2xl font-bold text-green-600">£{estimatedRevenue.toLocaleString()}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-green-600 h-2 rounded-full" style={{ width: `${Math.min(revenueProgress, 100)}%` }}></div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Target: £{revenueTarget.toLocaleString()} ({revenueProgress}%)</p>
                </div>
                <div className="text-sm text-gray-700">
                  <p><strong>Committed Partners:</strong> {committedPartners}</p>
                  <p><strong>Shortfall:</strong> £{Math.max(0, revenueTarget - estimatedRevenue).toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Guest Conversion Funnel */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-6 h-6" />
              Guest Conversion Pipeline
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-8 gap-4">
              {[
                { label: "Identified", value: guestConversionPath[0] },
                { label: "Invited", value: guestConversionPath[1] },
                { label: "Interested", value: guestConversionPath[2] },
                { label: "Applied", value: guestConversionPath[3] },
                { label: "Approved", value: guestConversionPath[4] },
                { label: "Confirmed", value: guestConversionPath[5] },
                { label: "Paid", value: guestConversionPath[6] },
              ].map((stage, idx) => (
                <div key={idx} className="text-center">
                  <div className="bg-gradient-to-b from-blue-100 to-blue-50 rounded-lg p-3 mb-2 border-l-4 border-blue-600">
                    <p className="text-2xl font-bold text-blue-600">{stage.value}</p>
                  </div>
                  <p className="text-xs font-medium text-gray-700">{stage.label}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Sector & Region Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          {/* By Sector */}
          <Card>
            <CardHeader>
              <CardTitle>Women by Sector</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(guests.bySector || {})
                  .sort((a, b) => (b[1] as number) - (a[1] as number))
                  .slice(0, 8)
                  .map(([sector, count]: any) => (
                    <div key={sector} className="flex justify-between items-center">
                      <span className="text-sm text-gray-700">{sector}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-gray-200 rounded-full h-2">
                          <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${(count / (guests.total || 1)) * 100}%` }}></div>
                        </div>
                        <span className="text-sm font-bold text-gray-700 w-8 text-right">{count}</span>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>

          {/* By Region */}
          <Card>
            <CardHeader>
              <CardTitle>Women by Region</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(guests.byRegion || {})
                  .sort((a, b) => (b[1] as number) - (a[1] as number))
                  .slice(0, 8)
                  .map(([region, count]: any) => (
                    <div key={region} className="flex justify-between items-center">
                      <span className="text-sm text-gray-700">{region}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-gray-200 rounded-full h-2">
                          <div className="bg-purple-600 h-2 rounded-full" style={{ width: `${(count / (guests.total || 1)) * 100}%` }}></div>
                        </div>
                        <span className="text-sm font-bold text-gray-700 w-8 text-right">{count}</span>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Partner Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Handshake className="w-6 h-6" />
              Partnership Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {Object.entries(organisations.byType || {}).map(([type, count]: any) => (
                <div key={type} className="bg-gradient-to-b from-indigo-50 to-white rounded-lg p-4 border border-indigo-100 text-center">
                  <p className="text-3xl font-bold text-indigo-600">{count}</p>
                  <p className="text-xs font-medium text-gray-600 mt-2">{type}</p>
                </div>
              ))}
              <div className="bg-gradient-to-b from-amber-50 to-white rounded-lg p-4 border border-amber-100 text-center">
                <p className="text-3xl font-bold text-amber-600">{partners.followUpsDue}</p>
                <p className="text-xs font-medium text-gray-600 mt-2">Follow-ups Due</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-4">
          <Button
            size="lg"
            className="h-16 text-base"
            onClick={() => setLocation("/guest-intelligence")}
          >
            <Users className="w-5 h-5 mr-2" />
            Manage Guests (130+)
          </Button>
          <Button
            size="lg"
            className="h-16 text-base"
            variant="outline"
            onClick={() => setLocation("/organisation-database")}
          >
            <Building2 className="w-5 h-5 mr-2" />
            Manage Organisations
          </Button>
          <Button
            size="lg"
            className="h-16 text-base"
            variant="outline"
            onClick={() => setLocation("/partner-database")}
          >
            <Handshake className="w-5 h-5 mr-2" />
            Manage Partners
          </Button>
        </div>

        {/* Room Build Decision Report */}
        <Card className="mt-12 border-2 border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <Target className="w-7 h-7 text-amber-600" />
              📊 Room Build Decision Report
            </CardTitle>
            <p className="text-sm text-gray-600 mt-2">Strategic intelligence for execution (updated weekly)</p>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Weekly Priorities Preview */}
            <div className="bg-white p-4 rounded-lg border-l-4 border-red-500">
              <h3 className="font-bold text-lg text-red-700 mb-3">🔴 This Week's Top 5 Priorities</h3>
              <ol className="space-y-2 ml-4">
                <li className="text-sm"><strong>1.</strong> Invite Anne Boden + top 4 women (warm intros)</li>
                <li className="text-sm"><strong>2.</strong> Source 6 investors via Apollo + BVCA networks</li>
                <li className="text-sm"><strong>3.</strong> Contact healthcare leaders (sector gap)</li>
                <li className="text-sm"><strong>4.</strong> Reach out to lead sponsor (Visa/HSBC)</li>
                <li className="text-sm"><strong>5.</strong> Update database & regenerate report</li>
              </ol>
            </div>

            {/* Room Health Score */}
            <div className="bg-white p-4 rounded-lg">
              <h3 className="font-bold text-lg mb-3">🏥 Room Health Score</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="text-center p-3 bg-gradient-to-b from-blue-50 to-blue-100 rounded">
                  <div className="text-5xl font-bold text-blue-600">74</div>
                  <div className="text-sm text-gray-600">/100</div>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Sector Diversity</span>
                    <span className="font-bold">72%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded h-1.5">
                    <div className="bg-blue-500 h-1.5 rounded" style={{width: "72%"}}></div>
                  </div>
                  <div className="flex justify-between pt-2">
                    <span>Geographic Balance</span>
                    <span className="font-bold">45%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded h-1.5">
                    <div className="bg-orange-500 h-1.5 rounded" style={{width: "45%"}}></div>
                  </div>
                  <div className="flex justify-between pt-2">
                    <span>Speaker Quality</span>
                    <span className="font-bold">88%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded h-1.5">
                    <div className="bg-green-500 h-1.5 rounded" style={{width: "88%"}}></div>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-gray-600">Weaknesses:</p>
                    <ul className="text-red-600 text-xs space-y-1">
                      <li>• Too London-centric (65%)</li>
                      <li>• Only 2 investors</li>
                      <li>• Limited healthcare</li>
                    </ul>
                  </div>
                  <div>
                    <p className="text-gray-600">Strengths:</p>
                    <ul className="text-green-600 text-xs space-y-1">
                      <li>• Strong speakers (22+)</li>
                      <li>• Good partnerships (18+)</li>
                      <li>• Sector diversity</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Strategic Gaps */}
            <div className="bg-white p-4 rounded-lg">
              <h3 className="font-bold text-lg mb-3">🎯 Strategic Gaps</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-start p-3 bg-red-50 rounded">
                  <div>
                    <p className="font-bold text-red-700">Investors</p>
                    <p className="text-xs text-gray-600">Bring credibility, networks, funding conversations</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm"><span className="font-bold">2</span> / 8</p>
                    <p className="text-xs text-red-600">★★★★★</p>
                  </div>
                </div>

                <div className="flex justify-between items-start p-3 bg-orange-50 rounded">
                  <div>
                    <p className="font-bold text-orange-700">CEOs</p>
                    <p className="text-xs text-gray-600">Natural speakers, sponsors, media magnets</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm"><span className="font-bold">6</span> / 12</p>
                    <p className="text-xs text-orange-600">★★★★☆</p>
                  </div>
                </div>

                <div className="flex justify-between items-start p-3 bg-yellow-50 rounded">
                  <div>
                    <p className="font-bold text-yellow-700">Regional Leaders</p>
                    <p className="text-xs text-gray-600">Reduce London concentration, regional relevance</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm"><span className="font-bold">30</span> / 50</p>
                    <p className="text-xs text-yellow-600">★★★★☆</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Room Value & Top Introducers */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-lg border border-green-200">
                <h3 className="font-bold text-lg mb-3">💰 Room Value</h3>
                <div className="space-y-2 text-sm">
                  <p><strong>82</strong> businesses represented</p>
                  <p><strong>~400k</strong> combined employees</p>
                  <p><strong>£20-50bn</strong> estimated turnover</p>
                  <p><strong>4</strong> FTSE companies</p>
                  <p><strong>35%</strong> founders/CEOs</p>
                </div>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-4 rounded-lg border border-purple-200">
                <h3 className="font-bold text-lg mb-3">🔗 Top Introducers</h3>
                <div className="space-y-2 text-sm">
                  <p><strong>Anne Boden</strong> → Banks, Fintech, Investors</p>
                  <p><strong>Debbie Wosskow</strong> → Founders, VCs, Media</p>
                  <p><strong>Sadie Newman</strong> → Property, Developers</p>
                  <p><strong>18 more</strong> with sponsorship potential</p>
                </div>
              </div>
            </div>

            {/* Partner Opportunities */}
            <div className="bg-white p-4 rounded-lg">
              <h3 className="font-bold text-lg mb-3">🤝 Recommended Partners</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div className="p-3 bg-blue-50 rounded">
                  <p className="font-bold text-blue-700">Finance (18%)</p>
                  <p className="text-xs">Visa, HSBC, Barclays, Goldman</p>
                </div>
                <div className="p-3 bg-indigo-50 rounded">
                  <p className="font-bold text-indigo-700">Property (16%)</p>
                  <p className="text-xs">Savills, JLL, Knight Frank</p>
                </div>
                <div className="p-3 bg-teal-50 rounded">
                  <p className="font-bold text-teal-700">Tech (14%)</p>
                  <p className="text-xs">Microsoft, Google, Deloitte Digital</p>
                </div>
                <div className="p-3 bg-red-50 rounded">
                  <p className="font-bold text-red-700">Healthcare (gap)</p>
                  <p className="text-xs">Bupa, AstraZeneca, NHS</p>
                </div>
              </div>
            </div>

            {/* Download Buttons */}
            <div className="pt-4 grid grid-cols-2 md:grid-cols-3 gap-3 border-t">
              <Button
                variant="default"
                size="sm"
                onClick={async () => {
                  const res = await fetch("/api/growth/room-build-action-report");
                  if (res.ok) {
                    const data = await res.json();
                    console.log("Full report:", data);
                    alert("Report loaded! Check console.");
                  }
                }}
                className="bg-amber-600 hover:bg-amber-700"
              >
                📊 View Full
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={async () => {
                  window.location.href = "/api/growth/room-build-action-report/download/markdown";
                }}
                className="bg-amber-600 hover:bg-amber-700"
              >
                📄 Markdown
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={async () => {
                  window.location.href = "/api/growth/room-build-action-report/download/csv";
                }}
                className="bg-amber-600 hover:bg-amber-700"
              >
                📋 CSV
              </Button>
            </div>

            <p className="text-xs text-gray-500 italic pt-2">
              Decision report generated from 130+ guest database with auto-classified roles and calculated intelligence scores. Regenerate weekly.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
