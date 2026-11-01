# Demo WhatsApp con IA — Tecnología en sus manos

Un agente con IA (Gemini) que atiende clientes, resuelve dudas y agenda visitas técnicas.
Funciona en dos lugares con el mismo "cerebro":

1. **Demo web** con apariencia de WhatsApp (para mostrarla a clientes con un link).
2. **WhatsApp real** (el número de prueba de Meta o tu número de negocio).

Cuando se agenda una cita o un cliente pide hablar contigo, te llega un aviso por **Telegram**.

## Archivos

| Archivo | Para qué sirve |
|---|---|
| `lib/agent.js` | El prompt (rol, objetivo, flujo, salvaguardas, FAQ) y la conexión con Gemini y Telegram. **Aquí cambias la información del negocio.** |
| `public/index.html` | La página del chat estilo WhatsApp. |
| `api/chat.js` | Lo que usa la página web para hablar con el agente. |
| `api/whatsapp.js` | El webhook que recibe y responde los mensajes de WhatsApp. |
| `.env.example` | Lista de claves que debes poner en Vercel. |

---

## PASO 1 — Clave de Gemini (gratis)
1. Entra a https://aistudio.google.com/apikey con tu cuenta de Google.
2. Clic en **Create API key** y cópiala. Esta es tu `GEMINI_API_KEY`.

## PASO 2 — Subir a Vercel (la demo web queda lista aquí)
1. Crea un repositorio en GitHub y sube esta carpeta completa (o arrástrala con GitHub Desktop).
2. En https://vercel.com → **Add New → Project** → importa el repositorio.
3. Antes de darle Deploy, abre **Environment Variables** y agrega:
   - `GEMINI_API_KEY` = la clave del paso 1
   - `WHATSAPP_VERIFY_TOKEN` = una palabra secreta que inventes (ej. `victorias2026`)
4. Clic en **Deploy**. Te queda un link tipo `https://tu-proyecto.vercel.app`.
5. Abre ese link: **ya tienes la demo web funcionando.** Pruébala como si fueras un cliente.

> Cada vez que cambies una variable en Vercel, ve a **Deployments → ⋯ → Redeploy** para que se aplique.

## PASO 3 — Avisos por Telegram (opcional, recomendado)
1. En Telegram busca **@BotFather** → escribe `/newbot` → ponle nombre. Te da un **token**: es tu `TELEGRAM_BOT_TOKEN`.
2. Abre tu bot nuevo y escríbele "hola".
3. En el navegador abre: `https://api.telegram.org/bot<TU_TOKEN>/getUpdates`
   Busca `"chat":{"id": 123456789` — ese número es tu `TELEGRAM_CHAT_ID`.
4. Agrega las dos variables en Vercel y haz Redeploy.

## PASO 4 — Conectar WhatsApp real (Meta Cloud API)
1. Entra a https://developers.facebook.com → **Mis apps → Crear app** → tipo **Empresa (Business)**.
2. Dentro de la app agrega el producto **WhatsApp** → **Configuración de la API (API Setup)**.
3. Ahí Meta te da:
   - Un **número de prueba** gratuito.
   - El **Phone number ID** → es tu `WHATSAPP_PHONE_NUMBER_ID`.
   - Un **token temporal** (dura 24 h) → es tu `WHATSAPP_TOKEN`.
4. En **"Para" (To)** agrega tu celular personal y verifícalo con el código que te llega.
   (Con el número de prueba solo puedes chatear con hasta 5 números que registres ahí.)
5. Pon `WHATSAPP_TOKEN` y `WHATSAPP_PHONE_NUMBER_ID` en Vercel y haz Redeploy.
6. En Meta ve a **WhatsApp → Configuración (Configuration) → Webhook → Editar**:
   - **URL de devolución de llamada:** `https://tu-proyecto.vercel.app/api/whatsapp`
   - **Token de verificación:** la misma palabra de `WHATSAPP_VERIFY_TOKEN`
   - Clic en **Verificar y guardar**.
7. En **Campos del webhook** suscríbete a **messages**.
8. Desde tu celular escríbele "hola" al número de prueba. **El agente te responde.** 🎉

### Para que no se venza el token cada 24 h
En **business.facebook.com → Configuración del negocio → Usuarios del sistema**:
crea un usuario del sistema (Admin), asígnale la app y genera un token con los permisos
`whatsapp_business_messaging` y `whatsapp_business_management`. Reemplaza `WHATSAPP_TOKEN` en Vercel.

### Usar tu número real de negocio
En **API Setup → Agregar número de teléfono**. Importante: un número que está activo en la
app de WhatsApp Business **no puede estar al mismo tiempo en la API**; tendrías que migrarlo
o usar un número nuevo (una SIM aparte es lo más fácil para empezar).

---

## Personalizar para otro negocio (para venderlo)
Todo lo del negocio está en `lib/agent.js`, dentro de `SYSTEM_PROMPT`:
nombre, saludo, qué vende, flujo, salvaguardas y FAQ. Cambias eso, el nombre y las iniciales
en `public/index.html`, y subes un proyecto nuevo a Vercel. Esa es tu plantilla para cada cliente.

## Limitación de esta demo
La memoria de las conversaciones de WhatsApp vive en el servidor de Vercel y se borra cuando
la función se reinicia (normalmente tras unos minutos sin mensajes). Para la demo no importa;
para un cliente real, el siguiente paso es guardar clientes y citas en Airtable o Supabase.
