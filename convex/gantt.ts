import { query } from "./_generated/server";
import { v } from "convex/values";
import { getCurrentUser } from "./users";

export interface TimelineItem {
  id: string;
  name: string;
  entityType: "project" | "task" | "subtask";
  status: string;
  startDate?: number;
  endDate?: number;
  color?: string;
  progress: number; // 0-100
  projectId?: string;
  projectName?: string;
  parentId?: string;
  depth: number;
  assigneeName?: string;
  priority?: string;
}

// ─── Get all timeline items for Gantt chart ─────────────────────
export const timelineItems = query({
  args: {
    projectId: v.optional(v.id("projects")),
  },
  handler: async (ctx, args): Promise<TimelineItem[]> => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    const items: TimelineItem[] = [];

    // Get projects (filtered or all)
    let projects;
    if (args.projectId) {
      const p = await ctx.db.get(args.projectId);
      projects = p ? [p] : [];
    } else {
      // Get projects where user is owner or member
      const ownedProjects = await ctx.db
        .query("projects")
        .withIndex("by_owner", (q) => q.eq("ownerId", user._id))
        .collect();

      const memberEntries = await ctx.db
        .query("projectMembers")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .collect();

      const memberProjectIds = new Set(memberEntries.map((m) => m.projectId));
      const memberProjects = await Promise.all(
        Array.from(memberProjectIds)
          .filter((pid) => !ownedProjects.some((p) => p._id === pid))
          .map((pid) => ctx.db.get(pid))
      );

      projects = [...ownedProjects, ...memberProjects.filter(Boolean)] as any[];
    }

    // Filter to active projects only
    projects = projects.filter((p) => p.status === "active");

    for (const project of projects) {
      // Get all tasks for this project
      const tasks = await ctx.db
        .query("tasks")
        .withIndex("by_project", (q) => q.eq("projectId", project._id))
        .collect();

      const doneTasks = tasks.filter((t) => t.status === "done").length;
      const projectProgress = tasks.length > 0
        ? Math.round((doneTasks / tasks.length) * 100)
        : 0;

      // Add project bar
      items.push({
        id: project._id,
        name: project.name,
        entityType: "project",
        status: project.status,
        startDate: project.startDate,
        endDate: project.endDate,
        color: project.color || "#3b82f6",
        progress: projectProgress,
        depth: 0,
      });

      // Add tasks under project
      for (const task of tasks) {
        let assigneeName: string | undefined;
        if (task.assigneeId) {
          const assignee = await ctx.db.get(task.assigneeId);
          assigneeName = (assignee as any)?.name;
        }

        // Get subtasks for progress calc
        const subtasks = await ctx.db
          .query("subtasks")
          .withIndex("by_task", (q) => q.eq("taskId", task._id))
          .collect();

        const doneSubtasks = subtasks.filter((s) => s.status === "done").length;
        const taskProgress = task.status === "done" ? 100
          : subtasks.length > 0 ? Math.round((doneSubtasks / subtasks.length) * 100)
          : task.status === "in_progress" ? 50 : 0;

        items.push({
          id: task._id,
          name: task.title,
          entityType: "task",
          status: task.status,
          startDate: task.startDate,
          endDate: task.endDate,
          color: task.color || project.color || "#3b82f6",
          progress: taskProgress,
          projectId: project._id,
          projectName: project.name,
          parentId: project._id,
          depth: 1,
          assigneeName,
          priority: task.priority,
        });

        // Add subtasks under task
        const sortedSubtasks = subtasks.sort((a, b) => a.order - b.order);
        for (const subtask of sortedSubtasks) {
          let subAssigneeName: string | undefined;
          if (subtask.assigneeId) {
            const assignee = await ctx.db.get(subtask.assigneeId);
            subAssigneeName = (assignee as any)?.name;
          }

          const workOrders = await ctx.db
            .query("workOrders")
            .withIndex("by_subtask", (q) => q.eq("subtaskId", subtask._id))
            .collect();

          const doneWos = workOrders.filter((w) => w.status === "done").length;
          const subProgress = subtask.status === "done" ? 100
            : workOrders.length > 0 ? Math.round((doneWos / workOrders.length) * 100)
            : subtask.status === "in_progress" ? 50 : 0;

          items.push({
            id: subtask._id,
            name: subtask.title,
            entityType: "subtask",
            status: subtask.status,
            startDate: subtask.startDate,
            endDate: subtask.endDate,
            color: project.color || "#3b82f6",
            progress: subProgress,
            projectId: project._id,
            projectName: project.name,
            parentId: task._id,
            depth: 2,
            assigneeName: subAssigneeName,
          });
        }
      }
    }

    return items;
  },
});

// ─── Mini timeline for dashboard (projects only) ────────────────
export const projectTimelines = query({
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    // Get projects where user is owner or member
    const ownedProjects = await ctx.db
      .query("projects")
      .withIndex("by_owner", (q) => q.eq("ownerId", user._id))
      .collect();

    const memberEntries = await ctx.db
      .query("projectMembers")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const memberProjectIds = new Set(memberEntries.map((m) => m.projectId));
    const memberProjects = await Promise.all(
      Array.from(memberProjectIds)
        .filter((pid) => !ownedProjects.some((p) => p._id === pid))
        .map((pid) => ctx.db.get(pid))
    );

    const allProjects = [...ownedProjects, ...memberProjects.filter(Boolean)] as any[];
    const active = allProjects.filter((p) => p.status === "active");

    const result = await Promise.all(
      active.map(async (project) => {
        const tasks = await ctx.db
          .query("tasks")
          .withIndex("by_project", (q) => q.eq("projectId", project._id))
          .collect();

        const done = tasks.filter((t) => t.status === "done").length;
        const progress = tasks.length > 0 ? Math.round((done / tasks.length) * 100) : 0;

        return {
          id: project._id,
          name: project.name,
          startDate: project.startDate,
          endDate: project.endDate,
          color: project.color || "#3b82f6",
          progress,
          taskCount: tasks.length,
          doneTasks: done,
        };
      })
    );

    return result.filter((p) => p.startDate || p.endDate);
  },
});