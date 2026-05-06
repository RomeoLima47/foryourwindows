import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getCurrentUser } from "./users";
import { createNotification } from "./notifications";

export const listByProject = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    const notes = await ctx.db
      .query("notes")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .order("desc")
      .collect();

    const notesWithAuthors = await Promise.all(
      notes.map(async (note) => {
        const author = await ctx.db.get(note.authorId);
        return { ...note, authorName: author?.name ?? "Unknown" };
      })
    );

    return notesWithAuthors;
  },
});

export const create = mutation({
  args: {
    content: v.string(),
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const project = await ctx.db.get(args.projectId);

    await ctx.db.insert("notes", {
      content: args.content,
      projectId: args.projectId,
      authorId: user._id,
      createdAt: Date.now(),
    });

    if (project) {
      await createNotification(ctx, {
        userId: user._id,
        type: "system",
        title: "Note added",
        message: `New note in "${project.name}": ${args.content.slice(0, 80)}${args.content.length > 80 ? "..." : ""}`,
        linkTo: `/projects/${args.projectId}`,
      });
    }
  },
});

export const remove = mutation({
  args: { id: v.id("notes") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const note = await ctx.db.get(args.id);
    if (!note) throw new Error("Note not found");
    if (note.authorId !== user._id) throw new Error("Not authorized");

    await ctx.db.delete(args.id);
  },
});