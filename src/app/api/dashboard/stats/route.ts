import { NextResponse } from "next/server";
import { requirePermission, AuthError } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma/client";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const user = await requirePermission("projects:read");
    const { searchParams } = new URL(request.url);

    const fromParam = searchParams.get("from");
    const toParam = searchParams.get("to");
    const projectIdsParam = searchParams.get("projectIds");

    // Default to last 30 days
    const to = toParam ? new Date(toParam) : new Date();
    const from = fromParam
      ? new Date(fromParam)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    to.setHours(23, 59, 59, 999);
    from.setHours(0, 0, 0, 0);

    const projectIds = projectIdsParam
      ? projectIdsParam.split(",").filter(Boolean)
      : [];

    const projectFilter =
      projectIds.length > 0 ? { id: { in: projectIds } } : {};

    // 1. Requisition pipeline — counts by status
    const reqsByStatus = await prisma.requisition.groupBy({
      by: ["status"],
      where: {
        tenantId: user.tenantId,
        createdAt: { gte: from, lte: to },
        ...(projectIds.length > 0 ? { projectId: { in: projectIds } } : {}),
      },
      _count: { id: true },
    });

    // 2. Spend over time — group PO items by month
    const poItems = await prisma.pOItem.findMany({
      where: {
        purchaseOrder: {
          tenantId: user.tenantId,
          createdAt: { gte: from, lte: to },
          ...(projectIds.length > 0
            ? { requisition: { projectId: { in: projectIds } } }
            : {}),
        },
      },
      select: {
        quantity: true,
        unitPrice: true,
        purchaseOrder: { select: { createdAt: true } },
      },
    });

    // Group by month
    const spendByMonth: Record<string, number> = {};
    for (const item of poItems) {
      const d = new Date(item.purchaseOrder.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const amount =
        Number(item.quantity) * Number(item.unitPrice);
      spendByMonth[key] = (spendByMonth[key] || 0) + amount;
    }
    const spendOverTime = Object.entries(spendByMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, amount]) => ({ month, amount: Math.round(amount) }));

    // 3. Budget vs Actual by project
    const projects = await prisma.project.findMany({
      where: {
        tenantId: user.tenantId,
        status: { in: ["ACTIVE", "PLANNING"] },
        ...projectFilter,
      },
      select: {
        id: true,
        name: true,
        contractValue: true,
        budgetCategories: {
          select: { allocated: true, spent: true, category: true },
        },
      },
    });

    const budgetVsActual = projects.map((p) => {
      const allocated = p.budgetCategories.reduce(
        (s, b) => s + Number(b.allocated),
        0
      );
      const spent = p.budgetCategories.reduce(
        (s, b) => s + Number(b.spent),
        0
      );
      return {
        project: p.name.length > 20 ? p.name.slice(0, 18) + "…" : p.name,
        allocated: Math.round(allocated),
        spent: Math.round(spent),
        contractValue: p.contractValue ? Math.round(Number(p.contractValue)) : 0,
      };
    });

    // 4. PO status breakdown
    const posByStatus = await prisma.purchaseOrder.groupBy({
      by: ["status"],
      where: {
        tenantId: user.tenantId,
        createdAt: { gte: from, lte: to },
        ...(projectIds.length > 0
          ? { requisition: { projectId: { in: projectIds } } }
          : {}),
      },
      _count: { id: true },
    });

    // 5. Summary KPIs
    const [totalReqs, pendingApprovals, activeProjectsCount] =
      await Promise.all([
        prisma.requisition.count({
          where: {
            tenantId: user.tenantId,
            createdAt: { gte: from, lte: to },
            ...(projectIds.length > 0 ? { projectId: { in: projectIds } } : {}),
          },
        }),
        prisma.requisition.count({
          where: {
            tenantId: user.tenantId,
            status: "PENDING_APPROVAL",
            ...(projectIds.length > 0 ? { projectId: { in: projectIds } } : {}),
          },
        }),
        prisma.project.count({
          where: {
            tenantId: user.tenantId,
            status: { in: ["ACTIVE", "PLANNING"] },
            ...projectFilter,
          },
        }),
      ]);

    const totalSpend = spendOverTime.reduce((s, m) => s + m.amount, 0);

    return NextResponse.json({
      kpis: {
        totalReqs,
        pendingApprovals,
        activeProjects: activeProjectsCount,
        totalSpend,
      },
      reqsByStatus: reqsByStatus.map((r) => ({
        status: r.status,
        count: r._count.id,
      })),
      spendOverTime,
      budgetVsActual,
      posByStatus: posByStatus.map((p) => ({
        status: p.status,
        count: p._count.id,
      })),
      dateRange: { from: from.toISOString(), to: to.toISOString() },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error("Dashboard stats error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
