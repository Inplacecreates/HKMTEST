import { NextResponse } from "next/server";
import { requirePermission, AuthError } from "@/lib/auth/guards";
import { SupplierService } from "@/services/supplier.service";
import "@/services/activity-log.service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await requirePermission("suppliers:read");
    const suppliers = await SupplierService.list(user.tenantId);
    return NextResponse.json(suppliers);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requirePermission("suppliers:manage");
    const body = await request.json();

    if (!body.name) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    const supplier = await SupplierService.create({
      tenantId: user.tenantId,
      userId: user.id,
      data: body,
    });

    return NextResponse.json(supplier, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
