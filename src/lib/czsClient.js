// /src/lib/czsClient.js
// Minimalni stabilni helper koji sigurno radi u ESM okruženju (Vercel / Next.js)

const czsClient = {
  log: async (message) => {
    try {
      console.log(`[CZS LOG] ${message}`);
    } catch (err) {
      console.error("CZS log fallback:", err.message);
    }
  },
  notify: async (subject, details) => {
    try {
      console.log(`[CZS NOTIFY] ${subject} → ${details}`);
    } catch (err) {
      console.error("CZS notify fallback:", err.message);
    }
  },
};

export default czsClient;
