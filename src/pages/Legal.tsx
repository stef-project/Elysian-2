import { useEffect } from "react";
import { TopBar } from "../components/layout/TopBar";
import { Navbar } from "../components/layout/Navbar";
import { Footer } from "../components/layout/Footer";
import {
  EMAIL,
  ADDRESS,
  COMPANY_LEGAL_NAME,
  COMPANY_NUMBER,
  COMPANY_JURISDICTION,
  COMPANY_REGISTERED_OFFICE,
} from "../lib/booking";

// NOTE (interne) : contenu rédigé comme base raisonnable et conforme à l'esprit
// du UK GDPR et des Trading Disclosures Regulations 2015. Fais-le relire par
// un professionnel avant toute évolution substantielle.

const LAST_UPDATED = "July 2026";

export default function Legal() {
  // Défile vers la section visée (#privacy / #terms / #cookies) à l'arrivée.
  useEffect(() => {
    const id = window.location.hash.replace("#", "");
    if (id) {
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      window.scrollTo(0, 0);
    }
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <TopBar />
      <Navbar />

      <main className="max-w-3xl mx-auto px-6 py-20 md:py-28">
        <p className="font-sans text-[11px] tracking-[0.25em] uppercase text-primary mb-4">
          Legal
        </p>
        <h1 className="font-serif text-4xl md:text-5xl text-[#1A1A1A] font-light mb-3">
          Policies
        </h1>
        <p className="font-sans text-sm text-muted-foreground font-light mb-14">
          Last updated: {LAST_UPDATED}
        </p>

        {/* COMPANY INFORMATION */}
        <section id="company" className="mb-16 scroll-mt-28">
          <h2 className="font-serif text-2xl text-[#1A1A1A] mb-5">Company Information</h2>
          <div className="space-y-4 font-sans text-sm text-muted-foreground font-light leading-[1.9]">
            <p>
              &ldquo;Elysian Paris&rdquo; is the trading name of{" "}
              <strong className="text-foreground">{COMPANY_LEGAL_NAME}</strong>, a company
              registered in {COMPANY_JURISDICTION} under company number{" "}
              <strong className="text-foreground">{COMPANY_NUMBER}</strong>.
            </p>
            <p>
              <strong className="text-foreground">Registered office:</strong>{" "}
              {COMPANY_REGISTERED_OFFICE}.
            </p>
            <p>
              <strong className="text-foreground">Trading address:</strong> {ADDRESS}.
            </p>
            <p>
              <strong className="text-foreground">Contact:</strong>{" "}
              <a href={`mailto:${EMAIL}`} className="text-primary hover:underline">{EMAIL}</a>.
            </p>
          </div>
        </section>

        {/* PRIVACY POLICY */}
        <section id="privacy" className="mb-16 scroll-mt-28">
          <h2 className="font-serif text-2xl text-[#1A1A1A] mb-5">Privacy Policy</h2>
          <div className="space-y-4 font-sans text-sm text-muted-foreground font-light leading-[1.9]">
            <p>
              Elysian Paris (&ldquo;we&rdquo;, &ldquo;us&rdquo;) is committed to protecting your
              privacy. This policy explains what personal data we collect when you use our
              website or contact us, and how we use it, in line with UK GDPR and the Data
              Protection Act 2018.
            </p>
            <p>
              <strong className="text-foreground">What we collect.</strong> When you submit an
              enquiry, book a treatment or contact us by email or WhatsApp, we collect the
              information you provide — typically your name, email address, the treatment you
              are interested in, and any message or health context you choose to share.
            </p>
            <p>
              <strong className="text-foreground">How we use it.</strong> We use this
              information solely to respond to your enquiry, arrange and deliver your
              treatment, and keep necessary records. Our lawful bases are your consent and the
              performance of a service you have requested. Where you share health-related
              details, we treat them as special category data and use them only to provide
              your care safely.
            </p>
            <p>
              <strong className="text-foreground">Who we share it with.</strong> We do not sell
              your data. We use trusted services to run our business: Google Calendar for
              appointment scheduling, and Meta&rsquo;s WhatsApp where you choose to message us.
              Your data is processed by these providers under their own terms.
            </p>
            <p>
              <strong className="text-foreground">Retention.</strong> We keep enquiry and
              treatment records only as long as necessary for our legitimate business and
              legal obligations, after which they are securely deleted.
            </p>
            <p>
              <strong className="text-foreground">Your rights.</strong> You have the right to
              access, correct, delete or restrict the use of your personal data, and to
              withdraw consent at any time. To exercise these rights, email us at{" "}
              <a href={`mailto:${EMAIL}`} className="text-primary hover:underline">{EMAIL}</a>.
              You may also complain to the UK Information Commissioner&rsquo;s Office (ico.org.uk).
            </p>
            <p>
              <strong className="text-foreground">Contact.</strong> {COMPANY_LEGAL_NAME}, trading
              as Elysian Paris, {ADDRESS}. Email:{" "}
              <a href={`mailto:${EMAIL}`} className="text-primary hover:underline">{EMAIL}</a>.
            </p>
          </div>
        </section>

        {/* TERMS OF SERVICE */}
        <section id="terms" className="mb-16 scroll-mt-28">
          <h2 className="font-serif text-2xl text-[#1A1A1A] mb-5">Terms of Service</h2>
          <div className="space-y-4 font-sans text-sm text-muted-foreground font-light leading-[1.9]">
            <p>
              These terms govern your use of the Elysian Paris website and the booking of
              treatments. By making an appointment, you agree to them.
            </p>
            <p>
              <strong className="text-foreground">Appointments.</strong> Treatments are by
              appointment only. Bookings are confirmed once scheduled in our online diary.
              Please arrive on time; late arrivals may result in a shortened session.
            </p>
            <p>
              <strong className="text-foreground">Cancellations &amp; rescheduling.</strong> We
              kindly ask for at least <strong className="text-foreground">24 hours&rsquo; notice</strong>{" "}
              to cancel or reschedule an appointment. Cancellations made with{" "}
              <strong className="text-foreground">less than 24 hours&rsquo; notice</strong> are charged
              at <strong className="text-foreground">50% of the treatment price</strong>. Missed
              appointments (&ldquo;no-shows&rdquo;) are{" "}
              <strong className="text-foreground">non-refundable</strong> and charged in full. Any
              deposit paid is applied towards these charges.
            </p>
            <p>
              <strong className="text-foreground">Right to cancel (distance contracts).</strong>{" "}
              Under the Consumer Contracts (Information, Cancellation and Additional Charges)
              Regulations 2013, the standard 14-day right to cancel does not apply to contracts
              for services performed on a specific date, such as a booked treatment appointment
              (regulation 28(1)(b)). Our appointment-specific cancellation terms above apply instead.
            </p>
            <p>
              <strong className="text-foreground">Health &amp; suitability.</strong> Manual
              lymphatic drainage and body treatments are not suitable for everyone. Please
              disclose relevant medical conditions, recent surgery or pregnancy so we can
              advise you and adapt or decline a treatment where appropriate. Our treatments do
              not replace medical advice.
            </p>
            <p>
              <strong className="text-foreground">Pricing.</strong> Prices shown on the website
              are current at the time of publication and may change. The price confirmed at
              booking applies.
            </p>
          </div>
        </section>

        {/* COOKIE POLICY */}
        <section id="cookies" className="scroll-mt-28">
          <h2 className="font-serif text-2xl text-[#1A1A1A] mb-5">Cookie Policy</h2>
          <div className="space-y-4 font-sans text-sm text-muted-foreground font-light leading-[1.9]">
            <p>
              We keep cookies to a minimum. This website does not use advertising or
              third-party tracking cookies.
            </p>
            <p>
              <strong className="text-foreground">Essential storage.</strong> We store your
              cookie-banner choice in your browser&rsquo;s local storage so we do not ask you
              again on every visit. This stays on your device and is not shared.
            </p>
            <p>
              <strong className="text-foreground">Fonts.</strong> Our typefaces are hosted on our
              own server, not Google&rsquo;s, so no font request is sent to a third party. You can
              clear this site&rsquo;s storage at any time in your browser settings.
            </p>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
