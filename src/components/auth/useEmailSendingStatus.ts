"use client";

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";

import {
  clearSessionStorageValue,
  readEmailSendingStatusStorage,
  writeEmailSendingStatusStorage,
  type StoredEmailSendingStatus,
} from "@/gateways/auth/emailSendingStateStorage";
import type { EmailSendingStatus } from "@/gateways/identity/identityApi";

const subscribeToHydration = () => () => undefined;

export const useHydrated = (): boolean => useSyncExternalStore(
  subscribeToHydration,
  () => true,
  () => false,
);

export const useEmailSendingStatus = (storageKey: string, context: string | null) => {
  const [currentStatus, setCurrentStatus] = useState<StoredEmailSendingStatus | null>(null);
  const [invalidatedStatusIdentity, setInvalidatedStatusIdentity] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now);
  const statusIdentity = context ? `${storageKey}:${context}` : null;
  const storedStatus = useMemo(
    () => context ? readEmailSendingStatusStorage(storageKey, context) : null,
    [context, storageKey],
  );
  const status = currentStatus?.context === context
    ? currentStatus
    : invalidatedStatusIdentity === statusIdentity ? null : storedStatus;

  useEffect(() => {
    if (!status || status.retryAt === null || status.retryAt <= now) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [now, status]);

  const update = useCallback((result: EmailSendingStatus) => {
    if (!context) return;
    const nextStatus: StoredEmailSendingStatus = {
      context,
      remainingSends: result.remainingSends,
      retryAt: result.retryAfterSeconds === null
        ? null
        : Date.now() + Math.max(0, result.retryAfterSeconds) * 1000,
    };
    setInvalidatedStatusIdentity(null);
    setCurrentStatus(nextStatus);
    setNow(Date.now());
    writeEmailSendingStatusStorage(storageKey, nextStatus);
  }, [context, storageKey]);

  const clear = useCallback(() => {
    setCurrentStatus(null);
    setInvalidatedStatusIdentity(statusIdentity);
    clearSessionStorageValue(storageKey);
  }, [statusIdentity, storageKey]);

  const secondsUntilRetry = useMemo(() => {
    if (!status || status.retryAt === null) return null;
    return Math.max(0, Math.ceil((status.retryAt - now) / 1000));
  }, [now, status]);

  return {
    clear,
    remainingSends: status?.remainingSends ?? null,
    retryUnavailable: status?.retryAt === null,
    secondsUntilRetry,
    status,
    update,
  };
};
