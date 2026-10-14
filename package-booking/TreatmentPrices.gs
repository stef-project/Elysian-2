/**
 * ============================================================================
 *  TREATMENTPRICES.gs — Achat en ligne d'une séance unique, sans forfait
 *  (/book-session). Même principe que PackageTemplates.gs + Stripe Checkout
 *  pour l'achat de forfait : le prix est TOUJOURS recalculé côté serveur
 *  depuis Treatment_Prices, jamais fourni par le client. Une séance achetée
 *  ainsi devient, côté données, un forfait d'1 séance (confirmCheckoutSession_,
 *  Stripe.gs, gère les deux cas) — pour réutiliser tel quel tout le système
 *  de réservation déjà construit (/use-package) sans rien dupliquer.
 * ============================================================================
 */

function findTreatmentPriceRow_(serviceId) {
  return findRowBy_(TABS.TREATMENT_PRICES, 'service_id', serviceId);
}

/** Catalogue public des soins à l'unité — lecture seule, sans authentification. Jamais le prix parrainage (révélé seulement si le parrainage est reconnu, côté création de session). */
function listPublicTreatmentPrices_() {
  return readAllRows_(TABS.TREATMENT_PRICES).map((t) => ({
    serviceId: t.service_id,
    label: t.label,
    durationMinutes: Number(t.duration_minutes),
    priceNormal: Number(t.price_normal),
  }));
}

/**
 * Crée l'onglet Treatment_Prices (si besoin, via initializeSheets() — à
 * lancer d'abord une fois depuis l'éditeur) puis le pré-remplit avec les
 * tarifs normal + parrainage de chaque soin. N'écrit QUE si l'onglet est
 * vide (hors en-têtes) — relancer cette fonction après une première
 * initialisation ne duplique jamais les lignes.
 *
 * ⚠️ Une fois initialisé, cet onglet est la seule source de vérité pour ce
 * que /book-session facture réellement — il ne se resynchronise jamais tout
 * seul avec les prix affichés sur le site. Voir PRICING.md à la racine du
 * dépôt pour la liste complète des endroits à tenir à jour ensemble.
 */
function adminInitTreatmentPrices() {
  const ui = ui_();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(TABS.TREATMENT_PRICES);
  if (!sheet) {
    ui.alert('Onglet Treatment_Prices introuvable — lance d\'abord initializeSheets() depuis l\'éditeur (menu Exécuter), puis relance cette commande.');
    return;
  }
  if (sheet.getLastRow() > 1) {
    ui.alert('L\'onglet Treatment_Prices contient déjà des données — rien fait, pour ne pas écraser tes modifications. Édite les tarifs directement dans l\'onglet si besoin.');
    return;
  }

  // service_id alignés sur PACKAGE_SERVICES (src/lib/packageBooking.ts) et
  // contraindicationKey (src/lib/contraindications.ts) — garder synchronisé.
  const rows = [
    ['lymphatic-1z', 'Lymphatic Drainage · 1 Zone', 60, 150, 120],
    ['lymphatic-2z', 'Lymphatic Drainage · 2 Zones', 90, 220, 200],
    ['maderotherapy', 'Maderotherapy', 60, 90, 80],
    ['cavitation', 'Cavitation Fusion', 90, 150, 120],
    ['post-op', 'Post-Op Care', 60, 130, 90],
    ['prenatal', 'Prenatal & Postnatal Massage', 60, 120, 90],
  ];
  rows.forEach((r) => {
    appendRow_(TABS.TREATMENT_PRICES, {
      service_id: r[0], label: r[1], duration_minutes: r[2], price_normal: r[3], price_referred: r[4],
    });
  });
  ui.alert(`${rows.length} soins initialisés dans Treatment_Prices.`);
}

function createSingleSessionCheckoutSession_(serviceId, email, prenom, nom, referredByName) {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (!normalizedEmail || normalizedEmail.indexOf('@') === -1) {
    throw new BookingBusinessError_('Adresse email invalide.');
  }
  if (!String(prenom || '').trim()) {
    throw new BookingBusinessError_('Prénom manquant.');
  }
  enforceCheckoutRateLimit_(normalizedEmail);

  const treatment = findTreatmentPriceRow_(serviceId);
  if (!treatment) {
    throw new BookingBusinessError_('Ce soin n\'est plus disponible à l\'achat en ligne.');
  }

  const referralTag = resolveReferralTag_(referredByName);
  const referredPrice = Number(treatment.price_referred);
  const useReferredPrice = referralTag && !isNaN(referredPrice) && referredPrice > 0;

  const price = useReferredPrice ? referredPrice : Number(treatment.price_normal);
  if (isNaN(price) || price <= 0) {
    throw new BookingBusinessError_('Ce soin n\'a pas de prix valide — contacte-nous directement.');
  }
  const unitAmountPence = Math.round(price * 100);

  const settings = getSettings();
  const baseUrl = String(settings.site_base_url || '').replace(/\/$/, '');

  const session = stripeRequest_('post', '/checkout/sessions', {
    mode: 'payment',
    customer_email: normalizedEmail,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: 'gbp',
          unit_amount: unitAmountPence,
          product_data: { name: treatment.label },
        },
      },
    ],
    success_url: `${baseUrl}/book-session/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}/book-session?cancelled=1`,
    metadata: {
      single_session_service_id: treatment.service_id,
      prenom: String(prenom || '').trim(),
      nom: String(nom || '').trim(),
      referral_tag: referralTag,
      // Cliché au moment du paiement — jamais relu depuis Treatment_Prices à
      // la confirmation, même principe que createCheckoutSession_ (Stripe.gs).
      snapshot_nom: treatment.label,
      snapshot_soins_inclus: treatment.service_id,
    },
  });

  return { checkoutUrl: session.url };
}
