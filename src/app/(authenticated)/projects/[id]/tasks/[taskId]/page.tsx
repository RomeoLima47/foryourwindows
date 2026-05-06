"use client";

import React, { useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { CommentsSection } from "@/components/comments-section";
import { FileAttachments } from "@/components/file-attachments";
import { StatusSelect } from "@/components/status-select";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { DragList, DragHandle } from "@/components/drag-list";
import { TaskDetailSkeleton } from "@/components/skeletons";
import { useToast } from "@/components/toast";
import type { Id } from "../../../../../../../convex/_generated/dataModel";

const statusIcons: Record<string, string> = { todo: "⬜", in_progress: "🔄", done: "✅" };
const statusLabels: Record<string, string> = { todo: "To Do — click to start", in_progress: "In Progress — click to complete", done: "Done — click to reopen" };

function fmtDate(ts?: number) {
  if (!ts) return "";
  return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function TaskDetailPage() {
  const { toast } = useToast();
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as Id<"projects">;
  const taskId = params.taskId as Id<"tasks">;

  const task = useQuery(api.tasks.get, { id: taskId });
  const subtasks = useQuery(api.subtasks.listByTask, { taskId });
  const teammates = useQuery(api.team.listTeammates);

  const updateTask = useMutation(api.tasks.update);
  const createSubtask = useMutation(api.subtasks.create);
  const updateSubtask = useMutation(api.subtasks.update);
  const deleteSubtask = useMutation(api.subtasks.remove);
  const reorderSubtasks = useMutation(api.subtasks.reorder);
  const createWorkOrder = useMutation(api.workOrders.create);

  const [editOpen, setEditOpen] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editStatus, setEditStatus] = useState<"todo" | "in_progress" | "done">("todo");
  const [editPriority, setEditPriority] = useState<"low" | "medium" | "high">("medium");
  const [editStart, setEditStart] = useState("");
  const [editEnd, setEditEnd] = useState("");
  const [editAssignee, setEditAssignee] = useState("");

  const [addSubOpen, setAddSubOpen] = useState(false);
  const [subTitle, setSubTitle] = useState("");
  const [subDesc, setSubDesc] = useState("");
  const [subAssignee, setSubAssignee] = useState("");
  const [subStart, setSubStart] = useState("");
  const [subEnd, setSubEnd] = useState("");

  const [expandedSubtask, setExpandedSubtask] = useState<Id<"subtasks"> | null>(null);
  const [addWoSubtask, setAddWoSubtask] = useState<Id<"subtasks"> | null>(null);
  const [woTitle, setWoTitle] = useState("");
  const [deleteSubConfirm, setDeleteSubConfirm] = useState<Id<"subtasks"> | null>(null);
  const deleteSubName = subtasks?.find((s) => s._id === deleteSubConfirm)?.title ?? "";

  // Inline edit subtask
  const [editSubId, setEditSubId] = useState<Id<"subtasks"> | null>(null);
  const [editSubTitle, setEditSubTitle] = useState("");
  const [editSubDesc, setEditSubDesc] = useState("");
  const [editSubStart, setEditSubStart] = useState("");
  const [editSubEnd, setEditSubEnd] = useState("");
  const [editSubAssignee, setEditSubAssignee] = useState("");

  const openEditTask = () => {
    if (!task) return;
    setEditTitle(task.title);
    setEditDesc(task.description ?? "");
    setEditStatus(task.status);
    setEditPriority(task.priority);
    setEditStart(task.startDate ? new Date(task.startDate).toISOString().split("T")[0] : "");
    setEditEnd(task.endDate ? new Date(task.endDate).toISOString().split("T")[0] : "");
    setEditAssignee(task.assigneeId ?? "");
    setEditOpen(true);
  };

  const saveEdit = async () => {
    await updateTask({
      id: taskId, title: editTitle, description: editDesc || undefined,
      status: editStatus, priority: editPriority,
      startDate: editStart ? new Date(editStart).getTime() : undefined,
      endDate: editEnd ? new Date(editEnd).getTime() : undefined,
      assigneeId: editAssignee ? (editAssignee as Id<"users">) : undefined,
    });
    toast("Task updated");
    setEditOpen(false);
  };

  const handleAddSubtask = async () => {
    if (!subTitle.trim()) return;
    await createSubtask({
      taskId, title: subTitle, description: subDesc || undefined,
      assigneeId: subAssignee ? (subAssignee as Id<"users">) : undefined,
      startDate: subStart ? new Date(subStart).getTime() : undefined,
      endDate: subEnd ? new Date(subEnd).getTime() : undefined,
    });
    toast(`Subtask "${subTitle}" added`);
    setSubTitle(""); setSubDesc(""); setSubAssignee(""); setSubStart(""); setSubEnd(""); setAddSubOpen(false);
  };

  const handleAddWorkOrder = async () => {
    if (!woTitle.trim() || !addWoSubtask) return;
    await createWorkOrder({ subtaskId: addWoSubtask, title: woTitle });
    toast(`Work order "${woTitle}" added`);
    setWoTitle(""); setAddWoSubtask(null);
  };

  const openEditSubtask = (st: any) => {
    setEditSubId(st._id);
    setEditSubTitle(st.title);
    setEditSubDesc(st.description ?? "");
    setEditSubStart(st.startDate ? new Date(st.startDate).toISOString().split("T")[0] : "");
    setEditSubEnd(st.endDate ? new Date(st.endDate).toISOString().split("T")[0] : "");
    setEditSubAssignee(st.assigneeId ?? "");
  };

  const saveSubEdit = async () => {
    if (!editSubId) return;
    await updateSubtask({
      id: editSubId, title: editSubTitle, description: editSubDesc || undefined,
      startDate: editSubStart ? new Date(editSubStart).getTime() : undefined,
      endDate: editSubEnd ? new Date(editSubEnd).getTime() : undefined,
      assigneeId: editSubAssignee ? (editSubAssignee as Id<"users">) : undefined,
    });
    toast("Subtask updated");
    setEditSubId(null);
  };

  // ─── Drag reorder subtasks ────────────────────────────────
  const handleReorderSubtasks = useCallback((orderedIds: string[]) => {
    reorderSubtasks({
      taskId,
      orderedIds: orderedIds as Id<"subtasks">[],
    });
    toast("Subtasks reordered");
  }, [taskId, reorderSubtasks, toast]);

  // ─── LOADING ──────────────────────────────────────────────
  if (!task) return <TaskDetailSkeleton />;

  const doneSubs = subtasks?.filter((s) => s.status === "done").length ?? 0;
  const totalSubs = subtasks?.length ?? 0;
  const subProgress = totalSubs > 0 ? Math.round((doneSubs / totalSubs) * 100) : 0;

  return (
    <div>
      <ConfirmDialog open={!!deleteSubConfirm} onOpenChange={(open) => !open && setDeleteSubConfirm(null)}
        title="Delete subtask?" message={`Delete "${deleteSubName}" and all its work orders?`}
        onConfirm={() => { if (deleteSubConfirm) { deleteSubtask({ id: deleteSubConfirm }); toast(`"${deleteSubName}" deleted`); } }} />

      {/* ─── Breadcrumbs ───────────────────────────────────── */}
      <Breadcrumbs items={[
        { label: "Projects", href: "/projects" },
        { label: task.projectName ?? "Project", href: `/projects/${projectId}` },
        { label: task.title },
      ]} />

      {/* ─── Task header ───────────────────────────────────── */}
      <div className="mb-6 rounded-lg border bg-card p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => {
              const next = task.status === "todo" ? "in_progress" : task.status === "in_progress" ? "done" : "todo";
              updateTask({ id: taskId, status: next as any });
            }} className="text-2xl transition-transform hover:scale-110" title={statusLabels[task.status]}>
              {statusIcons[task.status]}
            </button>
            <div>
              <h1 className="text-xl font-bold sm:text-2xl">{task.title}</h1>
              {task.description && <p className="text-sm text-muted-foreground">{task.description}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <StatusSelect value={task.status} onChange={(s) => updateTask({ id: taskId, status: s })} />
            <Badge variant="secondary" title="Priority">{task.priority}</Badge>
            <Button variant="outline" size="sm" onClick={openEditTask} title="Edit task details">✏️ Edit</Button>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
          {task.assigneeName && <span title="Assigned to">👤 {task.assigneeName}</span>}
          {task.startDate && <span title="Start date">📅 {fmtDate(task.startDate)}</span>}
          {task.startDate && task.endDate && <span>→</span>}
          {task.endDate && <span className={task.endDate < Date.now() && task.status !== "done" ? "font-medium text-red-500" : ""} title={task.endDate < Date.now() && task.status !== "done" ? "Overdue!" : "End date"}>{!task.startDate && "📅 "}{fmtDate(task.endDate)}</span>}
          {!task.startDate && !task.endDate && <span className="italic text-yellow-500" title="Drag to Calendar to schedule">⚠️ No dates — appears in Calendar unscheduled</span>}
          {totalSubs > 0 && (
            <div className="flex items-center gap-2" title={`${doneSubs} of ${totalSubs} subtasks complete`}>
              <div className="h-1.5 w-20 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-green-500 transition-all" style={{ width: `${subProgress}%` }} />
              </div>
              <span>{doneSubs}/{totalSubs} subtasks</span>
            </div>
          )}
        </div>

        {/* Task-level comments & files */}
        <div className="mt-4 grid gap-4 border-t pt-4 sm:grid-cols-2">
          <CommentsSection taskId={taskId} />
          <FileAttachments taskId={taskId} />
        </div>
      </div>

      {/* ─── Subtasks section ──────────────────────────────── */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold">Subtasks</h2>
          {subtasks && subtasks.length > 1 && (
            <span className="text-xs text-muted-foreground" title="Drag the grip handle to reorder">
              ⠿ drag to reorder
            </span>
          )}
        </div>
        <Dialog open={addSubOpen} onOpenChange={setAddSubOpen}>
          <DialogTrigger asChild>
            <Button size="sm" title="Add a new subtask">+ Add Subtask</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Subtask</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-4">
              <Input placeholder="Subtask name (e.g. Plumbing)" value={subTitle} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSubTitle(e.target.value)} autoFocus />
              <Input placeholder="Description (optional)" value={subDesc} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSubDesc(e.target.value)} />
              <select className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm" value={subAssignee} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSubAssignee(e.target.value)} title="Assignee">
                <option value="">Unassigned</option>
                {(teammates ?? []).map((t) => <option key={t._id} value={t._id}>{t.name}</option>)}
              </select>
              <div className="grid grid-cols-2 gap-2">
                <div><label className="mb-1 block text-xs text-muted-foreground">Start date</label><Input type="date" value={subStart} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSubStart(e.target.value)} /></div>
                <div><label className="mb-1 block text-xs text-muted-foreground">End date</label><Input type="date" value={subEnd} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSubEnd(e.target.value)} /></div>
              </div>
              <Button onClick={handleAddSubtask} className="w-full">Create Subtask</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {!subtasks ? (
        <TaskDetailSkeleton />
      ) : subtasks.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground"><p className="mb-1 text-2xl">📋</p>No subtasks yet — add one to break down this task.</CardContent></Card>
      ) : (
        <DragList
          items={subtasks}
          onReorder={handleReorderSubtasks}
          renderItem={(st, dragHandleProps) => {
            const isExpanded = expandedSubtask === st._id;
            const overdue = st.status !== "done" && st.endDate && st.endDate < Date.now();
            const isEditing = editSubId === st._id;

            return (
              <div>
                <Card className={`transition-all ${isExpanded ? "ring-2 ring-primary/30" : "hover:shadow-md"}`}>
                  <CardContent className="py-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        {/* Drag handle */}
                        <DragHandle {...dragHandleProps} />

                        <button onClick={() => setExpandedSubtask(isExpanded ? null : st._id)} className="text-lg transition-transform hover:scale-110" title={statusLabels[st.status]}>
                          {statusIcons[st.status]}
                        </button>
                        <div className="min-w-0 cursor-pointer flex-1" onClick={() => setExpandedSubtask(isExpanded ? null : st._id)} title={isExpanded ? "Collapse" : "Expand to see details"}>
                          <p className={`font-medium ${st.status === "done" ? "text-muted-foreground line-through" : ""}`}>{st.title}</p>
                          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            {st.startDate && <span title="Start date">{fmtDate(st.startDate)}</span>}
                            {st.startDate && st.endDate && <span>→</span>}
                            {st.endDate && <span className={overdue ? "text-red-500" : ""} title={overdue ? "Overdue!" : "End date"}>{fmtDate(st.endDate)}</span>}
                            {st.assigneeName && <span title="Assigned to">👤 {st.assigneeName}</span>}
                            {st.workOrderCount > 0 && <span title={`${st.workOrderDone} of ${st.workOrderCount} work orders done`}>📝 {st.workOrderDone}/{st.workOrderCount}</span>}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <StatusSelect value={st.status} onChange={(s) => { updateSubtask({ id: st._id, status: s }); if (s === "done") toast("Subtask completed!"); }} compact />
                        <Button variant="ghost" size="sm" onClick={(e: React.MouseEvent) => { e.stopPropagation(); openEditSubtask(st); }} title="Edit subtask">✏️</Button>
                        <Button variant="ghost" size="sm" onClick={() => setDeleteSubConfirm(st._id)} title="Delete subtask">🗑️</Button>
                        <button onClick={() => setExpandedSubtask(isExpanded ? null : st._id)} className="text-muted-foreground transition-transform p-1" title={isExpanded ? "Collapse" : "Expand"}>
                          {isExpanded ? "▼" : "▶"}
                        </button>
                      </div>
                    </div>

                    {/* Inline edit subtask */}
                    {isEditing && (
                      <div className="mt-3 space-y-2 border-t pt-3">
                        <Input placeholder="Subtask name" value={editSubTitle} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditSubTitle(e.target.value)} />
                        <Input placeholder="Description" value={editSubDesc} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditSubDesc(e.target.value)} />
                        <div className="grid grid-cols-2 gap-2">
                          <div><label className="mb-1 block text-xs text-muted-foreground">Start</label><Input type="date" value={editSubStart} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditSubStart(e.target.value)} /></div>
                          <div><label className="mb-1 block text-xs text-muted-foreground">End</label><Input type="date" value={editSubEnd} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditSubEnd(e.target.value)} /></div>
                        </div>
                        <select className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm" value={editSubAssignee} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setEditSubAssignee(e.target.value)} title="Assignee">
                          <option value="">Unassigned</option>
                          {(teammates ?? []).map((t) => <option key={t._id} value={t._id}>{t.name}</option>)}
                        </select>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={saveSubEdit}>Save</Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditSubId(null)}>Cancel</Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {isExpanded && (
                  <div className="mb-2 ml-4 mt-1 space-y-3 border-l-2 border-muted pl-4 sm:ml-8">
                    {/* Subtask comments & files */}
                    <div className="grid gap-3 rounded-md border bg-card/50 p-3 sm:grid-cols-2">
                      <CommentsSection subtaskId={st._id} compact />
                      <FileAttachments subtaskId={st._id} compact />
                    </div>
                    {/* Work orders */}
                    <WorkOrderSection subtaskId={st._id} subtaskTitle={st.title} onAddWorkOrder={() => { setAddWoSubtask(st._id); setWoTitle(""); }} />
                  </div>
                )}
              </div>
            );
          }}
        />
      )}

      {/* Add work order dialog */}
      <Dialog open={!!addWoSubtask} onOpenChange={(open) => !open && setAddWoSubtask(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Work Order</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-4">
            <Input placeholder="Work order name (e.g. grease trap area)" value={woTitle} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setWoTitle(e.target.value)} autoFocus
              onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => { if (e.key === "Enter") handleAddWorkOrder(); }} />
            <Button onClick={handleAddWorkOrder} className="w-full">Create Work Order</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit task dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Task</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-4">
            <Input placeholder="Task title" value={editTitle} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditTitle(e.target.value)} />
            <Input placeholder="Description (optional)" value={editDesc} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditDesc(e.target.value)} />
            <div className="grid grid-cols-2 gap-2">
              <select className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm" value={editStatus} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setEditStatus(e.target.value as any)} title="Status">
                <option value="todo">To Do</option><option value="in_progress">In Progress</option><option value="done">Done</option>
              </select>
              <select className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm" value={editPriority} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setEditPriority(e.target.value as any)} title="Priority">
                <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
              </select>
            </div>
            <select className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm" value={editAssignee} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setEditAssignee(e.target.value)} title="Assignee">
              <option value="">Unassigned</option>
              {(teammates ?? []).map((t) => <option key={t._id} value={t._id}>{t.name}</option>)}
            </select>
            <div className="grid grid-cols-2 gap-2">
              <div><label className="mb-1 block text-xs text-muted-foreground">Start date</label><Input type="date" value={editStart} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditStart(e.target.value)} /></div>
              <div><label className="mb-1 block text-xs text-muted-foreground">End date</label><Input type="date" value={editEnd} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditEnd(e.target.value)} /></div>
            </div>
            <Button onClick={saveEdit} className="w-full">Save Changes</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ─── Work Order Section with drag reorder ─────────────────────────────── */

function WorkOrderSection({ subtaskId, subtaskTitle, onAddWorkOrder }: {
  subtaskId: Id<"subtasks">; subtaskTitle: string; onAddWorkOrder: () => void;
}) {
  const { toast } = useToast();
  const workOrders = useQuery(api.workOrders.listBySubtask, { subtaskId });
  const updateWorkOrder = useMutation(api.workOrders.update);
  const deleteWorkOrder = useMutation(api.workOrders.remove);
  const reorderWorkOrders = useMutation(api.workOrders.reorder);
  const [expandedWo, setExpandedWo] = useState<Id<"workOrders"> | null>(null);

  const handleReorder = useCallback((orderedIds: string[]) => {
    reorderWorkOrders({
      subtaskId,
      orderedIds: orderedIds as Id<"workOrders">[],
    });
    toast("Work orders reordered");
  }, [subtaskId, reorderWorkOrders, toast]);

  return (
    <div>
      <div className="flex items-center justify-between py-1">
        <div className="flex items-center gap-2">
          <p className="text-xs font-medium text-muted-foreground">Work Orders under &quot;{subtaskTitle}&quot;</p>
          {workOrders && workOrders.length > 1 && (
            <span className="text-[10px] text-muted-foreground/60">⠿ drag to reorder</span>
          )}
        </div>
        <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={onAddWorkOrder} title="Add a new work order">+ Add</Button>
      </div>
      {!workOrders ? <div className="h-8 animate-pulse rounded bg-muted" />
        : workOrders.length === 0 ? <p className="py-2 text-center text-xs text-muted-foreground">No work orders yet.</p>
        : (
          <DragList
            items={workOrders}
            onReorder={handleReorder}
            className="space-y-1"
            renderItem={(wo, dragHandleProps) => {
              const isWoExpanded = expandedWo === wo._id;
              return (
                <div>
                  <div className={`flex items-center justify-between rounded-md border bg-card/50 px-2 py-2 ${isWoExpanded ? "ring-1 ring-primary/20" : ""}`}>
                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                      <DragHandle {...dragHandleProps} />
                      <span className="text-sm cursor-pointer" onClick={() => setExpandedWo(isWoExpanded ? null : wo._id)} title={statusLabels[wo.status]}>
                        {statusIcons[wo.status]}
                      </span>
                      <span className={`text-sm truncate cursor-pointer ${wo.status === "done" ? "text-muted-foreground line-through" : ""}`} onClick={() => setExpandedWo(isWoExpanded ? null : wo._id)} title={isWoExpanded ? "Collapse" : "Expand"}>
                        {wo.title}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <StatusSelect value={wo.status} onChange={(s) => { updateWorkOrder({ id: wo._id, status: s }); if (s === "done") toast("Work order completed!"); }} compact />
                      {wo.assigneeName && <span className="text-[10px] text-muted-foreground" title="Assigned to">👤 {wo.assigneeName}</span>}
                      <Button variant="ghost" size="sm" className="h-5 w-5 p-0 text-xs" onClick={() => { deleteWorkOrder({ id: wo._id }); toast("Deleted"); }} title="Delete work order">×</Button>
                      <button onClick={() => setExpandedWo(isWoExpanded ? null : wo._id)} className="text-[10px] text-muted-foreground p-1" title={isWoExpanded ? "Collapse" : "Expand"}>
                        {isWoExpanded ? "▼" : "▶"}
                      </button>
                    </div>
                  </div>
                  {isWoExpanded && (
                    <div className="ml-4 mt-1 mb-2 grid gap-2 rounded border bg-card/30 p-2 sm:grid-cols-2">
                      <CommentsSection workOrderId={wo._id} compact />
                      <FileAttachments workOrderId={wo._id} compact />
                    </div>
                  )}
                </div>
              );
            }}
          />
        )}
    </div>
  );
}
