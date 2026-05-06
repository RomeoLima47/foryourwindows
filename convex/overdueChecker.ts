import { internalMutation } from "./_generated/server";
import { createNotification } from "./notifications";

export const checkOverdueTasks = internalMutation({
  handler: async (ctx) => {
    const now = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;

    // Get all users
    const users = await ctx.db.query("users").collect();

    for (const user of users) {
      const tasks = await ctx.db
        .query("tasks")
        .withIndex("by_owner", (q) => q.eq("ownerId", user._id))
        .collect();

      for (const task of tasks) {
        if (task.status === "done" || !task.endDate) continue;

        // Check if overdue
        if (task.endDate < now) {
          await createNotification(ctx, {
            userId: user._id,
            type: "overdue",
            title: "Task overdue",
            message: `"${task.title}" is past its end date.`,
            linkTo: task.projectId ? `/projects/${task.projectId}/tasks/${task._id}` : "/tasks",
          });
        }
        // Check if due soon (within 24h)
        else if (task.endDate - now < oneDayMs) {
          await createNotification(ctx, {
            userId: user._id,
            type: "due_soon",
            title: "Task due soon",
            message: `"${task.title}" is due within 24 hours.`,
            linkTo: task.projectId ? `/projects/${task.projectId}/tasks/${task._id}` : "/tasks",
          });
        }
      }
    }
  },
});