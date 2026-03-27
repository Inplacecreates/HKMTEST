import type { UserRole } from "@/generated/prisma";
import type { PermissionAction } from "@/types";

/**
 * Role-Permission Matrix
 * Defines what each role can do in the system.
 * This is the single source of truth for authorization.
 */
const ROLE_PERMISSIONS: Record<UserRole, Set<PermissionAction>> = {
  CEO: new Set<PermissionAction>([
    "projects:read", "projects:create", "projects:update", "projects:delete",
    "sites:read", "sites:create", "sites:update",
    "requisitions:read", "requisitions:create", "requisitions:price", "requisitions:approve", "requisitions:cancel",
    "purchase_orders:read", "purchase_orders:create", "purchase_orders:assign_driver", "purchase_orders:mark_collected",
    "deliveries:verify", "deliveries:report_discrepancy", "deliveries:resolve_discrepancy",
    "documents:read", "documents:upload",
    "budgets:read", "budgets:manage", "budgets:allocate_wallet",
    "payments:read", "payments:record",
    "suppliers:read", "suppliers:manage",
    "inventory:read", "inventory:manage",
    "snag_items:read", "snag_items:create", "snag_items:manage",
    "users:read", "users:manage",
    "settings:manage",
    "reports:read", "analytics:read",
  ]),

  QS: new Set<PermissionAction>([
    "projects:read",
    "sites:read",
    "requisitions:read",
    "purchase_orders:read",
    "documents:read", "documents:upload",
    "budgets:read",
    "payments:read",
    "suppliers:read",
    "inventory:read",
    "snag_items:read",
    "users:read",
    "reports:read", "analytics:read",
  ]),

  ARCHITECT: new Set<PermissionAction>([
    "projects:read",
    "sites:read",
    "requisitions:read",
    "documents:read", "documents:upload",
    "snag_items:read", "snag_items:create",
    "users:read",
  ]),

  PROJECT_MANAGER: new Set<PermissionAction>([
    "projects:read", "projects:create", "projects:update",
    "sites:read", "sites:create", "sites:update",
    "requisitions:read", "requisitions:price",
    "purchase_orders:read", "purchase_orders:create", "purchase_orders:assign_driver",
    "deliveries:resolve_discrepancy",
    "documents:read", "documents:upload",
    "budgets:read", "budgets:manage",
    "payments:read", "payments:record",
    "suppliers:read", "suppliers:manage",
    "inventory:read", "inventory:manage",
    "snag_items:read", "snag_items:create", "snag_items:manage",
    "users:read",
    "reports:read", "analytics:read",
  ]),

  DRIVER: new Set<PermissionAction>([
    "purchase_orders:read", "purchase_orders:mark_collected",
    "documents:read",
    "users:read",
  ]),

  CO_DRIVER: new Set<PermissionAction>([
    "purchase_orders:read", "purchase_orders:mark_collected",
    "documents:read",
    "users:read",
  ]),

  SITE_MANAGER: new Set<PermissionAction>([
    "projects:read",
    "sites:read",
    "requisitions:read", "requisitions:create",
    "purchase_orders:read",
    "deliveries:verify", "deliveries:report_discrepancy",
    "documents:read", "documents:upload",
    "budgets:read",
    "suppliers:read",
    "inventory:read",
    "snag_items:read", "snag_items:create",
    "users:read",
  ]),

  SUBCONTRACTOR: new Set<PermissionAction>([
    "projects:read",
    "sites:read",
    "snag_items:read",
    "documents:read",
  ]),
};

/**
 * Check if a role has a specific permission
 */
export function hasPermission(role: UserRole, action: PermissionAction): boolean {
  return ROLE_PERMISSIONS[role]?.has(action) ?? false;
}

/**
 * Check if a role has ANY of the specified permissions
 */
export function hasAnyPermission(role: UserRole, actions: PermissionAction[]): boolean {
  const perms = ROLE_PERMISSIONS[role];
  if (!perms) return false;
  return actions.some((action) => perms.has(action));
}

/**
 * Check if a role has ALL of the specified permissions
 */
export function hasAllPermissions(role: UserRole, actions: PermissionAction[]): boolean {
  const perms = ROLE_PERMISSIONS[role];
  if (!perms) return false;
  return actions.every((action) => perms.has(action));
}

/**
 * Get all permissions for a role
 */
export function getPermissions(role: UserRole): PermissionAction[] {
  return Array.from(ROLE_PERMISSIONS[role] ?? []);
}
