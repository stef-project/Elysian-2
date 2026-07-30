/**
 * ============================================================================
 *  SETTINGS.gs — Lecture de l'onglet Settings, avec valeurs par défaut.
 * ============================================================================
 *
 *  ⚠️ Tous les réglages opérationnels vivent dans l'onglet Settings du Sheet,
 *  PAS en dur dans le code. Modifie-les directement dans le Sheet ; aucun
 *  redéploiement du script n'est nécessaire pour un changement de réglage.
 */

const SETTINGS_CACHE_KEY = 'elysian_settings_cache_v1';
const SETTINGS_CACHE_SECONDS = 60; // court : un changement dans le Sheet est pris en compte vite.

/**
 * Renvoie un objet { clé: valeur } à partir de l'onglet Settings, en
 * complétant les clés manquantes avec SETTINGS_DEFAULTS. Les valeurs
 * numériques déclarées comme telles dans SETTINGS_DEFAULTS sont converties
 * en Number ; le reste reste en chaîne.
 */
function getSettings() {
  const cache = CacheService.getScriptCache();
  const cached = cache.get(SETTINGS_CACHE_KEY);
  if (cached) {
    return JSON.parse(cached);
  }

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TABS.SETTINGS);
  const settings = Object.assign({}, SETTINGS_DEFAULTS);

  if (sheet && sheet.getLastRow() > 1) {
    const rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, 2).getValues();
    rows.forEach(([key, value]) => {
      if (!key) return;
      const k = String(key).trim();
      if (Object.prototype.hasOwnProperty.call(SETTINGS_DEFAULTS, k)) {
        const defaultVal = SETTINGS_DEFAULTS[k];
        settings[k] = (typeof defaultVal === 'number') ? Number(value) : String(value);
      }
    });
  }

  if (!settings.calendar_id) {
    throw new Error(
      "Configuration incomplète : 'calendar_id' est vide dans l'onglet Settings. " +
      "Renseigne l'ID du calendrier dédié Elysian avant d'utiliser le système."
    );
  }

  cache.put(SETTINGS_CACHE_KEY, JSON.stringify(settings), SETTINGS_CACHE_SECONDS);
  return settings;
}

/** Renvoie la liste des jours travaillés sous forme de tableau de nombres (1=lundi...7=dimanche). */
function getWorkdaysArray(settings) {
  return String(settings.workdays)
    .split(',')
    .map((d) => parseInt(d.trim(), 10))
    .filter((d) => !isNaN(d));
}

/** À appeler après toute modification manuelle de Settings pour forcer une relecture immédiate. */
function clearSettingsCache() {
  CacheService.getScriptCache().remove(SETTINGS_CACHE_KEY);
}
