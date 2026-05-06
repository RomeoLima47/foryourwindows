import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
export default defineSchema({
  users: defineTable({
    clerkId: v.string(),
    email: v.string(),
    name: v.string(),
    imageUrl: v.optional(v.string()),
    role: v.optional(v.string()),
    createdAt: v.optional(v.number()),
  }).index("by_clerk_id", ["clerkId"])
    .index("by_email", ["email"]),

  projects: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    status: v.union(v.literal("active"), v.literal("archived")),
    ownerId: v.id("users"),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    color: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_owner", ["ownerId"]),

  tasks: defineTable({
    title: v.string(),
    description: v.optional(v.string()),
    status: v.union(v.literal("todo"), v.literal("in_progress"), v.literal("done")),
    priority: v.union(v.literal("low"), v.literal("medium"), v.literal("high")),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    color: v.optional(v.string()),
    projectId: v.optional(v.id("projects")),
    assigneeId: v.optional(v.id("users")),
    ownerId: v.id("users"),
    createdAt: v.number(),
  }).index("by_owner", ["ownerId"])
    .index("by_project", ["projectId"]),

  subtasks: defineTable({
    taskId: v.id("tasks"),
    title: v.string(),
    description: v.optional(v.string()),
    status: v.union(v.literal("todo"), v.literal("in_progress"), v.literal("done")),
    assigneeId: v.optional(v.id("users")),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    order: v.number(),
    createdAt: v.number(),
  }).index("by_task", ["taskId"]),

  workOrders: defineTable({
    subtaskId: v.id("subtasks"),
    title: v.string(),
    description: v.optional(v.string()),
    status: v.union(v.literal("todo"), v.literal("in_progress"), v.literal("done")),
    assigneeId: v.optional(v.id("users")),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    order: v.number(),
    createdAt: v.number(),
  }).index("by_subtask", ["subtaskId"]),

  projectMembers: defineTable({
    projectId: v.id("projects"),
    userId: v.id("users"),
    role: v.union(v.literal("owner"), v.literal("editor"), v.literal("viewer")),
    addedAt: v.number(),
  }).index("by_project", ["projectId"])
    .index("by_user", ["userId"])
    .index("by_project_user", ["projectId", "userId"]),

  invitations: defineTable({
    projectId: v.id("projects"),
    email: v.string(),
    role: v.union(v.literal("editor"), v.literal("viewer")),
    inviterId: v.id("users"),
    status: v.union(v.literal("pending"), v.literal("accepted"), v.literal("declined")),
    createdAt: v.number(),
  }).index("by_project", ["projectId"])
    .index("by_email", ["email"]),

  recentContacts: defineTable({
    userId: v.id("users"),
    email: v.string(),
    name: v.optional(v.string()),
    isFavorite: v.boolean(),
    lastUsedAt: v.number(),
  }).index("by_user", ["userId"])
    .index("by_user_email", ["userId", "email"]),

  notes: defineTable({
    content: v.string(),
    projectId: v.id("projects"),
    authorId: v.id("users"),
    createdAt: v.number(),
  }).index("by_project", ["projectId"]),

  notifications: defineTable({
    userId: v.id("users"),
    type: v.union(
      v.literal("task_completed"),
      v.literal("due_soon"),
      v.literal("overdue"),
      v.literal("invitation"),
      v.literal("comment"),
      v.literal("system")
    ),
    title: v.string(),
    message: v.string(),
    linkTo: v.optional(v.string()),
    read: v.boolean(),
    createdAt: v.number(),
  }).index("by_user", ["userId"]),

  comments: defineTable({
    projectId: v.optional(v.id("projects")),
    taskId: v.optional(v.id("tasks")),
    subtaskId: v.optional(v.id("subtasks")),
    workOrderId: v.optional(v.id("workOrders")),
    authorId: v.id("users"),
    content: v.string(),
    parentId: v.optional(v.id("comments")),
    createdAt: v.number(),
  }).index("by_project", ["projectId"])
    .index("by_task", ["taskId"])
    .index("by_subtask", ["subtaskId"])
    .index("by_work_order", ["workOrderId"]),

  attachments: defineTable({
    storageId: v.id("_storage"),
    fileName: v.string(),
    fileSize: v.number(),
    fileType: v.string(),
    taskId: v.optional(v.id("tasks")),
    subtaskId: v.optional(v.id("subtasks")),
    workOrderId: v.optional(v.id("workOrders")),
    projectId: v.optional(v.id("projects")),
    uploadedBy: v.id("users"),
    createdAt: v.number(),
  }).index("by_task", ["taskId"])
    .index("by_subtask", ["subtaskId"])
    .index("by_work_order", ["workOrderId"])
    .index("by_project", ["projectId"]),

  // ═══ Project Templates ═══
  templates: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    ownerId: v.id("users"),
    structure: v.string(),
    taskCount: v.number(),
    subtaskCount: v.number(),
    workOrderCount: v.number(),
    usageCount: v.optional(v.number()),
    sourceProjectId: v.optional(v.id("projects")),
    updatedAt: v.optional(v.number()),
    createdAt: v.number(),
  }).index("by_owner", ["ownerId"]),

  // ═══ Activity Logs (Audit Trail) ═══
  activityLog: defineTable({
    userId: v.id("users"),
    userName: v.string(),
    entityType: v.union(
      v.literal("project"),
      v.literal("task"),
      v.literal("subtask"),
      v.literal("workOrder"),
      v.literal("template")
    ),
    entityId: v.string(),
    entityName: v.string(),
    projectId: v.optional(v.id("projects")),
    taskId: v.optional(v.id("tasks")),
    action: v.union(
      v.literal("created"),
      v.literal("updated"),
      v.literal("deleted"),
      v.literal("status_changed"),
      v.literal("assigned"),
      v.literal("moved"),
      v.literal("commented"),
      v.literal("template_saved"),
      v.literal("template_used"),
      v.literal("cloned")
    ),
    description: v.optional(v.string()),
    details: v.optional(v.string()),
    previousValue: v.optional(v.string()),
    newValue: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_project", ["projectId"])
    .index("by_task", ["taskId"])
    .index("by_entity", ["entityType", "entityId"])
    .index("by_user", ["userId"]),

  // ═══ Daily Field Reports ═══
  // Structured daily logs per project — weather, crew, work performed, materials, safety
  // Restricted to owner/editor roles (viewers cannot see)
  dailyReports: defineTable({
    projectId: v.id("projects"),
    date: v.number(),                    // midnight timestamp for the report date
    status: v.union(v.literal("draft"), v.literal("submitted")),
    // Weather conditions (stored as JSON string)
    // { conditions: "Sunny"|"Cloudy"|"Rainy"|"Stormy"|"Snow"|"Windy", tempHigh?: number, tempLow?: number, notes?: string }
    weather: v.optional(v.string()),
    // Crew entries (JSON array string)
    // [{ trade: "Electrician", headcount: 4, hours: 8 }, ...]
    crewEntries: v.optional(v.string()),
    totalCrewCount: v.optional(v.number()),
    totalManHours: v.optional(v.number()),
    // Narratives
    workPerformed: v.optional(v.string()),
    materialsUsed: v.optional(v.string()),
    equipmentOnSite: v.optional(v.string()),
    safetyNotes: v.optional(v.string()),
    delays: v.optional(v.string()),
    visitors: v.optional(v.string()),
    // Author info
    authorId: v.id("users"),
    authorName: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_project", ["projectId"])
    .index("by_project_date", ["projectId", "date"]),
});