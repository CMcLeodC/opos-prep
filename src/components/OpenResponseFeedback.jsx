// src/components/OpenResponseFeedback.jsx
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient"; // Adjust path

export default function OpenResponseFeedback({ attemptId }) {
  const [feedback, setFeedback] = useState([]);

  useEffect(() => {
    async function fetchFeedback() {
      console.log("Fetching feedback for attempt:", attemptId);
      const { data, error } = await supabase
        .from("listening_responses")
        .select("question_id, response_text, ai_explanation, listening_questions(stem_md, qtype)")
        .eq("attempt_id", attemptId)
        .eq("listening_questions.qtype", "OPEN");
      console.log("Feedback data:", data, "Error:", error);
      if (error) {
        console.error("Error fetching feedback:", error);
        return;
      }
      // Filter only valid OPEN responses
      const validFeedback = (data || []).filter(
        (item) => item.listening_questions && item.listening_questions.qtype === "OPEN"
      );
      setFeedback(validFeedback);
    }
    fetchFeedback();
  }, [attemptId]);

  if (!feedback.length) return <p>No open response feedback available.</p>;

  return (
    <div className="mt-6 max-w-xl mx-auto p-6 border rounded">
      <h3 className="text-xl font-bold mb-4">Open Response Feedback</h3>
      <div className="space-y-4">
        {feedback.map(({ question_id, response_text, ai_explanation, listening_questions }) => (
          <div key={question_id} className="p-4 bg-gray-50 dark:bg-gray-800 rounded">
            <p className="font-medium" dangerouslySetInnerHTML={{ __html: listening_questions.stem_md || "Question not found" }} />
            <p className="text-sm mt-1"><strong>Your answer:</strong> {response_text || "No answer"}</p>
            <p className="text-sm mt-1"><strong>Feedback:</strong> {ai_explanation || "Pending"}</p>
          </div>
        ))}
      </div>
    </div>
  );
}