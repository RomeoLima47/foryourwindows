import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getCurrentUser } from "./users";

export const list = query({
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    const contacts = await ctx.db
      .query("recentContacts")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    // Sort: favorites first, then by most recent
    return contacts.sort((a, b) => {
      if (a.isFavorite && !b.isFavorite) return -1;
      if (!a.isFavorite && b.isFavorite) return 1;
      return b.lastUsedAt - a.lastUsedAt;
    });
  },
});

export const trackContact = mutation({
  args: {
    email: v.string(),
    name: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    // Check if contact already exists
    const existing = await ctx.db
      .query("recentContacts")
      .withIndex("by_user_email", (q) =>
        q.eq("userId", user._id).eq("email", args.email)
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        lastUsedAt: Date.now(),
        name: args.name ?? existing.name,
      });
      return existing._id;
    }

    return await ctx.db.insert("recentContacts", {
      userId: user._id,
      email: args.email,
      name: args.name,
      isFavorite: false,
      lastUsedAt: Date.now(),
    });
  },
});

export const toggleFavorite = mutation({
  args: { id: v.id("recentContacts") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const contact = await ctx.db.get(args.id);
    if (!contact || contact.userId !== user._id) {
      throw new Error("Contact not found");
    }

    await ctx.db.patch(args.id, { isFavorite: !contact.isFavorite });
  },
});

export const remove = mutation({
  args: { id: v.id("recentContacts") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const contact = await ctx.db.get(args.id);
    if (!contact || contact.userId !== user._id) {
      throw new Error("Contact not found");
    }

    await ctx.db.delete(args.id);
  },
});