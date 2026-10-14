# Pricing — where a price actually lives

There is no single source of truth for prices in this codebase. When a
treatment or package price changes, update **every** place it appears below,
or the site, the booking flows and Stripe will disagree with each other.

## Individual treatment prices (Lymphatic 1/2 Zone, Maderotherapy, Cavitation
## Fusion, Post-Op Care, Prenatal & Postnatal)

Shown on the site, but never read by the server — these are display copy only:

- `src/components/sections/Services.tsx` — the `groups` array (price shown per treatment).
- `src/components/sections/WhatBringsYou.tsx` — the `intents` array (`detail` strings, e.g. `"from £150"`).
- `src/components/sections/FAQ.tsx` — the lymphatic drainage pricing answer.
- `index.html` — the matching JSON-LD `Offer` prices **and** the same FAQ answer text, duplicated for structured data.
- `src/pages/PrenatalPostnatalMassage.tsx` — the dedicated landing page's price line.
- `src/pages/BookChelsea.tsx` — the `TREATMENTS` array (used for deposit/booking at the Chelsea slot).

Actually charged, server-side, for `/book-session` (no package):

- Google Sheet, **`Treatment_Prices`** tab — `price_normal` and `price_referred` columns, one row per `service_id`. This is what `createSingleSessionCheckoutSession_` (`package-booking/TreatmentPrices.gs`) actually charges. The site display copy above does **not** feed this — it's a separate number you set by hand.

## Package prices (5/10-session bundles)

- Google Sheet, **`Package_Templates`** tab — `prix_public` (normal) and `prix_refere` (referred, optional) columns. This is what `/buy-package` actually charges (`createCheckoutSession_`, `package-booking/Stripe.gs`).
- `src/components/sections/Services.tsx` — the Post-Op treatment card's `packageSummary` text (e.g. `"10 sessions · £1200"`) is a hardcoded display string, separate from the Sheet row it describes.

## Checklist for any price change

1. Change the Sheet value(s) first (`Treatment_Prices` and/or `Package_Templates`) — this is what actually gets charged.
2. Grep the repo for the old number (e.g. `grep -rn "£120" src/ index.html`) and update every match from the lists above.
3. If a package's `packageSummary` display string changed, update it in `Services.tsx` too.
4. Re-check `/buy-package` and `/book-session` show the new number before calling it done.
