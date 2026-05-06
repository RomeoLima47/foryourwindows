"use client";

import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

function formatDate(timestamp: number) {
  return new Date(timestamp).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function SettingsPage() {
  const { user } = useUser();
  const tasks = useQuery(api.tasks.list);
  const projects = useQuery(api.projects.list);

  const totalTasks = tasks?.length ?? 0;
  const completedTasks = tasks?.filter((t) => t.status === "done").length ?? 0;
  const totalProjects = projects?.length ?? 0;

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-2xl font-bold sm:text-3xl">Settings</h1>

      <div className="space-y-6">
        {/* Profile */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              {user?.imageUrl ? (
                <img src={user.imageUrl} alt="" className="h-16 w-16 rounded-full" />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-2xl font-bold text-primary-foreground">
                  {user?.firstName?.charAt(0) ?? "?"}
                </div>
              )}
              <div>
                <p className="text-lg font-semibold">
                  {user?.fullName ?? "User"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {user?.primaryEmailAddress?.emailAddress}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Member since {user?.createdAt ? formatDate(new Date(user.createdAt).getTime()) : "—"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Your Stats</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold">{totalTasks}</p>
                <p className="text-xs text-muted-foreground">Total Tasks</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-500">{completedTasks}</p>
                <p className="text-xs text-muted-foreground">Completed</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{totalProjects}</p>
                <p className="text-xs text-muted-foreground">Projects</p>
              </div>
            </div>
            {totalTasks > 0 && (
              <div className="mt-4">
                <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                  <span>Completion rate</span>
                  <span>{Math.round((completedTasks / totalTasks) * 100)}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-green-500 transition-all"
                    style={{ width: `${(completedTasks / totalTasks) * 100}%` }}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Keyboard Shortcuts */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Keyboard Shortcuts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {[
                { keys: "Ctrl + K", action: "Open global search" },
                { keys: "↑ ↓", action: "Navigate search results" },
                { keys: "Enter", action: "Select search result" },
                { keys: "Esc", action: "Close dialogs & search" },
              ].map((shortcut) => (
                <div key={shortcut.keys} className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{shortcut.action}</span>
                  <kbd className="rounded border bg-muted px-2 py-0.5 text-xs font-mono">
                    {shortcut.keys}
                  </kbd>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* About */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">About</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm text-muted-foreground">
              <div className="flex items-center justify-between">
                <span>App</span>
                <Badge variant="secondary">FH Enterprise v1.0</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>Backend</span>
                <Badge variant="secondary">Convex</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>Auth</span>
                <Badge variant="secondary">Clerk</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>Hosting</span>
                <Badge variant="secondary">Vercel</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Account Management */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Account</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-3 text-sm text-muted-foreground">
              Manage your account settings, update your profile picture, or change your password through Clerk.
            </p>
            <a
              href="https://accounts.clerk.dev/user"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
            >
              Manage account →
            </a>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
