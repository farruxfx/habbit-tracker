const STORAGE_KEY = "focusflow_v1";

export const Storage = {
  save(state) {
    const payload = { version: 1, data: state };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  },
  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const { data } = JSON.parse(raw);
      return data;
    } catch (e) {
      console.warn("Failed to parse storage", e);
      return null;
    }
  },
  clear() {
    localStorage.removeItem(STORAGE_KEY);
  }
};
