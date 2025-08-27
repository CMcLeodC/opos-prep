import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";

const PAGE_SIZE = 20;

export default function MySubmissions() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]); // [{submission, prompt, feedback?}]
  const [error, setError] = useState("");
  const [expandedId, setExpandedId] = useState(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Ensure user session (anon ok for now, replace with your real auth when ready)
  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) await supabase.auth.signInAnonymously();
      await loadPage(0, true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadPage(nextPage = 0, replace = false) {
    setLoading(nextPage === 0);
    setRefreshing(nextPage > 0 ? false : refreshing);
    setError("");

    // 1) Fetch submissions page for current user (RLS enforces owner)
    const from = nextPage * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    const { data: subs, error: e1, count } = await supabase
      .from("submissions")
      .select(`
        id, status, attempt_number, prompt_id, prompt_version_id,
        created_at, submitted_at, word_count, length_violation, length_delta,
        content_text,
        prompt:prompts(title, genre)
      `, { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to);

    if (e1) {
      setError(e1.message || "Failed to load submissions");
      setLoading(false);
      return;
    }

    // 2) Fetch latest feedbacks for these submissions in one go
    const ids = (subs || []).map((s) => s.id);
    let bySubmission = new Map();
    if (ids.length) {
      const { data: fbs, error: e2 } = await supabase
        .from("feedback")
        .select("id, submission_id, rubric, overall_score, length_penalty_applied, comments_overall_md, created_at")
        .in("submission_id", ids)
        .order("created_at", { ascending: false });
      if (!e2 && fbs) {
        for (const fb of fbs) {
          // Keep only latest per submission
          if (!bySubmission.has(fb.submission_id)) bySubmission.set(fb.submission_id, fb);
        }
      }
    }

    const combined = (subs || []).map((s) => ({
      submission: s,
      prompt: s.prompt || null,
      feedback: bySubmission.get(s.id) || null,
    }));

    setItems((prev) => (replace ? combined : [...prev, ...combined]));
    setHasMore(count != null ? to + 1 < count : combined.length === PAGE_SIZE);
    setPage(nextPage);
    setLoading(false);
  }

  async function refresh() {
    setRefreshing(true);
    await loadPage(0, true);
    setRefreshing(false);
  }

  function statusBadge(status) {
    const base = "inline-flex items-center rounded-full px-2 py-0.5 text-xs";
    if (status === "draft") return `${base} bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300`;
    if (status === "submitted") return `${base} bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200`;
    if (status === "returned") return `${base} bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-200`;
    return `${base} bg-muted text-foreground`;
    }

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">My submissions</h1>
        <div className="flex items-center gap-2">
          {error && <span className="text-sm text-red-600">{error}</span>}
          <button
            onClick={refresh}
            className="rounded-md border px-3 py-1.5 text-sm disabled:opacity-50"
            disabled={loading || refreshing}
          >
            {refreshing ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </div>

      {loading && items.length === 0 ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : items.length === 0 ? (
        <div className="text-sm text-muted-foreground">No submissions yet.</div>
      ) : (
        <ul className="divide-y rounded-md border">
          {items.map(({ submission: s, prompt, feedback }) => {
            const isOpen = expandedId === s.id;
            return (
              <li key={s.id} className="p-3">
                {/* Row head */}
                <button
                  className="w-full text-left"
                  onClick={() => setExpandedId(isOpen ? null : s.id)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium">
                        {prompt?.title || "Untitled prompt"}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Attempt #{s.attempt_number} • {prompt?.genre || "—"} •{" "}
                        {new Date(s.created_at).toLocaleString()}
                      </div>
                      <div className="text-xs">
                        {s.word_count ?? "—"} words{" "}
                        {s.length_violation ? "• ⚠ length violation" : ""}
                      </div>
                    </div>
                    <span className={statusBadge(s.status)}>{s.status}</span>
                  </div>
                </button>

                {/* Expanded body */}
                {isOpen && (
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    {/* Submission excerpt */}
                    <div className="rounded-md border bg-background p-3">
                      <div className="text-sm font-semibold mb-1">Your submission</div>
                      <p className="text-sm font-mono whitespace-pre-wrap leading-relaxed">
                        {s.content_text || "— (empty)"}
                      </p>
                    </div>

                    {/* Feedback panel */}
                    <div className="rounded-md border bg-background p-3">
                      <div className="text-sm font-semibold mb-1">Feedback</div>
                      {s.status !== "returned" || !feedback ? (
                        <p className="text-sm text-muted-foreground">
                          {s.status === "submitted"
                            ? "Pending review."
                            : "No feedback available."}
                        </p>
                      ) : (
                        <>
                          <div className="text-xs text-muted-foreground mb-2">
                            Returned {new Date(feedback.created_at).toLocaleString()}
                          </div>
                          <div className="text-sm grid grid-cols-2 gap-x-6 gap-y-1">
                            {Object.entries(feedback.rubric || {}).map(([k, v]) => (
                              <div key={k}>
                                <span className="text-muted-foreground">{k}:</span>{" "}
                                <span className="font-medium">{v}</span>
                              </div>
                            ))}
                            <div>
                              <span className="text-muted-foreground">Overall:</span>{" "}
                              <span className="font-medium">
                                {typeof feedback.overall_score === "number"
                                  ? feedback.overall_score.toFixed(2)
                                  : "—"}
                              </span>
                            </div>
                            {feedback.length_penalty_applied && (
                              <div className="col-span-2 text-amber-600">
                                Length penalty applied (−0.5 on Task Achievement)
                              </div>
                            )}
                          </div>
                          {feedback.comments_overall_md && (
                            <p className="text-sm whitespace-pre-wrap mt-3">
                              {feedback.comments_overall_md}
                            </p>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {hasMore && (
        <div className="flex justify-center mt-4">
          <button
            onClick={() => loadPage(page + 1)}
            className="rounded-md border px-4 py-2 text-sm disabled:opacity-50"
            disabled={loading}
          >
            Load more
          </button>
        </div>
      )}
    </div>
  );
}
