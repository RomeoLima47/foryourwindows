import { query } from "./_generated/server";
import { getCurrentUser } from "./users";

export const allItems = query({
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    // ─── Gather all accessible task IDs ─────────────────────
    const ownTasks = await ctx.db
      .query("tasks")
      .withIndex("by_owner", (q) => q.eq("ownerId", user._id))
      .collect();

    const memberships = await ctx.db
      .query("projectMembers")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const sharedProjectIds = memberships
      .filter((m) => m.role !== "owner")
      .map((m) => m.projectId);

    const sharedTasks: (typeof ownTasks)[number][] = [];
    for (const pid of sharedProjectIds) {
      const pt = await ctx.db
        .query("tasks")
        .withIndex("by_project", (q) => q.eq("projectId", pid))
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

    // ─── Build unified items ────────────────────────────────

    type BoardItem = {
      _id: string;
      entityType: "task" | "subtask" | "workOrder";
      title: string;
      description?: string;
      status: "todo" | "in_progress" | "done";
      priority?: string;
      startDate?: number;
      endDate?: number;
      projectId?: string;
      projectName?: string;
      parentName?: string;    // task name for subtask, subtask name for workOrder
      grandparentName?: string; // task name for workOrder
      assigneeName?: string;
    };

    const items: BoardItem[] = [];

    // ─── Tasks ──────────────────────────────────────────────
    const projectCache = new Map<string, string>();
    for (const t of allTasks) {
      let projectName: string | undefined;
      if (t.projectId) {
        if (projectCache.has(t.projectId)) {
          projectName = projectCache.get(t.projectId);
        } else {
          const p = await ctx.db.get(t.projectId);
          projectName = (p as any)?.name;
          if (projectName) projectCache.set(t.projectId, projectName);
        }
      }

      let assigneeName: string | undefined;
      if (t.assigneeId) {
        const a = await ctx.db.get(t.assigneeId);
        assigneeName = (a as any)?.name;
      }

      items.push({
        _id: t._id,
        entityType: "task",
        title: t.title,
        description: t.description,
        status: t.status,
        priority: t.priority,
        startDate: t.startDate,
        endDate: t.endDate,
        projectId: t.projectId,
        projectName,
        assigneeName,
      });

      // ─── Subtasks of this task ────────────────────────────
      const subtasks = await ctx.db
        .query("subtasks")
        .withIndex("by_task", (q) => q.eq("taskId", t._id))
        .collect();

      for (const st of subtasks) {
        let stAssigneeName: string | undefined;
        if (st.assigneeId) {
          const a = await ctx.db.get(st.assigneeId);
          stAssigneeName = (a as any)?.name;
        }

        items.push({
          _id: st._id,
          entityType: "subtask",
          title: st.title,
          description: st.description,
          status: st.status,
          startDate: st.startDate,
          endDate: st.endDate,
          projectId: t.projectId,
          projectName,
          parentName: t.title,
          assigneeName: stAssigneeName,
        });

        // ─── Work Orders of this subtask ────────────────────
        const workOrders = await ctx.db
          .query("workOrders")
          .withIndex("by_subtask", (q) => q.eq("subtaskId", st._id))
          .collect();

        for (const wo of workOrders) {
          let woAssigneeName: string | undefined;
          if (wo.assigneeId) {
            const a = await ctx.db.get(wo.assigneeId);
            woAssigneeName = (a as any)?.name;
          }

          items.push({
            _id: wo._id,
            entityType: "workOrder",
            title: wo.title,
            description: wo.description,
            status: wo.status,
            startDate: wo.startDate,
            endDate: wo.endDate,
            projectId: t.projectId,
            projectName,
            parentName: st.title,
            grandparentName: t.title,
            assigneeName: woAssigneeName,
          });
        }
      }
    }

    return items;
  },
});