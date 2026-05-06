import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getCurrentUser } from "./users";

export const listForProject = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    const members = await ctx.db
      .query("projectMembers")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();

    const enriched = await Promise.all(
      members.map(async (member) => {
        const memberUser = await ctx.db.get(member.userId);
        return {
          ...member,
          name: memberUser?.name ?? "Unknown",
          email: memberUser?.email ?? "",
          imageUrl: memberUser?.imageUrl,
        };
      })
    );

    return enriched;
  },
});

export const removeMember = mutation({
  args: {
    projectId: v.id("projects"),
    memberId: v.id("projectMembers"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const project = await ctx.db.get(args.projectId);
    if (!project) throw new Error("Project not found");
    if (project.ownerId !== user._id) throw new Error("Only owners can remove members");

    const member = await ctx.db.get(args.memberId);
    if (!member) throw new Error("Member not found");
    if (member.role === "owner") throw new Error("Cannot remove the owner");

    await ctx.db.delete(args.memberId);
  },
});