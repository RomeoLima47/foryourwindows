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
import { ConfirmDialog } from "@/components/confirm-dialog";
import { CommentsSection } from "@/components/comments-section";
import { FileAttachments } from "@/components/file-attachments";
import { ActivityTimeline } from "@/components/activity-timeline";
import { useToast } from "@/components/toast";
import type { Id } from "../../../../convex/_generated/dataModel";

function fmtDate(ts?: number) {
  if (!ts) return "";
  return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

type ExpandTab = "details" | "activity";

export default function ProjectsPage() {
  const { toast, toastUndo } = useToast();
  const router = useRouter();
  const projects = useQuery(api.projects.list);
  const createProject = useMutation(api.projects.create);
  const updateProject = useMutation(api.projects.update);
  const deleteProject = useMutation(api.projects.remove);
  const saveAsTemplate = useMutation(api.templates.saveFromProject);

  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [filter, setFilter] = useState<"all" | "active" | "archived">("active");
  const [deleteConfirm, setDeleteConfirm] = useState<Id<"projects"> | null>(null);
  const deleteProjectName = projects?.find((p) => p._id === deleteConfirm)?.name ?? "";

  // Expand & inline edit
  const [expandedProject, setExpandedProject] = useState<Id<"projects"> | null>(null);
  const [expandTab, setExpandTab] = useState<ExpandTab>("details");
  const [editId, setEditId] = useState<Id<"projects"> | null>(null);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editStart, setEditStart] = useState("");
  const [editEnd, setEditEnd] = useState("");
  const [editStatus, setEditStatus] = useState<"active" | "archived">("active");

  // Save as template dialog
  const [templateOpen, setTemplateOpen] = useState(false);
  const [templateProjectId, setTemplateProjectId] = useState<Id<"projects"> | null>(null);
  const [templateName, setTemplateName] = useState("");
  const [templateDesc, setTemplateDesc] = useState("");

  const handleCreate = async () => {
    if (!name.trim()) return;
    await createProject({
      name, description: description || undefined,
      startDate: startDate ? new Date(startDate).getTime() : undefined,
      endDate: endDate ? new Date(endDate).getTime() : undefined,
    });
    toast(`Project "${name}" created`);
    setName(""); setDescription(""); setStartDate(""); setEndDate(""); setCreateOpen(false);
  };

  const openEdit = (project: any) => {
    setEditId(project._id);
    setEditName(project.name);
    setEditDesc(project.description ?? "");
    setEditStart(project.startDate ? new Date(project.startDate).toISOString().split("T")[0] : "");
    setEditEnd(project.endDate ? new Date(project.endDate).toISOString().split("T")[0] : "");
    setEditStatus(project.status);
    setExpandedProject(project._id);
    setExpandTab("details");
  };

  const handleEdit = async () => {
    if (!editId || !editName.trim()) return;
    const result = await updateProject({
      id: editId, name: editName, description: editDesc || undefined, status: editStatus,
      startDate: editStart ? new Date(editStart).getTime() : undefined,
      endDate: editEnd ? new Date(editEnd).getTime() : undefined,
    });

    // Undo support
    const prev = (result as any)?.previous;
    if (prev) {
      toastUndo("Project updated", async () => {
        await updateProject({
          id: editId!, name: prev.name, description: prev.description,
          status: prev.status, startDate: prev.startDate, endDate: prev.endDate,
        });
      });
    } else {
      toast("Project updated");
    }
    setEditId(null);
  };

  const handleDelete = async (id: Id<"projects">) => {
    const name = projects?.find((p) => p._id === id)?.name;
    await deleteProject({ id });
    toast(`"${name}" deleted`);
  };

  const openSaveTemplate = (project: any) => {
    setTemplateProjectId(project._id);
    setTemplateName(`${project.name} Template`);
    setTemplateDesc(project.description ?? "");
    setTemplateOpen(true);
  };

  const handleSaveTemplate = async () => {
    if (!templateProjectId || !templateName.trim()) return;
    await saveAsTemplate({
      projectId: templateProjectId,
      name: templateName,
      description: templateDesc || undefined,
    });
    toast(`Template "${templateName}" saved`);
    setTemplateOpen(false);
  };

  if (!projects) {
    return (
      <div>
        <div className="mb-6 h-9 w-48 animate-pulse rounded bg-muted" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-40 animate-pulse rounded-lg bg-muted" />)}
        </div>
      </div>
    );
  }

  const filtered = projects.filter((p) => filter === "all" || p.status === filter);

  return (
    <div>
      <ConfirmDialog
        open={!!deleteConfirm}
        onOpenChange={(open) => !open && setDeleteConfirm(null)}
        title="Delete project?"
        message={`Delete "${deleteProjectName}" and ALL its tasks, subtasks, work orders, notes, and files? This cannot be undone.`}
        onConfirm={() => { if (deleteConfirm) handleDelete(deleteConfirm); }}
      />

      {/* Save as Template dialog */}
      <Dialog open={templateOpen} onOpenChange={setTemplateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Save as Template</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-4">
            <p className="text-sm text-muted-foreground">
              This saves the full task/subtask/work order structure as a reusable template. Dates, assignees, and status are not included.
            </p>
            <Input placeholder="Template name" value={templateName} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTemplateName(e.target.value)} autoFocus />
            <Input placeholder="Description (optional)" value={templateDesc} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTemplateDesc(e.target.value)} />
            <Button onClick={handleSaveTemplate} className="w-full" disabled={!templateName.trim()}>
              Save Template
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="mb-4 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">Projects</h1>
          <p className="text-sm text-muted-foreground">
            {projects.filter((p) => p.status === "active").length} active · {projects.filter((p) => p.status === "archived").length} archived
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select className="flex h-10 rounded-md border bg-background px-3 py-2 text-sm" value={filter} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFilter(e.target.value as any)} title="Filter by status">
            <option value="all">All</option><option value="active">Active</option><option value="archived">Archived</option>
          </select>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button className="w-full sm:w-auto" title="Create a new project">+ New Project</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Create Project</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-4">
                <Input placeholder="Project name (e.g. HMart Orlando)" value={name} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)} autoFocus />
                <Input placeholder="Description (optional)" value={description} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDescription(e.target.value)} />
                <div className="grid grid-cols-2 gap-2">
                  <div><label className="mb-1 block text-xs text-muted-foreground">Start date</label><Input type="date" value={startDate} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setStartDate(e.target.value)} /></div>
                  <div><label className="mb-1 block text-xs text-muted-foreground">End date</label><Input type="date" value={endDate} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEndDate(e.target.value)} /></div>
                </div>
                <Button onClick={handleCreate} className="w-full">Create Project</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="mb-1 text-2xl">📂</p>
            <p className="mb-2 text-muted-foreground">No projects found.</p>
            <Button onClick={() => setCreateOpen(true)}>Create your first project</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((project) => {
            const noSchedule = !project.startDate && !project.endDate;
            const overdue = project.status === "active" && project.endDate && project.endDate < Date.now();
            const isExpanded = expandedProject === project._id;
            const isEditing = editId === project._id;

            return (
              <Card
                key={project._id}
                className={`transition-all ${isExpanded ? "ring-2 ring-primary/30 sm:col-span-2 lg:col-span-3" : "hover:bg-muted/50 hover:shadow-lg"}`}
              >
                <CardContent className="pt-4">
                  <div className="mb-2 flex items-start justify-between">
                    <h3 className="cursor-pointer font-semibold hover:text-primary" onClick={() => router.push(`/projects/${project._id}`)} title="Open project">{project.name}</h3>
                    <div className="flex items-center gap-1">
                      <Badge variant="secondary" className={project.status === "active" ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" : ""} title="Status">{project.status}</Badge>
                      {project.isOwner && (
                        <>
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={(e: React.MouseEvent) => { e.stopPropagation(); openSaveTemplate(project); }} title="Save as template">📐</Button>
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={(e: React.MouseEvent) => { e.stopPropagation(); openEdit(project); }} title="Edit project">✏️</Button>
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={(e: React.MouseEvent) => { e.stopPropagation(); setDeleteConfirm(project._id); }} title="Delete project">🗑️</Button>
                        </>
                      )}
                      <button onClick={() => { setExpandedProject(isExpanded ? null : project._id); setExpandTab("details"); }} className="p-1 text-xs text-muted-foreground" title={isExpanded ? "Collapse" : "Expand"}>
                        {isExpanded ? "▼" : "▶"}
                      </button>
                    </div>
                  </div>

                  {project.description && <p className="mb-3 text-sm text-muted-foreground line-clamp-2">{project.description}</p>}

                  <div className="space-y-1 text-xs text-muted-foreground">
                    {project.startDate && (
                      <div className="flex items-center gap-1">
                        <span title="Start date">📅 {fmtDate(project.startDate)}</span>
                        {project.endDate && <span>→ <span className={overdue ? "font-medium text-red-500" : ""} title={overdue ? "Overdue!" : "End date"}>{fmtDate(project.endDate)}</span></span>}
                      </div>
                    )}
                    {!project.startDate && project.endDate && (
                      <span className={overdue ? "font-medium text-red-500" : ""} title={overdue ? "Overdue!" : "End date"}>📅 Due {fmtDate(project.endDate)}</span>
                    )}
                    {noSchedule && <span className="italic text-yellow-500" title="No dates assigned">⚠️ No dates — appears in Calendar</span>}
                    <p title="Owner">👤 {project.ownerName}</p>
                  </div>

                  <div className="mt-3 flex gap-2">
                    <Button variant="outline" size="sm" className="text-xs" onClick={() => router.push(`/projects/${project._id}`)} title="View project details & tasks">Open Project →</Button>
                  </div>

                  {/* Expanded panel */}
                  {isExpanded && (
                    <div className="mt-4 border-t pt-3">
                      {/* Tab switcher */}
                      <div className="mb-3 flex gap-1 rounded-md bg-muted/50 p-0.5">
                        <button
                          onClick={() => setExpandTab("details")}
                          className={`flex-1 rounded px-3 py-1.5 text-xs font-medium transition-colors ${expandTab === "details" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                          title="Comments, files, and edit form"
                        >
                          💬 Details
                        </button>
                        <button
                          onClick={() => setExpandTab("activity")}
                          className={`flex-1 rounded px-3 py-1.5 text-xs font-medium transition-colors ${expandTab === "activity" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                          title="Activity history"
                        >
                          📜 Activity
                        </button>
                      </div>

                      {expandTab === "details" && (
                        <div className="space-y-3">
                          {isEditing && (
                            <div className="space-y-2 rounded-md border bg-muted/30 p-3">
                              <Input placeholder="Project name" value={editName} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditName(e.target.value)} />
                              <Input placeholder="Description" value={editDesc} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditDesc(e.target.value)} />
                              <select className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm" value={editStatus} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setEditStatus(e.target.value as any)} title="Status">
                                <option value="active">Active</option><option value="archived">Archived</option>
                              </select>
                              <div className="grid grid-cols-2 gap-2">
                                <div><label className="mb-1 block text-xs text-muted-foreground">Start</label><Input type="date" value={editStart} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditStart(e.target.value)} /></div>
                                <div><label className="mb-1 block text-xs text-muted-foreground">End</label><Input type="date" value={editEnd} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditEnd(e.target.value)} /></div>
                              </div>
                              <div className="flex gap-2">
                                <Button size="sm" onClick={handleEdit}>Save</Button>
                                <Button size="sm" variant="ghost" onClick={() => setEditId(null)}>Cancel</Button>
                              </div>
                            </div>
                          )}
                          <div className="grid gap-3 sm:grid-cols-2">
                            <CommentsSection projectId={project._id} compact />
                            <FileAttachments projectId={project._id} compact />
                          </div>
                        </div>
                      )}

                      {expandTab === "activity" && (
                        <ActivityTimeline projectId={project._id} compact limit={15} />
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
