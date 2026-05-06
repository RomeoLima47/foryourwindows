"use client";

import { createContext, useContext, useState, useCallback, useRef, type ReactNode } from "react";

interface Toast {
  id: number;
  message: string;
  type: "success" | "error" | "info";
  action?: { label: string; onClick: () => void };
}

interface ToastContextType {
  toast: (message: string, type?: "success" | "error" | "info") => void;
  toastUndo: (message: string, onUndo: () => Promise<void> | void, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType>({ toast: () => {}, toastUndo: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

let nextId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timersRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: number) => {
    const timer = timersRef.current.get(id);
    if (timer) { clearTimeout(timer); timersRef.current.delete(id); }
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((t: Omit<Toast, "id">, duration: number) => {
    const id = nextId++;
    setToasts((prev) => [...prev, { ...t, id }]);
    const timer = setTimeout(() => {
      setToasts((prev) => prev.filter((x) => x.id !== id));
      timersRef.current.delete(id);
    }, duration);
    timersRef.current.set(id, timer);
    return id;
  }, []);

  const toast = useCallback((message: string, type: "success" | "error" | "info" = "success") => {
    addToast({ message, type }, 3000);
  }, [addToast]);

  const toastUndo = useCallback((message: string, onUndo: () => Promise<void> | void, duration = 5000) => {
    const id = addToast({
      message,
      type: "success",
      action: {
        label: "Undo",
        onClick: async () => {
          dismiss(id);
          try {
            await onUndo();
            addToast({ message: "Undone ✓", type: "info" }, 2000);
          } catch {
            addToast({ message: "Undo failed", type: "error" }, 3000);
          }
        },
      },
    }, duration);
  }, [addToast, dismiss]);

  const icons = { success: "✅", error: "❌", info: "ℹ️" };
  const colors = {
    success: "border-green-200 bg-green-50 text-green-900 dark:border-green-800 dark:bg-green-950 dark:text-green-100",
    error: "border-red-200 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-950 dark:text-red-100",
    info: "border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-100",
  };

  return (
    <ToastContext.Provider value={{ toast, toastUndo }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[200] flex flex-col gap-2">
        <style>{`@keyframes slideUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }`}</style>
        {toasts.map((t) => (
          <div
            key={t.id}
            style={{ animation: "slideUp 0.2s ease-out" }}
            className={`flex items-center gap-2 rounded-lg border px-4 py-3 text-sm shadow-lg ${colors[t.type]}`}
          >
            <span>{icons[t.type]}</span>
            <span className="flex-1">{t.message}</span>
            {t.action && (
              <button
                onClick={(e) => { e.stopPropagation(); t.action!.onClick(); }}
                className="ml-2 rounded-md bg-white/80 px-2.5 py-1 text-xs font-semibold text-gray-900 shadow-sm ring-1 ring-gray-300 transition-all hover:bg-white hover:shadow-md dark:bg-gray-800 dark:text-gray-100 dark:ring-gray-600 dark:hover:bg-gray-700"
              >
                {t.action.label}
              </button>
            )}
            <button
              onClick={() => dismiss(t.id)}
              className="ml-1 text-xs opacity-50 hover:opacity-100"
              title="Dismiss"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
