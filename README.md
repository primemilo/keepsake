# Keepsake

**A gentle reading companion — letters, documents, and bedtime stories, read aloud in the voices of the people you love.**

Live: **https://primemilo.github.io/keepsake/**

When a parent is away — on deployment, a work trip, or simply in another city — Keepsake can still read their child a bedtime story, in their own voice. A young child who hasn't seen mom or dad in weeks can fall asleep hearing them anyway. When a grandmother's eyes tire, a letter from a grandchild can be photographed and read aloud in that grandchild's voice — and just as easily, a grandparent can record their own voice so their grandchildren can hear them read a story back. Keepsake is not a replacement for being there. It is a bridge until the next call, the next visit.

## What it does

- **Read to me** — paste any text, open a PDF or text file, or photograph a
  printed page. Keepsake reads it aloud in warm, natural speech with gentle
  pacing and simple controls: Pause, Start over, Read something else.
- **Story Time** — a small library of classic fables, read through the same
  engine. With a family voice selected, it becomes bedtime stories in a
  parent's voice — a way for a child to stay familiar with a voice they
  might not hear in person every day.
- **Family voices** — record about 20 seconds of a loved one's voice (with
  their permission), or upload a voice note they sent from far away. Keepsake
  clones the voice through Fish Audio and reads everything in it. Voices can
  be switched or removed at any time — a parent's voice for a bedtime story,
  a grandchild's voice for grandma's letter, a grandparent's voice reading
  back to the kids. The connection runs in both directions.

## Who it's for

Keepsake is designed first for people that most reading apps design last:
elderly readers, low-vision readers, early readers, and families separated by
distance — a parent traveling for work, a grandparent in another city, a
child too young to read the letter themselves. That shapes every decision —
large touch targets, high contrast, a serif face at 20px, no accounts, no
clutter, reduced-motion support, and error messages that never blame the
user ("I couldn't make out the words. Try again with more light, holding
the page flat.").

### Care-design principles

1. **Fail gently.** Nothing crashes, nothing scolds. Every error suggests
   what to try next.
2. **Never rush.** Sentence-aware chunking with unhurried pauses between
   thoughts.
3. **Huge targets, plain words.** One-tap actions, described in the language
   of reading, not the language of software.

## How it works

- **Static site** — vanilla HTML/CSS/JS, no framework, no build step, hosted
  on GitHub Pages.
- **Fish Audio TTS** — every piece of text is chunked and spoken via Fish
  Audio's text-to-speech API (the app's core feature).
- **Fish Audio voice cloning** — recorded or uploaded samples are converted
  to WAV client-side and cloned into a private Fish voice model; its
  reference id then rides along on every TTS request.
- **Cloudflare Worker proxy** — a small Worker holds the Fish API key as a
  secret and exposes two routes: `POST /` ({text, voice_id} → MP3) and
  `POST /clone` (multipart audio → voice id). The key never reaches the
  browser.
- **Client-side extraction** — PDFs are read with pdf.js and photos with
  Tesseract.js, entirely in the browser.

## Privacy

Nothing you read is stored. PDFs and photos never leave the device — only
the extracted text is sent for speech. There are no accounts and no
database; your saved voices live in your browser's localStorage. A cloned
voice model is stored privately with Fish Audio; only you hold its id.
Clone a voice only with that person's permission.

## Running your own

1. Create a Cloudflare Worker, paste `worker.js`, and set a secret named
   `FISH_API_KEY` with your Fish Audio API key.
2. Put your Worker URL in `js/config.js` as `TTS_ENDPOINT`, and optionally a
   default Fish voice reference id as `VOICE_ID`.
3. Serve the folder from any static host.

## What's next

- Saved letters — a local archive of read items, replayable anytime
- Shareable keepsakes — export a reading as audio to send over WhatsApp
- More languages — Fish Audio supports 80+; Keepsake's reading engine
  already doesn't care what language the text is in

---

Built for the Fish Audio Week 1 Builder Contest (Realtime TTS Voice Agent).
