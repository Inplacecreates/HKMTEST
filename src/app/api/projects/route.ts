import { NextResponse } from "next/server";
import { requirePermission, AuthError } from "@/lib/auth/guards";
import { ProjectService } from "@/services/project.service";
import "@/services/activity-log.service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await requirePermission("projects:read");
    const projects = await ProjectService.list(user.tenantId);
    return NextResponse.json(projects);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requirePermission("projects:create");
    const body = await request.json();

    if (!body.name || !body.code || !body.clientName) {
      return NextResponse.json(
        { error: "name, code, and clientName are required" },
        { status: 400 }
      );
    }

    const project = await ProjectService.create({
      tenantId: user.tenantId,
      userId: user.id,
      name: body.name,
      code: body.code,
      clientName: body.clientName,
      clientPhone: body.clientPhone,
      clientEmail: body.clientEmail,
      address: body.address,
      description: body.description,
      totalBudget: body.totalBudget ? parseFloat(body.totalBudget) : undefined,
      startDate: body.startDate,
      targetEndDate: body.targetEndDate,
    });

    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error("Project creation error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
