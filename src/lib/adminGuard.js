import { supabase } from "./supabaseClient";

export async function requireAdminEmail() {
  const { data: { user } } = await supabase.auth.getUser();
  console.log('user email', user?.email);
  if (!user?.email) return false;
  const allow = (import.meta.env.VITE_ADMIN_EMAILS || "").split(",").map(s=>s.trim().toLowerCase());
  return allow.includes(user.email.toLowerCase());
}
