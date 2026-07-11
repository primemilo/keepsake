# Keepsake

Keepsake is a gentle reading companion. It reads letters, documents, bedtime
stories, pretty much anything  out loud, in the voices of the people you love.

## Try it right now

**https://primemilo.github.io/keepsake/** — no signup, no keys, works on your phone.

The one-minute version: open **Family voices**, record about 15 seconds of
yourself (or upload a voice note someone sent you), then open **Story Time**


Why I built it: my sister has a little kid, and when she's at work or away,
keeping the little guy calm is a real challenge. Sometimes we have to call
her just so he can hear her voice. That's where the idea came from. If her
voice is what calms him down, then her voice should be able to read him his
bedtime story even when she can't be in the room.

So that's what Keepsake does. You record about 20 seconds of someone's voice
(or they send you a voice note from wherever they are), and from then on
Keepsake can read anything in that voice. A story for a kid who misses their
mom. A grandchild's letter read out loud for a grandmother whose eyes get
tired. A grandfather recording his voice once so the kids can hear him read
fables from another country.

It's not meant to replace anyone. It's basically a bridge until the next call or the
next visit.

## What it does

**Read to me.** Paste any text, open a PDF or text file, or take a photo of
a printed page and Keepsake reads it aloud. The controls are just Pause,
Start over, and Read something else. Nothing to learn.

**Story Time.** A small library of classic fables, read through the same
engine. Pick a family voice first and it turns into bedtime stories in
mom's voice.

**Family voices.** Record a voice in the app, or upload a voice note sent
over WhatsApp. Keepsake clones it through Fish Audio and reads everything
in it. You can save several voices, switch between them, or remove them
anytime. Please only clone a voice with that person's permission.

## Who it's for

The people most reading apps think about last: elderly readers, low-vision
readers, kids who can't read yet, and families spread across cities and
time zones. That's why the buttons are huge, the text is large and high
contrast, there are no accounts, and the error messages never blame you —
if a photo is too blurry it just says "Try again with more light, holding
the page flat."

A few rules I stuck to while building: fail gently (nothing crashes,
nothing scolds), never rush (the reading has unhurried pauses between
thoughts), and use plain words (the app talks about reading, not about
software).

## How it works

Plain HTML/CSS/JS, no framework, no build step, hosted on GitHub Pages.

Every piece of text gets chunked into sentence groups and spoken through
Fish Audio's TTS API. Voice samples are converted to WAV in the browser and
cloned into a private Fish voice model — after that, the model's reference
id just rides along on every TTS request.

A small Cloudflare Worker sits in the middle and holds the Fish API key as
a secret, so the key never touches the browser. It has two routes:
`POST /` takes `{text, voice_id}` and returns MP3, and `POST /clone` takes
the audio sample and returns a voice id.

PDFs are read with pdf.js and photos with Tesseract.js, both entirely on
the device. The extracted text is the only thing that ever gets sent
anywhere.

## Privacy

Nothing you read is stored. No accounts, no database. Your saved voices
live in your browser's localStorage, and the cloned voice model sits
privately in Fish Audio — only you have its id.

## Running your own

1. Create a Cloudflare Worker, paste in `worker.js`, and add a secret named
   `FISH_API_KEY` with your Fish Audio API key.
2. Put your Worker URL in `js/config.js` as `TTS_ENDPOINT`. You can also set
   a default Fish voice with `VOICE_ID`.
3. Serve the folder from any static host.

## What's next

Saved letters (a local archive you can replay), shareable keepsakes (export
a reading as audio to send over WhatsApp — voice notes are how my family
talks anyway), and more languages, since Fish supports 80+ and the reading
engine doesn't care what language the text is in.

---

Built for the Fish Audio Week 1 Builder Contest.
