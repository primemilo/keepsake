/* ============================================
   Keepsake — speech engine
   Sends text to the TTS proxy, plays audio
   sequentially with gentle pacing.
   ============================================ */

const Speech = (() => {
  let currentAudio = null;
  let queue = [];
  let playing = false;
  let onQueueDone = null;

  /** Fetch spoken audio for one piece of text. Returns an object URL. */
  async function fetchAudio(text) {
    const resp = await fetch(CONFIG.TTS_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: text, voice_id: CONFIG.VOICE_ID || undefined }),
    });
    if (!resp.ok) throw new Error("tts request failed: " + resp.status);
    const blob = await resp.blob();
    return URL.createObjectURL(blob);
  }

  /** Play a single object URL; resolves when the audio finishes. */
  function playUrl(url) {
    return new Promise((resolve, reject) => {
      currentAudio = new Audio(url);
      currentAudio.onended = () => { URL.revokeObjectURL(url); resolve(); };
      currentAudio.onerror = () => { URL.revokeObjectURL(url); reject(new Error("audio playback failed")); };
      currentAudio.play().catch(reject);
    });
  }

  /** Speak one piece of text (fetch + play). */
  async function say(text) {
    const url = await fetchAudio(text);
    document.body.classList.add("speaking");
    try {
      await playUrl(url);
    } finally {
      document.body.classList.remove("speaking");
    }
  }

  /** Queue several texts to be spoken in order with a pause between. */
  async function sayQueue(texts, betweenMs) {
    stop(); // clear anything already playing
    queue = texts.slice();
    playing = true;
    while (queue.length > 0 && playing) {
      const next = queue.shift();
      try {
        await say(next);
      } catch (e) {
        console.warn("Keepsake speech error:", e);
        break; // fail gently, never crash the experience
      }
      if (queue.length > 0 && playing) {
        await new Promise(r => setTimeout(r, betweenMs || CONFIG.PARAGRAPH_PAUSE));
      }
    }
    playing = false;
    if (onQueueDone) { const cb = onQueueDone; onQueueDone = null; cb(); }
  }

  /** Stop all speech immediately (used by Rest / navigation). */
  function stop() {
    playing = false;
    queue = [];
    if (currentAudio) {
      currentAudio.pause();
      currentAudio = null;
    }
    document.body.classList.remove("speaking");
  }

  function isSpeaking() { return playing; }
  function whenDone(cb) { onQueueDone = cb; }

  return { say, sayQueue, stop, isSpeaking, whenDone };
})();