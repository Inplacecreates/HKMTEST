"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RequisitionPipeline } from "@/components/requisitions/requisition-pipeline";
import { RequisitionItemsTable } from "@/components/requisitions/requisition-items-table";
import { TransitionActions } from "@/components/requisitions/transition-actions";
import { StatusBadge } from "@/components/requisitions/status-badge";
import { formatKES, formatDate, formatRelativeTime } from "@/lib/utils/format";
import { REQUISITION_STATUS_LABELS } from "@/lib/utils/constants";
import type { RequisitionStatus, UserRole } from "@/generated/prisma";
import { ArrowLeft, FileText, Clock, DollarSign, MapPin, Save } from "lucide-react";

interface UserInfo {
  id: string;
  role: UserRole;
  tenantId: string;
  fullName: string;
}

interface Supplier {
  id: string;
  name: string;
  phone?: string | null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ReqItem = any;

// ── Sourcing Table (PRICING status) ─────────────────────────────
function SourcingTable({
  items,
  requisitionId,
  onSaved,
}: {
  items: ReqItem[];
  requisitionId: string;
  onSaved: () => void;
}) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [rows, setRows] = useState<
    { id: string; supplierId: string; unitPrice: string; qtyApproved: string }[]
  >([]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    fetch("/api/suppliers")
      .then((r) => r.ok ? r.json() : [])
      .then(setSuppliers)
      .catch(() => {});
  }, []);

  useEffect(() => {
    setRows(
      items.map((item: ReqItem) => ({
        id: item.id,
        supplierId: item.supplierId || item.supplier?.id || "",
        unitPrice: item.unitPrice ? String(Number(item.unitPrice)) : "",
        qtyApproved: item.qtyApproved ? String(Number(item.qtyApproved)) : String(Number(item.qtyRequested)),
      }))
    );
  }, [items]);

  function updateRow(id: string, field: string, value: string) {
    setRows((prev) => prev.map((r) => r.id === id ? { ...r, [field]: value } : r));
  }

  const runningTotal = rows.reduce((sum, r) => {
    const price = parseFloat(r.unitPrice) || 0;
    const qty = parseFloat(r.qtyApproved) || 0;
    return sum + price * qty;
  }, 0);

  async function handleSave() {
    setSaving(true);
    setSaveError("");
    setSaveSuccess(false);
    try {
      const pricedRows = rows.filter((r) => r.unitPrice && parseFloat(r.unitPrice) > 0);
      if (pricedRows.length === 0) {
        setSaveError("Enter at least one unit price before saving.");
        return;
      }

      const res = await fetch(`/api/requisitions/${requisitionId}/items`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: pricedRows.map((r) => ({
            itemId: r.id,
            unitPrice: parseFloat(r.unitPrice),
            supplierId: r.supplierId || undefined,
            qtyApproved: parseFloat(r.qtyApproved) || undefined,
          })),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setSaveError(data.error || "Save failed");
        return;
      }
      setSaveSuccess(true);
      onSaved();
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch {
      setSaveError("Network error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-800">Sourcing — Assign Suppliers & Prices</h3>
          <p className="text-xs text-gray-500 mt-0.5">Set unit price and supplier for each item, then save.</p>
        </div>
        <div className="flex items-center gap-3">
          {runningTotal > 0 && (
            <span className="text-sm font-semibold text-gray-700">
              Total: {formatKES(runningTotal)}
            </span>
          )}
          <Button size="sm" onClick={handleSave} disabled={saving}>
            <Save className="mr-1 h-3.5 w-3.5" />
            {saving ? "Saving…" : "Save Sourcing"}
          </Button>
        </div>
      </div>

      {saveError && (
        <div className="rounded border border-red-200 bg-red-50 p-2 text-sm text-red-700">{saveError}</div>
      )}
      {saveSuccess && (
        <div className="rounded border border-green-200 bg-green-50 p-2 text-sm text-green-700">
          Sourcing saved successfully.
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50 text-left">
              <th className="px-3 py-2 font-medium text-gray-600">Item</th>
              <th className="px-3 py-2 font-medium text-gray-600">Unit</th>
              <th className="px-3 py-2 font-medium text-gray-600 text-right">Qty Req.</th>
              <th className="px-3 py-2 font-medium text-gray-600 text-right w-24">Qty Apprvd</th>
              <th className="px-3 py-2 font-medium text-gray-600 w-36">Supplier</th>
              <th className="px-3 py-2 font-medium text-gray-600 text-right w-32">Unit Price (KES)</th>
              <th className="px-3 py-2 font-medium text-gray-600 text-right">Line Total</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => {
              const item = items[idx];
              if (!item) return null;
              const lineTotal = (parseFloat(row.unitPrice) || 0) * (parseFloat(row.qtyApproved) || 0);
              return (
                <tr key={row.id} className="border-b hover:bg-gray-50">
                  <td className="px-3 py-2">
                    <span className="font-medium">{item.itemName}</span>
                    {item.description && (
                      <p className="text-xs text-gray-400">{item.description}</p>
                    )}
                  </td>
                  <td className="px-3 py-2 text-gray-600">{item.unit}</td>
                  <td className="px-3 py-2 text-right">{Number(item.qtyRequested)}</td>
                  <td className="px-3 py-2 text-right">
                    <Input
                      type="number"
                      min="0"
                      step="any"
                      value={row.qtyApproved}
                      onChange={(e) => updateRow(row.id, "qtyApproved", e.target.value)}
                      className="h-7 w-20 text-right text-xs"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Select
                      value={row.supplierId}
                      onChange={(e) => updateRow(row.id, "supplierId", e.target.value)}
                      className="h-7 text-xs"
                    >
                      <option value="">Select…</option>
                      {suppliers.map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </Select>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Input
                      type="number"
                      min="0"
                      step="any"
                      value={row.unitPrice}
                      onChange={(e) => updateRow(row.id, "unitPrice", e.target.value)}
                      placeholder="0.00"
                      className="h-7 w-28 text-right text-xs"
                    />
                  </td>
                  <td className="px-3 py-2 text-right font-medium text-gray-900">
                    {lineTotal > 0 ? formatKES(lineTotal) : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
          {runningTotal > 0 && (
            <tfoot>
              <tr className="border-t-2 bg-gray-50">
                <td colSpan={6} className="px-3 py-2 text-right font-semibold text-gray-700">
                  Running Total
                </td>
                <td className="px-3 py-2 text-right font-bold text-gray-900">
                  {formatKES(runningTotal)}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}

// ── Finance Review Table (VERIFICATION / BUDGET_CHECK) ───────────
function FinanceSummaryTable({ items }: { items: ReqItem[] }) {
  const grandTotal = items.reduce((sum: number, item: ReqItem) => {
    const qty = Number(item.qtyApproved || item.qtyRequested);
    const price = Number(item.unitPrice || 0);
    return sum + qty * price;
  }, 0);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-800">Finance Review — Read Only</h3>
        <span className="text-sm font-bold text-gray-900">Total: {formatKES(grandTotal)}</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50 text-left">
              <th className="px-3 py-2 font-medium text-gray-600">Item</th>
              <th className="px-3 py-2 font-medium text-gray-600">Unit</th>
              <th className="px-3 py-2 font-medium text-gray-600 text-right">Qty</th>
              <th className="px-3 py-2 font-medium text-gray-600">Supplier</th>
              <th className="px-3 py-2 font-medium text-gray-600 text-right">Unit Price</th>
              <th className="px-3 py-2 font-medium text-gray-600 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item: ReqItem) => {
              const qty = Number(item.qtyApproved || item.qtyRequested);
              const price = Number(item.unitPrice || 0);
              const lineTotal = qty * price;
              return (
                <tr key={item.id} className="border-b hover:bg-gray-50">
                  <td className="px-3 py-2">
                    <span className="font-medium">{item.itemName}</span>
                    {item.description && (
                      <p className="text-xs text-gray-400">{item.description}</p>
                    )}
                  </td>
                  <td className="px-3 py-2 text-gray-600">{item.unit}</td>
                  <td className="px-3 py-2 text-right">{qty}</td>
                  <td className="px-3 py-2 text-gray-600">{item.supplier?.name || "—"}</td>
                  <td className="px-3 py-2 text-right">{price > 0 ? formatKES(price) : "—"}</td>
                  <td className="px-3 py-2 text-right font-medium">{lineTotal > 0 ? formatKES(lineTotal) : "—"}</td>
                </tr>
              );
            })}
          </tbody>
          {grandTotal > 0 && (
            <tfoot>
              <tr className="border-t-2 bg-gray-50">
                <td colSpan={5} className="px-3 py-2 text-right font-semibold text-gray-700">Grand Total</td>
                <td className="px-3 py-2 text-right font-bold text-gray-900">{formatKES(grandTotal)}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────
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

  const isPricingStage = status === "PRICING";
  const isFinanceStage = status === "VERIFICATION" || status === "BUDGET_CHECK";
  const userCanPrice = user?.role === "PROJECT_MANAGER" || user?.role === "CEO" || user?.role === "QS";

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
          items={items}
          onPOCreated={loadRequisition}
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

      {/* Sourcing Stage (PRICING) */}
      {isPricingStage && userCanPrice && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-indigo-700">
              Sourcing Stage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <SourcingTable
              items={items}
              requisitionId={req.id}
              onSaved={loadRequisition}
            />
          </CardContent>
        </Card>
      )}

      {/* Finance Stage (VERIFICATION / BUDGET_CHECK) */}
      {isFinanceStage && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-yellow-700">
              Finance Review — {status === "VERIFICATION" ? "Verification" : "Budget Check"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <FinanceSummaryTable items={items} />
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
              <RequisitionItemsTable
                items={items}
                showPricing={user?.role !== "SITE_MANAGER" || status !== "DRAFT"}
              />
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
                    <Link key={po.id as string} href={`/purchase-orders/${po.id as string}`}>
                      <div className="flex items-center justify-between rounded-lg border p-3 hover:shadow-sm transition-shadow">
                        <div>
                          <span className="font-mono text-sm font-medium">{po.poNumber as string}</span>
                          <Badge className="ml-2" variant="secondary">{po.status as string}</Badge>
                        </div>
                        <span className="font-semibold">{formatKES(Number(po.totalAmount))}</span>
                      </div>
                    </Link>
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
