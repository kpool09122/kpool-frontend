type BrowserStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

// Browser settings, storage quotas and malformed JSON must not break UI state.
export function createJsonStorage(getStorage: () => BrowserStorage = () => window.localStorage) {
  return {
    read: (key: string): unknown => {
      try { return JSON.parse(getStorage().getItem(key) ?? "null"); } catch { return null; }
    },
    write: (key: string, value: unknown) => {
      try { getStorage().setItem(key, JSON.stringify(value)); } catch { /* Storage is best effort. */ }
    },
    remove: (key: string) => {
      try { getStorage().removeItem(key); } catch { /* Storage can be disabled. */ }
    },
  };
}
export type JsonStorage = ReturnType<typeof createJsonStorage>;
