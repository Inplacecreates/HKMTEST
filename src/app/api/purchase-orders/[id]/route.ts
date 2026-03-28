import { NextResponse } from "next/server";
import { requirePermission, AuthError } from "@/lib/auth/guards";
import { PurchaseOrderService } from "@/services/purchase-order.service";
import type { POStatus } from "@/generated/prisma";
import "@/services/activity-log.service";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requirePermission("purchase_orders:read");
    const po = await PurchaseOrderService.getById(user.tenantId, params.id, user.role);

    if (!po) {
      return NextResponse.json({ error: "Purchase order not found" }, { status: 404 });
    }

    return NextResponse.json(po);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requirePermission("purchase_orders:read");
    const body = await request.json();

    if (body.status) {
      const po = await PurchaseOrderService.updateStatus({
        tenantId: user.tenantId,
        userId: user.id,
        userRole: user.role,
        poId: params.id,
        status: body.status as POStatus,
      });
      return NextResponse.json(po);
    }

    if (body.driverId) {
      const po = await PurchaseOrderService.assignDriver({
        tenantId: user.tenantId,
        userId: user.id,
        poId: params.id,
        driverId: body.driverId,
        coDriverId: body.coDriverId,
        showFinancials: body.showFinancials,
        collectionDate: body.collectionDate,
      });
      return NextResponse.json(po);
    }

    return NextResponse.json({ error: "No valid update fields provided" }, { status: 400 });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
