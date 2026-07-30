/**
 * ============================================================================
 *  AVAILABILITY.gs — Calcul des créneaux libres pour un soin donné.
 * ============================================================================
 *
 *  Utilise UNIQUEMENT le calendar_id configuré dans Settings — jamais
 *  CalendarApp.getDefaultCalendar().
 */

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
  const rangeStart = new Date(now.getTime());
  const rangeEnd = new Date(now.getTime() + settings.lookahead_days * 24 * 60 * 60 * 1000);

  // On récupère tous les événements existants une seule fois (perf + cohérence).
  const existingEvents = calendar.getEvents(rangeStart, rangeEnd);
  const busyIntervals = existingEvents.map((e) => ({
    start: new Date(e.getStartTime().getTime() - bufferMs),
    end: new Date(e.getEndTime().getTime() + bufferMs),
  }));

  const slots = [];
  const cursor = new Date(rangeStart);
  cursor.setMinutes(0, 0, 0);
  // On avance d'heure en heure, en ne gardant que les créneaux qui tombent
  // dans les horaires d'ouverture d'un jour travaillé.
  while (cursor < rangeEnd) {
    const isoWeekday = ((cursor.getDay() + 6) % 7) + 1; // JS: 0=dimanche -> ISO: 7=dimanche
    const hour = cursor.getHours();

    if (
      workdays.indexOf(isoWeekday) !== -1 &&
      hour >= settings.workday_start_hour &&
      hour < settings.workday_end_hour &&
      cursor > now
    ) {
      const slotStart = new Date(cursor);
      const slotEnd = new Date(cursor.getTime() + durationMs);

      // Le créneau doit se terminer avant la fermeture.
      const closingTime = new Date(cursor);
      closingTime.setHours(settings.workday_end_hour, 0, 0, 0);

      if (slotEnd <= closingTime) {
        const overlaps = busyIntervals.some(
          (b) => slotStart < b.end && slotEnd > b.start
        );
        if (!overlaps) {
          slots.push({ start: slotStart.toISOString(), end: slotEnd.toISOString() });
        }
      }
    }

    cursor.setMinutes(cursor.getMinutes() + 30); // granularité des créneaux proposés : 30 min
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
