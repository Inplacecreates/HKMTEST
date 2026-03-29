import { NextResponse } from "next/server";
import { requirePermission, AuthError } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma/client";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const user = await requirePermission("inventory:read");
    const { searchParams } = new URL(request.url);
    const siteId = searchParams.get("siteId");

    const inventory = await prisma.inventory.findMany({
      where: {
        tenantId: user.tenantId,
        ...(siteId ? { siteId } : {}),
      },
      include: {
        site: { select: { id: true, name: true, projectId: true, project: { select: { name: true, code: true } } } },
        movements: {
          orderBy: { createdAt: "desc" },
          take: 5,
          include: { recorder: { select: { id: true, fullName: true } } },
        },
      },
      orderBy: [{ siteId: "asc" }, { itemName: "asc" }],
    });

    return NextResponse.json(inventory);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requirePermission("inventory:manage");
    const body = await request.json();

    if (!body.siteId || !body.itemName || !body.unit || body.quantity === undefined) {
      return NextResponse.json(
        { error: "siteId, itemName, unit, and quantity are required" },
        { status: 400 }
      );
    }

    const quantity = parseFloat(body.quantity);
    if (isNaN(quantity)) {
      return NextResponse.json({ error: "quantity must be a number" }, { status: 400 });
    }

    // Upsert inventory record
    const existing = await prisma.inventory.findUnique({
      where: { siteId_itemName: { siteId: body.siteId, itemName: body.itemName } },
    });

    let inventory;
    if (existing) {
      inventory = await prisma.inventory.update({
        where: { id: existing.id },
        data: { qtyOnHand: { increment: quantity }, lastUpdated: new Date() },
      });
    } else {
      inventory = await prisma.inventory.create({
        data: {
          tenantId: user.tenantId,
          siteId: body.siteId,
          itemName: body.itemName,
          unit: body.unit,
          qtyOnHand: quantity,
          minStockLevel: body.minStockLevel ? parseFloat(body.minStockLevel) : 0,
        },
      });
    }

    // Record movement
    await prisma.inventoryMovement.create({
      data: {
        inventoryId: inventory.id,
        movementType: body.movementType ?? "ADJUSTMENT",
        quantity,
        notes: body.notes ?? null,
        referenceType: body.referenceType ?? null,
        referenceId: body.referenceId ?? null,
        recordedBy: user.id,
      },
    });

    return NextResponse.json(inventory, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error("Inventory error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
