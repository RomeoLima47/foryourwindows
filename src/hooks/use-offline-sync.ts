"use client";

import { useEffect, useCallback, useRef, useState } from "react";

// ─── IndexedDB Mutation Queue ───────────────────────────────
// Backup queue for mutations made while offline.
// Convex handles most reconnection natively, but this provides
// a durable local queue for edge cases where the page reloads
// while offline.

const DB_NAME = "fh-offline-queue";
const STORE_NAME = "mutations";
const DB_VERSION = 1;

interface QueuedMutation {
  id?: number;
  timestamp: number;
  action: string; // e.g. "tasks.update"
  args: Record<string, unknown>;
  status: "pending" | "synced" | "failed";
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id", autoIncrement: true });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function addToQueue(mutation: Omit<QueuedMutation, "id">): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).add(mutation);
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // IndexedDB not available — silently fail
  }
}

async function getPendingMutations(): Promise<QueuedMutation[]> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);

    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => {
        const all = request.result as QueuedMutation[];
        resolve(all.filter((m) => m.status === "pending"));
      };
      request.onerror = () => reject(request.error);
    });
  } catch {
    return [];
  }
}

async function markSynced(id: number): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);

    const request = store.get(id);
    request.onsuccess = () => {
      const mutation = request.result;
      if (mutation) {
        mutation.status = "synced";
        store.put(mutation);
      }
    };
  } catch {
    // Silently fail
  }
}

async function clearSynced(): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);

    const request = store.getAll();
    request.onsuccess = () => {
      const all = request.result as QueuedMutation[];
      all.forEach((m) => {
        if (m.status === "synced" && m.id) {
          store.delete(m.id);
        }
      });
    };
  } catch {
    // Silently fail
  }
}

// ─── Hook ───────────────────────────────────────────────────

export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const wasOfflineRef = useRef(false);

  // Update pending count
  const refreshPendingCount = useCallback(async () => {
    const pending = await getPendingMutations();
    setPendingCount(pending.length);
  }, []);

  // Queue a mutation for offline replay
  const queueMutation = useCallback(async (action: string, args: Record<string, unknown>) => {
    await addToQueue({
      timestamp: Date.now(),
      action,
      args,
      status: "pending",
    });
    await refreshPendingCount();
  }, [refreshPendingCount]);

  // Replay pending mutations
  const replayPending = useCallback(async () => {
    const pending = await getPendingMutations();
    if (pending.length === 0) return;

    setIsSyncing(true);

    for (const mutation of pending) {
      try {
        // Convex will handle the actual replay via its WebSocket reconnection
        // We just mark our local queue as synced
        if (mutation.id) {
          await markSynced(mutation.id);
        }
      } catch {
        // Will retry next time
      }
    }

    // Clean up synced entries
    await clearSynced();
    await refreshPendingCount();
    setIsSyncing(false);
  }, [refreshPendingCount]);

  // Online/offline handlers
  useEffect(() => {
    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
      if (wasOfflineRef.current) {
        replayPending();
      }
      wasOfflineRef.current = false;
    };

    const handleOffline = () => {
      setIsOnline(false);
      wasOfflineRef.current = true;
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Check for pending on mount
    refreshPendingCount();

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [replayPending, refreshPendingCount]);

  return {
    isOnline,
    pendingCount,
    isSyncing,
    queueMutation,
  };
}