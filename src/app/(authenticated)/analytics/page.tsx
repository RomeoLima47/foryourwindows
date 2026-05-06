"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

function ProgressBar({ value, color, label }: { value: number; color: string; label: string }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{value}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

function MiniBar({ items, total }: { items: { label: string; value: number; color: string }[]; total: number }) {
  if (total === 0) return <div className="h-3 w-full rounded-full bg-muted" />;
  return (
    <div className="flex h-3 w-full overflow-hidden rounded-full">
      {items.map((item) => (
        <div
          key={item.label}
          className={`h-full ${item.color} transition-all`}
          style={{ width: `${(item.value / total) * 100}%` }}
          title={`${item.label}: ${item.value}`}
        />
      ))}
    </div>
  );
}

function SparkLine({ data, height = 48 }: { data: number[]; height?: number }) {
  if (data.length === 0 || data.every((d) => d === 0)) {
    return (
      <div className="flex items-center justify-center" style={{ height }}>
        <span className="text-xs text-muted-foreground">No data yet</span>
      </div>
    );
  }

  const max = Math.max(...data, 1);
  const width = 100;
  const points = data.map((v, i) => ({
    x: (i / (data.length - 1)) * width,
    y: height - (v / max) * (height - 4) - 2,
  }));

  const pathD = points.map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(" ");
  const areaD = pathD + ` L ${width} ${height} L 0 ${height} Z`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ height }}>
      <defs>
        <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.3" />
          <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaD} fill="url(#sparkGrad)" />
      <path d={pathD} fill="none" stroke="hsl(var(--primary))" strokeWidth="1.5" />
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="1.5" fill="hsl(var(--primary))" />
      ))}
    </svg>
  );
}

function DonutChart({
  items,
  size = 120,
}: {
  items: { name: string; value: number; color: string }[];
  size?: number;
}) {
  const total = items.reduce((sum, i) => sum + i.value, 0);
  if (total === 0) {
    return (
      <div className="flex items-center justify-center" style={{ width: size, height: size }}>
        <span className="text-xs text-muted-foreground">No data</span>
      </div>
    );
  }

  const cx = size / 2;
  const cy = size / 2;
  const radius = size / 2 - 8;
  const innerRadius = radius * 0.6;

  let currentAngle = -90;
  const paths = items
    .filter((i) => i.value > 0)
    .map((item) => {
      const angle = (item.value / total) * 360;
      const startAngle = currentAngle;
      const endAngle = currentAngle + angle;
      currentAngle = endAngle;

      const startRad = (startAngle * Math.PI) / 180;
      const endRad = (endAngle * Math.PI) / 180;

      const x1 = cx + radius * Math.cos(startRad);
      const y1 = cy + radius * Math.sin(startRad);
      const x2 = cx + radius * Math.cos(endRad);
      const y2 = cy + radius * Math.sin(endRad);
      const ix1 = cx + innerRadius * Math.cos(startRad);
      const iy1 = cy + innerRadius * Math.sin(startRad);
      const ix2 = cx + innerRadius * Math.cos(endRad);
      const iy2 = cy + innerRadius * Math.sin(endRad);

      const largeArc = angle > 180 ? 1 : 0;

      const d = [
        `M ${x1} ${y1}`,
        `A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`,
        `L ${ix2} ${iy2}`,
        `A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${ix1} ${iy1}`,
        "Z",
      ].join(" ");

      return <path key={item.name} d={d} fill={item.color} />;
    });

  return (
    <svg viewBox={`0 0 ${size} ${size}`} style={{ width: size, height: size }}>
      {paths}
      <text
        x={cx}
        y={cy - 4}
        textAnchor="middle"
        className="fill-foreground text-lg font-bold"
        style={{ fontSize: "18px" }}
      >
        {total}
      </text>
      <text
        x={cx}
        y={cy + 12}
        textAnchor="middle"
        className="fill-muted-foreground"
        style={{ fontSize: "9px" }}
      >
        total
      </text>
    </svg>
  );
}

function BarChart({
  data,
  height = 160,
}: {
  data: { day: string; created: number; completed: number }[];
  height?: number;
}) {
  const max = Math.max(...data.map((d) => Math.max(d.created, d.completed)), 1);
  const barWidth = 100 / data.length;

  return (
    <div>
      <svg viewBox={`0 0 100 ${height}`} className="w-full" style={{ height }} preserveAspectRatio="none">
        {data.map((d, i) => {
          const x = i * barWidth;
          const createdH = (d.created / max) * (height - 20);
          const completedH = (d.completed / max) * (height - 20);
          return (
            <g key={d.day}>
              <rect
                x={x + barWidth * 0.1}
                y={height - 16 - createdH}
                width={barWidth * 0.35}
                height={createdH}
                fill="hsl(var(--primary))"
                opacity="0.6"
                rx="0.5"
              />
              <rect
                x={x + barWidth * 0.5}
                y={height - 16 - completedH}
                width={barWidth * 0.35}
                height={completedH}
                fill="#22c55e"
                rx="0.5"
              />
            </g>
          );
        })}
      </svg>
      <div className="mt-1 flex justify-between text-[9px] text-muted-foreground">
        <span>{data[0]?.day}</span>
        <span>{data[Math.floor(data.length / 2)]?.day}</span>
        <span>{data[data.length - 1]?.day}</span>
      </div>
      <div className="mt-2 flex justify-center gap-4 text-xs">
        <div className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded bg-primary opacity-60" />
          <span className="text-muted-foreground">Created</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded bg-green-500" />
          <span className="text-muted-foreground">Completed</span>
        </div>
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  const data = useQuery(api.analytics.overview);

  if (data === undefined) {
    return (
      <div>
        <div className="mb-6 h-9 w-48 animate-pulse rounded bg-muted" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold sm:text-3xl">Analytics</h1>

      {/* KPI row */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Completion Rate</p>
            <p className="text-2xl font-bold text-green-500">{data.completionRate}%</p>
            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-green-500" style={{ width: `${data.completionRate}%` }} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Overdue</p>
            <p className={`text-2xl font-bold ${data.overdueCount > 0 ? "text-red-500" : "text-foreground"}`}>
              {data.overdueCount}
            </p>
            <p className="text-[10px] text-muted-foreground">tasks past due</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Done This Week</p>
            <p className="text-2xl font-bold text-blue-500">{data.recentlyCompletedCount}</p>
            <p className="text-[10px] text-muted-foreground">last 7 days</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Unassigned</p>
            <p className="text-2xl font-bold">{data.unassignedCount}</p>
            <p className="text-[10px] text-muted-foreground">no project</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts row */}
      <div className="mb-6 grid gap-4 sm:gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Task Activity (14 days)</CardTitle>
          </CardHeader>
          <CardContent>
            <BarChart data={data.trendData} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Status Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            <DonutChart items={data.statusBreakdown} />
            <div className="mt-3 flex flex-wrap justify-center gap-3">
              {data.statusBreakdown.map((item) => (
                <div key={item.name} className="flex items-center gap-1.5">
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-xs text-muted-foreground">
                    {item.name} ({item.value})
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Priority + Trend row */}
      <div className="mb-6 grid gap-4 sm:gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Priority Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            <DonutChart items={data.priorityBreakdown} />
            <div className="mt-3 flex flex-wrap justify-center gap-3">
              {data.priorityBreakdown.map((item) => (
                <div key={item.name} className="flex items-center gap-1.5">
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-xs text-muted-foreground">
                    {item.name} ({item.value})
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Creation Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <SparkLine data={data.trendData.map((d) => d.created)} height={80} />
            <div className="mt-2 flex justify-between text-[9px] text-muted-foreground">
              <span>{data.trendData[0]?.day}</span>
              <span>{data.trendData[data.trendData.length - 1]?.day}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Project breakdown */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Project Performance</CardTitle>
        </CardHeader>
        <CardContent>
          {data.projectStats.length === 0 ? (
            <div className="py-6 text-center">
              <p className="mb-1 text-2xl">📁</p>
              <p className="text-sm text-muted-foreground">No projects to analyze yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {data.projectStats.map((project) => (
                <div key={project.name} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{project.name}</span>
                      <Badge
                        variant="secondary"
                        className={
                          project.status === "active"
                            ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                            : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
                        }
                      >
                        {project.status}
                      </Badge>
                    </div>
                    <span className="text-sm font-medium">{project.completionRate}%</span>
                  </div>
                  <MiniBar
                    items={[
                      { label: "Done", value: project.done, color: "bg-green-500" },
                      { label: "In Progress", value: project.inProgress, color: "bg-yellow-500" },
                      { label: "To Do", value: project.todo, color: "bg-blue-500" },
                    ]}
                    total={project.total}
                  />
                  <div className="flex gap-3 text-[10px] text-muted-foreground">
                    <span>{project.done} done</span>
                    <span>{project.inProgress} in progress</span>
                    <span>{project.todo} to do</span>
                    <span className="ml-auto">{project.total} total</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
