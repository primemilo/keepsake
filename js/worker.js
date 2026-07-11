/* Keepsake voice worker
   POST /        {text, voice_id?}            -> MP3 audio
   POST /clone   multipart: title, voices     -> {id} (Fish voice model id)   */

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: CORS });
    }
    if (request.method !== "POST") {
      return new Response("POST only", { status: 405, headers: CORS });
    }

    const url = new URL(request.url);

    /* ---------- voice cloning ---------- */
    if (url.pathname === "/clone") {
      try {
        const inForm = await request.formData();
        const sample = inForm.get("voices");
        const title = inForm.get("title") || "Keepsake voice";
        if (!sample) {
          return new Response(JSON.stringify({ error: "no audio sample" }),
            { status: 400, headers: { ...CORS, "Content-Type": "application/json" } });
        }

        const outForm = new FormData();
        outForm.append("type", "tts");
        outForm.append("title", title);
        outForm.append("train_mode", "fast");
        outForm.append("visibility", "private");
        outForm.append("voices", sample, "sample.wav");

        const resp = await fetch("https://api.fish.audio/model", {
          method: "POST",
          headers: { "Authorization": "Bearer " + env.FISH_API_KEY },
          body: outForm,
        });
        if (!resp.ok) {
          const detail = await resp.text();
          return new Response(JSON.stringify({ error: "fish clone failed", status: resp.status, detail }),
            { status: 502, headers: { ...CORS, "Content-Type": "application/json" } });
        }
        const model = await resp.json();
        return new Response(JSON.stringify({ id: model._id }),
          { headers: { ...CORS, "Content-Type": "application/json" } });
      } catch (e) {
        return new Response(JSON.stringify({ error: String(e) }),
          { status: 500, headers: { ...CORS, "Content-Type": "application/json" } });
      }
    }

    /* ---------- text to speech (existing contract) ---------- */
    try {
      const { text, voice_id } = await request.json();
      if (!text) {
        return new Response("no text", { status: 400, headers: CORS });
      }
      const body = { text: text, format: "mp3" };
      if (voice_id) body.reference_id = voice_id;

      const resp = await fetch("https://api.fish.audio/v1/tts", {
        method: "POST",
        headers: {
          "Authorization": "Bearer " + env.FISH_API_KEY,
          "Content-Type": "application/json",
          "model": "s2.1-pro-free",   // free through July 24, 2026 per Fish announcement
        },
        body: JSON.stringify(body),
      });
      if (!resp.ok) {
        return new Response("fish tts failed: " + resp.status, { status: 502, headers: CORS });
      }
      return new Response(resp.body, {
        headers: { ...CORS, "Content-Type": "audio/mpeg" },
      });
    } catch (e) {
      return new Response("bad request: " + String(e), { status: 400, headers: CORS });
    }
  },
};