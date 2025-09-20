import { useEffect, useRef, useState, useMemo, memo } from "react";
import { useSearchParams } from "react-router-dom";
import { ensureSession, callFunctionRaw } from "../lib/supaFetch";
import { supabase } from "../lib/supabaseClient"; // For debug log
import ListeningResultPanel from "../components/ListeningResultPanel";
import OpenResponseFeedback from "../components/OpenResponseFeedback"; // Add this
import { logEvent } from "../lib/analytics"; // add at top

const ClozeParagraph = memo(({ template, clozeIndexToQid, answers, setAnswer }) => {
  const parts = [];
  const regex = /(\[\s*(\d+)\s*\])/g;
  let lastIndex = 0;
  let m;

  while ((m = regex.exec(template)) !== null) {
    const full = m[1];
    const idx = Number(m[2]);
    const start = m.index;

    if (start > lastIndex) {
      parts.push(template.slice(lastIndex, start));
    }

    const qid = clozeIndexToQid.get(idx);
    const value = qid ? (answers[qid]?.response_text ?? "") : "";

    parts.push(
      <input
        key={`gap-${idx}`}
        type="text"
        inputMode="text"
        className="mx-1 px-2 py-1 rounded border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-sm w-28 align-baseline"
        placeholder={`[${idx}]`}
        value={value}
        onChange={(e) => qid && setAnswer(qid, { response_text: e.target.value })}
      />
    );

    lastIndex = start + full.length;
  }
  if (lastIndex < template.length) {
    parts.push(template.slice(lastIndex));
  }

  return <p className="leading-7">{parts}</p>;
});

export default function Listening() {
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState("practice"); // "practice" | "exam"
  const [attempt, setAttempt] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [audioUrl, setAudioUrl] = useState(null);
  const [answers, setAnswers] = useState({});
  const [plays, setPlays] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [transcript, setTranscript] = useState(null);
  const [versionMeta, setVersionMeta] = useState(null);

  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  const [search] = useSearchParams();
  const promptId = search.get("prompt_id");

  const lastKeyRef = useRef(null);
  const startTsRef = useRef(0);

  useEffect(() => {
    (async () => {
      const key = `${mode}:${promptId || "latest"}`;
      if (import.meta.env.DEV && lastKeyRef.current === key) return;
      lastKeyRef.current = key;

      setLoading(true);
      try {
        await ensureSession();
        const payload = { mode };
        if (promptId) payload.prompt_id = promptId;

        const data = await callFunctionRaw("start_listening_attempt", payload);
        setAttempt(prev => (JSON.stringify(prev) !== JSON.stringify(data.attempt) ? data.attempt : prev));
        setQuestions(prev => (JSON.stringify(prev) !== JSON.stringify(data.questions) ? data.questions || [] : prev));
        setAudioUrl(prev => (prev !== data.asset?.signed_url ? data.asset?.signed_url || null : prev));
        setVersionMeta(prev => (JSON.stringify(prev) !== JSON.stringify(data.version) ? data.version || null : prev));

        setAnswers({});
        setPlays(0);
        setProgress(0);
        setResult(null);
        setTranscript(null);
      } catch (e) {
        console.error("start_listening_attempt error:", e);
        alert(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [mode, promptId]);

  useEffect(() => {
    logEvent("test_view", {
      context: "test",
      path: window.location.pathname,
      prompt_id: promptId || "latest"
    });
  }, [promptId]);


  // audio handlers
  const onTimeUpdate = () => {
    const a = audioRef.current;
    if (!a) return;
    const p = a.currentTime / Math.max(1, a.duration || 1);
    setProgress(Math.min(1, Math.max(0, p)));
  };
  const onEnded = () => { setPlaying(false); setPlays(p => p + 1); };
  const togglePlay = async () => {
    const a = audioRef.current;
    if (!a) return;
    // first interaction = start
    if (startTsRef.current === 0) {
      startTsRef.current = Date.now();
      // If you can identify the test, send it; otherwise omit
      logEvent("test_start", { test_id: promptId || "readiness_check_v1" });
    }
    if (playing) { a.pause(); setPlaying(false); }
    else { await a.play(); setPlaying(true); }
  };

  const setAnswer = (qid, patch) =>
    setAnswers(prev => ({ ...prev, [qid]: { ...(prev[qid] || {}), ...patch } }));

  const revealTranscript = async () => {
    if (!attempt?.id || !(mode === "practice" && plays >= 2)) return;
    try {
      const data = await callFunctionRaw("get_listening_transcript", { attempt_id: attempt.id });
      setTranscript(data.transcript_md);
    } catch (e) {
      alert(e.message);
    }
  };

  const onSubmit = async () => {
    if (!attempt?.id) return;
    console.log("Submitting with user:", await supabase.auth.getUser());
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
      console.log("Submission payload:", payload);
      const data = await callFunctionRaw("submit_listening_attempt", payload);
      setResult(data);
      // compute simple breakdown & duration
      const duration_s = startTsRef.current ? Math.round((Date.now() - startTsRef.current) / 1000) : 0;
      const counts = { mcqTotal: mcqs.length, clozeTotal: cloze.length, openTotal: opens.length };
      const breakdown = buildBreakdown({ result: data, counts });
      logEvent("test_complete", {
        test_id: promptId || "readiness_check_v1",
        score: data?.total ?? 0,
        duration_s,
        breakdown
      });
    } catch (e) {
      console.error("submit_listening_attempt error:", e);
      alert(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Derive section sets
  const { mcqs, opens, cloze } = useMemo(() => {
    const mcqs = [];
    const opens = [];
    const cloze = [];
    questions.forEach(q => {
      if (q.qtype === "MCQ") mcqs.push(q);
      else if (q.qtype === "OPEN") opens.push(q);
      else if (q.qtype === "CLOZE") cloze.push(q);
    });
    return { mcqs, opens, cloze };
  }, [questions]);

  // Map cloze gap_index -> question_id
  const clozeIndexToQid = useMemo(() => {
    const m = new Map();
    cloze.forEach(q => {
      const idx = q?.meta?.gap_index;
      if (idx != null) m.set(Number(idx), q.id);
    });
    return m;
  }, [cloze]);

  // Build cloze template
  const explicitClozeTemplate = useMemo(() => {
    const explicit = versionMeta?.cloze_template_md;
    if (explicit && typeof explicit === "string" && explicit.includes("[")) return explicit;
    return null;
  }, [versionMeta]);

  const clozeTemplate = useMemo(() => {
    if (explicitClozeTemplate) return explicitClozeTemplate;
    if (!cloze || cloze.length === 0) return null;

    const stems = cloze
      .slice()
      .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))
      .map(q => (q.stem_md || "").trim())
      .filter(Boolean);

    if (stems.length === 0) return null;

    const uniq = Array.from(new Set(stems));
    const anyPlaceholders = uniq.some(s => /\[\s*\d+\s*\]/.test(s));
    if (!anyPlaceholders) return null;

    return uniq.join(" ");
  }, [explicitClozeTemplate, cloze]);

  // A tiny helper to build a simple category breakdown from section scores TO BE EDITED LATER
  function buildBreakdown({ result, counts }) {
    const { mcqScore = 0, clozeScore = 0, openScore = 0 } = result || {};
    return {
      Detalle: mcqScore,
      Ortografía: clozeScore,
      Vocabulario: openScore / 2 // Normalize to match MCQ/CLOZE scale (assuming 2 points max per OPEN)
    };
  }

  // Conditional rendering for loading state
  if (loading) {
    return (
      <div className="max-w-2xl mx-auto mt-10">
        <h2 className="text-2xl font-bold mb-4">Listening Practice</h2>
        <p className="animate-pulse">Loading…</p>
      </div>
    );
  }

  const hasA = mcqs.length > 0;
  const hasB = opens.length > 0;
  const hasC = cloze.length > 0;
  const labelForCloze = (hasA && hasB ? "C" : (hasA || hasB) ? "B" : "A");

  return (
    <div className="max-w-6xl mx-auto mt-6 px-4">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-2xl font-bold">Listening Practice</h2>
        <div className="flex items-center gap-3 text-sm">
          <span className="hidden sm:inline text-gray-500 dark:text-gray-400">
            Best on a laptop/desktop — mobiles are not ideal for this task.
          </span>
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

      <div className="bg-blue-50 dark:bg-blue-500/20 p-3 rounded mb-4 text-sm">
        <p className="font-medium">Instructions</p>
        <ul className="list-disc ml-5">
          <li>You will hear the audio <strong>twice</strong>.</li>
          <li>
            Answer {[
              hasA && "Multiple Choice",
              hasB && "Short Answers",
              hasC && "Cloze"
            ].filter(Boolean).join(", ")} at the same time (all visible).
          </li>
          <li>{mode === "practice" ? "Results show after submit." : "Results will be released after review."}</li>
        </ul>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <div className="p-4 rounded border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <button
                onClick={togglePlay}
                disabled={!audioUrl || plays >= 2}
                className="px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-50"
              >
                {playing ? "Pause" : plays >= 2 ? "Finished (2 plays)" : "Play"}
              </button>
              <div className="text-sm">Plays: {plays} / 2</div>
            </div>
            <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded mt-3">
              <div className="h-2 bg-blue-600 rounded" style={{ width: `${Math.floor(progress * 100)}%` }} />
            </div>
            <audio
              ref={audioRef}
              src={audioUrl ?? undefined}
              onTimeUpdate={onTimeUpdate}
              onEnded={onEnded}
              preload="auto"
            />
            {mode === "practice" && (
              <div className="mt-3">
                <button
                  onClick={revealTranscript}
                  disabled={plays < 2}
                  className="px-3 py-2 rounded bg-gray-200 dark:bg-gray-700 disabled:opacity-50 text-sm"
                >
                  {plays < 2 ? "Transcript available after 2 plays" : "Show transcript"}
                </button>
                {transcript && (
                  <div
                    className="prose dark:prose-invert mt-3 max-w-none"
                    dangerouslySetInnerHTML={{ __html: transcript }}
                  />
                )}
              </div>
            )}
          </div>

          {hasA && (
            <section className="p-4 rounded border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold mb-3">Multiple Choice ({mcqs.length})</h3>
              <div className="space-y-4">
                {mcqs.map((q, i) => {
                  const opts = q.meta?.options || [];
                  return (
                    <div key={q.id}>
                      <p className="font-medium mb-2">
                        {i + 1}. <span dangerouslySetInnerHTML={{ __html: q.stem_md }} />
                      </p>
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
          )}
        </div>

        <div className="space-y-6">
          {hasB && (
            <section className="p-4 rounded border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold mb-3">
                Short Answers ({opens.length})
              </h3>
              <div className="space-y-4">
                {opens.map((q, i) => (
                  <div key={q.id}>
                    <p className="font-medium mb-2">
                      {i + 1}. <span dangerouslySetInnerHTML={{ __html: q.stem_md }} />
                    </p>
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
          )}

          {hasC && (
            <section className="p-4 rounded border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold mb-3">
                Paragraph Cloze ({cloze.length}) — Section {labelForCloze}
              </h3>

              {clozeTemplate ? (
                <div className="prose dark:prose-invert max-w-none">
                  <ClozeParagraph
                    template={clozeTemplate}
                    clozeIndexToQid={clozeIndexToQid}
                    answers={answers}
                    setAnswer={setAnswer}
                  />
                </div>
              ) : (
                <>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                    (No paragraph template found—showing gaps as a list for this exercise.)
                  </p>
                  <div className="grid sm:grid-cols-2 gap-4">
                    {cloze.map((q) => (
                      <div key={q.id} className="p-3 rounded border border-gray-200 dark:border-gray-700">
                        <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                          Gap {q.meta?.gap_index}
                        </p>
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
                </>
              )}
              <p className="text-xs text-gray-500 mt-2">
                Tip: Click each gap and type the exact word(s) you hear.
              </p>
            </section>
          )}
        </div>
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
      {mode === "practice" && result && (
        <div className="mt-6">
          <ListeningResultPanel
            score={result.total}
            breakdown={buildBreakdown({
              result,
              counts: { mcqTotal: mcqs.length, clozeTotal: cloze.length, openTotal: opens.length }
            })}
            total={(mcqs.length + cloze.length + opens.length) || 3}
            testTitle={versionMeta?.title || "Readiness Check"}
          />
          <OpenResponseFeedback attemptId={attempt.id} />
        </div>
      )}
    </div>
  );
}