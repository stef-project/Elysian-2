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
  confirmBooking,
  generateBookingRequestId,
  PACKAGE_SERVICES,
} from "../lib/packageBooking";

type Step = "email" | "code" | "service" | "slots" | "confirmed";

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
  const [bookingRequestId] = useState(generateBookingRequestId());

  // Page de vérification d'identité : jamais indexée, même si l'URL fuite.
  useEffect(() => {
    const tag = document.querySelector('meta[name="robots"]');
    const previous = tag?.getAttribute("content") ?? null;
    tag?.setAttribute("content", "noindex, nofollow");
    return () => {
      if (previous !== null) tag?.setAttribute("content", previous);
    };
  }, []);

  const serviceLabel = (id: string) => PACKAGE_SERVICES.find((s) => s.id === id)?.label ?? id;
  const serviceDuration = (id: string) => PACKAGE_SERVICES.find((s) => s.id === id)?.durationMinutes ?? 60;

  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await requestVerificationCode(email);
      setInfo(res.message);
      setStep("code");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue.");
    } finally {
      setLoading(false);
    }
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
      if (res.eligibleServices.length === 1) {
        setServiceId(res.eligibleServices[0]);
        await loadSlots(res.sessionToken, res.eligibleServices[0]);
      } else {
        setStep("service");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue.");
    } finally {
      setLoading(false);
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
      setError(err instanceof Error ? err.message : "Une erreur est survenue.");
    } finally {
      setLoading(false);
    }
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

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <TopBar />
      <Navbar />

      <main className="max-w-xl mx-auto px-6 py-28 md:py-36">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <p className="font-sans text-[11px] tracking-[0.25em] uppercase text-primary mb-4">
            Existing Package
          </p>
          <h1 className="font-serif text-3xl md:text-4xl text-[#1A1A1A] font-light mb-10">
            Book a session with your package
          </h1>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 text-sm text-red-700">
              {error}
            </div>
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
            </form>
          )}

          {step === "service" && (
            <div className="space-y-4">
              <p className="font-sans text-sm text-muted-foreground font-light mb-4">
                {packageName} — {availableSessions} session(s) available. Choose your treatment:
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
                {packageName} — {availableSessions} session{availableSessions !== 1 ? "s" : ""} remaining · {serviceLabel(serviceId)}
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
