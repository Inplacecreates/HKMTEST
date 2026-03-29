"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { formatDate, formatDateTime } from "@/lib/utils/format";
import { Truck, MapPin, Package, Clock, CheckCircle2, Send, X, Check } from "lucide-react";

const STATUS_STYLES: Record<string, { bg: string; label: string }> = {
  CREATED: { bg: "bg-gray-100 text-gray-700", label: "Pending" },
  SENT: { bg: "bg-blue-100 text-blue-700", label: "Ready for Collection" },
  IN_TRANSIT: { bg: "bg-cyan-100 text-cyan-700", label: "In Transit" },
  PARTIALLY_COLLECTED: { bg: "bg-yellow-100 text-yellow-700", label: "Partial" },
  COLLECTED: { bg: "bg-green-100 text-green-700", label: "Collected" },
  CANCELLED: { bg: "bg-red-100 text-red-700", label: "Cancelled" },
};

export default function LogisticsPage() {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const [allPOs, setAllPOs] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dispatchPoId, setDispatchPoId] = useState<string | null>(null);
  const [dispatching, setDispatching] = useState(false);
  const [dispatchForm, setDispatchForm] = useState({
    driverId: "", coDriverId: "", vehicleReg: "",
    departureTime: "", estimatedArrival: "", notes: "",
  });
  const [dispatchError, setDispatchError] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [posRes, usersRes] = await Promise.all([
        fetch("/api/purchase-orders"),
        fetch("/api/users"),
      ]);
      if (posRes.ok) {
        const data = await posRes.json();
        setAllPOs(data.purchaseOrders || []);
      }
      if (usersRes.ok) {
        const users = await usersRes.json();
        setDrivers(users.filter((u: any) => u.role === "DRIVER" || u.role === "CO_DRIVER"));
      }
    } catch { /* ignore */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Pending dispatch: SENT status (approved/sent to supplier, ready for dispatch)
  const pendingDispatch = allPOs.filter((po) => po.status === "SENT" || po.status === "CREATED");
  const activeDeliveries = allPOs.filter((po) => po.status === "IN_TRANSIT");
  const completedToday = allPOs.filter((po) => {
    if (po.status !== "COLLECTED") return false;
    const updated = new Date(po.updatedAt);
    const today = new Date();
    return updated.toDateString() === today.toDateString();
  });

  async function handleDispatch() {
    if (!dispatchPoId || !dispatchForm.driverId || !dispatchForm.vehicleReg || !dispatchForm.departureTime) {
      setDispatchError("Driver, vehicle registration, and departure time are required.");
      return;
    }
    setDispatching(true);
    setDispatchError("");
    try {
      const res = await fetch("/api/logistics/dispatch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ poId: dispatchPoId, ...dispatchForm }),
      });
      if (!res.ok) {
        const d = await res.json();
        setDispatchError(d.error ?? "Failed to dispatch");
        return;
      }
      setDispatchPoId(null);
      setDispatchForm({ driverId: "", coDriverId: "", vehicleReg: "", departureTime: "", estimatedArrival: "", notes: "" });
      loadData();
    } catch { setDispatchError("Network error"); } finally { setDispatching(false); }
  }

  const renderPOCard = (po: any, showDispatchBtn = false) => (
    <Link key={po.id} href={`/purchase-orders/${po.id}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-primary-500">
        <CardContent className="pt-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-mono text-sm font-bold">{po.poNumber}</span>
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[po.status]?.bg ?? ""}`}>
                  {STATUS_STYLES[po.status]?.label ?? po.status}
                </span>
                {po.requisition?.priority === "URGENT" && (
                  <span className="inline-flex items-center rounded-full bg-amber-100 text-amber-700 px-2 py-0.5 text-xs font-medium">Urgent</span>
                )}
                {po.requisition?.priority === "CRITICAL" && (
                  <span className="inline-flex items-center rounded-full bg-red-100 text-red-700 px-2 py-0.5 text-xs font-medium">Critical</span>
                )}
              </div>
              <div className="flex items-center gap-1 text-sm text-gray-700 mt-2">
                <Package className="h-3.5 w-3.5 text-gray-400" />
                <span className="font-medium">{po.supplier?.name}</span>
              </div>
              <div className="flex items-center gap-1 text-sm text-gray-600 mt-1">
                <MapPin className="h-3.5 w-3.5 text-gray-400" />
                <span>{po.requisition?.site?.name}</span>
                <span className="text-gray-400 text-xs ml-1">— {po.requisition?.project?.name}</span>
              </div>
              {po.collectionDate && (
                <p className="text-xs text-gray-500 mt-1">
                  <Clock className="inline h-3 w-3 mr-1" />
                  Collection: {formatDate(new Date(po.collectionDate))}
                </p>
              )}
              {po.driver && (
                <p className="text-xs text-gray-500 mt-1">
                  <Truck className="inline h-3 w-3 mr-1" />
                  Driver: {po.driver.fullName}
                </p>
              )}
            </div>
            <div className="text-right text-sm">
              <p className="text-gray-500">{po._count?.items || 0} items</p>
              <p className="text-xs text-gray-400 mt-1">{po.requisition?.project?.code}</p>
            </div>
          </div>
          {showDispatchBtn && (
            <div className="mt-3 pt-2 border-t flex justify-end" onClick={(e) => e.preventDefault()}>
              <Button
                size="sm"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setDispatchPoId(dispatchPoId === po.id ? null : po.id);
                  setDispatchError("");
                  setDispatchForm({ driverId: "", coDriverId: "", vehicleReg: "", departureTime: new Date().toISOString().slice(0, 16), estimatedArrival: "", notes: "" });
                }}
                className="h-7 text-xs"
              >
                <Send className="mr-1 h-3 w-3" />
                {dispatchPoId === po.id ? "Cancel" : "Dispatch"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Logistics</h1>
        <p className="text-sm text-gray-500">Dispatch management and delivery tracking</p>
      </div>

      {/* Summary cards */}
      {!loading && (
        <div className="grid gap-3 sm:grid-cols-3">
          <Card>
            <CardContent className="pt-3">
              <div className="text-sm text-amber-600 flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> Pending Dispatch</div>
              <p className="text-2xl font-bold text-amber-700">{pendingDispatch.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-3">
              <div className="text-sm text-blue-600 flex items-center gap-1"><Truck className="h-3.5 w-3.5" /> Active Deliveries</div>
              <p className="text-2xl font-bold text-blue-700">{activeDeliveries.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-3">
              <div className="text-sm text-green-600 flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5" /> Completed Today</div>
              <p className="text-2xl font-bold text-green-700">{completedToday.length}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-32 w-full rounded-lg" />)}</div>
      ) : (
        <>
          {/* Pending dispatch queue */}
          <div>
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Clock className="h-5 w-5 text-amber-500" />
              Pending Dispatch ({pendingDispatch.length})
            </h2>
            {pendingDispatch.length === 0 ? (
              <div className="rounded-lg border border-dashed border-gray-200 p-6 text-center text-sm text-gray-500">
                No POs pending dispatch
              </div>
            ) : (
              <div className="space-y-3">
                {pendingDispatch.map((po) => (
                  <div key={po.id}>
                    {renderPOCard(po, true)}
                    {/* Dispatch form inline */}
                    {dispatchPoId === po.id && (
                      <Card className="border-primary-200 bg-primary-50/20 mt-1 ml-4">
                        <CardHeader className="pb-2"><CardTitle className="text-sm">Dispatch {po.poNumber}</CardTitle></CardHeader>
                        <CardContent>
                          {dispatchError && (
                            <div className="mb-2 rounded border border-red-200 bg-red-50 p-2 text-xs text-red-700">{dispatchError}</div>
                          )}
                          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            <div>
                              <Label>Driver *</Label>
                              <Select value={dispatchForm.driverId} onChange={(e) => setDispatchForm({ ...dispatchForm, driverId: e.target.value })}>
                                <option value="">Select driver…</option>
                                {drivers.filter((d) => d.role === "DRIVER").map((d: any) => (
                                  <option key={d.id} value={d.id}>{d.fullName}</option>
                                ))}
                              </Select>
                            </div>
                            <div>
                              <Label>Co-Driver</Label>
                              <Select value={dispatchForm.coDriverId} onChange={(e) => setDispatchForm({ ...dispatchForm, coDriverId: e.target.value })}>
                                <option value="">None</option>
                                {drivers.map((d: any) => (
                                  <option key={d.id} value={d.id}>{d.fullName}</option>
                                ))}
                              </Select>
                            </div>
                            <div>
                              <Label>Vehicle Registration *</Label>
                              <Input
                                value={dispatchForm.vehicleReg}
                                onChange={(e) => setDispatchForm({ ...dispatchForm, vehicleReg: e.target.value })}
                                placeholder="KCX 123A"
                              />
                            </div>
                            <div>
                              <Label>Departure Date/Time *</Label>
                              <Input
                                type="datetime-local"
                                value={dispatchForm.departureTime}
                                onChange={(e) => setDispatchForm({ ...dispatchForm, departureTime: e.target.value })}
                              />
                            </div>
                            <div>
                              <Label>Est. Arrival</Label>
                              <Input
                                type="datetime-local"
                                value={dispatchForm.estimatedArrival}
                                onChange={(e) => setDispatchForm({ ...dispatchForm, estimatedArrival: e.target.value })}
                              />
                            </div>
                            <div>
                              <Label>Delivery Notes</Label>
                              <Input
                                value={dispatchForm.notes}
                                onChange={(e) => setDispatchForm({ ...dispatchForm, notes: e.target.value })}
                                placeholder="Any special instructions…"
                              />
                            </div>
                          </div>
                          <div className="mt-3 flex gap-2 justify-end">
                            <Button variant="outline" size="sm" onClick={() => setDispatchPoId(null)}>
                              <X className="mr-1 h-3.5 w-3.5" />Cancel
                            </Button>
                            <Button size="sm" onClick={handleDispatch} disabled={dispatching}>
                              <Check className="mr-1 h-3.5 w-3.5" />
                              {dispatching ? "Dispatching…" : "Confirm Dispatch"}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Active deliveries */}
          {activeDeliveries.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Truck className="h-5 w-5 text-blue-500" />
                Active Deliveries ({activeDeliveries.length})
              </h2>
              <div className="space-y-3">
                {activeDeliveries.map((po) => renderPOCard(po))}
              </div>
            </div>
          )}

          {/* Completed today */}
          {completedToday.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2 text-gray-500">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                Completed Today ({completedToday.length})
              </h2>
              <div className="space-y-2">
                {completedToday.map((po: any) => (
                  <Link key={po.id} href={`/purchase-orders/${po.id}`}>
                    <div className="rounded-lg border bg-gray-50 p-3 text-sm hover:bg-gray-100 transition-colors cursor-pointer">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-medium text-gray-600">{po.poNumber}</span>
                          <span className="text-green-600 text-xs font-medium">Collected</span>
                          <span className="text-gray-500">{po.supplier?.name}</span>
                        </div>
                        <span className="text-gray-400 text-xs">{po.requisition?.site?.name}</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {allPOs.length === 0 && (
            <EmptyState
              icon={Truck}
              title="No purchase orders"
              description="Purchase orders will appear here once they are created and approved."
            />
          )}
        </>
      )}
    </div>
  );
  /* eslint-enable @typescript-eslint/no-explicit-any */
}
