// src/lib/analytics.js
const UTM_KEYS = ["utm_campaign", "utm_medium", "utm_source"];

export function saveInitialUTM() {
  const params = new URLSearchParams(window.location.search);
  const found = {};
  UTM_KEYS.forEach((k) => {
    const v = params.get(k);
    if (v) found[k] = v;
  });
  // Default if none provided (lets you see "landing" in logs)
  const finalUTM = Object.keys(found).length
    ? found
    : { utm_campaign: "readiness_check", utm_medium: "phase1", utm_source: "landing" };
  sessionStorage.setItem("opomentor_utm", JSON.stringify(finalUTM));
}

export function getUTM() {
  try {
    return JSON.parse(sessionStorage.getItem("opomentor_utm") || "{}");
  } catch {
    return {};
  }
}

// Adds UTMs only if base is absolute. (Relative routes carry UTMs via sessionStorage)
export function buildUTMUrl(base, source = "landing") {
  let url;
  try { url = new URL(base); } catch { /* base is relative */ }
  if (!url) return base;
  url.searchParams.set("utm_campaign", "readiness_check");
  url.searchParams.set("utm_medium", "phase1");
  url.searchParams.set("utm_source", source);
  return url.toString();
}

// Console logger + optional POST to /log (works later when you add it)
export async function logEvent(event, payload = {}) {
  const body = {
    event,
    ts: Date.now(),
    utm: getUTM(),
    ...payload,
  };
  // dev visibility
  // eslint-disable-next-line no-console
  console.log("[event]", body);

  try {
    await fetch("/log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      keepalive: true,
      body: JSON.stringify(body),
    });
  } catch {
    // no-op if /log doesn't exist yet
  }
}
