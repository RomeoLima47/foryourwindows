"use client";

import React, { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

interface ActivityTimelineProps {
  projectId?: Id<"projects">;
  taskId?: Id<"tasks">;
  limit?: number;
  compact?: boolean;
}

const ACTION_ICONS: Record<string, string> = {
  created: "🆕",
  updated: "✏️",
  deleted: "🗑️",
  status_changed: "🔄",
  moved: "📅",
  cloned: "📋",
  assigned: "👤",
};

const ACTION_COLORS: Record<string, string> = {
  created: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  updated: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  deleted: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
  status_changed: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
  moved: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
  cloned: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900 dark:text-cyan-300",
  assigned: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300",
};

const ENTITY_ICONS: Record<string, string> = {
  project: "📂",
  task: "📋",
  subtask: "📌",
  workOrder: "🔧",
  template: "📐",
};

function formatTime(ts: number) {
  const now = Date.now();
  const diff = now - ts;
  if (diff < 60000) return "just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
  return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatDetails(detailsJson: string | undefined): string | null {
  if (!detailsJson) return null;
  try {
    const changes = JSON.parse(detailsJson);
    const parts: string[] = [];
    for (const [key, val] of Object.entries(changes)) {
      const { from, to } = val as { from: unknown; to: unknown };
      if (key === "status") {
        const labels: Record<string, string> = { todo: "To Do", in_progress: "In Progress", done: "Done", active: "Active", archived: "Archived" };
        parts.push(`${labels[from as string] || String(from)} → ${labels[to as string] || String(to)}`);
      } else if (key === "startDate" || key === "endDate") {
        const label = key === "startDate" ? "Start" : "End";
        const fromStr = from ? new Date(from as number).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "none";
        const toStr = to ? new Date(to as number).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "none";
        parts.push(`${label}: ${fromStr} → ${toStr}`);
      } else if (key === "priority") {
        parts.push(`Priority: ${from} → ${to}`);
      } else if (key === "name" || key === "title") {
        parts.push(`Renamed to "${to}"`);
      } else if (key === "fromTemplate" || key === "sourceProject" || key === "tasks" || key === "subtasks" || key === "workOrders") {
        // Skip these — they're metadata for cloned/template entries
      } else {
        parts.push(`${key} changed`);
      }
    }

    // Handle template/clone metadata
    if (changes.fromTemplate) parts.push(`from template "${changes.fromTemplate}"`);
    if (changes.sourceProject) parts.push(`from "${changes.sourceProject}"`);
    if (changes.tasks !== undefined) parts.push(`${changes.tasks} tasks`);

    return parts.length > 0 ? parts.join(" · ") : null;
  } catch {
    return null;
  }
}

export function ActivityTimeline({ projectId, taskId, limit = 20, compact = false }: ActivityTimelineProps) {
  const [showAll, setShowAll] = useState(false);

  // Pick the right query
  const byProject = useQuery(
    api.activityLog.listByProject,
    projectId ? { projectId } : "skip"
  );
  const byTask = useQuery(
    api.activityLog.listByTask,
    taskId ? { taskId } : "skip"
  );

  const entries = projectId ? byProject : byTask;
  if (!entries) return <div className="h-8 animate-pulse rounded bg-muted" />;

  const displayEntries = showAll ? entries : entries.slice(0, limit);

  if (entries.length === 0) {
    return (
      <p className={`text-center ${compact ? "py-2 text-[11px]" : "py-4 text-xs"} text-muted-foreground`}>
        No activity yet.
      </p>
    );
  }

  if (compact) {
    return (
      <div>
        <div className="max-h-[200px] space-y-1 overflow-y-auto">
          {displayEntries.map((entry) => {
            const details = formatDetails(entry.details);
            return (
              <div key={entry._id} className="flex items-start gap-1.5 rounded border px-2 py-1.5">
                <span className="text-[10px]">{ACTION_ICONS[entry.action] || "📝"}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px]">
                    <span className="font-medium">{entry.userName}</span>
                    {" "}{entry.action.replace("_", " ")}
                    {" "}{ENTITY_ICONS[entry.entityType] || ""} <span className="font-medium">{entry.entityName}</span>
                  </p>
                  {details && <p className="text-[10px] text-muted-foreground">{details}</p>}
                  <p className="text-[9px] text-muted-foreground">{formatTime(entry.createdAt)}</p>
                </div>
              </div>
            );
          })}
        </div>
        {entries.length > limit && !showAll && (
          <button onClick={() => setShowAll(true)} className="mt-1 w-full text-center text-[10px] text-primary hover:underline">
            Show all {entries.length} entries
          </button>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="relative max-h-[400px] space-y-0 overflow-y-auto pl-6">
        {/* Vertical line */}
        <div className="absolute left-[9px] top-2 bottom-2 w-px bg-border" />

        {displayEntries.map((entry, i) => {
          const details = formatDetails(entry.details);
          const colorClass = ACTION_COLORS[entry.action] || "bg-muted text-foreground";

          return (
            <div key={entry._id} className="relative pb-3">
              {/* Timeline dot */}
              <div className={`absolute -left-6 top-1 flex h-4 w-4 items-center justify-center rounded-full text-[8px] ${colorClass}`}>
                {ACTION_ICONS[entry.action]?.charAt(0) || "•"}
              </div>
              <div className="rounded-md border bg-card p-2.5 transition-colors hover:bg-muted/30">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm">
                    <span className="font-medium">{entry.userName}</span>
                    {" "}
                    <span className={`inline-block rounded px-1 py-0.5 text-[10px] font-medium ${colorClass}`}>
                      {entry.action.replace("_", " ")}
                    </span>
                    {" "}
                    {ENTITY_ICONS[entry.entityType] || ""}{" "}
                    <span className="font-medium">{entry.entityName}</span>
                  </p>
                  <span className="flex-shrink-0 text-[10px] text-muted-foreground">{formatTime(entry.createdAt)}</span>
                </div>
                {details && (
                  <p className="mt-1 text-xs text-muted-foreground">{details}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {entries.length > limit && !showAll && (
        <button onClick={() => setShowAll(true)} className="mt-2 w-full text-center text-xs text-primary hover:underline">
          Show all {entries.length} entries
        </button>
      )}
    </div>
  );
}
