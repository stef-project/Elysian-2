import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import l1Image from "../../assets/l1.webp";

const CORPORATE_CALENDAR = "https://calendar.app.google/Vdgk5XD1apxPp36U6";
const GET_COMPANIES_URL = "https://www.elysian-institute.com/get-companies.php";

export function CorporateModal() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [id, setId] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleVerify = async () => {
    if (!name.trim() || !id.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(GET_COMPANIES_URL);
      const companies: Record<string, string> = await res.json();
      const match = Object.entries(companies).find(
        ([companyName, companyId]) =>
          companyName.toLowerCase() === name.trim().toLowerCase() &&
          companyId === id.trim()
      );
      if (match) {
        setName("");
        setId("");
        setOpen(false);
        window.location.href = CORPORATE_CALENDAR;
      } else {
        setError("Invalid company name or ID");
        setName("");
        setId("");
        setTimeout(() => setError(""), 3000);
      }
    } catch {
      setError("Unable to verify. Please contact us directly.");
      setTimeout(() => setError(""), 3000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Card trigger */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
        className="mt-16"
      >
        <button
          onClick={() => setOpen(true)}
          data-testid="button-corporate-session"
          className="relative group w-full overflow-hidden block text-left"
        >
          <div className="aspect-[21/6] overflow-hidden relative">
            <img
              src={l1Image}
              alt="Corporate Session"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
            />
            <div className="absolute inset-0 bg-[#1A1A1A]/50 group-hover:bg-[#1A1A1A]/60 transition-colors duration-300" />
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
              <p className="font-sans text-[11px] tracking-[0.25em] uppercase text-[#BF944A] mb-3">
                For organisations
              </p>
              <h3 className="font-serif text-3xl md:text-4xl text-[#F7F5F2] font-light">
                Book a Corporate Session
              </h3>
              <p className="font-sans text-sm text-[#F7F5F2]/70 font-light mt-3">
                A curated package for complete renewal. For verified corporate partners.
              </p>
              <span className="mt-6 font-sans text-[11px] tracking-[0.2em] uppercase border border-[#BF944A] text-[#BF944A] px-8 py-3 hover:bg-[#BF944A] hover:text-[#1A1A1A] transition-colors duration-300 inline-block">
                Verify Access →
              </span>
            </div>
          </div>
        </button>
      </motion.div>

      {/* Modal */}
      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 24, scale: 0.97 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="bg-[#FEFDFB] w-full max-w-md p-8"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-8 h-[1px] bg-primary mb-6" />
              <h2 className="font-serif text-2xl text-[#1A1A1A] mb-2">
                Company Verification
              </h2>
              <p className="font-sans text-sm text-muted-foreground font-light mb-8">
                Enter your company name and ID to access the corporate booking calendar.
              </p>

              <div className="space-y-6">
                <div>
                  <label className="block font-sans text-[11px] uppercase tracking-[0.2em] text-foreground/60 mb-3">
                    Company Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    data-testid="input-company-name"
                    placeholder="Your company name"
                    className="w-full bg-transparent border-b border-border py-3 px-0 focus:outline-none focus:border-primary transition-colors font-sans text-foreground placeholder:text-muted-foreground/40 text-sm"
                  />
                </div>
                <div>
                  <label className="block font-sans text-[11px] uppercase tracking-[0.2em] text-foreground/60 mb-3">
                    Company ID
                  </label>
                  <input
                    type="text"
                    value={id}
                    onChange={(e) => setId(e.target.value)}
                    data-testid="input-company-id"
                    placeholder="Your company ID"
                    className="w-full bg-transparent border-b border-border py-3 px-0 focus:outline-none focus:border-primary transition-colors font-sans text-foreground placeholder:text-muted-foreground/40 text-sm"
                    onKeyDown={(e) => e.key === "Enter" && handleVerify()}
                  />
                </div>
              </div>

              {error && (
                <p className="font-sans text-xs text-red-500 mt-4">{error}</p>
              )}

              <div className="flex items-center gap-3 mt-8">
                <button
                  onClick={() => { setOpen(false); setName(""); setId(""); setError(""); }}
                  data-testid="button-corporate-cancel"
                  className="font-sans text-xs tracking-[0.15em] uppercase text-muted-foreground border border-border px-6 py-3 hover:border-foreground transition-colors duration-300"
                >
                  Cancel
                </button>
                <button
                  onClick={handleVerify}
                  disabled={loading || !name.trim() || !id.trim()}
                  data-testid="button-corporate-verify"
                  className="font-sans text-xs tracking-[0.15em] uppercase bg-[#1A1A1A] text-[#F7F5F2] px-6 py-3 hover:bg-primary disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-300 flex-1"
                >
                  {loading ? "Verifying…" : "Continue"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
