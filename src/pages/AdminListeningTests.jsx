import { useEffect, useState } from "react";
import { requireAdminEmail } from "../lib/adminGuard";
import { supabase } from "../lib/supabaseClient";

function fmtDur(s) {
  if (!s && s !== 0) return "—";
  const m = Math.floor(s / 60);
  const ss = s % 60;
  return `${m}:${String(ss).padStart(2, "0")}`;
}

export default function AdminListeningTests() {
  const [ok, setOk] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => { (async () => setOk(await requireAdminEmail()))(); }, []);

  useEffect(() => {
    if (ok !== true) return;
    (async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke("list_listening_tests_admin");
        if (error) throw new Error((data && data.message) || error.message);
        setItems(data.items || []);
      } catch (e) {
        alert(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [ok]);

  if (ok === null) return <div className="p-6">Checking access…</div>;
  if (!ok) return <div className="p-6 text-red-600">Forbidden (admin only)</div>;

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">Listening Tests (Admin)</h2>
        <a href="/admin/listening-create" className="px-3 py-2 rounded bg-blue-600 text-white">+ New Test</a>
      </div>

      {loading && <p className="text-sm">Loading…</p>}
      {!loading && items.length === 0 && <p>No tests yet.</p>}

      <div className="grid md:grid-cols-2 gap-4">
        {items.map(x => (
          <div key={x.prompt_id} className="border rounded p-3">
            <div className="flex items-center justify-between">
              <div className="font-medium">{x.title}</div>
              <span className={`text-xs px-2 py-0.5 rounded ${x.is_published ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                {x.is_published ? "Published" : "Draft"}
              </span>
            </div>
            <div className="text-xs text-gray-600 mt-1">
              {new Date(x.created_at).toLocaleString()} · Duration {fmtDur(x.duration_sec)}
            </div>
            <div className="text-xs mt-2">
              Qs: MCQ {x.question_counts?.MCQ ?? 0} · OPEN {x.question_counts?.OPEN ?? 0} · CLOZE {x.question_counts?.CLOZE ?? 0} · TOTAL {x.question_counts?.TOTAL ?? 0}
            </div>
            {x.tags?.length ? (
              <div className="text-xs mt-1">Tags: {x.tags.join(", ")}</div>
            ) : null}
            <div className="flex gap-2 mt-3">
              {x.version_id && (
                <a className="px-3 py-1 rounded bg-gray-200" href={`/listening?prompt_id=${x.prompt_id}`} target="_blank" rel="noreferrer">
                  Open as Student
                </a>
              )}
              {/* (Optional) future: Edit button -> versioned editor */}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
