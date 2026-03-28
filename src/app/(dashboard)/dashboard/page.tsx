"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
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
} from "lucide-react";
import type { UserRole, RequisitionStatus } from "@/generated/prisma";

export default function DashboardPage() {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const [role, setRole] = useState<UserRole | null>(null);
  const [fullName, setFullName] = useState("");
  const [projects, setProjects] = useState<any[]>([]);
  const [requisitions, setRequisitions] = useState<any[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  const [finance, setFinance] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        setRole(data.role);
        setFullName(data.fullName);
      })
      .catch(() => {});
  }, []);

  const loadData = useCallback(async () => {
    if (!role) return;
    try {
      const [projRes, reqRes, poRes, finRes] = await Promise.all([
        fetch("/api/projects").then((r) => r.ok ? r.json() : []),
        fetch("/api/requisitions?limit=10").then((r) => r.ok ? r.json() : { requisitions: [] }),
        fetch("/api/purchase-orders").then((r) => r.ok ? r.json() : { purchaseOrders: [] }).catch(() => ({ purchaseOrders: [] })),
        fetch("/api/finance").then((r) => r.ok ? r.json() : []).catch(() => []),
      ]);
      setProjects(Array.isArray(projRes) ? projRes : []);
      setRequisitions(reqRes.requisitions || []);
      setPurchaseOrders(poRes.purchaseOrders || []);
      setFinance(Array.isArray(finRes) ? finRes : []);
    } catch {
      // handle silently
    }
  }, [role]);

  useEffect(() => { loadData(); }, [loadData]);

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

  const activeProjects = projects.filter((p) => p.status === "ACTIVE" || p.status === "PLANNING").length;
  const openReqs = requisitions.filter((r: any) => !["COMPLETE", "CANCELLED"].includes(r.status)).length;
  const pendingApprovals = requisitions.filter((r: any) => r.status === "PENDING_APPROVAL").length;
  const totalSpent = Array.isArray(finance) ? finance.reduce((s: number, p: any) => s + (p.totalSpent || 0), 0) : 0;
  const activePOs = (purchaseOrders || []).filter((po: any) => !["COLLECTED", "CANCELLED"].includes(po.status)).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Welcome back, {fullName.split(" ")[0]}</h1>
          <p className="text-sm text-gray-500">Here is what is happening across your projects today.</p>
        </div>
        {(role === "SITE_MANAGER" || role === "CEO") && (
          <Link href="/requisitions/new">
            <Button><Plus className="mr-2 h-4 w-4" />New Requisition</Button>
          </Link>
        )}
      </div>

      {/* CEO / PM Dashboard */}
      {(role === "CEO" || role === "PROJECT_MANAGER") && (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatCard title="Active Projects" value={String(activeProjects)} icon={FolderKanban} subtitle="Across all sites" />
            <StatCard title="Open Requisitions" value={String(openReqs)} icon={ClipboardList} subtitle="Awaiting action" />
            <StatCard title="Pending Approvals" value={String(pendingApprovals)} icon={Clock} subtitle={role === "CEO" ? "Needs your approval" : "With CEO"} />
            <StatCard title="Total Spend" value={formatKES(totalSpent)} icon={DollarSign} subtitle="Across projects" />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">Recent Requisitions</CardTitle>
                <Link href="/requisitions">
                  <Button variant="ghost" size="sm">View all <ArrowRight className="ml-1 h-3 w-3" /></Button>
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
                              <span className="font-mono text-sm font-medium">{req.requisitionNumber}</span>
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

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">Budget Overview</CardTitle>
                <Link href="/finance">
                  <Button variant="ghost" size="sm">Details <ArrowRight className="ml-1 h-3 w-3" /></Button>
                </Link>
              </CardHeader>
              <CardContent>
                {!Array.isArray(finance) || finance.length === 0 ? (
                  <p className="text-sm text-gray-500">No budget data yet.</p>
                ) : (
                  <div className="space-y-3">
                    {finance.slice(0, 4).map((project: any) => {
                      const pct = project.totalAllocated > 0 ? (project.totalSpent / project.totalAllocated) * 100 : 0;
                      return (
                        <div key={project.id}>
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium truncate">{project.name}</span>
                            <span className="text-gray-500 text-xs">{Math.round(pct)}%</span>
                          </div>
                          <div className="mt-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${pct >= 90 ? "bg-red-500" : pct >= 70 ? "bg-amber-500" : "bg-green-500"}`}
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
          </div>
        </>
      )}

      {/* Site Manager Dashboard */}
      {role === "SITE_MANAGER" && (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatCard title="My Requisitions" value={String(requisitions.length)} icon={ClipboardList} subtitle="Total requests" />
            <StatCard title="Active" value={String(openReqs)} icon={Clock} subtitle="In progress" />
            <StatCard title="Pending Deliveries" value={String(requisitions.filter((r: any) => r.status === "DISPATCHED").length)} icon={Truck} subtitle="En route" />
            <StatCard title="To Verify" value={String(requisitions.filter((r: any) => r.status === "DELIVERED").length)} icon={CheckCircle2} subtitle="Awaiting check" />
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">My Recent Requisitions</CardTitle>
              <Link href="/requisitions"><Button variant="ghost" size="sm">View all</Button></Link>
            </CardHeader>
            <CardContent>
              {requisitions.length === 0 ? (
                <p className="text-sm text-gray-500">No requisitions yet. Create your first material request.</p>
              ) : (
                <div className="space-y-2">
                  {requisitions.slice(0, 5).map((req: any) => (
                    <Link key={req.id} href={`/requisitions/${req.id}`}>
                      <div className="flex items-center justify-between rounded-lg border p-3 hover:bg-gray-50 transition-colors">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm">{req.requisitionNumber}</span>
                          <StatusBadge status={req.status as RequisitionStatus} />
                        </div>
                        <span className="text-sm font-medium">{req._count?.items || 0} items</span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Driver Dashboard */}
      {(role === "DRIVER" || role === "CO_DRIVER") && (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <StatCard title="Active Assignments" value={String(activePOs)} icon={ShoppingCart} subtitle="To collect" />
            <StatCard title="Completed" value={String((purchaseOrders || []).filter((po: any) => po.status === "COLLECTED").length)} icon={CheckCircle2} subtitle="Delivered" />
            <StatCard title="Pending" value={String((purchaseOrders || []).filter((po: any) => po.status === "SENT").length)} icon={Clock} subtitle="Ready for collection" />
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">My Assignments</CardTitle>
              <Link href="/logistics"><Button variant="ghost" size="sm">View all</Button></Link>
            </CardHeader>
            <CardContent>
              {(purchaseOrders || []).length === 0 ? (
                <p className="text-sm text-gray-500">No assignments yet.</p>
              ) : (
                <div className="space-y-2">
                  {(purchaseOrders || []).filter((po: any) => po.status !== "COLLECTED" && po.status !== "CANCELLED").slice(0, 5).map((po: any) => (
                    <Link key={po.id} href={`/purchase-orders/${po.id}`}>
                      <div className="flex items-center justify-between rounded-lg border p-3 hover:bg-gray-50 transition-colors">
                        <div>
                          <span className="font-mono text-sm font-medium">{po.poNumber}</span>
                          <p className="text-xs text-gray-500">{po.supplier?.name} &middot; {po.requisition?.site?.name}</p>
                        </div>
                        <span className="text-xs text-gray-400">{po.status}</span>
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
            <StatCard title="Active Projects" value={String(activeProjects)} icon={FolderKanban} subtitle="In progress" />
            <StatCard title="Open Requisitions" value={String(openReqs)} icon={ClipboardList} subtitle="Across projects" />
            <StatCard title="Budget Health" value={`${finance.length > 0 ? "Active" : "N/A"}`} icon={AlertTriangle} subtitle="Monitoring" />
          </div>
        </>
      )}
    </div>
  );
  /* eslint-enable @typescript-eslint/no-explicit-any */
}
