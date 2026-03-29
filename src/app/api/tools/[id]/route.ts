import { NextResponse } from "next/server";
import { requirePermission, AuthError } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma/client";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requirePermission("inventory:read");
    const { id } = await params;

    const tool = await prisma.toolAsset.findFirst({
      where: { id, tenantId: user.tenantId },
      include: {
        movements: {
          orderBy: { createdAt: "desc" },
          include: {
            checkedOutUser: { select: { id: true, fullName: true } },
            project: { select: { id: true, name: true, code: true } },
            site: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!tool) {
      return NextResponse.json({ error: "Tool not found" }, { status: 404 });
    }

    return NextResponse.json(tool);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requirePermission("inventory:manage");
    const { id } = await params;
    const body = await request.json();

    // Handle check-out / check-in / movement
    if (body.action === "checkout") {
      if (!body.checkedOutBy || !body.projectId) {
        return NextResponse.json({ error: "checkedOutBy and projectId are required" }, { status: 400 });
      }
      const [tool] = await Promise.all([
        prisma.toolAsset.update({
          where: { id, tenantId: user.tenantId },
          data: { status: "CHECKED_OUT" },
        }),
        prisma.toolMovement.create({
          data: {
            tenantId: user.tenantId,
            toolId: id,
            movementType: "CHECKOUT",
            projectId: body.projectId,
            siteId: body.siteId ?? null,
            checkedOutBy: body.checkedOutBy,
            expectedReturn: body.expectedReturn ? new Date(body.expectedReturn) : null,
            conditionOut: body.condition ?? "GOOD",
          },
        }),
      ]);
      return NextResponse.json(tool);
    }

    if (body.action === "checkin") {
      const [tool] = await Promise.all([
        prisma.toolAsset.update({
          where: { id, tenantId: user.tenantId },
          data: {
            status: body.conditionIn === "NEEDS_SERVICE" ? "IN_SERVICE" : "AVAILABLE",
            condition: body.conditionIn ?? "GOOD",
          },
        }),
        prisma.toolMovement.create({
          data: {
            tenantId: user.tenantId,
            toolId: id,
            movementType: "CHECKIN",
            returnedAt: new Date(),
            conditionIn: body.conditionIn ?? "GOOD",
            damageNotes: body.damageNotes ?? null,
          },
        }),
      ]);
      return NextResponse.json(tool);
    }

    if (body.action === "service") {
      const [tool] = await Promise.all([
        prisma.toolAsset.update({
          where: { id, tenantId: user.tenantId },
          data: { status: "IN_SERVICE" },
        }),
        prisma.toolMovement.create({
          data: {
            tenantId: user.tenantId,
            toolId: id,
            movementType: "SERVICE",
            serviceNotes: body.serviceNotes ?? null,
          },
        }),
      ]);
      return NextResponse.json(tool);
    }

    // General update
    const tool = await prisma.toolAsset.update({
      where: { id, tenantId: user.tenantId },
      data: {
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.category !== undefined ? { category: body.category } : {}),
        ...(body.notes !== undefined ? { notes: body.notes } : {}),
        ...(body.status !== undefined ? { status: body.status } : {}),
        ...(body.condition !== undefined ? { condition: body.condition } : {}),
      },
    });

    return NextResponse.json(tool);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
