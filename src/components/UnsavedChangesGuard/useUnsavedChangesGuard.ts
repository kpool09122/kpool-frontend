"use client";

import { useEffect, useRef } from "react";

type NavigateEvent = Event & {
  destination: { url: string; sameDocument: boolean };
  hashChange: boolean;
  navigationType: string;
  signal?: AbortSignal;
};
type NavigationWindow = Window & { navigation?: EventTarget };
type LeaveApproval = { destination: string; phase: "pending" | "unloading" };

const beforePageLeaveEvent = "kpool:before-page-leave";
const cancelPageLeaveEvent = "kpool:cancel-page-leave";

// Call before actions such as logout that can discard an editor before navigating.
export const confirmPageLeave = (destination?: string) => window.dispatchEvent(
  new CustomEvent(beforePageLeaveEvent, { cancelable: true, detail: { destination } }),
);
export const cancelPageLeave = () => { window.dispatchEvent(new Event(cancelPageLeaveEvent)); };

const changesPage = (destination: URL) =>
  destination.origin !== window.location.origin
  || destination.pathname !== window.location.pathname
  || destination.search !== window.location.search;

export function useUnsavedChangesGuard(hasUnsavedChanges: boolean, message: string) {
  const approval = useRef<LeaveApproval | null>(null);
  useEffect(() => {
    if (!hasUnsavedChanges) {
      approval.current = null;
      return;
    }

    const navigation = (window as NavigationWindow).navigation;
    const clearApproval = () => { approval.current = null; };
    const beforeUnload = (event: BeforeUnloadEvent) => {
      // Without the Navigation API, beforeunload is the departure notification.
      if (approval.current && (!navigation || approval.current.phase === "unloading")) {
        clearApproval();
        return;
      }
      clearApproval();
      event.preventDefault();
      event.returnValue = "";
    };
    const click = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (!(anchor instanceof HTMLAnchorElement) || anchor.hasAttribute("download")
        || (anchor.target && anchor.target !== "_self")) return;
      const destination = new URL(anchor.href);
      if (!["http:", "https:"].includes(destination.protocol) || !changesPage(destination)) return;
      clearApproval();
      if (!window.confirm(message)) {
        event.preventDefault();
        event.stopImmediatePropagation();
        return;
      }
      approval.current = { destination: destination.href, phase: "pending" };
    };
    const navigate = (event: Event) => {
      const navigationEvent = event as NavigateEvent;
      const destination = new URL(navigationEvent.destination.url);
      const approved = approval.current?.destination === destination.href;
      clearApproval();
      if (navigationEvent.hashChange || navigationEvent.navigationType === "reload") return;
      if (!changesPage(destination)) return;
      if (event.defaultPrevented) return;
      if (!event.cancelable && !approved) return;
      if (!approved && !window.confirm(message)) {
        event.preventDefault();
        return;
      }
      // A same-document navigation consumes approval here. Only a document
      // departure needs to carry it forward to beforeunload.
      if (!navigationEvent.destination.sameDocument) {
        const departure: LeaveApproval = { destination: destination.href, phase: "unloading" };
        approval.current = departure;
        navigationEvent.signal?.addEventListener("abort", () => {
          if (approval.current === departure) clearApproval();
        }, { once: true });
      }
    };
    const beforePageLeave = (event: Event) => {
      clearApproval();
      if (!window.confirm(message)) {
        event.preventDefault();
        return;
      }
      const { destination } = (event as CustomEvent<{ destination?: string }>).detail;
      if (destination) approval.current = {
        destination: new URL(destination, window.location.href).href,
        phase: "pending",
      };
    };
    const navigationFinished = () => {
      if (approval.current?.phase === "unloading") clearApproval();
    };
    document.addEventListener("click", click, true);
    window.addEventListener("beforeunload", beforeUnload);
    window.addEventListener(beforePageLeaveEvent, beforePageLeave);
    window.addEventListener(cancelPageLeaveEvent, clearApproval);
    navigation?.addEventListener("navigate", navigate);
    navigation?.addEventListener("navigatesuccess", navigationFinished);
    navigation?.addEventListener("navigateerror", navigationFinished);
    return () => {
      document.removeEventListener("click", click, true);
      window.removeEventListener("beforeunload", beforeUnload);
      window.removeEventListener(beforePageLeaveEvent, beforePageLeave);
      window.removeEventListener(cancelPageLeaveEvent, clearApproval);
      navigation?.removeEventListener("navigate", navigate);
      navigation?.removeEventListener("navigatesuccess", navigationFinished);
      navigation?.removeEventListener("navigateerror", navigationFinished);
    };
  }, [hasUnsavedChanges, message]);
}
