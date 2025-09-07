import { motion } from "framer-motion";
import { useEffect } from "react";
import { buildUTMUrl, logEvent } from "../lib/analytics";

export default function OpoMentorLanding() {
  // --- CONFIG (replace before deploying) ---
  const TEST_URL = new URL("/listening-tests?scope=readiness", window.location.origin).toString();
  const WA_LINK =
    "https://wa.me/34659270445?text=Hola%2C%20quiero%20probar%20el%20Listening%20Readiness%20Check%20%28gratis%29%20de%20OpoMentor.";

  useEffect(() => {
    logEvent("test_view", { context: "land", path: window.location.pathname });
  }, []);

  return (
    <section className="max-w-5xl mx-auto px-4 py-12 text-center">
      {/* Hero */}
      <motion.div
        className="mb-16"
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
      >
        <img
          src="/taaft.com-business-logo-design-generator-image-by-hanansaeed-1752540108.png"
          alt="OpoMentor: preparación Listening oposiciones"
          className="mx-auto mb-6 w-20 h-20 opacity-80"
        />
        <h1 className="text-3xl sm:text-4xl font-bold mb-4 leading-tight">
          Prepárate para el <span className="whitespace-nowrap">Listening</span> de las oposiciones sin perderte
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-300 mb-6 max-w-2xl mx-auto">
          Mini-test gratis (3 ítems) para saber dónde estás y qué mejorar — rápido, claro y con feedback.
        </p>

        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <a
            href={buildUTMUrl(TEST_URL, "landing")}
            className="bg-blue-600 text-white px-6 py-3 rounded hover:bg-blue-700 transition"
            aria-label="Iniciar Listening Readiness Check (gratis)"
            onClick={() => logEvent("cta_test_click", { placement: "hero" })}
          >
            Hacer el test (gratis)
          </a>
          <a
            href={WA_LINK}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-green-600 text-white px-6 py-3 rounded hover:bg-green-700 transition"
            aria-label="Abrir chat de WhatsApp con OpoMentor"
            onClick={() => logEvent("cta_whatsapp_click", { placement: "hero" })}
          >
            Escríbenos por WhatsApp
          </a>
        </div>

        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
          Respuesta rápida por WhatsApp para enviarte el acceso y resolver dudas.
        </p>

        <p className="text-sm text-gray-600 dark:text-gray-300 mt-6">
          💻 <strong>Mejor en ordenador/portátil</strong> para Listening (auriculares recomendados).
        </p>
      </motion.div>

      {/* Dolor → alivio */}
      <motion.div
        className="border-t border-gray-200 dark:border-gray-700 py-16 text-left"
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
      >
        <ul className="space-y-4 text-lg max-w-3xl mx-auto">
          <li className="bg-blue-50 dark:bg-blue-500/20 p-4 rounded shadow">
            <strong>“El audio va demasiado rápido.”</strong> → Clips reales y temporizador: enfoca lo importante.
          </li>
          <li className="bg-blue-50 dark:bg-blue-500/20 p-4 rounded shadow">
            <strong>“No sé si mis respuestas están bien.”</strong> → Corrección al instante con explicación breve.
          </li>
          <li className="bg-blue-50 dark:bg-blue-500/20 p-4 rounded shadow">
            <strong>“Pierdo puntos por detalles/ortografía.”</strong> → Pistas de detalle y repaso dirigido tras el test.
          </li>
        </ul>
      </motion.div>

      {/* Cómo funciona */}
      <motion.div
        className="border-t border-gray-200 dark:border-gray-700 py-16 text-left"
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
      >
        <h2 className="text-2xl font-semibold mb-6 text-center">Cómo funciona</h2>
        <ol className="grid sm:grid-cols-3 gap-6 max-w-4xl mx-auto text-left text-gray-700 dark:text-gray-200">
          <li className="bg-gray-100 dark:bg-gray-800 p-4 rounded shadow-sm">
            1) <strong>Haz el mini-test</strong> (3 preguntas estilo examen).
          </li>
          <li className="bg-gray-100 dark:bg-gray-800 p-4 rounded shadow-sm">
            2) <strong>Recibe tu score y focos</strong> (Velocidad, Detalle, Distractores, Vocabulario, Ortografía).
          </li>
          <li className="bg-gray-100 dark:bg-gray-800 p-4 rounded shadow-sm">
            3) <strong>Sigue los siguientes pasos</strong> (tips y, si quieres, apoyo por WhatsApp).
          </li>
        </ol>
      </motion.div>

      {/* FAQ + Privacidad */}
      <motion.div
        className="border-t border-gray-200 dark:border-gray-700 py-16 text-left"
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
      >
        <h2 className="text-2xl font-semibold mb-6 text-center">FAQ</h2>
        <div className="max-w-3xl mx-auto space-y-4 text-gray-700 dark:text-gray-200">
          <div>
            <p className="font-semibold">¿Nivel del audio?</p>
            <p>Tipo examen Madrid/Spain, aprox. <strong>B2–C1</strong>, locutores claros y ritmo realista.</p>
          </div>
          <div>
            <p className="font-semibold">¿Cuántas reproducciones?</p>
            <p>Hasta <strong>2 por ítem</strong> (como en el examen).</p>
          </div>
          <div>
            <p className="font-semibold">¿Necesito registrarme?</p>
            <p><strong>No.</strong> El test es sin registro. Email opcional si quieres recibir material.</p>
          </div>
        </div>

        <p className="text-xs text-center text-gray-500 dark:text-gray-400 mt-8">
          Privacidad: tu email solo si te apuntas a recursos y avisos. Sin spam, baja cuando quieras.
        </p>
      </motion.div>

      {/* Footer CTAs */}
      <div className="pt-8">
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <a
            href={buildUTMUrl(TEST_URL, "landing_footer")}
            className="bg-blue-600 text-white px-6 py-3 rounded hover:bg-blue-700 transition"
            aria-label="Iniciar Listening Readiness Check (gratis) desde el pie"
            onClick={() => logEvent("cta_test_click", { placement: "footer" })}
          >
            Hacer el test (gratis)
          </a>
          <a
            href={WA_LINK}
            target="_blank" rel="noopener noreferrer"
            className="bg-green-600 text-white px-6 py-3 rounded hover:bg-green-700 transition"
            aria-label="Abrir chat de WhatsApp con OpoMentor (pie)"
            onClick={() => logEvent("cta_whatsapp_click", { placement: "footer" })}
          >
            Escríbenos por WhatsApp
          </a>
        </div>
      </div>
    </section>
  );
}