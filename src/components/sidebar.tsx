"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "./theme-toggle";
import { NotificationBell } from "./notification-bell";

export function Sidebar() {
  const pathname = usePathname();
  const tasks = useQuery(api.tasks.list);
  const pendingInvites = useQuery(api.invitations.listMyPending);

  const todoCount = tasks?.filter((t) => t.status !== "done").length ?? 0;
  const inviteCount = pendingInvites?.length ?? 0;

  const navItems = [
    { label: "Dashboard", href: "/dashboard", icon: "📊" },
    { label: "Tasks", href: "/tasks", icon: "✅", badge: todoCount > 0 ? todoCount : undefined },
    { label: "Board", href: "/board", icon: "📋" },
    { label: "Projects", href: "/projects", icon: "📁" },
    { label: "Calendar", href: "/calendar", icon: "📅" },
    { label: "Timeline", href: "/timeline", icon: "📊" },
    { label: "Templates", href: "/templates", icon: "📄" },
    { label: "Analytics", href: "/analytics", icon: "📈" },
    { label: "Invitations", href: "/invitations", icon: "📬", badge: inviteCount > 0 ? inviteCount : undefined },
    { label: "Settings", href: "/settings", icon: "⚙️" },
  ];

  return (
    <>
      {/* Mobile top bar */}
      <div className="fixed inset-x-0 top-0 z-40 flex items-center justify-between border-b bg-card px-4 py-2 lg:hidden">
        <span className="text-lg font-bold">FH Enterprise</span>
        <div className="flex items-center gap-2">
          <NotificationBell />
          <ThemeToggle />
          <UserButton afterSignOutUrl="/sign-in" />
        </div>
      </div>

      {/* Mobile bottom tabs */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-around border-t bg-card py-1.5 lg:hidden">
        {navItems.slice(0, 5).map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-col items-center gap-0.5 px-2 py-1 text-[10px] transition-colors",
              pathname.startsWith(item.href)
                ? "text-primary font-medium"
                : "text-muted-foreground"
            )}
          >
            <span className="text-lg">{item.icon}</span>
            {item.label}
            {item.badge !== undefined && (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
                {item.badge}
              </span>
            )}
          </Link>
        ))}
        <Link
          href="/timeline"
          className={cn(
            "flex flex-col items-center gap-0.5 px-2 py-1 text-[10px] transition-colors",
            pathname.startsWith("/timeline")
              ? "text-primary font-medium"
              : "text-muted-foreground"
          )}
        >
          <span className="text-lg">📊</span>
          Timeline
        </Link>
      </nav>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex h-screen w-64 flex-col border-r bg-card">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <span className="text-xl font-bold">FH Enterprise</span>
          <NotificationBell />
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center justify-between rounded-md px-3 py-2 text-sm font-medium transition-colors",
                pathname.startsWith(item.href)
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <span className="flex items-center gap-3">
                <span>{item.icon}</span>
                {item.label}
              </span>
              {item.badge !== undefined && (
                <span
                  className={cn(
                    "flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-medium",
                    pathname.startsWith(item.href)
                      ? "bg-primary-foreground/20 text-primary-foreground"
                      : "bg-muted-foreground/10 text-muted-foreground"
                  )}
                >
                  {item.badge}
                </span>
              )}
            </Link>
          ))}
        </nav>

        <div className="flex items-center justify-between border-t px-3 py-3">
          <UserButton afterSignOutUrl="/sign-in" />
          <div className="flex items-center gap-1">
            <kbd className="rounded border bg-muted px-1.5 py-0.5 text-[9px] text-muted-foreground cursor-help" title="Quick add: Ctrl+Shift+N">
              ⌘⇧N
            </kbd>
            <ThemeToggle />
          </div>
        </div>
      </aside>
    </>
  );
}
