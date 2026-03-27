import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";
import { hasPermission, hasAnyPermission } from "./permissions";
import type { UserRole } from "@/generated/prisma";
import type { PermissionAction } from "@/types";

export interface AuthenticatedUser {
  id: string;
  tenantId: string;
  email: string;
  fullName: string;
  role: UserRole;
  phone: string | null;
  whatsappNumber: string | null;
}

/**
 * Get the authenticated user from the request.
 * Returns null if not authenticated.
 */
export async function getAuthUser(): Promise<AuthenticatedUser | null> {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const dbUser = await prisma.user.findFirst({
      where: { email: user.email, isActive: true },
      select: {
        id: true,
        tenantId: true,
        email: true,
        fullName: true,
        role: true,
        phone: true,
        whatsappNumber: true,
      },
    });

    if (!dbUser) return null;
    return dbUser;
  } catch {
    return null;
  }
}

/**
 * Require authentication. Returns 401 if not authenticated.
 */
export async function requireAuth(): Promise<AuthenticatedUser> {
  const user = await getAuthUser();
  if (!user) {
    throw new AuthError("Unauthorized", 401);
  }
  return user;
}

/**
 * Require a specific permission. Returns 403 if not authorized.
 */
export async function requirePermission(action: PermissionAction): Promise<AuthenticatedUser> {
  const user = await requireAuth();
  if (!hasPermission(user.role, action)) {
    throw new AuthError("Forbidden: insufficient permissions", 403);
  }
  return user;
}

/**
 * Require any of the specified permissions.
 */
export async function requireAnyPermission(actions: PermissionAction[]): Promise<AuthenticatedUser> {
  const user = await requireAuth();
  if (!hasAnyPermission(user.role, actions)) {
    throw new AuthError("Forbidden: insufficient permissions", 403);
  }
  return user;
}

/**
 * Require specific roles.
 */
export async function requireRole(...roles: UserRole[]): Promise<AuthenticatedUser> {
  const user = await requireAuth();
  if (!roles.includes(user.role)) {
    throw new AuthError("Forbidden: role not authorized", 403);
  }
  return user;
}

/**
 * Custom auth error class for API routes
 */
export class AuthError extends Error {
  statusCode: number;
  constructor(message: string, statusCode: number = 401) {
    super(message);
    this.statusCode = statusCode;
    this.name = "AuthError";
  }
}

/**
 * Wrapper for API route handlers with auth error handling
 */
export function withAuth(handler: (user: AuthenticatedUser) => Promise<NextResponse>) {
  return async () => {
    try {
      const user = await requireAuth();
      return await handler(user);
    } catch (error) {
      if (error instanceof AuthError) {
        return NextResponse.json(
          { error: error.message },
          { status: error.statusCode }
        );
      }
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  };
}
