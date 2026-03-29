"use client";

import { useState, useEffect, useCallback } from "react";
import {
  BarChart,
  Bar,
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/requisitions/status-badge";
import { formatKES } from "@/lib/utils/format";
import {
  BarChart3,
  TrendingUp,
  Users,
  FolderKanban,
  Calendar,
  Filter,
  Printer,
  RefreshCw,
} from "lucide-react";
import type { RequisitionStatus } from "@/generated/prisma";

const CHART_COLORS = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
  "#84cc16",
];

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

type ReportType = "pipeline" | "spend_category" | "supplier_spend" | "budget_actual";

const REPORT_TABS: { id: ReportType; label: string; icon: React.ElementType }[] = [
  { id: "pipeline", label: "Requisition Pipeline", icon: BarChart3 },
  { id: "spend_category", label: "Spend by Category", icon: TrendingUp },
  { id: "supplier_spend", label: "Supplier Spend", icon: Users },
  { id: "budget_actual", label: "Budget vs Actual", icon: FolderKanban },
];

/* eslint-disable @typescript-eslint/no-explicit-any */
export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<ReportType>("pipeline");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState<any[]>([]);

  const defaultFrom = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  const defaultTo = new Date().toISOString().slice(0, 10);
  const [fromDate, setFromDate] = useState(defaultFrom);
  const [toDate, setToDate] = useState(defaultTo);
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
  const [showProjectFilter, setShowProjectFilter] = useState(false);

  useEffect(() => {
    fetch("/api/projects")
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setProjects(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, []);

  const loadReport = useCallback(async () => {
    setLoading(true);
    setData(null);
    try {
      const params = new URLSearchParams({
        type: activeTab,
        from: fromDate,
        to: toDate,
      });
      if (selectedProjectIds.length > 0) {
        params.set("projectIds", selectedProjectIds.join(","));
      }
      const res = await fetch(`/api/reports?${params}`);
      if (res.ok) {
        setData(await res.json());
      }
    } catch {
      // handle silently
    } finally {
      setLoading(false);
    }
  }, [activeTab, fromDate, toDate, selectedProjectIds]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const toggleProject = (id: string) => {
    setSelectedProjectIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handlePrint = () => window.print();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Reports & Analytics</h1>
          <p className="text-sm text-gray-500">
            Procurement and financial performance insights
          </p>
        </div>
        <div className="flex gap-2 print:hidden">
          <Button variant="outline" size="sm" onClick={loadReport}>
            <RefreshCw className="mr-1 h-4 w-4" />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="mr-1 h-4 w-4" />
            Print
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-gray-50 p-3 print:hidden">
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
      </div>

      {/* Report type tabs */}
      <div className="flex gap-1 border-b print:hidden">
        {REPORT_TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
                activeTab === tab.id
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Active tab label for print */}
      <div className="hidden print:block text-lg font-semibold">
        {REPORT_TABS.find((t) => t.id === activeTab)?.label}
        {" — "}
        {new Date(fromDate).toLocaleDateString()} to{" "}
        {new Date(toDate).toLocaleDateString()}
      </div>

      {loading ? (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 w-full rounded-lg" />
            ))}
          </div>
          <Skeleton className="h-64 w-full rounded-lg" />
        </div>
      ) : (
        <>
          {/* PIPELINE REPORT */}
          {activeTab === "pipeline" && data && (
            <PipelineReport data={data} />
          )}

          {/* SPEND BY CATEGORY */}
          {activeTab === "spend_category" && data && (
            <SpendCategoryReport data={data} />
          )}

          {/* SUPPLIER SPEND */}
          {activeTab === "supplier_spend" && data && (
            <SupplierSpendReport data={data} />
          )}

          {/* BUDGET VS ACTUAL */}
          {activeTab === "budget_actual" && data && (
            <BudgetActualReport data={data} />
          )}

          {!data && !loading && (
            <div className="flex h-64 items-center justify-center text-gray-400">
              No data available for this period.
            </div>
          )}
        </>
      )}
    </div>
  );
}

function PipelineReport({ data }: { data: any }) {
  const statusData = Object.entries(data.statusSummary || {}).map(
    ([status, count]) => ({
      status: status.replace(/_/g, " "),
      count: count as number,
      fill: STATUS_COLORS[status] || "#94a3b8",
    })
  );

  const urgencyData = Object.entries(data.urgencySummary || {}).map(
    ([urgency, count], i) => ({
      name: urgency,
      value: count as number,
      fill: CHART_COLORS[i % CHART_COLORS.length],
    })
  );

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-gray-500">Total Requisitions</p>
            <p className="text-3xl font-bold">{data.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-gray-500">Complete</p>
            <p className="text-3xl font-bold text-green-600">
              {data.statusSummary?.COMPLETE || 0}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-gray-500">Pending Approval</p>
            <p className="text-3xl font-bold text-amber-500">
              {data.statusSummary?.PENDING_APPROVAL || 0}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {statusData.length === 0 ? (
              <p className="text-center text-sm text-gray-400 py-8">No data</p>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart
                  data={statusData}
                  margin={{ top: 4, right: 8, left: -20, bottom: 44 }}
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
                    {statusData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Urgency Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            {urgencyData.length === 0 ? (
              <p className="text-center text-sm text-gray-400 py-8">No data</p>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={urgencyData}
                    cx="50%"
                    cy="45%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {urgencyData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* By project */}
      {data.byProject?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Requisitions by Project</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50 text-left">
                    <th className="px-3 py-2 font-medium text-gray-600">Project</th>
                    <th className="px-3 py-2 font-medium text-gray-600 text-right">Total</th>
                    <th className="px-3 py-2 font-medium text-gray-600 text-right">Complete</th>
                    <th className="px-3 py-2 font-medium text-gray-600 text-right">Active</th>
                  </tr>
                </thead>
                <tbody>
                  {data.byProject.map((p: any) => (
                    <tr key={p.name} className="border-b hover:bg-gray-50">
                      <td className="px-3 py-2 font-medium">{p.name}</td>
                      <td className="px-3 py-2 text-right">{p.count}</td>
                      <td className="px-3 py-2 text-right text-green-600">
                        {p.statuses?.COMPLETE || 0}
                      </td>
                      <td className="px-3 py-2 text-right text-blue-600">
                        {p.count - (p.statuses?.COMPLETE || 0) - (p.statuses?.CANCELLED || 0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detail table */}
      {data.items?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Requisition Detail</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50 text-left">
                    <th className="px-3 py-2 font-medium text-gray-600">Number</th>
                    <th className="px-3 py-2 font-medium text-gray-600">Project</th>
                    <th className="px-3 py-2 font-medium text-gray-600">Site</th>
                    <th className="px-3 py-2 font-medium text-gray-600">Requester</th>
                    <th className="px-3 py-2 font-medium text-gray-600">Status</th>
                    <th className="px-3 py-2 font-medium text-gray-600 text-right">Items</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((r: any) => (
                    <tr key={r.id} className="border-b hover:bg-gray-50">
                      <td className="px-3 py-2 font-mono text-xs">{r.requisitionNumber}</td>
                      <td className="px-3 py-2">{r.project?.name || "—"}</td>
                      <td className="px-3 py-2 text-gray-500">{r.site?.name || "—"}</td>
                      <td className="px-3 py-2 text-gray-500">{r.requester?.fullName || "—"}</td>
                      <td className="px-3 py-2">
                        <StatusBadge status={r.status as RequisitionStatus} />
                      </td>
                      <td className="px-3 py-2 text-right">{r._count?.items || 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function SpendCategoryReport({ data }: { data: any }) {
  const chartData = (data.categories || []).slice(0, 8).map((c: any, i: number) => ({
    ...c,
    fill: CHART_COLORS[i % CHART_COLORS.length],
  }));

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-gray-500">Total Spend</p>
            <p className="text-3xl font-bold">{formatKES(data.grandTotal)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-gray-500">Categories</p>
            <p className="text-3xl font-bold">{data.categories?.length || 0}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Spend by Category</CardTitle>
          </CardHeader>
          <CardContent>
            {chartData.length === 0 ? (
              <p className="text-center text-sm text-gray-400 py-8">No data</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart
                  data={chartData}
                  layout="vertical"
                  margin={{ top: 4, right: 40, left: 80, bottom: 4 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v) =>
                      v >= 1_000_000
                        ? `${(v / 1_000_000).toFixed(1)}M`
                        : v >= 1000
                        ? `${(v / 1000).toFixed(0)}K`
                        : String(v)
                    }
                  />
                  <YAxis
                    type="category"
                    dataKey="category"
                    tick={{ fontSize: 11 }}
                    width={80}
                  />
                  <Tooltip formatter={(v: number) => [formatKES(v), "Spend"]} />
                  <Bar dataKey="totalSpend" radius={[0, 4, 4, 0]}>
                    {chartData.map((entry: any, i: number) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Category Share</CardTitle>
          </CardHeader>
          <CardContent>
            {chartData.length === 0 ? (
              <p className="text-center text-sm text-gray-400 py-8">No data</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="45%"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="totalSpend"
                    nameKey="category"
                  >
                    {chartData.map((entry: any, i: number) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => [formatKES(v), "Spend"]} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Category Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          {!data.categories?.length ? (
            <p className="text-center text-sm text-gray-400 py-4">No data</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50 text-left">
                    <th className="px-3 py-2 font-medium text-gray-600">Category</th>
                    <th className="px-3 py-2 font-medium text-gray-600 text-right">Total Spend</th>
                    <th className="px-3 py-2 font-medium text-gray-600 text-right">Share</th>
                    <th className="px-3 py-2 font-medium text-gray-600 text-right">Line Items</th>
                  </tr>
                </thead>
                <tbody>
                  {data.categories.map((c: any) => (
                    <tr key={c.category} className="border-b hover:bg-gray-50">
                      <td className="px-3 py-2 font-medium">{c.category}</td>
                      <td className="px-3 py-2 text-right">{formatKES(c.totalSpend)}</td>
                      <td className="px-3 py-2 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-20 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-blue-500"
                              style={{ width: `${c.percentage}%` }}
                            />
                          </div>
                          <span>{c.percentage}%</span>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-right text-gray-500">{c.itemCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SupplierSpendReport({ data }: { data: any }) {
  const top10 = (data.suppliers || []).slice(0, 10).map((s: any, i: number) => ({
    ...s,
    fill: CHART_COLORS[i % CHART_COLORS.length],
  }));

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-gray-500">Total Spend</p>
            <p className="text-3xl font-bold">{formatKES(data.grandTotal)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-gray-500">Suppliers Used</p>
            <p className="text-3xl font-bold">{data.supplierCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-gray-500">Top Supplier Share</p>
            <p className="text-3xl font-bold">
              {data.suppliers?.[0]?.percentage || 0}%
            </p>
          </CardContent>
        </Card>
      </div>

      {top10.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top 10 Suppliers by Spend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart
                data={top10}
                layout="vertical"
                margin={{ top: 4, right: 60, left: 100, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v) =>
                    v >= 1_000_000
                      ? `${(v / 1_000_000).toFixed(1)}M`
                      : v >= 1000
                      ? `${(v / 1000).toFixed(0)}K`
                      : String(v)
                  }
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 11 }}
                  width={100}
                />
                <Tooltip formatter={(v: number) => [formatKES(v), "Spend"]} />
                <Bar dataKey="totalSpend" radius={[0, 4, 4, 0]}>
                  {top10.map((entry: any, i: number) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Supplier Detail</CardTitle>
        </CardHeader>
        <CardContent>
          {!data.suppliers?.length ? (
            <p className="text-center text-sm text-gray-400 py-4">No data</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50 text-left">
                    <th className="px-3 py-2 font-medium text-gray-600">Supplier</th>
                    <th className="px-3 py-2 font-medium text-gray-600">Town</th>
                    <th className="px-3 py-2 font-medium text-gray-600 text-right">Total Spend</th>
                    <th className="px-3 py-2 font-medium text-gray-600 text-right">POs</th>
                    <th className="px-3 py-2 font-medium text-gray-600 text-right">Projects</th>
                    <th className="px-3 py-2 font-medium text-gray-600 text-right">Share</th>
                  </tr>
                </thead>
                <tbody>
                  {data.suppliers.map((s: any) => (
                    <tr key={s.supplierId} className="border-b hover:bg-gray-50">
                      <td className="px-3 py-2 font-medium">{s.name}</td>
                      <td className="px-3 py-2 text-gray-500">{s.town || "—"}</td>
                      <td className="px-3 py-2 text-right font-medium">
                        {formatKES(s.totalSpend)}
                      </td>
                      <td className="px-3 py-2 text-right">{s.poCount}</td>
                      <td className="px-3 py-2 text-right">{s.projectCount}</td>
                      <td className="px-3 py-2 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-blue-500"
                              style={{ width: `${s.percentage}%` }}
                            />
                          </div>
                          <span>{s.percentage}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function BudgetActualReport({ data }: { data: any }) {
  const chartData = (data.projects || []).map((p: any) => ({
    project: p.name.length > 16 ? p.name.slice(0, 14) + "…" : p.name,
    allocated: p.totalAllocated,
    spent: p.totalSpent,
    contract: p.contractValue,
  }));

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-gray-500">Total Allocated</p>
            <p className="text-3xl font-bold">
              {formatKES(
                (data.projects || []).reduce(
                  (s: number, p: any) => s + p.totalAllocated,
                  0
                )
              )}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-gray-500">Total Spent</p>
            <p className="text-3xl font-bold text-blue-600">
              {formatKES(
                (data.projects || []).reduce(
                  (s: number, p: any) => s + p.totalSpent,
                  0
                )
              )}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-gray-500">Total Received</p>
            <p className="text-3xl font-bold text-green-600">
              {formatKES(
                (data.projects || []).reduce(
                  (s: number, p: any) => s + p.totalReceived,
                  0
                )
              )}
            </p>
          </CardContent>
        </Card>
      </div>

      {chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Allocated vs Spent by Project</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart
                data={chartData}
                margin={{ top: 4, right: 8, left: -10, bottom: 44 }}
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
                <Legend
                  wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                  formatter={(v) => (v === "allocated" ? "Allocated" : "Spent")}
                />
                <Bar dataKey="allocated" fill="#60a5fa" radius={[4, 4, 0, 0]} />
                <Bar dataKey="spent" fill="#34d399" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Per-project details */}
      {(data.projects || []).map((p: any) => (
        <Card key={p.id}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                <span className="font-mono text-xs text-gray-400 mr-2">{p.code}</span>
                {p.name}
              </CardTitle>
              <div className="flex items-center gap-3 text-sm">
                <span className="text-gray-500">
                  Contract: <strong>{formatKES(p.contractValue)}</strong>
                </span>
                <span
                  className={`font-medium ${
                    p.utilization >= 90
                      ? "text-red-600"
                      : p.utilization >= 70
                      ? "text-amber-600"
                      : "text-green-600"
                  }`}
                >
                  {p.utilization}% utilised
                </span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 mb-4 sm:grid-cols-4">
              <div>
                <p className="text-xs text-gray-500">Allocated</p>
                <p className="font-semibold">{formatKES(p.totalAllocated)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Spent</p>
                <p className="font-semibold text-blue-600">{formatKES(p.totalSpent)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Remaining</p>
                <p className={`font-semibold ${p.remaining < 0 ? "text-red-600" : "text-green-600"}`}>
                  {formatKES(p.remaining)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Client Payments</p>
                <p className="font-semibold text-green-600">{formatKES(p.totalReceived)}</p>
              </div>
            </div>
            {p.categories?.length > 0 && (
              <div className="space-y-2">
                {p.categories.map((c: any) => {
                  const pct = c.allocated > 0 ? (c.spent / c.allocated) * 100 : 0;
                  return (
                    <div key={c.category}>
                      <div className="flex items-center justify-between text-xs text-gray-600 mb-0.5">
                        <span>{c.category}</span>
                        <span>
                          {formatKES(c.spent)} / {formatKES(c.allocated)}
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            pct >= 90 ? "bg-red-500" : pct >= 70 ? "bg-amber-500" : "bg-green-500"
                          }`}
                          style={{ width: `${Math.min(pct, 100)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      {(!data.projects || data.projects.length === 0) && (
        <div className="flex h-48 items-center justify-center text-gray-400">
          No project budget data available.
        </div>
      )}
    </div>
  );
}
/* eslint-enable @typescript-eslint/no-explicit-any */
