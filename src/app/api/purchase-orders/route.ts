import { NextResponse } from "next/server";
import { requirePermission, AuthError } from "@/lib/auth/guards";
import { PurchaseOrderService } from "@/services/purchase-order.service";
import "@/services/activity-log.service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const user = await requirePermission("purchase_orders:read");
    const { searchParams } = new URL(request.url);
    const requisitionId = searchParams.get("requisitionId") || undefined;
    const status = searchParams.get("status") as import("@/generated/prisma").POStatus | undefined;

    const result = await PurchaseOrderService.list({
      tenantId: user.tenantId,
      userId: user.id,
      userRole: user.role,
      requisitionId,
      status: status || undefined,
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requirePermission("purchase_orders:create");
    const body = await request.json();

    if (!body.requisitionId || !body.supplierId || !body.items?.length) {
      return NextResponse.json(
        { error: "requisitionId, supplierId, and items are required" },
        { status: 400 }
      );
    }

    const po = await PurchaseOrderService.create({
      tenantId: user.tenantId,
      userId: user.id,
      requisitionId: body.requisitionId,
      supplierId: body.supplierId,
      items: body.items,
      assignedDriver: body.assignedDriver,
      coDriver: body.coDriver,
      showFinancials: body.showFinancials,
      collectionDate: body.collectionDate,
    });

    return NextResponse.json(po, { status: 201 });
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
