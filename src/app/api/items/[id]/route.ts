import { NextResponse } from "next/server";
import { requirePermission, AuthError } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma/client";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requirePermission("settings:manage");
    const { id } = await params;
    const body = await request.json();

    const item = await prisma.itemCatalog.update({
      where: { id, tenantId: user.tenantId },
      data: {
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.description !== undefined ? { description: body.description } : {}),
        ...(body.defaultUnit !== undefined ? { defaultUnit: body.defaultUnit } : {}),
        ...(body.category !== undefined ? { category: body.category } : {}),
        ...(body.sku !== undefined ? { sku: body.sku } : {}),
        ...(body.averagePrice !== undefined
          ? { averagePrice: body.averagePrice ? parseFloat(body.averagePrice) : null }
          : {}),
        ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
      },
    });

    return NextResponse.json(item);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requirePermission("settings:manage");
    const { id } = await params;

    // Soft delete
    await prisma.itemCatalog.update({
      where: { id, tenantId: user.tenantId },
      data: { isActive: false },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
