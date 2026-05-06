"use client";

import React from "react";
import { useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { api } from "../../../../convex/_generated/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DashboardSkeleton } from "@/components/skeletons";

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function formatCountdown(endDate: number) {
  const diff = endDate - Date.now();
  const days = Math.round(diff / (1000 * 60 * 60 * 24));
  if (days < 0) return { text: `${Math.abs(days)}d overdue`, color: "text-red-500 font-medium" };
  if (days === 0) return { text: "today", color: "text-orange-500 font-medium" };
  if (days === 1) return { text: "tomorrow", color: "text-orange-500" };
  if (days <= 3) return { text: `${days}d left`, color: "text-yellow-500" };
  return { text: `${days}d left`, color: "text-muted-foreground" };
}

/* ─── Mini Project Timeline ──────────────────────────────────── */
function MiniTimeline() {
  const router = useRouter();
  const timelines = useQuery(api.gantt.projectTimelines);

  if (!timelines || timelines.length === 0) return null;

  // Calculate range across all projects
  const now = Date.now();
  let minDate = now;
  let maxDate = now;
  for (const p of timelines) {
    if (p.startDate && p.startDate < minDate) minDate = p.startDate;
    if (p.endDate && p.endDate > maxDate) maxDate = p.endDate;
  }
  // Add padding
  const range = maxDate - minDate || 1;
  const padded = range * 0.1;
  minDate -= padded;
  maxDate += padded;
  const totalRange = maxDate - minDate;

  const todayPct = ((now - minDate) / totalRange) * 100;

  return (
    <Card>
      <CardContent className="pt-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">📊 Project Timeline</h2>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs"
            onClick={() => router.push("/timeline")}
          >
            Full view →
          </Button>
        </div>
        <div className="space-y-2.5">
          {timelines.map((project) => {
            const start = project.startDate || now;
            const end = project.endDate || now;
            const barLeft = ((start - minDate) / totalRange) * 100;
            const barWidth = Math.max(((end - start) / totalRange) * 100, 2);

            return (
              <div
                key={project.id}
                className="cursor-pointer group"
                onClick={() => router.push(`/projects/${project.id}`)}
              >
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-xs font-medium truncate group-hover:text-primary transition-colors">
                    {project.name}
                  </span>
                  <span className="text-[10px] text-muted-foreground ml-2 flex-shrink-0">
                    {project.progress}%
                  </span>
                </div>
                <div className="relative h-4 w-full rounded-full bg-muted overflow-hidden">
                  {/* Bar background */}
                  <div
                    className="absolute top-0 h-full rounded-full opacity-25"
                    style={{
                      left: `${barLeft}%`,
                      width: `${barWidth}%`,
                      backgroundColor: project.color,
                    }}
                  />
                  {/* Progress fill */}
                  <div
                    className="absolute top-0 h-full rounded-full transition-all"
                    style={{
                      left: `${barLeft}%`,
                      width: `${barWidth * (project.progress / 100)}%`,
                      backgroundColor: project.color,
                    }}
                  />
                  {/* Today marker */}
                  {todayPct >= barLeft && todayPct <= barLeft + barWidth && (
                    <div
                      className="absolute top-0 h-full w-px bg-foreground/40"
                      style={{ left: `${todayPct}%` }}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
        {/* Today marker label */}
        <div className="mt-2 flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <span className="inline-block h-2 w-px bg-foreground/40" />
          <span>Today</span>
          <span className="ml-auto">{timelines.length} active project{timelines.length !== 1 ? "s" : ""}</span>
        </div>
      </CardContent>
    </Card>
  );
}

/* ─── Dashboard ──────────────────────────────────────────────── */
export default function DashboardPage() {
  const router = useRouter();
  const { user } = useUser();
  const tasks = useQuery(api.tasks.list);
  const projects = useQuery(api.projects.list);
  const deadlines = useQuery(api.activity.upcomingDeadlines);
  const recentActivity = useQuery(api.activity.recentActivity);

  if (tasks === undefined || projects === undefined) return <DashboardSkeleton />;

  const totalTasks = tasks.length;
  const activeTasks = tasks.filter((t) => t.status !== "done").length;
  const doneTasks = tasks.filter((t) => t.status === "done").length;
  const overdueTasks = tasks.filter((t) => t.status !== "done" && t.endDate && t.endDate < Date.now()).length;
  const activeProjects = projects.filter((p) => p.status === "active").length;

  const subtitle = overdueTasks > 0
    ? `${overdueTasks} overdue — let's get those done`
    : activeTasks > 0
    ? `${activeTasks} active tasks across ${activeProjects} projects`
    : "All caught up!";

  return (
    <div>
      {/* Greeting */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold sm:text-3xl">
          {getGreeting()}, {user?.firstName ?? "there"} 👋
        </h1>
        <p className="mt-1 text-muted-foreground">{subtitle}</p>
      </div>

      {/* Quick actions */}
      <div className="mb-6 flex flex-wrap gap-2">
        <Button size="sm" onClick={() => router.push("/tasks")}>📋 Tasks</Button>
        <Button size="sm" variant="outline" onClick={() => router.push("/board")}>📊 Board</Button>
        <Button size="sm" variant="outline" onClick={() => router.push("/timeline")}>📊 Timeline</Button>
        <Button size="sm" variant="outline" onClick={() => router.push("/analytics")}>📈 Analytics</Button>
        <Button size="sm" variant="outline" onClick={() => router.push("/calendar")}>📅 Calendar</Button>
      </div>

      {/* Stats */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="cursor-pointer transition-all hover:shadow-md" onClick={() => router.push("/tasks")}>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Total Tasks</p>
            <p className="text-2xl font-bold">{totalTasks}</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer transition-all hover:shadow-md" onClick={() => router.push("/tasks")}>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Active</p>
            <p className="text-2xl font-bold">{activeTasks}</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer transition-all hover:shadow-md" onClick={() => router.push("/tasks")}>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Completed</p>
            <p className="text-2xl font-bold text-green-500">{doneTasks}</p>
          </CardContent>
        </Card>
        <Card className={`cursor-pointer transition-all hover:shadow-md ${overdueTasks > 0 ? "ring-1 ring-red-500/30" : ""}`} onClick={() => router.push("/tasks")}>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Overdue</p>
            <p className={`text-2xl font-bold ${overdueTasks > 0 ? "text-red-500" : ""}`}>{overdueTasks}</p>
          </CardContent>
        </Card>
      </div>

      {/* ─── Three-column grid: Deadlines | Activity | Timeline ─── */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Upcoming Deadlines */}
        <Card>
          <CardContent className="pt-4">
            <h2 className="mb-3 text-sm font-semibold">📅 Upcoming Deadlines</h2>
            {!deadlines || deadlines.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">No upcoming deadlines.</p>
            ) : (
              <div className="space-y-2">
                {deadlines.map((d) => {
                  const countdown = formatCountdown(d.endDate);
                  return (
                    <div
                      key={d._id}
                      className="flex cursor-pointer items-center justify-between rounded-md border p-2 transition-colors hover:bg-muted/50"
                      onClick={() => {
                        if (d.projectId) router.push(`/projects/${d.projectId}/tasks/${d._id}`);
                        else router.push("/tasks");
                      }}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{d.title}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {d.projectName && <span>📁 {d.projectName}</span>}
                          <Badge variant="secondary" className="text-[10px]">{d.priority}</Badge>
                        </div>
                      </div>
                      <span className={`ml-2 whitespace-nowrap text-xs ${countdown.color}`}>{countdown.text}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardContent className="pt-4">
            <h2 className="mb-3 text-sm font-semibold">💬 Recent Activity</h2>
            {!recentActivity || recentActivity.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">No recent activity.</p>
            ) : (
              <div className="space-y-2">
                {recentActivity.map((note: any) => (
                  <div
                    key={note._id}
                    className="cursor-pointer rounded-md border p-2 transition-colors hover:bg-muted/50"
                    onClick={() => router.push(`/projects/${note.projectId}`)}
                  >
                    <p className="text-sm">{note.content}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {note.authorName} · {note.projectName} · {new Date(note.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Mini Timeline */}
        <MiniTimeline />
      </div>
    </div>
  );
}
