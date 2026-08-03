import { useState, useEffect } from "react";
import { useDocumentMeta } from "../lib/useDocumentMeta";
import { isPackageBookingConfigured, adminGetClientsOverview, type AdminClientOverview } from "../lib/packageBooking";

const PASSWORD_STORAGE_KEY = "elysian_admin_portal_password";

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

                  {c.packages.length === 0 && c.activePromoCodes.length === 0 && (
                    <p className="font-sans text-xs text-muted-foreground/70">No active packages or promo codes.</p>
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

                  {c.activePromoCodes.map((p) => (
                    <div key={p.code} className="inline-flex items-center gap-2 bg-[#F0EBE1] px-3 py-1 mt-1 font-sans text-xs">
                      <span className="tracking-widest">{p.code}</span>
                      <span className="text-[#BF944A]">
                        {p.discountType === "percentage" ? `${p.discountValue}% off` : `£${p.discountValue} off`}
                      </span>
                    </div>
                  ))}
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
