import { useEffect, useState, useMemo, useRef } from "react";
import { supabase } from "../lib/supabaseClient";
import { requireAdminEmail } from "../lib/adminGuard";

export default function AdminListeningCreate() {
  const [ok, setOk] = useState(null);
  const [step, setStep] = useState(1);

  // Step 1 – ingest (existing)
  const [title, setTitle] = useState("");
  const [audioName, setAudioName] = useState("");
  const [audioList, setAudioList] = useState([]);
  const [transcript, setTranscript] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [tags, setTags] = useState("");

  // Step 2 – cloze
  const [clozeTemplate, setClozeTemplate] = useState("");
  const [clozeItems, setClozeItems] = useState([]); // [{ gap_index, answer }]

  // Step 3 – MCQ
  const [mcqs, setMcqs] = useState([]); // [{ stem_md, options:[...4], correct:'A'|'B'|'C'|'D' }]

  // Step 4 – OPEN
  const [opens, setOpens] = useState([]); // [{ stem_md, key, variants?:[], evidence?:[{start_idx,end_idx,note?}] }]

  useEffect(() => { (async () => setOk(await requireAdminEmail()))(); }, []);

  useEffect(() => {
    if (ok !== true) return;
    (async () => {
      const { data, error } = await supabase.functions.invoke("list_audio_objects_admin");
      if (!error && Array.isArray(data?.items)) setAudioList(data.items);
    })();
  }, [ok]);

  const nextDisabled = step === 1 ? (!title || !audioName || !transcript) : false;

  const goNext = () => {
    if (nextDisabled) return alert("Title, audio and transcript are required");
    setStep(s => Math.min(5, s + 1));
  };
  const goBack = () => setStep(s => Math.max(1, s - 1));

  if (ok === null) return <div className="p-6">Checking access…</div>;
  if (!ok) return <div className="p-6 text-red-600">Forbidden (admin only)</div>;

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-4">Create Listening Test</h2>

      <ol className="flex gap-2 text-sm mb-6 flex-wrap">
        {["Ingest","Cloze","MCQ","Short","Preview"].map((t, i)=>(
          <li key={t} className={`px-3 py-1 rounded ${step===i+1?'bg-blue-600 text-white':'bg-gray-200 dark:bg-gray-700'}`}>{i+1}. {t}</li>
        ))}
      </ol>

      <div className="border rounded p-4">
        {/* STEP 1 */}
        {step === 1 && (
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium mb-1">Title *</label>
              <input
                value={title}
                onChange={e=>setTitle(e.target.value)}
                className="w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900"
                placeholder="e.g., BBC — Autism transitions (clip)"
              />

              <label className="block text-sm font-medium mt-4 mb-1">Audio object (from ‘listening-audio’) *</label>
              <select
                value={audioName}
                onChange={e=>setAudioName(e.target.value)}
                className="w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900"
              >
                <option value="">— Select audio —</option>
                {audioList.map(n => <option key={n} value={n}>{n}</option>)}
              </select>

              <p className="text-xs text-gray-500 mt-1">Or paste exact object name:</p>
              <input
                value={audioName}
                onChange={e=>setAudioName(e.target.value)}
                className="w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900"
                placeholder="witnesshistory_2025-04-02_wonder-woman_03m42s-06m29s.mp3"
              />

              <label className="block text-sm font-medium mt-4 mb-1">Source URL (optional)</label>
              <input
                value={sourceUrl}
                onChange={e=>setSourceUrl(e.target.value)}
                className="w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900"
                placeholder="https://www.bbc.co.uk/programmes/..."
              />

              <label className="block text-sm font-medium mt-4 mb-1">Tags (comma separated)</label>
              <input
                value={tags}
                onChange={e=>setTags(e.target.value)}
                className="w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900"
                placeholder="bbc, autism, education"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Transcript (paste, verified) *</label>
              <textarea
                value={transcript}
                onChange={e=>setTranscript(e.target.value)}
                rows={16}
                className="w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900"
                placeholder="Paste the exact transcript here..."
              />
              <p className="text-xs text-gray-500 mt-1">
                We store this as both version transcript and a verified transcript record.
              </p>
            </div>
          </div>
        )}

        {/* STEP 2 – CLOZE */}
        {step === 2 && (
          <ClozeBuilder
            transcript={transcript}
            clozeTemplate={clozeTemplate}
            setClozeTemplate={setClozeTemplate}
            clozeItems={clozeItems}
            setClozeItems={setClozeItems}
          />
        )}

        {/* STEP 3 – MCQ */}
        {step === 3 && (
          <McqBuilder mcqs={mcqs} setMcqs={setMcqs} transcript={transcript} />
        )}

        {/* STEP 4 – OPEN */}
        {step === 4 && (
          <OpenBuilder opens={opens} setOpens={setOpens} transcript={transcript} />
        )}

        {/* STEP 5 – PREVIEW/PUBLISH */}
        {step === 5 && (
          <PreviewAndPublish
            draft={{
              title,
              audio_storage_path: audioName,
              transcript_text: transcript,
              source_url: sourceUrl || null,
              tags: tags.split(",").map(s=>s.trim()).filter(Boolean),
              cloze_template_md: clozeTemplate || null,
              cloze_items: clozeItems,
              mcqs,
              opens
            }}
          />
        )}
      </div>

      <div className="mt-4 flex gap-2">
        <button onClick={goBack} className="px-3 py-2 rounded bg-gray-200 dark:bg-gray-700">Back</button>
        <button onClick={goNext} className="px-3 py-2 rounded bg-blue-600 text-white">Next</button>
      </div>
    </div>
  );
}

/* -----------------------
   Cloze Builder (Step 2)
------------------------*/

function splitWordsWithOffsets(text) {
  // returns [{word, start, end, isWord}]
  const out = [];
  let i = 0;
  const re = /([A-Za-z][A-Za-z'-]*|\s+|[^\sA-Za-z]+)/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    const chunk = m[0];
    const start = m.index;
    const end = start + chunk.length;
    const isWord = /^[A-Za-z]/.test(chunk);
    out.push({ word: chunk, start, end, isWord });
  }
  return out;
}

function ClozeBuilder({ transcript, clozeTemplate, setClozeTemplate, clozeItems, setClozeItems }) {
  const tokens = useMemo(() => splitWordsWithOffsets(transcript || ""), [transcript]);
  const [selected, setSelected] = useState([]); // [{start,end,text}]

  const toggleToken = (t) => {
    if (!t.isWord) return;
    const exists = selected.find(s => s.start === t.start && s.end === t.end);
    if (exists) setSelected(prev => prev.filter(s => !(s.start === t.start && s.end === t.end)));
    else setSelected(prev => [...prev, { start: t.start, end: t.end, text: t.word }]);
  };

  // build cloze template by replacing selected spans with [ n ]
  const buildTemplate = () => {
    const ordered = [...selected].sort((a, b) => a.start - b.start);
    let result = "";
    let cursor = 0;
    const items = [];
    let gap = 1;

    for (const s of ordered) {
      if (s.start < cursor) continue; // skip overlaps
      result += transcript.slice(cursor, s.start);
      result += `[ ${gap} ]`;
      items.push({ gap_index: gap, answer: s.text });
      cursor = s.end;
      gap += 1;
    }
    result += transcript.slice(cursor);

    setClozeTemplate(result);
    setClozeItems(items);
  };

  const clearAll = () => {
    setSelected([]);
    setClozeTemplate("");
    setClozeItems([]);
  };

  // naive auto-suggest: choose 10 longest unique words not in a stoplist
  const autoSuggest = () => {
    const stop = new Set([
      "the","and","for","that","with","this","from","have","they","you","your","our","are","was","were","but","not","has","had","she","him","her","their","them","his","its","it's","of","to","in","on","as","at","by","be","or","an","a","is","it","we","i"
    ]);
    const words = tokens.filter(t => t.isWord).map(t => ({
      text: t.word,
      start: t.start,
      end: t.end,
      len: t.word.length
    }));
    const uniq = [];
    const seen = new Set();
    for (const w of words) {
      const key = w.text.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      if (w.len >= 5 && !stop.has(key)) uniq.push(w);
    }
    uniq.sort((a, b) => b.len - a.len);
    const take = uniq.slice(0, Math.min(10, uniq.length)).map(u => ({ start: u.start, end: u.end, text: u.text }));
    setSelected(take);
  };

  return (
    <div>
      <p className="text-sm mb-3">Click words to turn them into gaps. Use “Auto-suggest” to preselect up to 10 longer words, then “Build template”.</p>

      <div className="grid md:grid-cols-2 gap-6">
        {/* transcript viewer */}
        <div className="p-3 rounded border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-sm leading-7">
          {tokens.map((t, i) => {
            if (!t.isWord) return <span key={i}>{t.word}</span>;
            const isSel = selected.some(s => s.start === t.start && s.end === t.end);
            return (
              <button
                key={i}
                type="button"
                onClick={() => toggleToken(t)}
                className={`px-0.5 rounded ${isSel ? "bg-yellow-200 dark:bg-yellow-700" : "hover:bg-gray-200 dark:hover:bg-gray-800"}`}
                title={isSel ? "Click to unselect" : "Click to make a gap"}
              >
                {t.word}
              </button>
            );
          })}
        </div>

        {/* template preview */}
        <div>
          <div className="flex gap-2 mb-2">
            <button onClick={autoSuggest} className="px-3 py-1 rounded bg-gray-200 dark:bg-gray-700">Auto-suggest</button>
            <button onClick={buildTemplate} className="px-3 py-1 rounded bg-blue-600 text-white">Build template</button>
            <button onClick={clearAll} className="px-3 py-1 rounded bg-gray-200 dark:bg-gray-700">Clear</button>
          </div>
          <label className="block text-sm font-medium mb-1">Cloze template</label>
          <textarea
            rows={12}
            value={clozeTemplate}
            onChange={e => setClozeTemplate(e.target.value)}
            className="w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900"
            placeholder="Paragraph with [ 1 ], [ 2 ] ..."
          />
          <p className="text-xs text-gray-500 mt-1">Cloze items (answers) will be included in the payload automatically.</p>
          {!!clozeItems.length && (
            <div className="mt-2 text-xs">
              <b>Answers:</b> {clozeItems.map(ci => `[${ci.gap_index}:${ci.answer}]`).join(" · ")}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* -----------------------
   MCQ Builder (Step 3)
------------------------*/

function emptyMcq() {
  return { stem_md: "", options: ["","","",""], correct: "A" };
}

function McqBuilder({ mcqs, setMcqs, transcript }) {
  const add = () => setMcqs(prev => [...prev, emptyMcq()]);
  const remove = (idx) => setMcqs(prev => prev.filter((_, i) => i !== idx));
  const update = (idx, patch) => setMcqs(prev => prev.map((m, i) => i === idx ? { ...m, ...patch } : m));
  const updateOpt = (idx, optIdx, val) => setMcqs(prev => prev.map((m, i) => i === idx ? { ...m, options: m.options.map((o, j) => j===optIdx ? val : o) } : m));

  // super-light helper: suggest stem by copying selected text from transcript area (if you want)
  const transcriptRef = useRef(null);
  const getSelectionText = () => {
    const sel = window.getSelection();
    return sel ? String(sel.toString() || "").trim() : "";
  };
  const pasteSelectionInto = (idx) => {
    const text = getSelectionText();
    if (!text) return;
    update(idx, { stem_md: `According to the audio: "${text}" — what does this refer to?` });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm">Add multiple-choice questions (4 options, mark the correct answer).</p>
        <button onClick={add} className="px-3 py-1 rounded bg-blue-600 text-white">+ Add MCQ</button>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div ref={transcriptRef} className="p-3 rounded border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-sm">
          <div className="text-xs text-gray-500 mb-2">Tip: select snippet here, then use “Use selection” on a question.</div>
          {transcript}
        </div>

        <div className="space-y-4">
          {mcqs.map((m, i) => (
            <div key={i} className="border rounded p-3">
              <div className="flex justify-between items-center">
                <div className="font-medium">MCQ {i+1}</div>
                <div className="flex gap-2">
                  <button onClick={() => pasteSelectionInto(i)} className="px-2 py-1 text-xs rounded bg-gray-200 dark:bg-gray-700">Use selection</button>
                  <button onClick={() => remove(i)} className="px-2 py-1 text-xs rounded bg-red-600 text-white">Delete</button>
                </div>
              </div>
              <label className="block text-sm font-medium mt-2">Stem</label>
              <textarea rows={2} value={m.stem_md} onChange={e=>update(i,{stem_md:e.target.value})}
                className="w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900" />

              <div className="grid grid-cols-2 gap-2 mt-2">
                {["A","B","C","D"].map((L, j) => (
                  <div key={L}>
                    <label className="text-xs font-medium">Option {L}</label>
                    <input value={m.options[j]} onChange={e=>updateOpt(i, j, e.target.value)}
                      className="w-full px-2 py-1 rounded border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900" />
                  </div>
                ))}
              </div>

              <div className="mt-2">
                <label className="text-xs font-medium mr-2">Correct</label>
                <select value={m.correct} onChange={e=>update(i,{correct:e.target.value})}
                  className="px-2 py-1 rounded border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                  {["A","B","C","D"].map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
          ))}
          {mcqs.length === 0 && <p className="text-sm text-gray-500">No MCQs yet.</p>}
        </div>
      </div>
    </div>
  );
}

/* -----------------------------
   Short Answer Builder (Step 4)
------------------------------*/

function OpenBuilder({ opens, setOpens, transcript }) {
  const [selection, setSelection] = useState(null); // {start,end,text}
  const textRef = useRef(null);

  const captureSelection = () => {
    const el = textRef.current;
    if (!el) return;
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    if (!el.contains(range.commonAncestorContainer)) return;

    // Map selection to offsets relative to transcript text node
    // Simpler approach: use the raw transcript string and find the first match
    const text = String(sel.toString() || "");
    if (!text) return;
    const base = transcript;
    const idx = base.indexOf(text);
    if (idx < 0) return;
    setSelection({ start: idx, end: idx + text.length, text });
  };

  useEffect(() => {
    document.addEventListener("mouseup", captureSelection);
    return () => document.removeEventListener("mouseup", captureSelection);
  }, [transcript]);

  const add = () => setOpens(prev => [...prev, { stem_md: "", key: "", variants: [], evidence: [] }]);
  const remove = (idx) => setOpens(prev => prev.filter((_, i) => i !== idx));
  const update = (idx, patch) => setOpens(prev => prev.map((o, i) => i === idx ? { ...o, ...patch } : o));
  const addVariant = (idx) => setOpens(prev => prev.map((o, i) => i === idx ? { ...o, variants: [...(o.variants||[]), ""] } : o));
  const setVariant = (idx, vIdx, val) => setOpens(prev => prev.map((o, i) => i === idx ? { ...o, variants: o.variants.map((v,j)=> j===vIdx?val:v) } : o));
  const addEvidence = (idx) => {
    if (!selection) return alert("Select a phrase in the transcript (left) first.");
    setOpens(prev => prev.map((o, i) => i === idx ? {
      ...o, evidence: [...(o.evidence||[]), { start_idx: selection.start, end_idx: selection.end, note: "" }]
    } : o));
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm">Create short-answer questions with a key and optional variants. You can add evidence spans by selecting text on the transcript.</p>
        <button onClick={add} className="px-3 py-1 rounded bg-blue-600 text-white">+ Add Short Q</button>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div ref={textRef} className="p-3 rounded border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-sm">
          <div className="text-xs text-gray-500 mb-2">Select text to capture evidence. Latest selection is shown below.</div>
          {transcript}
          <div className="text-xs text-gray-600 mt-2">
            Selection: {selection ? `"${selection.text}" @ ${selection.start}–${selection.end}` : "—"}
          </div>
        </div>

        <div className="space-y-4">
          {opens.map((o, i) => (
            <div key={i} className="border rounded p-3">
              <div className="flex justify-between items-center">
                <div className="font-medium">Short {i+1}</div>
                <button onClick={() => remove(i)} className="px-2 py-1 text-xs rounded bg-red-600 text-white">Delete</button>
              </div>

              <label className="block text-sm font-medium mt-2">Prompt</label>
              <textarea rows={2} value={o.stem_md} onChange={e=>update(i,{stem_md:e.target.value})}
                className="w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900" />

              <label className="block text-sm font-medium mt-2">Answer key</label>
              <input value={o.key} onChange={e=>update(i,{key:e.target.value})}
                className="w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900" />

              <div className="mt-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Variants (optional)</label>
                  <button onClick={() => addVariant(i)} className="px-2 py-1 text-xs rounded bg-gray-200 dark:bg-gray-700">+ Variant</button>
                </div>
                {(o.variants||[]).map((v, j) => (
                  <input key={j} value={v} onChange={e=>setVariant(i, j, e.target.value)}
                    className="w-full mt-1 px-2 py-1 rounded border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900" />
                ))}
              </div>

              <div className="mt-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Evidence</label>
                  <button onClick={() => addEvidence(i)} className="px-2 py-1 text-xs rounded bg-gray-200 dark:bg-gray-700">+ Add selection</button>
                </div>
                <div className="text-xs text-gray-600 mt-1">
                  {(o.evidence||[]).length ? (o.evidence.map((e, k) => (
                    <div key={k}>Range {k+1}: {e.start_idx}–{e.end_idx}</div>
                  ))) : "None"}
                </div>
              </div>
            </div>
          ))}
          {opens.length === 0 && <p className="text-sm text-gray-500">No short answers yet.</p>}
        </div>
      </div>
    </div>
  );
}

/* -----------------------
   Preview & Publish (5)
------------------------*/

function PreviewAndPublish({ draft }) {
  const [publishing, setPublishing] = useState(false);
  const publish = async () => {
    try {
      setPublishing(true);
      // Validate quickly
      if (draft.cloze_items.length && !draft.cloze_template_md) {
        throw new Error("Cloze template is required if you have cloze items.");
      }
      const { data, error } = await supabase.functions.invoke("create_listening_test", { body: draft });
      if (error) throw new Error((data && data.message) || error.message);
      alert("Created! Opening student link…");
      window.open(`/listening?prompt_id=${data.prompt_id}`, "_blank");
    } catch (e) {
      alert(e.message);
    } finally {
      setPublishing(false);
    }
  };
  return (
    <div>
      <p className="text-sm mb-2">Final check — title, audio, transcript, and questions. When ready, click Publish.</p>
      <pre className="text-xs bg-gray-100 dark:bg-gray-800 p-3 rounded overflow-auto max-h-80">{JSON.stringify(draft, null, 2)}</pre>
      <button onClick={publish} disabled={publishing} className="mt-3 px-4 py-2 rounded bg-green-600 text-white disabled:opacity-50">
        {publishing ? "Publishing…" : "Publish"}
      </button>
    </div>
  );
}
