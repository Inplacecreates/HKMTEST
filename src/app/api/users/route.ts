import { NextResponse } from "next/server";
import { requirePermission, AuthError } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma/client";
import "@/services/activity-log.service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await requirePermission("users:read");
    const users = await prisma.user.findMany({
      where: { tenantId: user.tenantId },
      orderBy: { fullName: "asc" },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        phone: true,
        isActive: true,
        approvalLimit: true,
        createdAt: true,
      },
    });

    return NextResponse.json(users);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requirePermission("users:manage");
    const body = await request.json();

    if (!body.fullName || !body.email || !body.role) {
      return NextResponse.json({ error: "fullName, email, and role are required" }, { status: 400 });
    }

    const validRoles = ["CEO", "QS", "ARCHITECT", "PROJECT_MANAGER", "DRIVER", "CO_DRIVER", "SITE_MANAGER", "SUBCONTRACTOR"];
    if (!validRoles.includes(body.role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    // Check if email already exists in this tenant
    const existing = await prisma.user.findFirst({
      where: { tenantId: user.tenantId, email: body.email },
    });
    if (existing) {
      return NextResponse.json({ error: "A user with this email already exists" }, { status: 409 });
    }

    const newUser = await prisma.user.create({
      data: {
        tenantId: user.tenantId,
        fullName: body.fullName,
        email: body.email,
        role: body.role,
        phone: body.phone ?? null,
        isActive: true,
      },
      select: {
        id: true, fullName: true, email: true, role: true, phone: true, isActive: true, createdAt: true,
      },
    });

    return NextResponse.json(newUser, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
