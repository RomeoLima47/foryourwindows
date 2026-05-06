"use client";

import React, { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "../../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useToast } from "@/components/toast";
import type { Id } from "../../../../convex/_generated/dataModel";

// ─── TYPES ────────────────────────────────────────────────

interface WorkOrderDef {
  title: string;
  description?: string;
  order?: number;
}
interface SubtaskDef {
  title: string;
  description?: string;
  order?: number;
  workOrders?: WorkOrderDef[];
}
interface TaskDef {
  title: string;
  description?: string;
  priority?: string;
  subtasks?: SubtaskDef[];
}

// ─── EDITABLE ROW ─────────────────────────────────────────

function EditableRow({
  icon,
  title,
  description,
  priority,
  showPriority,
  onChangeTitle,
  onChangeDesc,
  onChangePriority,
  onDelete,
  indent,
  children,
  addLabel,
  onAdd,
}: {
  icon: string;
  title: string;
  description: string;
  priority?: string;
  showPriority?: boolean;
  onChangeTitle: (v: string) => void;
  onChangeDesc: (v: string) => void;
  onChangePriority?: (v: string) => void;
  onDelete: () => void;
  indent: number;
  children?: React.ReactNode;
  addLabel?: string;
  onAdd?: () => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const ml =
    indent === 0 ? "" : indent === 1 ? "ml-5 border-l-2 border-muted pl-3" : "ml-4 border-l border-dashed border-muted pl-2";

  return (
    <div className={ml}>
      <div className="group flex items-start gap-1.5 rounded-md py-1 transition-colors hover:bg-muted/30">
        {children || onAdd ? (
          <button
            onClick={() => setExpanded(!expanded)}
            className="mt-1 w-4 flex-shrink-0 text-[10px] text-muted-foreground"
            title={expanded ? "Collapse" : "Expand"}
          >
            {expanded ? "▾" : "▸"}
          </button>
        ) : (
          <span className="mt-1 w-4 flex-shrink-0" />
        )}

        <span className="mt-1.5 flex-shrink-0 text-xs">{icon}</span>

        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-center gap-1.5">
            <Input
              value={title}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChangeTitle(e.target.value)}
              className="h-7 text-xs font-medium"
              placeholder="Title..."
              title="Edit title"
            />
            {showPriority && onChangePriority && (
              <select
                value={priority || "medium"}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => onChangePriority(e.target.value)}
                className="h-7 rounded-md border bg-background px-1.5 text-[10px]"
                title="Priority"
              >
                <option value="low">Low</option>
                <option value="medium">Med</option>
                <option value="high">High</option>
              </select>
            )}
            <button
              onClick={onDelete}
              className="flex-shrink-0 rounded p-0.5 text-xs text-muted-foreground opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100"
              title="Remove"
            >
              🗑️
            </button>
          </div>
          <Input
            value={description}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChangeDesc(e.target.value)}
            className="h-6 text-[11px] text-muted-foreground"
            placeholder="Description (optional)..."
            title="Edit description"
          />
        </div>
      </div>

      {expanded && (
        <>
          {children}
          {onAdd && (
            <button
              onClick={onAdd}
              className="ml-6 mt-0.5 mb-1 flex items-center gap-1 rounded px-2 py-0.5 text-[10px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              title={addLabel}
            >
              <span>+</span> {addLabel}
            </button>
          )}
        </>
      )}
    </div>
  );
}

// ─── STRUCTURE EDITOR ─────────────────────────────────────

function StructureEditor({
  tasks,
  onChange,
}: {
  tasks: TaskDef[];
  onChange: (tasks: TaskDef[]) => void;
}) {
  const updateTask = (ti: number, patch: Partial<TaskDef>) => {
    const next = [...tasks];
    next[ti] = { ...next[ti], ...patch };
    onChange(next);
  };
  const deleteTask = (ti: number) => onChange(tasks.filter((_, i) => i !== ti));
  const addTask = () => onChange([...tasks, { title: "", description: "", priority: "medium", subtasks: [] }]);

  const updateSubtask = (ti: number, si: number, patch: Partial<SubtaskDef>) => {
    const next = [...tasks];
    const subs = [...(next[ti].subtasks || [])];
    subs[si] = { ...subs[si], ...patch };
    next[ti] = { ...next[ti], subtasks: subs };
    onChange(next);
  };
  const deleteSubtask = (ti: number, si: number) => {
    const next = [...tasks];
    next[ti] = { ...next[ti], subtasks: (next[ti].subtasks || []).filter((_, i) => i !== si) };
    onChange(next);
  };
  const addSubtask = (ti: number) => {
    const next = [...tasks];
    const subs = [...(next[ti].subtasks || [])];
    subs.push({ title: "", description: "", order: subs.length, workOrders: [] });
    next[ti] = { ...next[ti], subtasks: subs };
    onChange(next);
  };

  const updateWorkOrder = (ti: number, si: number, wi: number, patch: Partial<WorkOrderDef>) => {
    const next = [...tasks];
    const subs = [...(next[ti].subtasks || [])];
    const wos = [...(subs[si].workOrders || [])];
    wos[wi] = { ...wos[wi], ...patch };
    subs[si] = { ...subs[si], workOrders: wos };
    next[ti] = { ...next[ti], subtasks: subs };
    onChange(next);
  };
  const deleteWorkOrder = (ti: number, si: number, wi: number) => {
    const next = [...tasks];
    const subs = [...(next[ti].subtasks || [])];
    subs[si] = { ...subs[si], workOrders: (subs[si].workOrders || []).filter((_, i) => i !== wi) };
    next[ti] = { ...next[ti], subtasks: subs };
    onChange(next);
  };
  const addWorkOrder = (ti: number, si: number) => {
    const next = [...tasks];
    const subs = [...(next[ti].subtasks || [])];
    const wos = [...(subs[si].workOrders || [])];
    wos.push({ title: "", description: "", order: wos.length });
    subs[si] = { ...subs[si], workOrders: wos };
    next[ti] = { ...next[ti], subtasks: subs };
    onChange(next);
  };

  return (
    <div className="space-y-1 rounded-md border bg-card p-3">
      {tasks.length === 0 && (
        <p className="py-3 text-center text-xs text-muted-foreground">No tasks yet — add one below.</p>
      )}

      {tasks.map((task, ti) => (
        <EditableRow
          key={ti}
          icon="📋"
          title={task.title}
          description={task.description || ""}
          priority={task.priority}
          showPriority
          onChangeTitle={(v) => updateTask(ti, { title: v })}
          onChangeDesc={(v) => updateTask(ti, { description: v })}
          onChangePriority={(v) => updateTask(ti, { priority: v })}
          onDelete={() => deleteTask(ti)}
          indent={0}
          addLabel="Add Subtask"
          onAdd={() => addSubtask(ti)}
        >
          {(task.subtasks || []).map((st, si) => (
            <EditableRow
              key={si}
              icon="📌"
              title={st.title}
              description={st.description || ""}
              onChangeTitle={(v) => updateSubtask(ti, si, { title: v })}
              onChangeDesc={(v) => updateSubtask(ti, si, { description: v })}
              onDelete={() => deleteSubtask(ti, si)}
              indent={1}
              addLabel="Add Work Order"
              onAdd={() => addWorkOrder(ti, si)}
            >
              {(st.workOrders || []).map((wo, wi) => (
                <EditableRow
                  key={wi}
                  icon="🔧"
                  title={wo.title}
                  description={wo.description || ""}
                  onChangeTitle={(v) => updateWorkOrder(ti, si, wi, { title: v })}
                  onChangeDesc={(v) => updateWorkOrder(ti, si, wi, { description: v })}
                  onDelete={() => deleteWorkOrder(ti, si, wi)}
                  indent={2}
                />
              ))}
            </EditableRow>
          ))}
        </EditableRow>
      ))}

      <button
        onClick={addTask}
        className="mt-1 flex w-full items-center justify-center gap-1.5 rounded-md border border-dashed py-2 text-xs text-muted-foreground transition-colors hover:border-primary hover:bg-muted/50 hover:text-foreground"
        title="Add a new task to this template"
      >
        <span>+</span> Add Task
      </button>
    </div>
  );
}

// ─── READ-ONLY PREVIEW ────────────────────────────────────

function StructurePreview({ tasks }: { tasks: TaskDef[] }) {
  if (tasks.length === 0) {
    return <p className="py-2 text-center text-xs text-muted-foreground">Empty template — no tasks defined.</p>;
  }

  const priorityClass = (p?: string) =>
    p === "high"
      ? "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
      : p === "medium"
        ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300"
        : "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300";

  return (
    <div className="space-y-2 rounded-md border bg-card p-3">
      {tasks.map((task, ti) => (
        <div key={ti}>
          <div className="flex items-center gap-2">
            <span className="text-xs">📋</span>
            <span className="text-sm font-medium">
              {task.title || <span className="italic text-muted-foreground">Untitled task</span>}
            </span>
            {task.priority && (
              <Badge variant="secondary" className={`text-[9px] ${priorityClass(task.priority)}`}>
                {task.priority}
              </Badge>
            )}
          </div>
          {task.description && <p className="ml-6 text-[11px] text-muted-foreground">{task.description}</p>}

          {task.subtasks && task.subtasks.length > 0 && (
            <div className="ml-6 mt-1 space-y-1 border-l-2 border-muted pl-3">
              {task.subtasks.map((st, si) => (
                <div key={si}>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px]">📌</span>
                    <span className="text-xs font-medium">
                      {st.title || <span className="italic text-muted-foreground">Untitled subtask</span>}
                    </span>
                  </div>
                  {st.description && <p className="ml-5 text-[10px] text-muted-foreground">{st.description}</p>}

                  {st.workOrders && st.workOrders.length > 0 && (
                    <div className="ml-5 mt-0.5 space-y-0.5 border-l border-dashed border-muted pl-2">
                      {st.workOrders.map((wo, wi) => (
                        <div key={wi} className="flex items-center gap-1">
                          <span className="text-[9px]">🔧</span>
                          <span className="text-[11px]">
                            {wo.title || <span className="italic text-muted-foreground">Untitled</span>}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────

export default function TemplatesPage() {
  const { toast } = useToast();
  const router = useRouter();
  const templates = useQuery(api.templates.list);
  const projects = useQuery(api.projects.list);
  const cloneToProject = useMutation(api.templates.cloneToProject);
  const deleteTemplate = useMutation(api.templates.remove);
  const updateTemplate = useMutation(api.templates.update);
  const saveFromProject = useMutation(api.templates.saveFromProject);

  // Save from project dialog
  const [saveOpen, setSaveOpen] = useState(false);
  const [saveProjectId, setSaveProjectId] = useState<Id<"projects"> | "">("");
  const [saveName, setSaveName] = useState("");
  const [saveDesc, setSaveDesc] = useState("");

  // Clone dialog
  const [cloneOpen, setCloneOpen] = useState(false);
  const [cloneTemplateId, setCloneTemplateId] = useState<Id<"templates"> | null>(null);
  const [cloneName, setCloneName] = useState("");
  const [cloneDesc, setCloneDesc] = useState("");
  const [cloneStart, setCloneStart] = useState("");
  const [cloneEnd, setCloneEnd] = useState("");

  // Expand / edit header
  const [expandedId, setExpandedId] = useState<Id<"templates"> | null>(null);
  const [editingHeaderId, setEditingHeaderId] = useState<Id<"templates"> | null>(null);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");

  // Structure editing
  const [editStructureId, setEditStructureId] = useState<Id<"templates"> | null>(null);
  const [editTasks, setEditTasks] = useState<TaskDef[]>([]);
  const [structureDirty, setStructureDirty] = useState(false);

  // Delete confirm
  const [deleteConfirm, setDeleteConfirm] = useState<Id<"templates"> | null>(null);
  const deleteTemplateName = templates?.find((t) => t._id === deleteConfirm)?.name ?? "";

  // ─── HELPERS ────────────────────────────────────────────

  const parseStructure = (json: string): TaskDef[] => {
    try {
      return JSON.parse(json).tasks || [];
    } catch {
      return [];
    }
  };

  const countItems = (tasks: TaskDef[]) => {
    let subtasks = 0,
      workOrders = 0;
    for (const t of tasks) {
      const subs = t.subtasks || [];
      subtasks += subs.length;
      for (const s of subs) workOrders += (s.workOrders || []).length;
    }
    return { tasks: tasks.length, subtasks, workOrders };
  };

  // ─── SAVE FROM PROJECT ──────────────────────────────────

  const handleSaveFromProject = async () => {
    if (!saveProjectId || !saveName.trim()) return;
    await saveFromProject({
      projectId: saveProjectId as Id<"projects">,
      name: saveName,
      description: saveDesc || undefined,
    });
    toast(`Template "${saveName}" saved`);
    setSaveOpen(false);
    setSaveName("");
    setSaveDesc("");
    setSaveProjectId("");
  };

  // ─── CLONE ──────────────────────────────────────────────

  const openClone = (templateId: Id<"templates">) => {
    const tmpl = templates?.find((t) => t._id === templateId);
    setCloneTemplateId(templateId);
    setCloneName(tmpl ? `${tmpl.name} Copy` : "New Project");
    setCloneDesc(tmpl?.description ?? "");
    setCloneStart("");
    setCloneEnd("");
    setCloneOpen(true);
  };

  const handleClone = async () => {
    if (!cloneTemplateId || !cloneName.trim()) return;
    const projectId = await cloneToProject({
      templateId: cloneTemplateId,
      projectName: cloneName,
      projectDescription: cloneDesc || undefined,
      startDate: cloneStart ? new Date(cloneStart).getTime() : undefined,
      endDate: cloneEnd ? new Date(cloneEnd).getTime() : undefined,
    });
    toast(`Project "${cloneName}" created from template`);
    setCloneOpen(false);
    router.push(`/projects/${projectId}`);
  };

  // ─── EDIT HEADER ────────────────────────────────────────

  const startEditHeader = (tmpl: { _id: Id<"templates">; name: string; description?: string }) => {
    setEditingHeaderId(tmpl._id);
    setEditName(tmpl.name);
    setEditDesc(tmpl.description ?? "");
    setExpandedId(tmpl._id);
  };

  const saveEditHeader = async () => {
    if (!editingHeaderId || !editName.trim()) return;
    await updateTemplate({ id: editingHeaderId, name: editName, description: editDesc || undefined });
    toast("Template updated");
    setEditingHeaderId(null);
  };

  // ─── EDIT STRUCTURE ─────────────────────────────────────

  const startEditStructure = (tmplId: Id<"templates">, structure: string) => {
    setEditStructureId(tmplId);
    setEditTasks(parseStructure(structure));
    setStructureDirty(false);
    setExpandedId(tmplId);
  };

  const handleStructureChange = (newTasks: TaskDef[]) => {
    setEditTasks(newTasks);
    setStructureDirty(true);
  };

  const saveStructure = async () => {
    if (!editStructureId) return;
    const cleaned = editTasks
      .filter((t) => t.title.trim())
      .map((t) => ({
        ...t,
        subtasks: (t.subtasks || [])
          .filter((st) => st.title.trim())
          .map((st, si) => ({
            ...st,
            order: si,
            workOrders: (st.workOrders || [])
              .filter((wo) => wo.title.trim())
              .map((wo, wi) => ({ ...wo, order: wi })),
          })),
      }));

    await updateTemplate({
      id: editStructureId,
      structure: JSON.stringify({ tasks: cleaned }),
    });

    const counts = countItems(cleaned);
    toast(`Structure saved — ${counts.tasks} tasks, ${counts.subtasks} subtasks, ${counts.workOrders} work orders`);
    setEditStructureId(null);
    setStructureDirty(false);
  };

  const cancelEditStructure = () => {
    setEditStructureId(null);
    setStructureDirty(false);
  };

  // ─── DELETE ─────────────────────────────────────────────

  const handleDelete = async (id: Id<"templates">) => {
    const name = templates?.find((t) => t._id === id)?.name;
    await deleteTemplate({ id });
    toast(`"${name}" deleted`);
  };

  // ─── RENDER ─────────────────────────────────────────────

  if (!templates) {
    return (
      <div>
        <div className="mb-6 h-9 w-48 animate-pulse rounded bg-muted" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-40 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  const activeProjects = projects?.filter((p) => p.status === "active" && p.isOwner) ?? [];

  return (
    <div>
      <ConfirmDialog
        open={!!deleteConfirm}
        onOpenChange={(open) => !open && setDeleteConfirm(null)}
        title="Delete template?"
        message={`Delete "${deleteTemplateName}"? This only removes the template — projects already created from it are not affected.`}
        onConfirm={() => {
          if (deleteConfirm) handleDelete(deleteConfirm);
        }}
      />

      {/* Header */}
      <div className="mb-4 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">Templates</h1>
          <p className="text-sm text-muted-foreground">
            {templates.length} template{templates.length !== 1 ? "s" : ""} · Save project structures and reuse them
          </p>
        </div>
        <Button
          onClick={() => setSaveOpen(true)}
          className="w-full sm:w-auto"
          title="Save an existing project as a reusable template"
        >
          + Save Project as Template
        </Button>
      </div>

      {/* Save from project dialog */}
      <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Project as Template</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <label className="mb-1 block text-sm font-medium">Source Project</label>
              <select
                className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={saveProjectId}
                onChange={(e) => {
                  setSaveProjectId(e.target.value as Id<"projects">);
                  if (!saveName) {
                    const p = activeProjects.find((p) => p._id === e.target.value);
                    if (p) setSaveName(`${p.name} Template`);
                  }
                }}
              >
                <option value="">Select a project...</option>
                {activeProjects.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <Input
              placeholder="Template name"
              value={saveName}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSaveName(e.target.value)}
            />
            <Input
              placeholder="Description (optional)"
              value={saveDesc}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSaveDesc(e.target.value)}
            />
            <Button onClick={handleSaveFromProject} className="w-full" disabled={!saveProjectId || !saveName.trim()}>
              Save Template
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Clone dialog */}
      <Dialog open={cloneOpen} onOpenChange={setCloneOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Project from Template</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <Input
              placeholder="Project name"
              value={cloneName}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCloneName(e.target.value)}
              autoFocus
            />
            <Input
              placeholder="Description (optional)"
              value={cloneDesc}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCloneDesc(e.target.value)}
            />
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Start date</label>
                <Input
                  type="date"
                  value={cloneStart}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCloneStart(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">End date</label>
                <Input
                  type="date"
                  value={cloneEnd}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCloneEnd(e.target.value)}
                />
              </div>
            </div>
            <Button onClick={handleClone} className="w-full" disabled={!cloneName.trim()}>
              Create Project
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Template cards */}
      {templates.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="mb-1 text-2xl">📐</p>
            <p className="mb-2 text-muted-foreground">No templates yet.</p>
            <p className="mb-4 text-sm text-muted-foreground">
              Save a project as a template to reuse its task/subtask/work order structure.
            </p>
            <Button onClick={() => setSaveOpen(true)}>Save your first template</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((tmpl) => {
            const isExpanded = expandedId === tmpl._id;
            const isEditingHeader = editingHeaderId === tmpl._id;
            const isEditingStructure = editStructureId === tmpl._id;
            const tasks = isEditingStructure ? editTasks : parseStructure(tmpl.structure);
            const counts = countItems(tasks);

            return (
              <Card
                key={tmpl._id}
                className={`transition-all ${isExpanded ? "ring-2 ring-primary/30 sm:col-span-2 lg:col-span-3" : "hover:bg-muted/50 hover:shadow-lg"}`}
              >
                <CardContent className="pt-4">
                  {/* Card header */}
                  <div className="mb-2 flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <h3
                        className="cursor-pointer font-semibold hover:text-primary"
                        onClick={() => setExpandedId(isExpanded ? null : tmpl._id)}
                        title={isExpanded ? "Collapse" : "Preview template structure"}
                      >
                        📐 {tmpl.name}
                      </h3>
                      {tmpl.description && (
                        <p className="mt-0.5 text-sm text-muted-foreground line-clamp-2">{tmpl.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => startEditHeader(tmpl)} title="Edit name & description">
                        ✏️
                      </Button>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setDeleteConfirm(tmpl._id)} title="Delete template">
                        🗑️
                      </Button>
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : tmpl._id)}
                        className="p-1 text-xs text-muted-foreground"
                        title={isExpanded ? "Collapse" : "Expand"}
                      >
                        {isExpanded ? "▼" : "▶"}
                      </button>
                    </div>
                  </div>

                  {/* Counts */}
                  <div className="mb-3 flex flex-wrap gap-1.5">
                    <Badge variant="secondary" className="text-[10px]" title="Tasks">
                      📋 {counts.tasks} task{counts.tasks !== 1 ? "s" : ""}
                    </Badge>
                    {counts.subtasks > 0 && (
                      <Badge variant="secondary" className="text-[10px]" title="Subtasks">
                        📌 {counts.subtasks} subtask{counts.subtasks !== 1 ? "s" : ""}
                      </Badge>
                    )}
                    {counts.workOrders > 0 && (
                      <Badge variant="secondary" className="text-[10px]" title="Work orders">
                        🔧 {counts.workOrders} work order{counts.workOrders !== 1 ? "s" : ""}
                      </Badge>
                    )}
                    {structureDirty && isEditingStructure && (
                      <Badge className="bg-amber-100 text-[10px] text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                        Unsaved changes
                      </Badge>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" className="text-xs" onClick={() => openClone(tmpl._id)} title="Create a new project using this template">
                      🚀 Use Template
                    </Button>
                    {!isEditingStructure ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        onClick={() => startEditStructure(tmpl._id, tmpl.structure)}
                        title="Edit the task/subtask/work order structure"
                      >
                        ✏️ Edit Structure
                      </Button>
                    ) : (
                      <>
                        <Button size="sm" className="bg-green-600 text-xs text-white hover:bg-green-700" onClick={saveStructure} title="Save all structure changes">
                          💾 Save Structure
                        </Button>
                        <Button variant="outline" size="sm" className="text-xs" onClick={cancelEditStructure} title="Discard changes">
                          Cancel
                        </Button>
                      </>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      onClick={() => setExpandedId(isExpanded ? null : tmpl._id)}
                      title="Toggle preview"
                    >
                      {isExpanded ? "Hide" : "Preview"}
                    </Button>
                  </div>

                  {/* Expanded panel */}
                  {isExpanded && (
                    <div className="mt-4 space-y-3 border-t pt-3">
                      {/* Header inline edit */}
                      {isEditingHeader && (
                        <div className="space-y-2 rounded-md border bg-muted/30 p-3">
                          <Input
                            placeholder="Template name"
                            value={editName}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditName(e.target.value)}
                          />
                          <Input
                            placeholder="Description"
                            value={editDesc}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditDesc(e.target.value)}
                          />
                          <div className="flex gap-2">
                            <Button size="sm" onClick={saveEditHeader}>
                              Save
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setEditingHeaderId(null)}>
                              Cancel
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* Structure: editable or read-only */}
                      <div>
                        <div className="mb-2 flex items-center justify-between">
                          <p className="text-xs font-medium text-muted-foreground">
                            {isEditingStructure ? "✏️ Editing Structure" : "Template Structure"}
                          </p>
                          {!isEditingStructure && (
                            <button
                              onClick={() => startEditStructure(tmpl._id, tmpl.structure)}
                              className="text-[10px] text-primary hover:underline"
                            >
                              Edit
                            </button>
                          )}
                        </div>

                        {isEditingStructure ? (
                          <>
                            <StructureEditor tasks={editTasks} onChange={handleStructureChange} />
                            <div className="mt-2 flex gap-2">
                              <Button size="sm" className="bg-green-600 text-xs text-white hover:bg-green-700" onClick={saveStructure}>
                                💾 Save Structure
                              </Button>
                              <Button size="sm" variant="ghost" className="text-xs" onClick={cancelEditStructure}>
                                Cancel
                              </Button>
                              {structureDirty && <span className="ml-auto self-center text-[10px] text-amber-600">⚠️ Unsaved</span>}
                            </div>
                          </>
                        ) : (
                          <StructurePreview tasks={tasks} />
                        )}
                      </div>

                      {/* Meta */}
                      <p className="text-[10px] text-muted-foreground">
                        Created{" "}
                        {new Date(tmpl.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                        {" · "}Updated{" "}
                        {new Date(tmpl.updatedAt ?? tmpl.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </p>
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
