// Webhook de WhatsApp Cloud API (Meta).
// GET  -> verificación del webhook (Meta lo llama una sola vez al configurarlo)
// POST -> llega un mensaje de un cliente: se responde con el agente

const { askAgent } = require("../lib/agent");

// Memoria simple de conversaciones por número.
// OJO: en Vercel esta memoria se pierde cuando la función se "duerme".
// Sirve para la demo; para producción conéctalo a Airtable o Supabase.
const conversaciones = new Map();
const procesados = new Set(); // evita responder dos veces el mismo mensaje

module.exports = async (req, res) => {
  // 1) Verificación del webhook
  if (req.method === "GET") {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];
    if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
      return res.status(200).send(challenge);
    }
    return res.status(403).send("Token de verificación incorrecto");
  }

  if (req.method !== "POST") return res.status(405).end();

  try {
    const value = req.body?.entry?.[0]?.changes?.[0]?.value;
    const msg = value?.messages?.[0];
    if (!msg) return res.status(200).end(); // estados de entrega, lecturas, etc.

    if (procesados.has(msg.id)) return res.status(200).end();
    procesados.add(msg.id);

    const from = msg.from; // número del cliente
    const nombre = value?.contacts?.[0]?.profile?.name;

    let texto;
    if (msg.type === "text") texto = msg.text.body;
    else if (msg.type === "interactive") texto = msg.interactive?.button_reply?.title || msg.interactive?.list_reply?.title;
    else texto = "(El cliente envió un archivo, audio o imagen)";

    const historial = conversaciones.get(from) || [];
    if (historial.length === 0 && nombre) {
      historial.push({ role: "user", text: `(Dato del sistema: el nombre de perfil de WhatsApp del cliente es "${nombre}")` });
      historial.push({ role: "model", text: "Entendido." });
    }
    historial.push({ role: "user", text: texto });

    const { reply } = await askAgent(historial, { from, canal: "WhatsApp" });
    historial.push({ role: "model", text: reply });
    conversaciones.set(from, historial.slice(-30));

    await enviarWhatsApp(from, reply);
    res.status(200).end();
  } catch (e) {
    console.error(e);
    res.status(200).end(); // siempre 200 para que Meta no reintente en bucle
  }
};

async function enviarWhatsApp(to, text) {
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const token = process.env.WHATSAPP_TOKEN;
  const r = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body: text },
    }),
  });
  if (!r.ok) console.error("WhatsApp:", r.status, await r.text());
}
