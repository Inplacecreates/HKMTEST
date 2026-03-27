import { NextResponse } from "next/server";
import { requirePermission, AuthError } from "@/lib/auth/guards";
import { RequisitionService } from "@/services/requisition.service";
import "@/services/activity-log.service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const user = await requirePermission("requisitions:read");
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId") || undefined;
    const siteId = searchParams.get("siteId") || undefined;
    const status = searchParams.get("status") as import("@/generated/prisma").RequisitionStatus | undefined;
    const limit = Number(searchParams.get("limit")) || 50;
    const offset = Number(searchParams.get("offset")) || 0;

    const result = await RequisitionService.list({
      tenantId: user.tenantId,
      userId: user.id,
      userRole: user.role,
      projectId,
      siteId,
      status: status || undefined,
      limit,
      offset,
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
    const user = await requirePermission("requisitions:create");
    const body = await request.json();

    if (!body.siteId || !body.projectId || !body.items?.length) {
      return NextResponse.json(
        { error: "siteId, projectId, and at least one item are required" },
        { status: 400 }
      );
    }

    const requisition = await RequisitionService.create({
      tenantId: user.tenantId,
      userId: user.id,
      siteId: body.siteId,
      projectId: body.projectId,
      priority: body.priority,
      notes: body.notes,
      clientSpecs: body.clientSpecs,
      items: body.items,
    });

    return NextResponse.json(requisition, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
