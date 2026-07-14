/* Keepsake — speech engine */
const Speech = (() => {
  let currentAudio = null;
  let stopCurrent = null;
  let session = 0;
  let controller = null;
  let queue = [];
  let playing = false;
  let onQueueDone = null;

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

  function playUrl(url) {
    return new Promise((resolve, reject) => {
      const cleanup = () => { URL.revokeObjectURL(url); stopCurrent = null; };
      stopCurrent = () => { cleanup(); resolve(); };
      currentAudio = new Audio(url);
      currentAudio.onended = () => { cleanup(); resolve(); };
      currentAudio.onerror = () => { cleanup(); reject(new Error("audio playback failed")); };
      currentAudio.play().catch((e) => { cleanup(); reject(e); });
    });
  }

  async function say(text) {
    const mySession = session;
    controller = new AbortController();
    let url;
    try {
      url = await fetchAudio(text, controller.signal);
    } catch (e) {
      if (e.name === "AbortError") return;
      throw e;
    }
    if (mySession !== session) { URL.revokeObjectURL(url); return; }
    document.body.classList.add("speaking");
    try {
      await playUrl(url);
    } finally {
      document.body.classList.remove("speaking");
    }
  }

  async function sayQueue(texts, betweenMs) {
    stop();
    queue = texts.slice();
    playing = true;
    while (queue.length > 0 && playing) {
      const next = queue.shift();
      try {
        await say(next);
      } catch (e) {
        console.warn("Keepsake speech error:", e);
        break;
      }
      if (queue.length > 0 && playing) {
        await new Promise(r => setTimeout(r, betweenMs || CONFIG.PARAGRAPH_PAUSE));
      }
    }
    playing = false;
    if (onQueueDone) { const cb = onQueueDone; onQueueDone = null; cb(); }
  }

  function stop() {
    session++;
    if (controller) { controller.abort(); controller = null; }
    playing = false;
    queue = [];
    if (currentAudio) { currentAudio.pause(); currentAudio = null; }
    if (stopCurrent) stopCurrent();
    document.body.classList.remove("speaking");
  }

  function isSpeaking() { return playing; }
  function whenDone(cb) { onQueueDone = cb; }

  return { say, sayQueue, stop, isSpeaking, whenDone };
})();