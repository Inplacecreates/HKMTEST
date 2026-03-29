// ==========================================
// HKM Construction Management System Types
// ==========================================

// Roles
export enum Role {
  CEO = "CEO",
  QS = "QS",
  ARCHITECT = "ARCHITECT",
  PROJECT_MANAGER = "PROJECT_MANAGER",
  DRIVER = "DRIVER",
  CO_DRIVER = "CO_DRIVER",
  SITE_MANAGER = "SITE_MANAGER",
  SUBCONTRACTOR = "SUBCONTRACTOR",
}

// Project statuses
export enum ProjectStatus {
  PLANNING = "PLANNING",
  ACTIVE = "ACTIVE",
  SNAG_LIST = "SNAG_LIST",
  ON_HOLD = "ON_HOLD",
  COMPLETED = "COMPLETED",
  ARCHIVED = "ARCHIVED",
}

// Site statuses
export enum SiteStatus {
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
}

// Requisition statuses (state machine)
export enum RequisitionStatus {
  DRAFT = "DRAFT",
  SUBMITTED = "SUBMITTED",
  PRICING = "PRICING",
  VERIFICATION = "VERIFICATION",
  BUDGET_CHECK = "BUDGET_CHECK",
  PENDING_APPROVAL = "PENDING_APPROVAL",
  ON_HOLD = "ON_HOLD",
  APPROVED = "APPROVED",
  PO_CREATED = "PO_CREATED",
  DISPATCHED = "DISPATCHED",
  DELIVERED = "DELIVERED",
  VERIFICATION_COMPLETE = "VERIFICATION_COMPLETE",
  RECEIPTED = "RECEIPTED",
  COMPLETE = "COMPLETE",
  CANCELLED = "CANCELLED",
}

// Requisition priority
export enum Priority {
  LOW = "LOW",
  NORMAL = "NORMAL",
  URGENT = "URGENT",
  CRITICAL = "CRITICAL",
}

// Funding source
export enum FundingSource {
  CLIENT_FUNDS = "CLIENT_FUNDS",
  COMPANY_WALLET = "COMPANY_WALLET",
  MIXED = "MIXED",
}

// Purchase order statuses
export enum POStatus {
  CREATED = "CREATED",
  SENT = "SENT",
  IN_TRANSIT = "IN_TRANSIT",
  PARTIALLY_COLLECTED = "PARTIALLY_COLLECTED",
  COLLECTED = "COLLECTED",
  CANCELLED = "CANCELLED",
}

// Delivery verification
export enum DeliveryStatus {
  COMPLETE = "COMPLETE",
  DISCREPANCY = "DISCREPANCY",
}

export enum ItemCondition {
  GOOD = "GOOD",
  DAMAGED = "DAMAGED",
  PARTIAL = "PARTIAL",
}

// Discrepancy report
export enum DiscrepancyStatus {
  OPEN = "OPEN",
  UNDER_REVIEW = "UNDER_REVIEW",
  RESOLVED = "RESOLVED",
}

// Snag list
export enum SnagCategory {
  STRUCTURAL = "STRUCTURAL",
  FINISHING = "FINISHING",
  PLUMBING = "PLUMBING",
  ELECTRICAL = "ELECTRICAL",
  OTHER = "OTHER",
}

export enum SnagStatus {
  OPEN = "OPEN",
  IN_PROGRESS = "IN_PROGRESS",
  FIXED = "FIXED",
  VERIFIED = "VERIFIED",
}

// Document types
export enum DocumentType {
  RECEIPT = "RECEIPT",
  PLAN = "PLAN",
  DRAWING = "DRAWING",
  PHOTO = "PHOTO",
  INVOICE = "INVOICE",
  OTHER = "OTHER",
}

// Inventory movement types
export enum MovementType {
  IN = "IN",
  OUT = "OUT",
  ADJUSTMENT = "ADJUSTMENT",
  TRANSFER = "TRANSFER",
}

// Budget categories
export enum BudgetCategory {
  MATERIALS = "MATERIALS",
  LABOR = "LABOR",
  EQUIPMENT = "EQUIPMENT",
  OVERHEAD = "OVERHEAD",
}

// Requisition item status
export enum RequisitionItemStatus {
  PENDING = "PENDING",
  PRICED = "PRICED",
  APPROVED = "APPROVED",
  ORDERED = "ORDERED",
  DELIVERED = "DELIVERED",
  DISCREPANCY = "DISCREPANCY",
}

// Activity log actions
export type ActivityAction =
  | "user.login"
  | "user.logout"
  | "project.created"
  | "project.updated"
  | "project.status_changed"
  | "site.created"
  | "site.updated"
  | "requisition.created"
  | "requisition.updated"
  | "requisition.transition"
  | "requisition.item_added"
  | "requisition.item_priced"
  | "purchase_order.created"
  | "purchase_order.assigned"
  | "purchase_order.collected"
  | "delivery.verified"
  | "delivery.discrepancy"
  | "discrepancy.resolved"
  | "document.uploaded"
  | "budget.updated"
  | "budget.alert"
  | "payment.recorded"
  | "supplier.created"
  | "supplier.updated"
  | "inventory.movement"
  | "snag.created"
  | "snag.updated"
  | "snag.resolved";

// RBAC action types
export type PermissionAction =
  | "projects:read"
  | "projects:create"
  | "projects:update"
  | "projects:delete"
  | "sites:read"
  | "sites:create"
  | "sites:update"
  | "requisitions:read"
  | "requisitions:create"
  | "requisitions:price"
  | "requisitions:approve"
  | "requisitions:cancel"
  | "purchase_orders:read"
  | "purchase_orders:create"
  | "purchase_orders:assign_driver"
  | "purchase_orders:mark_collected"
  | "deliveries:verify"
  | "deliveries:report_discrepancy"
  | "deliveries:resolve_discrepancy"
  | "documents:read"
  | "documents:upload"
  | "budgets:read"
  | "budgets:manage"
  | "budgets:allocate_wallet"
  | "payments:read"
  | "payments:record"
  | "suppliers:read"
  | "suppliers:manage"
  | "inventory:read"
  | "inventory:manage"
  | "snag_items:read"
  | "snag_items:create"
  | "snag_items:manage"
  | "users:read"
  | "users:manage"
  | "settings:manage"
  | "reports:read"
  | "analytics:read";

// Notification types
export type NotificationType =
  | "requisition_submitted"
  | "requisition_priced"
  | "requisition_approved"
  | "requisition_on_hold"
  | "requisition_cancelled"
  | "po_created"
  | "po_assigned"
  | "po_collected"
  | "delivery_dispatched"
  | "delivery_verified"
  | "delivery_discrepancy"
  | "budget_alert"
  | "payment_received"
  | "snag_created"
  | "snag_resolved"
  | "low_stock_alert";

// Pipeline step for visual tracker
export interface PipelineStep {
  key: string;
  label: string;
  description: string;
  status: "completed" | "current" | "upcoming";
  timestamp?: Date;
}

// User session type
export interface UserSession {
  id: string;
  tenantId: string;
  email: string;
  fullName: string;
  role: Role;
  avatarUrl?: string;
}
