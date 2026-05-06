"use client";

import React from "react";

const statuses = [
  { value: "todo", label: "To Do", icon: "⬜", bg: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200", ring: "ring-blue-400" },
  { value: "in_progress", label: "In Progress", icon: "🔄", bg: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200", ring: "ring-yellow-400" },
  { value: "done", label: "Done", icon: "✅", bg: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200", ring: "ring-green-400" },
];

interface StatusSelectProps {
  value: string;
  onChange: (status: "todo" | "in_progress" | "done") => void;
  compact?: boolean;
}

export function StatusSelect({ value, onChange, compact }: StatusSelectProps) {
  if (compact) {
    return (
      <div className="flex gap-1">
        {statuses.map((s) => (
          <button
            key={s.value}
            onClick={(e) => { e.stopPropagation(); onChange(s.value as any); }}
            className={`rounded px-1.5 py-0.5 text-[10px] font-medium transition-all ${
              value === s.value ? `${s.bg} ring-1 ${s.ring}` : "bg-muted/50 text-muted-foreground hover:bg-muted"
            }`}
            title={s.label}
          >
            {s.icon}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="flex gap-1.5">
      {statuses.map((s) => (
        <button
          key={s.value}
          onClick={(e) => { e.stopPropagation(); onChange(s.value as any); }}
          className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-all ${
            value === s.value ? `${s.bg} ring-2 ${s.ring}` : "bg-muted/50 text-muted-foreground hover:bg-muted"
          }`}
          title={s.label}
        >
          <span>{s.icon}</span>
          <span className="hidden sm:inline">{s.label}</span>
        </button>
      ))}
    </div>
  );
}
