/* Keepsake — speech engine with IndexedDB caching */
const Speech = (() => {
  let currentAudio = null;
  let stopCurrent = null;
  let session = 0;
  let controller = null;
  let queue = [];
  let playing = false;
  let onQueueDone = null;

  // ---------- IndexedDB cache ----------
  const DB_NAME = "keepsake-cache";
  const STORE_NAME = "audio";
  let dbPromise = null;

  function openDB() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
      req.onsuccess = (e) => resolve(e.target.result);
      req.onerror = (e) => reject(e.target.error);
    });
    return dbPromise;
  }

  async function getCachedBlob(key) {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    });
  }

  async function setCachedBlob(key, blob) {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    store.put(blob, key);
  }

  function hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const ch = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + ch;
      hash |= 0;
    }
    return hash.toString(36);
  }

  async function fetchAudio(text, signal) {
    const cacheKey = hashString(text + CONFIG.VOICE_ID);

    // 1. Try cache
    const cachedBlob = await getCachedBlob(cacheKey);
    if (cachedBlob) {
      return URL.createObjectURL(cachedBlob);
    }

    // 2. Fetch from Fish Audio
    const resp = await fetch(CONFIG.TTS_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, voice_id: CONFIG.VOICE_ID || undefined }),
      signal,
    });
    if (!resp.ok) throw new Error("tts request failed: " + resp.status);
    const blob = await resp.blob();

    // 3. Cache the blob for next time (fire and forget)
    setCachedBlob(cacheKey, blob).catch(() => {});

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