// ─────────────────────────────────────────────────────────────────────────
//  Contre-indications par soin — contenu fourni par l'administratrice,
//  affiché avant toute réservation (nouvelle page /health-check, ainsi que
//  /book-chelsea et /use-package qui l'affichent en ligne). Texte reproduit
//  tel quel, jamais reformulé — contenu médical, pas une simple copie
//  marketing.
// ─────────────────────────────────────────────────────────────────────────

export type ContraindicationBlock = {
  title: string;
  doNotBookIf: string[];
  speakToUsFirst: string[];
  notes?: string[];
};

export const ALL_TREATMENTS_NOTICE =
  "Do not attend with a fever, an infection or flu-like symptoms. Tell us before booking if you take blood thinners, are being treated for cancer, are pregnant, or have had surgery in the last 6 months. Signs of a blood clot — swelling, heat or pain in one leg, chest pain, breathlessness — call 111 or A&E, do not book. We do not treat under 18s. These are beauty and wellbeing treatments, not medical treatment.";

export const CONTRAINDICATIONS: Record<string, ContraindicationBlock[]> = {
  "lymphatic-drainage": [
    {
      title: "Manual Lymphatic Drainage",
      doNotBookIf: [
        "An infection now — cellulitis, erysipelas, an infected wound, fever",
        "A blood clot now or in the last 6 months (DVT, thrombophlebitis, pulmonary embolism)",
        "Heart failure or an unstable heart condition",
        "Kidney failure or dialysis",
        "An active untreated cancer, or symptoms under investigation",
        "Bleeding that has not stopped, or an open wound in the area",
      ],
      speakToUsFirst: [
        "Cancer treatment or remission — written oncologist approval required",
        "Pregnancy — book the prenatal treatment instead",
        "Thyroid condition — we will not work on the neck",
        "Low blood pressure, or you are over 70",
        "Asthma, autoimmune flare-up, uncontrolled diabetes",
        "Surgery in the last 6 weeks",
      ],
    },
  ],
  maderotherapy: [
    {
      title: "Maderotherapy",
      doNotBookIf: [
        "Pregnancy",
        "Varicose veins, thrombosis or a history of blood clots in the area",
        "A bleeding disorder, or blood thinners (warfarin, apixaban, rivaroxaban, clopidogrel)",
        "Active cancer",
        "A hernia in the area",
        "Broken or infected skin, sunburn, eczema or psoriasis flare, tattoo under 6 weeks old",
        "Surgery in that area in the last 6 months",
        "Severe osteoporosis",
      ],
      speakToUsFirst: [
        "You bruise easily or have a low pain threshold",
        "Diabetes with nerve damage or reduced sensation",
        "High blood pressure",
        "Coil (IUD) — we avoid the lower abdomen",
        "Implants or fillers in or near the area",
        "Period in progress — we can skip the abdomen",
      ],
      notes: ["Expect tenderness and possible light bruising for 24–48 hours."],
    },
  ],
  "post-op": [
    {
      title: "Post-Operative Lymphatic Drainage",
      doNotBookIf: [
        "You do not yet have written surgeon clearance, stating your surgery date and that drainage may start (bring it to your first session)",
        "You have a fever, or the wound is red, hot, weeping or has an odour — call your surgeon the same day",
        "An incision has opened, or the skin is darkening to purple or black — urgent",
        "You have a seroma or haematoma your surgeon has not assessed",
        "Your drains are still in and your surgeon has not authorised sessions",
        "Calf swelling or pain on one side, chest pain, breathlessness — call 999",
      ],
      speakToUsFirst: [],
      notes: [
        "BBL: no pressure on the buttocks and no lying on them, normally 6–8 weeks.",
        "Tummy tuck / liposuction: sessions usually start 48–72 hours after surgeon clearance.",
        "Blood thinners, diabetes or smoking — gentler protocol.",
        "Bring and wear your compression garment.",
        "No cavitation, radiofrequency or maderotherapy over an operated area for at least 3 months, and never without surgeon approval.",
      ],
    },
  ],
  prenatal: [
    {
      title: "Prenatal",
      doNotBookIf: [
        "You are under 12 weeks pregnant",
        "Your pregnancy has been classed as high risk",
        "Pre-eclampsia, pregnancy-related high blood pressure, or protein in your urine",
        "Any bleeding, leaking waters, or regular contractions",
        "Placenta praevia or placental abruption",
        "Short cervix or a cervical stitch",
        "A blood clot now or during this pregnancy",
        "Uncontrolled gestational diabetes",
        "Fever or infection",
      ],
      speakToUsFirst: [
        "Twins or more, or past 36 weeks — midwife or GP note required",
        "Swelling or pain in one leg — we will not treat, contact your midwife the same day",
        "Previous premature birth or late miscarriage",
      ],
      notes: [
        "Side-lying from 20 weeks, never flat on your back. No sauna, steam, hot stones, heated bed or wraps. No essential oils. No deep pressure on abdomen, lower back or calves.",
      ],
    },
  ],
  postnatal: [
    {
      title: "Postnatal",
      doNotBookIf: [
        "You are earlier than 6 weeks after a vaginal birth, 8 weeks after a caesarean, or before your postnatal check",
        "Fever, or your caesarean scar or perineal stitches are red, painful, open or leaking",
        "Heavy bleeding, or bleeding that has returned after stopping",
        "Headaches, vision changes or sudden swelling — pre-eclampsia can appear up to 6 weeks after birth, contact your GP urgently",
        "Signs of a blood clot",
        "Mastitis with fever, or feeling generally unwell",
        "Uncontrolled high blood pressure",
      ],
      speakToUsFirst: [
        "Caesarean — GP or midwife sign-off; scar work only from 12 weeks and once fully closed",
        "Abdominal separation — no deep abdominal work until assessed",
        "Breastfeeding — we avoid the breast area",
        "Anaemia or heavy blood loss at birth — shorter, gentler session",
      ],
    },
  ],
  cavitation: [
    {
      title: "Ultrasonic Cavitation",
      doNotBookIf: [
        "Pregnancy or breastfeeding",
        "A pacemaker, defibrillator, insulin pump or any electronic implant",
        "A metal implant, plate, pin or prosthesis in the area",
        "Liver disease or kidney disease",
        "Uncontrolled high cholesterol or triglycerides",
        "Active cancer, or cancer in the last 5 years without oncologist approval",
        "A bleeding disorder or blood thinners",
        "Epilepsy",
        "Thrombosis or significant varicose veins in the area",
        "Infected or broken skin, or a skin condition flaring in the area",
        "An abdominal or umbilical hernia (for stomach treatment)",
      ],
      speakToUsFirst: [
        "Diabetes, uncontrolled high blood pressure, severe osteoporosis",
        "Coil (IUD) — we avoid the lower abdomen",
        "Surgery or liposuction in the area in the last 6 months",
        "Fillers in or near the area",
        "Period in progress (stomach)",
        "Immune-suppressing medication",
      ],
      notes: [
        "Never treated: eyes, throat and thyroid, over the heart, kidneys and spine, breasts, genitals, directly over bone.",
        "Before and after: 2 litres of water a day, no alcohol for 48 hours, low-fat meals for 24–48 hours.",
      ],
    },
  ],
};

// Un même lien de réservation ("Prenatal & Postnatal Massage") couvre les
// deux étapes — on montre les deux blocs, la cliente reconnaît la sienne.
CONTRAINDICATIONS["prenatal-postnatal"] = [
  ...CONTRAINDICATIONS.prenatal,
  ...CONTRAINDICATIONS.postnatal,
];

// Construit le lien vers l'étape de vérification santé (/health-check),
// utilisé par tous les boutons "Reserve"/"Book Now" qui pointent vers un
// calendrier externe (Google Calendar) — jamais un lien direct vers ce
// calendrier, pour toujours passer par cette étape d'abord.
export const buildHealthCheckUrl = (treatmentKey: string, nextUrl: string) =>
  `/health-check?service=${encodeURIComponent(treatmentKey)}&next=${encodeURIComponent(nextUrl)}`;

// Correspondance entre les ids de soin utilisés dans les réservations
// (PACKAGE_SERVICES, packageBooking.ts) et les clés de contre-indications
// ci-dessus — pas toujours identiques (ex. les deux zones de drainage
// lymphatique partagent le même bloc de contre-indications).
export const SERVICE_ID_TO_CONTRAINDICATION_KEY: Record<string, string> = {
  "lymphatic-1z": "lymphatic-drainage",
  "lymphatic-2z": "lymphatic-drainage",
  maderotherapy: "maderotherapy",
  "post-op": "post-op",
  prenatal: "prenatal-postnatal",
  cavitation: "cavitation",
};

export const TREATMENT_LABELS: Record<string, string> = {
  "lymphatic-drainage": "Lymphatic Drainage",
  maderotherapy: "Maderotherapy",
  "post-op": "Post-Op Care",
  "prenatal-postnatal": "Prenatal & Postnatal Massage",
  prenatal: "Prenatal Massage",
  postnatal: "Postnatal Massage",
  cavitation: "Cavitation Fusion",
};
