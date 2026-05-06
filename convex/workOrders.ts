import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getCurrentUser } from "./users";

export const listBySubtask = query({
  args: { subtaskId: v.id("subtasks") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    const workOrders = await ctx.db
      .query("workOrders")
      .withIndex("by_subtask", (q) => q.eq("subtaskId", args.subtaskId))
      .collect();

    const enriched = await Promise.all(
      workOrders.map(async (wo) => {
        let assigneeName: string | undefined;
        if (wo.assigneeId) {
          const assignee = await ctx.db.get(wo.assigneeId);
          assigneeName = (assignee as any)?.name;
        }
        return { ...wo, assigneeName };
      })
    );

    return enriched.sort((a, b) => a.order - b.order);
  },
});

export const create = mutation({
  args: {
    subtaskId: v.id("subtasks"),
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
      .query("workOrders")
      .withIndex("by_subtask", (q) => q.eq("subtaskId", args.subtaskId))
      .collect();

    const maxOrder = existing.length > 0
      ? Math.max(...existing.map((w) => w.order))
      : -1;

    return await ctx.db.insert("workOrders", {
      subtaskId: args.subtaskId,
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
    id: v.id("workOrders"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    status: v.optional(v.union(v.literal("todo"), v.literal("in_progress"), v.literal("done"))),
    assigneeId: v.optional(v.id("users")),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const { id, ...fields } = args;
    await ctx.db.patch(id, fields);
  },
});

export const remove = mutation({
  args: { id: v.id("workOrders") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    await ctx.db.delete(args.id);
  },
});

// ─── Reorder: update order fields for all work orders in a subtask ──
export const reorder = mutation({
  args: {
    subtaskId: v.id("subtasks"),
    orderedIds: v.array(v.id("workOrders")),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    for (let i = 0; i < args.orderedIds.length; i++) {
      await ctx.db.patch(args.orderedIds[i], { order: i });
    }
  },
});