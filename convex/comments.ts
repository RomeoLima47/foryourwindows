import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getCurrentUser } from "./users";
import { createNotification } from "./notifications";

async function enrichComments(ctx: any, comments: any[]) {
  const enriched = await Promise.all(
    comments.map(async (comment: any) => {
      const author = await ctx.db.get(comment.authorId);
      return {
        ...comment,
        authorName: author?.name ?? "Unknown",
        authorImage: author?.imageUrl,
      };
    })
  );
  return enriched.sort((a: any, b: any) => a.createdAt - b.createdAt);
}

export const listByProject = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];
    const comments = await ctx.db
      .query("comments")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();
    return enrichComments(ctx, comments);
  },
});

export const listByTask = query({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];
    const comments = await ctx.db
      .query("comments")
      .withIndex("by_task", (q) => q.eq("taskId", args.taskId))
      .collect();
    return enrichComments(ctx, comments);
  },
});

export const listBySubtask = query({
  args: { subtaskId: v.id("subtasks") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];
    const comments = await ctx.db
      .query("comments")
      .withIndex("by_subtask", (q) => q.eq("subtaskId", args.subtaskId))
      .collect();
    return enrichComments(ctx, comments);
  },
});

export const listByWorkOrder = query({
  args: { workOrderId: v.id("workOrders") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];
    const comments = await ctx.db
      .query("comments")
      .withIndex("by_work_order", (q) => q.eq("workOrderId", args.workOrderId))
      .collect();
    return enrichComments(ctx, comments);
  },
});

export const commentCount = query({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, args) => {
    const comments = await ctx.db
      .query("comments")
      .withIndex("by_task", (q) => q.eq("taskId", args.taskId))
      .collect();
    return comments.length;
  },
});

export const create = mutation({
  args: {
    content: v.string(),
    projectId: v.optional(v.id("projects")),
    taskId: v.optional(v.id("tasks")),
    subtaskId: v.optional(v.id("subtasks")),
    workOrderId: v.optional(v.id("workOrders")),
    parentId: v.optional(v.id("comments")),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    await ctx.db.insert("comments", {
      content: args.content,
      projectId: args.projectId,
      taskId: args.taskId,
      subtaskId: args.subtaskId,
      workOrderId: args.workOrderId,
      parentId: args.parentId,
      authorId: user._id,
      createdAt: Date.now(),
    });

    // Notify task owner if someone else comments on their task
    if (args.taskId) {
      const task = await ctx.db.get(args.taskId);
      if (task && task.ownerId !== user._id) {
        await createNotification(ctx, {
          userId: task.ownerId,
          type: "comment",
          title: "New comment",
          message: `${user.name} commented on "${task.title}": ${args.content.slice(0, 60)}${args.content.length > 60 ? "..." : ""}`,
          linkTo: task.projectId ? `/projects/${task.projectId}/tasks/${task._id}` : "/tasks",
        });
      }
    }

    // Notify project owner if someone else comments on their project
    if (args.projectId) {
      const project = await ctx.db.get(args.projectId);
      if (project && project.ownerId !== user._id) {
        await createNotification(ctx, {
          userId: project.ownerId,
          type: "comment",
          title: "New comment",
          message: `${user.name} commented on "${project.name}": ${args.content.slice(0, 60)}${args.content.length > 60 ? "..." : ""}`,
          linkTo: `/projects/${project._id}`,
        });
      }
    }
  },
});

export const remove = mutation({
  args: { id: v.id("comments") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");
    const comment = await ctx.db.get(args.id);
    if (!comment) throw new Error("Not found");
    if (comment.authorId !== user._id) throw new Error("Not authorized");
    await ctx.db.delete(args.id);
  },
});