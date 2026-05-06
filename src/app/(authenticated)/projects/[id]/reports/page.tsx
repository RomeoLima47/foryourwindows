"use client";

import React, { useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useToast } from "@/components/toast";
import type { Id } from "../../../../../../convex/_generated/dataModel";

const WEATHER_OPTIONS = ["☀️ Sunny", "⛅ Partly Cloudy", "☁️ Overcast", "🌧️ Rain", "⛈️ Stormy", "❄️ Snow", "💨 Windy", "🌫️ Fog"];
const COMMON_TRADES = ["General Labor", "Carpentry", "Electrical", "Plumbing", "HVAC", "Painting", "Drywall", "Roofing", "Concrete", "Tile", "Flooring", "Landscaping", "Demolition", "Masonry", "Insulation", "Iron Work"];

interface CrewEntry { trade: string; headcount: number; hours: number; }
interface WeatherData { conditions: string; tempHigh?: number; tempLow?: number; notes?: string; }

function fmtDate(ts: number) {
  return new Date(ts).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}

function todayMidnight() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function dateToMidnight(dateStr: string) {
  const d = new Date(dateStr + "T12:00:00");
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function midnightToDateStr(ts: number) {
  return new Date(ts).toISOString().slice(0, 10);
}

export default function DailyReportsPage() {
  const { toast } = useToast();
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as Id<"projects">;

  const projects = useQuery(api.projects.list);
  const reports = useQuery(api.dailyReports.listByProject, { projectId });

  const createReport = useMutation(api.dailyReports.create);
  const updateReport = useMutation(api.dailyReports.update);
  const submitReport = useMutation(api.dailyReports.submit);
  const reopenReport = useMutation(api.dailyReports.reopen);
  const deleteReport = useMutation(api.dailyReports.remove);

  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState<Id<"dailyReports"> | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Id<"dailyReports"> | null>(null);
  const [expandedId, setExpandedId] = useState<Id<"dailyReports"> | null>(null);

  // Form state
  const [formDate, setFormDate] = useState(midnightToDateStr(todayMidnight()));
  const [weather, setWeather] = useState<WeatherData>({ conditions: "☀️ Sunny" });
  const [crewEntries, setCrewEntries] = useState<CrewEntry[]>([{ trade: "", headcount: 1, hours: 8 }]);
  const [workPerformed, setWorkPerformed] = useState("");
  const [materialsUsed, setMaterialsUsed] = useState("");
  const [equipmentOnSite, setEquipmentOnSite] = useState("");
  const [safetyNotes, setSafetyNotes] = useState("");
  const [delays, setDelays] = useState("");
  const [visitors, setVisitors] = useState("");

  const project = projects?.find((p) => p._id === projectId);

  const resetForm = () => {
    setFormDate(midnightToDateStr(todayMidnight()));
    setWeather({ conditions: "☀️ Sunny" });
    setCrewEntries([{ trade: "", headcount: 1, hours: 8 }]);
    setWorkPerformed(""); setMaterialsUsed(""); setEquipmentOnSite("");
    setSafetyNotes(""); setDelays(""); setVisitors("");
    setEditId(null);
  };

  const openNewReport = () => {
    resetForm();
    setFormOpen(true);
  };

  const openEditReport = (report: any) => {
    setEditId(report._id);
    setFormDate(midnightToDateStr(report.date));
    setWeather(report.weather ? JSON.parse(report.weather) : { conditions: "☀️ Sunny" });
    setCrewEntries(report.crewEntries ? JSON.parse(report.crewEntries) : [{ trade: "", headcount: 1, hours: 8 }]);
    setWorkPerformed(report.workPerformed ?? "");
    setMaterialsUsed(report.materialsUsed ?? "");
    setEquipmentOnSite(report.equipmentOnSite ?? "");
    setSafetyNotes(report.safetyNotes ?? "");
    setDelays(report.delays ?? "");
    setVisitors(report.visitors ?? "");
    setFormOpen(true);
  };

  const addCrewEntry = () => setCrewEntries([...crewEntries, { trade: "", headcount: 1, hours: 8 }]);
  const removeCrewEntry = (idx: number) => setCrewEntries(crewEntries.filter((_, i) => i !== idx));
  const updateCrewEntry = (idx: number, field: keyof CrewEntry, value: any) => {
    const next = [...crewEntries];
    (next[idx] as any)[field] = value;
    setCrewEntries(next);
  };

  const totalCrew = crewEntries.reduce((s, e) => s + (e.headcount || 0), 0);
  const totalHours = crewEntries.reduce((s, e) => s + (e.headcount || 0) * (e.hours || 0), 0);

  const handleSave = async (asDraft: boolean) => {
    const date = dateToMidnight(formDate);
    const validCrew = crewEntries.filter((e) => e.trade.trim());

    const data = {
      weather: JSON.stringify(weather),
      crewEntries: JSON.stringify(validCrew),
      totalCrewCount: totalCrew,
      totalManHours: totalHours,
      workPerformed: workPerformed || undefined,
      materialsUsed: materialsUsed || undefined,
      equipmentOnSite: equipmentOnSite || undefined,
      safetyNotes: safetyNotes || undefined,
      delays: delays || undefined,
      visitors: visitors || undefined,
      status: asDraft ? "draft" as const : "submitted" as const,
    };

    try {
      if (editId) {
        await updateReport({ id: editId, ...data });
        toast(asDraft ? "Report saved as draft" : "Report submitted");
      } else {
        await createReport({ projectId, date, ...data });
        toast(asDraft ? "Draft report created" : "Report submitted");
      }
      setFormOpen(false);
      resetForm();
    } catch (err: any) {
      toast(err.message || "Failed to save report");
    }
  };

  // Stats
  const stats = useMemo(() => {
    if (!reports) return null;
    const submitted = reports.filter((r) => r.status === "submitted").length;
    const drafts = reports.filter((r) => r.status === "draft").length;
    const totalHrs = reports.reduce((s, r) => s + (r.totalManHours ?? 0), 0);
    return { total: reports.length, submitted, drafts, totalHrs };
  }, [reports]);

  if (!project) {
    return <div className="flex min-h-[50vh] items-center justify-center"><div className="h-8 w-48 animate-pulse rounded bg-muted" /></div>;
  }

  return (
    <div>
      <ConfirmDialog
        open={!!deleteConfirm}
        onOpenChange={(open) => !open && setDeleteConfirm(null)}
        title="Delete report?"
        message="This daily report will be permanently deleted."
        onConfirm={async () => {
          if (deleteConfirm) {
            await deleteReport({ id: deleteConfirm });
            toast("Report deleted");
          }
        }}
      />

      {/* Breadcrumbs */}
      <Breadcrumbs items={[
        { label: "Projects", href: "/projects" },
        { label: project.name, href: `/projects/${projectId}` },
        { label: "Daily Reports" },
      ]} />

      {/* Header */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">📋 Daily Field Reports</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Structured daily logs for {project.name}
          </p>
        </div>
        <Button onClick={openNewReport} title="Create a new daily report">+ New Report</Button>
      </div>

      {/* Stats bar */}
      {stats && stats.total > 0 && (
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Card><CardContent className="py-3 text-center"><p className="text-2xl font-bold">{stats.total}</p><p className="text-xs text-muted-foreground">Total Reports</p></CardContent></Card>
          <Card><CardContent className="py-3 text-center"><p className="text-2xl font-bold text-green-500">{stats.submitted}</p><p className="text-xs text-muted-foreground">Submitted</p></CardContent></Card>
          <Card><CardContent className="py-3 text-center"><p className="text-2xl font-bold text-yellow-500">{stats.drafts}</p><p className="text-xs text-muted-foreground">Drafts</p></CardContent></Card>
          <Card><CardContent className="py-3 text-center"><p className="text-2xl font-bold">{stats.totalHrs.toLocaleString()}</p><p className="text-xs text-muted-foreground">Total Man-Hours</p></CardContent></Card>
        </div>
      )}

      {/* Reports list */}
      {!reports ? (
        <div className="space-y-2">{[1, 2, 3].map((i) => <div key={i} className="h-20 animate-pulse rounded-lg bg-muted" />)}</div>
      ) : reports.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <p className="mb-2 text-3xl">📋</p>
            <p className="mb-1 font-medium">No daily reports yet</p>
            <p className="text-sm">Start documenting daily site activity by creating your first report.</p>
            <Button className="mt-4" onClick={openNewReport}>Create First Report</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {reports.map((report) => {
            const w: WeatherData = report.weather ? JSON.parse(report.weather) : {};
            const crew: CrewEntry[] = report.crewEntries ? JSON.parse(report.crewEntries) : [];
            const isExpanded = expandedId === report._id;

            return (
              <Card key={report._id} className={`transition-all ${isExpanded ? "ring-2 ring-primary/30" : "hover:shadow-md"}`}>
                <CardContent className="py-3">
                  {/* Summary row */}
                  <div
                    className="flex items-center justify-between cursor-pointer"
                    onClick={() => setExpandedId(isExpanded ? null : report._id)}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="text-center leading-tight">
                        <p className="text-lg font-bold">{new Date(report.date).getDate()}</p>
                        <p className="text-[10px] uppercase text-muted-foreground">
                          {new Date(report.date).toLocaleDateString("en-US", { month: "short" })}
                        </p>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{fmtDate(report.date)}</p>
                          <Badge variant={report.status === "submitted" ? "default" : "secondary"} className="text-[10px]">
                            {report.status === "submitted" ? "✅ Submitted" : "📝 Draft"}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                          {w.conditions && <span>{w.conditions}</span>}
                          {report.totalCrewCount ? <span>👷 {report.totalCrewCount} crew</span> : null}
                          {report.totalManHours ? <span>⏱️ {report.totalManHours} hrs</span> : null}
                          {report.workPerformed && <span className="truncate max-w-[200px]">📝 {report.workPerformed.slice(0, 60)}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); openEditReport(report); }} title="Edit report">✏️</Button>
                      {report.status === "draft" && (
                        <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); submitReport({ id: report._id }); toast("Report submitted"); }} title="Submit report">✅</Button>
                      )}
                      {report.status === "submitted" && (
                        <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); reopenReport({ id: report._id }); toast("Report reopened as draft"); }} title="Reopen as draft">🔓</Button>
                      )}
                      <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setDeleteConfirm(report._id); }} title="Delete report">🗑️</Button>
                      <button onClick={(e) => { e.stopPropagation(); setExpandedId(isExpanded ? null : report._id); }} className="text-muted-foreground p-1">
                        {isExpanded ? "▼" : "▶"}
                      </button>
                    </div>
                  </div>

                  {/* Expanded details */}
                  {isExpanded && (
                    <div className="mt-3 space-y-4 border-t pt-3">
                      {/* Weather */}
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <p className="mb-1 text-xs font-medium text-muted-foreground">🌤️ Weather</p>
                          <p className="text-sm">{w.conditions || "—"}</p>
                          {(w.tempHigh || w.tempLow) && (
                            <p className="text-xs text-muted-foreground">
                              {w.tempHigh && `High: ${w.tempHigh}°F`} {w.tempLow && `Low: ${w.tempLow}°F`}
                            </p>
                          )}
                          {w.notes && <p className="text-xs text-muted-foreground">{w.notes}</p>}
                        </div>
                        <div>
                          <p className="mb-1 text-xs font-medium text-muted-foreground">ℹ️ Info</p>
                          <p className="text-xs text-muted-foreground">By {report.authorName}</p>
                          <p className="text-xs text-muted-foreground">Updated {new Date(report.updatedAt).toLocaleString()}</p>
                        </div>
                      </div>

                      {/* Crew */}
                      {crew.length > 0 && (
                        <div>
                          <p className="mb-1 text-xs font-medium text-muted-foreground">👷 Crew on Site</p>
                          <div className="rounded border">
                            <div className="grid grid-cols-3 border-b bg-muted/50 px-3 py-1.5 text-[10px] font-medium uppercase text-muted-foreground">
                              <span>Trade</span><span>Headcount</span><span>Hours</span>
                            </div>
                            {crew.map((entry, i) => (
                              <div key={i} className="grid grid-cols-3 border-b last:border-0 px-3 py-1.5 text-sm">
                                <span>{entry.trade}</span>
                                <span>{entry.headcount}</span>
                                <span>{entry.hours}h</span>
                              </div>
                            ))}
                            <div className="grid grid-cols-3 bg-muted/30 px-3 py-1.5 text-xs font-medium">
                              <span>Total</span>
                              <span>{report.totalCrewCount}</span>
                              <span>{report.totalManHours}h</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Narrative sections */}
                      <div className="grid gap-3 sm:grid-cols-2">
                        {report.workPerformed && (
                          <div><p className="mb-1 text-xs font-medium text-muted-foreground">🔨 Work Performed</p><p className="text-sm whitespace-pre-wrap">{report.workPerformed}</p></div>
                        )}
                        {report.materialsUsed && (
                          <div><p className="mb-1 text-xs font-medium text-muted-foreground">📦 Materials Used/Delivered</p><p className="text-sm whitespace-pre-wrap">{report.materialsUsed}</p></div>
                        )}
                        {report.equipmentOnSite && (
                          <div><p className="mb-1 text-xs font-medium text-muted-foreground">🚜 Equipment on Site</p><p className="text-sm whitespace-pre-wrap">{report.equipmentOnSite}</p></div>
                        )}
                        {report.safetyNotes && (
                          <div><p className="mb-1 text-xs font-medium text-muted-foreground">⚠️ Safety Notes</p><p className="text-sm whitespace-pre-wrap">{report.safetyNotes}</p></div>
                        )}
                        {report.delays && (
                          <div><p className="mb-1 text-xs font-medium text-muted-foreground">🚧 Delays / Issues</p><p className="text-sm whitespace-pre-wrap">{report.delays}</p></div>
                        )}
                        {report.visitors && (
                          <div><p className="mb-1 text-xs font-medium text-muted-foreground">👤 Visitors / Inspections</p><p className="text-sm whitespace-pre-wrap">{report.visitors}</p></div>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ─── Create/Edit Report Dialog ───────────────────────── */}
      <Dialog open={formOpen} onOpenChange={(open) => { if (!open) { setFormOpen(false); resetForm(); } }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? "Edit Daily Report" : "New Daily Report"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-5 pt-2">
            {/* Date */}
            <div>
              <label className="mb-1 block text-sm font-medium">Report Date</label>
              <Input type="date" value={formDate} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormDate(e.target.value)} />
            </div>

            {/* Weather */}
            <div>
              <label className="mb-1 block text-sm font-medium">🌤️ Weather Conditions</label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {WEATHER_OPTIONS.map((opt) => (
                  <button
                    key={opt}
                    onClick={() => setWeather({ ...weather, conditions: opt })}
                    className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                      weather.conditions === opt ? "border-primary bg-primary/10 text-primary font-medium" : "hover:bg-muted"
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">High °F</label>
                  <Input type="number" placeholder="85" value={weather.tempHigh ?? ""} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setWeather({ ...weather, tempHigh: e.target.value ? Number(e.target.value) : undefined })} />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">Low °F</label>
                  <Input type="number" placeholder="72" value={weather.tempLow ?? ""} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setWeather({ ...weather, tempLow: e.target.value ? Number(e.target.value) : undefined })} />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">Notes</label>
                  <Input placeholder="e.g. cleared by noon" value={weather.notes ?? ""} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setWeather({ ...weather, notes: e.target.value || undefined })} />
                </div>
              </div>
            </div>

            {/* Crew */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="text-sm font-medium">👷 Crew on Site</label>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>{totalCrew} workers</span>
                  <span>{totalHours} man-hours</span>
                  <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={addCrewEntry}>+ Add Trade</Button>
                </div>
              </div>
              <div className="space-y-2">
                {crewEntries.map((entry, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <div className="flex-1">
                      <Input
                        list="trades-list"
                        placeholder="Trade (e.g. Electrical)"
                        value={entry.trade}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateCrewEntry(idx, "trade", e.target.value)}
                      />
                    </div>
                    <div className="w-20">
                      <Input
                        type="number"
                        min="1"
                        placeholder="Crew"
                        value={entry.headcount}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateCrewEntry(idx, "headcount", Number(e.target.value) || 0)}
                      />
                    </div>
                    <div className="w-20">
                      <Input
                        type="number"
                        min="0"
                        step="0.5"
                        placeholder="Hours"
                        value={entry.hours}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateCrewEntry(idx, "hours", Number(e.target.value) || 0)}
                      />
                    </div>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => removeCrewEntry(idx)} title="Remove">×</Button>
                  </div>
                ))}
              </div>
              <datalist id="trades-list">
                {COMMON_TRADES.map((t) => <option key={t} value={t} />)}
              </datalist>
            </div>

            {/* Work Performed */}
            <div>
              <label className="mb-1 block text-sm font-medium">🔨 Work Performed</label>
              <textarea
                className="flex min-h-[80px] w-full rounded-md border bg-background px-3 py-2 text-sm"
                placeholder="Describe all work performed today..."
                value={workPerformed}
                onChange={(e) => setWorkPerformed(e.target.value)}
              />
            </div>

            {/* Materials */}
            <div>
              <label className="mb-1 block text-sm font-medium">📦 Materials Used / Delivered</label>
              <textarea
                className="flex min-h-[60px] w-full rounded-md border bg-background px-3 py-2 text-sm"
                placeholder="List materials delivered or consumed..."
                value={materialsUsed}
                onChange={(e) => setMaterialsUsed(e.target.value)}
              />
            </div>

            {/* Equipment */}
            <div>
              <label className="mb-1 block text-sm font-medium">🚜 Equipment on Site</label>
              <Input placeholder="e.g. Excavator, scissor lift, concrete pump" value={equipmentOnSite} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEquipmentOnSite(e.target.value)} />
            </div>

            {/* Safety */}
            <div>
              <label className="mb-1 block text-sm font-medium">⚠️ Safety Notes / Incidents</label>
              <textarea
                className="flex min-h-[60px] w-full rounded-md border bg-background px-3 py-2 text-sm"
                placeholder="Any safety incidents, near misses, or observations..."
                value={safetyNotes}
                onChange={(e) => setSafetyNotes(e.target.value)}
              />
            </div>

            {/* Delays */}
            <div>
              <label className="mb-1 block text-sm font-medium">🚧 Delays / Issues</label>
              <textarea
                className="flex min-h-[60px] w-full rounded-md border bg-background px-3 py-2 text-sm"
                placeholder="Weather delays, material shortages, inspection holds..."
                value={delays}
                onChange={(e) => setDelays(e.target.value)}
              />
            </div>

            {/* Visitors */}
            <div>
              <label className="mb-1 block text-sm font-medium">👤 Visitors / Inspections</label>
              <Input placeholder="e.g. City inspector — rough plumbing passed" value={visitors} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setVisitors(e.target.value)} />
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <Button className="flex-1" onClick={() => handleSave(false)}>
                ✅ {editId ? "Save & Submit" : "Submit Report"}
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => handleSave(true)}>
                📝 Save as Draft
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
