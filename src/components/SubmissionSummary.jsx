import React from "react";

/**
 * Props:
 * - show: boolean (isSubmitted)
 * - label, mode
 * - wordCount
 * - withinBand: boolean
 * - minWords, maxWords
 */
export default function SubmissionSummary({
  show,
  label,
  mode,
  wordCount,
  withinBand,
  minWords,
  maxWords,
}) {
  if (!show) return null;
  return (
    <div className="mt-6 rounded-md border p-4">
      <h3 className="font-semibold mb-2">Submission received</h3>
      <ul className="text-sm space-y-1">
        <li><span className="font-medium">Task:</span> {label}</li>
        <li><span className="font-medium">Mode:</span> {mode}</li>
        <li>
          <span className="font-medium">Words:</span> {wordCount}{" "}
          {withinBand ? "✅ within target" : `⚠️ outside ${minWords}–${maxWords}`}
        </li>
        {mode === "exam" && (
          <li className="text-muted-foreground">Scores/feedback will appear here later.</li>
        )}
      </ul>
    </div>
  );
}
