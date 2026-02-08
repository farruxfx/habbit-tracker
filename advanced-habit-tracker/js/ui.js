import { State } from "./state.js";

const qs = (sel, root=document) => root.querySelector(sel);
const qsa = (sel, root=document) => [...root.querySelectorAll(sel)];

export const UI = (() => {
  const columnsEl = qs("#columns");
  const progressBarsEl = qs("#progress-bars");
  const statsEl = qs("#stats");
  const calendarEl = qs("#calendar");
  const dayListEl = qs("#calendar-day-list");
  const toastEl = qs("#toast");

  let monthCursor = new Date();

  function renderColumns() {
    columnsEl.innerHTML = "";
    State.getCategories().forEach(cat => {
      const col = document.createElement("div");
      col.className = "column";
      col.dataset.cat = cat.id;
      col.innerHTML = `
        <header>
          <div><span class="dot" style="background:${cat.color}"></span>${cat.name}</div>
          <button class="ghost add-inline" data-cat="${cat.id}">＋</button>
        </header>
        <div class="list" data-drop="${cat.id}"></div>
      `;
      columnsEl.appendChild(col);
    });
    renderCards();
  }

  function renderCards() {
    qsa(".list", columnsEl).forEach(list => list.innerHTML = "");
    State.listItems().forEach(item => {
      const card = document.createElement("article");
      card.className = "card";
      card.draggable = true;
      card.dataset.id = item.id;
      card.innerHTML = `
        <div class="top">
          <label class="checkbox ${item.completed ? "done" : ""}" data-check="${item.id}" tabindex="0">
            ${item.completed ? "✓" : ""}
          </label>
          <span class="badge ${item.priority.toLowerCase()}">${item.priority}</span>
        </div>
        <div class="title">${item.title}</div>
        ${item.description ? `<div class="desc">${item.description}</div>` : ""}
        <div class="meta">
          ${item.type === "task" && item.dueDate ? `<span>📅 ${item.dueDate}</span>` : ""}
          ${item.type === "habit" ? `<span>🔁 ${item.frequency}</span>` : ""}
          <button class="ghost tiny" data-edit="${item.id}">Edit</button>
          <button class="ghost tiny" data-del="${item.id}">Delete</button>
        </div>
      `;
      const parent = qs(`.list[data-drop="${item.category}"]`, columnsEl);
      (parent || qs(`.list[data-drop]`, columnsEl)).appendChild(card);
    });
  }

  function renderProgress() {
    const ranges = ["daily","weekly","monthly"];
    progressBarsEl.innerHTML = ranges.map(r => {
      const { pct } = State.stats(r);
      return `<div class="bar">
        <div class="label">${r.toUpperCase()} ${pct}%</div>
        <div class="track"><div class="fill" style="width:${pct}%"></div></div>
      </div>`;
    }).join("");
  }

  function renderStats() {
    const daily = State.stats("daily");
    const weekly = State.stats("weekly");
    const monthly = State.stats("monthly");
    statsEl.innerHTML = `
      <div class="stat"><div>Completed today</div><strong>${daily.completed}</strong></div>
      <div class="stat"><div>Weekly %</div><strong>${weekly.pct}%</strong></div>
      <div class="stat"><div>Longest habit streak</div><strong>${monthly.streak}</strong></div>
    `;
  }

  function renderCalendar() {
    const map = State.calendarMap(monthCursor);
    const year = monthCursor.getFullYear();
    const month = monthCursor.getMonth();
    const days = new Date(year, month + 1, 0).getDate();
    const today = new Date();
    calendarEl.innerHTML = "";
    for (let d = 1; d <= days; d++) {
      const cell = document.createElement("div");
      cell.className = "cell";
      if (d === today.getDate() && month === today.getMonth() && year === today.getFullYear()) {
        cell.classList.add("today");
      }
      cell.dataset.day = d;
      cell.innerHTML = `<div class="head">${d}</div><div class="dots"></div>`;
      const dots = qs(".dots", cell);
      map[d].forEach(item => {
        const dot = document.createElement("span");
        const cat = State.getCategories().find(c => c.id === item.category);
        dot.className = "dot-sm";
        dot.style.background = item._habit ? "#a855f7" : (cat?.color || "#94a3b8");
        dots.appendChild(dot);
      });
      calendarEl.appendChild(cell);
    }
    updateDayList(today.getDate());
  }

  function updateDayList(day) {
    const map = State.calendarMap(monthCursor);
    dayListEl.innerHTML = `<h4>Items on ${monthCursor.toLocaleString('default',{month:'short'})} ${day}</h4>`;
    const list = map[day] || [];
    if (!list.length) {
      dayListEl.innerHTML += `<div class="empty">No tasks or habits.</div>`;
      return;
    }
    list.forEach(item => {
      const el = document.createElement("div");
      el.className = "meta";
      el.textContent = `${item.type === "habit" ? "Habit" : "Task"} • ${item.title}`;
      dayListEl.appendChild(el);
    });
  }

  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.remove("hidden");
    setTimeout(() => toastEl.classList.add("hidden"), 1800);
  }

  function bindCalendarClicks() {
    calendarEl.addEventListener("click", e => {
      const cell = e.target.closest(".cell");
      if (!cell) return;
      updateDayList(Number(cell.dataset.day));
    });
  }

  function setThemeUI(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    qs("#theme-toggle").checked = theme === "dark";
  }

  function refreshAll() {
    renderColumns();
    renderProgress();
    renderStats();
    renderCalendar();
    setThemeUI(State.getTheme());
  }

  return {
    refreshAll, renderCards, renderColumns, renderProgress, renderStats, renderCalendar,
    toast, bindCalendarClicks, updateDayList, setThemeUI
  };
})();
