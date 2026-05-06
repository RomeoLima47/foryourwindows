"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";

// ─── Base shimmer block ─────────────────────────────────────
function S({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-muted ${className ?? ""}`} />;
}

// ─── Dashboard ──────────────────────────────────────────────
export function DashboardSkeleton() {
  return (
    <div>
      <div className="mb-6">
        <S className="mb-2 h-9 w-64" />
        <S className="h-4 w-40" />
      </div>
      <div className="mb-6 flex gap-2">
        <S className="h-8 w-24 rounded-md" />
        <S className="h-8 w-20 rounded-md" />
        <S className="h-8 w-24 rounded-md" />
      </div>
      <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader className="pb-2"><S className="h-4 w-20" /></CardHeader>
            <CardContent>
              <S className="mb-1 h-8 w-12" />
              <S className="h-3 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-8 lg:grid-cols-2">
        <div>
          <S className="mb-3 h-6 w-40" />
          <Card><CardContent className="py-4"><ListSkeleton rows={4} /></CardContent></Card>
        </div>
        <div>
          <S className="mb-3 h-6 w-36" />
          <Card><CardContent className="py-4"><ListSkeleton rows={4} /></CardContent></Card>
        </div>
      </div>
    </div>
  );
}

// ─── Tasks Page ─────────────────────────────────────────────
export function TasksPageSkeleton() {
  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <S className="h-9 w-32" />
        <S className="h-10 w-28" />
      </div>
      <div className="mb-6 flex gap-2">
        <S className="h-10 w-48" />
        <S className="h-10 w-32" />
        <S className="h-10 w-32" />
      </div>
      <div className="space-y-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <Card key={i}>
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <S className="h-5 w-5 rounded" />
                  <div>
                    <S className="mb-1 h-4 w-48" />
                    <S className="h-3 w-32" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <S className="h-5 w-16 rounded-full" />
                  <S className="h-5 w-14 rounded-full" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ─── Board (Kanban) ─────────────────────────────────────────
export function BoardSkeleton() {
  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <S className="h-9 w-48" />
        <div className="flex gap-2">
          <S className="h-8 w-24 rounded-md" />
          <S className="h-8 w-32 rounded-md" />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {["To Do", "In Progress", "Done"].map((col) => (
          <div key={col} className="rounded-lg border bg-card/50 p-3">
            <div className="mb-3 flex items-center justify-between">
              <S className="h-5 w-24" />
              <S className="h-5 w-8 rounded-full" />
            </div>
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="rounded-md border bg-card p-3">
                  <S className="mb-2 h-4 w-3/4" />
                  <S className="mb-2 h-3 w-1/2" />
                  <div className="flex gap-2">
                    <S className="h-4 w-12 rounded-full" />
                    <S className="h-4 w-16 rounded-full" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Projects List ──────────────────────────────────────────
export function ProjectsListSkeleton() {
  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <S className="h-9 w-36" />
        <S className="h-10 w-32" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Card key={i}>
            <CardContent className="pt-4">
              <S className="mb-3 h-5 w-3/4" />
              <S className="mb-4 h-3 w-full" />
              <div className="flex items-center justify-between">
                <S className="h-4 w-20" />
                <S className="h-1.5 w-24 rounded-full" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ─── Project Detail ─────────────────────────────────────────
export function ProjectDetailSkeleton() {
  return (
    <div>
      {/* Breadcrumb */}
      <div className="mb-4 flex items-center gap-2">
        <S className="h-4 w-16" />
        <S className="h-4 w-4" />
        <S className="h-4 w-32" />
      </div>
      {/* Header */}
      <div className="mb-6">
        <S className="mb-2 h-9 w-56" />
        <S className="mb-3 h-4 w-80" />
        <div className="flex items-center gap-3">
          <S className="h-4 w-20" />
          <S className="h-1.5 w-24 rounded-full" />
          <S className="h-4 w-16" />
        </div>
      </div>
      {/* Content */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-2">
          <S className="mb-3 h-6 w-20" />
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="py-4">
                <div className="flex items-center gap-3">
                  <S className="h-5 w-5 rounded" />
                  <div className="flex-1">
                    <S className="mb-1 h-4 w-48" />
                    <S className="h-3 w-32" />
                  </div>
                  <div className="flex gap-1">
                    <S className="h-7 w-7 rounded" />
                    <S className="h-7 w-7 rounded" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <div>
          <S className="mb-3 h-9 w-full rounded-md" />
          <Card><CardContent className="py-4"><ListSkeleton rows={5} /></CardContent></Card>
        </div>
      </div>
    </div>
  );
}

// ─── Task Detail ────────────────────────────────────────────
export function TaskDetailSkeleton() {
  return (
    <div>
      {/* Breadcrumb */}
      <div className="mb-4 flex items-center gap-2">
        <S className="h-4 w-16" />
        <S className="h-4 w-4" />
        <S className="h-4 w-28" />
        <S className="h-4 w-4" />
        <S className="h-4 w-24" />
      </div>
      {/* Task header card */}
      <div className="mb-6 rounded-lg border bg-card p-4">
        <div className="flex items-center gap-3">
          <S className="h-8 w-8 rounded" />
          <div className="flex-1">
            <S className="mb-2 h-7 w-56" />
            <S className="h-4 w-72" />
          </div>
          <div className="flex gap-2">
            <S className="h-8 w-20 rounded-md" />
            <S className="h-8 w-16 rounded-md" />
          </div>
        </div>
        <div className="mt-3 flex items-center gap-4">
          <S className="h-4 w-24" />
          <S className="h-4 w-32" />
          <S className="h-1.5 w-20 rounded-full" />
        </div>
      </div>
      {/* Subtasks */}
      <div className="mb-4 flex items-center justify-between">
        <S className="h-6 w-24" />
        <S className="h-8 w-28 rounded-md" />
      </div>
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="py-3">
              <div className="flex items-center gap-3">
                <S className="h-5 w-5 rounded" />
                <div className="flex-1">
                  <S className="mb-1 h-4 w-40" />
                  <S className="h-3 w-28" />
                </div>
                <div className="flex gap-1">
                  <S className="h-6 w-6 rounded" />
                  <S className="h-6 w-6 rounded" />
                  <S className="h-6 w-6 rounded" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ─── Calendar ───────────────────────────────────────────────
export function CalendarSkeleton() {
  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <S className="h-9 w-48" />
        <div className="flex gap-2">
          <S className="h-8 w-8 rounded-md" />
          <S className="h-8 w-32 rounded-md" />
          <S className="h-8 w-8 rounded-md" />
        </div>
      </div>
      {/* Day headers */}
      <div className="mb-2 grid grid-cols-7 gap-1">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <S key={d} className="h-6 w-full" />
        ))}
      </div>
      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: 35 }).map((_, i) => (
          <div key={i} className="rounded-md border bg-card/50 p-2" style={{ minHeight: 80 }}>
            <S className="mb-2 h-4 w-6" />
            {i % 4 === 0 && <S className="mb-1 h-3 w-full" />}
            {i % 7 === 2 && <S className="h-3 w-3/4" />}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Analytics ──────────────────────────────────────────────
export function AnalyticsSkeleton() {
  return (
    <div>
      <S className="mb-6 h-9 w-48" />
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <Card key={i}>
            <CardContent className="pt-4">
              <S className="mb-2 h-3 w-20" />
              <S className="mb-1 h-7 w-12" />
              <S className="h-2 w-full rounded-full" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card><CardContent className="pt-4"><S className="mb-3 h-5 w-32" /><S className="h-48 w-full rounded-md" /></CardContent></Card>
        <Card><CardContent className="pt-4"><S className="mb-3 h-5 w-32" /><S className="h-48 w-full rounded-md" /></CardContent></Card>
      </div>
    </div>
  );
}

// ─── Templates ──────────────────────────────────────────────
export function TemplatesSkeleton() {
  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <S className="h-9 w-40" />
        <S className="h-10 w-36" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="pt-4">
              <S className="mb-2 h-5 w-3/4" />
              <S className="mb-3 h-3 w-full" />
              <div className="flex items-center justify-between">
                <S className="h-4 w-20" />
                <S className="h-8 w-20 rounded-md" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ─── Settings ───────────────────────────────────────────────
export function SettingsSkeleton() {
  return (
    <div>
      <S className="mb-6 h-9 w-32" />
      <div className="space-y-6">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="pt-4">
              <S className="mb-3 h-5 w-40" />
              <S className="mb-2 h-10 w-full rounded-md" />
              <S className="h-10 w-full rounded-md" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ─── Invitations ────────────────────────────────────────────
export function InvitationsSkeleton() {
  return (
    <div>
      <S className="mb-6 h-9 w-40" />
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <S className="h-8 w-8 rounded-full" />
                  <div>
                    <S className="mb-1 h-4 w-40" />
                    <S className="h-3 w-24" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <S className="h-8 w-20 rounded-md" />
                  <S className="h-8 w-20 rounded-md" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ─── Helper: generic list skeleton ──────────────────────────
export function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="border-b pb-3 last:border-0">
          <S className="mb-1 h-4 w-full" />
          <S className="h-3 w-40" />
        </div>
      ))}
    </div>
  );
}
