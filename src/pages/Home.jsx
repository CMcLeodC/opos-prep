import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useState } from "react";

export default function Home() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  return (
    <section className="max-w-5xl mx-auto px-4 py-12 text-center">

      {/* Hero Section */}
      <motion.div
        className="mb-20"
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
      >
        <img
          src="/taaft.com-business-logo-design-generator-image-by-hanansaeed-1752540108.png"
          alt="App logo"
          className="mx-auto mb-6 w-20 h-20 opacity-80"
        />
        <h1 className="text-3xl sm:text-4xl font-bold mb-4 leading-tight">
          Practice listening and writing.<br />
          Get fast feedback. Pass the oposiciones.
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-300 mb-6 max-w-2xl mx-auto">
          Built for Spanish-speaking primary teachers preparing for the English exam.
        </p>
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <Link
            to="/listening"
            className="bg-blue-600 text-white px-6 py-3 rounded hover:bg-blue-700 transition"
          >
            Try Listening Practice
          </Link>
          <Link
            to="/writing"
            className="bg-green-600 text-white px-6 py-3 rounded hover:bg-green-700 transition"
          >
            Try Writing Practice
          </Link>
        </div>
      </motion.div>

      {/* Pain Points */}
      <motion.div
        className="border-t border-gray-200 dark:border-gray-700 py-16 text-left"
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
      >
        <h2 className="text-2xl font-semibold mb-6 text-center">Sound familiar?</h2>
        <ul className="space-y-4 text-lg max-w-3xl mx-auto">
          {["El audio va demasiado rápido para captar la información", "Nunca sé si lo he escrito bien", "Me corrigen, pero no sé el porqué"].map((quote, i) => (
            <motion.li
              key={i}
              className="bg-blue-50 dark:bg-blue-500/20 p-4 rounded shadow transition"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.15 }}
            >
              “{quote}”
            </motion.li>
          ))}
        </ul>
      </motion.div>

      {/* Coming Soon */}
      <motion.div
        className="border-t border-gray-200 dark:border-gray-700 py-16 text-left"
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
      >
        <h2 className="text-2xl font-semibold mb-6 text-center">Coming Soon…</h2>
        <ul className="grid sm:grid-cols-2 gap-6 text-left text-gray-700 dark:text-gray-200 max-w-4xl mx-auto text-base">
          {["✅ AI-powered corrections (grammar + style)", "🗣️ Speaking practice with real-time feedback", "📖 Reading + grammar modules", "👩‍🏫 1:1 English classes with Connor"].map((item, i) => (
            <motion.li
              key={i}
              className="bg-gray-100 dark:bg-gray-800 p-4 rounded shadow-sm"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.15 }}
            >
              {item}
            </motion.li>
          ))}
        </ul>
      </motion.div>

      {/* Contact + Email placeholder (enhanced) */}
      <div className="mt-20 pt-12 border-t border-gray-200 dark:border-gray-700 text-center text-sm text-gray-600 dark:text-gray-400">
        <p className="mb-4">Anything you'd like to let me know? Send me a message:</p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            const isValid = name && email && message;
            if (!isValid) {
              setError("Please fill in all fields.");
              return;
            }
            setError(null);
            setSuccess(true);
            setName("");
            setEmail("");
            setMessage("");
          }}
          className="mt-4 flex flex-col items-center gap-3 max-w-md mx-auto"
        >
          <input
            type="text"
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-2 rounded border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-800 text-sm"
          />
          <input
            type="email"
            placeholder="Your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-2 rounded border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-800 text-sm"
          />
          <textarea
            placeholder="Your message"
            rows={4}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full px-4 py-2 rounded border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-800 text-sm"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition w-full"
          >
            Send Message
          </button>

          {error && <p className="text-red-500 mt-2">{error}</p>}
          {success && <p className="text-green-500 mt-2">✅ Message sent (demo only)</p>}
        </form>
      </div>

    </section>
  );
}
