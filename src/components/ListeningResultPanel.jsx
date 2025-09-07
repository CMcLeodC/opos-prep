import { logEvent } from "../lib/analytics";

const CATEGORY_TIPS = {
  Velocidad: "Lee opciones antes y busca palabras ancla.",
  Detalle: "Atiende números, fechas y nombres propios.",
  Distractores: "Contrasta la idea completa, no solo palabras sueltas.",
  Vocabulario: "Fíjate en sinónimos y contexto cercano.",
  Ortografía: "Cuida mayúsculas/plurales en gaps.",
};

function areasToWork(breakdown, max = 2) {
  if (!breakdown) return [];
  const entries = Object.entries(breakdown);
  if (!entries.length) return [];
  entries.sort((a, b) => (a[1] ?? 0) - (b[1] ?? 0)); // lowest first
  const min = entries[0][1] ?? 0;
  const lows = entries.filter(([, v]) => (v ?? 0) === min).map(([k]) => k);
  const pick = [...new Set([...lows.slice(0, max), ...entries.slice(0, max).map(([k]) => k)])].slice(0, max);
  return pick;
}

export default function ListeningResultPanel({ score, breakdown, total = 3, testTitle = "Readiness Check" }) {
  const areas = areasToWork(breakdown, 2);
  const summary = areas.length ? areas.join(", ") : "—";
  const waText =
    `Hola, tengo mis resultados del Listening Readiness Check. ` +
    `Test: ${testTitle}. Puntuación: ${score}/${total}. ` +
    `Áreas a trabajar: ${summary}. ¿Me aconsejas el siguiente paso?`;
  const WA_LINK = "https://wa.me/34659270445?text=" + encodeURIComponent(waText);

  const emailSubject = "Resultados Listening Readiness Check";
  const emailBody =
    `Hola,\n\n` +
    `Test: ${testTitle}\n` +
    `Puntuación: ${score}/${total}\n` +
    `Áreas a trabajar: ${summary}\n` +
    `Desglose: ${JSON.stringify(breakdown)}\n\n` +
    `¿Siguiente paso recomendado?`;
  const EMAIL = `mailto:hello@opomentor.com?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;

  return (
    <div className="max-w-xl mx-auto text-center p-6 border rounded">
      <h3 className="text-2xl font-bold mb-2">Tu resultado</h3>
      <p className="text-4xl font-extrabold mb-4">{score}/{total}</p>

      <ul className="text-left text-sm bg-gray-50 dark:bg-gray-800 p-4 rounded mb-4 space-y-1">
        {Object.entries(breakdown || {}).map(([k, v]) => (
          <li key={k}><strong>{k}</strong>: {v} {CATEGORY_TIPS[k] ? `— ${CATEGORY_TIPS[k]}` : ""}</li>
        ))}
      </ul>

      {!!areas.length && (
        <p className="text-sm mb-6">
          <strong>Foco sugerido:</strong> {summary}
        </p>
      )}

      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <a
          href={WA_LINK}
          target="_blank"
          rel="noopener noreferrer"
          className="px-4 py-2 bg-green-600 text-white rounded"
          onClick={() => logEvent("cta_whatsapp_click", { placement: "result" })}
        >
          Enviar por WhatsApp (recomendado)
        </a>
        <a className="px-4 py-2 bg-gray-200 rounded" href={EMAIL}>
          Enviar por Email
        </a>
      </div>

      <p className="text-xs text-gray-500 mt-3">
        Consejo: comparte dudas concretas (ej.: “fechas” o “palabras clave”).
      </p>
    </div>
  );
}
