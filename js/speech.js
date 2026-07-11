/* ============================================
   Keepsake — speech engine
   Sends text to the TTS proxy, plays audio
   sequentially with gentle pacing.
   ============================================ */

const Speech = (() => {
  let currentAudio = null;
  let stopCurrent = null;   // settles a pending playUrl promise when stop() is called
  let session = 0;          // bumped by stop(); anything started before is stale
  let controller = null;    // aborts an in-flight TTS fetch
  let queue = [];
  let playing = false;
  let onQueueDone = null;

  /** Fetch spoken audio for one piece of text. Returns an object URL. */
  async function fetchAudio(text, signal) {
    const resp = await fetch(CONFIG.TTS_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: text, voice_id: CONFIG.VOICE_ID || undefined }),
      signal: signal,
    });
    if (!resp.ok) throw new Error("tts request failed: " + resp.status);
    const blob = await resp.blob();
    return URL.createObjectURL(blob);
  }

  /** Play a single object URL; resolves when the audio finishes OR stop() is called. */
  function playUrl(url) {
    return new Promise((resolve, reject) => {
      const cleanup = () => { URL.revokeObjectURL(url); stopCurrent = null; };
      stopCurrent = () => { cleanup(); resolve(); };   // stop() ends us gently
      currentAudio = new Audio(url);
      currentAudio.onended = () => { cleanup(); resolve(); };
      currentAudio.onerror = () => { cleanup(); reject(new Error("audio playback failed")); };
      currentAudio.play().catch((e) => { cleanup(); reject(e); });
    });
  }

  /** Speak one piece of text (fetch + play). Exits silently if stopped mid-fetch. */
  async function say(text) {
    const mySession = session;
    controller = new AbortController();
    let url;
    try {
      url = await fetchAudio(text, controller.signal);
    } catch (e) {
      if (e.name === "AbortError") return;   // stopped while fetching — exit quietly
      throw e;
    }
    if (mySession !== session) {             // stopped while fetching (belt and braces)
      URL.revokeObjectURL(url);
      return;
    }
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

  /** Stop all speech immediately — including a fetch still in flight. */
  function stop() {
    session++;                                  // retire anything already started
    if (controller) { controller.abort(); controller = null; }
    playing = false;
    queue = [];
    if (currentAudio) {
      currentAudio.pause();
      currentAudio = null;
    }
    if (stopCurrent) stopCurrent();             // settle any hung playUrl promise
    document.body.classList.remove("speaking");
  }

  function isSpeaking() { return playing; }
  function whenDone(cb) { onQueueDone = cb; }

  return { say, sayQueue, stop, isSpeaking, whenDone };
})();