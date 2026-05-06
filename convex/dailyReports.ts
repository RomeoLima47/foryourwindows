import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getCurrentUser } from "./users";

// ─── Helper: check if user has owner/editor access to project ────
async function checkEditAccess(ctx: any, projectId: any) {
  const user = await getCurrentUser(ctx);
  if (!user) throw new Error("Not authenticated");

  // Check project membership
  const members = await ctx.db
    .query("projectMembers")
    .withIndex("by_project", (q: any) => q.eq("projectId", projectId))
    .collect();

  const membership = members.find((m: any) => m.userId === user._id);

  // Project owner always has access
  const project = await ctx.db.get(projectId);
  if (project && project.ownerId === user._id) return user;

  // Must be owner or editor
  if (!membership || membership.role === "viewer") {
    throw new Error("Access denied — daily reports are restricted to admins and editors");
  }

  return user;
}

async function checkViewAccess(ctx: any, projectId: any) {
  const user = await getCurrentUser(ctx);
  if (!user) return null;

  // Project owner always has access
  const project = await ctx.db.get(projectId);
  if (project && project.ownerId === user._id) return user;

  // Check membership — viewer role is excluded
  const members = await ctx.db
    .query("projectMembers")
    .withIndex("by_project", (q: any) => q.eq("projectId", projectId))
    .collect();

  const membership = members.find((m: any) => m.userId === user._id);
  if (!membership || membership.role === "viewer") return null;

  return user;
}

// ─── List reports for a project (owner/editor only) ─────────────
export const listByProject = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const user = await checkViewAccess(ctx, args.projectId);
    if (!user) return [];

    const reports = await ctx.db
      .query("dailyReports")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();

    return reports.sort((a, b) => b.date - a.date);
  },
});

// ─── Get a single report ────────────────────────────────────────
export const get = query({
  args: { id: v.id("dailyReports") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;

    const report = await ctx.db.get(args.id);
    if (!report) return null;

    // Check access
    const accessUser = await checkViewAccess(ctx, report.projectId);
    if (!accessUser) return null;

    return report;
  },
});

// ─── Check if report exists for a project+date ─────────────────
export const getByDate = query({
  args: {
    projectId: v.id("projects"),
    date: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await checkViewAccess(ctx, args.projectId);
    if (!user) return null;

    const reports = await ctx.db
      .query("dailyReports")
      .withIndex("by_project_date", (q) =>
        q.eq("projectId", args.projectId).eq("date", args.date)
      )
      .collect();

    return reports[0] ?? null;
  },
});

// ─── Create a new daily report ──────────────────────────────────
export const create = mutation({
  args: {
    projectId: v.id("projects"),
    date: v.number(),
    weather: v.optional(v.string()),
    crewEntries: v.optional(v.string()),
    totalCrewCount: v.optional(v.number()),
    totalManHours: v.optional(v.number()),
    workPerformed: v.optional(v.string()),
    materialsUsed: v.optional(v.string()),
    equipmentOnSite: v.optional(v.string()),
    safetyNotes: v.optional(v.string()),
    delays: v.optional(v.string()),
    visitors: v.optional(v.string()),
    status: v.optional(v.union(v.literal("draft"), v.literal("submitted"))),
  },
  handler: async (ctx, args) => {
    const user = await checkEditAccess(ctx, args.projectId);

    // Check if report already exists for this date
    const existing = await ctx.db
      .query("dailyReports")
      .withIndex("by_project_date", (q) =>
        q.eq("projectId", args.projectId).eq("date", args.date)
      )
      .collect();

    if (existing.length > 0) {
      throw new Error("A report already exists for this date. Edit the existing report instead.");
    }

    const now = Date.now();
    return await ctx.db.insert("dailyReports", {
      projectId: args.projectId,
      date: args.date,
      status: args.status ?? "draft",
      weather: args.weather,
      crewEntries: args.crewEntries,
      totalCrewCount: args.totalCrewCount,
      totalManHours: args.totalManHours,
      workPerformed: args.workPerformed,
      materialsUsed: args.materialsUsed,
      equipmentOnSite: args.equipmentOnSite,
      safetyNotes: args.safetyNotes,
      delays: args.delays,
      visitors: args.visitors,
      authorId: user._id,
      authorName: user.name,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// ─── Update an existing report ──────────────────────────────────
export const update = mutation({
  args: {
    id: v.id("dailyReports"),
    weather: v.optional(v.string()),
    crewEntries: v.optional(v.string()),
    totalCrewCount: v.optional(v.number()),
    totalManHours: v.optional(v.number()),
    workPerformed: v.optional(v.string()),
    materialsUsed: v.optional(v.string()),
    equipmentOnSite: v.optional(v.string()),
    safetyNotes: v.optional(v.string()),
    delays: v.optional(v.string()),
    visitors: v.optional(v.string()),
    status: v.optional(v.union(v.literal("draft"), v.literal("submitted"))),
  },
  handler: async (ctx, args) => {
    const report = await ctx.db.get(args.id);
    if (!report) throw new Error("Report not found");

    await checkEditAccess(ctx, report.projectId);

    const { id, ...fields } = args;

    // Remove undefined fields
    const updates: Record<string, any> = { updatedAt: Date.now() };
    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined) updates[key] = value;
    }

    await ctx.db.patch(id, updates);
  },
});

// ─── Delete a report ────────────────────────────────────────────
export const remove = mutation({
  args: { id: v.id("dailyReports") },
  handler: async (ctx, args) => {
    const report = await ctx.db.get(args.id);
    if (!report) throw new Error("Report not found");

    await checkEditAccess(ctx, report.projectId);
    await ctx.db.delete(args.id);
  },
});

// ─── Submit a draft report ──────────────────────────────────────
export const submit = mutation({
  args: { id: v.id("dailyReports") },
  handler: async (ctx, args) => {
    const report = await ctx.db.get(args.id);
    if (!report) throw new Error("Report not found");

    await checkEditAccess(ctx, report.projectId);

    await ctx.db.patch(args.id, {
      status: "submitted",
      updatedAt: Date.now(),
    });
  },
});

// ─── Reopen a submitted report (back to draft) ─────────────────
export const reopen = mutation({
  args: { id: v.id("dailyReports") },
  handler: async (ctx, args) => {
    const report = await ctx.db.get(args.id);
    if (!report) throw new Error("Report not found");

    await checkEditAccess(ctx, report.projectId);

    await ctx.db.patch(args.id, {
      status: "draft",
      updatedAt: Date.now(),
    });
  },
});

// ─── Get report stats for a project (summary for dashboard) ────
export const projectStats = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const user = await checkViewAccess(ctx, args.projectId);
    if (!user) return null;

    const reports = await ctx.db
      .query("dailyReports")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();

    const submitted = reports.filter((r) => r.status === "submitted").length;
    const drafts = reports.filter((r) => r.status === "draft").length;
    const totalManHours = reports.reduce((sum, r) => sum + (r.totalManHours ?? 0), 0);
    const lastReport = reports.sort((a, b) => b.date - a.date)[0];

    return {
      total: reports.length,
      submitted,
      drafts,
      totalManHours,
      lastReportDate: lastReport?.date,
    };
  },
});