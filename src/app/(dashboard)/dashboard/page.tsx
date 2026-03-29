"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { StatCard } from "@/components/dashboard/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/requisitions/status-badge";
import { formatKES, formatRelativeTime } from "@/lib/utils/format";
import {
  FolderKanban,
  ClipboardList,
  ShoppingCart,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Truck,
  Plus,
  ArrowRight,
  Calendar,
  Filter,
} from "lucide-react";
import type { UserRole, RequisitionStatus } from "@/generated/prisma";

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "#94a3b8",
  SUBMITTED: "#60a5fa",
  PENDING_APPROVAL: "#f59e0b",
  APPROVED: "#34d399",
  REJECTED: "#f87171",
  SENT_TO_SUPPLIER: "#818cf8",
  PO_RAISED: "#a78bfa",
  DISPATCHED: "#fb923c",
  DELIVERED: "#4ade80",
  COMPLETE: "#22c55e",
  CANCELLED: "#cbd5e1",
};

const PO_COLORS: Record<string, string> = {
  DRAFT: "#94a3b8",
  SENT: "#60a5fa",
  ACKNOWLEDGED: "#818cf8",
  IN_TRANSIT: "#fb923c",
  COLLECTED: "#22c55e",
  CANCELLED: "#f87171",
};

const CHART_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4"];

function formatMonthLabel(key: string) {
  const [year, month] = key.split("-");
  const d = new Date(Number(year), Number(month) - 1, 1);
  return d.toLocaleString("default", { month: "short", year: "2-digit" });
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export default function DashboardPage() {
  const [role, setRole] = useState<UserRole | null>(null);
  const [fullName, setFullName] = useState("");
  const [projects, setProjects] = useState<any[]>([]);
  const [requisitions, setRequisitions] = useState<any[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  // Filter state
  const defaultFrom = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  const defaultTo = new Date().toISOString().slice(0, 10);
  const [fromDate, setFromDate] = useState(defaultFrom);
  const [toDate, setToDate] = useState(defaultTo);
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
  const [showProjectFilter, setShowProjectFilter] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        setRole(data.role);
        setFullName(data.fullName);
      })
      .catch(() => {});
  }, []);

  const loadBaseData = useCallback(async () => {
    if (!role) return;
    try {
      const [projRes, reqRes, poRes] = await Promise.all([
        fetch("/api/projects").then((r) => (r.ok ? r.json() : [])),
        fetch("/api/requisitions?limit=10").then((r) =>
          r.ok ? r.json() : { requisitions: [] }
        ),
        fetch("/api/purchase-orders")
          .then((r) => (r.ok ? r.json() : { purchaseOrders: [] }))
          .catch(() => ({ purchaseOrders: [] })),
      ]);
      setProjects(Array.isArray(projRes) ? projRes : []);
      setRequisitions(reqRes.requisitions || []);
      setPurchaseOrders(poRes.purchaseOrders || []);
    } catch {
      // handle silently
    }
  }, [role]);

  const loadStats = useCallback(async () => {
    if (!role) return;
    if (role === "DRIVER" || role === "CO_DRIVER") return;
    setStatsLoading(true);
    try {
      const params = new URLSearchParams({
        from: fromDate,
        to: toDate,
      });
      if (selectedProjectIds.length > 0) {
        params.set("projectIds", selectedProjectIds.join(","));
      }
      const res = await fetch(`/api/dashboard/stats?${params}`);
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch {
      // handle silently
    } finally {
      setStatsLoading(false);
    }
  }, [role, fromDate, toDate, selectedProjectIds]);

  useEffect(() => {
    loadBaseData();
  }, [loadBaseData]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const toggleProject = (id: string) => {
    setSelectedProjectIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  if (!role) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  const activeProjects = projects.filter(
    (p) => p.status === "ACTIVE" || p.status === "PLANNING"
  ).length;
  const openReqs = requisitions.filter(
    (r: any) => !["COMPLETE", "CANCELLED"].includes(r.status)
  ).length;
  const pendingApprovals = requisitions.filter(
    (r: any) => r.status === "PENDING_APPROVAL"
  ).length;
  const activePOs = (purchaseOrders || []).filter(
    (po: any) => !["COLLECTED", "CANCELLED"].includes(po.status)
  ).length;

  // Derived from stats
  const totalSpend = stats?.kpis?.totalSpend || 0;

  const reqPipelineData = (stats?.reqsByStatus || []).map((r: any) => ({
    status: r.status.replace(/_/g, " "),
    count: r.count,
    fill: STATUS_COLORS[r.status] || "#94a3b8",
  }));

  const spendData = (stats?.spendOverTime || []).map((s: any) => ({
    ...s,
    month: formatMonthLabel(s.month),
  }));

  const poStatusData = (stats?.posByStatus || []).map((p: any) => ({
    name: p.status.replace(/_/g, " "),
    value: p.count,
    fill: PO_COLORS[p.status] || "#94a3b8",
  }));

  const budgetData = stats?.budgetVsActual || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            Welcome back, {fullName.split(" ")[0]}
          </h1>
          <p className="text-sm text-gray-500">
            Here is what is happening across your projects today.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {(role === "SITE_MANAGER" || role === "CEO") && (
            <Link href="/requisitions/new">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                New Requisition
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Date + project filters — only for non-drivers */}
      {role !== "DRIVER" && role !== "CO_DRIVER" && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-gray-50 p-3">
          <Calendar className="h-4 w-4 text-gray-400 shrink-0" />
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500">From</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="rounded border px-2 py-1 text-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500">To</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="rounded border px-2 py-1 text-sm"
            />
          </div>
          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowProjectFilter((v) => !v)}
              className="text-xs"
            >
              <Filter className="mr-1 h-3 w-3" />
              {selectedProjectIds.length > 0
                ? `${selectedProjectIds.length} project${selectedProjectIds.length > 1 ? "s" : ""}`
                : "All projects"}
            </Button>
            {showProjectFilter && projects.length > 0 && (
              <div className="absolute top-full left-0 z-20 mt-1 w-64 rounded-lg border bg-white shadow-lg">
                <div className="max-h-48 overflow-y-auto p-2">
                  {projects.map((p) => (
                    <label
                      key={p.id}
                      className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 hover:bg-gray-50 text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={selectedProjectIds.includes(p.id)}
                        onChange={() => toggleProject(p.id)}
                        className="rounded"
                      />
                      <span className="truncate">{p.name}</span>
                    </label>
                  ))}
                </div>
                {selectedProjectIds.length > 0 && (
                  <div className="border-t p-2">
                    <button
                      className="text-xs text-blue-600 hover:underline"
                      onClick={() => setSelectedProjectIds([])}
                    >
                      Clear selection
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
          {statsLoading && (
            <span className="text-xs text-gray-400 animate-pulse">
              Updating…
            </span>
          )}
        </div>
      )}

      {/* CEO / PM Dashboard */}
      {(role === "CEO" || role === "PROJECT_MANAGER") && (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Active Projects"
              value={String(stats?.kpis?.activeProjects ?? activeProjects)}
              icon={FolderKanban}
              subtitle="Across all sites"
            />
            <StatCard
              title="Requisitions"
              value={String(stats?.kpis?.totalReqs ?? openReqs)}
              icon={ClipboardList}
              subtitle="In selected period"
            />
            <StatCard
              title="Pending Approvals"
              value={String(stats?.kpis?.pendingApprovals ?? pendingApprovals)}
              icon={Clock}
              subtitle={
                role === "CEO" ? "Needs your approval" : "With CEO"
              }
            />
            <StatCard
              title="Total Spend"
              value={formatKES(totalSpend || 0)}
              icon={DollarSign}
              subtitle="In selected period"
            />
          </div>

          {/* Charts row 1: Requisition Pipeline + Spend Over Time */}
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Requisition Pipeline</CardTitle>
              </CardHeader>
              <CardContent>
                {statsLoading ? (
                  <div className="h-48 animate-pulse rounded bg-muted" />
                ) : reqPipelineData.length === 0 ? (
                  <div className="flex h-48 items-center justify-center text-sm text-gray-400">
                    No requisitions in this period
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart
                      data={reqPipelineData}
                      margin={{ top: 4, right: 8, left: -20, bottom: 40 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis
                        dataKey="status"
                        tick={{ fontSize: 10 }}
                        angle={-35}
                        textAnchor="end"
                        interval={0}
                      />
                      <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                        {reqPipelineData.map((entry: any, index: number) => (
                          <Cell key={index} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Spend Over Time</CardTitle>
              </CardHeader>
              <CardContent>
                {statsLoading ? (
                  <div className="h-48 animate-pulse rounded bg-muted" />
                ) : spendData.length === 0 ? (
                  <div className="flex h-48 items-center justify-center text-sm text-gray-400">
                    No spend data in this period
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart
                      data={spendData}
                      margin={{ top: 4, right: 8, left: 0, bottom: 4 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                      <YAxis
                        tick={{ fontSize: 11 }}
                        tickFormatter={(v) =>
                          v >= 1_000_000
                            ? `${(v / 1_000_000).toFixed(1)}M`
                            : v >= 1000
                            ? `${(v / 1000).toFixed(0)}K`
                            : String(v)
                        }
                      />
                      <Tooltip
                        formatter={(v: number) => [formatKES(v), "Spend"]}
                      />
                      <Line
                        type="monotone"
                        dataKey="amount"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        dot={{ r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Charts row 2: Budget vs Actual + PO Status */}
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Budget vs Actual</CardTitle>
              </CardHeader>
              <CardContent>
                {statsLoading ? (
                  <div className="h-48 animate-pulse rounded bg-muted" />
                ) : budgetData.length === 0 ? (
                  <div className="flex h-48 items-center justify-center text-sm text-gray-400">
                    No budget data available
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart
                      data={budgetData}
                      margin={{ top: 4, right: 8, left: -10, bottom: 40 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis
                        dataKey="project"
                        tick={{ fontSize: 10 }}
                        angle={-30}
                        textAnchor="end"
                        interval={0}
                      />
                      <YAxis
                        tick={{ fontSize: 11 }}
                        tickFormatter={(v) =>
                          v >= 1_000_000
                            ? `${(v / 1_000_000).toFixed(1)}M`
                            : v >= 1000
                            ? `${(v / 1000).toFixed(0)}K`
                            : String(v)
                        }
                      />
                      <Tooltip
                        formatter={(v: number, name: string) => [
                          formatKES(v),
                          name === "allocated"
                            ? "Allocated"
                            : name === "spent"
                            ? "Spent"
                            : "Contract Value",
                        ]}
                      />
                      <Legend
                        wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                        formatter={(v) =>
                          v === "allocated"
                            ? "Allocated"
                            : v === "spent"
                            ? "Spent"
                            : "Contract"
                        }
                      />
                      <Bar
                        dataKey="allocated"
                        fill="#60a5fa"
                        radius={[4, 4, 0, 0]}
                      />
                      <Bar
                        dataKey="spent"
                        fill="#34d399"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">PO Status Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                {statsLoading ? (
                  <div className="h-48 animate-pulse rounded bg-muted" />
                ) : poStatusData.length === 0 ? (
                  <div className="flex h-48 items-center justify-center text-sm text-gray-400">
                    No purchase orders in this period
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie
                        data={poStatusData}
                        cx="50%"
                        cy="45%"
                        innerRadius={55}
                        outerRadius={85}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {poStatusData.map((entry: any, index: number) => (
                          <Cell
                            key={index}
                            fill={entry.fill || CHART_COLORS[index % CHART_COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: number, name: string) => [v, name]} />
                      <Legend
                        wrapperStyle={{ fontSize: 11 }}
                        formatter={(v) => v}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Recent Requisitions */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Recent Requisitions</CardTitle>
              <Link href="/requisitions">
                <Button variant="ghost" size="sm">
                  View all <ArrowRight className="ml-1 h-3 w-3" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {requisitions.length === 0 ? (
                <p className="text-sm text-gray-500">No requisitions yet.</p>
              ) : (
                <div className="space-y-3">
                  {requisitions.slice(0, 5).map((req: any) => (
                    <Link key={req.id} href={`/requisitions/${req.id}`}>
                      <div className="flex items-center justify-between rounded-lg border p-3 hover:bg-gray-50 transition-colors">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm font-medium">
                              {req.requisitionNumber}
                            </span>
                            <StatusBadge status={req.status as RequisitionStatus} />
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {req.project?.name} &middot; {req.requester?.fullName}
                          </p>
                        </div>
                        <span className="text-xs text-gray-400">
                          {formatRelativeTime(new Date(req.createdAt))}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* QS / Architect Dashboard */}
      {(role === "QS" || role === "ARCHITECT") && (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <StatCard
              title="Active Projects"
              value={String(stats?.kpis?.activeProjects ?? activeProjects)}
              icon={FolderKanban}
              subtitle="In progress"
            />
            <StatCard
              title="Requisitions"
              value={String(stats?.kpis?.totalReqs ?? openReqs)}
              icon={ClipboardList}
              subtitle="In selected period"
            />
            <StatCard
              title="Total Spend"
              value={formatKES(totalSpend)}
              icon={AlertTriangle}
              subtitle="In selected period"
            />
          </div>

          {/* Budget vs Actual */}
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Budget vs Actual</CardTitle>
              </CardHeader>
              <CardContent>
                {statsLoading ? (
                  <div className="h-48 animate-pulse rounded bg-muted" />
                ) : budgetData.length === 0 ? (
                  <div className="flex h-48 items-center justify-center text-sm text-gray-400">
                    No budget data available
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart
                      data={budgetData}
                      margin={{ top: 4, right: 8, left: -10, bottom: 40 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis
                        dataKey="project"
                        tick={{ fontSize: 10 }}
                        angle={-30}
                        textAnchor="end"
                        interval={0}
                      />
                      <YAxis
                        tick={{ fontSize: 11 }}
                        tickFormatter={(v) =>
                          v >= 1_000_000
                            ? `${(v / 1_000_000).toFixed(1)}M`
                            : v >= 1000
                            ? `${(v / 1000).toFixed(0)}K`
                            : String(v)
                        }
                      />
                      <Tooltip
                        formatter={(v: number, name: string) => [
                          formatKES(v),
                          name === "allocated" ? "Allocated" : "Spent",
                        ]}
                      />
                      <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                      <Bar dataKey="allocated" fill="#60a5fa" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="spent" fill="#34d399" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Spend Over Time</CardTitle>
              </CardHeader>
              <CardContent>
                {statsLoading ? (
                  <div className="h-48 animate-pulse rounded bg-muted" />
                ) : spendData.length === 0 ? (
                  <div className="flex h-48 items-center justify-center text-sm text-gray-400">
                    No spend data in this period
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart
                      data={spendData}
                      margin={{ top: 4, right: 8, left: 0, bottom: 4 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                      <YAxis
                        tick={{ fontSize: 11 }}
                        tickFormatter={(v) =>
                          v >= 1_000_000
                            ? `${(v / 1_000_000).toFixed(1)}M`
                            : v >= 1000
                            ? `${(v / 1000).toFixed(0)}K`
                            : String(v)
                        }
                      />
                      <Tooltip
                        formatter={(v: number) => [formatKES(v), "Spend"]}
                      />
                      <Line
                        type="monotone"
                        dataKey="amount"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        dot={{ r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* Site Manager Dashboard */}
      {role === "SITE_MANAGER" && (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="My Requisitions"
              value={String(stats?.kpis?.totalReqs ?? requisitions.length)}
              icon={ClipboardList}
              subtitle="In selected period"
            />
            <StatCard
              title="Active"
              value={String(openReqs)}
              icon={Clock}
              subtitle="In progress"
            />
            <StatCard
              title="Pending Deliveries"
              value={String(
                requisitions.filter((r: any) => r.status === "DISPATCHED")
                  .length
              )}
              icon={Truck}
              subtitle="En route"
            />
            <StatCard
              title="To Verify"
              value={String(
                requisitions.filter((r: any) => r.status === "DELIVERED").length
              )}
              icon={CheckCircle2}
              subtitle="Awaiting check"
            />
          </div>

          {/* Requisition pipeline chart for site manager */}
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">My Requisition Pipeline</CardTitle>
              </CardHeader>
              <CardContent>
                {statsLoading ? (
                  <div className="h-48 animate-pulse rounded bg-muted" />
                ) : reqPipelineData.length === 0 ? (
                  <div className="flex h-48 items-center justify-center text-sm text-gray-400">
                    No requisitions in this period
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart
                      data={reqPipelineData}
                      margin={{ top: 4, right: 8, left: -20, bottom: 40 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis
                        dataKey="status"
                        tick={{ fontSize: 10 }}
                        angle={-35}
                        textAnchor="end"
                        interval={0}
                      />
                      <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                        {reqPipelineData.map((entry: any, index: number) => (
                          <Cell key={index} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">My Recent Requisitions</CardTitle>
                <Link href="/requisitions">
                  <Button variant="ghost" size="sm">
                    View all
                  </Button>
                </Link>
              </CardHeader>
              <CardContent>
                {requisitions.length === 0 ? (
                  <p className="text-sm text-gray-500">
                    No requisitions yet. Create your first material request.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {requisitions.slice(0, 5).map((req: any) => (
                      <Link key={req.id} href={`/requisitions/${req.id}`}>
                        <div className="flex items-center justify-between rounded-lg border p-3 hover:bg-gray-50 transition-colors">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm">
                              {req.requisitionNumber}
                            </span>
                            <StatusBadge status={req.status as RequisitionStatus} />
                          </div>
                          <span className="text-sm font-medium">
                            {req._count?.items || 0} items
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* Driver Dashboard */}
      {(role === "DRIVER" || role === "CO_DRIVER") && (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <StatCard
              title="Active Assignments"
              value={String(activePOs)}
              icon={ShoppingCart}
              subtitle="To collect"
            />
            <StatCard
              title="Completed"
              value={String(
                (purchaseOrders || []).filter(
                  (po: any) => po.status === "COLLECTED"
                ).length
              )}
              icon={CheckCircle2}
              subtitle="Delivered"
            />
            <StatCard
              title="Pending"
              value={String(
                (purchaseOrders || []).filter((po: any) => po.status === "SENT")
                  .length
              )}
              icon={Clock}
              subtitle="Ready for collection"
            />
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">My Assignments</CardTitle>
              <Link href="/logistics">
                <Button variant="ghost" size="sm">
                  View all
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {(purchaseOrders || []).length === 0 ? (
                <p className="text-sm text-gray-500">No assignments yet.</p>
              ) : (
                <div className="space-y-2">
                  {(purchaseOrders || [])
                    .filter(
                      (po: any) =>
                        po.status !== "COLLECTED" && po.status !== "CANCELLED"
                    )
                    .slice(0, 5)
                    .map((po: any) => (
                      <Link key={po.id} href={`/purchase-orders/${po.id}`}>
                        <div className="flex items-center justify-between rounded-lg border p-3 hover:bg-gray-50 transition-colors">
                          <div>
                            <span className="font-mono text-sm font-medium">
                              {po.poNumber}
                            </span>
                            <p className="text-xs text-gray-500">
                              {po.supplier?.name} &middot;{" "}
                              {po.requisition?.site?.name}
                            </p>
                          </div>
                          <span className="text-xs text-gray-400">
                            {po.status}
                          </span>
                        </div>
                      </Link>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
/* eslint-enable @typescript-eslint/no-explicit-any */
