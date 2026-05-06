"use client";

import React, { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/components/toast";
import { StatusSelect } from "@/components/status-select";
import { CommentsSection } from "@/components/comments-section";
import { FileAttachments } from "@/components/file-attachments";
import type { Id } from "../../../../convex/_generated/dataModel";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const COLOR_OPTIONS = [
  { label: "Blue", value: "#3b82f6" },
  { label: "Purple", value: "#8b5cf6" },
  { label: "Green", value: "#22c55e" },
  { label: "Amber", value: "#f59e0b" },
  { label: "Red", value: "#ef4444" },
  { label: "Pink", value: "#ec4899" },
  { label: "Cyan", value: "#06b6d4" },
  { label: "Orange", value: "#f97316" },
];

const entityIcons: Record<string, string> = {
  project: "📂",
  task: "📋",
  subtask: "📌",
  workOrder: "🔧",
};

const entityLabels: Record<string, string> = {
  project: "Project",
  task: "Task",
  subtask: "Subtask",
  workOrder: "Work Order",
};

function dateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function sameDay(a: string, b: string) { return a === b; }
function parseDateKey(key: string) { return new Date(key + "T12:00:00"); }
function fmtDate(ts: number) { return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); }
function fmtShort(ts: number) { return new Date(ts).toISOString().slice(0, 10); }

type EntityType = "project" | "task" | "subtask" | "workOrder";

type DragItem = {
  id: string;
  type: EntityType;
  name: string;
  source: "unscheduled" | "scheduled";
  hasStart?: boolean;
  hasEnd?: boolean;
  startDate?: number;
  endDate?: number;
  fromDayKey?: string;
};

export default function CalendarPage() {
  const { toast } = useToast();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const [dragItem, setDragItem] = useState<DragItem | null>(null);
  const [dragOverDay, setDragOverDay] = useState<string | null>(null);

  // Inline edit state
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editStart, setEditStart] = useState("");
  const [editEnd, setEditEnd] = useState("");

  // Color picker dialog
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const [colorPickerTarget, setColorPickerTarget] = useState<{ id: string; type: EntityType } | null>(null);

  // Unscheduled filter
  const [unschedFilter, setUnschedFilter] = useState<string>("all");

  const unscheduled = useQuery(api.calendar.unscheduledItems);
  const scheduledRanges = useQuery(api.calendar.scheduledRanges);

  const updateProject = useMutation(api.projects.update);
  const updateTask = useMutation(api.tasks.update);
  const updateSubtask = useMutation(api.subtasks.update);
  const updateWorkOrder = useMutation(api.workOrders.update);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const today = dateKey(new Date());

  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startPad = firstDay.getDay();
    const days: { key: string; day: number; isCurrentMonth: boolean }[] = [];

    const prevLastDay = new Date(year, month, 0).getDate();
    for (let i = startPad - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, prevLastDay - i);
      days.push({ key: dateKey(d), day: prevLastDay - i, isCurrentMonth: false });
    }
    for (let d = 1; d <= lastDay.getDate(); d++) {
      const dt = new Date(year, month, d);
      days.push({ key: dateKey(dt), day: d, isCurrentMonth: true });
    }
    const remaining = 42 - days.length;
    for (let d = 1; d <= remaining; d++) {
      const dt = new Date(year, month + 1, d);
      days.push({ key: dateKey(dt), day: d, isCurrentMonth: false });
    }
    return days;
  }, [year, month]);

  // Build range map — enriched with full entity data
  const rangeMap = useMemo(() => {
    const map: Record<string, {
      id: string; type: EntityType; name: string; color: string;
      isStart: boolean; isEnd: boolean; startDate: number; endDate: number;
      description?: string; projectStatus?: string; taskStatus?: string;
      priority?: string; projectId?: string; projectName?: string;
      parentName?: string; assigneeId?: string; assigneeName?: string;
    }[]> = {};
    if (!scheduledRanges) return map;
    for (const range of scheduledRanges) {
      const start = new Date(range.startDate);
      const end = new Date(range.endDate);
      const startKey = dateKey(start);
      const endKey = dateKey(end);
      const cursor = new Date(start);
      cursor.setHours(0, 0, 0, 0);
      const endNorm = new Date(end);
      endNorm.setHours(23, 59, 59, 999);
      while (cursor <= endNorm) {
        const k = dateKey(cursor);
        if (!map[k]) map[k] = [];
        map[k].push({
          id: range.id,
          type: range.type,
          name: range.name,
          color: range.color,
          isStart: sameDay(k, startKey),
          isEnd: sameDay(k, endKey),
          startDate: range.startDate,
          endDate: range.endDate,
          description: range.description,
          projectStatus: range.projectStatus,
          taskStatus: range.taskStatus,
          priority: range.priority,
          projectId: range.projectId,
          projectName: range.projectName,
          parentName: range.parentName,
          assigneeId: range.assigneeId,
          assigneeName: range.assigneeName,
        });
        cursor.setDate(cursor.getDate() + 1);
      }
    }
    return map;
  }, [scheduledRanges]);

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const goToday = () => setCurrentDate(new Date());

  // ─── UPDATE HELPER ────────────────────────────────────────

  const updateEntity = async (id: string, type: EntityType, fields: Record<string, any>) => {
    if (type === "project") {
      await updateProject({ id: id as Id<"projects">, ...fields });
    } else if (type === "task") {
      await updateTask({ id: id as Id<"tasks">, ...fields });
    } else if (type === "subtask") {
      await updateSubtask({ id: id as Id<"subtasks">, ...fields });
    } else if (type === "workOrder") {
      await updateWorkOrder({ id: id as Id<"workOrders">, ...fields });
    }
  };

  // ─── DRAG & DROP ──────────────────────────────────────────

  const handleDragStartUnscheduled = (item: {
    _id: string; type: EntityType; name: string;
    hasStart: boolean; hasEnd: boolean; startDate?: number; endDate?: number;
  }) => {
    setDragItem({
      id: item._id, type: item.type, name: item.name,
      source: "unscheduled", hasStart: item.hasStart, hasEnd: item.hasEnd,
    });
  };

  const handleDragStartScheduled = (
    id: string, type: EntityType, name: string,
    startDate: number, endDate: number, fromDayKey: string,
    e: React.DragEvent,
  ) => {
    e.stopPropagation();
    setDragItem({ id, type, name, source: "scheduled", startDate, endDate, fromDayKey });
  };

  const handleDragOver = useCallback((e: React.DragEvent, dayKey: string) => {
    e.preventDefault();
    setDragOverDay(dayKey);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOverDay(null);
  }, []);

  const handleDrop = async (dayKey: string) => {
    setDragOverDay(null);
    if (!dragItem) return;

    const dropTs = parseDateKey(dayKey).getTime();

    if (dragItem.source === "unscheduled") {
      if (!dragItem.hasStart) {
        await updateEntity(dragItem.id, dragItem.type, { startDate: dropTs });
        toast(`"${dragItem.name}" start date set`);
      } else if (!dragItem.hasEnd) {
        await updateEntity(dragItem.id, dragItem.type, { endDate: dropTs });
        toast(`"${dragItem.name}" end date set`);
      }
    } else {
      // Scheduled → shift entire range
      const fromTs = parseDateKey(dragItem.fromDayKey!).getTime();
      const delta = dropTs - fromTs;
      if (delta === 0) { setDragItem(null); return; }

      const newStart = dragItem.startDate! + delta;
      const newEnd = dragItem.endDate! + delta;
      await updateEntity(dragItem.id, dragItem.type, { startDate: newStart, endDate: newEnd });
      toast(`"${dragItem.name}" moved`);
    }
    setDragItem(null);
  };

  // ─── EXPAND & EDIT ────────────────────────────────────────

  const startEditing = (item: {
    id: string; name: string; description?: string;
    startDate: number; endDate: number;
  }) => {
    setExpandedItemId(item.id);
    setEditName(item.name);
    setEditDesc(item.description ?? "");
    setEditStart(fmtShort(item.startDate));
    setEditEnd(fmtShort(item.endDate));
  };

  const cancelEdit = () => setExpandedItemId(null);

  const saveEdit = async (id: string, type: EntityType) => {
    const startTs = editStart ? new Date(editStart + "T12:00:00").getTime() : undefined;
    const endTs = editEnd ? new Date(editEnd + "T12:00:00").getTime() : undefined;

    const nameField = type === "project" ? "name" : "title";
    await updateEntity(id, type, {
      [nameField]: editName || undefined,
      description: editDesc || undefined,
      startDate: startTs,
      endDate: endTs,
    });
    toast("Saved");
    setExpandedItemId(null);
  };

  const handleStatusChange = async (id: string, type: EntityType, status: string) => {
    if (type !== "project") {
      await updateEntity(id, type, { status: status as "todo" | "in_progress" | "done" });
      toast("Status updated");
    }
  };

  // ─── COLOR PICKER ─────────────────────────────────────────

  const openColorPicker = (id: string, type: EntityType) => {
    setColorPickerTarget({ id, type });
    setColorPickerOpen(true);
  };

  const applyColor = async (color: string) => {
    if (!colorPickerTarget) return;
    await updateEntity(colorPickerTarget.id, colorPickerTarget.type, { color });
    toast("Color updated");
    setColorPickerOpen(false);
  };

  // ─── UNSCHEDULED ITEMS ────────────────────────────────────

  const allUnscheduled = useMemo(() => {
    const items = [
      ...(unscheduled?.projects ?? []).map((p) => ({ ...p, entityType: "project" as const })),
      ...(unscheduled?.tasks ?? []).map((t) => ({ ...t, entityType: "task" as const })),
      ...(unscheduled?.subtasks ?? []).map((s) => ({ ...s, entityType: "subtask" as const })),
      ...(unscheduled?.workOrders ?? []).map((w) => ({ ...w, entityType: "workOrder" as const })),
    ];
    if (unschedFilter !== "all") {
      return items.filter((i) => i.type === unschedFilter);
    }
    return items;
  }, [unscheduled, unschedFilter]);

  const selectedDayRanges = selectedDay ? (rangeMap[selectedDay] || []) : [];
  const uniqueSelectedItems = useMemo(() => {
    const seen = new Set<string>();
    return selectedDayRanges.filter((r) => {
      if (seen.has(r.id)) return false;
      seen.add(r.id);
      return true;
    });
  }, [selectedDayRanges]);

  const monthName = currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  // ─── Counts ───
  const unschedCounts = {
    project: (unscheduled?.projects ?? []).length,
    task: (unscheduled?.tasks ?? []).length,
    subtask: (unscheduled?.subtasks ?? []).length,
    workOrder: (unscheduled?.workOrders ?? []).length,
  };
  const totalUnsched = unschedCounts.project + unschedCounts.task + unschedCounts.subtask + unschedCounts.workOrder;

  // ─── RENDER ───────────────────────────────────────────────

  return (
    <div>
      {/* Header */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold sm:text-3xl">Calendar</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={prevMonth} title="Previous month">←</Button>
          <Button variant="outline" size="sm" onClick={goToday} title="Go to today">Today</Button>
          <span className="min-w-[140px] text-center font-medium">{monthName}</span>
          <Button variant="outline" size="sm" onClick={nextMonth} title="Next month">→</Button>
        </div>
      </div>

      <div className="flex flex-col gap-4 lg:flex-row">
        {/* ─── Calendar grid ─── */}
        <div className="flex-1">
          <div className="grid grid-cols-7 gap-px rounded-lg border bg-muted overflow-hidden">
            {DAYS.map((day) => (
              <div key={day} className="bg-card px-1 py-2 text-center text-xs font-medium text-muted-foreground">{day}</div>
            ))}
            {calendarDays.map((d) => {
              const ranges = rangeMap[d.key] || [];
              const isToday = d.key === today;
              const isSelected = selectedDay === d.key;
              const isDragOver = dragOverDay === d.key;

              let bgStyle: React.CSSProperties = {};
              if (ranges.length === 1) {
                bgStyle = { backgroundColor: ranges[0].color + "20", borderLeft: `3px solid ${ranges[0].color}` };
              } else if (ranges.length > 1) {
                const stops = ranges.map((r, i) => {
                  const pct1 = Math.round((i / ranges.length) * 100);
                  const pct2 = Math.round(((i + 1) / ranges.length) * 100);
                  return `${r.color}20 ${pct1}%, ${r.color}20 ${pct2}%`;
                }).join(", ");
                bgStyle = { background: `linear-gradient(135deg, ${stops})`, borderLeft: `3px solid ${ranges[0].color}` };
              }

              return (
                <div
                  key={d.key}
                  className={`relative min-h-[70px] cursor-pointer bg-card p-1 transition-colors hover:bg-muted/50 sm:min-h-[85px] ${
                    !d.isCurrentMonth ? "opacity-40" : ""
                  } ${isSelected ? "ring-2 ring-primary/50" : ""} ${
                    isDragOver ? "ring-2 ring-blue-400 bg-blue-50 dark:bg-blue-950/30" : ""
                  }`}
                  style={bgStyle}
                  onClick={() => setSelectedDay(isSelected ? null : d.key)}
                  onDragOver={(e) => handleDragOver(e, d.key)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => { e.preventDefault(); handleDrop(d.key); }}
                  title={`${d.key}${ranges.length > 0 ? ` — ${ranges.length} active item(s)` : ""}`}
                >
                  <span className={`text-xs ${isToday ? "flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground" : ""}`}>
                    {d.day}
                  </span>
                  <div className="hidden space-y-0.5 sm:block">
                    {ranges.slice(0, 2).map((r, i) => (
                      <div
                        key={`${r.id}-${i}`}
                        draggable
                        onDragStart={(e) => handleDragStartScheduled(r.id, r.type, r.name, r.startDate, r.endDate, d.key, e)}
                        className="group/label flex cursor-grab items-center gap-0.5 truncate rounded px-0.5 text-[9px] font-medium transition-colors hover:bg-black/5 active:cursor-grabbing dark:hover:bg-white/10"
                        style={{ color: r.color }}
                        title={`Drag to move "${r.name}" · Click day to expand`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {r.isStart && "▸"}{entityIcons[r.type]} {r.name}{r.isEnd && " ◂"}
                        <span className="ml-auto hidden text-[8px] opacity-0 transition-opacity group-hover/label:inline group-hover/label:opacity-60">⠿</span>
                      </div>
                    ))}
                    {ranges.length > 2 && <div className="text-[9px] text-muted-foreground">+{ranges.length - 2} more</div>}
                  </div>
                  {ranges.length > 0 && (
                    <div className="absolute bottom-1 right-1 sm:hidden">
                      <span className="flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-bold text-white" style={{ backgroundColor: ranges[0].color }}>{ranges.length}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* ─── Selected day detail panel ─── */}
          {selectedDay && (
            <Card className="mt-3">
              <CardContent className="py-3">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-medium">
                    {parseDateKey(selectedDay).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
                  </p>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-muted-foreground" onClick={() => setSelectedDay(null)} title="Close panel">✕</Button>
                </div>

                {uniqueSelectedItems.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No items on this day. Drag items from the sidebar to schedule.</p>
                ) : (
                  <div className="space-y-2">
                    {uniqueSelectedItems.map((r) => {
                      const isExpanded = expandedItemId === r.id;

                      return (
                        <div
                          key={r.id}
                          draggable={!isExpanded}
                          onDragStart={(e) => { if (!isExpanded) handleDragStartScheduled(r.id, r.type, r.name, r.startDate, r.endDate, selectedDay, e); }}
                          className={`rounded-lg border transition-all ${
                            isExpanded ? "ring-2 ring-primary/30 bg-muted/30" : "hover:bg-muted/30 cursor-grab active:cursor-grabbing"
                          }`}
                        >
                          {/* Card header */}
                          <div
                            className="flex items-center gap-2 px-3 py-2 cursor-pointer"
                            onClick={() => {
                              if (isExpanded) { cancelEdit(); } else { startEditing(r); }
                            }}
                            title={isExpanded ? "Click to collapse" : "Click to expand and edit"}
                          >
                            <button
                              className="h-3 w-3 rounded-full flex-shrink-0 ring-1 ring-black/10 hover:ring-2 hover:ring-primary transition-all"
                              style={{ backgroundColor: r.color }}
                              onClick={(e) => { e.stopPropagation(); openColorPicker(r.id, r.type); }}
                              title="Change color"
                            />
                            <span className="text-xs">{entityIcons[r.type]}</span>
                            <span className="flex-1 truncate text-sm font-medium">{r.name}</span>

                            {r.type !== "project" && r.priority && (
                              <Badge variant="secondary" className={`text-[10px] ${
                                r.priority === "high" ? "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
                                : r.priority === "medium" ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300"
                                : "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                              }`} title={`Priority: ${r.priority}`}>
                                {r.priority === "high" ? "🔴" : r.priority === "medium" ? "🟡" : "🔵"}
                              </Badge>
                            )}
                            {r.isStart && <Badge variant="secondary" className="text-[10px]">Start</Badge>}
                            {r.isEnd && <Badge variant="secondary" className="text-[10px]">End</Badge>}
                            <span className="text-[10px] text-muted-foreground">{entityLabels[r.type]}</span>
                            <span className="text-xs text-muted-foreground">{isExpanded ? "▾" : "▸"}</span>
                          </div>

                          {/* ─── Expanded inline edit form ─── */}
                          {isExpanded && (
                            <div className="border-t px-3 pb-3 pt-2 space-y-3">
                              {r.type !== "project" && r.taskStatus && (
                                <div>
                                  <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Status</label>
                                  <StatusSelect
                                    value={r.taskStatus}
                                    onChange={(s) => handleStatusChange(r.id, r.type, s)}
                                    compact
                                  />
                                </div>
                              )}

                              <div>
                                <label className="mb-1 block text-[11px] font-medium text-muted-foreground">
                                  {entityLabels[r.type]} {r.type === "project" ? "Name" : "Title"}
                                </label>
                                <Input
                                  value={editName}
                                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditName(e.target.value)}
                                  className="h-8 text-sm"
                                  title="Edit name"
                                />
                              </div>

                              <div>
                                <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Description</label>
                                <textarea
                                  value={editDesc}
                                  onChange={(e) => setEditDesc(e.target.value)}
                                  className="w-full rounded-md border bg-transparent px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                                  rows={2}
                                  placeholder="Add a description..."
                                  title="Edit description"
                                />
                              </div>

                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Start Date</label>
                                  <Input type="date" value={editStart} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditStart(e.target.value)} className="h-8 text-sm" />
                                </div>
                                <div>
                                  <label className="mb-1 block text-[11px] font-medium text-muted-foreground">End Date</label>
                                  <Input type="date" value={editEnd} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditEnd(e.target.value)} className="h-8 text-sm" />
                                </div>
                              </div>

                              {/* Context info */}
                              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                                {r.projectName && <span title="Project">📁 {r.projectName}</span>}
                                {r.parentName && <span title="Parent">↳ {r.parentName}</span>}
                                {r.assigneeName && <span title="Assigned to">👤 {r.assigneeName}</span>}
                                {r.priority && <span title="Priority">⚡ {r.priority}</span>}
                              </div>

                              {/* Save / Cancel */}
                              <div className="flex items-center gap-2">
                                <Button size="sm" className="h-7 text-xs" onClick={() => saveEdit(r.id, r.type)} title="Save changes">💾 Save</Button>
                                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={cancelEdit} title="Cancel editing">Cancel</Button>
                                <div className="ml-auto">
                                  <button
                                    className="h-6 w-6 rounded-full ring-1 ring-black/10 hover:ring-2 hover:ring-primary transition-all"
                                    style={{ backgroundColor: r.color }}
                                    onClick={() => openColorPicker(r.id, r.type)}
                                    title="Change calendar color"
                                  />
                                </div>
                              </div>

                              {/* Comments & Files for tasks/projects */}
                              {(r.type === "project" || r.type === "task") && (
                                <div className="grid gap-3 sm:grid-cols-2">
                                  <div>
                                    <p className="mb-1 text-[11px] font-medium text-muted-foreground">💬 Comments</p>
                                    {r.type === "project" ? (
                                      <CommentsSection projectId={r.id as Id<"projects">} compact />
                                    ) : (
                                      <CommentsSection taskId={r.id as Id<"tasks">} compact />
                                    )}
                                  </div>
                                  <div>
                                    <p className="mb-1 text-[11px] font-medium text-muted-foreground">📎 Files</p>
                                    {r.type === "project" ? (
                                      <FileAttachments projectId={r.id as Id<"projects">} compact />
                                    ) : (
                                      <FileAttachments taskId={r.id as Id<"tasks">} compact />
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* ─── Unscheduled sidebar ─── */}
        <div className="w-full lg:w-72">
          <Card>
            <CardContent className="pt-4">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-sm font-semibold">Unscheduled Items</h2>
                <Badge variant="secondary" className="text-[10px]">{totalUnsched}</Badge>
              </div>
              <p className="mb-2 text-[11px] text-muted-foreground">Drag onto a day to set missing dates</p>

              {/* Type filter */}
              <div className="mb-3 flex flex-wrap gap-1">
                {[
                  { id: "all", label: "All" },
                  { id: "project", label: `📂 ${unschedCounts.project}` },
                  { id: "task", label: `📋 ${unschedCounts.task}` },
                  { id: "subtask", label: `📌 ${unschedCounts.subtask}` },
                  { id: "workOrder", label: `🔧 ${unschedCounts.workOrder}` },
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setUnschedFilter(f.id)}
                    className={`rounded-md border px-2 py-0.5 text-[10px] transition-colors ${
                      unschedFilter === f.id
                        ? "border-primary bg-primary/10 text-primary font-medium"
                        : "border-transparent hover:bg-muted text-muted-foreground"
                    }`}
                    title={f.id === "all" ? "Show all types" : `Show ${f.id}s only`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {allUnscheduled.length === 0 ? (
                <p className="py-4 text-center text-xs text-muted-foreground">
                  {totalUnsched === 0 ? "🎉 Everything is scheduled!" : "No items match this filter."}
                </p>
              ) : (
                <div className="space-y-1.5 max-h-[60vh] overflow-y-auto">
                  {allUnscheduled.map((item) => {
                    const missingCount = (!item.hasStart ? 1 : 0) + (!item.hasEnd ? 1 : 0);
                    const needsText = !item.hasStart && !item.hasEnd
                      ? "Needs start & end dates"
                      : !item.hasStart
                      ? `End: ${fmtDate(item.endDate!)} · Needs start`
                      : `Start: ${fmtDate(item.startDate!)} · Needs end`;

                    return (
                      <div
                        key={`${item.type}-${item._id}`}
                        draggable
                        onDragStart={() => handleDragStartUnscheduled({
                          _id: item._id,
                          type: item.type,
                          name: item.name,
                          hasStart: item.hasStart,
                          hasEnd: item.hasEnd,
                          startDate: item.startDate,
                          endDate: item.endDate,
                        })}
                        className="cursor-grab rounded-md border bg-card/80 px-2.5 py-2 text-sm transition-all hover:shadow-md active:cursor-grabbing active:shadow-lg"
                        title={`Drag to calendar to set ${!item.hasStart ? "start" : "end"} date`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="text-xs">{entityIcons[item.type]}</span>
                            <span className="truncate text-xs font-medium">{item.name}</span>
                          </div>
                          <Badge variant="secondary" className="flex-shrink-0 bg-yellow-100 text-[10px] text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200" title={`${missingCount} date(s) missing`}>
                            {missingCount}
                          </Badge>
                        </div>
                        <p className="mt-0.5 text-[10px] text-muted-foreground">{needsText}</p>
                        {/* Context: project/parent info */}
                        {"projectName" in item && item.projectName && (
                          <p className="text-[10px] text-muted-foreground" title="Project">📁 {item.projectName}</p>
                        )}
                        {"parentName" in item && item.parentName && (
                          <p className="text-[10px] text-muted-foreground" title="Parent">
                            ↳ {item.parentName}
                            {"grandparentName" in item && item.grandparentName && (
                              <span className="text-muted-foreground/60"> (in {item.grandparentName})</span>
                            )}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Legend */}
          <Card className="mt-3">
            <CardContent className="pt-4">
              <h3 className="mb-2 text-xs font-semibold text-muted-foreground">How it works</h3>
              <div className="space-y-1.5 text-[11px] text-muted-foreground">
                <p>📂 Project · 📋 Task · 📌 Subtask · 🔧 Work Order</p>
                <p><strong>Unscheduled:</strong> Drag onto a day to set the missing start or end date.</p>
                <p><strong>Scheduled:</strong> Drag from a cell or the detail panel to move the entire range.</p>
                <p><strong>Edit:</strong> Click a day, then click an item to expand its edit form.</p>
                <p><strong>Color:</strong> Click the color dot to change an item&apos;s calendar color.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ─── Color picker dialog ─── */}
      <Dialog open={colorPickerOpen} onOpenChange={setColorPickerOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Choose Color</DialogTitle></DialogHeader>
          <div className="grid grid-cols-4 gap-3 pt-4">
            {COLOR_OPTIONS.map((c) => (
              <button
                key={c.value}
                onClick={() => applyColor(c.value)}
                className="flex flex-col items-center gap-1.5 rounded-lg border p-3 transition-all hover:shadow-md"
                title={c.label}
              >
                <div className="h-8 w-8 rounded-full ring-1 ring-black/10" style={{ backgroundColor: c.value }} />
                <span className="text-xs">{c.label}</span>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
