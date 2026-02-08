import { Storage } from "./storage.js";

const defaultCategories = [
  { id: "work", name: "Work", color: "#2563eb" },
  { id: "personal", name: "Personal", color: "#10b981" },
  { id: "health", name: "Health", color: "#ef4444" },
  { id: "study", name: "Study", color: "#f59e0b" }
];

function uid() {
  return crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36);
}

const blankState = () => ({
  categories: [...defaultCategories],
  items: [], // tasks + habits
  preferences: { theme: "light", filters: { category: "all", priority: "all" } }
});

class StateManager {
  constructor() {
    this.state = Storage.load() || blankState();
  }

  persist() { Storage.save(this.state); }

  getCategories() { return this.state.categories; }
  addCategory(cat) {
    this.state.categories.push({ id: uid(), ...cat });
    this.persist();
  }
  updateCategory(id, updates) {
    const cat = this.state.categories.find(c => c.id === id);
    if (!cat) return;
    Object.assign(cat, updates); this.persist();
  }
  deleteCategory(id) {
    this.state.categories = this.state.categories.filter(c => c.id !== id);
    this.state.items = this.state.items.map(it =>
      it.category === id ? { ...it, category: "personal" } : it
    );
    this.persist();
  }

  listItems() { return this.state.items; }
  addItem(payload) {
    this.state.items.push({
      id: uid(),
      createdAt: Date.now(),
      completed: false,
      streak: 0,
      ...payload
    });
    this.persist();
  }
  updateItem(id, updates) {
    const item = this.state.items.find(i => i.id === id);
    if (!item) return;
    Object.assign(item, updates);
    if (updates.completed !== undefined && item.type === "habit") {
      item.streak = updates.completed ? (item.streak || 0) + 1 : 0;
    }
    this.persist();
  }
  deleteItem(id) {
    this.state.items = this.state.items.filter(i => i.id !== id);
    this.persist();
  }

  toggleComplete(id) {
    const item = this.state.items.find(i => i.id === id);
    if (!item) return;
    const next = !item.completed;
    this.updateItem(id, { completed: next });
  }

  setTheme(theme) {
    this.state.preferences.theme = theme;
    this.persist();
  }
  getTheme() { return this.state.preferences.theme; }

  stats(range = "daily") {
    const now = new Date();
    const start = new Date(now);
    if (range === "weekly") start.setDate(now.getDate() - 7);
    if (range === "monthly") start.setDate(now.getDate() - 30);

    const slice = this.state.items.filter(i => i.createdAt >= start.getTime());
    const completed = slice.filter(i => i.completed).length;
    const total = slice.length || 1;
    const pct = Math.round((completed / total) * 100);
    const habits = slice.filter(i => i.type === "habit");
    const streak = habits.reduce((max, h) => Math.max(max, h.streak || 0), 0);
    return { completed, total, pct, streak };
  }

  calendarMap(monthDate = new Date()) {
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();
    const days = new Date(year, month + 1, 0).getDate();
    const map = {};
    for (let d = 1; d <= days; d++) map[d] = [];
    this.state.items.forEach(item => {
      if (item.type === "task" && item.dueDate) {
        const d = new Date(item.dueDate);
        if (d.getMonth() === month && d.getFullYear() === year) map[d.getDate()]?.push(item);
      }
      if (item.type === "habit") {
        // show habit marker every day of month
        for (let d = 1; d <= days; d++) map[d]?.push({ ...item, _habit: true });
      }
    });
    return map;
  }
}

export const State = new StateManager();
