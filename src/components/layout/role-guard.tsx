"use client";

import type { UserRole } from "@/generated/prisma";
import { hasPermission, hasAnyPermission } from "@/lib/auth/permissions";
import type { PermissionAction } from "@/types";

interface RoleGuardProps {
  role: UserRole;
  permission?: PermissionAction;
  permissions?: PermissionAction[];
  requireAll?: boolean;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Client-side component that conditionally renders children based on role permissions.
 * Use this to show/hide UI elements based on the user's role.
 */
export function RoleGuard({
  role,
  permission,
  permissions,
  requireAll = false,
  fallback = null,
  children,
}: RoleGuardProps) {
  if (permission) {
    return hasPermission(role, permission) ? <>{children}</> : <>{fallback}</>;
  }

  if (permissions) {
    if (requireAll) {
      const hasAll = permissions.every((p) => hasPermission(role, p));
      return hasAll ? <>{children}</> : <>{fallback}</>;
    }
    return hasAnyPermission(role, permissions) ? <>{children}</> : <>{fallback}</>;
  }

  return <>{children}</>;
}
