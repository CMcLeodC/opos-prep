import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { logEvent } from "../lib/analytics";
import { supabase } from "../lib/supabaseClient";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY;

export default function ListeningTests() {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const scope = params.get("scope"); // 'readiness' or null

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [err, setErr] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      setLoading(true); setErr("");
      try {
        // ensure anon or signed-in session
        const { data: s } = await supabase.auth.getSession();
        if (!s?.session) {
          const { error } = await supabase.auth.signInAnonymously();
          if (error) throw new Error("Anon sign-in failed: " + error.message);
        }

        const { data: s2 } = await supabase.auth.getSession();
        const token = s2?.session?.access_token || "";

        const res = await fetch(`${SUPABASE_URL}/functions/v1/list_listening_tests`, {
          method: "GET",
          headers: {
            "apikey": SUPABASE_ANON,
            "Authorization": token ? `Bearer ${token}` : "",
          },
        });
        const txt = await res.text();
        const json = txt ? JSON.parse(txt) : {};
        if (!res.ok) throw new Error(json?.error || txt || `HTTP ${res.status}`);

        let list = json.items || [];
        list.sort((a, b) => {
          const da = a.published_at || a.created_at || "";
          const db = b.published_at || b.created_at || "";
          if (da && db) return db.localeCompare(da);
          return String(b.id).localeCompare(String(a.id));
        });
        if (scope === "readiness") {
          // Simple, reliable rule for now: show the first 3 published items.
          // (Later you can tag tests with it.tags.includes("readiness"))
          list = list.slice(0, 3);
        }
        setItems(list);
      } catch (e) {
        setErr(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <div className="p-6">Loading…</div>;
  if (err) return <div className="p-6 text-red-600">{err}</div>;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-1">Choose a Listening Test</h2>
      {scope === "readiness" && (
        <p className="text-sm text-gray-600 mb-4">Readiness Check — 3 quick items</p>
      )}
      {items.length === 0 ? <p>No published tests yet.</p> : (
        <div className="grid sm:grid-cols-2 gap-4">
          {items.map((it) => (
            <div key={it.id} className="border rounded p-4">
              <div className="font-semibold">{it.title}</div>
              <div className="text-sm text-gray-600 mt-1">
                {it.duration_sec ? `${Math.round(it.duration_sec)}s` : "—"} • Qs: {it.question_counts?.TOTAL ?? 0}
              </div>
              <div className="mt-3">
                <button
                  onClick={() => {
                    logEvent("cta_test_click", { placement: scope === "readiness" ? "readiness_list" : "list", test_id: it.id });
                    navigate(`/listening?prompt_id=${it.id}`);
                  }}
                  className="px-3 py-2 rounded bg-blue-600 text-white text-sm"
                >
                  Start
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
