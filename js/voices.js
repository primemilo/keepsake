/* ============================================
   Keepsake — Family voices
   Record ~20s of a loved one's voice (or upload
   a voice note), preview it, clone it through
   the Worker, and read in it. Voice list lives
   in localStorage; the active voice simply
   becomes CONFIG.VOICE_ID.
   ============================================ */

const Voices = (() => {
  const STORE_KEY = "keepsake-voices";        // [{id, name}]
  const ACTIVE_KEY = "keepsake-active-voice"; // id or ""
  const MIN_SECONDS = 10;
  const MAX_SECONDS = 30;
  const MAX_UPLOAD_SECONDS = 210;   // Fish accepts reference audio up to 210s

  let mediaRecorder = null;
  let recChunks = [];
  let recTimer = null;
  let recSeconds = 0;
  let recStream = null;
  let pendingBlob = null;   // recorded or uploaded audio awaiting save
  let previewUrl = null;

  /* ---------- storage ---------- */

  function getVoices() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY)) || []; }
    catch { return []; }
  }
  function saveVoices(list) {
    localStorage.setItem(STORE_KEY, JSON.stringify(list));
  }
  function getActive() { return localStorage.getItem(ACTIVE_KEY) || ""; }
  function setActive(id) {
    localStorage.setItem(ACTIVE_KEY, id);
    CONFIG.VOICE_ID = id || CONFIG.DEFAULT_VOICE_ID;
    renderList();
  }

  /* ---------- WAV conversion (Fish prefers wav/mp3; browsers record webm) ---------- */

  async function blobToWav(blob) {
    const arrayBuf = await blob.arrayBuffer();
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const decoded = await ctx.decodeAudioData(arrayBuf);
    ctx.close();

    // mono 16-bit PCM
    const ch = decoded.getChannelData(0);
    const sampleRate = decoded.sampleRate;
    const buffer = new ArrayBuffer(44 + ch.length * 2);
    const view = new DataView(buffer);
    const writeStr = (off, s) => { for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i)); };

    writeStr(0, "RIFF");
    view.setUint32(4, 36 + ch.length * 2, true);
    writeStr(8, "WAVE");
    writeStr(12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);            // PCM
    view.setUint16(22, 1, true);            // mono
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeStr(36, "data");
    view.setUint32(40, ch.length * 2, true);
    let off = 44;
    for (let i = 0; i < ch.length; i++, off += 2) {
      const s = Math.max(-1, Math.min(1, ch[i]));
      view.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }
    return new Blob([buffer], { type: "audio/wav" });
  }

  /* ---------- helpers ---------- */

  function el(id) { return document.getElementById(id); }
  function status(msg) { el("voice-status").textContent = msg; }
  function show(id) { el(id).classList.remove("hidden"); }
  function hide(id) { el(id).classList.add("hidden"); }

  function toRecordState() {
    if (previewUrl) { URL.revokeObjectURL(previewUrl); previewUrl = null; }
    pendingBlob = null;
    el("voice-preview").src = "";
    el("voice-name").value = "";
    hide("voice-review");
    show("voice-recorder");
    hide("record-timer");
    el("btn-record").textContent = "Start recording";
  }

  function toReviewState() {
    previewUrl = URL.createObjectURL(pendingBlob);
    el("voice-preview").src = previewUrl;
    hide("voice-recorder");
    show("voice-review");
    status("Listen back. If it sounds clear, give it a name and save.");
  }

  /* ---------- recording ---------- */

  async function startRecording() {
    try {
      recStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      status("I couldn't reach the microphone. Please allow microphone access and try again.");
      return;
    }

    recChunks = [];
    recSeconds = 0;
    status("");
    mediaRecorder = new MediaRecorder(recStream);
    mediaRecorder.ondataavailable = (e) => { if (e.data.size) recChunks.push(e.data); };
    mediaRecorder.onstop = () => finishRecording();
    mediaRecorder.start();

    el("btn-record").textContent = "Stop recording";
    show("record-timer");
    el("record-timer").textContent = "0s";
    recTimer = setInterval(() => {
      recSeconds++;
      el("record-timer").textContent = recSeconds + "s";
      if (recSeconds >= MAX_SECONDS) stopRecording();
    }, 1000);
  }

  function stopRecording() {
    clearInterval(recTimer);
    if (mediaRecorder && mediaRecorder.state !== "inactive") mediaRecorder.stop();
    if (recStream) { recStream.getTracks().forEach(t => t.stop()); recStream = null; }
    el("btn-record").textContent = "Start recording";
  }

  /* ---------- uploading (voice notes from far-away family) ---------- */

  async function handleUpload(file) {
    status("Checking the recording...");
    try {
      const buf = await file.arrayBuffer();
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const decoded = await ctx.decodeAudioData(buf);
      ctx.close();
      if (decoded.duration < MIN_SECONDS) {
        status(`That recording is a little short — I need at least ${MIN_SECONDS} seconds.`);
        return;
      }
      if (decoded.duration > MAX_UPLOAD_SECONDS) {
        status("That recording is quite long — please use one under three and a half minutes.");
        return;
      }
      pendingBlob = file;
      toReviewState();
    } catch {
      status("I couldn't open that recording. WhatsApp voice notes and most audio files work well.");
    }
  }

  function finishRecording() {
    hide("record-timer");
    if (recSeconds < MIN_SECONDS) {
      status(`That was a little short — I need at least ${MIN_SECONDS} seconds. Please try again.`);
      return;
    }
    pendingBlob = new Blob(recChunks, { type: mediaRecorder.mimeType || "audio/webm" });
    toReviewState();
  }

  /* ---------- saving (clone through the Worker) ---------- */

  async function saveVoice() {
    const name = el("voice-name").value.trim();
    if (!name) { status("First, tell me whose voice this is."); return; }
    if (!pendingBlob) { status("Please record a voice first."); return; }

    el("btn-save-voice").disabled = true;
    status("Preparing the voice... this takes a moment.");
    try {
      const wavBlob = await blobToWav(pendingBlob);

      const form = new FormData();
      form.append("title", "Keepsake - " + name);
      form.append("voices", wavBlob, "sample.wav");

      const resp = await fetch(CONFIG.TTS_ENDPOINT.replace(/\/$/, "") + "/clone", {
        method: "POST",
        body: form,
      });
      if (!resp.ok) throw new Error("clone failed: " + resp.status);
      const data = await resp.json();
      if (!data.id) throw new Error("no voice id returned");

      const list = getVoices();
      list.push({ id: data.id, name: name });
      saveVoices(list);
      setActive(data.id);
      toRecordState();
      status(`All set. Keepsake will now read in ${name}'s voice.`);
    } catch (err) {
      console.warn("Keepsake voice error:", err);
      status("I couldn't save that voice. Please check the connection and try again.");
    } finally {
      el("btn-save-voice").disabled = false;
    }
  }

  /* ---------- voice list UI ---------- */

  function renderList() {
    const listEl = el("voice-list");
    if (!listEl) return;
    const voices = getVoices();
    const active = getActive();

    listEl.innerHTML = "";

    // default voice option
    listEl.appendChild(makeRow("Keepsake's own voice", "", active === "", false));

    voices.forEach(v => {
      listEl.appendChild(makeRow(v.name, v.id, v.id === active, true));
    });
  }

  function makeRow(label, id, checked, deletable) {
    const row = document.createElement("div");
    row.className = "voice-row";

    const radio = document.createElement("input");
    radio.type = "radio";
    radio.name = "reading-voice";
    radio.id = "voice-opt-" + (id || "default");
    radio.checked = checked;
    radio.addEventListener("change", () => setActive(id));

    const lab = document.createElement("label");
    lab.htmlFor = radio.id;
    lab.textContent = label;

    row.appendChild(radio);
    row.appendChild(lab);

    if (deletable) {
      const del = document.createElement("button");
      del.className = "voice-del";
      del.textContent = "Remove";
      del.addEventListener("click", () => {
        saveVoices(getVoices().filter(x => x.id !== id));
        if (getActive() === id) setActive("");
        else renderList();
      });
      row.appendChild(del);
    }
    return row;
  }

  /* ---------- boot (self-initializing; app.js untouched) ---------- */

  function init() {
    const recBtn = el("btn-record");
    if (!recBtn) return;

    recBtn.addEventListener("click", () => {
      if (mediaRecorder && mediaRecorder.state === "recording") stopRecording();
      else startRecording();
    });
    el("btn-save-voice").addEventListener("click", saveVoice);
    el("btn-discard-voice").addEventListener("click", () => { toRecordState(); status(""); });
    el("btn-upload-voice").addEventListener("click", () => el("voice-file").click());
    el("voice-file").addEventListener("change", (e) => {
      if (e.target.files[0]) handleUpload(e.target.files[0]);
      e.target.value = "";
    });

    // restore the active family voice on every page load
    CONFIG.DEFAULT_VOICE_ID = CONFIG.VOICE_ID;   // remember your chosen default
    const active = getActive();
    if (active) CONFIG.VOICE_ID = active;
    renderList();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  return { getVoices, setActive };
})();