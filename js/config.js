/* Keepsake configuration */
const CONFIG = {
  // Cloudflare Worker endpoint that proxies Fish Audio TTS
  TTS_ENDPOINT: "https://keepsake-voice.leonotieno43.workers.dev",
  // Default voice (empty = Fish Audio default). We'll pick a warm one later.
  VOICE_ID: "",
  // Pause between spoken paragraphs (ms) — unhurried by design
  PARAGRAPH_PAUSE: 1200,
};