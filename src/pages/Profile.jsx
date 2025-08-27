import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import UpgradeAccount from "../components/UpgradeAccount"; // optional, if you want it here too

export default function Profile() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  const [displayName, setDisplayName] = useState("");
  const [notify, setNotify] = useState(true);
  const [email, setEmail] = useState("");

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setError("");
      const { data: { user } } = await supabase.auth.getUser();
      if (!mounted) return;
      setUser(user ?? null);

      if (user) {
        setEmail(user.email || "");
        // load profile
        const { data: prof, error: e1 } = await supabase
          .from("profiles")
          .select("display_name, notify_by_email")
          .eq("id", user.id)
          .maybeSingle();
        if (!e1 && prof) {
          setDisplayName(prof.display_name || "");
          setNotify(prof.notify_by_email ?? true);
        }
      }
      setLoading(false);
    })();
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
      setEmail(session?.user?.email || "");
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function saveProfile(e) {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setError("");
    setOk("");

    const { error: e2 } = await supabase
      .from("profiles")
      .update({
        display_name: displayName || null,
        notify_by_email: notify,
      })
      .eq("id", user.id);

    if (e2) setError(e2.message || "Failed to save");
    else setOk("Saved");
    setSaving(false);
  }

  if (loading) return <div className="max-w-xl mx-auto p-6">Loading…</div>;
  if (!user) {
    return (
      <div className="max-w-xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-3">Profile</h1>
        <p className="text-sm text-muted-foreground">
          You’re not signed in. <a href="/login" className="underline">Sign in</a> to manage your profile.
        </p>
      </div>
    );
  }

  const isAnon = !email;

  return (
    <div className="max-w-xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Profile</h1>

      <div className="rounded-md border p-4 bg-background">
        <div className="mb-4">
          <div className="text-sm text-muted-foreground">Account</div>
          <div className="mt-1 text-sm">
            {email ? <span className="font-medium">{email}</span> : <span className="italic">Anonymous</span>}
          </div>
          {isAnon && (
            <div className="mt-2">
              <UpgradeAccount />
            </div>
          )}
        </div>

        <form onSubmit={saveProfile} className="space-y-4">
          <label className="block">
            <div className="text-sm font-medium mb-1">Display name</div>
            <input
              className="w-full rounded-md border px-3 py-2 bg-background"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g., Ms. García"
            />
          </label>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              className="h-4 w-4"
              checked={notify}
              onChange={(e) => setNotify(e.target.checked)}
            />
            <span className="text-sm">Email me when feedback is returned</span>
          </label>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              className="rounded-md bg-primary text-primary-foreground px-4 py-2 disabled:opacity-50"
              disabled={saving}
            >
              {saving ? "Saving…" : "Save"}
            </button>
            {ok && <span className="text-sm text-emerald-600">{ok}</span>}
            {error && <span className="text-sm text-red-600">{error}</span>}
          </div>
        </form>
      </div>
    </div>
  );
}
