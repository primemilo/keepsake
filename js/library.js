/* Keepsake — Family Library storage */
const Library = (() => {
  const STORE_KEY = "keepsake-library";

  function getItems() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY)) || []; }
    catch { return []; }
  }

  function saveItems(items) {
    localStorage.setItem(STORE_KEY, JSON.stringify(items));
  }

  function addItem(item) {
    const items = getItems();
    item.id = Date.now().toString(36) + Math.random().toString(36).substring(2, 5);
    items.push(item);
    saveItems(items);
  }

  function removeItem(id) {
    const items = getItems().filter(i => i.id !== id);
    saveItems(items);
  }

  function getItemById(id) {
    return getItems().find(i => i.id === id);
  }

  function renderList() {
    const listEl = document.getElementById("library-list");
    if (!listEl) return;
    const items = getItems();
    listEl.innerHTML = "";
    if (items.length === 0) {
      listEl.innerHTML = '<p class="gentle-note">Nothing saved yet. Add a message or story to get started.</p>';
      return;
    }
    items.forEach(item => {
      const voice = Voices.getVoices().find(v => v.id === item.voiceId) || { name: "Keepsake" };

      const wrapper = document.createElement("div");
      wrapper.style.display = "flex";
      wrapper.style.alignItems = "center";
      wrapper.style.gap = "0.5rem";

      const card = document.createElement("button");
      card.className = "list-card";
      card.style.flex = "1";
      card.innerHTML = `${item.title}<span class="card-sub">In ${voice.name}'s voice</span>`;
      card.addEventListener("click", () => {
        goTo("screen-read");
        Reader.start(item.text, item.title);
      });

      const delBtn = document.createElement("button");
      delBtn.className = "library-delete";
      delBtn.innerHTML = "&#10005;"; // X symbol
      delBtn.setAttribute("aria-label", "Delete " + item.title);
      delBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        if (confirm("Are you sure you want to delete this item? This cannot be undone.")) {
          removeItem(item.id);
          renderList();
        }
      });

      wrapper.appendChild(card);
      wrapper.appendChild(delBtn);
      listEl.appendChild(wrapper);
    });
  }

  function init() {
    document.getElementById("btn-add-library-item").addEventListener("click", () => {
      const form = document.getElementById("library-add-form");
      form.classList.toggle("hidden");
      const select = document.getElementById("library-voice");
      select.innerHTML = '<option value="">Keepsake</option>';
      Voices.getVoices().forEach(v => {
        const opt = document.createElement("option");
        opt.value = v.id;
        opt.textContent = v.name;
        select.appendChild(opt);
      });
    });

    document.getElementById("btn-cancel-library").addEventListener("click", () => {
      document.getElementById("library-add-form").classList.add("hidden");
    });

    document.getElementById("btn-save-library").addEventListener("click", () => {
      const title = document.getElementById("library-title").value.trim();
      const text = document.getElementById("library-text").value.trim();
      const voiceId = document.getElementById("library-voice").value;
      if (!title || !text) { alert("Please fill in both title and text."); return; }
      addItem({ title, text, voiceId });
      document.getElementById("library-add-form").classList.add("hidden");
      document.getElementById("library-title").value = "";
      document.getElementById("library-text").value = "";
      renderList();
    });

    renderList();
  }

  return { init, getItems, addItem, removeItem, getItemById, renderList };
})();