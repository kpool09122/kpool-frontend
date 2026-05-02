"use client";

import { useSyncExternalStore } from "react";

const authStorageKey = "kpool.authenticated";
const authSessionEventName = "kpool-auth-session-change";

const readAuthSnapshot = (): boolean => {
  if (typeof window === "undefined") {
    return false;
  }

  return window.localStorage.getItem(authStorageKey) === "true";
};

const subscribeToAuthSession = (callback: () => void): (() => void) => {
  if (typeof window === "undefined") {
    return () => {};
  }

  window.addEventListener("storage", callback);
  window.addEventListener(authSessionEventName, callback);

  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(authSessionEventName, callback);
  };
};

export const useAuthSession = (): boolean =>
  useSyncExternalStore(subscribeToAuthSession, readAuthSnapshot, () => false);

export const markAuthenticated = (): void => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(authStorageKey, "true");
  window.dispatchEvent(new Event(authSessionEventName));
};

export const clearAuthenticated = (): void => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(authStorageKey);
  window.dispatchEvent(new Event(authSessionEventName));
};
