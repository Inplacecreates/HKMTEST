import { NextResponse } from "next/server";
import { requirePermission, AuthError } from "@/lib/auth/guards";
import { ProjectService } from "@/services/project.service";
import "@/services/activity-log.service";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requirePermission("projects:read");
    const project = await ProjectService.getById(user.tenantId, params.id);

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    return NextResponse.json(project);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requirePermission("projects:update");
    const body = await request.json();

    const project = await ProjectService.update({
      tenantId: user.tenantId,
      userId: user.id,
      projectId: params.id,
      data: body,
    });

    return NextResponse.json(project);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
