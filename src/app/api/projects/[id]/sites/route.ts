import { NextResponse } from "next/server";
import { requirePermission, AuthError } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma/client";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requirePermission("projects:update");
    const body = await request.json();

    if (!body.name?.trim()) {
      return NextResponse.json({ error: "Site name is required" }, { status: 400 });
    }

    // Ensure project belongs to tenant
    const project = await prisma.project.findFirst({
      where: { id: params.id, tenantId: user.tenantId },
    });
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const site = await prisma.site.create({
      data: {
        tenantId: user.tenantId,
        projectId: params.id,
        name: body.name.trim(),
        address: body.address?.trim() || undefined,
      },
      include: { siteManager: { select: { fullName: true } } },
    });

    return NextResponse.json(site, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error("Site creation error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requirePermission("projects:update");
    const { searchParams } = new URL(request.url);
    const siteId = searchParams.get("siteId");

    if (!siteId) {
      return NextResponse.json({ error: "siteId is required" }, { status: 400 });
    }

    // Check site belongs to this project + tenant
    const site = await prisma.site.findFirst({
      where: { id: siteId, projectId: params.id, tenantId: user.tenantId },
      include: { _count: { select: { requisitions: true } } },
    });

    if (!site) {
      return NextResponse.json({ error: "Site not found" }, { status: 404 });
    }

    if (site._count.requisitions > 0) {
      return NextResponse.json(
        { error: "Cannot delete a site that has requisitions" },
        { status: 400 }
      );
    }

    await prisma.site.delete({ where: { id: siteId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
