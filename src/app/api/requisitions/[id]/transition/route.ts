import { NextResponse } from "next/server";
import { requirePermission, AuthError } from "@/lib/auth/guards";
import { RequisitionService } from "@/services/requisition.service";
import type { RequisitionStatus } from "@/generated/prisma";
import "@/services/activity-log.service";

export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requirePermission("requisitions:read");
    const body = await request.json();

    if (!body.targetStatus) {
      return NextResponse.json({ error: "targetStatus is required" }, { status: 400 });
    }

    const requisition = await RequisitionService.transition({
      tenantId: user.tenantId,
      userId: user.id,
      userRole: user.role,
      requisitionId: params.id,
      targetStatus: body.targetStatus as RequisitionStatus,
      note: body.note,
      metadata: body.metadata,
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
