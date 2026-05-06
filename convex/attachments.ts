import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getCurrentUser } from "./users";

export const generateUploadUrl = mutation({
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");
    return await ctx.storage.generateUploadUrl();
  },
});

export const saveAttachment = mutation({
  args: {
    storageId: v.id("_storage"),
    fileName: v.string(),
    fileSize: v.number(),
    fileType: v.string(),
    taskId: v.optional(v.id("tasks")),
    subtaskId: v.optional(v.id("subtasks")),
    workOrderId: v.optional(v.id("workOrders")),
    projectId: v.optional(v.id("projects")),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");
    return await ctx.db.insert("attachments", {
      storageId: args.storageId,
      fileName: args.fileName,
      fileSize: args.fileSize,
      fileType: args.fileType,
      taskId: args.taskId,
      subtaskId: args.subtaskId,
      workOrderId: args.workOrderId,
      projectId: args.projectId,
      uploadedBy: user._id,
      createdAt: Date.now(),
    });
  },
});

export const listByTask = query({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];
    const attachments = await ctx.db.query("attachments").withIndex("by_task", (q) => q.eq("taskId", args.taskId)).collect();
    return enrichAttachments(ctx, attachments);
  },
});

export const listBySubtask = query({
  args: { subtaskId: v.id("subtasks") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];
    const attachments = await ctx.db.query("attachments").withIndex("by_subtask", (q) => q.eq("subtaskId", args.subtaskId)).collect();
    return enrichAttachments(ctx, attachments);
  },
});

export const listByWorkOrder = query({
  args: { workOrderId: v.id("workOrders") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];
    const attachments = await ctx.db.query("attachments").withIndex("by_work_order", (q) => q.eq("workOrderId", args.workOrderId)).collect();
    return enrichAttachments(ctx, attachments);
  },
});

export const listByProject = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];
    const attachments = await ctx.db.query("attachments").withIndex("by_project", (q) => q.eq("projectId", args.projectId)).collect();
    return enrichAttachments(ctx, attachments);
  },
});

async function enrichAttachments(ctx: any, attachments: any[]) {
  return Promise.all(
    attachments
      .sort((a: any, b: any) => b.createdAt - a.createdAt)
      .map(async (att: any) => {
        const url = await ctx.storage.getUrl(att.storageId);
        const uploader = await ctx.db.get(att.uploadedBy);
        return { ...att, url, uploaderName: uploader?.name ?? "Unknown" };
      })
  );
}

export const remove = mutation({
  args: { id: v.id("attachments") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");
    const attachment = await ctx.db.get(args.id);
    if (!attachment) throw new Error("Not found");
    await ctx.storage.delete(attachment.storageId);
    await ctx.db.delete(args.id);
  },
});