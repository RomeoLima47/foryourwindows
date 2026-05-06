"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "../../convex/_generated/api";

interface SearchResult {
  id: string;
  type: "task" | "project" | "page";
  title: string;
  subtitle?: string;
  icon: string;
  href: string;
}

const pages: SearchResult[] = [
  { id: "nav-dashboard", type: "page", title: "Dashboard", icon: "📊", href: "/dashboard", subtitle: "Overview & stats" },
  { id: "nav-tasks", type: "page", title: "Tasks", icon: "✅", href: "/tasks", subtitle: "Manage tasks" },
  { id: "nav-board", type: "page", title: "Board", icon: "📋", href: "/board", subtitle: "Kanban view" },
  { id: "nav-projects", type: "page", title: "Projects", icon: "📁", href: "/projects", subtitle: "All projects" },
  { id: "nav-calendar", type: "page", title: "Calendar", icon: "📅", href: "/calendar", subtitle: "Due dates view" },
  { id: "nav-timeline", type: "page", title: "Timeline", icon: "📊", href: "/timeline", subtitle: "Gantt chart view" },
  { id: "nav-analytics", type: "page", title: "Analytics", icon: "📈", href: "/analytics", subtitle: "Reports & charts" },
  { id: "nav-templates", type: "page", title: "Templates", icon: "📄", href: "/templates", subtitle: "Project templates" },
  { id: "nav-invitations", type: "page", title: "Invitations", icon: "📬", href: "/invitations", subtitle: "Team invites" },
  { id: "nav-settings", type: "page", title: "Settings", icon: "⚙️", href: "/settings", subtitle: "Account settings" },
];

const statusIcons: Record<string, string> = { todo: "⬜", in_progress: "🔄", done: "✅" };

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const tasks = useQuery(api.tasks.list);
  const projects = useQuery(api.projects.list);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(true);
        setQuery("");
        setSelectedIndex(0);
      }
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  const getResults = useCallback((): SearchResult[] => {
    const q = query.toLowerCase().trim();
    if (!q) {
      const recentTasks: SearchResult[] = (tasks ?? []).slice(0, 5).map((t) => ({
        id: t._id, type: "task", title: t.title,
        subtitle: `${statusIcons[t.status] || "⬜"} ${t.priority} priority`,
        icon: statusIcons[t.status] || "⬜", href: "/tasks",
      }));
      return [...pages, ...recentTasks];
    }

    const matchingPages = pages.filter(
      (p) => p.title.toLowerCase().includes(q) || p.subtitle?.toLowerCase().includes(q)
    );

    const matchingTasks: SearchResult[] = (tasks ?? [])
      .filter((t) => t.title.toLowerCase().includes(q) || t.description?.toLowerCase().includes(q))
      .slice(0, 8)
      .map((t) => ({
        id: t._id, type: "task", title: t.title,
        subtitle: `${statusIcons[t.status] || "⬜"} ${t.priority}${t.description ? " · " + t.description.slice(0, 40) : ""}`,
        icon: statusIcons[t.status] || "⬜", href: "/tasks",
      }));

    const matchingProjects: SearchResult[] = (projects ?? [])
      .filter((p) => p.name.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q))
      .slice(0, 5)
      .map((p) => ({
        id: p._id, type: "project", title: p.name,
        subtitle: p.description?.slice(0, 50) || p.status,
        icon: "📁", href: `/projects/${p._id}`,
      }));

    return [...matchingPages, ...matchingProjects, ...matchingTasks];
  }, [query, tasks, projects]);

  const results = getResults();

  useEffect(() => { setSelectedIndex(0); }, [query]);

  useEffect(() => {
    if (listRef.current) {
      const el = listRef.current.children[selectedIndex] as HTMLElement;
      if (el) el.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex]);

  const handleSelect = (result: SearchResult) => {
    router.push(result.href);
    setOpen(false);
    setQuery("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setSelectedIndex((p) => Math.min(p + 1, results.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setSelectedIndex((p) => Math.max(p - 1, 0)); }
    else if (e.key === "Enter" && results[selectedIndex]) { e.preventDefault(); handleSelect(results[selectedIndex]); }
  };

  if (!open) return null;

  const grouped = {
    pages: results.filter((r) => r.type === "page"),
    projects: results.filter((r) => r.type === "project"),
    tasks: results.filter((r) => r.type === "task"),
  };

  let gi = -1;

  const renderGroup = (label: string, items: SearchResult[]) => {
    if (items.length === 0) return null;
    return (
      <div className="mb-2">
        <p className="mb-1 px-2 text-[10px] font-medium uppercase text-muted-foreground">{label}</p>
        {items.map((result) => {
          gi++;
          const idx = gi;
          return (
            <button
              key={result.id}
              onClick={() => handleSelect(result)}
              onMouseEnter={() => setSelectedIndex(idx)}
              className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors ${
                selectedIndex === idx ? "bg-primary/10 text-foreground" : "text-muted-foreground hover:bg-muted"
              }`}
            >
              <span className="w-5 text-center">{result.icon}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{result.title}</p>
                {result.subtitle && <p className="truncate text-xs text-muted-foreground">{result.subtitle}</p>}
              </div>
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <>
      <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm" onClick={() => setOpen(false)} />
      <div className="fixed left-1/2 top-[15%] z-[101] w-[90vw] max-w-lg -translate-x-1/2 overflow-hidden rounded-xl border bg-card shadow-2xl">
        <div className="flex items-center gap-3 border-b px-4 py-3">
          <span className="text-muted-foreground">🔍</span>
          <input
            ref={inputRef}
            type="text"
            placeholder="Search tasks, projects, pages..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          <kbd className="hidden rounded border bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground sm:inline">ESC</kbd>
        </div>
        <div ref={listRef} className="max-h-[60vh] overflow-y-auto p-2">
          {results.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm text-muted-foreground">No results for &ldquo;{query}&rdquo;</p>
            </div>
          ) : (
            <>
              {renderGroup("Pages", grouped.pages)}
              {renderGroup("Projects", grouped.projects)}
              {renderGroup("Tasks", grouped.tasks)}
            </>
          )}
        </div>
        <div className="flex items-center justify-between border-t px-4 py-2 text-[10px] text-muted-foreground">
          <div className="flex gap-2">
            <span><kbd className="rounded border bg-muted px-1">↑↓</kbd> navigate</span>
            <span><kbd className="rounded border bg-muted px-1">↵</kbd> select</span>
          </div>
          <span>{results.length} result{results.length !== 1 ? "s" : ""}</span>
        </div>
      </div>
    </>
  );
}
