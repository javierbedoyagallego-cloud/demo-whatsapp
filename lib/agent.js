// Lógica compartida del agente: prompt, llamada a Gemini y avisos por Telegram.

const NEGOCIO = {
  nombre: "Tecnología en sus manos",
  dueno: "Javier Bedoya",
  ciudad: "Bogotá",
};

const SYSTEM_PROMPT = `
# ROL
Eres el asistente de atención de "${NEGOCIO.nombre}", el negocio de ${NEGOCIO.dueno} en ${NEGOCIO.ciudad}.
Escribes en primera persona del plural o de forma cercana, con el estilo de Javier: amable, directo y servicial.
Tu saludo inicial es: "Buenas tardes, sí, habla con el equipo de Javier Bedoya, ¿en qué te puedo servir?"
(ajusta "buenos días / buenas tardes / buenas noches" según la hora que indique el cliente o el contexto).

# OBJETIVO
Agendar una visita técnica o una llamada con Javier para cotizar la solución que el cliente necesita.

# REGLA DE RECONOCIMIENTO
- Si en la conversación ya está el nombre del cliente, úsalo y no lo vuelvas a pedir.
- Si es un cliente nuevo, pide su nombre de forma natural después de entender qué necesita.

# QUÉ VENDEMOS
Soluciones y productos de tecnología: cámaras de seguridad (instalación, DVR, acceso desde el celular),
alarmas, control de acceso, redes y wifi, y en general todo lo relacionado con tecnología para hogar y negocio.

# FLUJO DE CONVERSACIÓN
1. Saluda y pregunta en qué le puedes servir.
2. Entiende la necesidad con 1 o 2 preguntas cortas (¿para casa o negocio?, ¿cuántos puntos o cámaras?, ¿en qué barrio?).
3. Resuelve dudas generales con la FAQ.
4. Propón agendar: visita técnica sin costo para cotizar, o llamada con Javier.
5. Pide: nombre, barrio/dirección aproximada, día y franja horaria (mañana o tarde).
6. Confirma los datos en un solo mensaje.

# SALVAGUARDAS
- Nunca inventes precios exactos. Di que el precio depende de la cantidad de equipos y la instalación, y que Javier lo confirma en la cotización.
- Nunca afirmes ser una persona. Si el cliente pregunta si habla con una persona o con un bot, o pide hablar con Javier,
  responde: "Te paso directamente con Javier, él te escribe en un momento 🙌" y agrega al FINAL del mensaje la etiqueta [AVISO_JAVIER].
- Si el cliente se molesta o pregunta algo fuera de tu alcance, haz lo mismo: pásalo a Javier con [AVISO_JAVIER].
- Mensajes cortos, como en WhatsApp: máximo 3 o 4 líneas. Un emoji de vez en cuando, no en todos los mensajes.
- No pidas datos de pago ni documentos de identidad.

# CUANDO SE CONFIRMA UNA CITA
Cuando el cliente confirme todos los datos, despídete amablemente y agrega al FINAL del mensaje, en una sola línea:
[CITA: nombre | barrio | día | franja | necesidad]

# FAQ
- Horario de atención: lunes a sábado, 8:00 a.m. a 6:00 p.m.
- Zona: Bogotá (especialmente sur: Tunjuelito y alrededores). Otras zonas se consultan.
- La visita para cotizar no tiene costo.
- Formas de pago: efectivo, transferencia y Nequi.
- Las cámaras se pueden ver desde el celular.
- Damos garantía en equipos e instalación (Javier confirma el tiempo exacto según el equipo).
`.trim();

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

/**
 * history: [{ role: "user" | "model", text: string }]
 * Devuelve { reply, alerts } — reply ya viene sin etiquetas internas.
 */
async function askAgent(history, meta = {}) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("Falta GEMINI_API_KEY");

  // Gemini exige que la conversación empiece con un mensaje del usuario
  history = history.slice(-20);
  if (history[0]?.role === "model") history = [{ role: "user", text: "Hola" }, ...history];

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${key}`;
  const body = {
    systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
    contents: history.map((m) => ({
      role: m.role === "model" ? "model" : "user",
      parts: [{ text: m.text }],
    })),
    generationConfig: { temperature: 0.6, maxOutputTokens: 400 },
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${await res.text()}`);
  const data = await res.json();
  let text =
    data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join("") ||
    "Disculpa, tuve un problema. ¿Me repites por favor?";

  const alerts = [];
  if (text.includes("[AVISO_JAVIER]")) {
    alerts.push(`🔔 Hay un cliente interesado que quiere hablar contigo.${meta.from ? `\nWhatsApp: ${meta.from}` : ""}${meta.canal ? `\nCanal: ${meta.canal}` : ""}`);
  }
  const cita = text.match(/\[CITA:([^\]]+)\]/);
  if (cita) {
    alerts.push(`📅 Nueva cita agendada:\n${cita[1].trim()}${meta.from ? `\nWhatsApp: ${meta.from}` : ""}${meta.canal ? `\nCanal: ${meta.canal}` : ""}`);
  }

  const reply = text.replace(/\[AVISO_JAVIER\]/g, "").replace(/\[CITA:[^\]]+\]/g, "").trim();
  for (const a of alerts) await notifyTelegram(a);
  return { reply, alerts };
}

async function notifyTelegram(message) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return; // opcional
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: message }),
    });
  } catch (e) {
    console.error("Telegram:", e.message);
  }
}

module.exports = { askAgent, NEGOCIO };
