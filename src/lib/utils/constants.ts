import { type UserRole, type RequisitionStatus, type ProjectStatus, type POStatus } from "@/generated/prisma";

// ==========================================
// Role display labels
// ==========================================
export const ROLE_LABELS: Record<UserRole, string> = {
  CEO: "CEO",
  QS: "Quantity Surveyor",
  ARCHITECT: "Architect",
  PROJECT_MANAGER: "Project Manager",
  DRIVER: "Driver",
  CO_DRIVER: "Co-Driver",
  SITE_MANAGER: "Site Manager",
  SUBCONTRACTOR: "Subcontractor",
};

// ==========================================
// Requisition status labels and colors
// ==========================================
export const REQUISITION_STATUS_LABELS: Record<RequisitionStatus, string> = {
  DRAFT: "Draft",
  SUBMITTED: "Submitted",
  PRICING: "Pricing",
  VERIFICATION: "Verification",
  BUDGET_CHECK: "Budget Check",
  PENDING_APPROVAL: "Pending Approval",
  ON_HOLD: "On Hold",
  APPROVED: "Approved",
  PO_CREATED: "PO Created",
  DISPATCHED: "Dispatched",
  DELIVERED: "Delivered",
  VERIFICATION_COMPLETE: "Verified",
  RECEIPTED: "Receipted",
  COMPLETE: "Complete",
  CANCELLED: "Cancelled",
};

export const REQUISITION_STATUS_COLORS: Record<RequisitionStatus, string> = {
  DRAFT: "bg-gray-100 text-gray-700",
  SUBMITTED: "bg-blue-100 text-blue-700",
  PRICING: "bg-indigo-100 text-indigo-700",
  VERIFICATION: "bg-purple-100 text-purple-700",
  BUDGET_CHECK: "bg-yellow-100 text-yellow-700",
  PENDING_APPROVAL: "bg-amber-100 text-amber-700",
  ON_HOLD: "bg-orange-100 text-orange-700",
  APPROVED: "bg-green-100 text-green-700",
  PO_CREATED: "bg-teal-100 text-teal-700",
  DISPATCHED: "bg-cyan-100 text-cyan-700",
  DELIVERED: "bg-emerald-100 text-emerald-700",
  VERIFICATION_COMPLETE: "bg-lime-100 text-lime-700",
  RECEIPTED: "bg-green-200 text-green-800",
  COMPLETE: "bg-green-500 text-white",
  CANCELLED: "bg-red-100 text-red-700",
};

// ==========================================
// Project status labels and colors
// ==========================================
export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  PLANNING: "Planning",
  ACTIVE: "Active",
  SNAG_LIST: "Snag List",
  ON_HOLD: "On Hold",
  COMPLETED: "Completed",
  ARCHIVED: "Archived",
};

export const PROJECT_STATUS_COLORS: Record<ProjectStatus, string> = {
  PLANNING: "bg-blue-100 text-blue-700",
  ACTIVE: "bg-green-100 text-green-700",
  SNAG_LIST: "bg-yellow-100 text-yellow-700",
  ON_HOLD: "bg-orange-100 text-orange-700",
  COMPLETED: "bg-emerald-100 text-emerald-700",
  ARCHIVED: "bg-gray-100 text-gray-700",
};

// ==========================================
// PO status labels
// ==========================================
export const PO_STATUS_LABELS: Record<POStatus, string> = {
  CREATED: "Created",
  SENT: "Sent to Supplier",
  PARTIALLY_COLLECTED: "Partially Collected",
  COLLECTED: "Collected",
  CANCELLED: "Cancelled",
};

// ==========================================
// Priority labels and colors
// ==========================================
export const PRIORITY_LABELS = {
  LOW: "Low",
  NORMAL: "Normal",
  URGENT: "Urgent",
  CRITICAL: "Critical",
};

export const PRIORITY_COLORS = {
  LOW: "bg-gray-100 text-gray-600",
  NORMAL: "bg-blue-100 text-blue-600",
  URGENT: "bg-amber-100 text-amber-700",
  CRITICAL: "bg-red-100 text-red-700",
};

// ==========================================
// Pipeline steps for site manager view
// ==========================================
export const PIPELINE_STEPS = [
  { key: "sourcing", label: "Sourcing", statuses: ["SUBMITTED", "PRICING", "VERIFICATION"] },
  { key: "finance", label: "Finance", statuses: ["BUDGET_CHECK", "PENDING_APPROVAL", "ON_HOLD"] },
  { key: "approved", label: "Approved", statuses: ["APPROVED", "PO_CREATED"] },
  { key: "dispatched", label: "Dispatched", statuses: ["DISPATCHED"] },
  { key: "received", label: "Received on Site", statuses: ["DELIVERED", "VERIFICATION_COMPLETE", "RECEIPTED", "COMPLETE"] },
] as const;

// ==========================================
// Budget categories
// ==========================================
export const BUDGET_CATEGORIES = [
  { value: "materials", label: "Materials" },
  { value: "labor", label: "Labor" },
  { value: "equipment", label: "Equipment" },
  { value: "overhead", label: "Overhead" },
];

// ==========================================
// Snag categories
// ==========================================
export const SNAG_CATEGORIES = [
  { value: "STRUCTURAL", label: "Structural" },
  { value: "FINISHING", label: "Finishing" },
  { value: "PLUMBING", label: "Plumbing" },
  { value: "ELECTRICAL", label: "Electrical" },
  { value: "OTHER", label: "Other" },
];

// ==========================================
// Common material units
// ==========================================
export const MATERIAL_UNITS = [
  "bags",
  "pieces",
  "meters",
  "feet",
  "kg",
  "tonnes",
  "litres",
  "rolls",
  "sheets",
  "trips",
  "sets",
  "boxes",
  "pairs",
  "bundles",
];
