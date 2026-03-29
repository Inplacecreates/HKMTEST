"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { formatKES, formatDate } from "@/lib/utils/format";
import { ShoppingCart, Printer } from "lucide-react";
const isDriver = (role: string) => role === "DRIVER" || role === "CO_DRIVER";

const PO_STATUS_COLORS: Record<string, string> = {
  CREATED: "bg-gray-100 text-gray-700",
  SENT: "bg-blue-100 text-blue-700",
  PARTIALLY_COLLECTED: "bg-yellow-100 text-yellow-700",
  COLLECTED: "bg-green-100 text-green-700",
  CANCELLED: "bg-red-100 text-red-700",
};

const PO_STATUS_LABELS: Record<string, string> = {
  CREATED: "Created",
  SENT: "Sent",
  PARTIALLY_COLLECTED: "Partial",
  COLLECTED: "Collected",
  CANCELLED: "Cancelled",
};

export default function PurchaseOrdersPage() {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [userRole, setUserRole] = useState<string>("");

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setUserRole(d.role || ""))
      .catch(() => {});
  }, []);

  const loadPOs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);
      const res = await fetch(`/api/purchase-orders?${params}`);
      if (res.ok) {
        const data = await res.json();
        setPurchaseOrders(data.purchaseOrders || []);
        setTotal(data.total || 0);
      }
    } catch {
      // handle silently
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { loadPOs(); }, [loadPOs]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Purchase Orders</h1>
        <p className="text-sm text-gray-500">{total} purchase order{total !== 1 ? "s" : ""}</p>
      </div>

      <div className="flex gap-3">
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-48">
          <option value="">All Statuses</option>
          {Object.entries(PO_STATUS_LABELS).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </Select>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full rounded-lg" />)}
        </div>
      ) : purchaseOrders.length === 0 ? (
        <EmptyState
          icon={ShoppingCart}
          title="No purchase orders found"
          description="Purchase orders are created from approved requisitions."
        />
      ) : (
        <div className="space-y-3">
          {purchaseOrders.map((po: any) => (
            <Link key={po.id} href={`/purchase-orders/${po.id}`}>
              <div className="rounded-lg border bg-white p-4 hover:shadow-md transition-shadow cursor-pointer">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-semibold">{po.poNumber}</span>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${PO_STATUS_COLORS[po.status] || ""}`}>
                        {PO_STATUS_LABELS[po.status] || po.status}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-gray-600">
                      {po.requisition?.project?.name} &middot; {po.supplier?.name}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {po.requisition?.requisitionNumber} &middot; {po._count?.items || 0} items
                    </p>
                  </div>
                  <div className="text-right flex flex-col items-end gap-1">
                    {!isDriver(userRole) && po.totalAmount !== undefined && (
                      <p className="font-semibold">{formatKES(Number(po.totalAmount))}</p>
                    )}
                    {po.driver && (
                      <p className="text-xs text-gray-500">Driver: {po.driver.fullName}</p>
                    )}
                    {po.collectionDate && (
                      <p className="text-xs text-gray-500">{formatDate(new Date(po.collectionDate))}</p>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
  /* eslint-enable @typescript-eslint/no-explicit-any */
}
