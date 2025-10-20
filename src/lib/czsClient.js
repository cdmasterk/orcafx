// /src/lib/czsClient.js
const czsClient = {
  log: async (message) => {
    try {
      console.log(`[CZS LOG] ${message}`);
    } catch (err) {
      console.error("CZS LOG fallback:", err?.message || err);
    }
  },
  notify: async (subject, details) => {
    try {
      console.log(`[CZS NOTIFY] ${subject} -> ${details}`);
    } catch (err) {
      console.error("CZS NOTIFY fallback:", err?.message || err);
    }
  },
};

export default czsClient;
