import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "../lib/supabaseClient";
import PromptPanel from "../components/PromptPanel";
import FeedbackPanel from "../components/FeedbackPanel";
import Controls from "../components/Controls";
import TimerBar from "../components/TimerBar";
import SubmissionSummary from "../components/SubmissionSummary";


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
  const [latestStatus, setLatestStatus] = useState(null); // latest {status, attempt, submitted_at, ...} for this prompt
  const [latestFeedback, setLatestFeedback] = useState(null);
  const [fbLoading, setFbLoading] = useState(false);
  const [fbErr, setFbErr] = useState("");


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
    if (isSubmitted && submissionId) {
      loadFeedback();
    }
  }, [isSubmitted, submissionId]);

  useEffect(() => {
    loadLatestStatusAndFeedback();
  }, [prompt?.id]); // or [] if PROMPT_ID is fixed


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

  async function loadFeedback() {
    if (!submissionId) return;
    setFbLoading(true);
    setFbErr("");
    const { data, error } = await supabase
      .from("feedback")
      .select("id, rubric, overall_score, length_penalty_applied, comments_overall_md, created_at")
      .eq("submission_id", submissionId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) setFbErr(error.message || "Failed to load feedback");
    setLatestFeedback(data || null);
    setFbLoading(false);
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
    if (!submissionId) {
      const id = await startAttemptRPC(mode === "exam" ? "exam" : "practice");
      if (!id) return;
    }
    if (mode === "exam") stopExamTimer();
    await submitAttemptRPC(content);
    setSubmitted(true);
    try { localStorage.removeItem(draftKey); } catch { }
    // kick a refresh so the panel shows "submitted (pending review)"
    loadLatestStatusAndFeedback();
  }


  function newAttempt() {
    setAttempt((a) => a + 1);
    setContent("");
    setSubmitted(false);
    setRunning(false);
    setSecondsLeft(effectiveExamSeconds);
    setSubmissionId(null);
    // don't clear latestStatus/Feedback; those show your last returned result for this prompt
  }


  async function loadLatestStatusAndFeedback() {
    // ensure session so RLS allows reads
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      await supabase.auth.signInAnonymously(); // if you allow anon students
    }

    setFbLoading(true);
    setFbErr("");
    let status = null;
    let feedback = null;

    // Prefer latest returned
    const { data: ret, error: e1 } = await supabase
      .from("submissions")
      .select("id,status,attempt_number,submitted_at,word_count,length_violation,length_delta")
      .eq("prompt_id", PROMPT_ID)
      .eq("status", "returned")
      .order("submitted_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (e1) setFbErr(e1.message || "Failed to load submissions");

    if (ret) {
      status = ret;
      const { data: fb, error: e2 } = await supabase
        .from("feedback")
        .select("id,rubric,overall_score,length_penalty_applied,comments_overall_md,created_at")
        .eq("submission_id", ret.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!e2) feedback = fb || null;
    } else {
      // Otherwise show latest submitted (pending)
      const { data: subm } = await supabase
        .from("submissions")
        .select("id,status,attempt_number,submitted_at,word_count,length_violation,length_delta")
        .eq("prompt_id", PROMPT_ID)
        .eq("status", "submitted")
        .order("submitted_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (subm) status = subm;
    }

    setLatestStatus(status);
    setLatestFeedback(feedback);
    setFbLoading(false);
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

      <PromptPanel
        loading={loadingPrompt}
        prompt={prompt}
        activeVersion={activeVersion}
        sourceText={sourceText}
      />

      <Controls
        task={task}
        onTaskChange={(v) => setTask(v)}
        mode={mode}
        onModeChange={(v) => setMode(v)}
        fontScale={fontScale}
        onFontScale={(v) => setFontScale(v)}
        tasksMap={TASKS}
        disabled={isSubmitted || isRunning}
      />


      <TimerBar
        label={label}
        // If you have effectiveMin/effectiveMax in your JS file, pass those instead:
        minWords={effectiveMin}
        maxWords={effectiveMax}
        mode={mode}
        isRunning={isRunning}
        secondsLeft={secondsLeft}
        onStartExam={startExam}
        isSubmitLocked={isSubmitted}
      />


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

      <FeedbackPanel
        status={latestStatus}
        feedback={latestFeedback}
        loading={fbLoading}
        error={fbErr}
        onRefresh={loadLatestStatusAndFeedback}
      />
    </motion.div>
  );
}
