/* ============================================
   Keepsake — app logic
   Navigation + Story Time library
   ============================================ */

const STORIES = [
  {
    id: "tortoise-hare",
    title: "The Tortoise and the Hare",
    sub: "A gentle fable · about 3 minutes",
    text: "Once upon a time, there was a hare who was very proud of how fast he could run. He teased the old tortoise every day, saying, you are the slowest creature I have ever seen. The tortoise smiled calmly and said, perhaps. But I will race you, if you like. The hare laughed and laughed, and agreed at once. The race began on a warm morning. The hare dashed ahead, far out of sight. Feeling sure of his win, he lay down under a shady tree and fell fast asleep. The tortoise walked on, slow and steady, step after step. He passed the sleeping hare quietly, and kept going without a fuss. When the hare woke, the sun was low. He ran as fast as his legs could carry him, but it was too late. The tortoise was already at the finish line, smiling his calm smile. And so the old saying was born: slow and steady wins the race.",
  },
  {
    id: "north-wind-sun",
    title: "The North Wind and the Sun",
    sub: "A gentle fable · about 2 minutes",
    text: "The North Wind and the Sun once argued about who was stronger. Just then, a traveler came walking down the road, wrapped in a warm cloak. Let us agree, said the Sun, that whoever can make the traveler take off his cloak is the stronger one. The North Wind agreed, and went first. The Wind blew as hard as he could. But the harder he blew, the tighter the traveler held his cloak around him. At last, the Wind gave up. Then the Sun came out and shone gently, warm and kind. Soon the traveler grew comfortable, then warm, and took his cloak off himself to enjoy the fine day. Gentleness and warmth, the story tells us, succeed where force and bluster fail.",
  },
  {
    id: "starfish",
    title: "The Boy and the Starfish",
    sub: "A short kind tale · about 2 minutes",
    text: "One morning after a storm, thousands of starfish lay stranded on the beach. An old man walking there saw a young boy picking them up, one at a time, and throwing them back into the sea. Young man, he said kindly, there are thousands of them. You cannot possibly make a difference. The boy picked up another starfish and gently threw it into the waves. He smiled and said, I made a difference to that one. The old man was quiet for a moment. Then he bent down, picked up a starfish, and threw it into the sea too.",
  },
];

/* ---------- navigation ---------- */
function goTo(screenId) {
  Speech.stop();
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  document.getElementById(screenId).classList.add("active");
  if (screenId === "screen-stories") renderStoryList();
  if (screenId === "screen-read") Reader.showInput();
}

document.addEventListener("click", (e) => {
  const nav = e.target.closest("[data-goto]");
  if (nav) goTo(nav.dataset.goto);
});

/* ---------- Story Time (uses the Reader engine) ---------- */
function renderStoryList() {
  const list = document.getElementById("story-list");
  list.innerHTML = "";
  document.getElementById("story-player").classList.add("hidden");
  STORIES.forEach(s => {
    const btn = document.createElement("button");
    btn.className = "list-card";
    btn.innerHTML = `${s.title}<span class="card-sub">${s.sub}</span>`;
    btn.addEventListener("click", () => {
      goTo("screen-read");
      Reader.start(s.text, s.title);
    });
    list.appendChild(btn);
  });
}

/* ---------- boot ---------- */
Reader.init();