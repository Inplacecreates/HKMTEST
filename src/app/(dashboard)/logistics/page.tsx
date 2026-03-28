"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { formatDate } from "@/lib/utils/format";
import { Truck, MapPin, Package } from "lucide-react";

const STATUS_STYLES: Record<string, { bg: string; label: string }> = {
  CREATED: { bg: "bg-gray-100 text-gray-700", label: "Pending" },
  SENT: { bg: "bg-blue-100 text-blue-700", label: "Ready for Collection" },
  PARTIALLY_COLLECTED: { bg: "bg-yellow-100 text-yellow-700", label: "Partial" },
  COLLECTED: { bg: "bg-green-100 text-green-700", label: "Collected" },
  CANCELLED: { bg: "bg-red-100 text-red-700", label: "Cancelled" },
};

export default function LogisticsPage() {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAssignments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/purchase-orders");
      if (res.ok) {
        const data = await res.json();
        setAssignments(data.purchaseOrders || []);
      }
    } catch {
      // handle silently
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAssignments(); }, [loadAssignments]);

  const activeAssignments = assignments.filter((a) => a.status !== "COLLECTED" && a.status !== "CANCELLED");
  const completedAssignments = assignments.filter((a) => a.status === "COLLECTED");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My Assignments</h1>
        <p className="text-sm text-gray-500">Your collection and delivery assignments</p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => <Skeleton key={i} className="h-32 w-full rounded-lg" />)}
        </div>
      ) : assignments.length === 0 ? (
        <EmptyState
          icon={Truck}
          title="No assignments"
          description="You don't have any collection assignments yet."
        />
      ) : (
        <>
          {/* Active Assignments */}
          {activeAssignments.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-3">Active ({activeAssignments.length})</h2>
              <div className="space-y-3">
                {activeAssignments.map((po: any) => (
                  <Link key={po.id} href={`/purchase-orders/${po.id}`}>
                    <Card className="hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-primary-500">
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-mono text-sm font-bold">{po.poNumber}</span>
                              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[po.status]?.bg || ""}`}>
                                {STATUS_STYLES[po.status]?.label || po.status}
                              </span>
                            </div>

                            {/* Supplier */}
                            <div className="flex items-center gap-1 text-sm text-gray-700 mt-2">
                              <Package className="h-3.5 w-3.5 text-gray-400" />
                              <span className="font-medium">{po.supplier?.name}</span>
                            </div>

                            {/* Site */}
                            <div className="flex items-center gap-1 text-sm text-gray-600 mt-1">
                              <MapPin className="h-3.5 w-3.5 text-gray-400" />
                              <span>{po.requisition?.site?.name}</span>
                            </div>

                            {/* Collection date */}
                            {po.collectionDate && (
                              <p className="text-xs text-gray-500 mt-1">
                                Collection: {formatDate(new Date(po.collectionDate))}
                              </p>
                            )}
                          </div>

                          <div className="text-right text-sm">
                            <p className="text-gray-500">{po._count?.items || 0} items</p>
                            <p className="text-xs text-gray-400 mt-1">
                              {po.requisition?.project?.code}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Completed */}
          {completedAssignments.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-3 text-gray-500">
                Completed ({completedAssignments.length})
              </h2>
              <div className="space-y-2">
                {completedAssignments.slice(0, 10).map((po: any) => (
                  <Link key={po.id} href={`/purchase-orders/${po.id}`}>
                    <div className="rounded-lg border bg-gray-50 p-3 text-sm hover:bg-gray-100 transition-colors cursor-pointer">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-medium text-gray-600">{po.poNumber}</span>
                          <span className="text-green-600 text-xs font-medium">Collected</span>
                        </div>
                        <span className="text-gray-500">{po.supplier?.name}</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
  /* eslint-enable @typescript-eslint/no-explicit-any */
}
