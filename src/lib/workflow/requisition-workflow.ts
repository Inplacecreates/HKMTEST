import type { RequisitionStatus } from "@/generated/prisma";
import type { WorkflowDefinition } from "./types";
import { WorkflowEngine } from "./engine";

/**
 * Requisition Workflow Definition
 *
 * State machine:
 * DRAFT -> SUBMITTED -> PRICING -> VERIFICATION -> BUDGET_CHECK
 *   -> PENDING_APPROVAL -> APPROVED -> PO_CREATED -> DISPATCHED
 *   -> DELIVERED -> VERIFICATION_COMPLETE -> RECEIPTED -> COMPLETE
 *
 * Special:
 *   PENDING_APPROVAL -> ON_HOLD (CEO: awaiting client funds)
 *   ON_HOLD -> PENDING_APPROVAL (CEO: funds received)
 *   Any active status -> CANCELLED (CEO only)
 */
const requisitionWorkflowDefinition: WorkflowDefinition<RequisitionStatus> = {
  name: "requisition",
  initialStatus: "DRAFT",
  terminalStatuses: ["COMPLETE", "CANCELLED"],
  transitions: [
    // Normal flow
    { from: "DRAFT", to: "SUBMITTED", allowedRoles: ["SITE_MANAGER", "CEO"], label: "Submit Request" },
    { from: "SUBMITTED", to: "PRICING", allowedRoles: ["PROJECT_MANAGER", "CEO"], label: "Start Pricing" },
    { from: "PRICING", to: "VERIFICATION", allowedRoles: ["PROJECT_MANAGER", "CEO"], label: "Send for Verification" },
    { from: "VERIFICATION", to: "BUDGET_CHECK", allowedRoles: ["SITE_MANAGER", "PROJECT_MANAGER", "CEO"], label: "Confirm & Check Budget" },
    { from: "BUDGET_CHECK", to: "PENDING_APPROVAL", allowedRoles: ["PROJECT_MANAGER", "CEO"], label: "Submit for Approval" },
    { from: "PENDING_APPROVAL", to: "APPROVED", allowedRoles: ["CEO"], label: "Approve" },
    { from: "APPROVED", to: "PO_CREATED", allowedRoles: ["PROJECT_MANAGER", "CEO"], label: "Create Purchase Order" },
    { from: "PO_CREATED", to: "DISPATCHED", allowedRoles: ["DRIVER", "CO_DRIVER", "PROJECT_MANAGER", "CEO"], label: "Mark Dispatched" },
    { from: "DISPATCHED", to: "DELIVERED", allowedRoles: ["DRIVER", "CO_DRIVER", "SITE_MANAGER", "PROJECT_MANAGER", "CEO"], label: "Mark Delivered" },
    { from: "DELIVERED", to: "VERIFICATION_COMPLETE", allowedRoles: ["SITE_MANAGER", "CEO"], label: "Verify Delivery" },
    { from: "VERIFICATION_COMPLETE", to: "RECEIPTED", allowedRoles: ["PROJECT_MANAGER", "CEO"], label: "Upload Receipts" },
    { from: "RECEIPTED", to: "COMPLETE", allowedRoles: ["PROJECT_MANAGER", "CEO"], label: "Mark Complete" },

    // On Hold flow (CEO only)
    { from: "PENDING_APPROVAL", to: "ON_HOLD", allowedRoles: ["CEO"], label: "Put On Hold", requiresNote: true },
    { from: "ON_HOLD", to: "PENDING_APPROVAL", allowedRoles: ["CEO"], label: "Resume Approval" },

    // Cancellation (CEO only, from any active status)
    { from: "DRAFT", to: "CANCELLED", allowedRoles: ["CEO", "SITE_MANAGER"], label: "Cancel" },
    { from: "SUBMITTED", to: "CANCELLED", allowedRoles: ["CEO"], label: "Cancel" },
    { from: "PRICING", to: "CANCELLED", allowedRoles: ["CEO"], label: "Cancel" },
    { from: "VERIFICATION", to: "CANCELLED", allowedRoles: ["CEO"], label: "Cancel" },
    { from: "BUDGET_CHECK", to: "CANCELLED", allowedRoles: ["CEO"], label: "Cancel" },
    { from: "PENDING_APPROVAL", to: "CANCELLED", allowedRoles: ["CEO"], label: "Cancel" },
    { from: "ON_HOLD", to: "CANCELLED", allowedRoles: ["CEO"], label: "Cancel" },
    { from: "APPROVED", to: "CANCELLED", allowedRoles: ["CEO"], label: "Cancel" },

    // Rework loops
    { from: "VERIFICATION", to: "PRICING", allowedRoles: ["SITE_MANAGER", "CEO"], label: "Request Re-pricing" },
    { from: "BUDGET_CHECK", to: "PRICING", allowedRoles: ["PROJECT_MANAGER", "CEO"], label: "Revise Pricing" },
  ],
};

export const requisitionWorkflow = new WorkflowEngine(requisitionWorkflowDefinition);
