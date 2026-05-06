import { query, mutation, type QueryCtx, type MutationCtx } from "./_generated/server";

export async function getCurrentUser(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;

  const user = await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
    .unique();

  return user;
}

export const store = mutation({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    const name =
      identity.name ??
      identity.givenName ??
      identity.email ??
      "Anonymous";

    if (existing) {
      await ctx.db.patch(existing._id, {
        name,
        email: identity.email ?? "",
        imageUrl: identity.pictureUrl,
      });
      return existing._id;
    }

    return await ctx.db.insert("users", {
      clerkId: identity.subject,
      name,
      email: identity.email ?? "",
      imageUrl: identity.pictureUrl,
    });
  },
});

export const currentUser = query({
  handler: async (ctx) => {
    return await getCurrentUser(ctx);
  },
});