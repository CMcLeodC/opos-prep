import React from "react";

/**
 * Props:
 * - label
 * - minWords, maxWords  (or pass effectiveMin/effectiveMax as these)
 * - mode: "practice" | "exam"
 * - isRunning: boolean
 * - secondsLeft: number
 * - onStartExam: () => void
 * - isSubmitLocked: boolean (usually isSubmitted)
 */
export default function TimerBar({
  label,
  minWords,
  maxWords,
  mode,
  isRunning,
  secondsLeft,
  onStartExam,
  isSubmitLocked,
}) {
  function formatMMSS(total) {
    const m = Math.floor(total / 60).toString().padStart(2, "0");
    const s = (total % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  }

  return (
    <div className="flex items-center justify-between mb-2">
      <div className="text-sm">
        <span className="font-medium">{label}</span>
        <span className="mx-2">•</span>
        <span>Target: {minWords}–{maxWords} words</span>
      </div>
      {mode === "exam" ? (
        <div className="text-sm font-mono">
          {isRunning ? (
            <span>⏳ {formatMMSS(secondsLeft)}</span>
          ) : (
            <button
              type="button"
              onClick={onStartExam}
              className="text-primary underline cursor-pointer"
              disabled={isSubmitLocked}
            >
              Start Exam
            </button>
          )}
        </div>
      ) : (
        <div className="text-sm text-muted-foreground">Practice mode</div>
      )}
    </div>
  );
}
