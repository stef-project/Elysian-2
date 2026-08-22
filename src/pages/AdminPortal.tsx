import { useState, useEffect } from "react";
import { useDocumentMeta } from "../lib/useDocumentMeta";
import {
  isPackageBookingConfigured,
  adminGetClientsOverview,
  adminCreatePromoCode,
  adminCancelPromoCode,
  adminAddClient,
  adminAddPackage,
  adminListPackageClaims,
  adminApprovePackageClaim,
  adminRejectPackageClaim,
  PACKAGE_SERVICES,
  PAYMENT_METHODS,
  type AdminClientOverview,
  type PackageClaim,
} from "../lib/packageBooking";

const PASSWORD_STORAGE_KEY = "elysian_admin_portal_password";

const serviceLabel = (serviceId: string) =>
  PACKAGE_SERVICES.find((s) => s.id === serviceId)?.label ?? serviceId;

const formatDateTime = (iso: string) => {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
};

// Formulaire minimal de création d'un code promo pour UNE cliente donnée —
// la seule écriture du portail (tout le reste est en lecture seule).
function PromoCodeForm({
  clientEmail,
  password,
  onCreated,
}: {
  clientEmail: string;
  password: string;
  onCreated: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [discountType, setDiscountType] = useState<"percentage" | "fixed_amount">("percentage");
  const [discountValue, setDiscountValue] = useState("");
  const [validityDays, setValidityDays] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [createdCode, setCreatedCode] = useState("");

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="font-sans text-xs text-muted-foreground hover:text-primary transition-colors underline mt-2"
      >
        + Add promo code
      </button>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = parseFloat(discountValue);
    if (isNaN(value) || value <= 0) {
      setError("Enter a valid discount value.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const days = parseInt(validityDays, 10);
      const result = await adminCreatePromoCode(password, {
        clientEmail,
        discountType,
        discountValue: value,
        usageMax: 1,
        validityDays: isNaN(days) || days <= 0 ? undefined : days,
      });
      setCreatedCode(result.code);
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  if (createdCode) {
    return (
      <p className="font-sans text-xs mt-2">
        Code created: <span className="tracking-widest font-medium">{createdCode}</span>, it now
        shows on this client's account.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3 mt-3 font-sans text-xs">
      <label className="flex flex-col gap-1">
        <span className="text-muted-foreground">Discount</span>
        <select
          value={discountType}
          onChange={(e) => setDiscountType(e.target.value as "percentage" | "fixed_amount")}
          className="bg-transparent border-b border-border py-1 focus:outline-none focus:border-primary"
        >
          <option value="percentage">% off</option>
          <option value="fixed_amount">£ off</option>
        </select>
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-muted-foreground">Value</span>
        <input
          type="number"
          min="0.01"
          step="0.01"
          required
          value={discountValue}
          onChange={(e) => setDiscountValue(e.target.value)}
          className="w-20 bg-transparent border-b border-border py-1 focus:outline-none focus:border-primary"
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-muted-foreground">Valid for (days, optional)</span>
        <input
          type="number"
          min="1"
          value={validityDays}
          onChange={(e) => setValidityDays(e.target.value)}
          className="w-28 bg-transparent border-b border-border py-1 focus:outline-none focus:border-primary"
        />
      </label>
      <button
        type="submit"
        disabled={submitting}
        className="tracking-[0.15em] uppercase bg-[#1A1A1A] text-[#F7F5F2] px-4 py-2 hover:bg-primary transition-colors duration-300 disabled:opacity-50"
      >
        {submitting ? "Creating…" : "Create"}
      </button>
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="text-muted-foreground hover:text-primary transition-colors underline"
      >
        Cancel
      </button>
      {error && <p className="w-full text-red-600">{error}</p>}
    </form>
  );
}

// Création d'une cliente depuis le portail — le parrainage (recherche de la
// marraine) reste côté menu Sheet, volontairement non exposé ici.
function AddClientForm({ password, onCreated }: { password: string; onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [prenom, setPrenom] = useState("");
  const [nom, setNom] = useState("");
  const [email, setEmail] = useState("");
  const [telephone, setTelephone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="font-sans text-xs tracking-[0.15em] uppercase border border-[#1A1A1A] px-4 py-2 hover:bg-[#1A1A1A] hover:text-[#F7F5F2] transition-colors"
      >
        + Add client
      </button>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      await adminAddClient(password, { prenom, nom, email, telephone });
      setOpen(false);
      setPrenom("");
      setNom("");
      setEmail("");
      setTelephone("");
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass =
    "bg-transparent border-b border-border py-1 focus:outline-none focus:border-primary font-sans text-sm";

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3 border border-border p-4 font-sans text-xs w-full">
      <label className="flex flex-col gap-1">
        <span className="text-muted-foreground">First name</span>
        <input required value={prenom} onChange={(e) => setPrenom(e.target.value)} className={inputClass} />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-muted-foreground">Last name</span>
        <input value={nom} onChange={(e) => setNom(e.target.value)} className={inputClass} />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-muted-foreground">Email</span>
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-muted-foreground">Phone (optional)</span>
        <input value={telephone} onChange={(e) => setTelephone(e.target.value)} className={inputClass} />
      </label>
      <button
        type="submit"
        disabled={submitting}
        className="tracking-[0.15em] uppercase bg-[#1A1A1A] text-[#F7F5F2] px-4 py-2 hover:bg-primary transition-colors duration-300 disabled:opacity-50"
      >
        {submitting ? "Creating…" : "Create client"}
      </button>
      <button type="button" onClick={() => setOpen(false)} className="text-muted-foreground hover:text-primary underline">
        Cancel
      </button>
      {error && <p className="w-full text-red-600">{error}</p>}
    </form>
  );
}

// Attribution d'un forfait immédiatement actif (réservable, synchro Google
// Calendar à chaque réservation). Aucun montant ici : le paiement est suivi
// hors système — une trace neutre à 0 est écrite côté Sheet (invariant
// "aucun forfait actif sans trace de paiement").
function AddPackageForm({
  clientEmail,
  password,
  onCreated,
}: {
  clientEmail: string;
  password: string;
  onCreated: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [packageName, setPackageName] = useState("");
  const [services, setServices] = useState<string[]>([]);
  const [totalSessions, setTotalSessions] = useState("");
  const [availableSessions, setAvailableSessions] = useState("");
  const [expirationDate, setExpirationDate] = useState("");
  const [amountPaid, setAmountPaid] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("other");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="font-sans text-xs text-muted-foreground hover:text-primary transition-colors underline mt-2 mr-4"
      >
        + Add package
      </button>
    );
  }

  const toggleService = (id: string) =>
    setServices((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const total = parseInt(totalSessions, 10);
    if (isNaN(total) || total < 1) {
      setError("Enter a valid total number of sessions.");
      return;
    }
    if (services.length === 0) {
      setError("Select at least one included service.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await adminAddPackage(password, {
        clientEmail,
        packageName,
        servicesIncluded: services,
        totalSessions: total,
        availableSessions: availableSessions === "" ? "" : parseInt(availableSessions, 10),
        expirationDate: expirationDate || undefined,
        amountPaid: amountPaid === "" ? "" : parseFloat(amountPaid),
        paymentMethod,
      });
      setOpen(false);
      setPackageName("");
      setServices([]);
      setTotalSessions("");
      setAvailableSessions("");
      setExpirationDate("");
      setAmountPaid("");
      setPaymentMethod("other");
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass =
    "bg-transparent border-b border-border py-1 focus:outline-none focus:border-primary font-sans text-sm";

  return (
    <form onSubmit={handleSubmit} className="space-y-3 border border-border/60 p-4 mt-3 font-sans text-xs">
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-muted-foreground">Package name</span>
          <input required value={packageName} onChange={(e) => setPackageName(e.target.value)} placeholder="e.g. Pack 5 Drainage" className={inputClass} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-muted-foreground">Total sessions</span>
          <input type="number" min="1" required value={totalSessions} onChange={(e) => setTotalSessions(e.target.value)} className={`w-24 ${inputClass}`} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-muted-foreground">Sessions left (default = total)</span>
          <input type="number" min="0" value={availableSessions} onChange={(e) => setAvailableSessions(e.target.value)} className={`w-32 ${inputClass}`} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-muted-foreground">Expiry date (optional)</span>
          <input type="date" value={expirationDate} onChange={(e) => setExpirationDate(e.target.value)} className={inputClass} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-muted-foreground">Amount paid £ (optional)</span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={amountPaid}
            onChange={(e) => setAmountPaid(e.target.value)}
            placeholder="tracked outside if empty"
            className={`w-40 ${inputClass}`}
          />
        </label>
        {amountPaid !== "" && (
          <label className="flex flex-col gap-1">
            <span className="text-muted-foreground">Payment method</span>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className={inputClass}
            >
              {PAYMENT_METHODS.map((m) => (
                <option key={m.id} value={m.id}>{m.label}</option>
              ))}
            </select>
          </label>
        )}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        <span className="w-full text-muted-foreground">Included services</span>
        {PACKAGE_SERVICES.map((s) => (
          <label key={s.id} className="flex items-center gap-1 cursor-pointer">
            <input type="checkbox" checked={services.includes(s.id)} onChange={() => toggleService(s.id)} />
            <span>{s.label}</span>
          </label>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="tracking-[0.15em] uppercase bg-[#1A1A1A] text-[#F7F5F2] px-4 py-2 hover:bg-primary transition-colors duration-300 disabled:opacity-50"
        >
          {submitting ? "Creating…" : "Create package"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="text-muted-foreground hover:text-primary underline">
          Cancel
        </button>
      </div>
      <p className="text-muted-foreground/70">
        The package is active immediately, the client can book with it right away (calendar synced).
        If you enter the amount paid, it is recorded as a confirmed payment (dashboard revenue stays accurate);
        leave it empty if the payment is tracked outside the system.
      </p>
      {error && <p className="text-red-600">{error}</p>}
    </form>
  );
}

// Traitement d'une demande de forfait (/claim-package) : approuver crée la
// cliente si besoin + son forfait (mêmes champs que AddPackageForm), ou
// rejeter avec un motif optionnel. Repliée par défaut, une demande à la fois.
function PackageClaimCard({
  claim,
  password,
  onResolved,
}: {
  claim: PackageClaim;
  password: string;
  onResolved: () => void;
}) {
  const [approving, setApproving] = useState(false);
  const [packageName, setPackageName] = useState("");
  const [services, setServices] = useState<string[]>([]);
  const [totalSessions, setTotalSessions] = useState("");
  const [availableSessions, setAvailableSessions] = useState("");
  const [expirationDate, setExpirationDate] = useState("");
  const [amountPaid, setAmountPaid] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("other");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const toggleService = (id: string) =>
    setServices((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const handleApprove = async (e: React.FormEvent) => {
    e.preventDefault();
    const total = parseInt(totalSessions, 10);
    if (isNaN(total) || total < 1) {
      setError("Enter a valid total number of sessions.");
      return;
    }
    if (services.length === 0) {
      setError("Select at least one included service.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await adminApprovePackageClaim(password, {
        claimId: claim.claimId,
        packageName,
        servicesIncluded: services,
        totalSessions: total,
        availableSessions: availableSessions === "" ? "" : parseInt(availableSessions, 10),
        expirationDate: expirationDate || undefined,
        amountPaid: amountPaid === "" ? "" : parseFloat(amountPaid),
        paymentMethod,
      });
      onResolved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!window.confirm(`Reject this request from ${claim.prenom}?`)) return;
    setSubmitting(true);
    setError("");
    try {
      await adminRejectPackageClaim(password, claim.claimId);
      onResolved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setSubmitting(false);
    }
  };

  const inputClass =
    "bg-transparent border-b border-border py-1 focus:outline-none focus:border-primary font-sans text-sm";

  return (
    <div className="border border-border p-5">
      <div className="flex justify-between items-baseline mb-2">
        <span className="font-serif text-lg text-[#1A1A1A]">
          {claim.prenom} {claim.nom}
        </span>
        <span className="font-sans text-xs text-muted-foreground">
          {claim.email} {claim.telephone ? `· ${claim.telephone}` : ""}
        </span>
      </div>
      {claim.message && (
        <p className="font-sans text-sm text-muted-foreground font-light mb-3">"{claim.message}"</p>
      )}
      <p className="font-sans text-xs text-muted-foreground/70 mb-3">
        Requested {formatDateTime(claim.createdAt)}
      </p>

      {!approving ? (
        <div className="flex items-center gap-4">
          <button
            onClick={() => setApproving(true)}
            className="font-sans text-xs tracking-[0.15em] uppercase border border-[#1A1A1A] px-4 py-2 hover:bg-[#1A1A1A] hover:text-[#F7F5F2] transition-colors"
          >
            Approve
          </button>
          <button
            onClick={handleReject}
            disabled={submitting}
            className="font-sans text-xs text-muted-foreground hover:text-red-600 transition-colors underline disabled:opacity-50"
          >
            Reject
          </button>
        </div>
      ) : (
        <form onSubmit={handleApprove} className="space-y-3 border border-border/60 p-4 font-sans text-xs">
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-muted-foreground">Package name</span>
              <input required value={packageName} onChange={(e) => setPackageName(e.target.value)} placeholder="e.g. Pack 5 Drainage" className={inputClass} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-muted-foreground">Total sessions</span>
              <input type="number" min="1" required value={totalSessions} onChange={(e) => setTotalSessions(e.target.value)} className={`w-24 ${inputClass}`} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-muted-foreground">Sessions left (default = total)</span>
              <input type="number" min="0" value={availableSessions} onChange={(e) => setAvailableSessions(e.target.value)} className={`w-32 ${inputClass}`} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-muted-foreground">Expiry date (optional)</span>
              <input type="date" value={expirationDate} onChange={(e) => setExpirationDate(e.target.value)} className={inputClass} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-muted-foreground">Amount paid £ (optional)</span>
              <input type="number" min="0" step="0.01" value={amountPaid} onChange={(e) => setAmountPaid(e.target.value)} placeholder="tracked outside if empty" className={`w-40 ${inputClass}`} />
            </label>
            {amountPaid !== "" && (
              <label className="flex flex-col gap-1">
                <span className="text-muted-foreground">Payment method</span>
                <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className={inputClass}>
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m.id} value={m.id}>{m.label}</option>
                  ))}
                </select>
              </label>
            )}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            <span className="w-full text-muted-foreground">Included services</span>
            {PACKAGE_SERVICES.map((s) => (
              <label key={s.id} className="flex items-center gap-1 cursor-pointer">
                <input type="checkbox" checked={services.includes(s.id)} onChange={() => toggleService(s.id)} />
                <span>{s.label}</span>
              </label>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="tracking-[0.15em] uppercase bg-[#1A1A1A] text-[#F7F5F2] px-4 py-2 hover:bg-primary transition-colors duration-300 disabled:opacity-50"
            >
              {submitting ? "Creating…" : "Create package & approve"}
            </button>
            <button type="button" onClick={() => setApproving(false)} className="text-muted-foreground hover:text-primary underline">
              Cancel
            </button>
          </div>
          {error && <p className="text-red-600">{error}</p>}
        </form>
      )}
      {error && !approving && <p className="font-sans text-xs text-red-600 mt-2">{error}</p>}
    </div>
  );
}

export default function AdminPortal() {
  useDocumentMeta("Admin Portal | Elysian Paris", "Internal admin portal.");

  // Jamais indexé, même si l'URL fuite — page interne, pas une page publique.
  useEffect(() => {
    const tag = document.querySelector('meta[name="robots"]');
    const previous = tag?.getAttribute("content") ?? null;
    tag?.setAttribute("content", "noindex, nofollow");
    return () => {
      if (previous !== null) tag?.setAttribute("content", previous);
    };
  }, []);

  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [clients, setClients] = useState<AdminClientOverview[] | null>(null);
  const [claims, setClaims] = useState<PackageClaim[]>([]);
  const [search, setSearch] = useState("");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const load = async (pwd: string) => {
    setLoading(true);
    setError("");
    try {
      const [data, claimsData] = await Promise.all([
        adminGetClientsOverview(pwd),
        adminListPackageClaims(pwd),
      ]);
      setClients(data);
      setClaims(claimsData);
      setLastUpdated(new Date());
      sessionStorage.setItem(PASSWORD_STORAGE_KEY, pwd);
    } catch (err) {
      sessionStorage.removeItem(PASSWORD_STORAGE_KEY);
      // Retour à l'écran de connexion : garder l'ancienne liste affichée
      // masquerait l'erreur (montrée uniquement sur cet écran) et laisserait
      // des données périmées sans signal, l'auto-refresh étant stoppé.
      setClients(null);
      setError(err instanceof Error ? err.message : "Une erreur est survenue.");
    } finally {
      setLoading(false);
    }
  };

  // Le portail ne chargeait les données qu'une fois, à la connexion : tout
  // changement fait ensuite dans le Sheet (forfait ajouté, code annulé,
  // cliente supprimée) restait invisible ou fantôme jusqu'à la déconnexion.
  // Re-synchronisation : au retour sur l'onglet + toutes les 60 s + bouton.
  useEffect(() => {
    if (clients === null) return;
    const refetch = () => {
      const saved = sessionStorage.getItem(PASSWORD_STORAGE_KEY);
      if (saved && document.visibilityState === "visible") load(saved);
    };
    const intervalId = window.setInterval(refetch, 60000);
    window.addEventListener("focus", refetch);
    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", refetch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clients === null]);

  // Reste connectée pour le reste de l'onglet : le mot de passe ne survit
  // jamais à la fermeture de l'onglet (sessionStorage, pas localStorage).
  useEffect(() => {
    const saved = sessionStorage.getItem(PASSWORD_STORAGE_KEY);
    if (saved) {
      setPassword(saved);
      load(saved);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    load(password);
  };

  const filtered = (clients ?? []).filter((c) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      c.prenom.toLowerCase().includes(q) ||
      c.nom.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q)
    );
  });

  // Agenda global : tous les rendez-vous à venir, toutes clientes confondues,
  // triés par date — la même donnée que l'événement Google Calendar déjà créé
  // à la confirmation, présentée ici en un coup d'œil.
  const upcomingAll = (clients ?? [])
    .flatMap((c) =>
      c.upcomingBookings.map((b) => ({
        ...b,
        clientName: `${c.prenom} ${c.nom}`.trim(),
      }))
    )
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

  if (!isPackageBookingConfigured()) {
    return (
      <div className="min-h-screen bg-background text-foreground font-sans flex items-center justify-center px-6">
        <p className="font-sans text-muted-foreground">This service is not yet configured.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <main className="max-w-5xl mx-auto px-6 py-20">
        <h1 className="font-serif text-3xl text-[#1A1A1A] font-light mb-10">Admin Portal</h1>

        {!clients && (
          <form onSubmit={handleSubmit} className="max-w-xs space-y-4">
            <input
              type="password"
              required
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full bg-transparent border-b border-border py-3 focus:outline-none focus:border-primary transition-colors font-sans text-sm"
            />
            {error && <p className="font-sans text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full font-sans text-xs tracking-[0.2em] uppercase bg-[#1A1A1A] text-[#F7F5F2] px-10 py-4 hover:bg-primary transition-colors duration-300 disabled:opacity-50"
            >
              {loading ? "Checking…" : "Enter"}
            </button>
          </form>
        )}

        {clients && (
          <div>
            <div className="flex items-center justify-between mb-6 gap-4">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or email"
                className="flex-1 max-w-sm bg-transparent border-b border-border py-2 focus:outline-none focus:border-primary transition-colors font-sans text-sm"
              />
              <span className="font-sans text-xs text-muted-foreground">
                {loading
                  ? "Refreshing…"
                  : lastUpdated
                    ? `Updated ${lastUpdated.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`
                    : ""}
              </span>
              <button
                onClick={() => load(password)}
                disabled={loading}
                className="font-sans text-xs text-muted-foreground hover:text-primary transition-colors underline disabled:opacity-50"
              >
                Refresh
              </button>
              <button
                onClick={() => {
                  sessionStorage.removeItem(PASSWORD_STORAGE_KEY);
                  setClients(null);
                  setPassword("");
                }}
                className="font-sans text-xs text-muted-foreground hover:text-primary transition-colors underline"
              >
                Log out
              </button>
            </div>

            <div className="mb-8">
              <AddClientForm password={password} onCreated={() => load(password)} />
            </div>

            {claims.length > 0 && (
              <section className="mb-10">
                <h2 className="font-serif text-xl text-[#1A1A1A] font-light mb-4">
                  Package requests
                  <span className="ml-3 font-sans text-xs align-middle text-[#BF944A] uppercase tracking-widest">
                    {claims.length} pending
                  </span>
                </h2>
                <div className="space-y-4">
                  {claims.map((c) => (
                    <PackageClaimCard
                      key={c.claimId}
                      claim={c}
                      password={password}
                      onResolved={() => load(password)}
                    />
                  ))}
                </div>
              </section>
            )}

            <section className="mb-10">
              <h2 className="font-serif text-xl text-[#1A1A1A] font-light mb-4">
                Upcoming appointments
              </h2>
              {upcomingAll.length === 0 ? (
                <p className="font-sans text-sm text-muted-foreground">No upcoming appointments.</p>
              ) : (
                <div className="border border-border divide-y divide-border">
                  {upcomingAll.map((b, i) => (
                    <div
                      key={`${b.start}-${b.clientName}-${i}`}
                      className="flex flex-wrap justify-between items-baseline gap-x-4 gap-y-1 px-4 py-3 font-sans text-sm"
                    >
                      <span className="text-[#1A1A1A]">{formatDateTime(b.start)}</span>
                      <span className="flex-1 min-w-40">{b.clientName}</span>
                      <span className="text-muted-foreground">{serviceLabel(b.serviceId)}</span>
                      {b.status === "external_manual" && (
                        <span className="text-xs text-[#BF944A] uppercase tracking-widest">
                          {b.source || "external"}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>

            <div className="space-y-4">
              {filtered.map((c) => (
                <div key={c.clientId} className="border border-border p-5">
                  <div className="flex justify-between items-baseline mb-3">
                    <span className="font-serif text-lg text-[#1A1A1A]">
                      {c.prenom} {c.nom}
                    </span>
                    <span className="font-sans text-xs text-muted-foreground">
                      {c.email} {c.telephone ? `· ${c.telephone}` : ""}
                    </span>
                  </div>

                  {c.packages.length === 0 &&
                    c.upcomingBookings.length === 0 &&
                    c.payments.length === 0 &&
                    c.activePromoCodes.length === 0 && (
                      <p className="font-sans text-xs text-muted-foreground/70">
                        No active packages, upcoming appointments, payments or promo codes.
                      </p>
                    )}

                  {c.packages.length > 0 && (
                    <div className="space-y-1 mb-2">
                      {c.packages.map((pkg) => (
                        <div key={pkg.packageName} className="flex justify-between font-sans text-sm">
                          <span>
                            {pkg.packageName}
                            {pkg.statut === "pending_payment" && (
                              <span className="ml-2 text-xs uppercase tracking-widest text-[#BF944A]">
                                awaiting payment
                              </span>
                            )}
                          </span>
                          <span className="text-muted-foreground">
                            {pkg.availableSessions}/{pkg.totalSessions} sessions left
                            {pkg.dateExpiration ? ` · expires ${new Date(pkg.dateExpiration).toLocaleDateString("en-GB")}` : ""}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {c.upcomingBookings.length > 0 && (
                    <div className="space-y-1 mb-2">
                      {c.upcomingBookings.map((b, i) => (
                        <div key={`${b.start}-${i}`} className="flex justify-between font-sans text-sm">
                          <span className="text-muted-foreground">Next appointment</span>
                          <span>
                            {formatDateTime(b.start)} · {serviceLabel(b.serviceId)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {c.payments.length > 0 && (
                    <div className="space-y-1 mb-2 border-t border-border/50 pt-2">
                      <p className="font-sans text-xs uppercase tracking-widest text-muted-foreground">
                        Recent payments · total {c.totalNetConfirmed.toFixed(2)} GBP net
                      </p>
                      {c.payments.map((pay, i) => (
                        <div key={`${pay.date}-${i}`} className="flex justify-between font-sans text-sm">
                          <span className="text-muted-foreground">
                            {new Date(pay.date).toLocaleDateString("en-GB")} · {pay.moyen.split("_").join(" ")}
                          </span>
                          <span>
                            {pay.montantBrut.toFixed(2)} {pay.devise}
                            {pay.statut !== "confirme" && (
                              <span className="ml-2 text-xs uppercase tracking-widest text-[#BF944A]">
                                {pay.statut === "a_confirmer" ? "to confirm" : pay.statut}
                              </span>
                            )}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}


                  {c.activePromoCodes.map((p) => (
                    <div key={p.code} className="inline-flex items-center gap-2 bg-[#F0EBE1] px-3 py-1 mt-1 mr-2 font-sans text-xs">
                      <span className="tracking-widest">{p.code}</span>
                      <span className="text-[#BF944A]">
                        {p.discountType === "percentage" ? `${p.discountValue}% off` : `£${p.discountValue} off`}
                      </span>
                      <button
                        type="button"
                        title="Cancel this code"
                        onClick={async () => {
                          // Un code générique est partagé : l'annuler ici l'annule pour toutes les clientes.
                          if (!window.confirm(`Cancel promo code ${p.code}? If it is a shared (generic) code, it will be cancelled for every client.`)) return;
                          try {
                            await adminCancelPromoCode(password, p.code);
                            load(password);
                          } catch (err) {
                            alert(err instanceof Error ? err.message : "Something went wrong.");
                          }
                        }}
                        className="text-muted-foreground hover:text-red-600 transition-colors leading-none"
                      >
                        ×
                      </button>
                    </div>
                  ))}

                  {c.email && (
                    <div>
                      <AddPackageForm
                        clientEmail={c.email}
                        password={password}
                        onCreated={() => load(password)}
                      />
                      <PromoCodeForm
                        clientEmail={c.email}
                        password={password}
                        onCreated={() => load(password)}
                      />
                    </div>
                  )}
                </div>
              ))}
              {filtered.length === 0 && (
                <p className="font-sans text-sm text-muted-foreground">No clients match your search.</p>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
