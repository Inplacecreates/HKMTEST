import { NextResponse } from "next/server";
import { requirePermission, AuthError } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma/client";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const user = await requirePermission("requisitions:read");
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") ?? "";
    const category = searchParams.get("category") ?? "";
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = Math.min(100, parseInt(searchParams.get("limit") ?? "20", 10));

    const where = {
      tenantId: user.tenantId,
      isActive: true,
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" as const } },
              { category: { contains: search, mode: "insensitive" as const } },
              { defaultUnit: { contains: search, mode: "insensitive" as const } },
            ],
          }
        : {}),
      ...(category ? { category } : {}),
    };

    const [items, total] = await Promise.all([
      prisma.itemCatalog.findMany({
        where,
        orderBy: { name: "asc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.itemCatalog.count({ where }),
    ]);

    return NextResponse.json({ items, total, page, limit });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requirePermission("settings:manage");
    const body = await request.json();

    if (!body.name || !body.defaultUnit || !body.category) {
      return NextResponse.json(
        { error: "name, defaultUnit, and category are required" },
        { status: 400 }
      );
    }

    const item = await prisma.itemCatalog.create({
      data: {
        tenantId: user.tenantId,
        name: body.name,
        description: body.description ?? null,
        defaultUnit: body.defaultUnit,
        category: body.category,
        sku: body.sku ?? null,
        averagePrice: body.averagePrice ? parseFloat(body.averagePrice) : null,
        isActive: true,
      },
    });

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
