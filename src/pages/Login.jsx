// src/pages/Login.jsx
import React, { useState } from "react";
import { supabase } from "../lib/supabaseClient";

export default function Login() {
  const [step, setStep] = useState("request"); // request | verify
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState("");

  async function requestOtp(e) {
    e.preventDefault();
    setMsg("");
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true }, // allow signup if new
    });
    if (error) setMsg(error.message);
    else { setStep("verify"); setMsg("Check your email for the 6-digit code."); }
  }

  async function verifyOtp(e) {
    e.preventDefault();
    setMsg("");
    const { data: { session }, error } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: "email",
    });
    if (error) setMsg(error.message);
    else if (session) setMsg("Signed in!");
  }

  return (
    <div className="max-w-sm mx-auto p-6">
      <h1 className="text-xl font-bold mb-4">Sign in</h1>
      {step === "request" ? (
        <form onSubmit={requestOtp} className="space-y-3">
          <input className="w-full border rounded px-3 py-2" type="email" placeholder="you@email.com" value={email} onChange={e=>setEmail(e.target.value)} required />
          <button className="w-full rounded bg-primary text-primary-foreground px-3 py-2">Send code</button>
        </form>
      ) : (
        <form onSubmit={verifyOtp} className="space-y-3">
          <input className="w-full border rounded px-3 py-2" placeholder="6-digit code" value={code} onChange={e=>setCode(e.target.value)} required />
          <button className="w-full rounded bg-primary text-primary-foreground px-3 py-2">Verify</button>
        </form>
      )}
      {msg && <p className="text-sm mt-3 text-muted-foreground">{msg}</p>}
    </div>
  );
}
