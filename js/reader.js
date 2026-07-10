/* ============================================
   Keepsake — Read to me
   Text in (paste / file / photo) → spoken out.
   Chunks long text into natural sentence groups
   so speech flows and pause/resume feels right.
   ============================================ */

const Reader = (() => {
  let chunks = [];      // sentence groups to speak
  let position = 0;     // current chunk index
  let paused = false;

  /* ---------- text preparation ---------- */

  /** Split any text into speakable chunks (~2-3 sentences each). */
  function chunkText(raw) {
    const clean = raw
      .replace(/\s+/g, " ")           // collapse whitespace/newlines
      .replace(/[""]/g, '"')
      .trim();
    if (!clean) return [];

    // split on sentence enders, keep the punctuation
    const sentences = clean.match(/[^.!?]+[.!?]+["']?|[^.!?]+$/g) || [clean];

    const out = [];
    let buf = "";
    for (const s of sentences) {
      if ((buf + s).length > 260 && buf) {
        out.push(buf.trim());
        buf = s;
      } else {
        buf += s;
      }
    }
    if (buf.trim()) out.push(buf.trim());
    return out;
  }

  /* ---------- playback ---------- */

  function showReader() {
    document.getElementById("read-input").classList.add("hidden");
    document.getElementById("reader").classList.remove("hidden");
  }

  function showInput() {
    Speech.stop();
    chunks = []; position = 0; paused = false;
    document.getElementById("reader").classList.add("hidden");
    document.getElementById("read-input").classList.remove("hidden");
    setPauseLabel("Pause");
  }

  function setPauseLabel(label) {
    document.getElementById("btn-reader-pause").textContent = label;
  }

  async function playFrom(index) {
    position = index;
    paused = false;
    setPauseLabel("Pause");
    while (position < chunks.length && !paused) {
      const chunk = chunks[position];
      document.getElementById("reader-text").textContent = chunk;
      try {
        await Speech.say(chunk);
      } catch (e) {
        console.warn("Keepsake reader error:", e);
        document.getElementById("reader-text").textContent =
          "I need a little rest. Press Start over to try again.";
        return;
      }
      if (paused) return;
      position++;
      if (position < chunks.length) {
        await new Promise(r => setTimeout(r, CONFIG.PARAGRAPH_PAUSE));
      }
    }
    if (position >= chunks.length && !paused) {
      document.getElementById("reader-text").textContent = "That's everything. All done.";
      Speech.say("That's everything. All done.").catch(() => {});
    }
  }

  function start(text, title) {
    chunks = chunkText(text);
    if (chunks.length === 0) return;
    document.getElementById("reader-title").textContent = title || "Reading";
    showReader();
    playFrom(0);
  }

  function pauseResume() {
    if (paused) {
      playFrom(position);            // resume from current chunk
    } else {
      paused = true;
      Speech.stop();
      setPauseLabel("Continue");
      document.getElementById("reader-text").textContent += "  (paused)";
    }
  }

  function restart() {
    Speech.stop();
    playFrom(0);
  }

  /* ---------- wiring ---------- */

  function init() {
    // tabs
    document.querySelectorAll(".tab-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
        document.querySelectorAll(".tab-panel").forEach(p => p.classList.remove("active"));
        btn.classList.add("active");
        document.getElementById(btn.dataset.tab).classList.add("active");
      });
    });

    // paste
    document.getElementById("btn-read-paste").addEventListener("click", () => {
      const text = document.getElementById("paste-box").value;
      if (text.trim()) start(text, "Reading your text");
    });

    // file + photo buttons just open the hidden inputs
    document.getElementById("btn-choose-file").addEventListener("click", () =>
      document.getElementById("file-input").click());
    document.getElementById("btn-choose-photo").addEventListener("click", () =>
      document.getElementById("photo-input").click());

    // file handling (txt now; PDF arrives next step)
    document.getElementById("file-input").addEventListener("change", async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const status = document.getElementById("file-status");
      if (file.name.toLowerCase().endsWith(".txt")) {
        const text = await file.text();
        start(text, file.name);
      } else if (file.name.toLowerCase().endsWith(".pdf")) {
        status.textContent = "PDF support is coming in the next step of the build.";
      }
      e.target.value = "";
    });

    // photo handling (OCR arrives in a later step)
    document.getElementById("photo-input").addEventListener("change", (e) => {
      if (e.target.files[0]) {
        document.getElementById("photo-status").textContent =
          "Photo reading is coming in the next step of the build.";
      }
      e.target.value = "";
    });

    // reader controls
    document.getElementById("btn-reader-pause").addEventListener("click", pauseResume);
    document.getElementById("btn-reader-restart").addEventListener("click", restart);
    document.getElementById("btn-reader-new").addEventListener("click", showInput);
  }

  return { init, start, showInput };
})();