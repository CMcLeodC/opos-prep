// src/lib/supaFetch.js
import { supabase } from "./supabaseClient";

export async function ensureSession() {
  const { data: s } = await supabase.auth.getSession();
  if (!s?.session) {
    const { error } = await supabase.auth.signInAnonymously();
    if (error) throw new Error("Anon sign-in failed: " + error.message);
  }
}

export async function callFunctionRaw(name, body = {}) {
  const { data: s2 } = await supabase.auth.getSession();
  const token = s2?.session?.access_token || "";
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${name}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: token ? `Bearer ${token}` : "",
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json; try { json = JSON.parse(text); } catch { json = null; }
  if (!res.ok) throw new Error(json?.error || text || `HTTP ${res.status}`);
  return json;
}
