/* Keepsake configuration */
const CONFIG = {
  TTS_ENDPOINT: "https://keepsake-voice.leonotieno43.workers.dev",
  VOICE_ID: "308bfbe6924a43ed974b630a7f74d6b8",
  PARAGRAPH_PAUSE: 1200,
  DEFAULT_LANG: "",

  get LANG() {
    return localStorage.getItem("keepsake-lang") || this.DEFAULT_LANG;
  },
  set LANG(value) {
    localStorage.setItem("keepsake-lang", value);
  }
};