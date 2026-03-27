import { NextResponse } from "next/server";
import { requirePermission, AuthError } from "@/lib/auth/guards";
import { RequisitionService } from "@/services/requisition.service";
import "@/services/activity-log.service";

export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requirePermission("requisitions:price");
    const body = await request.json();

    if (!body.items?.length) {
      return NextResponse.json({ error: "items array is required" }, { status: 400 });
    }

    const requisition = await RequisitionService.priceItems({
      tenantId: user.tenantId,
      userId: user.id,
      requisitionId: params.id,
      items: body.items,
    });

    return NextResponse.json(requisition);
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
