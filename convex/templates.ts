import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getCurrentUser } from "./users";

// ─── LIST ───────────────────────────────────────────────────

export const list = query({
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    const templates = await ctx.db
      .query("templates")
      .withIndex("by_owner", (q) => q.eq("ownerId", user._id))
      .collect();

    return templates.sort((a, b) => (b.updatedAt ?? b.createdAt) - (a.updatedAt ?? a.createdAt));
  },
});

export const get = query({
  args: { id: v.id("templates") },
  handler: async (ctx, args) => {
    const template = await ctx.db.get(args.id);
    if (!template) return null;
    return template;
  },
});

// ─── SAVE PROJECT AS TEMPLATE ───────────────────────────────

export const saveFromProject = mutation({
  args: {
    projectId: v.id("projects"),
    name: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const project = await ctx.db.get(args.projectId);
    if (!project) throw new Error("Project not found");

    // Gather the full hierarchy
    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();

    let subtaskTotal = 0;
    let workOrderTotal = 0;

    const taskStructures = await Promise.all(
      tasks.map(async (task) => {
        const subtasks = await ctx.db
          .query("subtasks")
          .withIndex("by_task", (q) => q.eq("taskId", task._id))
          .collect();

        subtaskTotal += subtasks.length;

        const subtaskStructures = await Promise.all(
          subtasks.map(async (st) => {
            const workOrders = await ctx.db
              .query("workOrders")
              .withIndex("by_subtask", (q) => q.eq("subtaskId", st._id))
              .collect();

            workOrderTotal += workOrders.length;

            return {
              title: st.title,
              description: st.description,
              order: st.order,
              workOrders: workOrders
                .sort((a, b) => a.order - b.order)
                .map((wo) => ({
                  title: wo.title,
                  description: wo.description,
                  order: wo.order,
                })),
            };
          })
        );

        return {
          title: task.title,
          description: task.description,
          priority: task.priority,
          subtasks: subtaskStructures.sort((a, b) => a.order - b.order),
        };
      })
    );

    const templateId = await ctx.db.insert("templates", {
      name: args.name,
      description: args.description || project.description,
      ownerId: user._id,
      structure: JSON.stringify({ tasks: taskStructures }),
      taskCount: tasks.length,
      subtaskCount: subtaskTotal,
      workOrderCount: workOrderTotal,
      usageCount: 0,
      sourceProjectId: args.projectId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Log activity
    await ctx.db.insert("activityLog", {
      userId: user._id,
      userName: user.name,
      action: "created",
      entityType: "template",
      entityId: templateId,
      entityName: args.name,
      details: JSON.stringify({ sourceProject: project.name, tasks: tasks.length, subtasks: subtaskTotal, workOrders: workOrderTotal }),
      projectId: args.projectId,
      createdAt: Date.now(),
    });

    return templateId;
  },
});

// ─── CREATE BLANK TEMPLATE ──────────────────────────────────

export const create = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    structure: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const structure = args.structure || JSON.stringify({ tasks: [] });
    const parsed = JSON.parse(structure);
    const tasks = parsed.tasks || [];
    let subtaskCount = 0;
    let workOrderCount = 0;
    for (const t of tasks) {
      const subs = t.subtasks || [];
      subtaskCount += subs.length;
      for (const s of subs) {
        workOrderCount += (s.workOrders || []).length;
      }
    }

    return await ctx.db.insert("templates", {
      name: args.name,
      description: args.description,
      ownerId: user._id,
      structure,
      taskCount: tasks.length,
      subtaskCount,
      workOrderCount,
      usageCount: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

// ─── CLONE TEMPLATE TO NEW PROJECT ──────────────────────────

export const cloneToProject = mutation({
  args: {
    templateId: v.id("templates"),
    projectName: v.string(),
    projectDescription: v.optional(v.string()),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const template = await ctx.db.get(args.templateId);
    if (!template) throw new Error("Template not found");

    // Create the project
    const projectId = await ctx.db.insert("projects", {
      name: args.projectName,
      description: args.projectDescription || template.description,
      status: "active",
      ownerId: user._id,
      startDate: args.startDate,
      endDate: args.endDate,
      createdAt: Date.now(),
    });

    // Add owner as member
    await ctx.db.insert("projectMembers", {
      projectId,
      userId: user._id,
      role: "owner",
      addedAt: Date.now(),
    });

    // Recreate the hierarchy
    const structure = JSON.parse(template.structure);
    const tasks = structure.tasks || [];

    for (const taskDef of tasks) {
      const taskId = await ctx.db.insert("tasks", {
        title: taskDef.title,
        description: taskDef.description,
        status: "todo",
        priority: taskDef.priority || "medium",
        projectId,
        ownerId: user._id,
        createdAt: Date.now(),
      });

      const subtasks = taskDef.subtasks || [];
      for (const stDef of subtasks) {
        const subtaskId = await ctx.db.insert("subtasks", {
          taskId,
          title: stDef.title,
          description: stDef.description,
          status: "todo",
          order: stDef.order ?? 0,
          createdAt: Date.now(),
        });

        const workOrders = stDef.workOrders || [];
        for (const woDef of workOrders) {
          await ctx.db.insert("workOrders", {
            subtaskId,
            title: woDef.title,
            description: woDef.description,
            status: "todo",
            order: woDef.order ?? 0,
            createdAt: Date.now(),
          });
        }
      }
    }

    // Log activity
    await ctx.db.insert("activityLog", {
      userId: user._id,
      userName: user.name,
      action: "cloned",
      entityType: "project",
      entityId: projectId,
      entityName: args.projectName,
      details: JSON.stringify({ fromTemplate: template.name, tasks: tasks.length }),
      projectId,
      createdAt: Date.now(),
    });

    return projectId;
  },
});

// ─── UPDATE ─────────────────────────────────────────────────

export const update = mutation({
  args: {
    id: v.id("templates"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    structure: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const template = await ctx.db.get(args.id);
    if (!template) throw new Error("Template not found");
    if (template.ownerId !== user._id) throw new Error("Not authorized");

    const updates: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.name !== undefined) updates.name = args.name;
    if (args.description !== undefined) updates.description = args.description;

    if (args.structure !== undefined) {
      updates.structure = args.structure;
      const parsed = JSON.parse(args.structure);
      const tasks = parsed.tasks || [];
      let subtaskCount = 0;
      let workOrderCount = 0;
      for (const t of tasks) {
        const subs = t.subtasks || [];
        subtaskCount += subs.length;
        for (const s of subs) {
          workOrderCount += (s.workOrders || []).length;
        }
      }
      updates.taskCount = tasks.length;
      updates.subtaskCount = subtaskCount;
      updates.workOrderCount = workOrderCount;
    }

    await ctx.db.patch(args.id, updates);
  },
});

// ─── DELETE ─────────────────────────────────────────────────

export const remove = mutation({
  args: { id: v.id("templates") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const template = await ctx.db.get(args.id);
    if (!template) throw new Error("Template not found");
    if (template.ownerId !== user._id) throw new Error("Not authorized");

    await ctx.db.delete(args.id);
  },
});