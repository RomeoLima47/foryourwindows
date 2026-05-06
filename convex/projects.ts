import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getCurrentUser } from "./users";

export const list = query({
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    const ownedProjects = await ctx.db
      .query("projects")
      .withIndex("by_owner", (q) => q.eq("ownerId", user._id))
      .collect();

    const memberships = await ctx.db
      .query("projectMembers")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const memberProjectIds = memberships
      .filter((m) => m.role !== "owner")
      .map((m) => m.projectId);

    const memberProjects = await Promise.all(
      memberProjectIds.map(async (pid) => ctx.db.get(pid))
    );

    const ownedWithMeta = ownedProjects.map((p) => ({
      ...p,
      isOwner: true,
      ownerName: user.name,
    }));

    const sharedWithMeta = await Promise.all(
      memberProjects
        .filter((p): p is NonNullable<typeof p> => p !== null)
        .map(async (p) => {
          const owner = await ctx.db.get(p.ownerId);
          return {
            ...p,
            isOwner: false,
            ownerName: (owner as any)?.name ?? "Unknown",
          };
        })
    );

    return [...ownedWithMeta, ...sharedWithMeta].sort(
      (a, b) => b.createdAt - a.createdAt
    );
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const projectId = await ctx.db.insert("projects", {
      name: args.name,
      description: args.description,
      status: "active",
      ownerId: user._id,
      startDate: args.startDate,
      endDate: args.endDate,
      createdAt: Date.now(),
    });

    await ctx.db.insert("projectMembers", {
      projectId,
      userId: user._id,
      role: "owner",
      addedAt: Date.now(),
    });

    // Activity log
    await ctx.db.insert("activityLog", {
      userId: user._id,
      userName: user.name,
      action: "created",
      entityType: "project",
      entityId: projectId,
      entityName: args.name,
      projectId,
      createdAt: Date.now(),
    });

    return projectId;
  },
});

export const update = mutation({
  args: {
    id: v.id("projects"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    status: v.optional(v.union(v.literal("active"), v.literal("archived"))),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    color: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const project = await ctx.db.get(args.id);
    if (!project) throw new Error("Project not found");
    if (project.ownerId !== user._id) throw new Error("Not authorized");

    const { id, ...fields } = args;

    // Build change details for audit log
    const changes: Record<string, { from: unknown; to: unknown }> = {};
    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined && (project as any)[key] !== value) {
        changes[key] = { from: (project as any)[key], to: value };
      }
    }

    await ctx.db.patch(id, fields);

    // Only log if something actually changed
    if (Object.keys(changes).length > 0) {
      const action = changes.status ? "status_changed" : "updated";
      await ctx.db.insert("activityLog", {
        userId: user._id,
        userName: user.name,
        action,
        entityType: "project",
        entityId: id,
        entityName: args.name || project.name,
        details: JSON.stringify(changes),
        projectId: id,
        createdAt: Date.now(),
      });
    }

    // Return old values for undo support
    return { previous: project };
  },
});

export const remove = mutation({
  args: { id: v.id("projects") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const project = await ctx.db.get(args.id);
    if (!project) throw new Error("Project not found");
    if (project.ownerId !== user._id) throw new Error("Not authorized");

    // Activity log before deletion
    await ctx.db.insert("activityLog", {
      userId: user._id,
      userName: user.name,
      action: "deleted",
      entityType: "project",
      entityId: args.id,
      entityName: project.name,
      createdAt: Date.now(),
    });

    const members = await ctx.db.query("projectMembers").withIndex("by_project", (q) => q.eq("projectId", args.id)).collect();
    for (const m of members) await ctx.db.delete(m._id);

    const tasks = await ctx.db.query("tasks").withIndex("by_project", (q) => q.eq("projectId", args.id)).collect();
    for (const t of tasks) {
      const subtasks = await ctx.db.query("subtasks").withIndex("by_task", (q) => q.eq("taskId", t._id)).collect();
      for (const st of subtasks) {
        const wos = await ctx.db.query("workOrders").withIndex("by_subtask", (q) => q.eq("subtaskId", st._id)).collect();
        for (const wo of wos) await ctx.db.delete(wo._id);
        await ctx.db.delete(st._id);
      }
      await ctx.db.delete(t._id);
    }

    const notes = await ctx.db.query("notes").withIndex("by_project", (q) => q.eq("projectId", args.id)).collect();
    for (const n of notes) await ctx.db.delete(n._id);

    const invitations = await ctx.db.query("invitations").withIndex("by_project", (q) => q.eq("projectId", args.id)).collect();
    for (const i of invitations) await ctx.db.delete(i._id);

    await ctx.db.delete(args.id);
  },
});