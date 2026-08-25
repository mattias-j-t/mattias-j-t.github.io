// Väikesed kuupäevaabilised. Kõik arvutused käivad brauseri kohalikus ajas.

export const WEEKDAYS = ["E", "T", "K", "N", "R", "L", "P"];
export const MONTHS = [
  "jaanuar", "veebruar", "märts", "aprill", "mai", "juuni",
  "juuli", "august", "september", "oktoober", "november", "detsember",
];

const MS_DAY = 86400000;

export function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function endOfDay(date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

export function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function addMonths(date, months) {
  const d = new Date(date);
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + months);
  d.setDate(Math.min(day, daysInMonth(d)));
  return d;
}

export function daysInMonth(date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

// Nädal algab esmaspäevast.
export function startOfWeek(date) {
  const d = startOfDay(date);
  const shift = (d.getDay() + 6) % 7;
  return addDays(d, -shift);
}

export function startOfMonth(date) {
  const d = startOfDay(date);
  d.setDate(1);
  return d;
}

export function endOfMonth(date) {
  return endOfDay(new Date(date.getFullYear(), date.getMonth() + 1, 0));
}

export function ymd(date) {
  const d = new Date(date);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export function parseYmd(value) {
  const [y, m, d] = String(value).split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function sameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function isToday(date) {
  return sameDay(date, new Date());
}

export function diffDays(from, to) {
  return Math.round((startOfDay(to) - startOfDay(from)) / MS_DAY);
}

export function hhmm(date) {
  const d = new Date(date);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

// <input type="datetime-local"> väärtus kohalikus ajas.
export function toLocalInput(date) {
  return `${ymd(date)}T${hhmm(date)}`;
}

export function fromLocalInput(value) {
  const [datePart, timePart = "00:00"] = String(value).split("T");
  const [y, m, d] = datePart.split("-").map(Number);
  const [hh, mm] = timePart.split(":").map(Number);
  return new Date(y, m - 1, d, hh, mm, 0, 0);
}

export function formatMonthTitle(date) {
  return `${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

export function formatDayLong(date) {
  return `${date.getDate()}. ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

export function formatDateShort(date) {
  return `${date.getDate()}.${date.getMonth() + 1}.`;
}

export function formatRange(startDate, endDate) {
  const a = startDate instanceof Date ? startDate : parseYmd(startDate);
  const b = endDate instanceof Date ? endDate : parseYmd(endDate);
  if (sameDay(a, b)) return formatDayLong(a);
  const sameYear = a.getFullYear() === b.getFullYear();
  const left = sameYear ? `${a.getDate()}. ${MONTHS[a.getMonth()]}` : formatDayLong(a);
  return `${left} – ${formatDayLong(b)}`;
}

// Kuuvaate ruudustik: alati täisnädalad, mis katavad kogu kuu.
export function monthGridDays(date) {
  const first = startOfWeek(startOfMonth(date));
  const last = endOfMonth(date);
  const days = [];
  let cursor = first;
  while (cursor <= last || days.length % 7 !== 0) {
    days.push(cursor);
    cursor = addDays(cursor, 1);
    if (days.length > 42) break;
  }
  return days;
}

export function weekDays(date) {
  const start = startOfWeek(date);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}
