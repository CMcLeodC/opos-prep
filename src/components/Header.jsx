import { Link } from "react-router-dom";
import { useEffect, useState } from "react";

export default function Header() {
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem("theme") === "dark" ||
      (!localStorage.getItem("theme") &&
        window.matchMedia("(prefers-color-scheme: dark)").matches)
      ? true
      : false;
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
    localStorage.setItem("theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  return (
    <header className="bg-gray-100 dark:bg-gray-800 shadow">
      <nav className="container mx-auto flex justify-between items-center p-4">
        <Link to="/" className="text-xl font-semibold">
          Oposiciones English
        </Link>
        <div className="flex items-center space-x-4">
          <Link to="/listening" className="hover:underline">
            Listening
          </Link>
          <Link to="/writing" className="hover:underline">
            Writing
          </Link>
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="ml-2 p-2 rounded text-sm border border-gray-400 dark:border-gray-300"
          >
            {darkMode ? "☀️ Light" : "🌙 Dark"}
          </button>
        </div>
      </nav>
    </header>
  );
}
