/**
 * ============================================================================
 *  AVAILABILITY.gs — Calcul des créneaux libres pour un soin donné.
 * ============================================================================
 *
 *  Utilise UNIQUEMENT le calendar_id configuré dans Settings — jamais
 *  CalendarApp.getDefaultCalendar().
 */

/**
 * Pose une heure (éventuellement fractionnaire, ex. 10.5 = 10h30) sur une
 * Date déjà positionnée sur le bon jour — permet à workday_start_hour /
 * workday_end_hour (Settings) d'exprimer une demi-heure sans ajouter de
 * colonne séparée pour les minutes.
 */
function setFractionalHour_(date, fractionalHour) {
  const hours = Math.floor(fractionalHour);
  const minutes = Math.round((fractionalHour - hours) * 60);
  date.setHours(hours, minutes, 0, 0);
  return date;
}

/**
 * Renvoie un tableau de créneaux libres { start, end } (objets Date) pour un
 * soin de durée donnée, sur la fenêtre configurée (lookahead_days), en
 * respectant horaires d'ouverture, jours travaillés et battement.
 *
 * @param {number} durationMinutes - durée du soin (envoyée par le site).
 */
function computeAvailableSlots(durationMinutes) {
  const settings = getSettings();
  const calendar = CalendarApp.getCalendarById(settings.calendar_id);
  if (!calendar) {
    throw new Error("Calendrier introuvable pour l'ID configuré dans Settings.");
  }

  const bufferMs = settings.appointment_buffer_minutes * 60 * 1000;
  const durationMs = durationMinutes * 60 * 1000;
  const workdays = getWorkdaysArray(settings);

  const now = new Date();
  const rangeEnd = new Date(now.getTime() + settings.lookahead_days * 24 * 60 * 60 * 1000);

  // On récupère tous les événements existants une seule fois (perf + cohérence)
  // — c'est CE calendrier connecté qui reste la seule source de vérité anti-
  // chevauchement : inchangé par l'espacement des créneaux ci-dessous.
  const existingEvents = calendar.getEvents(now, rangeEnd);
  const busyIntervals = existingEvents.map((e) => ({
    start: new Date(e.getStartTime().getTime() - bufferMs),
    end: new Date(e.getEndTime().getTime() + bufferMs),
  }));

  const slots = [];
  // Créneaux espacés selon la durée RÉELLE du soin (et non un pas fixe de 30
  // min) : pour un soin de 90 min, ça donne 9h00, 10h30, 12h00... — le rythme
  // qu'une seule praticienne peut réellement tenir, au lieu d'options quasi
  // identiques toutes les 30 min qui ne feraient que se chevaucher entre elles.
  // Chaque jour recommence à workday_start_hour (jamais un décalage continu
  // depuis "maintenant") pour que les mêmes horaires reviennent chaque jour,
  // quelle que soit l'heure à laquelle la page est consultée.
  const dayCursor = new Date(now);
  dayCursor.setHours(0, 0, 0, 0);
  while (dayCursor < rangeEnd) {
    const isoWeekday = ((dayCursor.getDay() + 6) % 7) + 1; // JS: 0=dimanche -> ISO: 7=dimanche
    if (workdays.indexOf(isoWeekday) !== -1) {
      const dayClose = setFractionalHour_(new Date(dayCursor), Number(settings.workday_end_hour));
      let slotStart = setFractionalHour_(new Date(dayCursor), Number(settings.workday_start_hour));

      while (slotStart.getTime() + durationMs <= dayClose.getTime()) {
        const slotEnd = new Date(slotStart.getTime() + durationMs);
        if (slotStart > now) {
          const overlaps = busyIntervals.some((b) => slotStart < b.end && slotEnd > b.start);
          if (!overlaps) {
            slots.push({ start: slotStart.toISOString(), end: slotEnd.toISOString() });
          }
        }
        slotStart = new Date(slotStart.getTime() + durationMs);
      }
    }
    dayCursor.setDate(dayCursor.getDate() + 1);
  }

  return slots;
}

/**
 * Vérifie qu'un créneau précis est TOUJOURS libre à l'instant présent
 * (appelée juste avant la création de l'événement, sous verrou — voir
 * Booking.gs). Ne fait pas confiance à la liste affichée plus tôt au client.
 */
function isSlotStillFree(startIso, endIso) {
  const settings = getSettings();
  const calendar = CalendarApp.getCalendarById(settings.calendar_id);
  const bufferMs = settings.appointment_buffer_minutes * 60 * 1000;

  const start = new Date(new Date(startIso).getTime() - bufferMs);
  const end = new Date(new Date(endIso).getTime() + bufferMs);

  const events = calendar.getEvents(start, end);
  return events.length === 0;
}
