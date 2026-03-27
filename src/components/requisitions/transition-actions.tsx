"use client";

import { useState } from "react";
import type { RequisitionStatus, UserRole } from "@/generated/prisma";
import { requisitionWorkflow } from "@/lib/workflow/requisition-workflow";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { REQUISITION_STATUS_LABELS } from "@/lib/utils/constants";

interface TransitionActionsProps {
  requisitionId: string;
  currentStatus: RequisitionStatus;
  userRole: UserRole;
  onTransition: (targetStatus: RequisitionStatus, note?: string) => Promise<void>;
  isLoading?: boolean;
}

export function TransitionActions({
  currentStatus,
  userRole,
  onTransition,
  isLoading,
}: TransitionActionsProps) {
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [pendingTarget, setPendingTarget] = useState<RequisitionStatus | null>(null);
  const [note, setNote] = useState("");

  const transitions = requisitionWorkflow.getAvailableTransitions(currentStatus, userRole);

  if (transitions.length === 0) return null;

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

  // Separate primary (forward) transitions from secondary (cancel, rework)
  const forwardTransitions = transitions.filter(
    (t) => t.to !== "CANCELLED" && t.to !== "PRICING"
  );
  const secondaryTransitions = transitions.filter(
    (t) => t.to === "CANCELLED" || (t.to === "PRICING" && currentStatus !== "SUBMITTED")
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
    </>
  );
}
