import { initializeApp } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-app.js";
import {
  getDatabase,
  ref,
  push,
  set,
  update,
  remove,
  onValue,
  query,
  orderByChild,
  get,
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyBtI5AKSwqZKfywObHjOW-4ZR1qJ-CW7VQ",
  authDomain: "filmsite-80895.firebaseapp.com",
  databaseURL: "https://filmsite-80895-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "filmsite-80895",
  storageBucket: "filmsite-80895.firebasestorage.app",
  messagingSenderId: "1047505050288",
  appId: "1:1047505050288:web:70a3d200dd9c04c04a7975",
  measurementId: "G-X8YQ29BT34"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

const reviewsGrid = document.getElementById("reviewsGrid");
const form = document.getElementById("reviewForm");
const submitBtn = document.getElementById("submitReview");
const cancelBtn = document.getElementById("cancelEdit");

const fields = {
  title: document.getElementById("reviewTitle"),
  category: document.getElementById("reviewCategory"),
  type: document.getElementById("reviewType"),
  rating: document.getElementById("reviewRating"),
  date: document.getElementById("reviewDate"),
  excerpt: document.getElementById("reviewExcerpt"),
};

let editingId = null;

function escapeHtml(str = "") {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function reviewCard(id, data) {
  return `
    <article class="card review-card">
      <div class="poster">
        <div class="poster-inner">
          <div class="poster-meta">
            <span>${escapeHtml(data.category || "Recensione")}</span>
            <span>#${escapeHtml(id.slice(0, 4))}</span>
          </div>
          <div>
            <p>${escapeHtml(data.type || "Recensione film")}</p>
            <h3>${escapeHtml(data.title || "Senza titolo")}</h3>
          </div>
        </div>
      </div>

      <div class="card-body">
        <div class="card-row">
          <span>${escapeHtml(data.date || "")}</span>
          <span>${Number(data.rating || 0).toFixed(1)} ★</span>
        </div>

        <p>${escapeHtml(data.excerpt || "")}</p>

        <div class="review-actions">
          <button class="mini-btn" data-action="edit" data-id="${id}">Modifica</button>
          <button class="mini-btn danger" data-action="delete" data-id="${id}">Elimina</button>
        </div>
      </div>
    </article>
  `;
}

function renderEmptyState() {
  reviewsGrid.innerHTML = `
    <div class="empty-state">
      Nessuna recensione presente. Aggiungine una dal form qui sotto.
    </div>
  `;
}

function resetForm() {
  form.reset();
  editingId = null;
  submitBtn.textContent = "Pubblica recensione";
  cancelBtn.hidden = true;
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const payload = {
    title: fields.title.value.trim(),
    category: fields.category.value.trim(),
    type: fields.type.value.trim(),
    rating: Number(fields.rating.value),
    date: fields.date.value.trim(),
    excerpt: fields.excerpt.value.trim(),
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  if (
    !payload.title ||
    !payload.category ||
    !payload.type ||
    Number.isNaN(payload.rating) ||
    !payload.date ||
    !payload.excerpt
  ) {
    return;
  }

  if (editingId) {
    await update(ref(db, `reviews/${editingId}`), {
      ...payload,
      createdAt: undefined, // evita di sovrascrivere la data di creazione se aggiorni
      updatedAt: Date.now(),
    });
  } else {
    const newRef = push(ref(db, "reviews"));
    await set(newRef, payload);
  }

  resetForm();
});

cancelBtn.addEventListener("click", resetForm);

reviewsGrid.addEventListener("click", async (e) => {
  const btn = e.target.closest("button[data-action]");
  if (!btn) return;

  const id = btn.dataset.id;
  const action = btn.dataset.action;

  if (action === "delete") {
    const ok = confirm("Vuoi eliminare questa recensione?");
    if (!ok) return;
    await remove(ref(db, `reviews/${id}`));
    return;
  }

  if (action === "edit") {
    const snap = await get(ref(db, `reviews/${id}`));
    if (!snap.exists()) return;

    const data = snap.val();
    fields.title.value = data.title || "";
    fields.category.value = data.category || "";
    fields.type.value = data.type || "";
    fields.rating.value = data.rating ?? "";
    fields.date.value = data.date || "";
    fields.excerpt.value = data.excerpt || "";

    editingId = id;
    submitBtn.textContent = "Aggiorna recensione";
    cancelBtn.hidden = false;
  }
});

const reviewsQuery = query(ref(db, "reviews"), orderByChild("createdAt"));

onValue(reviewsQuery, (snapshot) => {
  if (!snapshot.exists()) {
    renderEmptyState();
    return;
  }

  const items = [];
  snapshot.forEach((child) => {
    items.push({
      id: child.key,
      ...child.val(),
    });
  });

  items.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

  reviewsGrid.innerHTML = items
    .map((item) => reviewCard(item.id, item))
    .join("");
});
