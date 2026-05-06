import { query } from "./_generated/server";
import { getCurrentUser } from "./users";

export const listTeammates = query({
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    // Get all projects user is a member of
    const memberships = await ctx.db
      .query("projectMembers")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    // Get all members of those projects
    const seenIds = new Set<string>();
    const teammates: { _id: string; name: string; email: string; imageUrl?: string }[] = [];

    // Always include self
    seenIds.add(user._id);
    teammates.push({ _id: user._id, name: `${user.name} (you)`, email: user.email, imageUrl: user.imageUrl });

    for (const m of memberships) {
      const projectMembers = await ctx.db
        .query("projectMembers")
        .withIndex("by_project", (q) => q.eq("projectId", m.projectId))
        .collect();

      for (const pm of projectMembers) {
        if (!seenIds.has(pm.userId)) {
          seenIds.add(pm.userId);
          const u = await ctx.db.get(pm.userId);
          if (u) {
            teammates.push({ _id: u._id, name: u.name, email: u.email, imageUrl: u.imageUrl });
          }
        }
      }
    }

    return teammates;
  },
});