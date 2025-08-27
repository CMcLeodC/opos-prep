import React from "react";

export default function PromptPanel({ loading, prompt, activeVersion, sourceText }) {
  if (loading) {
    return <div className="mb-4 text-sm text-muted-foreground">Loading prompt…</div>;
  }
  if (!prompt) {
    return (
      <div className="mb-4 rounded-md border p-3 bg-yellow-50 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200">
        Couldn't load the prompt. Double-check PROMPT_ID or RLS.
      </div>
    );
  }
  return (
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
  );
}
