"use client";

import React, { useState, useRef, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/toast";
import type { Id } from "../../convex/_generated/dataModel";

export function QuickAdd() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [projectId, setProjectId] = useState<string>("");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const projects = useQuery(api.projects.list);
  const createTask = useMutation(api.tasks.create);

  // Auto-select most recent active project
  const activeProjects = projects?.filter((p) => p.status === "active") ?? [];

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  // Set default project to most recent if not set
  useEffect(() => {
    if (!projectId && activeProjects.length > 0) {
      setProjectId(activeProjects[0]._id);
    }
  }, [activeProjects, projectId]);

  // Keyboard shortcut: Ctrl+Shift+N
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === "N") {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === "Escape" && open) {
        setOpen(false);
      }
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open]);

  const handleSubmit = async () => {
    if (!title.trim()) return;
    setSaving(true);

    try {
      await createTask({
        title: title.trim(),
        status: "todo",
        priority,
        projectId: projectId ? (projectId as Id<"projects">) : undefined,
      });

      const projectName = activeProjects.find((p) => p._id === projectId)?.name;
      toast(`Task "${title}" added${projectName ? ` to ${projectName}` : ""}`);
      setTitle("");
      setOpen(false);
    } catch (err: any) {
      toast(err.message || "Failed to create task");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {/* FAB */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-all hover:scale-105 hover:shadow-xl active:scale-95 lg:bottom-8 lg:right-8"
        title="Quick add task (Ctrl+Shift+N)"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>

      {/* Quick Add Panel */}
      {open && (
        <>
          <div className="fixed inset-0 z-[90] bg-black/30 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="fixed bottom-24 right-6 z-[91] w-[90vw] max-w-sm overflow-hidden rounded-xl border bg-card shadow-2xl lg:right-8">
            <div className="border-b px-4 py-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">⚡ Quick Add Task</p>
                <div className="flex items-center gap-1">
                  <kbd className="hidden rounded border bg-muted px-1.5 py-0.5 text-[9px] text-muted-foreground sm:inline">Ctrl+Shift+N</kbd>
                  <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground p-1">✕</button>
                </div>
              </div>
            </div>

            <div className="p-4 space-y-3">
              {/* Title input */}
              <Input
                ref={inputRef}
                placeholder="What needs to be done?"
                value={title}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
                onKeyDown={(e: React.KeyboardEvent) => { if (e.key === "Enter" && !e.shiftKey) handleSubmit(); }}
                autoFocus
              />

              {/* Quick options row */}
              <div className="flex items-center gap-2">
                {/* Project */}
                <select
                  className="flex h-8 flex-1 rounded-md border bg-background px-2 text-xs"
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  title="Project"
                >
                  <option value="">No project</option>
                  {activeProjects.map((p) => (
                    <option key={p._id} value={p._id}>{p.name}</option>
                  ))}
                </select>

                {/* Priority chips */}
                <div className="flex rounded-md border">
                  {(["low", "medium", "high"] as const).map((p) => (
                    <button
                      key={p}
                      onClick={() => setPriority(p)}
                      className={`px-2 py-1 text-[10px] font-medium transition-colors ${
                        priority === p
                          ? p === "high" ? "bg-red-500 text-white"
                            : p === "medium" ? "bg-yellow-500 text-white"
                            : "bg-blue-500 text-white"
                          : "hover:bg-muted"
                      }`}
                      title={`${p} priority`}
                    >
                      {p === "high" ? "🔴" : p === "medium" ? "🟡" : "🔵"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Submit */}
              <Button
                onClick={handleSubmit}
                className="w-full"
                disabled={!title.trim() || saving}
              >
                {saving ? "Creating..." : "Create Task ↵"}
              </Button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
