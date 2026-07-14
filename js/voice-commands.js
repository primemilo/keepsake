/* Voice commands — hands-free navigation for Keepsake */
const VoiceCommands = (() => {
  const btn = document.getElementById("voice-command-btn");
  let recognition = null;
  let listening = false;

  const intros = [
    "Of course. I'd love to read that for you.",
    "Right away. Here it comes.",
    "Settle in. I'll share that now.",
    "With love. Let me read that for you."
  ];
  function pickIntro() {
    return intros[Math.floor(Math.random() * intros.length)];
  }

  function init() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      btn.style.display = "none";
      return;
    }
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.lang = "en-US";
    recognition.interimResults = false;

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript.trim().toLowerCase();
      processCommand(transcript);
    };
    recognition.onerror = () => stopListening();
    recognition.onend = () => stopListening();

    btn.addEventListener("click", () => {
      if (listening) stopListening();
      else startListening();
    });
  }

  function startListening() {
    listening = true;
    btn.classList.add("listening");
    recognition.start();
  }

  function stopListening() {
    listening = false;
    btn.classList.remove("listening");
    recognition.stop();
  }

  function processCommand(transcript) {
    const t = transcript.toLowerCase();
    if (t.includes("stop") || t.includes("pause")) { Speech.stop(); return; }
    if (t.includes("continue") || t.includes("resume")) { Reader.pauseResume(); return; }

    const story = matchStory(t);
    if (story) {
      const intro = pickIntro() + " " + `Reading ${story.title}.`;
      Speech.say(intro).then(() => {
        goTo("screen-read");
        Reader.start(story.text, story.title);
      });
      return;
    }

    const libItem = matchLibrary(t);
    if (libItem) {
      const voice = Voices.getVoices().find(v => v.id === libItem.voiceId) || { name: "Keepsake" };
      const intro = pickIntro() + " " + `Reading ${libItem.title} in ${voice.name}'s voice.`;
      Speech.say(intro).then(() => {
        goTo("screen-read");
        Reader.start(libItem.text, libItem.title);
      });
      return;
    }

    Speech.say("I can read any story or a family message. Try saying 'read the tortoise story' or 'read dad's letter'.");
  }

  function matchStory(transcript) {
    const stories = [
      { keywords: ["tortoise", "hare", "slow", "steady"], id: "tortoise-hare" },
      { keywords: ["wind", "sun", "gentle", "strong"], id: "north-wind-sun" },
      { keywords: ["starfish", "boy", "beach", "difference"], id: "starfish" }
    ];
    for (const s of stories) {
      if (s.keywords.some(k => transcript.includes(k))) {
        return window.STORIES.find(x => x.id === s.id);
      }
    }
    return null;
  }

  function matchLibrary(transcript) {
    const items = Library.getItems();
    for (const item of items) {
      if (transcript.includes(item.title.toLowerCase())) return item;
    }
    for (const item of items) {
      const voice = Voices.getVoices().find(v => v.id === item.voiceId);
      if (voice && transcript.includes(voice.name.toLowerCase())) return item;
    }
    return null;
  }

  return { init };
})();

document.addEventListener("DOMContentLoaded", VoiceCommands.init);