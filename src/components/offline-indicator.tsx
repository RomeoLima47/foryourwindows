"use client";

import { useState, useEffect, useCallback, useRef } from "react";

type SyncStatus = "online" | "offline" | "syncing";

export function OfflineIndicator() {
  const [status, setStatus] = useState<SyncStatus>("online");
  const [showBanner, setShowBanner] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [justReconnected, setJustReconnected] = useState(false);
  const wasOfflineRef = useRef(false);
  const bannerTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ─── Service Worker Registration ──────────────────────────
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker.register("/sw.js").then((registration) => {
      // Handle updates
      registration.addEventListener("updatefound", () => {
        const newWorker = registration.installing;
        if (!newWorker) return;

        newWorker.addEventListener("statechange", () => {
          if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
            // New version available — activate it
            newWorker.postMessage({ type: "SKIP_WAITING" });
          }
        });
      });
    }).catch((err) => {
      console.warn("SW registration failed:", err);
    });

    // Listen for messages from service worker
    navigator.serviceWorker.addEventListener("message", (event) => {
      if (event.data?.type === "SYNC_START") {
        setStatus("syncing");
        setShowBanner(true);
      }
      if (event.data?.type === "SYNC_COMPLETE") {
        setStatus("online");
        setPendingCount(0);
        setJustReconnected(true);
        // Auto-hide after 3 seconds
        if (bannerTimeoutRef.current) clearTimeout(bannerTimeoutRef.current);
        bannerTimeoutRef.current = setTimeout(() => {
          setShowBanner(false);
          setJustReconnected(false);
        }, 3000);
      }
    });
  }, []);

  // ─── Online/Offline Detection ─────────────────────────────
  const handleOnline = useCallback(() => {
    if (wasOfflineRef.current) {
      setStatus("syncing");
      setJustReconnected(true);

      // Convex handles reconnection automatically
      // Show syncing state briefly, then switch to online
      setTimeout(() => {
        setStatus("online");
        setPendingCount(0);

        // Auto-hide banner after 3s
        if (bannerTimeoutRef.current) clearTimeout(bannerTimeoutRef.current);
        bannerTimeoutRef.current = setTimeout(() => {
          setShowBanner(false);
          setJustReconnected(false);
        }, 3000);
      }, 1500);

      // Request background sync if available
      if ("serviceWorker" in navigator && "SyncManager" in window) {
        navigator.serviceWorker.ready.then((registration) => {
          (registration as any).sync?.register("fh-sync-mutations").catch(() => {});
        });
      }
    }
    wasOfflineRef.current = false;
  }, []);

  const handleOffline = useCallback(() => {
    wasOfflineRef.current = true;
    setStatus("offline");
    setShowBanner(true);
    setJustReconnected(false);
    if (bannerTimeoutRef.current) clearTimeout(bannerTimeoutRef.current);
  }, []);

  useEffect(() => {
    // Set initial status
    if (!navigator.onLine) {
      handleOffline();
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      if (bannerTimeoutRef.current) clearTimeout(bannerTimeoutRef.current);
    };
  }, [handleOnline, handleOffline]);

  // ─── Track pending mutations via Convex connection state ──
  useEffect(() => {
    if (status !== "offline") return;

    // Increment pending count when user interacts while offline
    const handleClick = () => {
      setPendingCount((prev) => prev + 1);
    };

    // Listen to form submissions and button clicks as proxy for mutations
    document.addEventListener("click", handleClick, { passive: true });
    return () => document.removeEventListener("click", handleClick);
  }, [status]);

  // ─── RENDER ───────────────────────────────────────────────

  if (!showBanner) return null;

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-[100] flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium transition-all duration-300 ${
        status === "offline"
          ? "bg-amber-500 text-white"
          : status === "syncing"
          ? "bg-blue-500 text-white"
          : justReconnected
          ? "bg-green-500 text-white"
          : "bg-green-500 text-white"
      }`}
    >
      {status === "offline" && (
        <>
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white/60" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-white" />
          </span>
          <span>You&apos;re offline — changes will sync when you reconnect</span>
          {pendingCount > 0 && (
            <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs">
              {pendingCount} pending
            </span>
          )}
        </>
      )}

      {status === "syncing" && (
        <>
          <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span>Syncing your changes...</span>
        </>
      )}

      {status === "online" && justReconnected && (
        <>
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span>Back online — all changes synced!</span>
        </>
      )}

      {/* Dismiss button */}
      {(status === "online" || justReconnected) && (
        <button
          onClick={() => { setShowBanner(false); setJustReconnected(false); }}
          className="ml-2 rounded-full p-0.5 hover:bg-white/20"
          title="Dismiss"
        >
          ✕
        </button>
      )}
    </div>
  );
}

// ─── Small dot indicator for sidebar/header ─────────────────
export function ConnectionDot() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return (
    <span
      className={`inline-block h-2 w-2 rounded-full ${
        isOnline ? "bg-green-500" : "bg-amber-500 animate-pulse"
      }`}
      title={isOnline ? "Online" : "Offline — changes will sync when reconnected"}
    />
  );
}
