import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export default function AdminListeningResults() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [prompts, setPrompts] = useState({});
  const [profiles, setProfiles] = useState({});
  const [errorMsg, setErrorMsg] = useState("");

  // filters
  const [promptId, setPromptId] = useState("");
  const [emailQuery, setEmailQuery] = useState("");
  const [statuses, setStatuses] = useState(["submitted", "returned"]);

  const [tests, setTests] = useState([]);

  // load prompt list for filter dropdown
  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke("list_listening_tests");
        if (!error) setTests(data.items || []);
      } catch {}
    })();
  }, []);

  const fetchData = async () => {
    setLoading(true); setErrorMsg("");
    try {
      const { data, error } = await supabase.functions.invoke("list_listening_attempts", {
        body: {
          prompt_id: promptId || null,
          email_query: emailQuery || null,
          statuses,
        }
      });
      if (error) throw new Error((data && data.error) || error.message);
      setItems(data.items || []);
      setPrompts(data.prompts || {});
      setProfiles(data.profiles || {});
    } catch (e) {
      console.error(e);
      setErrorMsg(e.message || "Failed to load attempts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []); // initial

  const promptById = prompts;
  const profById = profiles;

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-4">Listening — Results</h2>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4 items-end">
        <div>
          <label className="text-sm block mb-1">Test</label>
          <select value={promptId} onChange={(e)=>setPromptId(e.target.value)} className="border rounded px-2 py-1">
            <option value="">All</option>
            {tests.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
          </select>
        </div>
        <div>
          <label className="text-sm block mb-1">Email / Name</label>
          <input value={emailQuery} onChange={(e)=>setEmailQuery(e.target.value)} className="border rounded px-2 py-1" />
        </div>
        <div>
          <label className="text-sm block mb-1">Statuses</label>
          <select multiple value={statuses} onChange={(e)=>setStatuses(Array.from(e.target.selectedOptions).map(o=>o.value))} className="border rounded px-2 py-1">
            {["draft","submitted","returned"].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <button onClick={fetchData} className="px-3 py-2 rounded bg-gray-100">Apply</button>
      </div>

      {loading ? (
        <div>Loading…</div>
      ) : errorMsg ? (
        <div className="p-3 rounded bg-red-50 text-red-700 border border-red-200">{errorMsg}</div>
      ) : items.length === 0 ? (
        <div>No attempts found.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-2 border">Submitted</th>
                <th className="p-2 border">Student</th>
                <th className="p-2 border">Test</th>
                <th className="p-2 border">Mode</th>
                <th className="p-2 border">Status</th>
                <th className="p-2 border">Answered</th>
                <th className="p-2 border">Correct</th>
                <th className="p-2 border">Auto total</th>
              </tr>
            </thead>
            <tbody>
              {items.map(it => {
                const prof = profById[it.user_id];
                const pr = promptById[it.prompt_id];
                return (
                  <tr key={it.id}>
                    <td className="p-2 border">{it.submitted_at ? new Date(it.submitted_at).toLocaleString() : "—"}</td>
                    <td className="p-2 border">{prof?.display_name || prof?.email || it.user_id}</td>
                    <td className="p-2 border">{pr?.title || it.prompt_id}</td>
                    <td className="p-2 border">{it.mode}</td>
                    <td className="p-2 border">{it.status}</td>
                    <td className="p-2 border">{it.aggregate.answered}</td>
                    <td className="p-2 border">{it.aggregate.correct_count}</td>
                    <td className="p-2 border">{it.aggregate.total_auto}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
