import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getCurrentUser } from "./users";

// List activity for a specific project
export const listByProject = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    const logs = await ctx.db
      .query("activityLog")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();

    return logs.sort((a, b) => b.createdAt - a.createdAt).slice(0, 100);
  },
});

// List activity for a specific task
export const listByTask = query({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    const logs = await ctx.db
      .query("activityLog")
      .withIndex("by_task", (q) => q.eq("taskId", args.taskId))
      .collect();

    return logs.sort((a, b) => b.createdAt - a.createdAt).slice(0, 50);
  },
});

// List activity for a specific entity (task, subtask, etc.)
export const listByEntity = query({
  args: {
    entityType: v.union(
      v.literal("project"),
      v.literal("task"),
      v.literal("subtask"),
      v.literal("workOrder"),
      v.literal("template")
    ),
    entityId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    const logs = await ctx.db
      .query("activityLog")
      .withIndex("by_entity", (q) =>
        q.eq("entityType", args.entityType).eq("entityId", args.entityId)
      )
      .collect();

    return logs.sort((a, b) => b.createdAt - a.createdAt).slice(0, 50);
  },
});

// List all activity by the current user (global feed)
export const listMyActivity = query({
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    const logs = await ctx.db
      .query("activityLog")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    return logs.sort((a, b) => b.createdAt - a.createdAt).slice(0, 100);
  },
});

// Manually create an activity log entry (used by frontend for undo tracking)
export const create = mutation({
  args: {
    entityType: v.union(
      v.literal("project"),
      v.literal("task"),
      v.literal("subtask"),
      v.literal("workOrder"),
      v.literal("template")
    ),
    entityId: v.string(),
    entityName: v.string(),
    projectId: v.optional(v.id("projects")),
    taskId: v.optional(v.id("tasks")),
    action: v.union(
      v.literal("created"),
      v.literal("updated"),
      v.literal("deleted"),
      v.literal("status_changed"),
      v.literal("assigned"),
      v.literal("moved"),
      v.literal("commented"),
      v.literal("template_saved"),
      v.literal("template_used"),
      v.literal("cloned")
    ),
    description: v.optional(v.string()),
    details: v.optional(v.string()),
    previousValue: v.optional(v.string()),
    newValue: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    return await ctx.db.insert("activityLog", {
      userId: user._id,
      userName: user.name,
      entityType: args.entityType,
      entityId: args.entityId,
      entityName: args.entityName,
      projectId: args.projectId,
      taskId: args.taskId,
      action: args.action,
      description: args.description,
      details: args.details,
      previousValue: args.previousValue,
      newValue: args.newValue,
      createdAt: Date.now(),
    });
  },
});