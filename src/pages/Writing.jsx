import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "../lib/supabaseClient";

// Fallbacks if the prompt/version don't specify values
const TASKS = {
  concept_definition: { key: "concept_definition", label: "Concept definition", min: 100, max: 125, examSeconds: 15 * 60 },
  activity_design: { key: "activity_design", label: "Activity design", min: 150, max: 175, examSeconds: 25 * 60 },
};

const PROMPT_ID = "6b782801-037a-4eae-9b79-030a87e1fe4d"; // <-- put your prompt id here

function useDebouncedEffect(fn, deps, delay = 5000) {
  useEffect(() => { const h = setTimeout(fn, delay); return () => clearTimeout(h); }, [...deps, delay]);
}

function countWords(text) {
  return text.trim().replace(/\s+/g, " ").split(" ").filter(Boolean).length;
}

export default function Writing() {
  // UI state
  const [task, setTask] = useState("concept_definition");
  const [mode, setMode] = useState("practice"); // "practice" | "exam"
  const [content, setContent] = useState("");
  const [attempt, setAttempt] = useState(1);
  const [isSubmitted, setSubmitted] = useState(false);
  const [fontScale, setFontScale] = useState(0); // 0=base,1=lg,2=xl

  // Timer
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [isRunning, setRunning] = useState(false);
  const timerRef = useRef(null);
  const startedAtRef = useRef(null);

  // Supabase data
  const [submissionId, setSubmissionId] = useState(null);
  const [prompt, setPrompt] = useState(null);
  const [activeVersion, setActiveVersion] = useState(null);
  const [sourceText, setSourceText] = useState(null);
  const [loadingPrompt, setLoadingPrompt] = useState(true);
  const [latestFeedback, setLatestFeedback] = useState(null);

  // Derived
  const wordCount = useMemo(() => countWords(content), [content]);
  const label = TASKS[task]?.label || "Writing Task";

  const effectiveMin = useMemo(
    () => (activeVersion?.word_min ?? prompt?.word_min ?? TASKS[task]?.min ?? 0),
    [activeVersion, prompt, task]
  );
  const effectiveMax = useMemo(
    () => (activeVersion?.word_max ?? prompt?.word_max ?? TASKS[task]?.max ?? 9999),
    [activeVersion, prompt, task]
  );
  const effectiveExamSeconds = useMemo(
    () => (activeVersion?.timer_seconds ?? prompt?.timer_seconds ?? TASKS[task].examSeconds),
    [activeVersion, prompt, task]
  );
  const withinBand = wordCount >= effectiveMin && wordCount <= effectiveMax;

  const draftKey = useMemo(() => `writing_draft::${task}::${mode}::${attempt}`, [task, mode, attempt]);

  // -------- Auth (so RLS passes) --------
  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        const { error } = await supabase.auth.signInAnonymously(); // enable in Supabase if you use this
        if (error) console.error("Anon sign-in failed:", error);
      }
    })();
  }, []);

  // -------- Load prompt + version + source --------
  useEffect(() => {
    let isMounted = true;
    (async () => {
      setLoadingPrompt(true);

      // 1) Prompt
      const { data: p, error: e1 } = await supabase
        .from("prompts")
        .select("id,title,genre,word_min,word_max,timer_seconds,prompt_text_md,source_text_id,active_version_id")
        .eq("id", PROMPT_ID)
        .single();

      if (!isMounted) return;
      if (e1 || !p) {
        console.warn("Prompt fetch failed or not found:", e1);
        setLoadingPrompt(false);
        return;
      }
      setPrompt(p);

      // Align UI genre with prompt
      if (p.genre === "concept_definition" || p.genre === "activity_design") setTask(p.genre);

      // 2) Active version (or latest)
      let pv = null;
      if (p.active_version_id) {
        const { data: pvrow } = await supabase
          .from("prompt_versions")
          .select("id,prompt_text_md,word_min,word_max,timer_seconds,register,audience,source_text_id")
          .eq("id", p.active_version_id)
          .single();
        pv = pvrow;
      } else {
        const { data: pvrow } = await supabase
          .from("prompt_versions")
          .select("id,prompt_text_md,word_min,word_max,timer_seconds,register,audience,source_text_id,created_at")
          .eq("prompt_id", PROMPT_ID)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        pv = pvrow;
      }
      if (!isMounted) return;
      setActiveVersion(pv || null);

      // 3) Optional source text
      const stId = (pv && pv.source_text_id) || p.source_text_id;
      if (stId) {
        const { data: st } = await supabase
          .from("source_texts")
          .select("id,title,body_md,attribution")
          .eq("id", stId)
          .single();
        if (!isMounted) return;
        setSourceText(st || null);
      }

      setLoadingPrompt(false);
    })();

    return () => { isMounted = false; };
  }, []);

  // -------- Draft load / resets on attempt switch --------
  useEffect(() => {
    const saved = localStorage.getItem(draftKey);
    setContent(saved || "");
    setRunning(false);
    setSubmitted(false);
    // Reset client timer display to effective (will be correct per prompt/version or fallback)
    setSecondsLeft(effectiveExamSeconds);
    setSubmissionId(null); // new attempt starts fresh
  }, [draftKey, effectiveExamSeconds]);

  // -------- Start countdown only in exam mode --------
  useEffect(() => {
    if (!isRunning || mode !== "exam") return;
    timerRef.current = window.setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          if (timerRef.current) window.clearInterval(timerRef.current);
          timerRef.current = null;
          handleSubmit(); // auto-submit on timeout
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
      timerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRunning, mode]);

  useEffect(() => {
    if (!submissionId) return;
    (async () => {
      const { data, error } = await supabase
        .from("feedback")
        .select("id, rubric, overall_score, length_penalty_applied, comments_overall_md, created_at")
        .eq("submission_id", submissionId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!error) setLatestFeedback(data || null);
    })();
  }, [submissionId, isSubmitted]);

  // -------- Debounced autosave (local + DB) --------
  useDebouncedEffect(() => {
    if (!isSubmitted) {
      try { localStorage.setItem(draftKey, content); } catch { }
      autosaveDraftToDB(content);
    }
  }, [content, draftKey, isSubmitted], 5000);

  // -------- Supabase helpers --------
  async function startAttemptRPC(modeStr) {
    const { data, error } = await supabase.rpc("start_attempt", { p_prompt_id: PROMPT_ID, p_mode: modeStr });
    if (error) { console.error("start_attempt failed:", error); return null; }
    setSubmissionId(data.id);
    return data.id;
  }

  async function autosaveDraftToDB(text) {
    if (!submissionId) return;
    const { error } = await supabase
      .from("submissions")
      .update({ content_text: text, autosave_updated_at: new Date().toISOString() })
      .eq("id", submissionId)
      .eq("status", "draft");
    if (error) console.error("autosave failed:", error);
  }

  async function submitAttemptRPC(text) {
    if (!submissionId) return;
    const { error } = await supabase.rpc("submit_attempt", { p_submission_id: submissionId, p_content_text: text });
    if (error) console.error("submit_attempt failed:", error);
  }

  // -------- Handlers --------
  async function onChangeText(e) {
    const val = e.target.value;
    setContent(val);

    // First keystroke in practice mode → create draft row
    if (mode === "practice" && !submissionId) {
      const id = await startAttemptRPC("practice");
      if (!id) return; // localStorage still keeps your draft if this fails
    }
  }

  function formatMMSS(total) {
    const m = Math.floor(total / 60).toString().padStart(2, "0");
    const s = (total % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  }

  async function startExam() {
    if (mode !== "exam") return;
    // Ensure a draft submission exists before starting timer
    const id = submissionId || (await startAttemptRPC("exam"));
    if (!id) return;
    setRunning(true);
    startedAtRef.current = Date.now();
  }

  function stopExamTimer() {
    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = null;
    setRunning(false);
  }

  async function handleSubmit() {
    // If no submission yet (e.g., user typed zero chars or straight submit in practice), create it now
    if (!submissionId) {
      const id = await startAttemptRPC(mode === "exam" ? "exam" : "practice");
      if (!id) return;
    }
    if (mode === "exam") stopExamTimer();
    await submitAttemptRPC(content);
    setSubmitted(true);
    try { localStorage.removeItem(draftKey); } catch { }
  }

  function newAttempt() {
    setAttempt((a) => a + 1);
    setContent("");
    setSubmitted(false);
    setRunning(false);
  }

  const textSize = fontScale === 0 ? "text-base" : fontScale === 1 ? "text-lg" : "text-xl";

  return (
    <motion.div
      className="max-w-2xl mx-auto mt-10 px-4"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="mb-6">
        <h2 className="text-3xl font-bold mb-2">Writing Practice</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Pick a task, choose mode, and start writing. Drafts save automatically.
        </p>
      </div>

      {/* Prompt panel */}
      {loadingPrompt ? (
        <div className="mb-4 text-sm text-muted-foreground">Loading prompt…</div>
      ) : prompt ? (
        <div className="mb-4 rounded-md border p-3 bg-background">
          <div className="font-semibold">{prompt.title}</div>
          {activeVersion?.prompt_text_md && (
            <p className="text-sm mt-1 whitespace-pre-wrap">{activeVersion.prompt_text_md}</p>
          )}
          {sourceText?.body_md && (
            <div className="mt-3 rounded bg-muted p-2 text-sm whitespace-pre-wrap">
              {sourceText.body_md}
              {sourceText.attribution && (
                <div className="mt-1 text-xs text-muted-foreground">— {sourceText.attribution}</div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="mb-4 rounded-md border p-3 bg-yellow-50 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200">
          Couldn’t load the prompt. Double-check PROMPT_ID or RLS.
        </div>
      )}

      {/* Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
        <label className="flex flex-col">
          <span className="text-sm font-medium mb-1">Task</span>
          <select
            className="rounded-md border bg-background px-3 py-2"
            value={task}
            onChange={(e) => setTask(e.target.value)}
            disabled={isSubmitted || isRunning}
          >
            {Object.values(TASKS).map((t) => (
              <option key={t.key} value={t.key}>{t.label}</option>
            ))}
          </select>
        </label>

        <label className="flex flex-col">
          <span className="text-sm font-medium mb-1">Mode</span>
          <select
            className="rounded-md border bg-background px-3 py-2"
            value={mode}
            onChange={(e) => setMode(e.target.value)}
            disabled={isSubmitted || isRunning}
          >
            <option value="practice">Practice</option>
            <option value="exam">Exam</option>
          </select>
        </label>

        <div className="flex flex-col">
          <span className="text-sm font-medium mb-1">Font size</span>
          <div className="inline-flex rounded-md border overflow-hidden">
            <button
              type="button"
              className="px-3 py-2 disabled:opacity-50"
              onClick={() => setFontScale((f) => (f > 0 ? f - 1 : f))}
              disabled={fontScale === 0}
            >A-</button>
            <div className="px-3 py-2 border-l border-r">
              {fontScale === 0 ? "Base" : fontScale === 1 ? "Large" : "XL"}
            </div>
            <button
              type="button"
              className="px-3 py-2 disabled:opacity-50"
              onClick={() => setFontScale((f) => (f < 2 ? f + 1 : f))}
              disabled={fontScale === 2}
            >A+</button>
          </div>
        </div>
      </div>

      {/* Task band + timer */}
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm">
          <span className="font-medium">{label}</span>
          <span className="mx-2">•</span>
          <span>Target: {effectiveMin}–{effectiveMax} words</span>
        </div>
        {mode === "exam" ? (
          <div className="text-sm font-mono">
            {isRunning ? (
              <span>⏳ {formatMMSS(secondsLeft)}</span>
            ) : (
              <button
                type="button"
                onClick={startExam}
                className="text-primary underline"
                disabled={isSubmitted}
              >Start Exam</button>
            )}
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">Practice mode</div>
        )}
      </div>

      {/* Editor */}
      <div className="mb-4">
        <textarea
          className={`w-full rounded-md border bg-background p-3 leading-relaxed ${textSize}`}
          rows={12}
          placeholder={
            task === "concept_definition"
              ? "Define the concept (100–125 words), include 1 short example."
              : "Design an activity for 4º Primaria (150–175 words). Include objective, steps, and evaluation."
          }
          value={content}
          onChange={onChangeText}
          onPaste={(e) => { if (mode === "exam") e.preventDefault(); }}
          spellCheck={false}
          disabled={isSubmitted || (mode === "exam" && !isRunning)}
        />
      </div>

      {/* Live helpers */}
      {mode === "practice" && (
        <div className="flex items-center justify-between text-sm mb-4">
          <div>
            <span className="font-medium">{wordCount}</span> words
            {!withinBand && (
              <span className="ml-2 text-amber-600">Target: {effectiveMin}–{effectiveMax} words</span>
            )}
          </div>
          <div className="text-muted-foreground">Autosaves every 5s while typing</div>
        </div>
      )}

      {mode === "exam" && (
        <div className="text-xs text-muted-foreground mb-4">
          Word counter is hidden in Exam mode. Paste is disabled.
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={handleSubmit}
          className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-primary-foreground disabled:opacity-50"
          disabled={isSubmitted || (mode === "exam" && !isRunning)}
        >
          Submit
        </button>
        <button
          type="button"
          onClick={newAttempt}
          className="inline-flex items-center rounded-md border px-4 py-2"
          disabled={isRunning}
        >
          New Attempt
        </button>
        <div className="ml-auto text-sm text-muted-foreground">Attempt #{attempt}</div>
      </div>

      {/* Post-submit summary */}
      {isSubmitted && (
        <motion.div
          className="mt-6 rounded-md border p-4 bg-gray-50 dark:bg-gray-800"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <h3 className="font-semibold mb-2">Submission received</h3>
          <ul className="text-sm space-y-1">
            <li><strong>Task:</strong> {label}</li>
            <li><strong>Mode:</strong> {mode}</li>
            <li><strong>Words:</strong> {wordCount} {withinBand ? "✅ within target" : `⚠️ outside ${effectiveMin}–${effectiveMax}`}</li>
            {mode === "exam" && (
              <li className="text-muted-foreground">Scores/feedback will appear here later.</li>
            )}
          </ul>
        </motion.div>
      )}

      {latestFeedback && (
        <div className="mt-4 rounded-md border p-4 bg-background">
          <h4 className="font-semibold mb-2">Feedback</h4>
          <div className="text-sm grid grid-cols-2 gap-x-6 gap-y-1">
            {Object.entries(latestFeedback.rubric || {}).map(([k, v]) => (
              <div key={k}><span className="text-muted-foreground">{k}:</span> <span className="font-medium">{v}</span></div>
            ))}
            <div><span className="text-muted-foreground">Overall:</span> <span className="font-medium">{latestFeedback.overall_score?.toFixed(2)}</span></div>
            {latestFeedback.length_penalty_applied && <div className="text-amber-600 col-span-2">Length penalty applied (−0.5 on Task Achievement)</div>}
          </div>
          {latestFeedback.comments_overall_md && (
            <p className="text-sm whitespace-pre-wrap mt-3">{latestFeedback.comments_overall_md}</p>
          )}
        </div>
      )}
    </motion.div>
  );
}
