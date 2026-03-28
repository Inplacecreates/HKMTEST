"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatKES } from "@/lib/utils/format";
import { BarChart3, TrendingUp, Clock, Package } from "lucide-react";

export default function ReportsPage() {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const [finance, setFinance] = useState<any[]>([]);
  const [requisitions, setRequisitions] = useState<any>({ requisitions: [], total: 0 });
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [finRes, reqRes] = await Promise.all([
        fetch("/api/finance"),
        fetch("/api/requisitions?limit=100"),
      ]);
      if (finRes.ok) setFinance(await finRes.json());
      if (reqRes.ok) setRequisitions(await reqRes.json());
    } catch {
      // handle silently
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Requisition analytics
  const reqs = requisitions.requisitions || [];
  const statusBreakdown: Record<string, number> = {};
  for (const r of reqs) {
    statusBreakdown[r.status] = (statusBreakdown[r.status] || 0) + 1;
  }

  const totalBudget = Array.isArray(finance) ? finance.reduce((s: number, p: any) => s + (p.totalBudget || 0), 0) : 0;
  const totalSpent = Array.isArray(finance) ? finance.reduce((s: number, p: any) => s + (p.totalSpent || 0), 0) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Reports & Analytics</h1>
        <p className="text-sm text-gray-500">Overview of operations and financial performance</p>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-32 w-full rounded-lg" />)}
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Package className="h-4 w-4" />
                  Total Requisitions
                </div>
                <p className="text-3xl font-bold mt-1">{requisitions.total || 0}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Clock className="h-4 w-4" />
                  Active
                </div>
                <p className="text-3xl font-bold mt-1">
                  {reqs.filter((r: any) => !["COMPLETE", "CANCELLED"].includes(r.status)).length}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <TrendingUp className="h-4 w-4" />
                  Budget Utilization
                </div>
                <p className="text-3xl font-bold mt-1">
                  {totalBudget > 0 ? `${Math.round((totalSpent / totalBudget) * 100)}%` : "N/A"}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <BarChart3 className="h-4 w-4" />
                  Projects
                </div>
                <p className="text-3xl font-bold mt-1">{Array.isArray(finance) ? finance.length : 0}</p>
              </CardContent>
            </Card>
          </div>

          {/* Requisition Status Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Requisition Status Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              {Object.keys(statusBreakdown).length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">No requisition data yet</p>
              ) : (
                <div className="space-y-2">
                  {Object.entries(statusBreakdown).map(([status, count]) => {
                    const percentage = reqs.length > 0 ? (count / reqs.length) * 100 : 0;
                    return (
                      <div key={status} className="flex items-center gap-3">
                        <span className="text-sm text-gray-600 w-36 truncate">{status.replace("_", " ")}</span>
                        <div className="flex-1 h-5 rounded-full bg-gray-100 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-primary-500 transition-all"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium text-gray-700 w-8 text-right">{count}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Project Financial Summary */}
          {Array.isArray(finance) && finance.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Project Financial Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-gray-50 text-left">
                        <th className="px-3 py-2 font-medium text-gray-600">Project</th>
                        <th className="px-3 py-2 font-medium text-gray-600 text-right">Budget</th>
                        <th className="px-3 py-2 font-medium text-gray-600 text-right">Spent</th>
                        <th className="px-3 py-2 font-medium text-gray-600 text-right">Committed</th>
                        <th className="px-3 py-2 font-medium text-gray-600 text-right">Payments</th>
                        <th className="px-3 py-2 font-medium text-gray-600 text-right">Util.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {finance.map((p: any) => (
                        <tr key={p.id} className="border-b hover:bg-gray-50">
                          <td className="px-3 py-2">
                            <span className="font-mono text-xs text-gray-400 mr-1">{p.code}</span>
                            <span className="font-medium">{p.name}</span>
                          </td>
                          <td className="px-3 py-2 text-right">{formatKES(p.totalBudget)}</td>
                          <td className="px-3 py-2 text-right">{formatKES(p.totalSpent)}</td>
                          <td className="px-3 py-2 text-right">{formatKES(p.totalCommitted)}</td>
                          <td className="px-3 py-2 text-right text-green-600">{formatKES(p.totalPayments)}</td>
                          <td className="px-3 py-2 text-right font-medium">
                            {Math.round(p.budgetUtilization || 0)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
  /* eslint-enable @typescript-eslint/no-explicit-any */
}
