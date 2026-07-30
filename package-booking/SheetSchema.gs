/**
 * ============================================================================
 *  SHEETSCHEMA.gs — Création des onglets et de leurs en-têtes.
 *  À exécuter UNE SEULE FOIS, manuellement, à la mise en place (voir README).
 * ============================================================================
 */

/**
 * Crée tous les onglets nécessaires s'ils n'existent pas déjà, avec leurs
 * en-têtes de colonnes. Ne touche jamais à un onglet déjà existant (pas de
 * suppression, pas d'écrasement des données). Pré-remplit l'onglet Settings
 * avec les valeurs par défaut la première fois seulement.
 *
 * Fonction à lancer manuellement depuis l'éditeur Apps Script (menu déroulant
 * des fonctions → initializeSheets → ▶️ Exécuter), une seule fois.
 */
function initializeSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let created = [];

  Object.keys(HEADERS).forEach((tabName) => {
    let sheet = ss.getSheetByName(tabName);
    if (!sheet) {
      sheet = ss.insertSheet(tabName);
      const headers = HEADERS[tabName];
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.setFrozenRows(1);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
      created.push(tabName);
    }
  });

  // Pré-remplissage de Settings avec les valeurs par défaut (une seule fois).
  const settingsSheet = ss.getSheetByName(TABS.SETTINGS);
  if (settingsSheet.getLastRow() <= 1) {
    const rows = Object.keys(SETTINGS_DEFAULTS).map((key) => [
      key,
      SETTINGS_DEFAULTS[key],
      '',
    ]);
    if (rows.length > 0) {
      settingsSheet.getRange(2, 1, rows.length, 3).setValues(rows);
    }
  }

  // Supprime l'onglet "Feuille 1" / "Sheet1" par défaut s'il est vide et seul reste.
  const defaultSheet = ss.getSheetByName('Sheet1') || ss.getSheetByName('Feuille 1');
  if (defaultSheet && defaultSheet.getLastRow() === 0 && ss.getSheets().length > 1) {
    ss.deleteSheet(defaultSheet);
  }

  const message = created.length > 0
    ? `Onglets créés : ${created.join(', ')}.\n\n⚠️ N'oublie pas de renseigner calendar_id dans l'onglet Settings avant tout test.`
    : 'Tous les onglets existent déjà — rien créé.';

  Logger.log(message);
  try {
    SpreadsheetApp.getUi().alert(message);
  } catch (e) {
    // getUi() indisponible en exécution depuis l'éditeur sans interface — pas grave, le Logger suffit.
  }
}
