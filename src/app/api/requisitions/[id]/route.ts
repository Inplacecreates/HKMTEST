import { NextResponse } from "next/server";
import { requirePermission, AuthError } from "@/lib/auth/guards";
import { RequisitionService } from "@/services/requisition.service";
import "@/services/activity-log.service";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requirePermission("requisitions:read");
    const requisition = await RequisitionService.getById(user.tenantId, params.id);

    if (!requisition) {
      return NextResponse.json({ error: "Requisition not found" }, { status: 404 });
    }

    return NextResponse.json(requisition);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requirePermission("requisitions:create");
    const body = await request.json();

    const requisition = await RequisitionService.update({
      tenantId: user.tenantId,
      userId: user.id,
      requisitionId: params.id,
      data: body,
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
