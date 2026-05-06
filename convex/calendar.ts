import { query } from "./_generated/server";
import { getCurrentUser } from "./users";

// ─── Helper: get all accessible tasks for a user ────────────
async function getAllAccessibleTasks(ctx: any, user: any) {
  const ownTasks = await ctx.db
    .query("tasks")
    .withIndex("by_owner", (q: any) => q.eq("ownerId", user._id))
    .collect();

  const memberships = await ctx.db
    .query("projectMembers")
    .withIndex("by_user", (q: any) => q.eq("userId", user._id))
    .collect();

  const memberProjectIds = memberships
    .filter((m: any) => m.role !== "owner")
    .map((m: any) => m.projectId);

  const sharedTasks: (typeof ownTasks)[number][] = [];
  for (const pid of memberProjectIds) {
    const pt = await ctx.db
      .query("tasks")
      .withIndex("by_project", (q: any) => q.eq("projectId", pid))
      .collect();
    sharedTasks.push(...pt);
  }

  const allTaskIds = new Set<string>();
  const allTasks: (typeof ownTasks)[number][] = [];
  for (const t of [...ownTasks, ...sharedTasks]) {
    if (!allTaskIds.has(t._id)) {
      allTaskIds.add(t._id);
      allTasks.push(t);
    }
  }

  return { allTasks, memberProjectIds };
}

// ─── Helper: get all accessible projects for a user ─────────
async function getAllAccessibleProjects(ctx: any, user: any) {
  const ownedProjects = await ctx.db
    .query("projects")
    .withIndex("by_owner", (q: any) => q.eq("ownerId", user._id))
    .collect();

  const memberships = await ctx.db
    .query("projectMembers")
    .withIndex("by_user", (q: any) => q.eq("userId", user._id))
    .collect();

  const memberProjectIds = memberships
    .filter((m: any) => m.role !== "owner")
    .map((m: any) => m.projectId);

  const memberProjects = await Promise.all(
    memberProjectIds.map(async (pid: any) => ctx.db.get(pid))
  );

  return [
    ...ownedProjects,
    ...memberProjects.filter((p: any): p is NonNullable<typeof p> => p !== null),
  ];
}

// ─── UNSCHEDULED ITEMS ──────────────────────────────────────
// Returns projects, tasks, subtasks, and work orders missing start or end dates

export const unscheduledItems = query({
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return { projects: [], tasks: [], subtasks: [], workOrders: [] };

    const allProjects = await getAllAccessibleProjects(ctx, user);
    const { allTasks } = await getAllAccessibleTasks(ctx, user);

    // ─── Projects ───
    const unscheduledProjects = allProjects
      .filter((p) => p.status === "active" && (!p.startDate || !p.endDate))
      .map((p) => ({
        _id: p._id,
        type: "project" as const,
        name: p.name,
        description: p.description,
        status: p.status,
        hasStart: !!p.startDate,
        hasEnd: !!p.endDate,
        startDate: p.startDate,
        endDate: p.endDate,
        color: (p as any).color,
      }));

    // ─── Tasks ───
    const projectCache = new Map<string, string>();
    const getProjectName = async (projectId?: string) => {
      if (!projectId) return undefined;
      if (projectCache.has(projectId)) return projectCache.get(projectId);
      const p = await ctx.db.get(projectId as any);
      const name = (p as any)?.name;
      if (name) projectCache.set(projectId, name);
      return name;
    };

    const unscheduledTasks = await Promise.all(
      allTasks
        .filter((t) => t.status !== "done" && (!t.startDate || !t.endDate))
        .map(async (t) => ({
          _id: t._id,
          type: "task" as const,
          name: t.title,
          description: t.description,
          projectName: await getProjectName(t.projectId),
          projectId: t.projectId,
          hasStart: !!t.startDate,
          hasEnd: !!t.endDate,
          startDate: t.startDate,
          endDate: t.endDate,
          priority: t.priority,
          status: t.status,
          color: (t as any).color,
        }))
    );

    // ─── Subtasks ───
    const unscheduledSubtasks: {
      _id: string;
      type: "subtask";
      name: string;
      description?: string;
      parentName: string;
      projectName?: string;
      projectId?: string;
      taskId: string;
      hasStart: boolean;
      hasEnd: boolean;
      startDate?: number;
      endDate?: number;
      status: string;
    }[] = [];

    // ─── Work Orders ───
    const unscheduledWorkOrders: {
      _id: string;
      type: "workOrder";
      name: string;
      description?: string;
      parentName: string;
      grandparentName: string;
      projectName?: string;
      projectId?: string;
      subtaskId: string;
      hasStart: boolean;
      hasEnd: boolean;
      startDate?: number;
      endDate?: number;
      status: string;
    }[] = [];

    for (const task of allTasks) {
      const subtasks = await ctx.db
        .query("subtasks")
        .withIndex("by_task", (q) => q.eq("taskId", task._id))
        .collect();

      const projName = await getProjectName(task.projectId);

      for (const st of subtasks) {
        if (st.status !== "done" && (!st.startDate || !st.endDate)) {
          unscheduledSubtasks.push({
            _id: st._id,
            type: "subtask",
            name: st.title,
            description: st.description,
            parentName: task.title,
            projectName: projName,
            projectId: task.projectId,
            taskId: task._id,
            hasStart: !!st.startDate,
            hasEnd: !!st.endDate,
            startDate: st.startDate,
            endDate: st.endDate,
            status: st.status,
          });
        }

        const workOrders = await ctx.db
          .query("workOrders")
          .withIndex("by_subtask", (q) => q.eq("subtaskId", st._id))
          .collect();

        for (const wo of workOrders) {
          if (wo.status !== "done" && (!wo.startDate || !wo.endDate)) {
            unscheduledWorkOrders.push({
              _id: wo._id,
              type: "workOrder",
              name: wo.title,
              description: wo.description,
              parentName: st.title,
              grandparentName: task.title,
              projectName: projName,
              projectId: task.projectId,
              subtaskId: st._id,
              hasStart: !!wo.startDate,
              hasEnd: !!wo.endDate,
              startDate: wo.startDate,
              endDate: wo.endDate,
              status: wo.status,
            });
          }
        }
      }
    }

    return {
      projects: unscheduledProjects,
      tasks: unscheduledTasks,
      subtasks: unscheduledSubtasks,
      workOrders: unscheduledWorkOrders,
    };
  },
});

// ─── SCHEDULED RANGES ───────────────────────────────────────
// Returns all items with BOTH start+end dates for calendar rendering

export const scheduledRanges = query({
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    const allProjects = await getAllAccessibleProjects(ctx, user);
    const { allTasks } = await getAllAccessibleTasks(ctx, user);

    const ranges: {
      id: string;
      type: "project" | "task" | "subtask" | "workOrder";
      name: string;
      description?: string;
      startDate: number;
      endDate: number;
      color: string;
      projectStatus?: string;
      taskStatus?: string;
      priority?: string;
      projectId?: string;
      projectName?: string;
      parentName?: string;
      assigneeId?: string;
      assigneeName?: string;
    }[] = [];

    // ─── Project ranges ───
    for (const p of allProjects) {
      if (p.startDate && p.endDate && p.status === "active") {
        ranges.push({
          id: p._id,
          type: "project",
          name: p.name,
          description: p.description,
          startDate: p.startDate,
          endDate: p.endDate,
          color: (p as any).color ?? "#3b82f6",
          projectStatus: p.status,
        });
      }
    }

    // ─── Task + subtask + work order ranges ───
    const projectCache = new Map<string, string>();
    for (const t of allTasks) {
      let projectName: string | undefined;
      if (t.projectId) {
        if (projectCache.has(t.projectId)) {
          projectName = projectCache.get(t.projectId);
        } else {
          const project = await ctx.db.get(t.projectId);
          projectName = (project as any)?.name;
          if (projectName) projectCache.set(t.projectId, projectName);
        }
      }
      let assigneeName: string | undefined;
      if (t.assigneeId) {
        const assignee = await ctx.db.get(t.assigneeId);
        assigneeName = (assignee as any)?.name;
      }

      if (t.startDate && t.endDate) {
        ranges.push({
          id: t._id,
          type: "task",
          name: t.title,
          description: t.description,
          startDate: t.startDate,
          endDate: t.endDate,
          color: (t as any).color ?? "#8b5cf6",
          taskStatus: t.status,
          priority: t.priority,
          projectId: t.projectId,
          projectName,
          assigneeId: t.assigneeId,
          assigneeName,
        });
      }

      // Subtasks
      const subtasks = await ctx.db
        .query("subtasks")
        .withIndex("by_task", (q) => q.eq("taskId", t._id))
        .collect();

      for (const st of subtasks) {
        if (st.startDate && st.endDate) {
          let stAssigneeName: string | undefined;
          if (st.assigneeId) {
            const a = await ctx.db.get(st.assigneeId);
            stAssigneeName = (a as any)?.name;
          }
          ranges.push({
            id: st._id,
            type: "subtask",
            name: st.title,
            description: st.description,
            startDate: st.startDate,
            endDate: st.endDate,
            color: "#22c55e",
            taskStatus: st.status,
            projectId: t.projectId,
            projectName,
            parentName: t.title,
            assigneeId: st.assigneeId,
            assigneeName: stAssigneeName,
          });
        }

        // Work orders
        const workOrders = await ctx.db
          .query("workOrders")
          .withIndex("by_subtask", (q) => q.eq("subtaskId", st._id))
          .collect();

        for (const wo of workOrders) {
          if (wo.startDate && wo.endDate) {
            let woAssigneeName: string | undefined;
            if (wo.assigneeId) {
              const a = await ctx.db.get(wo.assigneeId);
              woAssigneeName = (a as any)?.name;
            }
            ranges.push({
              id: wo._id,
              type: "workOrder",
              name: wo.title,
              description: wo.description,
              startDate: wo.startDate,
              endDate: wo.endDate,
              color: "#f59e0b",
              taskStatus: wo.status,
              projectId: t.projectId,
              projectName,
              parentName: st.title,
              assigneeId: wo.assigneeId,
              assigneeName: woAssigneeName,
            });
          }
        }
      }
    }

    return ranges;
  },
});