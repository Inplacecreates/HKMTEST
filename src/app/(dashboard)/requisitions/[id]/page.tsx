"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RequisitionPipeline } from "@/components/requisitions/requisition-pipeline";
import { RequisitionItemsTable } from "@/components/requisitions/requisition-items-table";
import { TransitionActions } from "@/components/requisitions/transition-actions";
import { StatusBadge } from "@/components/requisitions/status-badge";
import { formatKES, formatDate, formatRelativeTime } from "@/lib/utils/format";
import { REQUISITION_STATUS_LABELS } from "@/lib/utils/constants";
import type { RequisitionStatus, UserRole } from "@/generated/prisma";
import { ArrowLeft, FileText, Clock, DollarSign, MapPin } from "lucide-react";

interface UserInfo {
  id: string;
  role: UserRole;
  tenantId: string;
  fullName: string;
}

export default function RequisitionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [requisition, setRequisition] = useState<Record<string, unknown> | null>(null);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [transitioning, setTransitioning] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then(setUser)
      .catch(() => {});
  }, []);

  const loadRequisition = useCallback(async () => {
    try {
      const res = await fetch(`/api/requisitions/${params.id}`);
      if (res.ok) {
        setRequisition(await res.json());
      } else if (res.status === 404) {
        router.push("/requisitions");
      }
    } catch {
      // handle silently
    } finally {
      setLoading(false);
    }
  }, [params.id, router]);

  useEffect(() => {
    loadRequisition();
  }, [loadRequisition]);

  const handleTransition = async (targetStatus: RequisitionStatus, note?: string) => {
    setTransitioning(true);
    setError("");
    try {
      const res = await fetch(`/api/requisitions/${params.id}/transition`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetStatus, note }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Transition failed");
      }

      await loadRequisition();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Transition failed");
    } finally {
      setTransitioning(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!requisition) {
    return <div>Requisition not found</div>;
  }

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const req = requisition as any;
  const status = req.status as RequisitionStatus;
  const items = (req.items || []) as any[];
  const statusLogs = (req.statusLogs || []) as any[];
  const purchaseOrders = (req.purchaseOrders || []) as any[];
  /* eslint-enable @typescript-eslint/no-explicit-any */

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/requisitions">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold font-mono">{req.requisitionNumber}</h1>
              <StatusBadge status={status} size="md" />
            </div>
            <p className="text-sm text-gray-500">
              {req.project?.name} &middot; {req.site?.name}
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Pipeline Tracker */}
      <Card>
        <CardContent className="py-4">
          <RequisitionPipeline status={status} />
        </CardContent>
      </Card>

      {/* Transition Actions */}
      {user && (
        <TransitionActions
          requisitionId={req.id}
          currentStatus={status}
          userRole={user.role}
          onTransition={handleTransition}
          isLoading={transitioning}
        />
      )}

      {/* Info Grid */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
              <FileText className="h-4 w-4" />
              <span>Details</span>
            </div>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-500">Priority</dt>
                <dd>
                  <Badge variant={req.priority === "CRITICAL" ? "destructive" : req.priority === "URGENT" ? "warning" : "default"}>
                    {req.priority}
                  </Badge>
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Requested by</dt>
                <dd className="font-medium">{req.requester?.fullName}</dd>
              </div>
              {req.projectManager && (
                <div className="flex justify-between">
                  <dt className="text-gray-500">Assigned PM</dt>
                  <dd className="font-medium">{req.projectManager?.fullName}</dd>
                </div>
              )}
              {req.approver && (
                <div className="flex justify-between">
                  <dt className="text-gray-500">Approved by</dt>
                  <dd className="font-medium">{req.approver?.fullName}</dd>
                </div>
              )}
              {req.fundingSource && (
                <div className="flex justify-between">
                  <dt className="text-gray-500">Funding</dt>
                  <dd>{req.fundingSource.replace("_", " ")}</dd>
                </div>
              )}
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
              <DollarSign className="h-4 w-4" />
              <span>Financials</span>
            </div>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-500">Estimated</dt>
                <dd className="font-bold text-lg">{formatKES(Number(req.totalEstimated))}</dd>
              </div>
              {Number(req.totalActual) > 0 && (
                <div className="flex justify-between">
                  <dt className="text-gray-500">Actual</dt>
                  <dd className="font-bold">{formatKES(Number(req.totalActual))}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-gray-500">Items</dt>
                <dd>{items.length}</dd>
              </div>
              {purchaseOrders.length > 0 && (
                <div className="flex justify-between">
                  <dt className="text-gray-500">POs</dt>
                  <dd>{purchaseOrders.length}</dd>
                </div>
              )}
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
              <Clock className="h-4 w-4" />
              <span>Timeline</span>
            </div>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-500">Created</dt>
                <dd>{formatDate(new Date(req.createdAt))}</dd>
              </div>
              {req.submittedAt && (
                <div className="flex justify-between">
                  <dt className="text-gray-500">Submitted</dt>
                  <dd>{formatDate(new Date(req.submittedAt))}</dd>
                </div>
              )}
              {req.approvedAt && (
                <div className="flex justify-between">
                  <dt className="text-gray-500">Approved</dt>
                  <dd>{formatDate(new Date(req.approvedAt))}</dd>
                </div>
              )}
              {req.completedAt && (
                <div className="flex justify-between">
                  <dt className="text-gray-500">Completed</dt>
                  <dd>{formatDate(new Date(req.completedAt))}</dd>
                </div>
              )}
            </dl>
          </CardContent>
        </Card>
      </div>

      {/* Notes */}
      {(req.notes || req.clientSpecs) && (
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
              <MapPin className="h-4 w-4" />
              <span>Notes & Specs</span>
            </div>
            {req.notes && (
              <div className="mb-3">
                <p className="text-xs font-medium text-gray-500 mb-1">Notes</p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{req.notes}</p>
              </div>
            )}
            {req.clientSpecs && (
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Client Specifications</p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{req.clientSpecs}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tabs: Items, Activity Log, POs */}
      <Tabs defaultValue="items">
        <TabsList>
          <TabsTrigger value="items">Items ({items.length})</TabsTrigger>
          <TabsTrigger value="activity">Activity ({statusLogs.length})</TabsTrigger>
          {purchaseOrders.length > 0 && (
            <TabsTrigger value="pos">POs ({purchaseOrders.length})</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="items">
          <Card>
            <CardContent className="pt-4">
              <RequisitionItemsTable items={items} showPricing={user?.role !== "SITE_MANAGER" || status !== "DRAFT"} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity">
          <Card>
            <CardContent className="pt-4">
              {statusLogs.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">No activity yet</p>
              ) : (
                <div className="space-y-3">
                  {statusLogs.map((log: Record<string, unknown>) => (
                    <div key={log.id as string} className="flex items-start gap-3 text-sm">
                      <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-gray-400" />
                      <div className="flex-1">
                        <p className="text-gray-700">
                          <span className="font-medium">
                            {REQUISITION_STATUS_LABELS[log.fromStatus as RequisitionStatus]}
                          </span>
                          {" → "}
                          <span className="font-medium">
                            {REQUISITION_STATUS_LABELS[log.toStatus as RequisitionStatus]}
                          </span>
                        </p>
                        {log.note ? (
                          <p className="text-gray-500 mt-0.5">{log.note as string}</p>
                        ) : null}
                        <p className="text-xs text-gray-400 mt-0.5">
                          {formatRelativeTime(new Date(log.createdAt as string))}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {purchaseOrders.length > 0 && (
          <TabsContent value="pos">
            <Card>
              <CardContent className="pt-4">
                <div className="space-y-2">
                  {purchaseOrders.map((po: Record<string, unknown>) => (
                    <div key={po.id as string} className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <span className="font-mono text-sm font-medium">{po.poNumber as string}</span>
                        <Badge className="ml-2" variant="secondary">{po.status as string}</Badge>
                      </div>
                      <span className="font-semibold">{formatKES(Number(po.totalAmount))}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
