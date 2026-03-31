"use client";

import { useState, useEffect } from "react";
import type { RequisitionStatus, UserRole } from "@/generated/prisma";
import { requisitionWorkflow } from "@/lib/workflow/requisition-workflow";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { REQUISITION_STATUS_LABELS } from "@/lib/utils/constants";
import { formatKES } from "@/lib/utils/format";

interface Supplier {
  id: string;
  name: string;
  phone?: string | null;
}

interface RequisitionItem {
  id: string;
  itemName: string;
  unit: string;
  qtyRequested: number | string;
  qtyApproved?: number | string | null;
  unitPrice?: number | string | null;
  supplierId?: string | null;
  supplier?: { id: string; name: string } | null;
}

interface TransitionActionsProps {
  requisitionId: string;
  currentStatus: RequisitionStatus;
  userRole: UserRole;
  onTransition: (targetStatus: RequisitionStatus, note?: string) => Promise<void>;
  isLoading?: boolean;
  /** Items passed in so the Create PO dialog can pre-fill sourcing data */
  items?: RequisitionItem[];
  /** Called after PO is successfully created */
  onPOCreated?: () => void;
}

export function TransitionActions({
  requisitionId,
  currentStatus,
  userRole,
  onTransition,
  isLoading,
  items = [],
  onPOCreated,
}: TransitionActionsProps) {
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [pendingTarget, setPendingTarget] = useState<RequisitionStatus | null>(null);
  const [note, setNote] = useState("");

  // Create PO dialog state
  const [poDialogOpen, setPoDialogOpen] = useState(false);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [drivers, setDrivers] = useState<{ id: string; fullName: string; role: string }[]>([]);
  const [poForm, setPoForm] = useState({
    assignedDriver: "",
    coDriver: "",
    collectionDate: "",
    notes: "",
  });
  const [poError, setPoError] = useState("");
  const [creatingPO, setCreatingPO] = useState(false);

  const transitions = requisitionWorkflow.getAvailableTransitions(currentStatus, userRole);

  // Check if Create PO is applicable (APPROVED status, PM/CEO role)
  const canCreatePO =
    currentStatus === "APPROVED" &&
    (userRole === "PROJECT_MANAGER" || userRole === "CEO");

  useEffect(() => {
    if (poDialogOpen) {
      // Load suppliers and users (drivers) in parallel
      Promise.all([
        fetch("/api/suppliers").then((r) => r.ok ? r.json() : []),
        fetch("/api/users").then((r) => r.ok ? r.json() : []),
      ]).then(([supplierData, userData]) => {
        setSuppliers(Array.isArray(supplierData) ? supplierData : []);
        const driverUsers = Array.isArray(userData)
          ? userData.filter((u: { role: string }) => u.role === "DRIVER" || u.role === "CO_DRIVER")
          : [];
        setDrivers(driverUsers);
      }).catch(() => {});
    }
  }, [poDialogOpen]);

  if (transitions.length === 0 && !canCreatePO) return null;

  const handleClick = (targetStatus: RequisitionStatus, requiresNote?: boolean) => {
    if (requiresNote || targetStatus === "CANCELLED") {
      setPendingTarget(targetStatus);
      setNoteDialogOpen(true);
    } else {
      onTransition(targetStatus);
    }
  };

  const handleConfirmWithNote = () => {
    if (pendingTarget) {
      onTransition(pendingTarget, note || undefined);
      setNoteDialogOpen(false);
      setNote("");
      setPendingTarget(null);
    }
  };

  const handleCreatePO = async () => {
    setPoError("");

    // Derive supplier from items — use the most common supplierId
    const supplierIds = items
      .map((i) => i.supplierId)
      .filter(Boolean) as string[];

    if (supplierIds.length === 0) {
      setPoError("No supplier assigned to items. Please complete sourcing first.");
      return;
    }

    // Use the first/most common supplierId for the PO header
    const supplierCount: Record<string, number> = {};
    for (const sid of supplierIds) {
      supplierCount[sid] = (supplierCount[sid] ?? 0) + 1;
    }
    const primarySupplierId = Object.entries(supplierCount).sort((a, b) => b[1] - a[1])[0][0];

    const poItems = items
      .filter((i) => i.unitPrice && Number(i.unitPrice) > 0)
      .map((i) => ({
        requisitionItemId: i.id,
        qtyOrdered: Number(i.qtyApproved || i.qtyRequested),
        unitPrice: Number(i.unitPrice),
      }));

    if (poItems.length === 0) {
      setPoError("No items have been priced. Please complete sourcing first.");
      return;
    }

    setCreatingPO(true);
    try {
      const res = await fetch("/api/purchase-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requisitionId,
          supplierId: primarySupplierId,
          items: poItems,
          assignedDriver: poForm.assignedDriver || undefined,
          coDriver: poForm.coDriver || undefined,
          collectionDate: poForm.collectionDate || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setPoError(data.error || "Failed to create PO");
        return;
      }

      // Transition requisition status to PO_CREATED
      await onTransition("PO_CREATED" as RequisitionStatus);
      setPoDialogOpen(false);
      onPOCreated?.();
    } catch {
      setPoError("Network error creating PO");
    } finally {
      setCreatingPO(false);
    }
  };

  // Separate primary (forward) transitions from secondary (cancel, rework)
  const forwardTransitions = transitions.filter(
    (t) => t.to !== "CANCELLED" && t.to !== "PRICING"
  );
  const secondaryTransitions = transitions.filter(
    (t) => t.to === "CANCELLED" || (t.to === "PRICING" && currentStatus !== "SUBMITTED")
  );

  // Compute PO summary
  const pricedItems = items.filter((i) => i.unitPrice && Number(i.unitPrice) > 0);
  const poTotal = pricedItems.reduce((sum, i) => {
    return sum + Number(i.unitPrice) * Number(i.qtyApproved || i.qtyRequested);
  }, 0);

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {forwardTransitions.map((t) => (
          <Button
            key={`${t.from}-${t.to}`}
            onClick={() => handleClick(t.to as RequisitionStatus, t.requiresNote)}
            disabled={isLoading}
            size="sm"
          >
            {t.label}
          </Button>
        ))}
        {canCreatePO && (
          <Button
            size="sm"
            variant="default"
            onClick={() => { setPoDialogOpen(true); setPoError(""); }}
            disabled={isLoading}
          >
            Create PO
          </Button>
        )}
        {secondaryTransitions.map((t) => (
          <Button
            key={`${t.from}-${t.to}`}
            variant={t.to === "CANCELLED" ? "destructive" : "outline"}
            onClick={() => handleClick(t.to as RequisitionStatus, t.requiresNote)}
            disabled={isLoading}
            size="sm"
          >
            {t.label}
          </Button>
        ))}
      </div>

      {/* Note dialog for transitions requiring notes */}
      <Dialog open={noteDialogOpen} onOpenChange={setNoteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {pendingTarget === "CANCELLED"
                ? "Cancel Requisition"
                : `${REQUISITION_STATUS_LABELS[pendingTarget as RequisitionStatus] || pendingTarget}`}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <label className="text-sm font-medium text-gray-700">
              {pendingTarget === "CANCELLED" ? "Reason for cancellation" : "Add a note"}
              {pendingTarget === "ON_HOLD" && " (required)"}
            </label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Enter your note..."
              className="mt-2"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNoteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant={pendingTarget === "CANCELLED" ? "destructive" : "default"}
              onClick={handleConfirmWithNote}
              disabled={isLoading || (pendingTarget === "ON_HOLD" && !note)}
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create PO Dialog */}
      <Dialog open={poDialogOpen} onOpenChange={setPoDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Purchase Order</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {poError && (
              <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {poError}
              </div>
            )}

            {/* Items summary (read-only, from sourcing) */}
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">
                Items from Sourcing ({pricedItems.length} priced)
              </p>
              {pricedItems.length === 0 ? (
                <p className="text-sm text-amber-600 border border-amber-200 bg-amber-50 rounded p-3">
                  No items have been priced yet. Complete sourcing first.
                </p>
              ) : (
                <div className="rounded-lg border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b text-left">
                        <th className="px-3 py-2 font-medium text-gray-600">Item</th>
                        <th className="px-3 py-2 font-medium text-gray-600">Supplier</th>
                        <th className="px-3 py-2 font-medium text-gray-600 text-right">Qty</th>
                        <th className="px-3 py-2 font-medium text-gray-600 text-right">Unit Price</th>
                        <th className="px-3 py-2 font-medium text-gray-600 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pricedItems.map((item) => {
                        const qty = Number(item.qtyApproved || item.qtyRequested);
                        const price = Number(item.unitPrice);
                        return (
                          <tr key={item.id} className="border-b">
                            <td className="px-3 py-2 font-medium">{item.itemName}</td>
                            <td className="px-3 py-2 text-gray-600 text-xs">
                              {item.supplier?.name || suppliers.find((s) => s.id === item.supplierId)?.name || "—"}
                            </td>
                            <td className="px-3 py-2 text-right">{qty} {item.unit}</td>
                            <td className="px-3 py-2 text-right">{formatKES(price)}</td>
                            <td className="px-3 py-2 text-right font-medium">{formatKES(qty * price)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 bg-gray-50">
                        <td colSpan={4} className="px-3 py-2 text-right font-semibold text-gray-700">
                          Grand Total
                        </td>
                        <td className="px-3 py-2 text-right font-bold text-gray-900">
                          {formatKES(poTotal)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>

            {/* Logistics */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="po-driver">Assign Driver</Label>
                <Select
                  id="po-driver"
                  value={poForm.assignedDriver}
                  onChange={(e) => setPoForm((f) => ({ ...f, assignedDriver: e.target.value }))}
                  className="mt-1"
                >
                  <option value="">No driver assigned</option>
                  {drivers
                    .filter((d) => d.role === "DRIVER")
                    .map((d) => (
                      <option key={d.id} value={d.id}>{d.fullName}</option>
                    ))}
                </Select>
              </div>
              <div>
                <Label htmlFor="po-codriver">Co-Driver (optional)</Label>
                <Select
                  id="po-codriver"
                  value={poForm.coDriver}
                  onChange={(e) => setPoForm((f) => ({ ...f, coDriver: e.target.value }))}
                  className="mt-1"
                >
                  <option value="">None</option>
                  {drivers.map((d) => (
                    <option key={d.id} value={d.id}>{d.fullName} ({d.role})</option>
                  ))}
                </Select>
              </div>
              <div>
                <Label htmlFor="po-date">Collection Date</Label>
                <Input
                  id="po-date"
                  type="date"
                  value={poForm.collectionDate}
                  onChange={(e) => setPoForm((f) => ({ ...f, collectionDate: e.target.value }))}
                  className="mt-1"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPoDialogOpen(false)} disabled={creatingPO}>
              Cancel
            </Button>
            <Button
              onClick={handleCreatePO}
              disabled={creatingPO || pricedItems.length === 0}
            >
              {creatingPO ? "Creating PO…" : `Create PO (${formatKES(poTotal)})`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
