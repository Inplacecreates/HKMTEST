"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatKES, formatDate } from "@/lib/utils/format";
import type { UserRole } from "@/generated/prisma";
import { ArrowLeft, Truck, Package, Phone, MapPin, Printer } from "lucide-react";

interface UserInfo {
  id: string;
  role: UserRole;
  tenantId: string;
}

const PO_STATUS_COLORS: Record<string, string> = {
  CREATED: "bg-gray-100 text-gray-700",
  SENT: "bg-blue-100 text-blue-700",
  PARTIALLY_COLLECTED: "bg-yellow-100 text-yellow-700",
  COLLECTED: "bg-green-100 text-green-700",
  CANCELLED: "bg-red-100 text-red-700",
};

export default function PurchaseOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const [po, setPo] = useState<any>(null);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/auth/me").then((r) => r.json()).then(setUser).catch(() => {});
  }, []);

  const loadPO = useCallback(async () => {
    try {
      const res = await fetch(`/api/purchase-orders/${params.id}`);
      if (res.ok) setPo(await res.json());
      else if (res.status === 404) router.push("/purchase-orders");
    } catch {
      // handle silently
    } finally {
      setLoading(false);
    }
  }, [params.id, router]);

  useEffect(() => { loadPO(); }, [loadPO]);

  const updateStatus = async (status: string) => {
    setUpdating(true);
    setError("");
    try {
      const res = await fetch(`/api/purchase-orders/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Update failed");
      }
      await loadPO();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!po) return <div>Purchase order not found</div>;

  const isDriver = user?.role === "DRIVER" || user?.role === "CO_DRIVER";
  const canManage = user?.role === "PROJECT_MANAGER" || user?.role === "CEO";
  // Drivers see no financial data — only item name, qty, unit, supplier name, supplier phone
  const showFinancials = !isDriver;

  const items = po.items || [];
  const grandTotal = items.reduce((sum: number, item: any) => {
    return sum + Number(item.qtyOrdered) * Number(item.unitPrice || 0);
  }, 0);

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href={isDriver ? "/logistics" : "/purchase-orders"}>
            <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4" /></Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold font-mono">{po.poNumber}</h1>
              <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-sm font-medium ${PO_STATUS_COLORS[po.status] || ""}`}>
                {po.status}
              </span>
            </div>
            <p className="text-sm text-gray-500">
              {po.requisition?.project?.name} &middot; {po.requisition?.requisitionNumber}
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => window.print()} className="print:hidden">
          <Printer className="mr-1 h-4 w-4" />
          Print
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      {/* Status Actions */}
      <div className="flex gap-2 flex-wrap print:hidden">
        {po.status === "CREATED" && canManage && (
          <Button size="sm" onClick={() => updateStatus("SENT")} disabled={updating}>
            Mark as Sent
          </Button>
        )}
        {(po.status === "SENT" || po.status === "PARTIALLY_COLLECTED") && (isDriver || canManage) && (
          <Button size="sm" onClick={() => updateStatus("COLLECTED")} disabled={updating}>
            <Package className="mr-1 h-4 w-4" />
            Mark as Collected
          </Button>
        )}
        {po.status === "CREATED" && canManage && (
          <Button variant="destructive" size="sm" onClick={() => updateStatus("CANCELLED")} disabled={updating}>
            Cancel PO
          </Button>
        )}
      </div>

      {/* Info Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Supplier Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="h-4 w-4" /> Supplier
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-500">Name</dt>
                <dd className="font-medium">{po.supplier?.name}</dd>
              </div>
              {po.supplier?.contactPerson && (
                <div className="flex justify-between">
                  <dt className="text-gray-500">Contact</dt>
                  <dd>{po.supplier.contactPerson}</dd>
                </div>
              )}
              {po.supplier?.phone && (
                <div className="flex justify-between">
                  <dt className="text-gray-500">Phone</dt>
                  <dd className="flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    <a href={`tel:${po.supplier.phone}`} className="text-primary-600 hover:underline">
                      {po.supplier.phone}
                    </a>
                  </dd>
                </div>
              )}
              {po.supplier?.address && (
                <div className="flex justify-between">
                  <dt className="text-gray-500">Address</dt>
                  <dd className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {po.supplier.address}
                  </dd>
                </div>
              )}
            </dl>
          </CardContent>
        </Card>

        {/* Delivery Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Truck className="h-4 w-4" /> Delivery
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-500">Site</dt>
                <dd className="font-medium">{po.requisition?.site?.name}</dd>
              </div>
              {po.requisition?.site?.address && (
                <div className="flex justify-between">
                  <dt className="text-gray-500">Site Address</dt>
                  <dd>{po.requisition.site.address}</dd>
                </div>
              )}
              {po.driver && (
                <div className="flex justify-between">
                  <dt className="text-gray-500">Driver</dt>
                  <dd>{po.driver.fullName}</dd>
                </div>
              )}
              {po.coDriverUser && (
                <div className="flex justify-between">
                  <dt className="text-gray-500">Co-Driver</dt>
                  <dd>{po.coDriverUser.fullName}</dd>
                </div>
              )}
              {po.collectionDate && (
                <div className="flex justify-between">
                  <dt className="text-gray-500">Collection Date</dt>
                  <dd>{formatDate(new Date(po.collectionDate))}</dd>
                </div>
              )}
              {showFinancials && po.totalAmount !== undefined && (
                <div className="flex justify-between">
                  <dt className="text-gray-500">Total</dt>
                  <dd className="font-bold text-lg">{formatKES(Number(po.totalAmount))}</dd>
                </div>
              )}
            </dl>
          </CardContent>
        </Card>
      </div>

      {/* Items Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Items ({items.length || 0})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50 text-left">
                  <th className="px-3 py-2 font-medium text-gray-600">Item</th>
                  <th className="px-3 py-2 font-medium text-gray-600">Unit</th>
                  <th className="px-3 py-2 font-medium text-gray-600 text-right">Qty</th>
                  {/* Driver sees supplier name + phone, not price */}
                  {isDriver ? (
                    <>
                      <th className="px-3 py-2 font-medium text-gray-600">Supplier</th>
                      <th className="px-3 py-2 font-medium text-gray-600">Supplier Phone</th>
                    </>
                  ) : (
                    <>
                      <th className="px-3 py-2 font-medium text-gray-600">Supplier</th>
                      <th className="px-3 py-2 font-medium text-gray-600 text-right">Unit Price</th>
                      <th className="px-3 py-2 font-medium text-gray-600 text-right">Total</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {items.map((item: any) => (
                  <tr key={item.id} className="border-b hover:bg-gray-50">
                    <td className="px-3 py-2">
                      <span className="font-medium">{item.requisitionItem?.itemName || "Item"}</span>
                      {item.requisitionItem?.description && (
                        <p className="text-xs text-gray-500">{item.requisitionItem.description}</p>
                      )}
                    </td>
                    <td className="px-3 py-2 text-gray-600">{item.requisitionItem?.unit || "-"}</td>
                    <td className="px-3 py-2 text-right">{Number(item.qtyOrdered)}</td>
                    {isDriver ? (
                      <>
                        <td className="px-3 py-2 text-gray-700">
                          {po.supplier?.name || "—"}
                        </td>
                        <td className="px-3 py-2">
                          {po.supplier?.phone ? (
                            <a href={`tel:${po.supplier.phone}`} className="text-primary-600 hover:underline flex items-center gap-1">
                              <Phone className="h-3 w-3" />{po.supplier.phone}
                            </a>
                          ) : "—"}
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-3 py-2 text-gray-700">
                          {po.supplier?.name || "—"}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {item.unitPrice ? formatKES(Number(item.unitPrice)) : "—"}
                        </td>
                        <td className="px-3 py-2 text-right font-medium">
                          {item.unitPrice
                            ? formatKES(Number(item.qtyOrdered) * Number(item.unitPrice))
                            : "—"}
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
              {showFinancials && grandTotal > 0 && (
                <tfoot>
                  <tr className="border-t-2 bg-gray-50">
                    <td colSpan={isDriver ? 4 : 5} className="px-3 py-2 text-right font-semibold text-gray-700">
                      Grand Total
                    </td>
                    <td className="px-3 py-2 text-right font-bold text-gray-900">
                      {formatKES(grandTotal)}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Print styles */}
      <style jsx global>{`
        @media print {
          .print\\:hidden { display: none !important; }
          body { font-size: 12px; }
        }
      `}</style>
    </div>
  );
  /* eslint-enable @typescript-eslint/no-explicit-any */
}
