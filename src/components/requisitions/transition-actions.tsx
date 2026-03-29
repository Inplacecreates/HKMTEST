"use client";

import { useState, useEffect, useRef } from "react";
import type { RequisitionStatus, UserRole } from "@/generated/prisma";
import { requisitionWorkflow } from "@/lib/workflow/requisition-workflow";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { REQUISITION_STATUS_LABELS } from "@/lib/utils/constants";
import { formatKES } from "@/lib/utils/format";
import { Upload, FileText } from "lucide-react";

interface TransitionActionsProps {
  requisitionId: string;
  currentStatus: RequisitionStatus;
  userRole: UserRole;
  userApprovalLimit?: number;
  requisitionTotal?: number;
  onTransition: (targetStatus: RequisitionStatus, note?: string) => Promise<void>;
  onPOCreated?: () => void;
  isLoading?: boolean;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export function TransitionActions({
  requisitionId,
  currentStatus,
  userRole,
  userApprovalLimit = 50000,
  requisitionTotal = 0,
  onTransition,
  onPOCreated,
  isLoading,
}: TransitionActionsProps) {
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [pendingTarget, setPendingTarget] = useState<RequisitionStatus | null>(null);
  const [note, setNote] = useState("");

  // PO Creation modal state
  const [poDialogOpen, setPoDialogOpen] = useState(false);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [suppliersLoading, setSuppliersLoading] = useState(false);
  const [poForm, setPoForm] = useState({
    supplierId: "",
    assignedDriver: "",
    collectionDate: "",
    notes: "",
  });
  const [poUsers, setPoUsers] = useState<any[]>([]);
  const [poCreating, setPoCreating] = useState(false);
  const [poError, setPoError] = useState("");
  const [requisitionItems, setRequisitionItems] = useState<any[]>([]);
  const [itemPrices, setItemPrices] = useState<Record<string, string>>({});

  // Receipt upload state
  const [receiptDialogOpen, setReceiptDialogOpen] = useState(false);
  const [receiptUploading, setReceiptUploading] = useState(false);
  const [receiptError, setReceiptError] = useState("");
  const [uploadedReceipts, setUploadedReceipts] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const transitions = requisitionWorkflow.getAvailableTransitions(currentStatus, userRole);

  // PM approval limit check: hide PENDING_APPROVAL → APPROVED for PM if total > limit
  const filteredTransitions = transitions.filter((t) => {
    if (
      t.from === "PENDING_APPROVAL" &&
      t.to === "APPROVED" &&
      userRole === "PROJECT_MANAGER" &&
      requisitionTotal > userApprovalLimit
    ) {
      return false; // PM can't approve above their limit
    }
    return true;
  });

  if (filteredTransitions.length === 0) {
    // Show info message for PM when above limit
    if (
      currentStatus === "PENDING_APPROVAL" &&
      userRole === "PROJECT_MANAGER" &&
      requisitionTotal > userApprovalLimit
    ) {
      return (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          This requisition ({formatKES(requisitionTotal)}) exceeds your approval limit (
          {formatKES(userApprovalLimit)}). CEO approval required.
        </div>
      );
    }
    return null;
  }

  const handleClick = (targetStatus: RequisitionStatus, requiresNote?: boolean) => {
    // Special: PO creation
    if (targetStatus === "PO_CREATED") {
      openPoDialog();
      return;
    }
    // Special: receipt upload
    if (targetStatus === "RECEIPTED") {
      setReceiptDialogOpen(true);
      return;
    }
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

  // ── PO Creation ─────────────────────────────────────────
  const openPoDialog = async () => {
    setPoDialogOpen(true);
    setPoError("");
    setSuppliersLoading(true);
    try {
      const [suppRes, usersRes, reqRes] = await Promise.all([
        fetch("/api/suppliers").then((r) => (r.ok ? r.json() : { suppliers: [] })),
        fetch("/api/users").then((r) => (r.ok ? r.json() : [])),
        fetch(`/api/requisitions/${requisitionId}`).then((r) => (r.ok ? r.json() : null)),
      ]);
      setSuppliers(suppRes.suppliers || []);
      setPoUsers(
        (Array.isArray(usersRes) ? usersRes : []).filter(
          (u: any) => u.role === "DRIVER" || u.role === "CO_DRIVER"
        )
      );
      if (reqRes?.items) {
        setRequisitionItems(reqRes.items);
        // Pre-fill unit prices from existing data
        const prices: Record<string, string> = {};
        for (const item of reqRes.items) {
          if (item.unitPrice) prices[item.id] = String(item.unitPrice);
        }
        setItemPrices(prices);
      }
    } finally {
      setSuppliersLoading(false);
    }
  };

  const handleCreatePO = async () => {
    if (!poForm.supplierId) {
      setPoError("Please select a supplier");
      return;
    }
    setPoCreating(true);
    setPoError("");
    try {
      // Build items array from requisition items + prices
      const items = requisitionItems
        .filter((item: any) => itemPrices[item.id])
        .map((item: any) => ({
          requisitionItemId: item.id,
          qtyOrdered: Number(item.qtyApproved || item.qtyRequested),
          unitPrice: parseFloat(itemPrices[item.id]) || 0,
        }));

      if (items.length === 0) {
        setPoError("Please enter unit prices for at least one item");
        setPoCreating(false);
        return;
      }

      const res = await fetch("/api/purchase-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requisitionId,
          supplierId: poForm.supplierId,
          items,
          assignedDriver: poForm.assignedDriver || undefined,
          collectionDate: poForm.collectionDate || undefined,
          showFinancials: false,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setPoError(data.error || "Failed to create PO");
        return;
      }

      // Transition requisition to PO_CREATED
      await onTransition("PO_CREATED", poForm.notes || undefined);
      setPoDialogOpen(false);
      setPoForm({ supplierId: "", assignedDriver: "", collectionDate: "", notes: "" });
      setItemPrices({});
      onPOCreated?.();
    } finally {
      setPoCreating(false);
    }
  };

  // ── Receipt Upload ───────────────────────────────────────
  const handleReceiptUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setReceiptUploading(true);
    setReceiptError("");
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("type", "RECEIPT");
      const res = await fetch(`/api/requisitions/${requisitionId}/documents`, {
        method: "POST",
        body: form,
      });
      if (res.ok) {
        setUploadedReceipts((prev) => [...prev, file.name]);
      } else {
        const data = await res.json();
        setReceiptError(data.error || "Upload failed");
      }
    } finally {
      setReceiptUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleConfirmReceipts = async () => {
    if (uploadedReceipts.length === 0) {
      setReceiptError("Please upload at least one receipt before completing");
      return;
    }
    await onTransition("RECEIPTED", `${uploadedReceipts.length} receipt(s) uploaded`);
    setReceiptDialogOpen(false);
    setUploadedReceipts([]);
  };

  // Separate primary (forward) from secondary (cancel, rework)
  // PRICING is a rework target only when coming from VERIFICATION or BUDGET_CHECK
  const isReworkToPricing = (t: { from: string; to: string }) =>
    t.to === "PRICING" && t.from !== "SUBMITTED";
  const forwardTransitions = filteredTransitions.filter(
    (t) => t.to !== "CANCELLED" && !isReworkToPricing(t)
  );
  const secondaryTransitions = filteredTransitions.filter(
    (t) => t.to === "CANCELLED" || isReworkToPricing(t)
  );

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

      {/* Note dialog */}
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

      {/* PO Creation dialog */}
      <Dialog open={poDialogOpen} onOpenChange={setPoDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Purchase Order</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {poError && (
              <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                {poError}
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Supplier *
                </label>
                {suppliersLoading ? (
                  <div className="h-9 animate-pulse rounded bg-gray-200" />
                ) : (
                  <select
                    value={poForm.supplierId}
                    onChange={(e) => setPoForm((f) => ({ ...f, supplierId: e.target.value }))}
                    className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select supplier…</option>
                    {suppliers.map((s: any) => (
                      <option key={s.id} value={s.id}>
                        {s.name}{s.town ? ` — ${s.town}` : ""}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Assign Driver
                </label>
                <select
                  value={poForm.assignedDriver}
                  onChange={(e) => setPoForm((f) => ({ ...f, assignedDriver: e.target.value }))}
                  className="w-full rounded-md border px-3 py-2 text-sm"
                >
                  <option value="">No driver yet</option>
                  {poUsers.map((u: any) => (
                    <option key={u.id} value={u.id}>
                      {u.fullName} ({u.role === "DRIVER" ? "Driver" : "Co-Driver"})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Collection Date
                </label>
                <input
                  type="date"
                  value={poForm.collectionDate}
                  onChange={(e) => setPoForm((f) => ({ ...f, collectionDate: e.target.value }))}
                  className="w-full rounded-md border px-3 py-2 text-sm"
                />
              </div>
            </div>

            {/* Items with prices */}
            {requisitionItems.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Item Prices (enter unit price for each item)
                </label>
                <div className="space-y-2 rounded-lg border p-3">
                  {requisitionItems.map((item: any) => (
                    <div key={item.id} className="flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{item.itemName}</p>
                        <p className="text-xs text-gray-500">
                          {item.qtyApproved || item.qtyRequested} {item.unit}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-gray-500">KES</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={itemPrices[item.id] || ""}
                          onChange={(e) =>
                            setItemPrices((prev) => ({ ...prev, [item.id]: e.target.value }))
                          }
                          className="w-28 rounded border px-2 py-1 text-sm"
                          placeholder="0.00"
                        />
                      </div>
                      {itemPrices[item.id] && (
                        <p className="text-xs text-gray-500 w-24 text-right">
                          = {formatKES(
                            parseFloat(itemPrices[item.id] || "0") *
                            Number(item.qtyApproved || item.qtyRequested)
                          )}
                        </p>
                      )}
                    </div>
                  ))}
                  <div className="border-t pt-2 text-sm font-semibold flex justify-between">
                    <span>Total</span>
                    <span>
                      {formatKES(
                        requisitionItems.reduce((s, item) => {
                          const price = parseFloat(itemPrices[item.id] || "0") || 0;
                          const qty = Number(item.qtyApproved || item.qtyRequested);
                          return s + price * qty;
                        }, 0)
                      )}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <Textarea
                value={poForm.notes}
                onChange={(e) => setPoForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="Any notes for this PO..."
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPoDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreatePO} disabled={poCreating || !poForm.supplierId}>
              {poCreating ? "Creating…" : "Create PO"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Receipt Upload dialog */}
      <Dialog open={receiptDialogOpen} onOpenChange={setReceiptDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Receipts</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-gray-600">
              Upload one or more receipts for this requisition before marking it as receipted.
            </p>

            {receiptError && (
              <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                {receiptError}
              </div>
            )}

            <div className="rounded-lg border-2 border-dashed p-6 text-center">
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleReceiptUpload}
                className="hidden"
                id="receipt-upload"
              />
              <Upload className="mx-auto h-8 w-8 text-gray-400 mb-2" />
              <p className="text-sm text-gray-600 mb-2">PDF or image files</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={receiptUploading}
              >
                {receiptUploading ? "Uploading…" : "Choose File"}
              </Button>
            </div>

            {uploadedReceipts.length > 0 && (
              <div className="space-y-1">
                <p className="text-sm font-medium text-gray-700">Uploaded:</p>
                {uploadedReceipts.map((name, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-green-700">
                    <FileText className="h-4 w-4" />
                    {name}
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReceiptDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleConfirmReceipts}
              disabled={isLoading || uploadedReceipts.length === 0}
            >
              Complete — Mark Receipted
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
/* eslint-enable @typescript-eslint/no-explicit-any */
