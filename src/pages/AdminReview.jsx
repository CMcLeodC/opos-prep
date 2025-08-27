import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export default function AdminReview() {
  // auth state
  const [user, setUser] = useState(null);
  const [authErr, setAuthErr] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // queue + review state
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState(null);
  const [rubric, setRubric] = useState({ TaskAchievement: 3, Coherence: 3, Lexical: 3, Grammar: 3 });
  const [comments, setComments] = useState("");
  const [fnError, setFnError] = useState("");

  // fetch current user on mount and on auth state changes
  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!mounted) return;
      setUser(user ?? null);
      setLoading(false);
    })();
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  async function signIn(e) {
    e.preventDefault();
    setAuthErr("");
    setFnError("");
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setAuthErr(error.message || "Sign-in failed");
      return;
    }
    // after sign-in, load queue
    loadQueue();
  }

  async function signOut() {
    await supabase.auth.signOut();
    setItems([]);
    setActive(null);
  }

  async function loadQueue() {
    setLoading(true);
    setFnError("");
    const { data, error } = await supabase.functions.invoke("review_queue");
    if (error) {
      // If you see 403 here, your signed-in email probably isn't in ADMIN_EMAILS.
      setFnError(error.message || "Failed to load queue");
      setLoading(false);
      return;
    }
    setItems(data?.items || []);
    setLoading(false);
  }

  useEffect(() => {
    if (user) loadQueue();
  }, [user]);

  async function publishFeedback() {
    if (!active) return;
    setFnError("");
    const { error } = await supabase.functions.invoke("create_feedback", {
      body: {
        submission_id: active.id,
        rubric,
        comments_overall_md: comments,
        comments_by_criterion: null,
      },
    });
    if (error) {
      setFnError(error.message || "Failed to publish feedback");
      return;
    }
    // remove from queue locally and reset form
    setItems((arr) => arr.filter((x) => x.id !== active.id));
    setActive(null);
    setComments("");
    setRubric({ TaskAchievement: 3, Coherence: 3, Lexical: 3, Grammar: 3 });
  }

  // --- UI ---
  if (!user) {
    return (
      <div className="max-w-sm mx-auto p-6">
        <h1 className="text-2xl font-bold mb-4">Admin sign in</h1>
        <form onSubmit={signIn} className="space-y-3">
          <input
            type="email"
            className="w-full rounded-md border px-3 py-2"
            placeholder="admin@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
          <input
            type="password"
            className="w-full rounded-md border px-3 py-2"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
          {authErr && <div className="text-sm text-red-600">{authErr}</div>}
          <button type="submit" className="rounded-md bg-primary text-primary-foreground px-4 py-2 w-full">
            Sign in
          </button>
          <p className="text-xs text-muted-foreground">
            Your email must be listed in <code>ADMIN_EMAILS</code> in Edge Function secrets.
          </p>
        </form>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Review Queue</h1>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">{user.email}</span>
          <button onClick={loadQueue} className="rounded-md border px-3 py-1.5 text-sm">Refresh</button>
          <button onClick={signOut} className="rounded-md bg-secondary px-3 py-1.5 text-sm">Sign out</button>
        </div>
      </div>

      {fnError && (
        <div className="mb-4 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          {fnError}
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* Queue list */}
        <div className="rounded-md border">
          <div className="p-3 border-b font-medium bg-background">Submitted</div>
          <ul className="divide-y">
            {loading ? (
              <li className="p-3 text-sm text-muted-foreground">Loading…</li>
            ) : items.length === 0 ? (
              <li className="p-3 text-sm text-muted-foreground">Nothing to review 🎉</li>
            ) : (
              items.map((it) => (
                <li key={it.id} className="p-3 hover:bg-muted cursor-pointer" onClick={() => setActive(it)}>
                  <div className="text-sm font-medium">{it.prompt?.title || "Untitled prompt"}</div>
                  <div className="text-xs text-muted-foreground">
                    Attempt #{it.attempt_number} • {it.prompt?.genre} • {new Date(it.submitted_at).toLocaleString()}
                  </div>
                  <div className="text-xs">
                    {it.word_count ?? "—"} words {it.length_violation ? "• ⚠ length violation" : ""}
                  </div>
                </li>
              ))
            )}
          </ul>
        </div>

        {/* Review form */}
        <div className="rounded-md border p-4">
          <div className="font-medium mb-3">Feedback</div>
          {!active ? (
            <div className="text-sm text-muted-foreground">Select a submission from the left.</div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 mb-3">
                {["TaskAchievement", "Coherence", "Lexical", "Grammar"].map((k) => (
                  <label key={k} className="text-sm">
                    <div className="flex justify-between mb-1">
                      <span>{k}</span>
                      <span className="font-medium">{rubric[k]}</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="5"
                      step="0.5"
                      value={rubric[k]}
                      onChange={(e) => setRubric((r) => ({ ...r, [k]: Number(e.target.value) }))}
                      className="w-full"
                    />
                  </label>
                ))}
              </div>
              <textarea
                className="w-full rounded-md border p-2 text-sm mb-3"
                rows={6}
                placeholder="Overall comments to the student…"
                value={comments}
                onChange={(e) => setComments(e.target.value)}
              />
              <button onClick={publishFeedback} className="rounded-md bg-primary text-primary-foreground px-4 py-2">
                Publish feedback
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
