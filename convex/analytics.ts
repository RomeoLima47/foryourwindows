import { query } from "./_generated/server";
import { getCurrentUser } from "./users";

export const overview = query({
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;

    // Get all user tasks (owned + shared)
    const ownTasks = await ctx.db
      .query("tasks")
      .withIndex("by_owner", (q) => q.eq("ownerId", user._id))
      .collect();

    const memberships = await ctx.db
      .query("projectMembers")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const sharedProjectIds = memberships
      .filter((m) => m.role !== "owner")
      .map((m) => m.projectId);

    const sharedTasks = [];
    for (const pid of sharedProjectIds) {
      const projectTasks = await ctx.db
        .query("tasks")
        .withIndex("by_project", (q) => q.eq("projectId", pid))
        .collect();
      sharedTasks.push(...projectTasks);
    }

    const allIds = new Set<string>();
	const tasks: (typeof ownTasks)[number][] = [];
    for (const t of [...ownTasks, ...sharedTasks]) {
      if (!allIds.has(t._id)) {
        allIds.add(t._id);
        tasks.push(t);
      }
    }

    // Get projects
    const ownedProjects = await ctx.db
      .query("projects")
      .withIndex("by_owner", (q) => q.eq("ownerId", user._id))
      .collect();

    const sharedProjects = [];
    for (const m of memberships.filter((m) => m.role !== "owner")) {
      const p = await ctx.db.get(m.projectId);
      if (p) sharedProjects.push(p);
    }

    const projectSet = new Set<string>();
    const projects: (typeof ownedProjects)[number][] = [];
    for (const p of [...ownedProjects, ...sharedProjects]) {
      if (!projectSet.has(p._id)) {
        projectSet.add(p._id);
        projects.push(p);
      }
    }

    // Task stats
    const totalTasks = tasks.length;
    const todoCount = tasks.filter((t) => t.status === "todo").length;
    const inProgressCount = tasks.filter((t) => t.status === "in_progress").length;
    const doneCount = tasks.filter((t) => t.status === "done").length;
    const completionRate = totalTasks > 0 ? Math.round((doneCount / totalTasks) * 100) : 0;

    // Priority breakdown
    const highCount = tasks.filter((t) => t.priority === "high").length;
    const mediumCount = tasks.filter((t) => t.priority === "medium").length;
    const lowCount = tasks.filter((t) => t.priority === "low").length;

    // Overdue tasks
    const now = Date.now();
    const overdueTasks = tasks.filter(
      (t) => t.endDate && t.endDate < now && t.status !== "done"
    );

    // Tasks completed in last 7 days
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
    const recentlyCompleted = tasks.filter(
      (t) => t.status === "done" && t.createdAt > sevenDaysAgo
    );

    // Tasks by day (last 14 days) - creation trend
    const fourteenDaysAgo = now - 14 * 24 * 60 * 60 * 1000;
    const dailyCreated: Record<string, number> = {};
    const dailyCompleted: Record<string, number> = {};

    for (let i = 13; i >= 0; i--) {
      const date = new Date(now - i * 24 * 60 * 60 * 1000);
      const key = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      dailyCreated[key] = 0;
      dailyCompleted[key] = 0;
    }

    for (const task of tasks) {
      if (task.createdAt > fourteenDaysAgo) {
        const key = new Date(task.createdAt).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        });
        if (dailyCreated[key] !== undefined) {
          dailyCreated[key]++;
        }
      }
    }

    // Use createdAt as proxy for completion date for done tasks
    for (const task of tasks) {
      if (task.status === "done" && task.createdAt > fourteenDaysAgo) {
        const key = new Date(task.createdAt).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        });
        if (dailyCompleted[key] !== undefined) {
          dailyCompleted[key]++;
        }
      }
    }

    const trendData = Object.keys(dailyCreated).map((day) => ({
      day,
      created: dailyCreated[day],
      completed: dailyCompleted[day],
    }));

    // Project breakdown
    const projectStats = projects.map((project) => {
      const projectTasks = tasks.filter((t) => t.projectId === project._id);
      const done = projectTasks.filter((t) => t.status === "done").length;
      const total = projectTasks.length;
      return {
        name: project.name,
        status: project.status,
        total,
        done,
        todo: projectTasks.filter((t) => t.status === "todo").length,
        inProgress: projectTasks.filter((t) => t.status === "in_progress").length,
        completionRate: total > 0 ? Math.round((done / total) * 100) : 0,
      };
    });

    // Unassigned tasks (no project)
    const unassignedTasks = tasks.filter((t) => !t.projectId);

    return {
      totalTasks,
      todoCount,
      inProgressCount,
      doneCount,
      completionRate,
      highCount,
      mediumCount,
      lowCount,
      overdueCount: overdueTasks.length,
      recentlyCompletedCount: recentlyCompleted.length,
      totalProjects: projects.length,
      activeProjects: projects.filter((p) => p.status === "active").length,
      unassignedCount: unassignedTasks.length,
      trendData,
      projectStats,
      statusBreakdown: [
        { name: "To Do", value: todoCount, color: "#3b82f6" },
        { name: "In Progress", value: inProgressCount, color: "#eab308" },
        { name: "Done", value: doneCount, color: "#22c55e" },
      ],
      priorityBreakdown: [
        { name: "High", value: highCount, color: "#ef4444" },
        { name: "Medium", value: mediumCount, color: "#f97316" },
        { name: "Low", value: lowCount, color: "#9ca3af" },
      ],
    };
  },
});