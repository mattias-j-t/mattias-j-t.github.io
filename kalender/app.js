// Kalendri rakenduse loogika: autentimine, vaated ja dialoogid.

import * as api from "./data.js";
import {
  WEEKDAYS, addDays, addMonths, diffDays, endOfDay, formatDayLong,
  formatMonthTitle, formatRange, fromLocalInput, hhmm, isToday, monthGridDays,
  parseYmd, sameDay, startOfDay, startOfWeek, toLocalInput, weekDays, ymd,
} from "./dates.js";

const PALETTE = [
  "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6",
  "#ec4899", "#14b8a6", "#6366f1", "#84cc16", "#64748b",
];

const state = {
  user: null,
  view: "month",
  cursor: startOfDay(new Date()),
  events: [],
  periods: [],
  selection: null, // { from: Date, to: Date }
};

const $ = (id) => document.getElementById(id);
const el = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
};

// Abifunktsioonid -----------------------------------------------------------
function toast(text) {
  const node = $("toast");
  node.textContent = text;
  node.classList.remove("hidden");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => node.classList.add("hidden"), 2600);
}

function showMessage(node, text, ok = false) {
  node.textContent = text;
  node.classList.toggle("ok", ok);
  node.classList.toggle("hidden", !text);
}

function authErrorText(error) {
  const raw = String(error?.message ?? error ?? "");
  if (/Invalid login credentials/i.test(raw)) return "Vale e-post või parool.";
  if (/Email not confirmed/i.test(raw)) return "E-post on kinnitamata. Vaata postkasti kinnituskirja.";
  if (/User already registered/i.test(raw)) return "Selle e-postiga konto on juba olemas.";
  if (/Password should be at least/i.test(raw)) return "Parool on liiga lühike (vähemalt 8 tähemärki).";
  if (/rate limit|too many/i.test(raw)) return "Liiga palju katseid. Proovi hetke pärast uuesti.";
  if (/Failed to fetch|NetworkError/i.test(raw)) return "Serveriga ei õnnestunud ühendust saada.";
  return raw || "Midagi läks valesti.";
}

function contrastText(hex) {
  const value = String(hex).replace("#", "");
  if (value.length !== 6) return "#1f2933";
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(value.slice(i, i + 2), 16));
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.62 ? "#1f2933" : "#ffffff";
}

function tint(hex, alpha = 0.22) {
  const value = String(hex).replace("#", "");
  if (value.length !== 6) return hex;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(value.slice(i, i + 2), 16));
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function buildSwatches(container, input) {
  container.replaceChildren();
  for (const color of PALETTE) {
    const button = el("button", "swatch");
    button.type = "button";
    button.style.background = color;
    button.title = color;
    button.addEventListener("click", () => {
      input.value = color;
      markActiveSwatch(container, color);
    });
    container.append(button);
  }
  markActiveSwatch(container, input.value);
}

function markActiveSwatch(container, color) {
  for (const button of container.querySelectorAll(".swatch")) {
    button.classList.toggle("active", button.title.toLowerCase() === String(color).toLowerCase());
  }
}

// Vaate vahemik -------------------------------------------------------------
function visibleRange() {
  if (state.view === "month") {
    const days = monthGridDays(state.cursor);
    return { start: startOfDay(days[0]), end: endOfDay(days[days.length - 1]) };
  }
  if (state.view === "week") {
    const days = weekDays(state.cursor);
    return { start: startOfDay(days[0]), end: endOfDay(days[6]) };
  }
  return { start: startOfDay(state.cursor), end: endOfDay(addDays(state.cursor, 41)) };
}

function rangeTitle() {
  if (state.view === "month") return formatMonthTitle(state.cursor);
  if (state.view === "week") {
    const days = weekDays(state.cursor);
    return formatRange(days[0], days[6]);
  }
  return `${formatDayLong(state.cursor)} →`;
}

// Andmete laadimine ---------------------------------------------------------
let loadToken = 0;
async function reload() {
  const token = ++loadToken;
  const { start, end } = visibleRange();
  try {
    const [events, periods] = await Promise.all([
      api.fetchEvents(addDays(start, -1), addDays(end, 1)),
      api.fetchPeriods(),
    ]);
    if (token !== loadToken) return;
    state.events = events;
    state.periods = periods;
    render();
  } catch (error) {
    toast(`Andmete laadimine ebaõnnestus: ${authErrorText(error)}`);
  }
}

// Sündmuste jaotus päevade kaupa -------------------------------------------
function eventsForDay(day) {
  const from = startOfDay(day);
  const to = endOfDay(day);
  return state.events
    .filter((event) => new Date(event.starts_at) <= to && new Date(event.ends_at) >= from)
    .sort((a, b) => {
      if (a.all_day !== b.all_day) return a.all_day ? -1 : 1;
      return new Date(a.starts_at) - new Date(b.starts_at);
    });
}

function eventChip(event) {
  const chip = el("div", "chip");
  if (event.all_day) {
    chip.classList.add("filled");
    chip.style.background = event.color;
    chip.style.color = contrastText(event.color);
  } else {
    const dot = el("span", "dot");
    dot.style.background = event.color;
    chip.append(dot, el("time", null, hhmm(new Date(event.starts_at))));
  }
  chip.append(el("span", null, event.title));
  chip.title = event.title;
  chip.addEventListener("click", (e) => {
    e.stopPropagation();
    openEventDialog(event);
  });
  return chip;
}

// Kuuvaade ------------------------------------------------------------------
function renderMonth(container) {
  const days = monthGridDays(state.cursor);
  const { start, end } = visibleRange();
  const dayPeriods = api.periodsByDay(state.periods, start, end);
  const month = state.cursor.getMonth();

  const head = el("div", "weekday-row");
  for (const name of WEEKDAYS) head.append(el("div", null, name));

  const grid = el("div", "month-grid");
  for (const day of days) {
    const key = ymd(day);
    const cell = el("div", "day");
    if (day.getMonth() !== month) cell.classList.add("other-month");
    if (isToday(day)) cell.classList.add("today");
    if ([5, 6].includes((day.getDay() + 6) % 7)) cell.classList.add("day-weekend");
    if (state.selection && day >= state.selection.from && day <= state.selection.to) {
      cell.classList.add("selected");
    }
    cell.dataset.date = key;

    cell.append(el("span", "day-num", String(day.getDate())));

    const blocks = dayPeriods.get(key) ?? [];
    if (blocks.length) {
      const bands = el("div", "period-bands");
      for (const block of blocks) {
        const band = el("div", "period-band");
        band.style.background = tint(block.color, 0.3);
        band.style.borderLeft = `3px solid ${block.color}`;
        const isFirstDay = sameDay(day, block.start) || sameDay(day, startOfWeek(day));
        band.textContent = isFirstDay ? block.name : "";
        band.title = `${block.name} · ${formatRange(block.start, block.end)}`;
        band.addEventListener("click", (e) => {
          e.stopPropagation();
          openPeriodDialog(block.period);
        });
        bands.append(band);
      }
      cell.append(bands);
    }

    const dayEvents = eventsForDay(day);
    for (const event of dayEvents.slice(0, 3)) cell.append(eventChip(event));
    if (dayEvents.length > 3) {
      const more = el("div", "more", `+${dayEvents.length - 3} veel`);
      more.addEventListener("click", (e) => {
        e.stopPropagation();
        state.cursor = startOfDay(day);
        setView("agenda");
      });
      cell.append(more);
    }

    grid.append(cell);
  }

  enableDragSelect(grid);
  container.replaceChildren(head, grid);
}

function enableDragSelect(grid) {
  let anchor = null;
  let dragged = false;

  const paint = () => {
    for (const cell of grid.children) {
      const day = parseYmd(cell.dataset.date);
      const active = state.selection && day >= state.selection.from && day <= state.selection.to;
      cell.classList.toggle("selected", Boolean(active));
    }
  };

  grid.addEventListener("pointerdown", (event) => {
    const cell = event.target.closest(".day");
    if (!cell || event.target.closest(".chip, .period-band, .more")) return;
    anchor = parseYmd(cell.dataset.date);
    dragged = false;
    state.selection = { from: anchor, to: anchor };
    paint();
  });

  grid.addEventListener("pointermove", (event) => {
    if (!anchor) return;
    const cell = event.target.closest(".day");
    if (!cell) return;
    const day = parseYmd(cell.dataset.date);
    if (!sameDay(day, anchor)) dragged = true;
    state.selection = { from: day < anchor ? day : anchor, to: day < anchor ? anchor : day };
    paint();
  });

  const finish = () => {
    if (!anchor) return;
    const selection = state.selection;
    anchor = null;
    if (dragged && selection) {
      openPeriodDialog(null, selection.from, selection.to);
    } else if (selection) {
      openEventDialog(null, selection.from);
    }
  };
  grid.addEventListener("pointerup", finish);
  grid.addEventListener("pointerleave", () => { anchor = null; });
}

// Nädalavaade ---------------------------------------------------------------
function renderWeek(container) {
  const days = weekDays(state.cursor);
  const { start, end } = visibleRange();
  const dayPeriods = api.periodsByDay(state.periods, start, end);

  const head = el("div", "week-head");
  head.append(el("div"));
  for (const day of days) {
    const cell = el("div", isToday(day) ? "today" : null);
    cell.append(el("span", null, WEEKDAYS[(day.getDay() + 6) % 7]), el("strong", null, String(day.getDate())));
    head.append(cell);
  }

  const allday = el("div", "week-allday");
  allday.append(el("div", "gutter", "terve päev"));
  for (const day of days) {
    const cell = el("div", "cell");
    for (const block of dayPeriods.get(ymd(day)) ?? []) {
      const band = el("div", "period-band", sameDay(day, block.start) ? block.name : "");
      band.style.background = tint(block.color, 0.3);
      band.style.borderLeft = `3px solid ${block.color}`;
      band.title = `${block.name} · ${formatRange(block.start, block.end)}`;
      band.addEventListener("click", () => openPeriodDialog(block.period));
      cell.append(band);
    }
    for (const event of eventsForDay(day).filter((e) => e.all_day)) cell.append(eventChip(event));
    cell.addEventListener("dblclick", () => openEventDialog(null, day, true));
    allday.append(cell);
  }

  const body = el("div", "week-body");
  const hours = el("div", "hours");
  for (let h = 0; h < 24; h += 1) hours.append(el("div", "hour-label", `${String(h).padStart(2, "0")}:00`));
  body.append(hours);

  for (const day of days) {
    const column = el("div", "daycol");
    for (let h = 0; h < 24; h += 1) column.append(el("div", "hour-line"));
    for (const event of eventsForDay(day).filter((e) => !e.all_day)) {
      const startsAt = new Date(event.starts_at);
      const endsAt = new Date(event.ends_at);
      const from = startsAt < startOfDay(day) ? startOfDay(day) : startsAt;
      const to = endsAt > endOfDay(day) ? endOfDay(day) : endsAt;
      const top = (from.getHours() + from.getMinutes() / 60) * 44;
      const height = Math.max(18, ((to - from) / 3600000) * 44);
      const node = el("div", "timed-event");
      node.style.top = `${top}px`;
      node.style.height = `${height}px`;
      node.style.background = event.color;
      node.style.color = contrastText(event.color);
      node.append(el("strong", null, event.title), el("div", null, `${hhmm(startsAt)}–${hhmm(endsAt)}`));
      node.addEventListener("click", () => openEventDialog(event));
      column.append(node);
    }
    column.addEventListener("dblclick", (e) => {
      const rect = column.getBoundingClientRect();
      const hour = Math.max(0, Math.min(23, Math.floor((e.clientY - rect.top + column.scrollTop) / 44)));
      const at = new Date(day);
      at.setHours(hour, 0, 0, 0);
      openEventDialog(null, at);
    });
    body.append(column);
  }

  container.replaceChildren(head, allday, body);
}

// Loendivaade ---------------------------------------------------------------
function renderAgenda(container) {
  const wrap = el("div", "agenda");
  const { start, end } = visibleRange();
  const dayPeriods = api.periodsByDay(state.periods, start, end);
  let printed = 0;

  for (let day = startOfDay(start); day <= end; day = addDays(day, 1)) {
    const dayEvents = eventsForDay(day);
    const blocks = dayPeriods.get(ymd(day)) ?? [];
    if (!dayEvents.length && !blocks.length) continue;
    printed += 1;

    const row = el("div", "agenda-day");
    const date = el("div", "agenda-date");
    date.append(
      el("strong", null, `${day.getDate()}. ${formatMonthTitle(day).split(" ")[0]}`),
      el("span", null, WEEKDAYS[(day.getDay() + 6) % 7]),
    );
    const items = el("div", "agenda-items");
    for (const block of blocks) {
      if (!sameDay(day, block.start)) continue;
      const band = el("div", "period-band", `${block.name} (${formatRange(block.start, block.end)})`);
      band.style.background = tint(block.color, 0.3);
      band.style.borderLeft = `3px solid ${block.color}`;
      band.addEventListener("click", () => openPeriodDialog(block.period));
      items.append(band);
    }
    for (const event of dayEvents) items.append(eventChip(event));
    row.append(date, items);
    wrap.append(row);
  }

  if (!printed) wrap.append(el("p", "hint", "Sellel ajavahemikul kirjeid ei ole."));
  container.replaceChildren(wrap);
}

// Külgriba ------------------------------------------------------------------
function renderSidebar() {
  const periodList = $("period-list");
  periodList.replaceChildren();
  if (!state.periods.length) {
    periodList.append(el("li", "empty", "Perioode veel ei ole."));
  }
  for (const period of state.periods) {
    const item = el("button", "period-item");
    item.type = "button";
    const dot = el("span", "dot");
    dot.style.background = period.color;
    const stack = el("div", "stack");
    stack.append(
      el("strong", null, period.name),
      el("span", null, period.repeats
        ? `kordub · ${formatRange(period.start_date, period.end_date)}`
        : formatRange(period.start_date, period.end_date)),
    );
    item.append(dot, stack);
    item.addEventListener("click", () => openPeriodDialog(period));
    const li = el("li");
    li.append(item);
    periodList.append(li);
  }

  const upcoming = $("upcoming-list");
  upcoming.replaceChildren();
  const now = new Date();
  const next = state.events
    .filter((event) => new Date(event.ends_at) >= now)
    .sort((a, b) => new Date(a.starts_at) - new Date(b.starts_at))
    .slice(0, 6);
  if (!next.length) upcoming.append(el("li", "empty", "Lähiajal midagi ei ole."));
  for (const event of next) {
    const item = el("button", "upcoming-item");
    item.type = "button";
    const dot = el("span", "dot");
    dot.style.background = event.color;
    const stack = el("div", "stack");
    const startsAt = new Date(event.starts_at);
    stack.append(
      el("strong", null, event.title),
      el("span", null, event.all_day
        ? formatDayLong(startsAt)
        : `${formatDayLong(startsAt)} ${hhmm(startsAt)}`),
    );
    item.append(dot, stack);
    item.addEventListener("click", () => openEventDialog(event));
    const li = el("li");
    li.append(item);
    upcoming.append(li);
  }
}

function render() {
  $("range-title").textContent = rangeTitle();
  const container = $("calendar");
  if (state.view === "month") renderMonth(container);
  else if (state.view === "week") renderWeek(container);
  else renderAgenda(container);
  renderSidebar();
}

function setView(view) {
  state.view = view;
  for (const button of document.querySelectorAll(".view-btn")) {
    button.classList.toggle("active", button.dataset.view === view);
  }
  reload();
}

function shift(direction) {
  if (state.view === "month") state.cursor = addMonths(state.cursor, direction);
  else if (state.view === "week") state.cursor = addDays(state.cursor, 7 * direction);
  else state.cursor = addDays(state.cursor, 30 * direction);
  reload();
}

// Sündmuse dialoog ----------------------------------------------------------
let editingEvent = null;

function syncEventAllDay() {
  const allDay = $("event-allday").checked;
  $("event-start").parentElement.parentElement.classList.toggle("hidden", allDay);
  $("event-startdate").parentElement.parentElement.classList.toggle("hidden", !allDay);
  $("event-start").required = !allDay;
  $("event-end").required = !allDay;
  $("event-startdate").required = allDay;
  $("event-enddate").required = allDay;
}

function openEventDialog(event, day = null, allDay = false) {
  editingEvent = event;
  $("event-dialog-title").textContent = event ? "Muuda sündmust" : "Uus sündmus";
  $("event-delete").classList.toggle("hidden", !event);
  showMessage($("event-message"), "");

  const base = event ? new Date(event.starts_at) : (day ? new Date(day) : new Date());
  if (!event && !day) base.setMinutes(0, 0, 0);
  const end = event ? new Date(event.ends_at) : new Date(base.getTime() + 3600000);

  $("event-title").value = event?.title ?? "";
  $("event-location").value = event?.location ?? "";
  $("event-description").value = event?.description ?? "";
  $("event-color").value = event?.color ?? PALETTE[0];
  $("event-allday").checked = event ? event.all_day : allDay;
  $("event-start").value = toLocalInput(base);
  $("event-end").value = toLocalInput(end);
  $("event-startdate").value = ymd(base);
  $("event-enddate").value = ymd(end);
  buildSwatches($("event-swatches"), $("event-color"));
  syncEventAllDay();

  $("event-dialog").showModal();
  $("event-title").focus();
}

async function submitEvent(formEvent) {
  formEvent.preventDefault();
  const allDay = $("event-allday").checked;
  const title = $("event-title").value.trim();
  if (!title) return showMessage($("event-message"), "Pealkiri on kohustuslik.");

  let startsAt;
  let endsAt;
  if (allDay) {
    if (!$("event-startdate").value || !$("event-enddate").value) {
      return showMessage($("event-message"), "Vali algus- ja lõpukuupäev.");
    }
    startsAt = startOfDay(parseYmd($("event-startdate").value));
    endsAt = endOfDay(parseYmd($("event-enddate").value));
  } else {
    if (!$("event-start").value || !$("event-end").value) {
      return showMessage($("event-message"), "Vali algus- ja lõpuaeg.");
    }
    startsAt = fromLocalInput($("event-start").value);
    endsAt = fromLocalInput($("event-end").value);
  }
  if (endsAt < startsAt) return showMessage($("event-message"), "Lõpp ei saa olla enne algust.");

  const payload = {
    id: editingEvent?.id,
    title,
    description: $("event-description").value.trim() || null,
    location: $("event-location").value.trim() || null,
    all_day: allDay,
    starts_at: startsAt.toISOString(),
    ends_at: endsAt.toISOString(),
    color: $("event-color").value,
  };
  if (!payload.id) delete payload.id;

  $("event-save").disabled = true;
  try {
    await api.saveEvent(payload, state.user.id);
    $("event-dialog").close();
    toast(editingEvent ? "Sündmus salvestatud." : "Sündmus lisatud.");
    state.selection = null;
    await reload();
  } catch (error) {
    showMessage($("event-message"), authErrorText(error));
  } finally {
    $("event-save").disabled = false;
  }
}

// Perioodi dialoog ----------------------------------------------------------
let editingPeriod = null;

function cycleRow(step) {
  const li = el("li");
  const color = el("input");
  color.type = "color";
  color.value = step.color;
  const name = el("input");
  name.type = "text";
  name.placeholder = "Tsükli nimi";
  name.value = step.name ?? "";
  const remove = el("button", "btn small danger", "×");
  remove.type = "button";
  remove.addEventListener("click", () => li.remove());
  li.append(color, name, remove);
  return li;
}

function readCycleColors() {
  return Array.from($("cycle-colors").children).map((li) => {
    const [color, name] = li.querySelectorAll("input");
    return { color: color.value, name: name.value.trim() };
  });
}

function syncPeriodCycle() {
  const repeats = $("period-repeats").checked;
  $("period-cycle").classList.toggle("hidden", !repeats);
  const start = $("period-start").value;
  const end = $("period-end").value;
  if (start && end) {
    $("period-length").textContent = String(Math.max(1, diffDays(parseYmd(start), parseYmd(end)) + 1));
  }
  if (repeats && !$("cycle-colors").children.length) {
    $("cycle-colors").append(
      cycleRow({ color: $("period-color").value, name: $("period-name").value || "Tsükkel A" }),
      cycleRow({ color: PALETTE[2], name: "Tsükkel B" }),
    );
  }
}

function openPeriodDialog(period, from = null, to = null) {
  editingPeriod = period;
  $("period-dialog-title").textContent = period ? "Muuda perioodi" : "Uus periood";
  $("period-delete").classList.toggle("hidden", !period);
  showMessage($("period-message"), "");

  const start = period ? parseYmd(period.start_date) : (from ?? startOfDay(new Date()));
  const end = period ? parseYmd(period.end_date) : (to ?? start);

  $("period-name").value = period?.name ?? "";
  $("period-start").value = ymd(start);
  $("period-end").value = ymd(end);
  $("period-color").value = period?.color ?? PALETTE[4];
  $("period-repeats").checked = Boolean(period?.repeats);
  $("period-until").value = period?.repeat_until ?? "";
  buildSwatches($("period-swatches"), $("period-color"));

  const steps = Array.isArray(period?.cycle_colors) ? period.cycle_colors : [];
  $("cycle-colors").replaceChildren(...steps.map(cycleRow));
  syncPeriodCycle();

  $("period-dialog").showModal();
  $("period-name").focus();
}

async function submitPeriod(formEvent) {
  formEvent.preventDefault();
  const name = $("period-name").value.trim();
  if (!name) return showMessage($("period-message"), "Nimi on kohustuslik.");
  if (!$("period-start").value || !$("period-end").value) {
    return showMessage($("period-message"), "Vali perioodi algus ja lõpp.");
  }
  const start = parseYmd($("period-start").value);
  const end = parseYmd($("period-end").value);
  if (end < start) return showMessage($("period-message"), "Lõpp ei saa olla enne algust.");

  const repeats = $("period-repeats").checked;
  const cycleColors = repeats ? readCycleColors() : [];
  if (repeats && cycleColors.length < 1) {
    return showMessage($("period-message"), "Lisa vähemalt üks tsükli värv.");
  }
  const until = $("period-until").value || null;
  if (repeats && until && parseYmd(until) < end) {
    return showMessage($("period-message"), "„Korda kuni“ peab olema perioodi lõpust hiljem.");
  }

  const payload = {
    id: editingPeriod?.id,
    name,
    start_date: ymd(start),
    end_date: ymd(end),
    color: repeats && cycleColors[0]?.color ? cycleColors[0].color : $("period-color").value,
    repeats,
    block_days: Math.max(1, diffDays(start, end) + 1),
    cycle_colors: cycleColors,
    repeat_until: repeats ? until : null,
  };
  if (!payload.id) delete payload.id;

  $("period-save").disabled = true;
  try {
    await api.savePeriod(payload, state.user.id);
    $("period-dialog").close();
    toast(editingPeriod ? "Periood salvestatud." : "Periood lisatud.");
    state.selection = null;
    await reload();
  } catch (error) {
    showMessage($("period-message"), authErrorText(error));
  } finally {
    $("period-save").disabled = false;
  }
}

// Autentimise vaade ---------------------------------------------------------
let authMode = "signin";

function setAuthMode(mode) {
  authMode = mode;
  const signup = mode === "signup";
  $("tab-signin").classList.toggle("active", !signup);
  $("tab-signup").classList.toggle("active", signup);
  $("auth-submit").textContent = signup ? "Loo konto" : "Logi sisse";
  $("auth-password2-wrap").classList.toggle("hidden", !signup);
  $("auth-password").autocomplete = signup ? "new-password" : "current-password";
  $("auth-password2").required = signup;
  showMessage($("auth-message"), "");
}

async function submitAuth(formEvent) {
  formEvent.preventDefault();
  const email = $("auth-email").value.trim();
  const password = $("auth-password").value;
  if (!email || !password) return showMessage($("auth-message"), "Täida e-post ja parool.");
  if (authMode === "signup") {
    if (password.length < 8) return showMessage($("auth-message"), "Parool peab olema vähemalt 8 tähemärki.");
    if (password !== $("auth-password2").value) {
      return showMessage($("auth-message"), "Paroolid ei kattu.");
    }
  }

  $("auth-submit").disabled = true;
  try {
    if (authMode === "signup") {
      const data = await api.signUp(email, password);
      if (!data.session) {
        showMessage($("auth-message"), "Konto loodud. Kinnita e-posti aadress kirja lingiga ja logi siis sisse.", true);
        setAuthMode("signin");
      }
    } else {
      await api.signIn(email, password);
    }
  } catch (error) {
    showMessage($("auth-message"), authErrorText(error));
  } finally {
    $("auth-submit").disabled = false;
  }
}

async function submitReset() {
  const email = $("auth-email").value.trim();
  if (!email) return showMessage($("auth-message"), "Sisesta e-post, kuhu parooli lähtestamise link saata.");
  try {
    await api.requestPasswordReset(email);
    showMessage($("auth-message"), "Saatsime parooli lähtestamise lingi e-postile.", true);
  } catch (error) {
    showMessage($("auth-message"), authErrorText(error));
  }
}

// Käivitamine ---------------------------------------------------------------
function showScreen(name) {
  for (const id of ["loading", "setup", "auth", "app"]) {
    $(id).classList.toggle("hidden", id !== name);
  }
}

function bindEvents() {
  $("tab-signin").addEventListener("click", () => setAuthMode("signin"));
  $("tab-signup").addEventListener("click", () => setAuthMode("signup"));
  $("auth-form").addEventListener("submit", submitAuth);
  $("auth-reset").addEventListener("click", submitReset);

  $("nav-prev").addEventListener("click", () => shift(-1));
  $("nav-next").addEventListener("click", () => shift(1));
  $("nav-today").addEventListener("click", () => { state.cursor = startOfDay(new Date()); reload(); });
  for (const button of document.querySelectorAll(".view-btn")) {
    button.addEventListener("click", () => setView(button.dataset.view));
  }
  $("new-event").addEventListener("click", () => openEventDialog(null));
  $("new-period").addEventListener("click", () => {
    const selection = state.selection;
    openPeriodDialog(null, selection?.from ?? null, selection?.to ?? null);
  });
  $("sign-out").addEventListener("click", async () => {
    try { await api.signOut(); } catch (error) { toast(authErrorText(error)); }
  });

  $("event-form").addEventListener("submit", submitEvent);
  $("event-allday").addEventListener("change", syncEventAllDay);
  $("event-color").addEventListener("input", () => markActiveSwatch($("event-swatches"), $("event-color").value));
  $("event-delete").addEventListener("click", async () => {
    if (!editingEvent || !window.confirm("Kustutan selle sündmuse?")) return;
    try {
      await api.deleteEvent(editingEvent.id);
      $("event-dialog").close();
      toast("Sündmus kustutatud.");
      await reload();
    } catch (error) {
      showMessage($("event-message"), authErrorText(error));
    }
  });

  $("period-form").addEventListener("submit", submitPeriod);
  $("period-repeats").addEventListener("change", syncPeriodCycle);
  $("period-start").addEventListener("change", syncPeriodCycle);
  $("period-end").addEventListener("change", syncPeriodCycle);
  $("period-color").addEventListener("input", () => markActiveSwatch($("period-swatches"), $("period-color").value));
  $("cycle-add").addEventListener("click", () => {
    const index = $("cycle-colors").children.length;
    $("cycle-colors").append(cycleRow({ color: PALETTE[index % PALETTE.length], name: "" }));
  });
  $("period-delete").addEventListener("click", async () => {
    if (!editingPeriod || !window.confirm("Kustutan selle perioodi?")) return;
    try {
      await api.deletePeriod(editingPeriod.id);
      $("period-dialog").close();
      toast("Periood kustutatud.");
      await reload();
    } catch (error) {
      showMessage($("period-message"), authErrorText(error));
    }
  });

  for (const button of document.querySelectorAll("[data-close]")) {
    button.addEventListener("click", () => button.closest("dialog").close());
  }

  document.addEventListener("keydown", (event) => {
    if (state.user === null || document.querySelector("dialog[open]")) return;
    if (event.target.matches("input, textarea")) return;
    const key = event.key.toLowerCase();
    if (!["arrowleft", "arrowright", "t", "m", "w", "a", "n"].includes(key)) return;
    event.preventDefault();
    if (key === "arrowleft") shift(-1);
    else if (key === "arrowright") shift(1);
    else if (key === "t") { state.cursor = startOfDay(new Date()); reload(); }
    else if (key === "m") setView("month");
    else if (key === "w") setView("week");
    else if (key === "a") setView("agenda");
    else if (key === "n") openEventDialog(null);
  });
}

async function main() {
  if (!api.isConfigured) {
    showScreen("setup");
    return;
  }
  bindEvents();
  setAuthMode("signin");

  api.supabase.auth.onAuthStateChange((_event, session) => {
    const user = session?.user ?? null;
    const changed = user?.id !== state.user?.id;
    state.user = user;
    if (user) {
      $("user-email").textContent = user.email ?? "Konto";
      showScreen("app");
      if (changed) reload();
    } else {
      state.events = [];
      state.periods = [];
      showScreen("auth");
    }
  });

  const { data } = await api.supabase.auth.getSession();
  if (!data.session) showScreen("auth");
}

main();
