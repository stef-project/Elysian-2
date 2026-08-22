import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { TopBar } from "../components/layout/TopBar";
import { Navbar } from "../components/layout/Navbar";
import { Footer } from "../components/layout/Footer";
import { WhatsAppButton } from "../components/ui/WhatsAppButton";
import { WHATSAPP_URL } from "../lib/booking";
import {
  isPackageBookingConfigured,
  requestVerificationCode,
  verifyCode,
  getAvailableSlots,
  getClientDashboard,
  confirmBooking,
  revokeSession,
  submitPackageClaim,
  generateBookingRequestId,
  ApiBusinessError,
  PACKAGE_SERVICES,
  type ActivePromoCode,
} from "../lib/packageBooking";

type Step =
  | "loading" | "email" | "code" | "dashboard" | "service" | "slots" | "confirmed"
  | "register" | "register-submitted";

// Le jeton de session est volontairement gardé sur cet appareil (localStorage,
// pas sessionStorage) pour ~90 jours (session_token_validity_minutes, onglet
// Settings) : une cliente ne retape son email/code qu'une seule fois par
// appareil, pas à chaque visite — sinon trop d'étapes, elle nous écrit
// directement sur WhatsApp au lieu de se servir elle-même. Compromis assumé :
// un peu moins strict qu'un code à chaque fois, mais ce jeton ne débloque
// qu'une réservation avec un forfait déjà payé, jamais un paiement.
const PACKAGE_SESSION_STORAGE_KEY = "elysian_package_session_token";

export default function UsePackage() {
  const [step, setStep] = useState<Step>("email");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sessionToken, setSessionToken] = useState("");
  const [eligibleServices, setEligibleServices] = useState<string[]>([]);
  const [packageName, setPackageName] = useState("");
  const [availableSessions, setAvailableSessions] = useState(0);
  const [serviceId, setServiceId] = useState("");
  const [slots, setSlots] = useState<{ start: string; end: string }[]>([]);
  const [upcomingBookings, setUpcomingBookings] = useState<
    { serviceId: string; start: string; end: string }[]
  >([]);
  const [activePromoCodes, setActivePromoCodes] = useState<ActivePromoCode[]>([]);
  const [bookingRequestId, setBookingRequestId] = useState(generateBookingRequestId());

  // Formulaire "Register my package" — même page, même email partagé avec
  // l'onglet "I have a package" pour ne pas le retaper en changeant d'onglet.
  const [prenom, setPrenom] = useState("");
  const [nom, setNom] = useState("");
  const [telephone, setTelephone] = useState("");
  const [message, setMessage] = useState("");

  // Page de vérification d'identité : jamais indexée, même si l'URL fuite.
  useEffect(() => {
    const tag = document.querySelector('meta[name="robots"]');
    const previous = tag?.getAttribute("content") ?? null;
    tag?.setAttribute("content", "noindex, nofollow");
    return () => {
      if (previous !== null) tag?.setAttribute("content", previous);
    };
  }, []);

  // Reconnexion silencieuse : un jeton déjà enregistré sur cet appareil saute
  // directement au tableau de bord, sans redemander email + code.
  useEffect(() => {
    const stored = localStorage.getItem(PACKAGE_SESSION_STORAGE_KEY);
    if (!stored) return;
    setStep("loading");
    (async () => {
      try {
        const dashboard = await getClientDashboard(stored);
        setSessionToken(stored);
        setPackageName(dashboard.packageName);
        setAvailableSessions(dashboard.availableSessions);
        setUpcomingBookings(dashboard.upcomingBookings);
        setActivePromoCodes(dashboard.activePromoCodes);
        setEligibleServices(dashboard.eligibleServices);
        setStep("dashboard");
      } catch {
        // Jeton expiré/invalide (appareil différent, 90 jours écoulés...) :
        // on l'oublie et on repart d'un email neuf, sans jamais bloquer la page.
        localStorage.removeItem(PACKAGE_SESSION_STORAGE_KEY);
        setStep("email");
      }
    })();
  }, []);

  const serviceLabel = (id: string) => PACKAGE_SERVICES.find((s) => s.id === id)?.label ?? id;
  const serviceDuration = (id: string) => PACKAGE_SERVICES.find((s) => s.id === id)?.durationMinutes ?? 60;

  const requestNewCode = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await requestVerificationCode(email);
      setInfo(res.message);
      setCode("");
      setStep("code");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue.");
    } finally {
      setLoading(false);
    }
  };

  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    await requestNewCode();
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await verifyCode(email, code);
      setSessionToken(res.sessionToken);
      setEligibleServices(res.eligibleServices);
      setPackageName(res.packageName);
      setAvailableSessions(res.availableSessions);
      localStorage.setItem(PACKAGE_SESSION_STORAGE_KEY, res.sessionToken);

      try {
        const dashboard = await getClientDashboard(res.sessionToken);
        setUpcomingBookings(dashboard.upcomingBookings);
        setActivePromoCodes(dashboard.activePromoCodes);
      } catch {
        // Le tableau de bord est un plus, pas un bloquant : si l'appel échoue,
        // on continue quand même vers la réservation.
        setUpcomingBookings([]);
        setActivePromoCodes([]);
      }
      setStep("dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue.");
    } finally {
      setLoading(false);
    }
  };

  const proceedToBooking = async () => {
    if (eligibleServices.length === 1) {
      setServiceId(eligibleServices[0]);
      await loadSlots(sessionToken, eligibleServices[0]);
    } else {
      setStep("service");
    }
  };

  const loadSlots = async (token: string, service: string) => {
    setLoading(true);
    setError("");
    try {
      const res = await getAvailableSlots(token, service, serviceDuration(service));
      setSlots(res.slots);
      setServiceId(service);
      setStep("slots");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue.");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async (slot: { start: string; end: string }) => {
    setLoading(true);
    setError("");
    try {
      await confirmBooking(sessionToken, bookingRequestId, serviceId, slot.start, slot.end);
      setStep("confirmed");
    } catch (err) {
      // Échec MÉTIER (le serveur a répondu : rien n'a été confirmé sous cet
      // identifiant, ex. créneau pris ou échec Calendar avec séance
      // restaurée) → nouvel identifiant, pour que le prochain créneau choisi
      // ne soit pas rejeté par l'idempotence de la tentative précédente.
      // Erreur RÉSEAU (issue inconnue : la réservation a pu réussir) → on
      // garde l'identifiant, un retry renverra le résultat déjà obtenu au
      // lieu de créer un doublon.
      if (err instanceof ApiBusinessError) {
        setBookingRequestId(generateBookingRequestId());
      }
      setError(err instanceof Error ? err.message : "Une erreur est survenue.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await submitPackageClaim(email.trim(), prenom.trim(), nom.trim(), telephone.trim(), message.trim());
      setStep("register-submitted");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const logOut = () => {
    const token = sessionToken;
    localStorage.removeItem(PACKAGE_SESSION_STORAGE_KEY);
    setSessionToken("");
    setStep("email");
    // Révocation côté serveur en tâche de fond : la déconnexion locale ne
    // doit jamais attendre après, ni échouer si le jeton était déjà expiré.
    if (token) revokeSession(token).catch(() => {});
  };

  if (!isPackageBookingConfigured()) {
    return (
      <div className="min-h-screen bg-background text-foreground font-sans">
        <TopBar />
        <Navbar />
        <main className="max-w-xl mx-auto px-6 py-32 text-center">
          <p className="font-sans text-[11px] tracking-[0.25em] uppercase text-primary mb-4">
            Existing Package
          </p>
          <h1 className="font-serif text-3xl md:text-4xl text-[#1A1A1A] font-light mb-6">
            This service is not yet available online.
          </h1>
          <p className="font-sans text-muted-foreground font-light mb-10">
            To book using your existing package, please contact us directly and we will
            arrange your appointment.
          </p>
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block font-sans text-xs tracking-[0.2em] uppercase bg-[#1A1A1A] text-[#F7F5F2] px-10 py-4 hover:bg-primary transition-colors duration-300"
          >
            Message us on WhatsApp
          </a>
        </main>
        <Footer />
      </div>
    );
  }

  // Les deux portes d'entrée ("j'ai déjà un forfait" / "je l'enregistre")
  // vivent sur la même page, dans le même onglet — une cliente premium ne
  // devrait jamais avoir à deviner sur quelle page cliquer.
  const showEntryTabs = step === "email" || step === "register";

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <TopBar />
      <Navbar />

      <main className="max-w-xl mx-auto px-6 py-28 md:py-36">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <p className="font-sans text-[11px] tracking-[0.25em] uppercase text-primary mb-4">
            My Package
          </p>
          <h1 className="font-serif text-3xl md:text-4xl text-[#1A1A1A] font-light mb-10">
            {step === "register" || step === "register-submitted"
              ? "Register your package"
              : "Book a session with your package"}
          </h1>

          {showEntryTabs && (
            <div className="flex border-b border-border mb-8">
              <button
                type="button"
                onClick={() => { setError(""); setStep("email"); }}
                className={`flex-1 font-sans text-xs tracking-[0.15em] uppercase py-3 border-b-2 -mb-px transition-colors ${
                  step === "email" ? "border-primary text-[#1A1A1A]" : "border-transparent text-muted-foreground hover:text-primary"
                }`}
              >
                I have a package
              </button>
              <button
                type="button"
                onClick={() => { setError(""); setStep("register"); }}
                className={`flex-1 font-sans text-xs tracking-[0.15em] uppercase py-3 border-b-2 -mb-px transition-colors ${
                  step === "register" ? "border-primary text-[#1A1A1A]" : "border-transparent text-muted-foreground hover:text-primary"
                }`}
              >
                Register my package
              </button>
            </div>
          )}

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 text-sm text-red-700">
              {error}
            </div>
          )}

          {step === "loading" && (
            <p className="font-sans text-sm text-muted-foreground font-light">Loading your account…</p>
          )}

          {step === "email" && (
            <form onSubmit={handleRequestCode} className="space-y-6">
              <p className="font-sans text-sm text-muted-foreground font-light">
                Enter the email address you used when you purchased your package.
              </p>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full bg-transparent border-b border-border py-3 focus:outline-none focus:border-primary transition-colors font-sans text-sm"
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full font-sans text-xs tracking-[0.2em] uppercase bg-[#1A1A1A] text-[#F7F5F2] px-10 py-4 hover:bg-primary transition-colors duration-300 disabled:opacity-50"
              >
                {loading ? "Sending…" : "Send verification code"}
              </button>
            </form>
          )}

          {step === "register" && (
            <form onSubmit={handleSubmitClaim} className="space-y-6">
              <p className="font-sans text-sm text-muted-foreground font-light">
                If you purchased a package with us before and don't have an email on file yet,
                tell us a little about it and we'll activate your account within 24 hours.
              </p>
              <input
                type="text"
                required
                value={prenom}
                onChange={(e) => setPrenom(e.target.value)}
                placeholder="First name"
                className="w-full bg-transparent border-b border-border py-3 focus:outline-none focus:border-primary transition-colors font-sans text-sm"
              />
              <input
                type="text"
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                placeholder="Last name (optional)"
                className="w-full bg-transparent border-b border-border py-3 focus:outline-none focus:border-primary transition-colors font-sans text-sm"
              />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full bg-transparent border-b border-border py-3 focus:outline-none focus:border-primary transition-colors font-sans text-sm"
              />
              <input
                type="tel"
                value={telephone}
                onChange={(e) => setTelephone(e.target.value)}
                placeholder="Phone (optional)"
                className="w-full bg-transparent border-b border-border py-3 focus:outline-none focus:border-primary transition-colors font-sans text-sm"
              />
              <textarea
                rows={3}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="About your package, e.g. 5-session lymphatic drainage, purchased in July (optional)"
                className="w-full bg-transparent border-b border-border py-3 focus:outline-none focus:border-primary transition-colors font-sans text-sm resize-none"
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full font-sans text-xs tracking-[0.2em] uppercase bg-[#1A1A1A] text-[#F7F5F2] px-10 py-4 hover:bg-primary transition-colors duration-300 disabled:opacity-50"
              >
                {loading ? "Sending…" : "Send request"}
              </button>
            </form>
          )}

          {step === "register-submitted" && (
            <div className="py-6">
              <div className="w-8 h-[1px] bg-primary mb-8" />
              <p className="font-serif text-2xl text-[#1A1A1A] font-light mb-4">Thank you.</p>
              <p className="font-sans text-sm text-muted-foreground font-light">
                We've received your request and will activate your package within 24 hours.
                Come back to this page and use "I have a package" once you hear from us.
              </p>
            </div>
          )}

          {step === "code" && (
            <form onSubmit={handleVerifyCode} className="space-y-6">
              <p className="font-sans text-sm text-muted-foreground font-light">{info}</p>
              <input
                type="text"
                required
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="6-digit code"
                className="w-full bg-transparent border-b border-border py-3 focus:outline-none focus:border-primary transition-colors font-sans text-sm tracking-[0.3em]"
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full font-sans text-xs tracking-[0.2em] uppercase bg-[#1A1A1A] text-[#F7F5F2] px-10 py-4 hover:bg-primary transition-colors duration-300 disabled:opacity-50"
              >
                {loading ? "Verifying…" : "Verify code"}
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={requestNewCode}
                className="w-full font-sans text-xs text-muted-foreground hover:text-primary transition-colors underline disabled:opacity-50"
              >
                Didn't get it, or code not working? Request a new code
              </button>
              <button
                type="button"
                onClick={() => { setError(""); setStep("register"); }}
                className="block w-full text-center font-sans text-xs text-muted-foreground hover:text-primary transition-colors underline"
              >
                Never received anything? Register your package instead
              </button>
            </form>
          )}

          {step === "dashboard" && (
            <div className="space-y-8">
              <div className="space-y-3 font-sans text-sm">
                <div className="flex justify-between border-b border-border pb-3">
                  <span className="text-muted-foreground">Package</span>
                  <span>{packageName}</span>
                </div>
                <div className="flex justify-between border-b border-border pb-3">
                  <span className="text-muted-foreground">Sessions remaining</span>
                  <span>{availableSessions}</span>
                </div>
              </div>

              <div>
                <p className="font-sans text-xs tracking-[0.2em] uppercase text-muted-foreground mb-4">
                  Upcoming appointments
                </p>
                {upcomingBookings.length === 0 ? (
                  <p className="font-sans text-sm text-muted-foreground font-light">
                    No upcoming appointments.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {upcomingBookings.map((b) => (
                      <div key={b.start} className="flex justify-between border border-border px-4 py-3 font-sans text-sm">
                        <span>{serviceLabel(b.serviceId)}</span>
                        <span className="text-muted-foreground">
                          {new Date(b.start).toLocaleString("en-GB", {
                            weekday: "short",
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {activePromoCodes.length > 0 && (
                <div>
                  <p className="font-sans text-xs tracking-[0.2em] uppercase text-muted-foreground mb-4">
                    Active promo codes
                  </p>
                  <div className="space-y-3">
                    {activePromoCodes.map((p) => (
                      <div key={p.code} className="flex justify-between border border-[#BF944A]/40 bg-[#F0EBE1] px-4 py-3 font-sans text-sm">
                        <span className="tracking-widest">{p.code}</span>
                        <span className="text-[#BF944A]">
                          {p.discountType === "percentage" ? `${p.discountValue}% off` : `£${p.discountValue} off`}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button
                disabled={loading}
                onClick={proceedToBooking}
                className="w-full font-sans text-xs tracking-[0.2em] uppercase bg-[#1A1A1A] text-[#F7F5F2] px-10 py-4 hover:bg-primary transition-colors duration-300 disabled:opacity-50"
              >
                {loading ? "Loading…" : "Book a session"}
              </button>

              <button
                onClick={logOut}
                className="w-full font-sans text-[10px] text-muted-foreground hover:text-primary transition-colors underline text-center"
              >
                Not you? Log out of this device
              </button>
            </div>
          )}

          {step === "service" && (
            <div className="space-y-4">
              <p className="font-sans text-sm text-muted-foreground font-light mb-4">
                {packageName} · {availableSessions} session(s) available. Choose your treatment:
              </p>
              {eligibleServices.map((id) => (
                <button
                  key={id}
                  disabled={loading}
                  onClick={() => loadSlots(sessionToken, id)}
                  className="w-full text-left border border-border px-6 py-4 font-sans text-sm hover:border-primary transition-colors disabled:opacity-50"
                >
                  {serviceLabel(id)}
                </button>
              ))}
            </div>
          )}

          {step === "slots" && (
            <div className="space-y-4">
              <p className="font-sans text-sm text-muted-foreground font-light mb-4">
                {packageName} · {availableSessions} session{availableSessions !== 1 ? "s" : ""} remaining · {serviceLabel(serviceId)}
              </p>
              {slots.length === 0 && (
                <p className="font-sans text-sm text-muted-foreground">
                  No slots available at the moment. Please contact us on WhatsApp.
                </p>
              )}
              <div className="grid grid-cols-2 gap-3 max-h-96 overflow-y-auto">
                {slots.map((slot) => (
                  <button
                    key={slot.start}
                    disabled={loading}
                    onClick={() => handleConfirm(slot)}
                    className="border border-border px-4 py-3 font-sans text-xs hover:border-primary transition-colors disabled:opacity-50"
                  >
                    {new Date(slot.start).toLocaleString("en-GB", {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === "confirmed" && (
            <div className="text-center py-10">
              <div className="w-8 h-[1px] bg-primary mx-auto mb-8" />
              <p className="font-serif text-2xl text-[#1A1A1A] mb-3">Booking confirmed.</p>
              <p className="font-sans text-muted-foreground font-light text-sm">
                You will receive a calendar invitation by email with the details of your
                appointment.
              </p>
            </div>
          )}
        </motion.div>
      </main>

      <Footer />
      <WhatsAppButton />
    </div>
  );
}
