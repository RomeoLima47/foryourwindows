import { query, mutation, type MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import { getCurrentUser } from "./users";

export async function createNotification(
  ctx: MutationCtx,
  args: {
    userId: string;
    type:
      | "task_completed"
      | "due_soon"
      | "overdue"
      | "invitation"
      | "comment"
      | "system";
    title: string;
    message: string;
    linkTo?: string;
  }
) {
  await ctx.db.insert("notifications", {
    userId: args.userId as any,
    type: args.type,
    title: args.title,
    message: args.message,
    linkTo: args.linkTo,
    read: false,
    createdAt: Date.now(),
  });
}

export const list = query({
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];
    return await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(50);
  },
});

export const unreadCount = query({
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return 0;
    const all = await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    return all.filter((n) => !n.read).length;
  },
});

export const markAsRead = mutation({
  args: { id: v.id("notifications") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");
    const notification = await ctx.db.get(args.id);
    if (!notification || notification.userId !== user._id) throw new Error("Not found");
    await ctx.db.patch(args.id, { read: true });
  },
});

export const markAllAsRead = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");
    const all = await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    for (const n of all.filter((n) => !n.read)) {
      await ctx.db.patch(n._id, { read: true });
    }
  },
});

export const remove = mutation({
  args: { id: v.id("notifications") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");
    const notification = await ctx.db.get(args.id);
    if (!notification || notification.userId !== user._id) throw new Error("Not found");
    await ctx.db.delete(args.id);
  },
});

// Delete ALL notifications for the user
export const clearAll = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");
    const all = await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    for (const n of all) {
      await ctx.db.delete(n._id);
    }
  },
});