// Perioodide laiendamine konkreetseteks blokkideks (puhas loogika, testitav).

import { addDays, diffDays, parseYmd, startOfDay, ymd } from "./dates.js";

// Perioodi blokid ----------------------------------------------------------
const MAX_BLOCKS = 800;

function cycleSteps(period) {
  const colors = Array.isArray(period.cycle_colors) ? period.cycle_colors : [];
  const steps = colors
    .filter((c) => c && typeof c.color === "string")
    .map((c) => ({ name: c.name || period.name, color: c.color }));
  if (steps.length === 0) return [{ name: period.name, color: period.color }];
  return steps;
}

/**
 * Laiendab perioodi konkreetseteks blokkideks, mis kattuvad vahemikuga
 * [rangeStart, rangeEnd]. Iga blokk: { period, start, end, name, color, index }.
 * Korduva perioodi puhul on ühe bloki pikkus perioodi enda pikkus ja järjestikused
 * blokid saavad kordamööda tsükli värvid.
 */
export function periodBlocks(period, rangeStart, rangeEnd) {
  const first = parseYmd(period.start_date);
  const last = parseYmd(period.end_date);
  const length = Math.max(1, diffDays(first, last) + 1);
  const from = startOfDay(rangeStart);
  const to = startOfDay(rangeEnd);

  if (!period.repeats) {
    if (last < from || first > to) return [];
    return [{ period, start: first, end: last, name: period.name, color: period.color, index: 0 }];
  }

  const steps = cycleSteps(period);
  const until = period.repeat_until ? parseYmd(period.repeat_until) : addDays(to, length);
  const blocks = [];

  // Alusta esimesest blokist, mis võib vahemikku ulatuda.
  let index = 0;
  if (from > first) index = Math.max(0, Math.floor(diffDays(first, from) / length));

  for (let n = 0; n < MAX_BLOCKS; n += 1, index += 1) {
    const start = addDays(first, index * length);
    if (start > until || start > to) break;
    const end = addDays(start, length - 1);
    if (end >= from) {
      const step = steps[index % steps.length];
      blocks.push({
        period,
        start,
        end: end > until ? until : end,
        name: step.name,
        color: step.color,
        index,
      });
    }
  }
  return blocks;
}

/** Kaardistab kuupäeva (YYYY-MM-DD) -> selle päeva perioodiblokid. */
export function periodsByDay(periods, rangeStart, rangeEnd) {
  const map = new Map();
  for (const period of periods) {
    for (const block of periodBlocks(period, rangeStart, rangeEnd)) {
      let cursor = block.start < startOfDay(rangeStart) ? startOfDay(rangeStart) : block.start;
      const stop = block.end > startOfDay(rangeEnd) ? startOfDay(rangeEnd) : block.end;
      while (cursor <= stop) {
        const key = ymd(cursor);
        if (!map.has(key)) map.set(key, []);
        map.get(key).push(block);
        cursor = addDays(cursor, 1);
      }
    }
  }
  return map;
}
