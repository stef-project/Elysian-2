import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import Legal from "@/pages/Legal";
import AfterSurgery from "@/pages/AfterSurgery";
import UsePackage from "@/pages/UsePackage";

const queryClient = new QueryClient();

// Feature flag : la route /use-package est réellement désactivée (404) tant que
// Google Workspace n'est pas configuré et le lancement pas explicitement validé.
// Activer uniquement via la variable d'environnement Vercel VITE_PACKAGE_BOOKING_ENABLED=true.
const PACKAGE_BOOKING_ENABLED = import.meta.env.VITE_PACKAGE_BOOKING_ENABLED === "true";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/lymphatic-drainage-after-surgery" component={AfterSurgery} />
      {PACKAGE_BOOKING_ENABLED && <Route path="/use-package" component={UsePackage} />}
      <Route path="/privacy" component={Legal} />
      <Route path="/terms" component={Legal} />
      <Route path="/cookie-policy" component={Legal} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
