import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import Legal from "@/pages/Legal";
import Studios from "@/pages/Studios";
import Kensington from "@/pages/Kensington";
import Chelsea from "@/pages/Chelsea";
import UsePackage from "@/pages/UsePackage";
import PackageOffer from "@/pages/PackageOffer";
import BookChelsea from "@/pages/BookChelsea";
import AdminPortal from "@/pages/AdminPortal";
import BuyPackage from "@/pages/BuyPackage";
import BuyPackageSuccess from "@/pages/BuyPackageSuccess";
import HealthCheck from "@/pages/HealthCheck";

const queryClient = new QueryClient();

// Feature flag : la route /use-package est réellement désactivée (404) tant que
// Google Workspace n'est pas configuré et le lancement pas explicitement validé.
// Activer uniquement via la variable d'environnement Vercel VITE_PACKAGE_BOOKING_ENABLED=true.
const PACKAGE_BOOKING_ENABLED = import.meta.env.VITE_PACKAGE_BOOKING_ENABLED === "true";

// Feature flag séparé pour /offer/:offerId (Phase 2, Étape B — "Proposer un
// forfait") : reste désactivée (404) tant que non testée, indépendamment de
// VITE_PACKAGE_BOOKING_ENABLED. Activer via VITE_PACKAGE_OFFER_ENABLED=true.
const PACKAGE_OFFER_ENABLED = import.meta.env.VITE_PACKAGE_OFFER_ENABLED === "true";

// Feature flag séparé pour /buy-package (achat en ligne d'un forfait publié,
// Stripe Checkout) : reste désactivée (404) tant que non testée et qu'aucun
// modèle de forfait n'est marqué visibilite=public côté Sheet. Activer via
// VITE_PACKAGE_PURCHASE_ENABLED=true.
const PACKAGE_PURCHASE_ENABLED = import.meta.env.VITE_PACKAGE_PURCHASE_ENABLED === "true";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/studios" component={Studios} />
      <Route path="/kensington" component={Kensington} />
      <Route path="/chelsea" component={Chelsea} />
      <Route path="/book-chelsea" component={BookChelsea} />
      <Route path="/health-check" component={HealthCheck} />
      {PACKAGE_BOOKING_ENABLED && <Route path="/use-package" component={UsePackage} />}
      {PACKAGE_OFFER_ENABLED && <Route path="/offer/:offerId" component={PackageOffer} />}
      {PACKAGE_PURCHASE_ENABLED && <Route path="/buy-package/success" component={BuyPackageSuccess} />}
      {PACKAGE_PURCHASE_ENABLED && <Route path="/buy-package" component={BuyPackage} />}
      <Route path="/admin" component={AdminPortal} />
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
