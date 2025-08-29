import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export default function AdminListeningReview() {
  const [loading, setLoading] = useState(true);
  const [attempts, setAttempts] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [responsesByAttempt, setResponsesByAttempt] = useState({});
  const [prompts, setPrompts] = useState({});
  const [profiles, setProfiles] = useState({});
  const [errorMsg, setErrorMsg] = useState("");

  const fetchQueue = async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      // POST with empty body to match the function signature
      const { data, error } = await supabase.functions.invoke("review_listening_queue", { body: {} });
      if (error) throw new Error((data && data.error) || error.message);

      setAttempts(data.attempts || []);
      setQuestions(data.questions || []);
      setResponsesByAttempt(data.responsesByAttempt || {});
      setPrompts(data.prompts || {});
      setProfiles(data.profiles || {});
    } catch (e) {
      console.error(e);
      setErrorMsg(e.message || "Failed to load listening review queue.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchQueue(); }, []);

  const qById = useMemo(
    () => Object.fromEntries((questions || []).map(q => [q.id, q])),
    [questions]
  );

  if (loading) return <div className="p-6">Loading…</div>;

  if (errorMsg) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <h2 className="text-2xl font-bold mb-4">Listening — Review Queue</h2>
        <div className="p-4 rounded bg-red-50 text-red-700 border border-red-200 whitespace-pre-wrap">
          {errorMsg}
        </div>
        <button onClick={fetchQueue} className="mt-3 px-3 py-2 rounded bg-gray-100 dark:bg-gray-800">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">Listening — Review Queue</h2>
        <button
          onClick={fetchQueue}
          className="px-3 py-2 rounded bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-sm"
        >
          Refresh
        </button>
      </div>

      {attempts.length === 0 ? (
        <p>No submitted attempts.</p>
      ) : (
        <div className="space-y-6">
          {attempts.map((a) => {
            const prompt = prompts[a.prompt_id];
            const prof = profiles[a.user_id];
            const answers = responsesByAttempt[a.id] || [];

            return (
              <div key={a.id} className="border rounded p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-semibold">
                      {prompt?.title || "(Untitled prompt)"}{" "}
                      <span className="text-xs align-middle px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 ml-2">
                        {a.status}
                      </span>
                    </div>
                    <div className="text-sm text-gray-500">
                      {(prof?.display_name || prof?.email || "Unknown user")} —{" "}
                      {a.submitted_at ? new Date(a.submitted_at).toLocaleString() : "Not submitted"}
                    </div>
                  </div>
                </div>

                <div className="mt-3 space-y-3">
                  {answers.length === 0 ? (
                    <div className="text-sm text-gray-500">No responses found.</div>
                  ) : (
                    answers.map((ans) => {
                      const q = qById[ans.question_id];
                      return (
                        <div key={ans.id} className="bg-gray-50 dark:bg-gray-800 p-3 rounded">
                          <div
                            className="text-sm font-medium"
                            dangerouslySetInnerHTML={{ __html: q?.stem_md || "" }}
                          />
                          <div className="text-sm mt-1">
                            <b>Answer:</b>{" "}
                            {ans.response_text ?? (ans.selected_option ? `Option ${ans.selected_option}` : "—")}
                          </div>
                          {typeof ans.is_correct === "boolean" && (
                            <div className="text-xs mt-1">
                              {ans.is_correct ? "✅ Correct" : "❌ Not matched"}{" "}
                              {(ans.score ?? ans.auto_score) != null ? `(score ${ans.score ?? ans.auto_score})` : ""}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
