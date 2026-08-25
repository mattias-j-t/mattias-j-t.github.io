// Supabase projekti seaded.
//
// SUPABASE_URL ja SUPABASE_ANON_KEY ei ole saladused: anon-võti on mõeldud
// brauserisse saatmiseks ja üksi ta midagi ei ava, sest kõik tabelid on
// kaitstud Row Level Security reeglitega (vt schema.sql). Kasutajate paroolid
// ja sündmused elavad ainult Supabase'is, mitte selles repos.
//
// ÄRA kunagi pane siia service_role võtit ega andmebaasi parooli.

export const SUPABASE_URL = "https://wwspiensktagtjhhbeir.supabase.co";
export const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3c3BpZW5za3RhZ3RqaGhiZWlyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc2NTg3OTAsImV4cCI6MjEwMzIzNDc5MH0.Kdao5K62iWNNATXisnjZN2hqaT36JJGWTDKi_B56_kA";
