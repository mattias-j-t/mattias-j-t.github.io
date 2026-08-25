// Supabase klient, päringud ja perioodide laiendamine kalendripäevadeks.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

export const isConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

export const supabase = isConfigured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    })
  : null;

// Autentimine ---------------------------------------------------------------
export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signUp(email, password) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: window.location.href.split("#")[0] },
  });
  if (error) throw error;
  return data;
}

export async function requestPasswordReset(email) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.href.split("#")[0],
  });
  if (error) throw error;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

// Sündmused ----------------------------------------------------------------
export async function fetchEvents(rangeStart, rangeEnd) {
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .lte("starts_at", rangeEnd.toISOString())
    .gte("ends_at", rangeStart.toISOString())
    .order("starts_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function saveEvent(event, userId) {
  const payload = { ...event, user_id: userId };
  const query = event.id
    ? supabase.from("events").update(payload).eq("id", event.id)
    : supabase.from("events").insert(payload);
  const { data, error } = await query.select().single();
  if (error) throw error;
  return data;
}

export async function deleteEvent(id) {
  const { error } = await supabase.from("events").delete().eq("id", id);
  if (error) throw error;
}

// Perioodid ----------------------------------------------------------------
export async function fetchPeriods() {
  const { data, error } = await supabase
    .from("periods")
    .select("*")
    .order("start_date", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function savePeriod(period, userId) {
  const payload = { ...period, user_id: userId };
  const query = period.id
    ? supabase.from("periods").update(payload).eq("id", period.id)
    : supabase.from("periods").insert(payload);
  const { data, error } = await query.select().single();
  if (error) throw error;
  return data;
}

export async function deletePeriod(id) {
  const { error } = await supabase.from("periods").delete().eq("id", id);
  if (error) throw error;
}

export { periodBlocks, periodsByDay } from "./periods.js";
