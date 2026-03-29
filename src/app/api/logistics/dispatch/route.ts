import { NextResponse } from "next/server";
import { requirePermission, AuthError } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma/client";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const user = await requirePermission("purchase_orders:assign_driver");
    const body = await request.json();

    if (!body.poId || !body.driverId || !body.vehicleReg || !body.departureTime) {
      return NextResponse.json(
        { error: "poId, driverId, vehicleReg, and departureTime are required" },
        { status: 400 }
      );
    }

    // Verify PO belongs to tenant
    const po = await prisma.purchaseOrder.findFirst({
      where: { id: body.poId, tenantId: user.tenantId },
    });
    if (!po) {
      return NextResponse.json({ error: "Purchase order not found" }, { status: 404 });
    }

    // Create delivery trip and update PO status in a transaction
    const [trip] = await prisma.$transaction([
      prisma.deliveryTrip.create({
        data: {
          tenantId: user.tenantId,
          poId: body.poId,
          driverId: body.driverId,
          coDriverId: body.coDriverId ?? null,
          vehicleReg: body.vehicleReg,
          departureTime: new Date(body.departureTime),
          estimatedArrival: body.estimatedArrival ? new Date(body.estimatedArrival) : null,
          notes: body.notes ?? null,
        },
      }),
      prisma.purchaseOrder.update({
        where: { id: body.poId },
        data: { status: "IN_TRANSIT" },
      }),
    ]);

    return NextResponse.json(trip, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error("Dispatch error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
