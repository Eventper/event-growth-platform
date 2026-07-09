import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  FileText, 
  Shield, 
  Upload, 
  CheckCircle, 
  AlertTriangle, 
  Clock, 
  Building2,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Bell,
  Settings,
  LogOut,
  Download,
  Eye,
  Edit,
  Plus,
  Star,
  TrendingUp
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";

interface VendorUser {
  id: string;
  companyName: string;
  contactPersonName: string;
  email: string;
  phone: string;
  companyAddress: string;
  businessType: string;
  yearsInBusiness: number;
  servicesOffered: string[];
  serviceAreas: string[];
  status: string;
  profileCompletionStatus: string;
  lastLoginDate: string;
  registrationDate: string;
}

interface Document {
  id: string;
  documentType: string;
  documentName: string;
  uploadDate: string;
  verificationStatus: string;
  expiryDate?: string;
  isRequired: boolean;
}

interface ComplianceItem {
  id: string;
  questionText: string;
  questionCategory: string;
  answerType: string;
  answer?: string;
  isCompliant?: boolean;
  reviewDate?: string;
}

interface Agreement {
  id: string;
  agreementType: string;
  agreementTitle: string;
  status: string;
  sentDate?: string;
  signedDate?: string;
  expiryDate?: string;
}

export default function VendorDashboard() {
  const [vendorUser, setVendorUser] = useState<VendorUser | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("vendorUser");
    if (stored) {
      setVendorUser(JSON.parse(stored));
    }
  }, []);

  const { data: documents = [] } = useQuery<Document[]>({
    queryKey: ["/api/vendor-portal/documents"],
    enabled: !!vendorUser,
  });

  const { data: compliance = [] } = useQuery<ComplianceItem[]>({
    queryKey: ["/api/vendor-portal/compliance"],
    enabled: !!vendorUser,
  });

  const { data: agreements = [] } = useQuery<Agreement[]>({
    queryKey: ["/api/vendor-portal/agreements"],
    enabled: !!vendorUser,
  });

  const { data: notifications = [] } = useQuery<any[]>({
    queryKey: ["/api/vendor-portal/notifications"],
    enabled: !!vendorUser,
  });

  const { data: stats } = useQuery<any>({
    queryKey: ["/api/vendor-portal/stats"],
    enabled: !!vendorUser,
  });

  if (!vendorUser) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Access Denied</h1>
          <p className="text-gray-600 mt-2">Please log in to access the vendor portal.</p>
          <Link href="/vendor-portal">
            <Button className="mt-4 bg-[#330311] hover:bg-[#4a0418] text-white">
              Go to Login
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const handleLogout = () => {
    localStorage.removeItem("vendorToken");
    localStorage.removeItem("vendorUser");
    window.location.href = "/vendor-portal";
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "verified":
      case "signed":
      case "approved":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "rejected":
      case "expired":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const completionPercentage = (() => {
    const requiredDocs = documents.filter((doc: Document) => doc.isRequired);
    const verifiedDocs = requiredDocs.filter((doc: Document) => doc.verificationStatus === "verified");
    const answeredCompliance = compliance.filter((item: ComplianceItem) => item.answer);
    const signedAgreements = agreements.filter((agreement: Agreement) => agreement.status === "signed");
    
    const total = requiredDocs.length + compliance.length + agreements.length;
    const completed = verifiedDocs.length + answeredCompliance.length + signedAgreements.length;
    
    return total > 0 ? Math.round((completed / total) * 100) : 0;
  })();

  const urgentActions = [
    ...documents.filter((doc: Document) => doc.isRequired && doc.verificationStatus === "pending").slice(0, 3),
    ...compliance.filter((item: ComplianceItem) => !item.answer).slice(0, 2),
    ...agreements.filter((agreement: Agreement) => agreement.status === "sent").slice(0, 2),
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-[#330311] text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Building2 className="w-8 h-8" />
              <div>
                <h1 className="text-2xl font-bold" data-testid="text-company-name">
                  {vendorUser.companyName}
                </h1>
                <p className="text-gray-300">
                  Vendor Portal Dashboard
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <Badge 
                className={`${getStatusColor(vendorUser.status)} text-xs`}
                data-testid="badge-vendor-status"
              >
                {vendorUser.status}
              </Badge>
              
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                {notifications.filter((n: any) => !n.isRead).length > 0 && (
                  <Badge variant="destructive" className="text-xs">
                    {notifications.filter((n: any) => !n.isRead).length}
                  </Badge>
                )}
              </div>
              
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleLogout}
                className="text-white border-white hover:bg-white hover:text-[#330311]"
                data-testid="button-logout"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        {/* Welcome & Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                Profile Completion
              </CardTitle>
              <CardDescription>
                Complete your profile to start receiving event opportunities
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Progress</span>
                <span className="text-sm font-medium" data-testid="text-completion-percentage">
                  {completionPercentage}%
                </span>
              </div>
              <Progress value={completionPercentage} className="mb-4" />
              <div className="flex gap-2">
                {completionPercentage < 100 ? (
                  <Badge variant="outline" className="text-xs">
                    {urgentActions.length} items need attention
                  </Badge>
                ) : (
                  <Badge className="bg-green-100 text-green-800 text-xs">
                    Profile Complete
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Documents</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-document-stats">
                {documents.filter((doc: Document) => doc.verificationStatus === "verified").length}/{documents.length}
              </div>
              <p className="text-xs text-gray-600">Verified documents</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Agreements</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-agreement-stats">
                {agreements.filter((agreement: Agreement) => agreement.status === "signed").length}/{agreements.length}
              </div>
              <p className="text-xs text-gray-600">Signed agreements</p>
            </CardContent>
          </Card>
        </div>

        {/* Urgent Actions Alert */}
        {urgentActions.length > 0 && (
          <Alert className="mb-6 border-orange-200 bg-orange-50">
            <AlertTriangle className="h-4 w-4 text-orange-600" />
            <AlertTitle className="text-orange-800">Action Required</AlertTitle>
            <AlertDescription className="text-orange-700">
              You have {urgentActions.length} items that need immediate attention to complete your vendor setup.
            </AlertDescription>
          </Alert>
        )}

        {/* Main Dashboard Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="flex w-full overflow-x-auto flex-nowrap h-auto gap-1 p-1">
            <TabsTrigger value="overview" data-testid="tab-overview" className="flex-shrink-0 text-xs sm:text-sm">Overview</TabsTrigger>
            <TabsTrigger value="documents" data-testid="tab-documents" className="flex-shrink-0 text-xs sm:text-sm">Documents</TabsTrigger>
            <TabsTrigger value="compliance" data-testid="tab-compliance" className="flex-shrink-0 text-xs sm:text-sm">Compliance</TabsTrigger>
            <TabsTrigger value="agreements" data-testid="tab-agreements" className="flex-shrink-0 text-xs sm:text-sm">Agreements</TabsTrigger>
            <TabsTrigger value="profile" data-testid="tab-profile" className="flex-shrink-0 text-xs sm:text-sm">Profile</TabsTrigger>
            <TabsTrigger value="opportunities" data-testid="tab-opportunities" className="flex-shrink-0 text-xs sm:text-sm">Opportunities</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                  <CardDescription>Common tasks and shortcuts</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button variant="outline" className="w-full justify-start" data-testid="button-upload-document">
                    <Upload className="w-4 h-4 mr-2" />
                    Upload New Document
                  </Button>
                  <Button variant="outline" className="w-full justify-start" data-testid="button-update-profile">
                    <Edit className="w-4 h-4 mr-2" />
                    Update Company Profile
                  </Button>
                  <Button variant="outline" className="w-full justify-start" data-testid="button-view-agreements">
                    <FileText className="w-4 h-4 mr-2" />
                    Review Pending Agreements
                  </Button>
                  <Button variant="outline" className="w-full justify-start" data-testid="button-compliance-check">
                    <Shield className="w-4 h-4 mr-2" />
                    Complete Compliance Check
                  </Button>
                </CardContent>
              </Card>

              {/* Recent Activity */}
              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                  <CardDescription>Latest updates and notifications</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {notifications.length > 0 ? notifications.slice(0, 5).map((notification: any) => (
                    <div key={notification.id} className="flex items-start gap-3 p-3 border rounded">
                      <div className={`w-2 h-2 rounded-full mt-2 ${notification.isRead ? 'bg-gray-300' : 'bg-blue-500'}`}></div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{notification.title}</p>
                        <p className="text-xs text-gray-600">{notification.message}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(notification.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  )) : (
                    <div className="text-center py-6 text-gray-500">
                      <Bell className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                      <p>No recent activity</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Performance Metrics */}
            {stats && (
              <Card>
                <CardHeader>
                  <CardTitle>Performance Dashboard</CardTitle>
                  <CardDescription>Your business metrics and opportunities</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">{stats.totalOpportunities || 0}</div>
                      <p className="text-sm text-gray-600">Total Opportunities</p>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">{stats.wonProjects || 0}</div>
                      <p className="text-sm text-gray-600">Projects Won</p>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-yellow-600">{stats.averageRating || "N/A"}</div>
                      <p className="text-sm text-gray-600">Average Rating</p>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">£{stats.totalRevenue?.toLocaleString() || 0}</div>
                      <p className="text-sm text-gray-600">Total Revenue</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="documents" className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Document Management</h3>
              <Button className="bg-[#330311] hover:bg-[#4a0418] text-white" data-testid="button-upload-new">
                <Upload className="w-4 h-4 mr-2" />
                Upload Document
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {documents.map((document: Document) => (
                <Card key={document.id} className="relative">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-base">{document.documentName}</CardTitle>
                        <CardDescription className="capitalize">
                          {document.documentType.replace(/_/g, ' ')}
                        </CardDescription>
                      </div>
                      <Badge className={getStatusColor(document.verificationStatus)}>
                        {document.verificationStatus}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Uploaded:</span>
                        <span>{new Date(document.uploadDate).toLocaleDateString()}</span>
                      </div>
                      {document.expiryDate && (
                        <div className="flex justify-between">
                          <span>Expires:</span>
                          <span className={new Date(document.expiryDate) < new Date() ? "text-red-600" : ""}>
                            {new Date(document.expiryDate).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2 mt-4">
                      <Button variant="outline" size="sm" data-testid={`button-view-${document.id}`}>
                        <Eye className="w-4 h-4 mr-1" />
                        View
                      </Button>
                      <Button variant="outline" size="sm" data-testid={`button-download-${document.id}`}>
                        <Download className="w-4 h-4 mr-1" />
                        Download
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="compliance" className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Compliance Questionnaire</h3>
              <Badge variant="outline">
                {compliance.filter((item: ComplianceItem) => item.answer).length}/{compliance.length} Complete
              </Badge>
            </div>

            <div className="space-y-4">
              {compliance.map((item: ComplianceItem) => (
                <Card key={item.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-base">{item.questionText}</CardTitle>
                        <CardDescription className="capitalize">
                          {item.questionCategory} - {item.answerType.replace(/_/g, ' ')}
                        </CardDescription>
                      </div>
                      <Badge className={item.answer ? getStatusColor("verified") : getStatusColor("pending")}>
                        {item.answer ? "Answered" : "Pending"}
                      </Badge>
                    </div>
                  </CardHeader>
                  {item.answer && (
                    <CardContent>
                      <div className="bg-gray-50 p-3 rounded">
                        <p className="text-sm"><strong>Answer:</strong> {item.answer}</p>
                        {item.reviewDate && (
                          <p className="text-xs text-gray-600 mt-1">
                            Reviewed: {new Date(item.reviewDate).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="agreements" className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Legal Agreements</h3>
              <Badge variant="outline">
                {agreements.filter((agreement: Agreement) => agreement.status === "signed").length}/{agreements.length} Signed
              </Badge>
            </div>

            <div className="space-y-4">
              {agreements.map((agreement: Agreement) => (
                <Card key={agreement.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-base">{agreement.agreementTitle}</CardTitle>
                        <CardDescription className="capitalize">
                          {agreement.agreementType.replace(/_/g, ' ')}
                        </CardDescription>
                      </div>
                      <Badge className={getStatusColor(agreement.status)}>
                        {agreement.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      {agreement.sentDate && (
                        <div className="flex justify-between">
                          <span>Sent:</span>
                          <span>{new Date(agreement.sentDate).toLocaleDateString()}</span>
                        </div>
                      )}
                      {agreement.signedDate && (
                        <div className="flex justify-between">
                          <span>Signed:</span>
                          <span>{new Date(agreement.signedDate).toLocaleDateString()}</span>
                        </div>
                      )}
                      {agreement.expiryDate && (
                        <div className="flex justify-between">
                          <span>Expires:</span>
                          <span>{new Date(agreement.expiryDate).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2 mt-4">
                      <Button variant="outline" size="sm" data-testid={`button-view-agreement-${agreement.id}`}>
                        <Eye className="w-4 h-4 mr-1" />
                        Review
                      </Button>
                      {agreement.status === "sent" && (
                        <Button size="sm" className="bg-[#330311] hover:bg-[#4a0418] text-white" data-testid={`button-sign-${agreement.id}`}>
                          <FileText className="w-4 h-4 mr-1" />
                          Sign Agreement
                        </Button>
                      )}
                      {agreement.status === "signed" && (
                        <Button variant="outline" size="sm" data-testid={`button-download-agreement-${agreement.id}`}>
                          <Download className="w-4 h-4 mr-1" />
                          Download
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="profile" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Company Profile</CardTitle>
                <CardDescription>Manage your business information and settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Company Name</Label>
                    <p className="text-gray-900">{vendorUser.companyName}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Contact Person</Label>
                    <p className="text-gray-900">{vendorUser.contactPersonName}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Email</Label>
                    <p className="text-gray-900">{vendorUser.email}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Phone</Label>
                    <p className="text-gray-900">{vendorUser.phone}</p>
                  </div>
                  <div className="md:col-span-2">
                    <Label className="text-sm font-medium">Address</Label>
                    <p className="text-gray-900">{vendorUser.companyAddress}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Business Type</Label>
                    <p className="text-gray-900">{vendorUser.businessType}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Years in Business</Label>
                    <p className="text-gray-900">{vendorUser.yearsInBusiness} years</p>
                  </div>
                </div>
                
                <div>
                  <Label className="text-sm font-medium">Services Offered</Label>
                  <div className="flex gap-2 mt-2 flex-wrap">
                    {vendorUser.servicesOffered.map((service) => (
                      <Badge key={service} variant="outline">{service}</Badge>
                    ))}
                  </div>
                </div>
                
                <div>
                  <Label className="text-sm font-medium">Service Areas</Label>
                  <div className="flex gap-2 mt-2 flex-wrap">
                    {vendorUser.serviceAreas.map((area) => (
                      <Badge key={area} variant="outline">{area}</Badge>
                    ))}
                  </div>
                </div>

                <Button variant="outline" data-testid="button-edit-profile">
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Profile
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="opportunities" className="space-y-6">
            <div className="text-center py-12">
              <TrendingUp className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Event Opportunities</h3>
              <p className="text-gray-600 mb-6">
                Complete your profile setup to start receiving event invitations and business opportunities.
              </p>
              {completionPercentage < 100 ? (
                <Badge variant="outline" className="mb-4">
                  {100 - completionPercentage}% remaining to unlock opportunities
                </Badge>
              ) : (
                <Badge className="bg-green-100 text-green-800 mb-4">
                  Ready to receive opportunities
                </Badge>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );

  function Label({ className, children, ...props }: any) {
    return <label className={className} {...props}>{children}</label>;
  }
}