import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import PlannerLayout from "@/components/PlannerLayout";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Plus, Sparkles, Mail, Search, ExternalLink } from "lucide-react";

export default function YouthOutreach() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [orgName, setOrgName] = useState("");
  const [orgType, setOrgType] = useState("charity");
  const [focus, setFocus] = useState("");
  const [website, setWebsite] = useState("");
  const [showAddOrg, setShowAddOrg] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState<any>(null);
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [generatingEmail, setGeneratingEmail] = useState(false);

  // Fetch youth organisations
  const { data: organisations = [], isLoading } = useQuery({
    queryKey: ["/api/youth-organisations"],
    queryFn: () => apiRequest("/api/youth-organisations", "GET"),
  });

  // Add organisation mutation
  const addOrgMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("/api/youth-organisations", "POST", {
        name: orgName,
        type: orgType,
        focus_area: focus,
        website: website,
        country: "UK",
      });
    },
    onSuccess: () => {
      toast({ title: "Organisation added successfully!" });
      queryClient.invalidateQueries({ queryKey: ["/api/youth-organisations"] });
      setOrgName("");
      setFocus("");
      setWebsite("");
      setShowAddOrg(false);
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  // Generate email
  const generateEmail = async (org: any) => {
    setGeneratingEmail(true);
    try {
      const response = await apiRequest("/api/draft-outreach-email", "POST", {
        organisationName: org.name,
        organisationType: org.type,
        focusArea: org.focus_area,
        projectTitle: "Youth Community Initiative",
      });
      setEmailSubject(response.subject || "Partnership Opportunity - Youth Community Initiative");
      setEmailBody(response.body || "Unable to generate email");
      setSelectedOrg(org);
      setShowEmailDialog(true);
    } catch (err: any) {
      toast({ title: "Error generating email", description: err.message, variant: "destructive" });
    } finally {
      setGeneratingEmail(false);
    }
  };

  const filteredOrgs = organisations.filter((org: any) =>
    org.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    org.focus_area?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const charities = filteredOrgs.filter((o: any) => o.type === "charity");
  const government = filteredOrgs.filter((o: any) => o.type === "government");
  const sponsors = filteredOrgs.filter((o: any) => o.type === "sponsor");

  return (
    <PlannerLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-4xl font-bold text-black mb-2">Youth Community Outreach</h1>
          <p className="text-black text-opacity-70">
            Find UK charities, government bodies, and sponsors. Generate personalised outreach emails instantly.
          </p>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="charities" className="space-y-6">
          <TabsList>
            <TabsTrigger value="charities">Charities & Organisations ({charities.length})</TabsTrigger>
            <TabsTrigger value="government">Government Bodies ({government.length})</TabsTrigger>
            <TabsTrigger value="sponsors">Sponsors ({sponsors.length})</TabsTrigger>
          </TabsList>

          {/* Search & Add */}
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <Input
                placeholder="Search organisations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full"
              />
            </div>
            <Button onClick={() => setShowAddOrg(true)} className="bg-[#4A0E1F] text-white">
              <Plus className="w-4 h-4 mr-2" /> Add Organisation
            </Button>
          </div>

          {/* Charities Tab */}
          <TabsContent value="charities" className="space-y-4">
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin" />
              </div>
            ) : charities.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-opacity-70">
                  <p>No charities found. Add one to get started!</p>
                </CardContent>
              </Card>
            ) : (
              charities.map((org: any) => (
                <Card key={org.id} className="hover:shadow-lg transition">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{org.name}</CardTitle>
                        <p className="text-sm text-opacity-60 text-black mt-1">{org.focus_area}</p>
                      </div>
                      <Badge variant="secondary">{org.type}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2">
                      {org.website && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(org.website, "_blank")}
                        >
                          <ExternalLink className="w-4 h-4 mr-2" /> Visit
                        </Button>
                      )}
                      <Button
                        size="sm"
                        className="bg-[#4A0E1F] text-white"
                        onClick={() => generateEmail(org)}
                        disabled={generatingEmail}
                      >
                        <Mail className="w-4 h-4 mr-2" />
                        {generatingEmail ? "Drafting..." : "Draft Email"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* Government Tab */}
          <TabsContent value="government" className="space-y-4">
            {government.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-opacity-70">
                  <p>No government bodies found. Add one to get started!</p>
                </CardContent>
              </Card>
            ) : (
              government.map((org: any) => (
                <Card key={org.id} className="hover:shadow-lg transition">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{org.name}</CardTitle>
                        <p className="text-sm text-opacity-60 text-black mt-1">{org.focus_area}</p>
                      </div>
                      <Badge variant="outline">{org.type}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2">
                      {org.website && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(org.website, "_blank")}
                        >
                          <ExternalLink className="w-4 h-4 mr-2" /> Visit
                        </Button>
                      )}
                      <Button
                        size="sm"
                        className="bg-[#4A0E1F] text-white"
                        onClick={() => generateEmail(org)}
                        disabled={generatingEmail}
                      >
                        <Mail className="w-4 h-4 mr-2" />
                        {generatingEmail ? "Drafting..." : "Draft Email"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* Sponsors Tab */}
          <TabsContent value="sponsors" className="space-y-4">
            {sponsors.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-opacity-70">
                  <p>No sponsors found. Add one to get started!</p>
                </CardContent>
              </Card>
            ) : (
              sponsors.map((org: any) => (
                <Card key={org.id} className="hover:shadow-lg transition">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{org.name}</CardTitle>
                        <p className="text-sm text-opacity-60 text-black mt-1">{org.focus_area}</p>
                      </div>
                      <Badge className="bg-blue-500/20 text-blue-700">{org.type}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2">
                      {org.website && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(org.website, "_blank")}
                        >
                          <ExternalLink className="w-4 h-4 mr-2" /> Visit
                        </Button>
                      )}
                      <Button
                        size="sm"
                        className="bg-[#4A0E1F] text-white"
                        onClick={() => generateEmail(org)}
                        disabled={generatingEmail}
                      >
                        <Mail className="w-4 h-4 mr-2" />
                        {generatingEmail ? "Drafting..." : "Draft Email"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Add Organisation Dialog */}
      <Dialog open={showAddOrg} onOpenChange={setShowAddOrg}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Organisation</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Organisation Name</label>
              <Input
                placeholder="e.g., Prince's Trust"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Type</label>
              <select
                value={orgType}
                onChange={(e) => setOrgType(e.target.value)}
                className="w-full border rounded px-3 py-2"
              >
                <option value="charity">Charity</option>
                <option value="government">Government Body</option>
                <option value="sponsor">Sponsor</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Focus Area</label>
              <Input
                placeholder="e.g., Youth development, crime prevention"
                value={focus}
                onChange={(e) => setFocus(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Website (optional)</label>
              <Input
                placeholder="https://example.com"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
              />
            </div>
            <Button
              onClick={() => addOrgMutation.mutate()}
              className="w-full bg-[#4A0E1F] text-white"
              disabled={addOrgMutation.isPending}
            >
              {addOrgMutation.isPending ? "Adding..." : "Add Organisation"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Email Generation Dialog */}
      <Dialog open={showEmailDialog} onOpenChange={setShowEmailDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Draft Outreach Email - {selectedOrg?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Subject</label>
              <Input
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                className="w-full"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Body</label>
              <Textarea
                value={emailBody}
                onChange={(e) => setEmailBody(e.target.value)}
                className="w-full min-h-64 font-mono text-sm"
              />
            </div>
            <div className="flex gap-2">
              <Button className="flex-1 bg-blue-600 text-white">
                <Mail className="w-4 h-4 mr-2" /> Send Email
              </Button>
              <Button className="flex-1" variant="outline">
                Copy to Clipboard
              </Button>
              <Button variant="outline">Close</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </PlannerLayout>
  );
}
