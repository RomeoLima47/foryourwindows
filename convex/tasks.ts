import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getCurrentUser } from "./users";

export const list = query({
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

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

    const allIds = new Set<string>();
    const all: (typeof ownTasks)[number][] = [];
    for (const t of [...ownTasks, ...sharedTasks]) {
      if (!allIds.has(t._id)) {
        allIds.add(t._id);
        all.push(t);
      }
    }

    const enriched = await Promise.all(
      all.map(async (task) => {
        let assigneeName: string | undefined;
        if (task.assigneeId) {
          const assignee = await ctx.db.get(task.assigneeId);
          assigneeName = (assignee as any)?.name;
        }
        const subtasks = await ctx.db
          .query("subtasks")
          .withIndex("by_task", (q) => q.eq("taskId", task._id))
          .collect();

        return {
          ...task,
          assigneeName,
          subtaskCount: subtasks.length,
          subtaskDone: subtasks.filter((s) => s.status === "done").length,
        };
      })
    );

    return enriched.sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const listByProject = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();

    const enriched = await Promise.all(
      tasks.map(async (task) => {
        let assigneeName: string | undefined;
        if (task.assigneeId) {
          const assignee = await ctx.db.get(task.assigneeId);
          assigneeName = (assignee as any)?.name;
        }
        const subtasks = await ctx.db
          .query("subtasks")
          .withIndex("by_task", (q) => q.eq("taskId", task._id))
          .collect();

        return {
          ...task,
          assigneeName,
          subtaskCount: subtasks.length,
          subtaskDone: subtasks.filter((s) => s.status === "done").length,
        };
      })
    );

    return enriched.sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const get = query({
  args: { id: v.id("tasks") },
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.id);
    if (!task) return null;

    let assigneeName: string | undefined;
    if (task.assigneeId) {
      const assignee = await ctx.db.get(task.assigneeId);
      assigneeName = (assignee as any)?.name;
    }

    let projectName: string | undefined;
    if (task.projectId) {
      const project = await ctx.db.get(task.projectId);
      projectName = (project as any)?.name;
    }

    return { ...task, assigneeName, projectName };
  },
});

export const create = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    status: v.union(v.literal("todo"), v.literal("in_progress"), v.literal("done")),
    priority: v.union(v.literal("low"), v.literal("medium"), v.literal("high")),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    projectId: v.optional(v.id("projects")),
    assigneeId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const taskId = await ctx.db.insert("tasks", {
      ...args,
      ownerId: user._id,
      createdAt: Date.now(),
    });

    // Activity log
    await ctx.db.insert("activityLog", {
      userId: user._id,
      userName: user.name,
      action: "created",
      entityType: "task",
      entityId: taskId,
      entityName: args.title,
      projectId: args.projectId,
      createdAt: Date.now(),
    });

    return taskId;
  },
});

export const update = mutation({
  args: {
    id: v.id("tasks"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    status: v.optional(v.union(v.literal("todo"), v.literal("in_progress"), v.literal("done"))),
    priority: v.optional(v.union(v.literal("low"), v.literal("medium"), v.literal("high"))),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    color: v.optional(v.string()),
    projectId: v.optional(v.id("projects")),
    assigneeId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const task = await ctx.db.get(args.id);
    if (!task) throw new Error("Task not found");

    const { id, ...fields } = args;

    // Build change details
    const changes: Record<string, { from: unknown; to: unknown }> = {};
    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined && (task as any)[key] !== value) {
        changes[key] = { from: (task as any)[key], to: value };
      }
    }

    await ctx.db.patch(id, fields);

    if (Object.keys(changes).length > 0) {
      const action = changes.status ? "status_changed"
        : changes.assigneeId ? "assigned"
        : (changes.startDate || changes.endDate) ? "moved"
        : "updated";

      await ctx.db.insert("activityLog", {
        userId: user._id,
        userName: user.name,
        action,
        entityType: "task",
        entityId: id,
        entityName: args.title || task.title,
        details: JSON.stringify(changes),
        projectId: task.projectId,
        taskId: id,
        createdAt: Date.now(),
      });
    }

    // Return old state for undo
    return { previous: task };
  },
});

export const remove = mutation({
  args: { id: v.id("tasks") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const task = await ctx.db.get(args.id);
    if (!task) throw new Error("Task not found");

    // Activity log
    await ctx.db.insert("activityLog", {
      userId: user._id,
      userName: user.name,
      action: "deleted",
      entityType: "task",
      entityId: args.id,
      entityName: task.title,
      projectId: task.projectId,
      createdAt: Date.now(),
    });

    const subtasks = await ctx.db
      .query("subtasks")
      .withIndex("by_task", (q) => q.eq("taskId", args.id))
      .collect();

    for (const st of subtasks) {
      const wos = await ctx.db
        .query("workOrders")
        .withIndex("by_subtask", (q) => q.eq("subtaskId", st._id))
        .collect();
      for (const wo of wos) await ctx.db.delete(wo._id);
      await ctx.db.delete(st._id);
    }

    await ctx.db.delete(args.id);
  },
});