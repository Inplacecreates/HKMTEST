import { NextResponse } from "next/server";
import { requirePermission, AuthError } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma/client";
import { eventEmitter } from "@/lib/events/emitter";
import "@/services/activity-log.service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const user = await requirePermission("sites:read");
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");

    const sites = await prisma.site.findMany({
      where: {
        tenantId: user.tenantId,
        ...(projectId ? { projectId } : {}),
      },
      orderBy: { createdAt: "desc" },
      include: {
        project: { select: { id: true, name: true, code: true } },
        siteManager: { select: { id: true, fullName: true, phone: true } },
        _count: { select: { requisitions: true, inventory: true } },
      },
    });

    return NextResponse.json(sites);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requirePermission("sites:create");
    const body = await request.json();

    if (!body.name || !body.projectId) {
      return NextResponse.json({ error: "name and projectId are required" }, { status: 400 });
    }

    const site = await prisma.site.create({
      data: {
        tenantId: user.tenantId,
        projectId: body.projectId,
        name: body.name,
        address: body.address,
        siteManagerId: body.siteManagerId,
      },
    });

    await eventEmitter.emit({
      tenantId: user.tenantId,
      userId: user.id,
      entityType: "site",
      entityId: site.id,
      action: "site.created",
      metadata: { name: body.name, projectId: body.projectId },
    });

    return NextResponse.json(site, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
