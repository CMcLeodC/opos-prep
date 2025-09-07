import { Link } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import UpgradeAccount from "./UpgradeAccount";

export default function Header() {
  const [darkMode, setDarkMode] = useState(() => {
    return (
      localStorage.getItem("theme") === "dark" ||
      (!localStorage.getItem("theme") &&
        window.matchMedia("(prefers-color-scheme: dark)").matches)
    );
  });

  const [user, setUser] = useState(null);
  const [toast, setToast] = useState(null);
  const prevHadEmailRef = useRef(null);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
    localStorage.setItem("theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  // Auth state
  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (mounted) {
        setUser(user ?? null);
        prevHadEmailRef.current = !!(user && user.email);
      }
    })();
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      const hasEmailNow = !!session?.user?.email;
      const hadEmailBefore = !!prevHadEmailRef.current;
      if (!hadEmailBefore && hasEmailNow) {
        setToast("Account upgraded. We’ll email you when feedback is returned.");
      }
      prevHadEmailRef.current = hasEmailNow;
      setUser(session?.user ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
  }

  const isAnon = !!user && !user.email;

  return (
    <header className="bg-gray-100 dark:bg-gray-800 shadow">
      <nav className="container mx-auto flex justify-between items-center p-4">
        <Link to="/" className="text-xl font-semibold">
          Oposiciones English
        </Link>

        <div className="flex items-center space-x-4">
          <Link to="/listening-tests" className="hover:underline">
            Listening
          </Link>
          <Link to="/writing" className="hover:underline">
            Writing
          </Link>
          <Link to="/my-submissions" className="hover:underline">
            My Submissions
          </Link>

          {/* Auth area */}
          {!user ? (
            <Link to="/login" className="hover:underline">
              Sign in
            </Link>
          ) : isAnon ? (
            <div className="flex items-center gap-3">
              <UpgradeAccount />
              <button
                onClick={signOut}
                className="p-2 rounded text-sm border border-gray-400 dark:border-gray-300 cursor-pointer"
                title="End guest session"
              >
                Sign out
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Link to="/profile" className="hover:underline">
                {user.email}
              </Link>
              {/* <span className="text-sm text-gray-700 dark:text-gray-300">
                {user.email}
              </span> */}
              <button
                onClick={signOut}
                className="p-2 rounded text-sm border border-gray-400 dark:border-gray-300 cursor-pointer"
              >
                Sign out
              </button>
            </div>
          )}

          {toast && (
            <div className="fixed bottom-4 right-4 z-50 max-w-sm rounded-md border bg-background shadow-lg p-3 cursor-pointer">
              <div className="text-sm">{toast}</div>
              <div className="mt-2 text-right">
                <button
                  className="text-xs underline text-muted-foreground"
                  onClick={() => setToast(null)}
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}

          <button
            onClick={() => setDarkMode(!darkMode)}
            className="ml-2 p-2 rounded text-sm border border-gray-400 dark:border-gray-300 cursor-pointer"
          >
            {darkMode ? "☀️ Light" : "🌙 Dark"}
          </button>
        </div>
      </nav>
    </header>
  );
}
