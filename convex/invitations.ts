import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getCurrentUser } from "./users";
import { createNotification } from "./notifications";

export const listForProject = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    const invitations = await ctx.db
      .query("invitations")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();

    const enriched = await Promise.all(
      invitations.map(async (inv) => {
        const inviter = await ctx.db.get(inv.inviterId);
        return { ...inv, inviterName: (inviter as any)?.name ?? "Unknown" };
      })
    );

    return enriched;
  },
});

export const listMyPending = query({
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    const allByEmail = await ctx.db
      .query("invitations")
      .withIndex("by_email", (q) => q.eq("email", user.email))
      .collect();

    const pending = allByEmail.filter((inv) => inv.status === "pending");

    const enriched = await Promise.all(
      pending.map(async (inv) => {
        const inviter = await ctx.db.get(inv.inviterId);
        const project = await ctx.db.get(inv.projectId);
        return {
          ...inv,
          inviterName: (inviter as any)?.name ?? "Unknown",
          projectName: (project as any)?.name ?? "Unknown",
        };
      })
    );

    return enriched;
  },
});

export const send = mutation({
  args: {
    projectId: v.id("projects"),
    email: v.string(),
    role: v.union(v.literal("editor"), v.literal("viewer")),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const project = await ctx.db.get(args.projectId);
    if (!project || project.ownerId !== user._id) {
      throw new Error("Only the project owner can send invitations");
    }

    // Check for existing pending invite
    const allByEmail = await ctx.db
      .query("invitations")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .collect();

    const existing = allByEmail.find(
      (inv) => inv.projectId === args.projectId && inv.status === "pending"
    );

    if (existing) {
      throw new Error("An invitation is already pending for this email");
    }

    if (args.email === user.email) {
      throw new Error("You cannot invite yourself");
    }

    await ctx.db.insert("invitations", {
      projectId: args.projectId,
      email: args.email,
      role: args.role,
      inviterId: user._id,
      status: "pending",
      createdAt: Date.now(),
    });

    // Track as recent contact
    const existingContact = await ctx.db
      .query("recentContacts")
      .withIndex("by_user_email", (q) =>
        q.eq("userId", user._id).eq("email", args.email)
      )
      .unique();

    if (existingContact) {
      await ctx.db.patch(existingContact._id, { lastUsedAt: Date.now() });
    } else {
      await ctx.db.insert("recentContacts", {
        userId: user._id,
        email: args.email,
        isFavorite: false,
        lastUsedAt: Date.now(),
      });
    }
  },
});

export const accept = mutation({
  args: { id: v.id("invitations") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const invitation = await ctx.db.get(args.id);
    if (!invitation) throw new Error("Invitation not found");
    if (invitation.email !== user.email) throw new Error("Not your invitation");
    if (invitation.status !== "pending") throw new Error("Invitation is no longer pending");

    await ctx.db.patch(args.id, { status: "accepted" });

    await ctx.db.insert("projectMembers", {
      projectId: invitation.projectId,
      userId: user._id,
      role: invitation.role,
      addedAt: Date.now(),
    });

    // Update the inviter's contact with the user's name
    const inviterContacts = await ctx.db
      .query("recentContacts")
      .withIndex("by_user_email", (q) =>
        q.eq("userId", invitation.inviterId).eq("email", user.email)
      )
      .unique();

    if (inviterContacts) {
      await ctx.db.patch(inviterContacts._id, { name: user.name });
    }

    await createNotification(ctx, {
      userId: invitation.inviterId,
      type: "invitation",
      title: "Invitation accepted",
      message: `${user.name} accepted your invitation.`,
      linkTo: `/projects/${invitation.projectId}`,
    });
  },
});

export const decline = mutation({
  args: { id: v.id("invitations") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const invitation = await ctx.db.get(args.id);
    if (!invitation) throw new Error("Invitation not found");
    if (invitation.email !== user.email) throw new Error("Not your invitation");

    await ctx.db.patch(args.id, { status: "declined" });
  },
});

export const revoke = mutation({
  args: { id: v.id("invitations") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const invitation = await ctx.db.get(args.id);
    if (!invitation) throw new Error("Invitation not found");

    const project = await ctx.db.get(invitation.projectId);
    if (!project || project.ownerId !== user._id) {
      throw new Error("Only the project owner can revoke invitations");
    }

    await ctx.db.delete(args.id);
  },
});