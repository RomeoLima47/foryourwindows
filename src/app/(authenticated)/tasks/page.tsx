"use client";

import React, { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "../../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { TasksPageSkeleton } from "@/components/skeletons";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { CommentsSection } from "@/components/comments-section";
import { FileAttachments } from "@/components/file-attachments";
import { StatusSelect } from "@/components/status-select";
import { useToast } from "@/components/toast";
import type { Id } from "../../../../convex/_generated/dataModel";

const statusColors: Record<string, string> = {
  todo: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  in_progress: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  done: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
};
const priorityColors: Record<string, string> = {
  low: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
  medium: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  high: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};
const statusIcons: Record<string, string> = { todo: "⬜", in_progress: "🔄", done: "✅" };
const statusLabels: Record<string, string> = { todo: "To Do — click to start", in_progress: "In Progress — click to complete", done: "Done — click to reopen" };

function fmtDate(ts: number) {
  return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function TasksPage() {
  const { toast } = useToast();
  const router = useRouter();
  const tasks = useQuery(api.tasks.list);
  const projects = useQuery(api.projects.list);
  const teammates = useQuery(api.team.listTeammates);
  const createTask = useMutation(api.tasks.create);
  const updateTask = useMutation(api.tasks.update);
  const deleteTask = useMutation(api.tasks.remove);

  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<"todo" | "in_progress" | "done">("todo");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const [projectId, setProjectId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [assigneeId, setAssigneeId] = useState("");

  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [search, setSearch] = useState("");

  const [deleteConfirm, setDeleteConfirm] = useState<Id<"tasks"> | null>(null);
  const deleteTaskName = tasks?.find((t) => t._id === deleteConfirm)?.title ?? "";

  // Expand/edit state
  const [expandedTask, setExpandedTask] = useState<Id<"tasks"> | null>(null);
  const [editTaskId, setEditTaskId] = useState<Id<"tasks"> | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editStart, setEditStart] = useState("");
  const [editEnd, setEditEnd] = useState("");
  const [editPriority, setEditPriority] = useState<"low" | "medium" | "high">("medium");
  const [editAssignee, setEditAssignee] = useState("");

  if (tasks === undefined || projects === undefined) return <TasksPageSkeleton />;

  const handleCreate = async () => {
    if (!title.trim()) return;
    await createTask({
      title, description: description || undefined, status, priority,
      projectId: projectId ? (projectId as Id<"projects">) : undefined,
      startDate: startDate ? new Date(startDate).getTime() : undefined,
      endDate: endDate ? new Date(endDate).getTime() : undefined,
      assigneeId: assigneeId ? (assigneeId as Id<"users">) : undefined,
    });
    toast(`Task "${title}" created`);
    setTitle(""); setDescription(""); setStatus("todo"); setPriority("medium");
    setProjectId(""); setStartDate(""); setEndDate(""); setAssigneeId(""); setCreateOpen(false);
  };

  const handleDelete = async (id: Id<"tasks">) => {
    const name = tasks.find((t) => t._id === id)?.title;
    await deleteTask({ id });
    toast(`"${name}" deleted`);
  };

  const getProjectName = (pid?: Id<"projects">) => {
    if (!pid) return null;
    return projects.find((p) => p._id === pid)?.name ?? null;
  };

  const openInlineEdit = (task: any) => {
    setEditTaskId(task._id);
    setEditTitle(task.title);
    setEditDesc(task.description ?? "");
    setEditStart(task.startDate ? new Date(task.startDate).toISOString().split("T")[0] : "");
    setEditEnd(task.endDate ? new Date(task.endDate).toISOString().split("T")[0] : "");
    setEditPriority(task.priority);
    setEditAssignee(task.assigneeId ?? "");
    setExpandedTask(task._id);
  };

  const saveInlineEdit = async () => {
    if (!editTaskId) return;
    await updateTask({
      id: editTaskId, title: editTitle, description: editDesc || undefined,
      priority: editPriority,
      startDate: editStart ? new Date(editStart).getTime() : undefined,
      endDate: editEnd ? new Date(editEnd).getTime() : undefined,
      assigneeId: editAssignee ? (editAssignee as Id<"users">) : undefined,
    });
    toast("Task updated");
    setEditTaskId(null);
  };

  const filteredTasks = tasks.filter((task) => {
    if (filterStatus !== "all" && task.status !== filterStatus) return false;
    if (filterPriority !== "all" && task.priority !== filterPriority) return false;
    if (search && !task.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">Tasks</h1>
          <p className="text-sm text-muted-foreground">
            {tasks.length} total · {tasks.filter((t) => t.status === "done").length} completed
          </p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto" title="Create a new task">+ New Task</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Task</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-4">
              <Input placeholder="Task title" value={title} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)} autoFocus />
              <Input placeholder="Description (optional)" value={description} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDescription(e.target.value)} />
              <div className="grid grid-cols-2 gap-2">
                <select className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm" value={status} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setStatus(e.target.value as any)} title="Status">
                  <option value="todo">To Do</option><option value="in_progress">In Progress</option><option value="done">Done</option>
                </select>
                <select className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm" value={priority} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setPriority(e.target.value as any)} title="Priority">
                  <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
                </select>
              </div>
              <select className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm" value={projectId} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setProjectId(e.target.value)} title="Project">
                <option value="">No project</option>
                {projects.filter((p) => p.status === "active").map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
              </select>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Assign to</label>
                <select className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm" value={assigneeId} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setAssigneeId(e.target.value)} title="Assignee">
                  <option value="">Unassigned</option>
                  {(teammates ?? []).map((t) => <option key={t._id} value={t._id}>{t.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><label className="mb-1 block text-xs text-muted-foreground">Start date</label><Input type="date" value={startDate} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setStartDate(e.target.value)} /></div>
                <div><label className="mb-1 block text-xs text-muted-foreground">End date</label><Input type="date" value={endDate} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEndDate(e.target.value)} /></div>
              </div>
              <Button onClick={handleCreate} className="w-full">Create</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-col gap-2 sm:mb-6 sm:flex-row sm:flex-wrap">
        <Input placeholder="Search tasks..." value={search} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)} className="sm:max-w-xs" title="Search tasks by name" />
        <select className="flex h-10 rounded-md border bg-background px-3 py-2 text-sm" value={filterStatus} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFilterStatus(e.target.value)} title="Filter by status">
          <option value="all">All statuses</option><option value="todo">To Do</option><option value="in_progress">In Progress</option><option value="done">Done</option>
        </select>
        <select className="flex h-10 rounded-md border bg-background px-3 py-2 text-sm" value={filterPriority} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFilterPriority(e.target.value)} title="Filter by priority">
          <option value="all">All priorities</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option>
        </select>
      </div>

      {/* Task list */}
      {filteredTasks.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="mb-1 text-2xl">✅</p>
            <p className="mb-2 text-muted-foreground">{tasks.length === 0 ? "No tasks yet." : "No tasks match your filters."}</p>
            {tasks.length === 0 && <Button onClick={() => setCreateOpen(true)}>Create your first task</Button>}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filteredTasks.map((task) => {
            const projectName = getProjectName(task.projectId);
            const overdue = task.status !== "done" && task.endDate && task.endDate < Date.now();
            const noSchedule = !task.startDate && !task.endDate;
            const isExpanded = expandedTask === task._id;
            const isEditing = editTaskId === task._id;

            return (
              <Card key={task._id} className={`transition-all ${isExpanded ? "ring-2 ring-primary/30" : "hover:shadow-md"}`}>
                <CardContent className="py-3 sm:py-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-3 min-w-0 flex-1 cursor-pointer"
                      onClick={() => setExpandedTask(isExpanded ? null : task._id)}
                      title={isExpanded ? "Collapse" : "Click to expand"}>
                      <button
                        onClick={(e: React.MouseEvent) => {
                          e.stopPropagation();
                          const next = task.status === "todo" ? "in_progress" : task.status === "in_progress" ? "done" : "todo";
                          updateTask({ id: task._id, status: next as any });
                          if (next === "done") toast(`"${task.title}" completed! 🎉`);
                        }}
                        className="mt-0.5 text-base transition-transform hover:scale-110"
                        title={statusLabels[task.status]}
                      >
                        {statusIcons[task.status]}
                      </button>
                      <div className="min-w-0">
                        <p className={`text-sm font-medium ${task.status === "done" ? "text-muted-foreground line-through" : ""}`}>
                          {task.title}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          {projectName && <span title="Project">📁 {projectName}</span>}
                          {task.startDate && <span title="Start date">📅 {fmtDate(task.startDate)}</span>}
                          {task.startDate && task.endDate && <span>→</span>}
                          {task.endDate && <span className={overdue ? "font-medium text-red-500" : ""} title={overdue ? "Overdue!" : "End date"}>{!task.startDate && "📅 "}{fmtDate(task.endDate)}</span>}
                          {noSchedule && <span className="italic text-yellow-500" title="Unscheduled — drag to Calendar">⚠️ Unscheduled</span>}
                          {task.assigneeName && <span title="Assigned to">👤 {task.assigneeName}</span>}
                          {task.subtaskCount > 0 && <span title={`${task.subtaskDone} of ${task.subtaskCount} subtasks done`}>☑️ {task.subtaskDone}/{task.subtaskCount}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 pl-8 sm:pl-0">
                      <StatusSelect value={task.status} onChange={(s) => { updateTask({ id: task._id, status: s }); if (s === "done") toast(`"${task.title}" completed! 🎉`); }} compact />
                      <Badge variant="secondary" className={`text-xs ${priorityColors[task.priority]}`} title="Priority">{task.priority}</Badge>
                      <Button variant="ghost" size="sm" onClick={(e: React.MouseEvent) => { e.stopPropagation(); openInlineEdit(task); }} title="Edit task">✏️</Button>
                      {task.projectId && (
                        <Button variant="ghost" size="sm" onClick={(e: React.MouseEvent) => { e.stopPropagation(); router.push(`/projects/${task.projectId}/tasks/${task._id}`); }} title="View task detail">→</Button>
                      )}
                      <Button variant="ghost" size="sm" onClick={(e: React.MouseEvent) => { e.stopPropagation(); setDeleteConfirm(task._id); }} title="Delete task">🗑️</Button>
                    </div>
                  </div>

                  {/* Expanded: inline edit + comments + files */}
                  {isExpanded && (
                    <div className="mt-3 space-y-3 border-t pt-3">
                      {isEditing && (
                        <div className="space-y-2 rounded-md border bg-muted/30 p-3">
                          <Input placeholder="Task title" value={editTitle} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditTitle(e.target.value)} />
                          <Input placeholder="Description" value={editDesc} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditDesc(e.target.value)} />
                          <div className="grid grid-cols-2 gap-2">
                            <div><label className="mb-1 block text-xs text-muted-foreground">Start</label><Input type="date" value={editStart} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditStart(e.target.value)} /></div>
                            <div><label className="mb-1 block text-xs text-muted-foreground">End</label><Input type="date" value={editEnd} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditEnd(e.target.value)} /></div>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <select className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm" value={editPriority} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setEditPriority(e.target.value as any)} title="Priority">
                              <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
                            </select>
                            <select className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm" value={editAssignee} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setEditAssignee(e.target.value)} title="Assignee">
                              <option value="">Unassigned</option>
                              {(teammates ?? []).map((t) => <option key={t._id} value={t._id}>{t.name}</option>)}
                            </select>
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" onClick={saveInlineEdit}>Save</Button>
                            <Button size="sm" variant="ghost" onClick={() => setEditTaskId(null)}>Cancel</Button>
                          </div>
                        </div>
                      )}
                      <div className="grid gap-3 sm:grid-cols-2">
                        <CommentsSection taskId={task._id} compact />
                        <FileAttachments taskId={task._id} compact />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteConfirm}
        onOpenChange={(open) => !open && setDeleteConfirm(null)}
        title="Delete task?"
        message={`Delete "${deleteTaskName}" and all subtasks/work orders? This cannot be undone.`}
        onConfirm={() => { if (deleteConfirm) handleDelete(deleteConfirm); }}
      />
    </div>
  );
}
