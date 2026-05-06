"use client";

import React, { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/toast";
import type { Id } from "../../convex/_generated/dataModel";

interface SubtaskListProps {
  taskId: Id<"tasks">;
  taskTitle: string;
  compact?: boolean;
}

export function SubtaskList({ taskId, taskTitle, compact = false }: SubtaskListProps) {
  const { toast } = useToast();
  const subtasks = useQuery(api.subtasks.listByTask, { taskId });
  const createSubtask = useMutation(api.subtasks.create);
  const toggleSubtask = useMutation(api.subtasks.toggle);
  const removeSubtask = useMutation(api.subtasks.remove);

  const [newTitle, setNewTitle] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  const total = subtasks?.length ?? 0;
  const completed = subtasks?.filter((s) => s.status === "done").length ?? 0;
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

  const handleAdd = async () => {
    if (!newTitle.trim()) return;
    await createSubtask({ taskId, title: newTitle.trim() });
    setNewTitle("");
  };

  const handleToggle = async (id: Id<"subtasks">) => {
    const result = await toggleSubtask({ id });
    if (result.allCompleted && total > 0) {
      toast(`All checklist items complete! 🎉`);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleAdd();
    if (e.key === "Escape") { setIsAdding(false); setNewTitle(""); }
  };

  if (subtasks === undefined) {
    return <div className="h-6 animate-pulse rounded bg-muted" />;
  }

  // Compact mode: just show progress bar inline
  if (compact && total > 0) {
    return (
      <div className="flex items-center gap-2">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-green-500 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="text-[10px] text-muted-foreground">{completed}/{total}</span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Progress header */}
      {total > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">
            Checklist
          </span>
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-green-500 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-xs text-muted-foreground">{completed}/{total}</span>
        </div>
      )}

      {/* Subtask items */}
      {subtasks.map((subtask) => {
        const isDone = subtask.status === "done";
        return (
          <div key={subtask._id} className="group flex items-center gap-2">
            <button
              onClick={() => handleToggle(subtask._id)}
              className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border transition-colors ${
                isDone
                  ? "border-green-500 bg-green-500 text-white"
                  : "border-muted-foreground/40 hover:border-primary"
              }`}
            >
              {isDone && (
                <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none">
                  <path d="M2.5 6L5 8.5L9.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </button>
            <span className={`flex-1 text-sm ${isDone ? "text-muted-foreground line-through" : ""}`}>
              {subtask.title}
            </span>
            <button
              onClick={() => removeSubtask({ id: subtask._id })}
              className="hidden h-5 w-5 flex-shrink-0 items-center justify-center rounded text-xs text-muted-foreground hover:bg-muted hover:text-foreground group-hover:flex"
            >
              ×
            </button>
          </div>
        );
      })}

      {/* Add new subtask */}
      {isAdding ? (
        <div className="flex items-center gap-2">
          <Input
            value={newTitle}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Add checklist item..."
            className="h-8 text-sm"
            autoFocus
          />
          <Button size="sm" className="h-8" onClick={handleAdd}>Add</Button>
          <Button size="sm" variant="ghost" className="h-8" onClick={() => { setIsAdding(false); setNewTitle(""); }}>
            ✕
          </Button>
        </div>
      ) : (
        <button
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <span className="flex h-4 w-4 items-center justify-center rounded border border-dashed border-muted-foreground/40">
            +
          </span>
          Add checklist item
        </button>
      )}
    </div>
  );
}

// Small inline badge showing subtask progress (for task cards)
export function SubtaskBadge({ taskId }: { taskId: Id<"tasks"> }) {
  const counts = useQuery(api.subtasks.countByTask, { taskId });

  if (!counts || counts.total === 0) return null;

  const allDone = counts.completed === counts.total;

  return (
    <span className={`inline-flex items-center gap-1 text-[10px] ${allDone ? "text-green-500" : "text-muted-foreground"}`}>
      {allDone ? "✅" : "☑️"} {counts.completed}/{counts.total}
    </span>
  );
}
