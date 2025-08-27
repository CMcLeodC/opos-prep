import React from "react";
import { motion } from "framer-motion";

/**
 * Props:
 * - status: { id, status, attempt_number, submitted_at, word_count, length_violation } | null
 * - feedback: { rubric, overall_score, length_penalty_applied, comments_overall_md, created_at } | null
 * - loading: boolean
 * - error: string
 * - onRefresh: () => void
 */
export default function FeedbackPanel({ status, feedback, loading, error, onRefresh }) {
  // Always render the panel to make “Refresh” available, even if there’s no submission yet.
  return (
    <motion.div
      key={`fb-${status?.id || "none"}`}
      className="mt-4 rounded-md border p-4 bg-background"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <div className="flex items-center justify-between">
        <h4 className="font-semibold">Feedback</h4>
        <div className="flex items-center gap-2">
          {error && <span className="text-xs text-red-600">{error}</span>}
          <button
            type="button"
            onClick={onRefresh}
            className="rounded-md border px-3 py-1.5 text-sm disabled:opacity-50 cursor-pointer"
            disabled={loading}
          >
            {loading ? "Checking…" : "Refresh"}
          </button>
        </div>
      </div>

      {!status ? (
        <p className="text-sm text-muted-foreground mt-2">
          You haven't submitted anything for this prompt yet.
        </p>
      ) : status.status === "submitted" && !feedback ? (
        <div className="text-sm mt-2">
          <div className="text-muted-foreground">
            Submitted {new Date(status.submitted_at).toLocaleString()} — pending review.
          </div>
          <div className="text-xs mt-1">
            {status.word_count ?? "—"} words {status.length_violation ? "• ⚠ length violation" : ""}
          </div>
        </div>
      ) : feedback ? (
        <div className="mt-3">
          <div className="text-xs text-muted-foreground">
            Attempt #{status?.attempt_number} • Returned{" "}
            {feedback.created_at ? new Date(feedback.created_at).toLocaleString() : ""}
          </div>

          <div className="text-sm grid grid-cols-2 gap-x-6 gap-y-1 mt-2">
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
            <p className="text-sm whitespace-pre-wrap mt-3">{feedback.comments_overall_md}</p>
          )}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground mt-2">
          No feedback yet for your latest submission.
        </p>
      )}
    </motion.div>
  );
}
