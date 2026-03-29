import { NextResponse } from "next/server";
import { requirePermission, AuthError } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma/client";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string; snagId: string } }
) {
  try {
    const user = await requirePermission("projects:update");
    const body = await req.json();

    const allowed = ["title", "description", "category", "priority", "status", "assignedTo", "dueDate"];
    const data: Record<string, unknown> = {};
    for (const key of allowed) {
      if (key in body) {
        data[key] = key === "dueDate" && body[key] ? new Date(body[key]) : body[key];
      }
    }

    // Set resolvedAt when marking FIXED or VERIFIED
    if (body.status === "FIXED" || body.status === "VERIFIED") {
      data.resolvedAt = new Date();
    }
    if (body.status === "VERIFIED") {
      data.verifiedBy = user.id;
    }

    const item = await prisma.snagItem.update({
      where: { id: params.snagId, tenantId: user.tenantId },
      data,
      include: {
        site: { select: { id: true, name: true } },
        reporter: { select: { fullName: true } },
        assignee: { select: { id: true, fullName: true } },
      },
    });

    return NextResponse.json(item);
  } catch (error) {
    if (error instanceof AuthError)
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string; snagId: string } }
) {
  try {
    const user = await requirePermission("projects:update");
    await prisma.snagItem.delete({
      where: { id: params.snagId, tenantId: user.tenantId },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof AuthError)
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
