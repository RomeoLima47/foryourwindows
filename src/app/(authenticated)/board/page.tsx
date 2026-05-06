"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from "@hello-pangea/dnd";
import { api } from "../../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { CommentsSection } from "@/components/comments-section";
import { FileAttachments } from "@/components/file-attachments";
import { useToast } from "@/components/toast";
import type { Id } from "../../../../convex/_generated/dataModel";

const columns = [
  { id: "todo", label: "To Do", color: "border-t-blue-500", bg: "bg-blue-50 dark:bg-blue-950/30" },
  { id: "in_progress", label: "In Progress", color: "border-t-yellow-500", bg: "bg-yellow-50 dark:bg-yellow-950/30" },
  { id: "done", label: "Done", color: "border-t-green-500", bg: "bg-green-50 dark:bg-green-950/30" },
];

const priorityColors: Record<string, string> = {
  low: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
  medium: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  high: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

const priorityDots: Record<string, string> = { high: "bg-red-500", medium: "bg-orange-400", low: "bg-gray-400" };

const entityIcons: Record<string, string> = {
  task: "📋",
  subtask: "📌",
  workOrder: "🔧",
};

const entityLabels: Record<string, string> = {
  task: "Task",
  subtask: "Subtask",
  workOrder: "Work Order",
};

const entityColors: Record<string, string> = {
  task: "bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-200",
  subtask: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
  workOrder: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
};

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function fmtShort(ts: number) {
  return new Date(ts).toISOString().slice(0, 10);
}

/** Sort items by date — prefers endDate, falls back to startDate, no-date items go last */
function dateSortKey(item: { endDate?: number; startDate?: number }): number {
  const date = item.endDate ?? item.startDate;
  if (!date) return Number.MAX_SAFE_INTEGER;
  return date;
}

export default function BoardPage() {
  const { toast } = useToast();
  const router = useRouter();
  const boardItems = useQuery(api.board.allItems);
  const projects = useQuery(api.projects.list);
  const updateTask = useMutation(api.tasks.update);
  const updateSubtask = useMutation(api.subtasks.update);
  const updateWorkOrder = useMutation(api.workOrders.update);
  const createTask = useMutation(api.tasks.create);
  const deleteTask = useMutation(api.tasks.remove);
  const deleteSubtask = useMutation(api.subtasks.remove);
  const deleteWorkOrder = useMutation(api.workOrders.remove);

  const [createOpen, setCreateOpen] = useState(false);
  const [createColumn, setCreateColumn] = useState<string>("todo");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const [projectId, setProjectId] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [filterProject, setFilterProject] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [sortAsc, setSortAsc] = useState(true); // true = ascending (soonest first), false = descending

  // Inline edit state
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editStartDate, setEditStartDate] = useState("");
  const [editEndDate, setEditEndDate] = useState("");
  const [editPriority, setEditPriority] = useState<"low" | "medium" | "high">("medium");

  // ─── EXPAND/EDIT HELPERS ──────────────────────────────────

  const startEditing = (item: {
    _id: string;
    title: string;
    description?: string;
    startDate?: number;
    endDate?: number;
    priority?: string;
  }) => {
    setExpandedItem(item._id);
    setEditTitle(item.title);
    setEditDesc(item.description ?? "");
    setEditStartDate(item.startDate ? fmtShort(item.startDate) : "");
    setEditEndDate(item.endDate ? fmtShort(item.endDate) : "");
    setEditPriority((item.priority as "low" | "medium" | "high") ?? "medium");
  };

  const cancelEdit = () => {
    setExpandedItem(null);
  };

  const saveEdit = async (item: { _id: string; entityType: string }) => {
    const startTs = editStartDate ? new Date(editStartDate + "T12:00:00").getTime() : undefined;
    const endTs = editEndDate ? new Date(editEndDate + "T12:00:00").getTime() : undefined;

    if (item.entityType === "task") {
      await updateTask({
        id: item._id as Id<"tasks">,
        title: editTitle || undefined,
        description: editDesc || undefined,
        priority: editPriority,
        startDate: startTs,
        endDate: endTs,
      });
    } else if (item.entityType === "subtask") {
      await updateSubtask({
        id: item._id as Id<"subtasks">,
        title: editTitle || undefined,
        description: editDesc || undefined,
        startDate: startTs,
        endDate: endTs,
      });
    } else if (item.entityType === "workOrder") {
      await updateWorkOrder({
        id: item._id as Id<"workOrders">,
        title: editTitle || undefined,
        description: editDesc || undefined,
        startDate: startTs,
        endDate: endTs,
      });
    }

    toast(`${entityIcons[item.entityType]} "${editTitle}" updated`);
    setExpandedItem(null);
  };

  const handleDelete = async (item: { _id: string; entityType: string; title: string }) => {
    if (item.entityType === "task") {
      await deleteTask({ id: item._id as Id<"tasks"> });
    } else if (item.entityType === "subtask") {
      await deleteSubtask({ id: item._id as Id<"subtasks"> });
    } else if (item.entityType === "workOrder") {
      await deleteWorkOrder({ id: item._id as Id<"workOrders"> });
    }
    toast(`${entityIcons[item.entityType]} "${item.title}" deleted`);
    if (expandedItem === item._id) setExpandedItem(null);
  };

  // ─── DRAG-AND-DROP STATUS UPDATE ──────────────────────────

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return;
    const itemId = result.draggableId;
    const newStatus = result.destination.droppableId as "todo" | "in_progress" | "done";

    const item = boardItems?.find((i) => i._id === itemId);
    if (!item) return;

    if (item.entityType === "task") {
      await updateTask({ id: itemId as Id<"tasks">, status: newStatus });
    } else if (item.entityType === "subtask") {
      await updateSubtask({ id: itemId as Id<"subtasks">, status: newStatus });
    } else if (item.entityType === "workOrder") {
      await updateWorkOrder({ id: itemId as Id<"workOrders">, status: newStatus });
    }

    if (newStatus === "done") toast(`${entityIcons[item.entityType]} "${item.title}" completed! 🎉`);
  };

  // ─── CREATE TASK ──────────────────────────────────────────

  const openCreateForColumn = (columnId: string) => {
    setCreateColumn(columnId);
    setCreateOpen(true);
  };

  const handleCreate = async () => {
    if (!title.trim()) return;
    await createTask({
      title, description: description || undefined,
      status: createColumn as "todo" | "in_progress" | "done",
      priority,
      projectId: projectId ? (projectId as Id<"projects">) : undefined,
      endDate: endDate ? new Date(endDate).getTime() : undefined,
    });
    toast(`Task "${title}" created`);
    setTitle(""); setDescription(""); setPriority("medium"); setProjectId(""); setEndDate(""); setCreateOpen(false);
  };

  // ─── FILTERING + SORTING ──────────────────────────────────

  const filteredItems = useMemo(() => {
    if (!boardItems) return [];
    const filtered = boardItems.filter((item) => {
      if (filterProject !== "all") {
        if (filterProject === "none" && item.projectId) return false;
        if (filterProject !== "none" && item.projectId !== filterProject) return false;
      }
      if (filterType !== "all" && item.entityType !== filterType) return false;
      return true;
    });

    // Sort by date
    filtered.sort((a, b) => {
      const keyA = dateSortKey(a);
      const keyB = dateSortKey(b);
      return sortAsc ? keyA - keyB : keyB - keyA;
    });

    return filtered;
  }, [boardItems, filterProject, filterType, sortAsc]);

  const getColumnItems = (status: string) => filteredItems.filter((i) => i.status === status);

  // ─── LOADING ──────────────────────────────────────────────

  if (!boardItems || !projects) {
    return (
      <div>
        <div className="mb-6 h-9 w-48 animate-pulse rounded bg-muted" />
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <div key={i} className="h-96 animate-pulse rounded-lg bg-muted" />)}
        </div>
      </div>
    );
  }

  // ─── COUNTS ───────────────────────────────────────────────

  const taskCount = filteredItems.filter((i) => i.entityType === "task").length;
  const subtaskCount = filteredItems.filter((i) => i.entityType === "subtask").length;
  const woCount = filteredItems.filter((i) => i.entityType === "workOrder").length;

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">Board</h1>
          <p className="text-xs text-muted-foreground">
            {taskCount} task{taskCount !== 1 ? "s" : ""} · {subtaskCount} subtask{subtaskCount !== 1 ? "s" : ""} · {woCount} work order{woCount !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setSortAsc(!sortAsc)}
            className="flex h-9 items-center gap-1.5 rounded-md border bg-background px-3 text-sm transition-colors hover:bg-muted"
            title={sortAsc ? "Sorted: Soonest date first (ascending) — click to reverse" : "Sorted: Latest date first (descending) — click to reverse"}
          >
            📅 {sortAsc ? "↑ Soonest" : "↓ Latest"}
          </button>
          <select
            className="flex h-9 rounded-md border bg-background px-3 py-1.5 text-sm"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            title="Filter by type"
          >
            <option value="all">All types</option>
            <option value="task">📋 Tasks only</option>
            <option value="subtask">📌 Subtasks only</option>
            <option value="workOrder">🔧 Work Orders only</option>
          </select>
          <select
            className="flex h-9 rounded-md border bg-background px-3 py-1.5 text-sm"
            value={filterProject}
            onChange={(e) => setFilterProject(e.target.value)}
            title="Filter by project"
          >
            <option value="all">All projects</option>
            <option value="none">No project</option>
            {projects.filter((p) => p.status === "active").map((p) => (
              <option key={p._id} value={p._id}>{p.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Create task dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Task to {columns.find((c) => c.id === createColumn)?.label}</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-4">
            <Input placeholder="Task title" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
            <Input placeholder="Description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} />
            <select className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm" value={priority} onChange={(e) => setPriority(e.target.value as any)} title="Priority">
              <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
            </select>
            <select className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm" value={projectId} onChange={(e) => setProjectId(e.target.value)} title="Project">
              <option value="">No project</option>
              {projects.filter((p) => p.status === "active").map((p) => (
                <option key={p._id} value={p._id}>{p.name}</option>
              ))}
            </select>
            <div>
              <label className="mb-1 block text-sm text-muted-foreground">End date (optional)</label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
            <Button onClick={handleCreate} className="w-full">Create</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Kanban columns */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex flex-1 gap-4 overflow-x-auto pb-4">
          {columns.map((column) => {
            const colItems = getColumnItems(column.id);
            return (
              <div key={column.id} className={`flex min-w-[300px] flex-1 flex-col rounded-lg border-t-4 ${column.color} ${column.bg} p-3`}>
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-semibold">{column.label}</h2>
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-muted px-1.5 text-xs font-medium text-muted-foreground" title={`${colItems.length} items`}>
                      {colItems.length}
                    </span>
                  </div>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openCreateForColumn(column.id)} title={`Add task to ${column.label}`}>+</Button>
                </div>

                <Droppable droppableId={column.id}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`flex-1 space-y-2 rounded-md p-1 transition-colors ${snapshot.isDraggingOver ? "bg-primary/5" : ""}`}
                      style={{ minHeight: "200px" }}
                    >
                      {colItems.map((item, index) => {
                        const overdue = item.status !== "done" && item.endDate && item.endDate < Date.now();
                        const isExpanded = expandedItem === item._id;

                        return (
                          <Draggable key={item._id} draggableId={item._id} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className={`rounded-md border bg-card shadow-sm transition-shadow ${
                                  snapshot.isDragging ? "shadow-lg ring-2 ring-primary/20" : "hover:shadow-md"
                                } ${isExpanded ? "ring-2 ring-primary/30" : ""}`}
                              >
                                {/* ─── Card header (always visible) ─── */}
                                <div className="p-3">
                                  <div className="mb-1.5 flex items-start justify-between">
                                    <div className="min-w-0 flex-1">
                                      <p
                                        className={`cursor-pointer text-sm font-medium leading-snug ${
                                          item.status === "done" ? "text-muted-foreground line-through" : ""
                                        }`}
                                        onClick={() => {
                                          if (isExpanded) { cancelEdit(); } else { startEditing(item); }
                                        }}
                                        title={isExpanded ? "Collapse" : "Click to expand & edit"}
                                      >
                                        {item.title}
                                      </p>
                                      {/* Parent breadcrumb */}
                                      {item.parentName && (
                                        <p className="mt-0.5 truncate text-[10px] text-muted-foreground" title={
                                          item.grandparentName
                                            ? `Task: ${item.grandparentName} → Subtask: ${item.parentName}`
                                            : `Task: ${item.parentName}`
                                        }>
                                          {item.grandparentName && <>{item.grandparentName} → </>}
                                          {item.parentName}
                                        </p>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                                      {item.entityType === "task" && item.projectId && (
                                        <button onClick={() => router.push(`/projects/${item.projectId}`)} className="text-[10px] text-muted-foreground hover:text-primary" title="View project">→</button>
                                      )}
                                      <button onClick={() => handleDelete(item)} className="text-xs text-muted-foreground hover:text-red-500" title={`Delete ${entityLabels[item.entityType].toLowerCase()}`}>×</button>
                                      <button
                                        onClick={() => { if (isExpanded) { cancelEdit(); } else { startEditing(item); } }}
                                        className="text-xs text-muted-foreground"
                                        title={isExpanded ? "Collapse" : "Expand"}
                                      >
                                        {isExpanded ? "▾" : "▸"}
                                      </button>
                                    </div>
                                  </div>

                                  {/* Description (collapsed view) */}
                                  {!isExpanded && item.description && (
                                    <p className="mb-2 text-xs text-muted-foreground line-clamp-2">{item.description}</p>
                                  )}

                                  {/* Metadata badges */}
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    <Badge variant="secondary" className={`text-[10px] ${entityColors[item.entityType]}`} title={`Type: ${entityLabels[item.entityType]}`}>
                                      {entityIcons[item.entityType]} {item.entityType === "workOrder" ? "WO" : item.entityType}
                                    </Badge>

                                    {item.priority && (
                                      <>
                                        <span className={`inline-block h-2 w-2 rounded-full ${priorityDots[item.priority]}`} title={`${item.priority} priority`} />
                                        <Badge variant="secondary" className={`text-[10px] ${priorityColors[item.priority]}`} title="Priority">
                                          {item.priority}
                                        </Badge>
                                      </>
                                    )}

                                    {item.projectName && (
                                      <span className="text-[10px] text-muted-foreground" title="Project">📁 {item.projectName}</span>
                                    )}

                                    {item.assigneeName && (
                                      <span className="text-[10px] text-muted-foreground" title="Assigned to">👤 {item.assigneeName}</span>
                                    )}

                                    {item.endDate && (
                                      <span className={`text-[10px] ${overdue ? "font-medium text-red-500" : "text-muted-foreground"}`} title={overdue ? "Overdue!" : "End date"}>
                                        📅 {formatDate(item.endDate)}
                                      </span>
                                    )}

                                    {!item.endDate && item.startDate && (
                                      <span className="text-[10px] text-muted-foreground" title="Start date">
                                        🗓️ {formatDate(item.startDate)}
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {/* ─── Expanded edit form (ALL entity types) ─── */}
                                {isExpanded && (
                                  <div className="border-t px-3 pb-3 pt-2 space-y-3">
                                    {/* Status */}
                                    <div>
                                      <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Status</label>
                                      <div className="flex gap-1">
                                        {columns.map((col) => (
                                          <button
                                            key={col.id}
                                            onClick={async () => {
                                              const newStatus = col.id as "todo" | "in_progress" | "done";
                                              if (item.entityType === "task") {
                                                await updateTask({ id: item._id as Id<"tasks">, status: newStatus });
                                              } else if (item.entityType === "subtask") {
                                                await updateSubtask({ id: item._id as Id<"subtasks">, status: newStatus });
                                              } else if (item.entityType === "workOrder") {
                                                await updateWorkOrder({ id: item._id as Id<"workOrders">, status: newStatus });
                                              }
                                              toast("Status updated");
                                            }}
                                            className={`rounded-md border px-2.5 py-1 text-[11px] font-medium transition-colors ${
                                              item.status === col.id
                                                ? "border-primary bg-primary/10 text-primary"
                                                : "border-transparent text-muted-foreground hover:bg-muted"
                                            }`}
                                            title={`Set status to ${col.label}`}
                                          >
                                            {col.label}
                                          </button>
                                        ))}
                                      </div>
                                    </div>

                                    {/* Title */}
                                    <div>
                                      <label className="mb-1 block text-[11px] font-medium text-muted-foreground">
                                        {entityLabels[item.entityType]} Title
                                      </label>
                                      <Input
                                        value={editTitle}
                                        onChange={(e) => setEditTitle(e.target.value)}
                                        className="h-8 text-sm"
                                        title="Edit title"
                                      />
                                    </div>

                                    {/* Description */}
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

                                    {/* Priority (tasks only) */}
                                    {item.entityType === "task" && (
                                      <div>
                                        <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Priority</label>
                                        <div className="flex gap-1">
                                          {(["low", "medium", "high"] as const).map((p) => (
                                            <button
                                              key={p}
                                              onClick={() => setEditPriority(p)}
                                              className={`rounded-md border px-2.5 py-1 text-[11px] font-medium transition-colors ${
                                                editPriority === p
                                                  ? `border-primary ${priorityColors[p]}`
                                                  : "border-transparent text-muted-foreground hover:bg-muted"
                                              }`}
                                              title={`Set priority to ${p}`}
                                            >
                                              {p === "high" ? "🔴" : p === "medium" ? "🟡" : "🔵"} {p}
                                            </button>
                                          ))}
                                        </div>
                                      </div>
                                    )}

                                    {/* Date range */}
                                    <div className="grid grid-cols-2 gap-2">
                                      <div>
                                        <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Start Date</label>
                                        <Input
                                          type="date"
                                          value={editStartDate}
                                          onChange={(e) => setEditStartDate(e.target.value)}
                                          className="h-8 text-sm"
                                          title="Start date"
                                        />
                                      </div>
                                      <div>
                                        <label className="mb-1 block text-[11px] font-medium text-muted-foreground">End Date</label>
                                        <Input
                                          type="date"
                                          value={editEndDate}
                                          onChange={(e) => setEditEndDate(e.target.value)}
                                          className="h-8 text-sm"
                                          title="End date"
                                        />
                                      </div>
                                    </div>

                                    {/* Context info */}
                                    <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                                      {item.projectName && <span title="Project">📁 {item.projectName}</span>}
                                      {item.parentName && (
                                        <span title="Parent">
                                          ↳ {item.parentName}
                                          {item.grandparentName && <span className="text-muted-foreground/60"> (in {item.grandparentName})</span>}
                                        </span>
                                      )}
                                      {item.assigneeName && <span title="Assigned to">👤 {item.assigneeName}</span>}
                                    </div>

                                    {/* Save / Cancel / Delete */}
                                    <div className="flex items-center gap-2">
                                      <Button size="sm" className="h-7 text-xs" onClick={() => saveEdit(item)} title="Save changes">
                                        💾 Save
                                      </Button>
                                      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={cancelEdit} title="Cancel editing">
                                        Cancel
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="ml-auto h-7 text-xs text-red-500 hover:text-red-700"
                                        onClick={() => handleDelete(item)}
                                        title={`Delete ${entityLabels[item.entityType].toLowerCase()}`}
                                      >
                                        🗑️ Delete
                                      </Button>
                                    </div>

                                    {/* Comments & Files (tasks only — subtasks/workOrders don't have comment/file associations) */}
                                    {item.entityType === "task" && (
                                      <div className="grid gap-3 sm:grid-cols-2">
                                        <div>
                                          <p className="mb-1 text-[11px] font-medium text-muted-foreground">💬 Comments</p>
                                          <CommentsSection taskId={item._id as Id<"tasks">} compact />
                                        </div>
                                        <div>
                                          <p className="mb-1 text-[11px] font-medium text-muted-foreground">📎 Files</p>
                                          <FileAttachments taskId={item._id as Id<"tasks">} compact />
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                          </Draggable>
                        );
                      })}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            );
          })}
        </div>
      </DragDropContext>
    </div>
  );
}
