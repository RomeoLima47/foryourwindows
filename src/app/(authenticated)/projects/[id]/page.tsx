"use client";

import React, { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileAttachments } from "@/components/file-attachments";
import { CommentsSection } from "@/components/comments-section";
import { StatusSelect } from "@/components/status-select";
import { RecentContacts } from "@/components/recent-contacts";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { ActivityTimeline } from "@/components/activity-timeline";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { ProjectDetailSkeleton } from "@/components/skeletons";
import { useToast } from "@/components/toast";
import type { Id } from "../../../../../convex/_generated/dataModel";

const statusColors: Record<string, string> = {
  todo: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  in_progress: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  done: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
};
const statusIcons: Record<string, string> = { todo: "⬜", in_progress: "🔄", done: "✅" };
const statusLabels: Record<string, string> = { todo: "To Do — click to start", in_progress: "In Progress — click to complete", done: "Done — click to reopen" };

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function ProjectDetailPage() {
  const { toast, toastUndo } = useToast();
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as Id<"projects">;

  const projects = useQuery(api.projects.list);
  const tasks = useQuery(api.tasks.listByProject, { projectId });
  const teammates = useQuery(api.team.listTeammates);
  const notes = useQuery(api.notes.listByProject, { projectId });
  const members = useQuery(api.projectMembers.listForProject, { projectId });
  const invitations = useQuery(api.invitations.listForProject, { projectId });

  const createTask = useMutation(api.tasks.create);
  const updateTask = useMutation(api.tasks.update);
  const deleteTask = useMutation(api.tasks.remove);
  const createNote = useMutation(api.notes.create);
  const deleteNote = useMutation(api.notes.remove);
  const sendInvite = useMutation(api.invitations.send);
  const revokeInvite = useMutation(api.invitations.revoke);
  const removeMember = useMutation(api.projectMembers.removeMember);
  const saveAsTemplate = useMutation(api.templates.saveFromProject);

  const [taskOpen, setTaskOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [assigneeId, setAssigneeId] = useState("");

  const [noteContent, setNoteContent] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"editor" | "viewer">("editor");
  const [inviteError, setInviteError] = useState("");
  const [deleteTaskConfirm, setDeleteTaskConfirm] = useState<Id<"tasks"> | null>(null);

  // Expand/edit state
  const [expandedTask, setExpandedTask] = useState<Id<"tasks"> | null>(null);
  const [editTaskId, setEditTaskId] = useState<Id<"tasks"> | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editPriority, setEditPriority] = useState<"low" | "medium" | "high">("medium");
  const [editStart, setEditStart] = useState("");
  const [editEnd, setEditEnd] = useState("");
  const [editAssignee, setEditAssignee] = useState("");

  // Save as template dialog
  const [templateOpen, setTemplateOpen] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [templateDesc, setTemplateDesc] = useState("");

  const project = projects?.find((p) => p._id === projectId);
  const deleteTaskName = tasks?.find((t) => t._id === deleteTaskConfirm)?.title ?? "";

  const handleCreateTask = async () => {
    if (!title.trim()) return;
    await createTask({
      title, description: description || undefined, status: "todo", priority, projectId,
      startDate: startDate ? new Date(startDate).getTime() : undefined,
      endDate: endDate ? new Date(endDate).getTime() : undefined,
      assigneeId: assigneeId ? (assigneeId as Id<"users">) : undefined,
    });
    toast(`Task "${title}" created`);
    setTitle(""); setDescription(""); setPriority("medium");
    setStartDate(""); setEndDate(""); setAssigneeId(""); setTaskOpen(false);
  };

  const handleStatusChange = async (taskId: Id<"tasks">, newStatus: "todo" | "in_progress" | "done") => {
    const task = tasks?.find((t) => t._id === taskId);
    const oldStatus = task?.status;
    const result = await updateTask({ id: taskId, status: newStatus });
    if (newStatus === "done") {
      toastUndo("Task completed! 🎉", async () => {
        await updateTask({ id: taskId, status: oldStatus as any });
      });
    } else {
      const prev = (result as any)?.previous;
      if (prev) {
        toastUndo("Status updated", async () => {
          await updateTask({ id: taskId, status: prev.status });
        });
      } else {
        toast("Status updated");
      }
    }
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    setInviteError("");
    try {
      await sendInvite({ email: inviteEmail, projectId, role: inviteRole });
      toast(`Invitation sent to ${inviteEmail}`);
      setInviteEmail("");
    } catch (err: any) {
      setInviteError(err.message || "Failed to send invitation");
    }
  };

  const openInlineEdit = (task: any) => {
    setEditTaskId(task._id);
    setEditTitle(task.title);
    setEditDesc(task.description ?? "");
    setEditPriority(task.priority);
    setEditStart(task.startDate ? new Date(task.startDate).toISOString().split("T")[0] : "");
    setEditEnd(task.endDate ? new Date(task.endDate).toISOString().split("T")[0] : "");
    setEditAssignee(task.assigneeId ?? "");
    setExpandedTask(task._id);
  };

  const saveInlineEdit = async () => {
    if (!editTaskId) return;
    const result = await updateTask({
      id: editTaskId, title: editTitle, description: editDesc || undefined,
      priority: editPriority,
      startDate: editStart ? new Date(editStart).getTime() : undefined,
      endDate: editEnd ? new Date(editEnd).getTime() : undefined,
      assigneeId: editAssignee ? (editAssignee as Id<"users">) : undefined,
    });
    const prev = (result as any)?.previous;
    if (prev) {
      toastUndo("Task updated", async () => {
        await updateTask({
          id: editTaskId!, title: prev.title, description: prev.description,
          priority: prev.priority, startDate: prev.startDate, endDate: prev.endDate,
          assigneeId: prev.assigneeId,
        });
      });
    } else {
      toast("Task updated");
    }
    setEditTaskId(null);
  };

  const handleSaveTemplate = async () => {
    if (!templateName.trim()) return;
    await saveAsTemplate({
      projectId,
      name: templateName,
      description: templateDesc || undefined,
    });
    toast(`Template "${templateName}" saved`);
    setTemplateOpen(false);
  };

  if (!project) {
    return <ProjectDetailSkeleton />;
  }

  const doneTasks = tasks?.filter((t) => t.status === "done").length ?? 0;
  const totalTasks = tasks?.length ?? 0;
  const progress = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;
  const isOwner = project.isOwner;
  const pendingInvites = invitations?.filter((i) => i.status === "pending") ?? [];

  return (
    <div>
      <ConfirmDialog
        open={!!deleteTaskConfirm}
        onOpenChange={(open) => !open && setDeleteTaskConfirm(null)}
        title="Delete task?"
        message={`Delete "${deleteTaskName}" and all its subtasks and work orders? This cannot be undone.`}
        onConfirm={() => { if (deleteTaskConfirm) { deleteTask({ id: deleteTaskConfirm }); toast(`"${deleteTaskName}" deleted`); } }}
      />

      {/* Save as Template dialog */}
      <Dialog open={templateOpen} onOpenChange={setTemplateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Save as Template</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-4">
            <p className="text-sm text-muted-foreground">
              Saves the full task/subtask/work order structure of &ldquo;{project.name}&rdquo; as a reusable template.
            </p>
            <Input placeholder="Template name" value={templateName} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTemplateName(e.target.value)} autoFocus />
            <Input placeholder="Description (optional)" value={templateDesc} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTemplateDesc(e.target.value)} />
            <Button onClick={handleSaveTemplate} className="w-full" disabled={!templateName.trim()}>Save Template</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Header */}
      <div className="mb-6">
      {/* Breadcrumbs */}
      <Breadcrumbs items={[
        { label: "Projects", href: "/projects" },
        { label: project.name },
      ]} />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold sm:text-3xl">{project.name}</h1>
            {project.description && <p className="mt-1 text-muted-foreground">{project.description}</p>}
            <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <span title="Task progress">{doneTasks}/{totalTasks} tasks</span>
              <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted" title={`${progress}% complete`}>
                <div className="h-full rounded-full bg-green-500 transition-all" style={{ width: `${progress}%` }} />
              </div>
              <span className="font-medium text-green-500">{progress}%</span>
              {project.startDate && <span title="Start date">📅 {formatDate(project.startDate)}</span>}
              {project.endDate && <span title="End date">→ {formatDate(project.endDate)}</span>}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" className="text-xs" onClick={() => router.push(`/projects/${projectId}/reports`)} title="View and create daily field reports">
              📋 Daily Reports
            </Button>
            {isOwner && (
              <Button variant="outline" className="text-xs" onClick={() => { setTemplateName(`${project.name} Template`); setTemplateDesc(project.description ?? ""); setTemplateOpen(true); }} title="Save project structure as a reusable template">
                📐 Save as Template
              </Button>
            )}
            <Dialog open={taskOpen} onOpenChange={setTaskOpen}>
              <DialogTrigger asChild>
                <Button className="w-full sm:w-auto" title="Add a task to this project">+ Add Task</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Add Task to {project.name}</DialogTitle></DialogHeader>
                <div className="space-y-4 pt-4">
                  <Input placeholder="Task title (e.g. Phase I)" value={title} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)} autoFocus />
                  <Input placeholder="Description (optional)" value={description} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDescription(e.target.value)} />
                  <select className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm" value={priority} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setPriority(e.target.value as any)} title="Priority">
                    <option value="low">Low Priority</option><option value="medium">Medium Priority</option><option value="high">High Priority</option>
                  </select>
                  <select className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm" value={assigneeId} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setAssigneeId(e.target.value)} title="Assignee">
                    <option value="">Unassigned</option>
                    {(teammates ?? []).map((t) => <option key={t._id} value={t._id}>{t.name}</option>)}
                  </select>
                  <div className="grid grid-cols-2 gap-2">
                    <div><label className="mb-1 block text-xs text-muted-foreground">Start date</label><Input type="date" value={startDate} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setStartDate(e.target.value)} /></div>
                    <div><label className="mb-1 block text-xs text-muted-foreground">End date</label><Input type="date" value={endDate} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEndDate(e.target.value)} /></div>
                  </div>
                  <Button onClick={handleCreateTask} className="w-full">Create Task</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Tasks list */}
        <div className="lg:col-span-2">
          <h2 className="mb-3 text-lg font-semibold">Tasks</h2>
          {!tasks ? (
            <div className="space-y-2">{[1, 2, 3].map((i) => <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />)}</div>
          ) : tasks.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <p className="mb-1 text-2xl">✨</p>
                No tasks yet — add one to get started!
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {tasks.map((task) => {
                const overdue = task.status !== "done" && task.endDate && task.endDate < Date.now();
                const noSchedule = !task.startDate && !task.endDate;
                const isExpanded = expandedTask === task._id;
                const isEditing = editTaskId === task._id;

                return (
                  <Card key={task._id} className={`transition-all ${isExpanded ? "ring-2 ring-primary/30" : "hover:shadow-md"}`}>
                    <CardContent className="py-3 sm:py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
                          onClick={() => setExpandedTask(isExpanded ? null : task._id)}
                          title={isExpanded ? "Collapse" : "Click to expand"}>
                          <button
                            onClick={(e: React.MouseEvent) => { e.stopPropagation(); const next = task.status === "todo" ? "in_progress" : task.status === "in_progress" ? "done" : "todo"; handleStatusChange(task._id, next as any); }}
                            className="text-lg transition-transform hover:scale-110"
                            title={statusLabels[task.status]}
                          >
                            {statusIcons[task.status]}
                          </button>
                          <div className="min-w-0">
                            <p className={`font-medium ${task.status === "done" ? "text-muted-foreground line-through" : ""}`}>
                              {task.title}
                            </p>
                            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                              {task.startDate && <span title="Start date">📅 {formatDate(task.startDate)}</span>}
                              {task.startDate && task.endDate && <span>→</span>}
                              {task.endDate && <span className={overdue ? "font-medium text-red-500" : ""} title={overdue ? "Overdue!" : "End date"}>{!task.startDate && "📅 "}{formatDate(task.endDate)}</span>}
                              {noSchedule && <span className="italic text-yellow-500" title="No dates set">⚠️ No dates set</span>}
                              {task.assigneeName && <span title="Assigned to">👤 {task.assigneeName}</span>}
                              {task.subtaskCount > 0 && <span title={`${task.subtaskDone} of ${task.subtaskCount} subtasks done`}>☑️ {task.subtaskDone}/{task.subtaskCount} subtasks</span>}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <StatusSelect value={task.status} onChange={(s) => handleStatusChange(task._id, s)} compact />
                          <Button variant="ghost" size="sm" onClick={(e: React.MouseEvent) => { e.stopPropagation(); openInlineEdit(task); }} title="Edit task">✏️</Button>
                          <Button variant="ghost" size="sm" onClick={(e: React.MouseEvent) => { e.stopPropagation(); router.push(`/projects/${projectId}/tasks/${task._id}`); }} title="View subtasks & work orders">→</Button>
                          <Button variant="ghost" size="sm" onClick={(e: React.MouseEvent) => { e.stopPropagation(); setDeleteTaskConfirm(task._id); }} title="Delete task">🗑️</Button>
                        </div>
                      </div>

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
        </div>

        {/* Sidebar */}
        <div>
          <Tabs defaultValue="activity">
            <TabsList className="mb-3 w-full">
              <TabsTrigger value="activity" className="flex-1" title="Project notes & activity">Notes</TabsTrigger>
              <TabsTrigger value="log" className="flex-1" title="Audit trail / activity log">📜 Log</TabsTrigger>
              <TabsTrigger value="files" className="flex-1" title="Project files">Files</TabsTrigger>
              <TabsTrigger value="team" className="flex-1" title="Team members & invitations">
                Team {(members?.length ?? 0) > 0 && <span className="ml-1 text-xs">({members?.length})</span>}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="activity">
              <Card>
                <CardContent className="pt-4">
                  <div className="mb-4 flex gap-2">
                    <Input
                      placeholder="Add a note..."
                      value={noteContent}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNoteContent(e.target.value)}
                      onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                        if (e.key === "Enter" && noteContent.trim()) { createNote({ content: noteContent, projectId }); toast("Note posted"); setNoteContent(""); }
                      }}
                      title="Type a note and press Enter"
                    />
                    <Button onClick={() => { if (noteContent.trim()) { createNote({ content: noteContent, projectId }); toast("Note posted"); setNoteContent(""); } }} size="sm" title="Post note">Post</Button>
                  </div>
                  {!notes ? <p className="text-sm text-muted-foreground">Loading...</p>
                    : notes.length === 0 ? <p className="py-4 text-center text-sm text-muted-foreground">No notes yet.</p>
                    : (
                      <div className="space-y-3">
                        {notes.map((note) => (
                          <div key={note._id} className="border-b pb-3 last:border-0">
                            <div className="flex items-start justify-between">
                              <div>
                                <p className="text-sm">{note.content}</p>
                                <p className="mt-1 text-xs text-muted-foreground">{note.authorName} · {new Date(note.createdAt).toLocaleString()}</p>
                              </div>
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => deleteNote({ id: note._id })} title="Delete note">×</Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="log">
              <Card>
                <CardContent className="pt-4">
                  <p className="mb-3 text-xs text-muted-foreground">
                    Full audit trail for this project — every create, update, status change, and deletion.
                  </p>
                  <ActivityTimeline projectId={projectId} limit={30} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="files">
              <Card><CardContent className="pt-4"><FileAttachments projectId={projectId} /></CardContent></Card>
            </TabsContent>

            <TabsContent value="team">
              <Card>
                <CardContent className="pt-4">
                  {isOwner && (
                    <div className="mb-4">
                      <p className="mb-2 text-sm font-medium">Invite a team member</p>
                      <div className="mb-3">
                        <RecentContacts onSelect={(email) => setInviteEmail(email)} excludeEmails={members?.map((m) => m.email) ?? []} />
                      </div>
                      <div className="flex gap-2">
                        <Input placeholder="Email" value={inviteEmail} onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setInviteEmail(e.target.value); setInviteError(""); }}
                          onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => { if (e.key === "Enter") handleInvite(); }} title="Enter email to invite" />
                        <select className="flex h-10 rounded-md border bg-background px-2 py-2 text-sm" value={inviteRole} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setInviteRole(e.target.value as any)} title="Role">
                          <option value="editor">Editor</option><option value="viewer">Viewer</option>
                        </select>
                        <Button onClick={handleInvite} size="sm" title="Send invitation">Invite</Button>
                      </div>
                      {inviteError && <p className="mt-1 text-xs text-red-500">{inviteError}</p>}
                    </div>
                  )}
                  <div className="space-y-3">
                    <p className="text-xs font-medium uppercase text-muted-foreground">Members</p>
                    {members?.map((member) => (
                      <div key={member._id} className="flex items-center justify-between border-b pb-2 last:border-0">
                        <div className="flex items-center gap-2">
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-xs font-medium" title={member.name}>{member.name.charAt(0)}</div>
                          <div>
                            <p className="text-sm font-medium">{member.name}</p>
                            <p className="text-xs text-muted-foreground">{member.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-[10px]" title="Role">{member.role}</Badge>
                          {isOwner && member.role !== "owner" && (
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => { removeMember({ projectId, memberId: member._id }); toast(`Removed ${member.name}`); }} title="Remove member">×</Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  {isOwner && pendingInvites.length > 0 && (
                    <div className="mt-4 space-y-2">
                      <p className="text-xs font-medium uppercase text-muted-foreground">Pending</p>
                      {pendingInvites.map((inv) => (
                        <div key={inv._id} className="flex items-center justify-between border-b pb-2 last:border-0">
                          <p className="text-sm">{inv.email}</p>
                          <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={async () => { await revokeInvite({ id: inv._id }); toast("Revoked"); }} title="Revoke invitation">Revoke</Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
