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

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requirePermission("projects:update");
    const { prisma } = await import("@/lib/prisma/client");

    // Only allow deletion if no requisitions exist
    const reqCount = await prisma.requisition.count({
      where: { tenantId: user.tenantId, projectId: params.id },
    });
    if (reqCount > 0) {
      return NextResponse.json(
        { error: "Cannot delete a project that has requisitions. Archive it instead." },
        { status: 400 }
      );
    }

    await prisma.project.delete({
      where: { id: params.id, tenantId: user.tenantId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
