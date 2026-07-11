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
  let generation = 0;   // playback token — bumping it retires any running loop

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
    generation++;   // retire any running loop
    chunks = []; position = 0; paused = false;
    document.getElementById("reader").classList.add("hidden");
    document.getElementById("read-input").classList.remove("hidden");
    setPauseLabel("Pause");
  }

  function setPauseLabel(label) {
    document.getElementById("btn-reader-pause").textContent = label;
  }

  async function playFrom(index) {
    const myGen = ++generation;   // any older loop is now stale
    position = index;
    paused = false;
    setPauseLabel("Pause");
    while (position < chunks.length && !paused) {
      const chunk = chunks[position];
      document.getElementById("reader-text").textContent = chunk;
      try {
        await Speech.say(chunk);
        if (myGen !== generation) return;   // a newer loop took over
      } catch (e) {
        if (myGen !== generation) return;
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
      if (myGen !== generation) return;
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
      generation++;                  // kill the loop even if it's mid-fetch
      Speech.stop();
      setPauseLabel("Continue");
      document.getElementById("reader-text").textContent += "  (paused)";
    }
  }

  function restart() {
    Speech.stop();
    playFrom(0);
  }

  /* ---------- PDF extraction (client-side, nothing uploaded) ---------- */

  async function extractPdfText(file, statusEl) {
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
    const buf = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
    const maxPages = Math.min(pdf.numPages, 50); // sanity cap
    let out = "";
    for (let p = 1; p <= maxPages; p++) {
      if (statusEl) statusEl.textContent = `Opening your document... page ${p} of ${maxPages}`;
      const page = await pdf.getPage(p);
      const content = await page.getTextContent();
      out += content.items.map(i => i.str).join(" ") + " ";
    }
    return out;
  }

  /* ---------- wiring ---------- */

  function init() {
    // any screen navigation silences playback everywhere
    document.addEventListener("click", (e) => {
      const nav = e.target.closest("[data-goto]");
      if (nav) {
        generation++;      // retire any reading loop
        Speech.stop();     // also halts Story Time's queue
      }
    });

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

    // file handling — txt and pdf, all client-side
    document.getElementById("file-input").addEventListener("change", async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const status = document.getElementById("file-status");
      const name = file.name.toLowerCase();

      if (name.endsWith(".txt")) {
        const text = await file.text();
        start(text, file.name);

      } else if (name.endsWith(".pdf")) {
        status.textContent = "Opening your document...";
        try {
          const text = await extractPdfText(file, status);
          if (text.trim()) {
            status.textContent = "";
            start(text, file.name);
          } else {
            status.textContent =
              "This PDF has no readable text — it may be a scanned image. Try the Snap a photo option instead.";
          }
        } catch (err) {
          console.warn("Keepsake pdf error:", err);
          status.textContent = "I couldn't open that document. Perhaps try another one.";
        }
      }
      e.target.value = "";
    });

    // photo handling — OCR, all client-side, nothing uploaded
    document.getElementById("photo-input").addEventListener("change", async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const status = document.getElementById("photo-status");
      status.textContent = "Reading your photo... this takes a moment.";
      try {
        const result = await Tesseract.recognize(file, "eng", {
          logger: (m) => {
            if (m.status === "recognizing text") {
              status.textContent =
                `Reading your photo... ${Math.round(m.progress * 100)}%`;
            }
          },
        });
        const text = (result.data.text || "").trim();
        if (text.length >= 20) {
          status.textContent = "";
          start(text, "Reading your photo");
        } else {
          status.textContent =
            "I couldn't make out the words. Try again with more light, holding the page flat.";
        }
      } catch (err) {
        console.warn("Keepsake ocr error:", err);
        status.textContent =
          "I couldn't read that photo. Perhaps try taking it again.";
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