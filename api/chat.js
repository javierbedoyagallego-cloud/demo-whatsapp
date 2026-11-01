// Endpoint de la demo web: recibe el historial del chat y devuelve la respuesta del agente.
const { askAgent } = require("../lib/agent");

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "Usa POST" });
  try {
    const { history } = req.body || {};
    if (!Array.isArray(history) || history.length === 0) {
      return res.status(400).json({ error: "Falta el historial" });
    }
    const { reply } = await askAgent(history, { canal: "Demo web" });
    res.status(200).json({ reply });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "No pude responder ahora. Intenta de nuevo." });
  }
};
