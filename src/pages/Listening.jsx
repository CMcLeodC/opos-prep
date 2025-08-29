import { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabaseClient";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY;

export default function Listening() {
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState("practice");
  const [attempt, setAttempt] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [audioUrl, setAudioUrl] = useState(null);

  const [answers, setAnswers] = useState({});
  const [plays, setPlays] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const ranRef = useRef(false); // prevent dev double-run
  const [transcript, setTranscript] = useState(null);

  useEffect(() => {
  (async () => {
    if (ranRef.current) return;
    ranRef.current = true;

    setLoading(true);
    try {
      // ensure session
      const { data: s1 } = await supabase.auth.getSession();
      if (!s1?.session) {
        const { error } = await supabase.auth.signInAnonymously();
        if (error) throw new Error("Anon sign-in failed: " + error.message);
      }

      // call via manual fetch (keeps error body intact)
      const { data: s2 } = await supabase.auth.getSession();
      const token = s2?.session?.access_token || "";
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/start_listening_attempt`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": token ? `Bearer ${token}` : "",
          "apikey": import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ mode }),
      });
      const text = await res.text();
      let json; try { json = JSON.parse(text); } catch { json = null; }
      if (!res.ok) throw new Error(json?.error || text || `HTTP ${res.status}`);

      setAttempt(json.attempt);
      setQuestions(json.questions || []);
      setAudioUrl(json.asset?.signed_url || null);
    } catch (e) {
      console.error("start_listening_attempt error:", e);
      alert(e.message);
    } finally {
      setLoading(false);
    }
  })();
}, [mode]);

  const onTimeUpdate = () => {
    const a = audioRef.current;
    if (!a) return;
    const p = a.currentTime / Math.max(1, a.duration || 1);
    setProgress(Math.min(1, Math.max(0, p)));
  };
  const onEnded = () => { setPlaying(false); setPlays((p) => p + 1); };
  const togglePlay = async () => {
    const a = audioRef.current;
    if (!a) return;
    if (playing) { a.pause(); setPlaying(false); }
    else { await a.play(); setPlaying(true); }
  };
  const setAnswer = (qid, patch) => setAnswers(prev => ({ ...prev, [qid]: { ...(prev[qid] || {}), ...patch } }));

  const revealTranscript = async () => {
  if (!attempt?.id) return;
  if (!(mode === "practice" && plays >= 2)) return;
  const { data, error } = await supabase.functions.invoke("get_listening_transcript", {
    body: { attempt_id: attempt.id },
  });
  if (error) return alert((data && data.error) || error.message);
  setTranscript(data.transcript_md);
};

  const onSubmit = async () => {
    if (!attempt?.id) return;
    setSubmitting(true);
    try {
      const payload = {
        attempt_id: attempt.id,
        responses: Object.entries(answers).map(([question_id, v]) => ({
          question_id,
          selected_option: v.selected_option ?? null,
          response_text: v.response_text ?? null,
        })),
      };
      // you can keep SDK here; it’s fine for submit; or mirror callStart with /submit_listening_attempt
      const { data, error } = await supabase.functions.invoke("submit_listening_attempt", { body: payload });
      if (error) throw new Error((data && data.error) || error.message || "Submit failed");
      setResult(data);
    } catch (e) {
      console.error("submit_listening_attempt error:", e);
      alert(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto mt-10">
        <h2 className="text-2xl font-bold mb-4">Listening Practice</h2>
        <p className="animate-pulse">Loading…</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto mt-10 px-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">Listening Practice</h2>
        <div className="flex items-center gap-3 text-sm">
          <label className="flex items-center gap-2">
            <input type="radio" name="mode" value="practice" checked={mode === "practice"} onChange={() => setMode("practice")} />
            Practice
          </label>
          <label className="flex items-center gap-2">
            <input type="radio" name="mode" value="exam" checked={mode === "exam"} onChange={() => setMode("exam")} />
            Exam
          </label>
        </div>
      </div>

      <div className="bg-blue-50 dark:bg-blue-500/20 p-4 rounded mb-6 text-sm">
        <p className="font-medium">Instructions</p>
        <ul className="list-disc ml-5">
          <li>You will hear the audio <strong>twice</strong>.</li>
          <li>No scrubbing; answer Sections A, B, and C.</li>
          <li>{mode === "practice" ? "Results show after submit." : "Results will be released after review."}</li>
        </ul>
      </div>

      <div className="mb-6">
        <div className="flex items-center gap-3">
          <button onClick={togglePlay} disabled={!audioUrl || plays >= 2} className="px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-50">
            {playing ? "Pause" : plays >= 2 ? "Finished (2 plays)" : "Play"}
          </button>
          <div className="text-sm">Plays: {plays} / 2</div>
        </div>
        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded mt-3">
          <div className="h-2 bg-blue-600 rounded" style={{ width: `${Math.floor(progress * 100)}%` }} />
        </div>
        <audio ref={audioRef} src={audioUrl ?? undefined} onTimeUpdate={onTimeUpdate} onEnded={onEnded} preload="auto" />
      </div>

      {mode === "practice" && (
  <div className="mb-6">
    <button
      onClick={revealTranscript}
      disabled={plays < 2}
      className="px-3 py-2 rounded bg-gray-200 dark:bg-gray-700 disabled:opacity-50"
    >
      {plays < 2 ? "Transcript available after 2 plays" : "Show transcript"}
    </button>
    {transcript && (
      <div className="prose dark:prose-invert mt-3" dangerouslySetInnerHTML={{ __html: transcript }} />
    )}
  </div>
)}

      <div className="space-y-8">
        <section>
          <h3 className="text-xl font-semibold mb-3">Section A — Multiple Choice (7)</h3>
          <div className="space-y-4">
            {questions.filter(q => q.qtype === "MCQ").map((q, i) => {
              const opts = q.meta?.options || [];
              return (
                <div key={q.id} className="p-4 rounded border border-gray-200 dark:border-gray-700">
                  <p className="font-medium mb-2">{i + 1}. <span dangerouslySetInnerHTML={{ __html: q.stem_md }} /></p>
                  <div className="grid sm:grid-cols-2 gap-2">
                    {opts.map((opt, idx) => {
                      const letter = String.fromCharCode(65 + idx);
                      return (
                        <label key={idx} className="flex items-center gap-2 p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer">
                          <input
                            type="radio"
                            name={q.id}
                            checked={answers[q.id]?.selected_option === letter}
                            onChange={() => setAnswer(q.id, { selected_option: letter })}
                          />
                          <span>{letter}) {opt}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section>
          <h3 className="text-xl font-semibold mb-3">Section B — Short Answers (3)</h3>
          <div className="space-y-4">
            {questions.filter(q => q.qtype === "OPEN").map((q, i) => (
              <div key={q.id} className="p-4 rounded border border-gray-200 dark:border-gray-700">
                <p className="font-medium mb-2">{i + 1}. <span dangerouslySetInnerHTML={{ __html: q.stem_md }} /></p>
                <input
                  type="text"
                  className="w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900"
                  value={answers[q.id]?.response_text || ""}
                  onChange={(e) => setAnswer(q.id, { response_text: e.target.value })}
                  placeholder="Type your answer…"
                />
              </div>
            ))}
          </div>
        </section>

        <section>
          <h3 className="text-xl font-semibold mb-3">Section C — Paragraph Cloze (10 gaps)</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            {questions.filter(q => q.qtype === "CLOZE").map((q) => (
              <div key={q.id} className="p-3 rounded border border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">Gap {q.meta?.gap_index}</p>
                <input
                  type="text"
                  className="w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900"
                  value={answers[q.id]?.response_text || ""}
                  onChange={(e) => setAnswer(q.id, { response_text: e.target.value })}
                  placeholder={`Gap ${q.meta?.gap_index}`}
                />
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-2">For demo, gaps are listed. Later, render inline in the paragraph.</p>
        </section>
      </div>

      <div className="mt-8 flex items-center gap-4">
        <button onClick={onSubmit} disabled={!attempt || submitting} className="px-5 py-2 rounded bg-green-600 text-white disabled:opacity-50">
          {submitting ? "Submitting…" : "Submit answers"}
        </button>
        <span className="text-sm text-gray-600 dark:text-gray-300">
          {plays < 2 ? "Audio can be played up to 2 times." : "Audio finished (2 plays)."}
        </span>
      </div>

      {mode === "practice" && result && (
        <div className="mt-6 p-4 rounded bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
          <p className="font-semibold mb-1">Auto results</p>
          <p className="text-sm">
            MCQ: <b>{result.mcqScore}</b> &nbsp;|&nbsp; Cloze: <b>{result.clozeScore}</b> &nbsp;|&nbsp; Open (auto): <b>{result.openScore}</b> &nbsp;|&nbsp; Total (auto): <b>{result.total}</b>
          </p>
          <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">Open questions need manual review in the Admin tab.</p>
        </div>
      )}
    </div>
  );
}
