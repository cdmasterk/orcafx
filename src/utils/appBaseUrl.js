// src/utils/appBaseUrl.js
const HARDCODED_PROD = "https://orcafx.vercel.app";
const HARDCODED_LAN = "http://192.168.178.20:3000";

export function getAppBaseUrl() {
  // 0) Hard override iz env-a
  const forced = process.env.REACT_APP_FORCE_BASE_URL;
  if (forced) return forced.replace(/\/$/, "");

  // 1) Jednokratni override iz query parametra (?base=...)
  try {
    if (typeof window !== "undefined") {
      const u = new URL(window.location.href);
      const qp = u.searchParams.get("base");
      if (qp) return qp.replace(/\/$/, "");
    }
  } catch {}

  // 2) localStorage override (postavlja se iz UI)
  try {
    const ls = typeof window !== "undefined" && window.localStorage.getItem("orca_base_url_override");
    if (ls) return ls.replace(/\/$/, "");
  } catch {}

  // 3) Standardni env
  const envBase = process.env.REACT_APP_BASE_URL || process.env.REACT_APP_PUBLIC_URL;
  if (envBase) return envBase.replace(/\/$/, "");

  // 4) Dev: ako smo na localhost, probaj LAN env ili hardcoded LAN
  if (typeof window !== "undefined") {
    const origin = window.location.origin;
    const host = new URL(origin).hostname;
    const isLocal = /localhost|127\.0\.0\.1/.test(host);
    if (isLocal) {
      const envLan = process.env.REACT_APP_LAN_URL;
      return (envLan || HARDCODED_LAN).replace(/\/$/, "");
    }
    // 5) Inače: prod fallback
    return HARDCODED_PROD;
  }

  return HARDCODED_PROD;
}

export function getAppBaseUrlDebug() {
  return {
    env: {
      FORCE: process.env.REACT_APP_FORCE_BASE_URL || null,
      BASE: process.env.REACT_APP_BASE_URL || null,
      PUBLIC: process.env.REACT_APP_PUBLIC_URL || null,
      LAN: process.env.REACT_APP_LAN_URL || null,
    },
    ls: (typeof window !== "undefined" && window.localStorage.getItem("orca_base_url_override")) || null,
  };
}
