/**
 * ============================================================================
 *  CALENDAR.gs  —  Cherche des créneaux libres dans Google Calendar.
 * ============================================================================
 *
 *  Lit (en lecture seule) ton agenda et renvoie 2–3 créneaux disponibles,
 *  en respectant tes heures d'ouverture, tes jours travaillés et des marges.
 */

/**
 * Renvoie une liste de créneaux libres { start: Date, end: Date }.
 * Maximum = CONFIG.CALENDAR.slotsToPropose.
 */
function findFreeSlots() {
  const c = CONFIG.CALENDAR;
  const cal = (c.calendarId === 'primary')
    ? CalendarApp.getDefaultCalendar()
    : CalendarApp.getCalendarById(c.calendarId);

  if (!cal) throw new Error('Agenda introuvable : ' + c.calendarId);

  const durationMs = c.appointmentMinutes * 60 * 1000;
  const bufferMs = c.bufferMinutes * 60 * 1000;
  const slots = [];

  const now = new Date();

  for (let dayOffset = c.startInDays; dayOffset <= c.lookaheadDays; dayOffset++) {
    if (slots.length >= c.slotsToPropose) break;

    const day = new Date(now);
    day.setDate(day.getDate() + dayOffset);

    // getDay(): 0=dimanche..6=samedi -> on convertit en 1=lundi..7=dimanche.
    const isoDay = day.getDay() === 0 ? 7 : day.getDay();
    if (c.workdays.indexOf(isoDay) === -1) continue;

    const dayStart = new Date(day);
    dayStart.setHours(c.workdayStartHour, 0, 0, 0);
    const dayEnd = new Date(day);
    dayEnd.setHours(c.workdayEndHour, 0, 0, 0);

    // Événements occupés du jour (on ignore ceux marqués "Disponible").
    const events = cal.getEvents(dayStart, dayEnd).filter(function (e) {
      return e.getMyStatus() !== CalendarApp.GuestStatus.NO &&
             !e.isAllDayEvent();
    });

    // Intervalles occupés, avec marge avant/après.
    const busy = events.map(function (e) {
      return {
        start: e.getStartTime().getTime() - bufferMs,
        end: e.getEndTime().getTime() + bufferMs,
      };
    }).sort(function (a, b) { return a.start - b.start; });

    // On balaie la journée par pas de 30 min et on garde le 1er créneau libre.
    const stepMs = 30 * 60 * 1000;
    for (let t = dayStart.getTime(); t + durationMs <= dayEnd.getTime(); t += stepMs) {
      if (slots.length >= c.slotsToPropose) break;

      const slotStart = t;
      const slotEnd = t + durationMs;

      const overlaps = busy.some(function (b) {
        return slotStart < b.end && slotEnd > b.start;
      });

      if (!overlaps) {
        slots.push({ start: new Date(slotStart), end: new Date(slotEnd) });
        // Un seul créneau par jour pour varier les propositions.
        break;
      }
    }
  }

  return slots;
}

/**
 * Formate les créneaux en texte lisible pour le brouillon.
 * Ex : "• Tuesday 1 July, 10:00–11:00"
 */
function formatSlots(slots) {
  const tz = CONFIG.CALENDAR.timezone;
  return slots.map(function (s) {
    const day = Utilities.formatDate(s.start, tz, 'EEEE d MMMM');
    const from = Utilities.formatDate(s.start, tz, 'HH:mm');
    const to = Utilities.formatDate(s.end, tz, 'HH:mm');
    return '• ' + day + ', ' + from + '–' + to;
  }).join('\n');
}
