import { NextResponse } from "next/server";
import { requirePermission, AuthError } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma/client";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requirePermission("projects:read");
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || undefined;

    const items = await prisma.snagItem.findMany({
      where: {
        tenantId: user.tenantId,
        projectId: params.id,
        ...(status ? { status: status as import("@/generated/prisma").SnagStatus } : {}),
      },
      include: {
        site: { select: { id: true, name: true } },
        reporter: { select: { fullName: true } },
        assignee: { select: { id: true, fullName: true } },
      },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    });

    return NextResponse.json(items);
  } catch (error) {
    if (error instanceof AuthError)
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requirePermission("projects:update");
    const body = await req.json();

    if (!body.title || !body.siteId || !body.category) {
      return NextResponse.json(
        { error: "title, siteId, and category are required" },
        { status: 400 }
      );
    }

    const item = await prisma.snagItem.create({
      data: {
        tenantId: user.tenantId,
        projectId: params.id,
        siteId: body.siteId,
        title: body.title,
        description: body.description || null,
        category: body.category,
        priority: body.priority || "NORMAL",
        status: "OPEN",
        reportedBy: user.id,
        assignedTo: body.assignedTo || null,
        dueDate: body.dueDate ? new Date(body.dueDate) : null,
      },
      include: {
        site: { select: { id: true, name: true } },
        reporter: { select: { fullName: true } },
        assignee: { select: { id: true, fullName: true } },
      },
    });

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError)
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
