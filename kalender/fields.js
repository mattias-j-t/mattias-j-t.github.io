// Kuupäeva- ja kellaajaväljad kujul pp/kk/aaaa ja 24h tt:mm.
// Native <input type="date"> / "datetime-local" kuvab kuupäeva brauseri keele
// järgi (nt MM/DD/YYYY ja AM/PM), mida lehelt muuta ei saa, seega kasutame
// tekstivälju ja hoiame native valija ainult peidetud abiväljana.

import { parseYmd, ymd } from "./dates.js";

const DIGITS = /\d/g;

function digitsOf(value) {
  return (String(value).match(DIGITS) ?? []).join("");
}

export function formatDateDisplay(value) {
  if (!value) return "";
  const [y, m, d] = String(value).split("-");
  if (!y || !m || !d) return "";
  return `${d}/${m}/${y}`;
}

// "pp/kk/aaaa" -> "aaaa-kk-pp"; tagastab tühja stringi vigase sisendi korral.
// Lubatud on ka lühemad osad, kui eraldajad on olemas (nt "1/2/2026").
export function parseDateDisplay(text) {
  const segments = String(text ?? "").split("/");
  let day;
  let month;
  let year;
  if (segments.length === 3 && segments.every((part) => /^\d{1,4}$/.test(part.trim()))) {
    [day, month, year] = segments.map((part) => Number(part));
  } else {
    const digits = digitsOf(text);
    if (digits.length !== 8) return "";
    day = Number(digits.slice(0, 2));
    month = Number(digits.slice(2, 4));
    year = Number(digits.slice(4, 8));
  }
  if (year < 1000 || year > 9999) return "";
  if (month < 1 || month > 12 || day < 1 || day > 31) return "";
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return "";
  return ymd(date);
}

// "tt:mm" 24-tunnises kellas.
export function parseTimeDisplay(text) {
  const segments = String(text ?? "").split(":");
  let hours;
  let minutes;
  if (segments.length === 2 && segments.every((part) => /^\d{1,2}$/.test(part.trim()))) {
    [hours, minutes] = segments.map((part) => Number(part));
  } else {
    const digits = digitsOf(text);
    if (digits.length !== 3 && digits.length !== 4) return "";
    const padded = digits.padStart(4, "0");
    hours = Number(padded.slice(0, 2));
    minutes = Number(padded.slice(2, 4));
  }
  if (hours > 23 || minutes > 59) return "";
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

// Kirjutamise ajal hoiame kuju pp/kk/aaaa: kasutaja võib kaldkriipsud ise
// kirjutada või lasta neil täis osade järel tekkida.
function maskDate(text) {
  const typed = String(text).replace(/[^\d/]/g, "");
  if (!typed.includes("/")) {
    const digits = typed.slice(0, 8);
    return [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4, 8)].filter(Boolean).join("/");
  }
  const limits = [2, 2, 4];
  const parts = typed.split("/").slice(0, 3).map((part, i) => part.slice(0, limits[i]));
  const full = parts.length < 3 && parts[parts.length - 1].length === limits[parts.length - 1];
  return full ? `${parts.join("/")}/` : parts.join("/");
}

function maskTime(text) {
  const typed = String(text).replace(/[^\d:]/g, "");
  if (!typed.includes(":")) {
    const digits = typed.slice(0, 4);
    return digits.length <= 2 ? digits : `${digits.slice(0, 2)}:${digits.slice(2, 4)}`;
  }
  const [hours = "", minutes = ""] = typed.split(":");
  return `${hours.slice(0, 2)}:${minutes.slice(0, 2)}`;
}

function attachMask(input, mask, parse) {
  input.addEventListener("input", () => {
    const atEnd = input.selectionStart === input.value.length;
    const masked = mask(input.value);
    if (masked !== input.value) {
      input.value = masked;
      if (atEnd) input.setSelectionRange(masked.length, masked.length);
    }
    input.classList.remove("invalid");
  });
  input.addEventListener("blur", () => {
    input.classList.toggle("invalid", Boolean(input.value) && !parse(input.value));
  });
}

// Peidetud native väli annab kalendrivalija, ilma et selle formaati kuvataks.
function attachPicker(input) {
  const picker = document.createElement("input");
  picker.type = "date";
  picker.className = "field-picker";
  picker.tabIndex = -1;
  picker.setAttribute("aria-hidden", "true");

  const button = document.createElement("button");
  button.type = "button";
  button.className = "field-picker-btn";
  button.title = "Vali kalendrist";
  button.textContent = "📅";

  if (typeof picker.showPicker !== "function") return;

  button.addEventListener("click", () => {
    picker.value = parseDateDisplay(input.value) || "";
    try {
      picker.showPicker();
    } catch {
      picker.focus();
    }
  });
  picker.addEventListener("change", () => {
    if (!picker.value) return;
    input.value = formatDateDisplay(picker.value);
    input.classList.remove("invalid");
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });

  input.after(picker, button);
}

export function initDateInput(input) {
  input.type = "text";
  input.classList.add("datefield");
  input.inputMode = "numeric";
  input.autocomplete = "off";
  input.placeholder = "pp/kk/aaaa";
  input.maxLength = 10;
  attachMask(input, maskDate, parseDateDisplay);
  attachPicker(input);
}

export function initTimeInput(input) {
  input.type = "text";
  input.classList.add("timefield");
  input.inputMode = "numeric";
  input.autocomplete = "off";
  input.placeholder = "tt:mm";
  input.maxLength = 5;
  attachMask(input, maskTime, parseTimeDisplay);
}

export function getDate(input) {
  return parseDateDisplay(input.value);
}

export function setDate(input, value) {
  const iso = value instanceof Date ? ymd(value) : String(value ?? "");
  input.value = formatDateDisplay(iso);
  input.classList.remove("invalid");
}

export function getTime(input) {
  return parseTimeDisplay(input.value);
}

export function setTime(input, date) {
  input.value = `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
  input.classList.remove("invalid");
}

// Kuupäeva- ja kellaaja välja paarist kuupäev.
export function readDateTime(dateInput, timeInput) {
  const iso = getDate(dateInput);
  const time = getTime(timeInput);
  if (!iso || !time) return null;
  const [hours, minutes] = time.split(":").map(Number);
  const date = parseYmd(iso);
  date.setHours(hours, minutes, 0, 0);
  return date;
}
