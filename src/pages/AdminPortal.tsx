import { useState, useEffect } from "react";
import { useDocumentMeta } from "../lib/useDocumentMeta";
import {
  isPackageBookingConfigured,
  adminGetClientsOverview,
  adminCreatePromoCode,
  PACKAGE_SERVICES,
  type AdminClientOverview,
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
        Code created: <span className="tracking-widest font-medium">{createdCode}</span> — it now
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
  const [search, setSearch] = useState("");

  const load = async (pwd: string) => {
    setLoading(true);
    setError("");
    try {
      const data = await adminGetClientsOverview(pwd);
      setClients(data);
      sessionStorage.setItem(PASSWORD_STORAGE_KEY, pwd);
    } catch (err) {
      sessionStorage.removeItem(PASSWORD_STORAGE_KEY);
      setError(err instanceof Error ? err.message : "Une erreur est survenue.");
    } finally {
      setLoading(false);
    }
  };

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
                    c.activePromoCodes.length === 0 && (
                      <p className="font-sans text-xs text-muted-foreground/70">
                        No active packages, upcoming appointments or promo codes.
                      </p>
                    )}

                  {c.packages.length > 0 && (
                    <div className="space-y-1 mb-2">
                      {c.packages.map((pkg) => (
                        <div key={pkg.packageName} className="flex justify-between font-sans text-sm">
                          <span>{pkg.packageName}</span>
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

                  {c.activePromoCodes.map((p) => (
                    <div key={p.code} className="inline-flex items-center gap-2 bg-[#F0EBE1] px-3 py-1 mt-1 mr-2 font-sans text-xs">
                      <span className="tracking-widest">{p.code}</span>
                      <span className="text-[#BF944A]">
                        {p.discountType === "percentage" ? `${p.discountValue}% off` : `£${p.discountValue} off`}
                      </span>
                    </div>
                  ))}

                  {c.email && (
                    <div>
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
