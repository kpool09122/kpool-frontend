"use client";

import { useEffect, useRef } from "react";

type NavigateEvent = Event & {
  destination: { url: string };
  hashChange: boolean;
  navigationType: string;
};
type NavigationWindow = Window & { navigation?: EventTarget };

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
  const approvedActionDestination = useRef<string | null>(null);
  useEffect(() => {
    if (!hasUnsavedChanges) {
      approvedActionDestination.current = null;
      return;
    }

    let approvedDestination: string | null = null;
    let approvedUnload = false;
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (approvedUnload || approvedActionDestination.current !== null) return;
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
      if (!window.confirm(message)) {
        event.preventDefault();
        event.stopImmediatePropagation();
        return;
      }
      approvedDestination = destination.href;
      approvedUnload = true;
      setTimeout(() => { approvedUnload = false; approvedDestination = null; }, 0);
    };
    const navigate = (event: Event) => {
      const navigationEvent = event as NavigateEvent;
      const destination = new URL(navigationEvent.destination.url);
      if (approvedActionDestination.current === destination.href) {
        approvedUnload = true;
        return;
      }
      if (!event.cancelable || navigationEvent.hashChange || navigationEvent.navigationType === "reload") return;
      if (!changesPage(destination)) return;
      if (approvedDestination === destination.href) {
        approvedDestination = null;
        return;
      }
      if (!window.confirm(message)) event.preventDefault();
      else {
        approvedUnload = true;
        setTimeout(() => { approvedUnload = false; }, 0);
      }
    };
    const beforePageLeave = (event: Event) => {
      if (!window.confirm(message)) {
        event.preventDefault();
        return;
      }
      const { destination } = (event as CustomEvent<{ destination?: string }>).detail;
      if (destination) approvedActionDestination.current = new URL(destination, window.location.href).href;
    };
    const cancelApprovedLeave = () => {
      approvedActionDestination.current = null;
      approvedUnload = false;
    };
    const navigation = (window as NavigationWindow).navigation;
    document.addEventListener("click", click, true);
    window.addEventListener("beforeunload", beforeUnload);
    window.addEventListener(beforePageLeaveEvent, beforePageLeave);
    window.addEventListener(cancelPageLeaveEvent, cancelApprovedLeave);
    navigation?.addEventListener("navigate", navigate);
    return () => {
      document.removeEventListener("click", click, true);
      window.removeEventListener("beforeunload", beforeUnload);
      window.removeEventListener(beforePageLeaveEvent, beforePageLeave);
      window.removeEventListener(cancelPageLeaveEvent, cancelApprovedLeave);
      navigation?.removeEventListener("navigate", navigate);
    };
  }, [hasUnsavedChanges, message]);
}
