import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/hooks/useAuth";
import { MsalProvider } from "@azure/msal-react";
import { PublicClientApplication } from "@azure/msal-browser";
import { msalConfig } from "./auth/msalConfig";

// Pages
import { Landing } from "@/components/Landing";
import DashboardPage from "@/pages/Dashboard";
import CreateCampaignPage from "@/pages/CreateCampaign";
import CampaignCenterPage from "@/pages/CampaignCenterPage";
import AdminCenterPage from "@/pages/AdminCenterPage";
import AnalyticsPage from "@/pages/Analytics";
import NotFound from "@/pages/not-found";

function Router() {
  const { isAuthenticated, isLoading, user } = useAuth();

  return (
    <Switch>
      {(isLoading || !isAuthenticated) && import.meta.env.PROD ? (
        <Route path="/" component={Landing} />
      ) : (
        <>
          <Route path="/" component={DashboardPage} />
          <Route path="/dashboard" component={DashboardPage} />
          <Route path="/create" component={CreateCampaignPage} />
          <Route path="/campaigns" component={CampaignCenterPage} />
          <Route path="/analytics" component={AnalyticsPage} />
          {(user?.isAdmin || import.meta.env.DEV) && (
            <Route path="/admin" component={AdminCenterPage} />
          )}
        </>
      )}
      {!isAuthenticated && (
        <Route path="/" component={Landing} />
      )}
      <Route component={NotFound} />
    </Switch>
  );
}

function AuthenticatedApp() {
  const { isAuthenticated, isLoading, user } = useAuth();

  // Custom sidebar width for marketing application
  const style = {
    "--sidebar-width": "20rem",       // 320px for better content
    "--sidebar-width-icon": "4rem",   // default icon width
  } as React.CSSProperties;

  if (isLoading || !isAuthenticated) {
    return <Router />;
  }

  return (
    <SidebarProvider style={style}>
      <div className="flex h-screen w-full">
        <AppSidebar user={user || undefined} />
        <div className="flex flex-col flex-1">
          <header className="flex items-center justify-between p-4 border-b bg-background">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <ThemeToggle />
          </header>
          <main className="flex-1 overflow-auto p-6">
            <Router />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

// Initialize MSAL instance
const msalInstance = new PublicClientApplication(msalConfig);

function App() {
  return (
    <MsalProvider instance={msalInstance}>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <AuthenticatedApp />
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </MsalProvider>
  );
}

export default App;