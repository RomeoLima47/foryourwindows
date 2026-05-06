import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getCurrentUser } from "./users";

export const listByTask = query({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    const subtasks = await ctx.db
      .query("subtasks")
      .withIndex("by_task", (q) => q.eq("taskId", args.taskId))
      .collect();

    const enriched = await Promise.all(
      subtasks.map(async (st) => {
        let assigneeName: string | undefined;
        if (st.assigneeId) {
          const assignee = await ctx.db.get(st.assigneeId);
          assigneeName = (assignee as any)?.name;
        }
        const workOrders = await ctx.db
          .query("workOrders")
          .withIndex("by_subtask", (q) => q.eq("subtaskId", st._id))
          .collect();

        return {
          ...st,
          assigneeName,
          workOrderCount: workOrders.length,
          workOrderDone: workOrders.filter((w) => w.status === "done").length,
        };
      })
    );

    return enriched.sort((a, b) => a.order - b.order);
  },
});

export const get = query({
  args: { id: v.id("subtasks") },
  handler: async (ctx, args) => {
    const subtask = await ctx.db.get(args.id);
    if (!subtask) return null;

    let assigneeName: string | undefined;
    if (subtask.assigneeId) {
      const assignee = await ctx.db.get(subtask.assigneeId);
      assigneeName = (assignee as any)?.name;
    }

    const task = await ctx.db.get(subtask.taskId);

    return { ...subtask, assigneeName, taskTitle: (task as any)?.title ?? "Unknown" };
  },
});

export const create = mutation({
  args: {
    taskId: v.id("tasks"),
    title: v.string(),
    description: v.optional(v.string()),
    assigneeId: v.optional(v.id("users")),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("subtasks")
      .withIndex("by_task", (q) => q.eq("taskId", args.taskId))
      .collect();

    const maxOrder = existing.length > 0
      ? Math.max(...existing.map((s) => s.order))
      : -1;

    return await ctx.db.insert("subtasks", {
      taskId: args.taskId,
      title: args.title,
      description: args.description,
      status: "todo",
      assigneeId: args.assigneeId,
      startDate: args.startDate,
      endDate: args.endDate,
      order: maxOrder + 1,
      createdAt: Date.now(),
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("subtasks"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    status: v.optional(v.union(v.literal("todo"), v.literal("in_progress"), v.literal("done"))),
    assigneeId: v.optional(v.id("users")),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    order: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const { id, ...fields } = args;
    await ctx.db.patch(id, fields);
  },
});

export const toggle = mutation({
  args: { id: v.id("subtasks") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const subtask = await ctx.db.get(args.id);
    if (!subtask) throw new Error("Subtask not found");

    const newStatus = subtask.status === "done" ? "todo" : "done";
    await ctx.db.patch(args.id, { status: newStatus });

    // Check if all sibling subtasks are now complete
    const siblings = await ctx.db
      .query("subtasks")
      .withIndex("by_task", (q) => q.eq("taskId", subtask.taskId))
      .collect();

    const allCompleted = siblings.every((s) =>
      s._id === args.id ? newStatus === "done" : s.status === "done"
    );

    return { newStatus, allCompleted };
  },
});

export const remove = mutation({
  args: { id: v.id("subtasks") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    // Delete child work orders
    const workOrders = await ctx.db
      .query("workOrders")
      .withIndex("by_subtask", (q) => q.eq("subtaskId", args.id))
      .collect();
    for (const wo of workOrders) await ctx.db.delete(wo._id);

    await ctx.db.delete(args.id);
  },
});

// ─── Reorder: update order fields for all subtasks in a task ──
export const reorder = mutation({
  args: {
    taskId: v.id("tasks"),
    orderedIds: v.array(v.id("subtasks")),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    // Update each subtask's order to match its index in the array
    for (let i = 0; i < args.orderedIds.length; i++) {
      await ctx.db.patch(args.orderedIds[i], { order: i });
    }
  },
});

// Count for badge display
export const countByTask = query({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, args) => {
    const subtasks = await ctx.db
      .query("subtasks")
      .withIndex("by_task", (q) => q.eq("taskId", args.taskId))
      .collect();

    return {
      total: subtasks.length,
      completed: subtasks.filter((s) => s.status === "done").length,
    };
  },
});