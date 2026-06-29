import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const CONSENT_KEY = "cookie_consent";

export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(CONSENT_KEY);
    if (!stored) {
      const t = setTimeout(() => setVisible(true), 800);
      return () => clearTimeout(t);
    }
  }, []);

  const accept = () => {
    localStorage.setItem(CONSENT_KEY, "accepted");
    setVisible(false);
  };

  const decline = () => {
    localStorage.setItem(CONSENT_KEY, "declined");
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.4 }}
          className="fixed bottom-6 left-6 z-50 max-w-sm bg-[#FEFDFB] border border-border shadow-xl p-6"
          role="dialog"
          aria-label="Cookie consent"
        >
          <div className="w-6 h-[1px] bg-primary mb-4" />
          <h3 className="font-serif text-lg text-[#1A1A1A] mb-2">We Value Your Privacy</h3>
          <p className="font-sans text-xs text-muted-foreground font-light leading-relaxed mb-5">
            We use cookies to ensure you get the best experience on our website.{" "}
            <a href="/cookie-policy" className="text-primary hover:underline">Cookie Policy</a>.
          </p>
          <div className="flex gap-3">
            <button
              onClick={decline}
              data-testid="button-cookie-decline"
              className="font-sans text-[11px] tracking-[0.15em] uppercase text-muted-foreground border border-border px-5 py-2.5 hover:border-foreground transition-colors duration-300"
            >
              Decline
            </button>
            <button
              onClick={accept}
              data-testid="button-cookie-accept"
              className="font-sans text-[11px] tracking-[0.15em] uppercase bg-[#1A1A1A] text-[#F7F5F2] px-5 py-2.5 hover:bg-primary transition-colors duration-300 flex-1"
            >
              Accept
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
