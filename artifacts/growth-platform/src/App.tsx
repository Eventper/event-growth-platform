import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Layout from "@/components/Layout";
import Insights from "@/pages/insights";
import Dashboard from "@/pages/dashboard";
import Events from "@/pages/events";
import AiTest from "@/pages/ai-test";
import Wizard from "@/pages/wizard";
import Personas from "@/pages/personas";
import Discovery from "@/pages/discovery";
import Screen from "@/pages/screen";
import Outreach from "@/pages/outreach";
import OutreachWorkspace from "@/pages/outreach-workspace";
import MessagingStudio from "@/pages/messaging-studio";
import Pipeline from "@/pages/pipeline";
import Intelligence from "@/pages/intelligence";
import PresentationStudio from "@/pages/presentation-studio";
import LearningEngine from "@/pages/learning-engine";
import SiteBuilder from "@/pages/site-builder";
import Commercial from "@/pages/commercial";
import Sponsors from "@/pages/sponsors";
import PartnershipPipeline from "@/pages/partnership-pipeline";
import GuestIntelligence from "@/pages/guest-intelligence";
import OrganisationDatabase from "@/pages/organisation-database";
import PartnerDatabase from "@/pages/partner-database";
import IntelligenceDashboard from "@/pages/intelligence-dashboard";
import OperationsTimeline from "@/pages/operations-timeline";
import GrowthCampaigns from "@/pages/growth-campaigns";
import PrPipeline from "@/pages/pr-pipeline";
import Referrals from "@/pages/referrals";
import CorporateTargets from "@/pages/corporate-targets";
import AiCommunications from "@/pages/ai-communications";
import CampaignWorkspace from "@/pages/campaign-workspace";
import OutreachControl from "@/pages/outreach-control";
import OutreachDashboard from "@/pages/outreach-dashboard";
import Scheduler from "@/pages/scheduler";
import ProjectSetup from "@/pages/project-setup";
import TemplateBuilder from "@/pages/template-builder";
import Growth from "@/pages/growth";
import Performance from "@/pages/performance";
import SettingsPage from "@/pages/settings";
import Login from "@/pages/Login";
import NotFound from "@/pages/not-found";
import Elizabeth from "@/components/Elizabeth";
import { EventProvider } from "@/contexts/EventContext";
import { WorkspaceProvider } from "@/contexts/WorkspaceContext";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";

const queryClient = new QueryClient();

const publicPaths = ["/login", "/reset-password", "/ai-communications"];

function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const [loc] = useLocation();
  const isPublic = publicPaths.includes(loc);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ink">
        <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user && !isPublic) {
    return <Login />;
  }

  return <>{children}</>;
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/reset-password" component={Login} />
      <Route path="/" component={Dashboard} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/insights" component={Insights} />
      <Route path="/events" component={Events} />
      <Route path="/ai-test" component={AiTest} />
      <Route path="/wizard" component={Wizard} />
      <Route path="/personas" component={Personas} />
      <Route path="/discovery" component={Discovery} />
      <Route path="/screen" component={Screen} />
      <Route path="/outreach" component={Outreach} />
      <Route path="/outreach-workspace" component={OutreachWorkspace} />
      <Route path="/messaging-studio" component={MessagingStudio} />
      <Route path="/pipeline" component={Pipeline} />
      <Route path="/intelligence" component={Intelligence} />
      <Route path="/presentation-studio" component={PresentationStudio} />
      <Route path="/learning-engine" component={LearningEngine} />
      <Route path="/site-builder" component={SiteBuilder} />
      <Route path="/commercial" component={Commercial} />
      <Route path="/sponsors" component={Sponsors} />
      <Route path="/partnership-pipeline" component={PartnershipPipeline} />
      <Route path="/guest-intelligence" component={GuestIntelligence} />
      <Route path="/organisation-database" component={OrganisationDatabase} />
      <Route path="/partner-database" component={PartnerDatabase} />
      <Route path="/intelligence-dashboard" component={IntelligenceDashboard} />
      <Route path="/operations-timeline" component={OperationsTimeline} />
      <Route path="/growth-campaigns" component={GrowthCampaigns} />
      <Route path="/pr-pipeline" component={PrPipeline} />
      <Route path="/referrals" component={Referrals} />
      <Route path="/corporate-targets" component={CorporateTargets} />
      <Route path="/ai-communications" component={AiCommunications} />
      <Route path="/campaign-workspace" component={CampaignWorkspace} />
      <Route path="/outreach-control" component={OutreachControl} />
      <Route path="/scheduler" component={Scheduler} />
      <Route path="/project-setup" component={ProjectSetup} />
      <Route path="/outreach-dashboard" component={OutreachDashboard} />
      <Route path="/template-builder" component={TemplateBuilder} />
      <Route path="/growth" component={Growth} />
      <Route path="/performance" component={Performance} />
      <Route path="/settings" component={SettingsPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <WorkspaceProvider>
            <EventProvider>
              <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
                <AuthGate>
                  <Layout>
                    <Router />
                  </Layout>
                  <Elizabeth />
                </AuthGate>
              </WouterRouter>
            </EventProvider>
          </WorkspaceProvider>
        </AuthProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
