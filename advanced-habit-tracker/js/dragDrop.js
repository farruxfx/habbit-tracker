import { State } from "./state.js";
import { UI } from "./ui.js";

export function initDragDrop() {
  const columns = document.querySelector("#columns");

  columns.addEventListener("dragstart", e => {
    const card = e.target.closest(".card");
    if (!card) return;
    e.dataTransfer.setData("text/plain", card.dataset.id);
    card.classList.add("dragging");
  });

  columns.addEventListener("dragend", e => {
    const card = e.target.closest(".card");
    if (card) card.classList.remove("dragging");
  });

  columns.addEventListener("dragover", e => {
    e.preventDefault();
    const drop = e.target.closest("[data-drop]");
    if (!drop) return;
    drop.classList.add("drag-over");
  });

  columns.addEventListener("dragleave", e => {
    const drop = e.target.closest("[data-drop]");
    if (drop) drop.classList.remove("drag-over");
  });

  columns.addEventListener("drop", e => {
    e.preventDefault();
    const drop = e.target.closest("[data-drop]");
    if (!drop) return;
    const id = e.dataTransfer.getData("text/plain");
    const item = State.listItems().find(i => i.id === id);
    if (!item) return;
    State.updateItem(id, { category: drop.dataset.drop });
    UI.renderCards();
  });
}
