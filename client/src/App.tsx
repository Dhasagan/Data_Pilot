import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import DashboardLayout from "./components/DashboardLayout";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AnalyticsPage, AIAnalystPage, DashboardPage, DatasetDetailPage, DatasetsPage, ForecastPage, InsightsPage, LoginPage, ProfilePage, ReportsPage, SettingsPage } from "./pages/AppPages";

function Protected({ children }: { children: React.ReactNode }) {
  return <DashboardLayout>{children}</DashboardLayout>;
}

function Router() {
  return <Switch>
    <Route path="/" component={LoginPage} />
    <Route path="/login" component={LoginPage} />
    <Route path="/dashboard" component={() => <Protected><DashboardPage /></Protected>} />
    <Route path="/datasets/:id" component={() => <Protected><DatasetDetailPage /></Protected>} />
    <Route path="/datasets" component={() => <Protected><DatasetsPage /></Protected>} />
    <Route path="/analytics/:id" component={() => <Protected><AnalyticsPage /></Protected>} />
    <Route path="/analytics" component={() => <Protected><AnalyticsPage /></Protected>} />
    <Route path="/ai-analyst/:id" component={() => <Protected><AIAnalystPage /></Protected>} />
    <Route path="/ai-analyst" component={() => <Protected><AIAnalystPage /></Protected>} />
    <Route path="/insights/:id" component={() => <Protected><InsightsPage /></Protected>} />
    <Route path="/insights" component={() => <Protected><InsightsPage /></Protected>} />
    <Route path="/forecast/:id" component={() => <Protected><ForecastPage /></Protected>} />
    <Route path="/forecast" component={() => <Protected><ForecastPage /></Protected>} />
    <Route path="/reports" component={() => <Protected><ReportsPage /></Protected>} />
    <Route path="/settings" component={() => <Protected><SettingsPage /></Protected>} />
    <Route path="/profile" component={() => <Protected><ProfilePage /></Protected>} />
    <Route path="/404" component={NotFound} />
    <Route component={NotFound} />
  </Switch>;
}

function App() {
  return <ErrorBoundary><ThemeProvider defaultTheme="light"><TooltipProvider><Toaster /><Router /></TooltipProvider></ThemeProvider></ErrorBoundary>;
}

export default App;
