import { query } from "./_generated/server";
import { getCurrentUser } from "./users";

export const recentActivity = query({
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    // Get user's projects
    const memberships = await ctx.db
      .query("projectMembers")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const projectIds = memberships.map((m) => m.projectId);
    const allNotes: any[] = [];

    for (const pid of projectIds) {
      const notes = await ctx.db
        .query("notes")
        .withIndex("by_project", (q) => q.eq("projectId", pid))
        .collect();

      const project = await ctx.db.get(pid);

      for (const note of notes) {
        const author = await ctx.db.get(note.authorId);
        allNotes.push({
          ...note,
          projectName: (project as any)?.name ?? "Unknown",
          authorName: (author as any)?.name ?? "Unknown",
        });
      }
    }

    return allNotes
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 10);
  },
});

export const upcomingDeadlines = query({
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    const ownTasks = await ctx.db
      .query("tasks")
      .withIndex("by_owner", (q) => q.eq("ownerId", user._id))
      .collect();

    const memberships = await ctx.db
      .query("projectMembers")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const memberProjectIds = memberships
      .filter((m) => m.role !== "owner")
      .map((m) => m.projectId);

    const sharedTasks: (typeof ownTasks)[number][] = [];
    for (const pid of memberProjectIds) {
      const pt = await ctx.db
        .query("tasks")
        .withIndex("by_project", (q) => q.eq("projectId", pid))
        .collect();
      sharedTasks.push(...pt);
    }

    const allIds = new Set<string>();
    const all: (typeof ownTasks)[number][] = [];
    for (const t of [...ownTasks, ...sharedTasks]) {
      if (!allIds.has(t._id)) {
        allIds.add(t._id);
        all.push(t);
      }
    }

    // Tasks with endDate that aren't done
    const upcoming = all.filter((t) => t.endDate && t.status !== "done");

    const enriched = await Promise.all(
      upcoming.map(async (t) => {
        let projectName: string | undefined;
        if (t.projectId) {
          const project = await ctx.db.get(t.projectId);
          projectName = (project as any)?.name;
        }
        return {
          _id: t._id,
          title: t.title,
          endDate: t.endDate!,
          status: t.status,
          priority: t.priority,
          projectName,
          projectId: t.projectId,
        };
      })
    );

    return enriched.sort((a, b) => a.endDate - b.endDate).slice(0, 8);
  },
});