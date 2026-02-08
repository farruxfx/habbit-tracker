import { State } from "./state.js";
import { UI } from "./ui.js";
import { initDragDrop } from "./dragDrop.js";

const modal = document.getElementById("modal-backdrop");
const catModal = document.getElementById("cat-manager");
const form = document.getElementById("item-form");
const catForm = document.getElementById("cat-form");

function openModal(type = "task", item = null) {
  modal.classList.remove("hidden");
  document.getElementById("modal-title").textContent = item ? "Edit Item" : "New Item";
  form.reset();
  toggleHabitFields(type === "habit");
  if (item) {
    form.title.value = item.title;
    form.description.value = item.description || "";
    form.category.value = item.category;
    form.priority.value = item.priority;
    form.type.value = item.type;
    if (item.type === "task") form.dueDate.value = item.dueDate || "";
    if (item.type === "habit") {
      form.frequency.value = item.frequency;
      if (item.frequency === "custom") {
        form.interval.value = item.interval || 2;
        form.querySelector(".custom-days").classList.remove("hidden");
      }
    }
    form.dataset.edit = item.id;
  } else {
    delete form.dataset.edit;
  }
}

function closeModal() { modal.classList.add("hidden"); }
function openCatModal() { catModal.classList.remove("hidden"); renderCatManager(); }
function closeCatModal() { catModal.classList.add("hidden"); }

function toggleHabitFields(show) {
  document.getElementById("habit-fields").classList.toggle("hidden", !show);
  document.getElementById("task-fields").classList.toggle("hidden", show);
}

function bindEvents() {
  document.getElementById("add-task-btn").onclick = () => openModal("task");
  document.getElementById("add-habit-btn").onclick = () => openModal("habit");
  document.getElementById("manage-cats-btn").onclick = openCatModal;
  document.getElementById("modal-close").onclick = closeModal;
  document.getElementById("modal-cancel").onclick = closeModal;
  catModal.querySelector(".close-cat").onclick = closeCatModal;

  form.type.onchange = e => toggleHabitFields(e.target.value === "habit");
  form.frequency.onchange = e => {
    form.querySelector(".custom-days").classList.toggle("hidden", e.target.value !== "custom");
  };

  form.onsubmit = e => {
    e.preventDefault();
    const payload = {
      title: form.title.value.trim(),
      description: form.description.value.trim(),
      category: form.category.value,
      priority: form.priority.value,
      type: form.type.value
    };
    if (payload.type === "task") payload.dueDate = form.dueDate.value || null;
    if (payload.type === "habit") {
      payload.frequency = form.frequency.value;
      if (payload.frequency === "custom") payload.interval = Number(form.interval.value || 2);
    }
    if (form.dataset.edit) {
      State.updateItem(form.dataset.edit, payload);
      UI.toast("Item updated");
    } else {
      State.addItem(payload);
      UI.toast("Item added");
    }
    UI.refreshAll();
    closeModal();
  };

  document.getElementById("theme-toggle").onchange = e => {
    const theme = e.target.checked ? "dark" : "light";
    State.setTheme(theme);
    UI.setThemeUI(theme);
  };

  document.body.addEventListener("click", e => {
    const addInline = e.target.closest(".add-inline");
    if (addInline) {
      openModal("task");
      form.category.value = addInline.dataset.cat;
    }
    const del = e.target.dataset.del;
    if (del) {
      State.deleteItem(del);
      UI.toast("Deleted");
      UI.refreshAll();
    }
    const edit = e.target.dataset.edit;
    if (edit) {
      const item = State.listItems().find(i => i.id === edit);
      if (item) openModal(item.type, item);
    }
    const check = e.target.dataset.check;
    if (check) {
      State.toggleComplete(check);
      UI.renderCards();
      UI.renderProgress();
      UI.renderStats();
    }
  });

  document.body.addEventListener("keydown", e => {
    if (e.key === "Escape") { closeModal(); closeCatModal(); }
    if (e.key === " " || e.key === "Enter") {
      if (e.target.dataset?.check) {
        e.preventDefault();
        State.toggleComplete(e.target.dataset.check);
        UI.renderCards(); UI.renderProgress(); UI.renderStats();
      }
    }
  });

  catForm.onsubmit = e => {
    e.preventDefault();
    State.addCategory({ name: catForm.name.value.trim(), color: catForm.color.value });
    catForm.reset(); renderCatManager(); UI.refreshAll();
  };
}

function renderCatManager() {
  const container = document.getElementById("cat-list");
  container.innerHTML = "";
  State.getCategories().forEach(cat => {
    const row = document.createElement("div");
    row.className = "cat-row";
    row.innerHTML = `
      <div class="meta"><span class="dot" style="background:${cat.color}"></span>${cat.name}</div>
      <div class="actions">
        <input type="color" value="${cat.color}" data-edit-color="${cat.id}">
        <button class="ghost tiny" data-rename="${cat.id}">Rename</button>
        <button class="ghost tiny" data-del-cat="${cat.id}">Delete</button>
      </div>
    `;
    container.appendChild(row);
  });

  container.onclick = e => {
    const del = e.target.dataset.delCat;
    const ren = e.target.dataset.rename;
    const colorInput = e.target.dataset.editColor ? e.target : null;

    if (del) { State.deleteCategory(del); renderCatManager(); UI.refreshAll(); }
    if (ren) {
      const newName = prompt("New name:");
      if (newName) { State.updateCategory(ren, { name: newName }); renderCatManager(); UI.refreshAll(); }
    }
    if (colorInput) {
      State.updateCategory(colorInput.dataset.editColor, { color: colorInput.value });
      UI.refreshAll();
    }
  };
}

function populateCategorySelect() {
  const select = form.category;
  select.innerHTML = State.getCategories().map(c => `<option value="${c.id}">${c.name}</option>`).join("");
}

function init() {
  populateCategorySelect();
  UI.refreshAll();
  UI.bindCalendarClicks();
  initDragDrop();
}

bindEvents();
init();
