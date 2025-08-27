import React, { useState } from "react";
import { supabase } from "../lib/supabaseClient";

export default function UpgradeAccount() {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function linkEmail(e) {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    const { error } = await supabase.auth.updateUser({ email });
    if (error) setMsg(error.message || "Could not send verification email");
    else setMsg("Check your inbox to verify and upgrade your account.");
    setBusy(false);
  }

  return (
    <form onSubmit={linkEmail} className="flex items-center gap-2">
      <input
        type="email"
        className="border rounded px-2 py-1 text-sm bg-background"
        placeholder="Add email to save work"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <button
        type="submit"
        className="rounded border px-2 py-1 text-sm disabled:opacity-50 cursor-pointer"
        disabled={busy}
      >
        {busy ? "Sending…" : "Upgrade"}
      </button>
      {msg && <span className="text-xs text-muted-foreground">{msg}</span>}
    </form>
  );
}
