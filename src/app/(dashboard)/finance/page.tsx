"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { formatKES } from "@/lib/utils/format";
import { budgetPercentage, budgetHealthColor } from "@/lib/utils/format";
import { DollarSign, TrendingUp, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export default function FinancePage() {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadFinance = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/finance");
      if (res.ok) setProjects(await res.json());
    } catch {
      // handle silently
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadFinance(); }, [loadFinance]);

  // Summary totals
  const totalBudget = projects.reduce((s, p) => s + (p.totalBudget || 0), 0);
  const totalSpent = projects.reduce((s, p) => s + (p.totalSpent || 0), 0);
  const totalCommitted = projects.reduce((s, p) => s + (p.totalCommitted || 0), 0);
  const totalPayments = projects.reduce((s, p) => s + (p.totalPayments || 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Finance Overview</h1>
        <p className="text-sm text-gray-500">Budget tracking and client payments across all projects</p>
      </div>

      {loading ? (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24 w-full rounded-lg" />)}
          </div>
          <Skeleton className="h-64 w-full rounded-lg" />
        </div>
      ) : projects.length === 0 ? (
        <EmptyState
          icon={DollarSign}
          title="No financial data"
          description="Financial data will appear once projects have budgets and requisitions."
        />
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <DollarSign className="h-4 w-4" />
                  Total Budget
                </div>
                <p className="text-2xl font-bold mt-1">{formatKES(totalBudget)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <TrendingUp className="h-4 w-4" />
                  Total Spent
                </div>
                <p className="text-2xl font-bold mt-1">{formatKES(totalSpent)}</p>
                <p className="text-xs text-gray-400 mt-1">
                  {totalBudget > 0 ? `${Math.round((totalSpent / totalBudget) * 100)}% of budget` : ""}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <AlertTriangle className="h-4 w-4" />
                  Committed
                </div>
                <p className="text-2xl font-bold mt-1">{formatKES(totalCommitted)}</p>
                <p className="text-xs text-gray-400 mt-1">In approved requisitions</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <DollarSign className="h-4 w-4" />
                  Client Payments
                </div>
                <p className="text-2xl font-bold mt-1 text-green-700">{formatKES(totalPayments)}</p>
              </CardContent>
            </Card>
          </div>

          {/* Project Budgets */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Project Budget Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {projects.map((project: any) => {
                  const pct = budgetPercentage(project.totalSpent, project.totalAllocated);
                  const healthColor = budgetHealthColor(pct);

                  return (
                    <div key={project.id} className="rounded-lg border p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <span className="font-mono text-xs text-gray-400">{project.code}</span>
                          <h3 className="font-semibold text-gray-900">{project.name}</h3>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">{formatKES(project.totalBudget)}</p>
                          <p className="text-xs text-gray-500">Total Budget</p>
                        </div>
                      </div>

                      {/* Budget bar */}
                      <div className="mt-3">
                        <div className="flex justify-between text-xs text-gray-500 mb-1">
                          <span>Spent: {formatKES(project.totalSpent)}</span>
                          <span className={cn("font-medium", healthColor)}>
                            {Math.round(pct)}%
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all",
                              pct >= 90 ? "bg-red-500" : pct >= 70 ? "bg-amber-500" : "bg-green-500"
                            )}
                            style={{ width: `${Math.min(pct, 100)}%` }}
                          />
                        </div>
                      </div>

                      {/* Budget categories */}
                      {project.budgets?.length > 0 && (
                        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                          {project.budgets.map((b: any) => (
                            <div key={b.category} className="flex justify-between">
                              <span className="text-gray-500">{b.category}</span>
                              <span className="font-medium">
                                {formatKES(Number(b.spent))} / {formatKES(Number(b.allocated))}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      {project.totalPayments > 0 && (
                        <div className="mt-2 text-xs text-green-600">
                          Client payments: {formatKES(project.totalPayments)}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
  /* eslint-enable @typescript-eslint/no-explicit-any */
}
