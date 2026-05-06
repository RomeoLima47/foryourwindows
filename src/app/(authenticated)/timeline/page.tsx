"use client";

import React, { useState, useMemo, useRef } from "react";
import { useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "../../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Id } from "../../../../convex/_generated/dataModel";

type ViewMode = "month" | "quarter" | "half";

const STATUS_COLORS: Record<string, string> = {
  todo: "#94a3b8",
  in_progress: "#f59e0b",
  done: "#22c55e",
  active: "#3b82f6",
};

const ENTITY_ICONS: Record<string, string> = {
  project: "📂",
  task: "📋",
  subtask: "📌",
};

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function diffDays(a: Date, b: Date) {
  return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

function fmtShort(d: Date) {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function fmtMonth(d: Date) {
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

export default function TimelinePage() {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<ViewMode>("quarter");
  const [projectFilter, setProjectFilter] = useState<string>("all");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const scrollRef = useRef<HTMLDivElement>(null);

  const timelineItems = useQuery(api.gantt.timelineItems, {});
  const projects = useQuery(api.projects.list);

  // Calculate date range
  const { items, rangeStart, rangeEnd, totalDays } = useMemo(() => {
    if (!timelineItems) return { items: [], rangeStart: new Date(), rangeEnd: new Date(), totalDays: 90 };

    let filtered = timelineItems;
    if (projectFilter !== "all") {
      filtered = timelineItems.filter(
        (i) => i.id === projectFilter || i.projectId === projectFilter
      );
    }

    // Find min/max dates, defaulting to 3-month window
    const now = new Date();
    let min = new Date(now);
    let max = new Date(now);
    min.setMonth(min.getMonth() - 1);
    max.setMonth(max.getMonth() + 3);

    for (const item of filtered) {
      if (item.startDate) {
        const d = new Date(item.startDate);
        if (d < min) min = d;
      }
      if (item.endDate) {
        const d = new Date(item.endDate);
        if (d > max) max = d;
      }
    }

    // Add padding
    min = addDays(min, -7);
    max = addDays(max, 14);

    // Round to start of month
    min.setDate(1);

    const days = Math.max(diffDays(min, max), 30);

    // Filter out collapsed children
    const visibleItems = filtered.filter((item) => {
      if (item.depth === 0) return true;
      if (item.depth === 1 && item.projectId) return !collapsed.has(item.projectId);
      if (item.depth === 2 && item.parentId) {
        const parentProject = filtered.find((i) => i.id === item.parentId)?.projectId;
        return !collapsed.has(item.parentId) && (!parentProject || !collapsed.has(parentProject));
      }
      return true;
    });

    return { items: visibleItems, rangeStart: min, rangeEnd: max, totalDays: days };
  }, [timelineItems, projectFilter, collapsed]);

  const toggleCollapse = (id: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // Generate month headers
  const months = useMemo(() => {
    const result: { label: string; startDay: number; width: number }[] = [];
    const cursor = new Date(rangeStart);
    cursor.setDate(1);
    while (cursor < rangeEnd) {
      const monthStart = new Date(cursor);
      cursor.setMonth(cursor.getMonth() + 1);
      const monthEnd = new Date(cursor);

      const startDay = Math.max(0, diffDays(rangeStart, monthStart));
      const endDay = Math.min(totalDays, diffDays(rangeStart, monthEnd));
      const width = endDay - startDay;

      if (width > 0) {
        result.push({ label: fmtMonth(monthStart), startDay, width });
      }
    }
    return result;
  }, [rangeStart, rangeEnd, totalDays]);

  // Today line position
  const todayOffset = diffDays(rangeStart, new Date());
  const todayPct = (todayOffset / totalDays) * 100;

  const COL_WIDTH = viewMode === "month" ? 28 : viewMode === "quarter" ? 14 : 8;
  const chartWidth = totalDays * COL_WIDTH;
  const nameColWidth = 280;

  if (!timelineItems || !projects) {
    return (
      <div>
        <div className="mb-4 h-9 w-48 animate-pulse rounded bg-muted" />
        <div className="h-96 animate-pulse rounded-lg bg-muted" />
      </div>
    );
  }

  const activeProjects = projects.filter((p) => p.status === "active");

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold">📊 Project Timeline</h1>
        <div className="flex items-center gap-2">
          {/* Project filter */}
          <select
            className="flex h-8 rounded-md border bg-background px-2 text-xs"
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            title="Filter by project"
          >
            <option value="all">All Projects</option>
            {activeProjects.map((p) => (
              <option key={p._id} value={p._id}>{p.name}</option>
            ))}
          </select>

          {/* View mode */}
          <div className="flex rounded-md border">
            {(["month", "quarter", "half"] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-2.5 py-1 text-xs font-medium transition-colors ${
                  viewMode === mode ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                }`}
              >
                {mode === "month" ? "Month" : mode === "quarter" ? "Quarter" : "Half Year"}
              </button>
            ))}
          </div>

          {/* Scroll to today */}
          <Button
            variant="outline"
            size="sm"
            className="text-xs"
            onClick={() => {
              if (scrollRef.current) {
                const todayPx = (todayOffset / totalDays) * chartWidth;
                scrollRef.current.scrollLeft = todayPx - 200;
              }
            }}
          >
            📍 Today
          </Button>
        </div>
      </div>

      {items.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <p className="mb-2 text-3xl">📊</p>
            <p className="mb-1 font-medium">No timeline data</p>
            <p className="text-sm">Add start and end dates to your projects and tasks to see them here.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="flex-1 overflow-hidden rounded-lg border bg-card">
          {/* Header row with month labels */}
          <div className="flex border-b bg-muted/30">
            <div className="flex-shrink-0 border-r bg-card px-3 py-2" style={{ width: nameColWidth }}>
              <span className="text-xs font-medium text-muted-foreground">Name</span>
            </div>
            <div ref={scrollRef} className="flex-1 overflow-x-auto" style={{ scrollbarWidth: "thin" }}>
              <div className="relative" style={{ width: chartWidth, minHeight: 32 }}>
                {months.map((m, i) => (
                  <div
                    key={i}
                    className="absolute top-0 border-r border-dashed border-muted px-2 py-2"
                    style={{
                      left: `${(m.startDay / totalDays) * 100}%`,
                      width: `${(m.width / totalDays) * 100}%`,
                    }}
                  >
                    <span className="text-[10px] font-medium text-muted-foreground whitespace-nowrap">{m.label}</span>
                  </div>
                ))}
                {/* Today line */}
                {todayPct >= 0 && todayPct <= 100 && (
                  <div className="absolute top-0 bottom-0 z-10 w-px bg-red-500" style={{ left: `${todayPct}%` }}>
                    <span className="absolute -top-0 -translate-x-1/2 rounded bg-red-500 px-1 text-[8px] font-bold text-white">TODAY</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Rows */}
          <div className="max-h-[calc(100vh-250px)] overflow-y-auto">
            {items.map((item) => {
              const hasChildren = timelineItems?.some((i) => i.parentId === item.id);
              const isCollapsed = collapsed.has(item.id);

              // Calculate bar position
              let barStart = 0;
              let barWidth = 0;
              let hasBar = false;

              if (item.startDate || item.endDate) {
                const start = item.startDate ? new Date(item.startDate) : new Date(item.endDate!);
                const end = item.endDate ? new Date(item.endDate) : addDays(start, 1);
                const startDay = diffDays(rangeStart, start);
                const endDay = diffDays(rangeStart, end);
                barStart = (startDay / totalDays) * 100;
                barWidth = Math.max(((endDay - startDay) / totalDays) * 100, 0.5);
                hasBar = true;
              }

              const barColor = item.color || STATUS_COLORS[item.status] || "#94a3b8";
              const isProject = item.entityType === "project";

              return (
                <div
                  key={item.id}
                  className={`flex border-b transition-colors hover:bg-muted/20 ${
                    isProject ? "bg-muted/10" : ""
                  }`}
                >
                  {/* Name column */}
                  <div
                    className="flex items-center gap-1.5 border-r px-2 py-1.5 flex-shrink-0"
                    style={{ width: nameColWidth, paddingLeft: 8 + item.depth * 20 }}
                  >
                    {hasChildren && (
                      <button
                        onClick={() => toggleCollapse(item.id)}
                        className="text-[10px] text-muted-foreground hover:text-foreground w-4 flex-shrink-0"
                        title={isCollapsed ? "Expand" : "Collapse"}
                      >
                        {isCollapsed ? "▶" : "▼"}
                      </button>
                    )}
                    {!hasChildren && <span className="w-4 flex-shrink-0" />}
                    <span className="text-xs flex-shrink-0">{ENTITY_ICONS[item.entityType]}</span>
                    <span
                      className={`text-xs truncate cursor-pointer hover:underline ${
                        isProject ? "font-semibold" : item.status === "done" ? "text-muted-foreground line-through" : ""
                      }`}
                      onClick={() => {
                        if (item.entityType === "project") router.push(`/projects/${item.id}`);
                        else if (item.projectId) router.push(`/projects/${item.projectId}`);
                      }}
                      title={item.name}
                    >
                      {item.name}
                    </span>
                    {item.assigneeName && (
                      <span className="text-[9px] text-muted-foreground flex-shrink-0 ml-auto">
                        {item.assigneeName.split(" ")[0]}
                      </span>
                    )}
                  </div>

                  {/* Chart area */}
                  <div className="flex-1 overflow-hidden relative" style={{ minHeight: 32 }}>
                    <div className="relative h-full" style={{ width: chartWidth }}>
                      {/* Today line continuation */}
                      {todayPct >= 0 && todayPct <= 100 && (
                        <div className="absolute top-0 bottom-0 w-px bg-red-500/20" style={{ left: `${todayPct}%` }} />
                      )}

                      {hasBar ? (
                        <div
                          className="absolute top-1/2 -translate-y-1/2 rounded-sm transition-all"
                          style={{
                            left: `${barStart}%`,
                            width: `${barWidth}%`,
                            height: isProject ? 10 : 18,
                            minWidth: 4,
                          }}
                          title={`${item.name}${item.startDate ? "\nStart: " + fmtShort(new Date(item.startDate)) : ""}${item.endDate ? "\nEnd: " + fmtShort(new Date(item.endDate)) : ""}\n${item.progress}% complete`}
                        >
                          {/* Background bar */}
                          <div
                            className="absolute inset-0 rounded-sm opacity-30"
                            style={{ backgroundColor: barColor }}
                          />
                          {/* Progress fill */}
                          <div
                            className="absolute inset-y-0 left-0 rounded-sm"
                            style={{
                              width: `${item.progress}%`,
                              backgroundColor: barColor,
                            }}
                          />
                          {/* Label on bar (tasks only, if bar is wide enough) */}
                          {!isProject && barWidth > 3 && (
                            <span className="absolute inset-0 flex items-center px-1.5 text-[9px] font-medium text-white truncate mix-blend-difference">
                              {item.progress > 0 && `${item.progress}%`}
                            </span>
                          )}
                        </div>
                      ) : (
                        // No dates — show a diamond marker at today
                        <div
                          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2"
                          style={{ left: `${todayPct}%` }}
                          title={`${item.name} — no dates set`}
                        >
                          <div className="h-2 w-2 rotate-45 border border-muted-foreground/30 bg-muted" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 border-t px-3 py-2 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1"><span className="inline-block h-2 w-6 rounded-sm bg-blue-500 opacity-30" /><span className="inline-block h-2 w-3 rounded-sm bg-blue-500" /> Progress</span>
            <span className="flex items-center gap-1"><span className="inline-block h-px w-4 bg-red-500" /> Today</span>
            <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rotate-45 border border-muted-foreground/30 bg-muted" /> No dates</span>
            <span className="ml-auto">{items.length} items</span>
          </div>
        </div>
      )}
    </div>
  );
}
