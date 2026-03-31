import { NextResponse } from "next/server";
import { requirePermission, AuthError } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma/client";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await requirePermission("users:manage");
    const { id } = await params;
    const body = await request.json();

    const validRoles = ["CEO", "QS", "ARCHITECT", "PROJECT_MANAGER", "DRIVER", "CO_DRIVER", "SITE_MANAGER", "SUBCONTRACTOR"];
    if (body.role && !validRoles.includes(body.role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    const updatedUser = await prisma.user.update({
      where: { id, tenantId: currentUser.tenantId },
      data: {
        ...(body.fullName !== undefined ? { fullName: body.fullName } : {}),
        ...(body.role !== undefined ? { role: body.role } : {}),
        ...(body.phone !== undefined ? { phone: body.phone } : {}),
        ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
        ...(body.approvalLimit !== undefined ? { approvalLimit: body.approvalLimit } : {}),
      },
      select: {
        id: true, fullName: true, email: true, role: true, phone: true, isActive: true, approvalLimit: true, createdAt: true,
      },
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
