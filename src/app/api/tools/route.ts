import { NextResponse } from "next/server";
import { requirePermission, AuthError } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma/client";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const user = await requirePermission("inventory:read");
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const search = searchParams.get("search") ?? "";

    const tools = await prisma.toolAsset.findMany({
      where: {
        tenantId: user.tenantId,
        ...(status ? { status: status as "AVAILABLE" | "CHECKED_OUT" | "IN_SERVICE" | "RETIRED" } : {}),
        ...(search ? { name: { contains: search, mode: "insensitive" } } : {}),
      },
      include: {
        movements: {
          orderBy: { createdAt: "desc" },
          take: 1,
          include: {
            checkedOutUser: { select: { id: true, fullName: true } },
            project: { select: { id: true, name: true, code: true } },
            site: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(tools);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requirePermission("inventory:manage");
    const body = await request.json();

    if (!body.name || !body.category) {
      return NextResponse.json({ error: "name and category are required" }, { status: 400 });
    }

    const tool = await prisma.toolAsset.create({
      data: {
        tenantId: user.tenantId,
        name: body.name,
        category: body.category,
        serialNumber: body.serialNumber ?? null,
        assetNumber: body.assetNumber ?? null,
        purchaseDate: body.purchaseDate ? new Date(body.purchaseDate) : null,
        purchasePrice: body.purchasePrice ? parseFloat(body.purchasePrice) : null,
        condition: body.condition ?? "GOOD",
        status: "AVAILABLE",
        notes: body.notes ?? null,
      },
    });

    return NextResponse.json(tool, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
