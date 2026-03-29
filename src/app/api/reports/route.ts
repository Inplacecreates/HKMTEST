import { NextResponse } from "next/server";
import { requirePermission, AuthError } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma/client";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const user = await requirePermission("projects:read");
    const { searchParams } = new URL(request.url);

    const type = searchParams.get("type") || "pipeline";
    const fromParam = searchParams.get("from");
    const toParam = searchParams.get("to");
    const projectIdsParam = searchParams.get("projectIds");

    const to = toParam ? new Date(toParam) : new Date();
    const from = fromParam
      ? new Date(fromParam)
      : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    to.setHours(23, 59, 59, 999);
    from.setHours(0, 0, 0, 0);

    const projectIds = projectIdsParam
      ? projectIdsParam.split(",").filter(Boolean)
      : [];

    if (type === "pipeline") {
      // Requisition Pipeline Report
      const reqs = await prisma.requisition.findMany({
        where: {
          tenantId: user.tenantId,
          createdAt: { gte: from, lte: to },
          ...(projectIds.length > 0 ? { projectId: { in: projectIds } } : {}),
        },
        select: {
          id: true,
          requisitionNumber: true,
          status: true,
          urgency: true,
          createdAt: true,
          updatedAt: true,
          project: { select: { name: true, code: true } },
          site: { select: { name: true } },
          requester: { select: { fullName: true } },
          _count: { select: { items: true } },
        },
        orderBy: { createdAt: "desc" },
      });

      // Status summary
      const statusSummary: Record<string, number> = {};
      for (const r of reqs) {
        statusSummary[r.status] = (statusSummary[r.status] || 0) + 1;
      }

      // Urgency summary
      const urgencySummary: Record<string, number> = {};
      for (const r of reqs) {
        const u = r.urgency || "NORMAL";
        urgencySummary[u] = (urgencySummary[u] || 0) + 1;
      }

      // By project
      const byProject: Record<string, { name: string; count: number; statuses: Record<string, number> }> = {};
      for (const r of reqs) {
        const key = r.project?.name || "Unknown";
        if (!byProject[key]) {
          byProject[key] = { name: key, count: 0, statuses: {} };
        }
        byProject[key].count++;
        byProject[key].statuses[r.status] = (byProject[key].statuses[r.status] || 0) + 1;
      }

      return NextResponse.json({
        type: "pipeline",
        total: reqs.length,
        statusSummary,
        urgencySummary,
        byProject: Object.values(byProject),
        items: reqs,
        dateRange: { from: from.toISOString(), to: to.toISOString() },
      });
    }

    if (type === "spend_category") {
      // Spend by Category Report
      const poItems = await prisma.pOItem.findMany({
        where: {
          purchaseOrder: {
            tenantId: user.tenantId,
            createdAt: { gte: from, lte: to },
            status: { notIn: ["CANCELLED"] },
            ...(projectIds.length > 0
              ? { requisition: { projectId: { in: projectIds } } }
              : {}),
          },
        },
        select: {
          quantity: true,
          unitPrice: true,
          unit: true,
          catalogItem: { select: { category: true, name: true } },
          description: true,
          purchaseOrder: {
            select: {
              poNumber: true,
              createdAt: true,
              requisition: {
                select: {
                  project: { select: { name: true } },
                  site: { select: { name: true } },
                },
              },
            },
          },
        },
      });

      const byCategory: Record<string, { category: string; totalSpend: number; itemCount: number; items: string[] }> = {};
      let grandTotal = 0;
      for (const item of poItems) {
        const cat = item.catalogItem?.category || "Uncategorized";
        const amount = Number(item.quantity) * Number(item.unitPrice);
        grandTotal += amount;
        if (!byCategory[cat]) {
          byCategory[cat] = { category: cat, totalSpend: 0, itemCount: 0, items: [] };
        }
        byCategory[cat].totalSpend += amount;
        byCategory[cat].itemCount++;
        const name = item.catalogItem?.name || item.description || "Item";
        if (!byCategory[cat].items.includes(name)) {
          byCategory[cat].items.push(name);
        }
      }

      const categories = Object.values(byCategory)
        .sort((a, b) => b.totalSpend - a.totalSpend)
        .map((c) => ({
          ...c,
          totalSpend: Math.round(c.totalSpend),
          percentage: grandTotal > 0 ? Math.round((c.totalSpend / grandTotal) * 100) : 0,
        }));

      return NextResponse.json({
        type: "spend_category",
        grandTotal: Math.round(grandTotal),
        categories,
        dateRange: { from: from.toISOString(), to: to.toISOString() },
      });
    }

    if (type === "supplier_spend") {
      // Supplier Spend Analysis
      const pos = await prisma.purchaseOrder.findMany({
        where: {
          tenantId: user.tenantId,
          createdAt: { gte: from, lte: to },
          status: { notIn: ["CANCELLED"] },
          ...(projectIds.length > 0
            ? { requisition: { projectId: { in: projectIds } } }
            : {}),
        },
        select: {
          id: true,
          poNumber: true,
          status: true,
          createdAt: true,
          supplier: { select: { id: true, name: true, town: true } },
          items: { select: { quantity: true, unitPrice: true } },
          requisition: {
            select: { project: { select: { name: true } } },
          },
        },
      });

      const bySupplier: Record<
        string,
        {
          supplierId: string;
          name: string;
          town: string;
          totalSpend: number;
          poCount: number;
          projects: Set<string>;
        }
      > = {};

      let grandTotal = 0;
      for (const po of pos) {
        const sid = po.supplier?.id || "unknown";
        const name = po.supplier?.name || "Unknown";
        const poTotal = po.items.reduce(
          (s, i) => s + Number(i.quantity) * Number(i.unitPrice),
          0
        );
        grandTotal += poTotal;
        if (!bySupplier[sid]) {
          bySupplier[sid] = {
            supplierId: sid,
            name,
            town: po.supplier?.town || "",
            totalSpend: 0,
            poCount: 0,
            projects: new Set(),
          };
        }
        bySupplier[sid].totalSpend += poTotal;
        bySupplier[sid].poCount++;
        if (po.requisition?.project?.name) {
          bySupplier[sid].projects.add(po.requisition.project.name);
        }
      }

      const suppliers = Object.values(bySupplier)
        .sort((a, b) => b.totalSpend - a.totalSpend)
        .map((s) => ({
          supplierId: s.supplierId,
          name: s.name,
          town: s.town,
          totalSpend: Math.round(s.totalSpend),
          poCount: s.poCount,
          projectCount: s.projects.size,
          percentage:
            grandTotal > 0 ? Math.round((s.totalSpend / grandTotal) * 100) : 0,
        }));

      return NextResponse.json({
        type: "supplier_spend",
        grandTotal: Math.round(grandTotal),
        supplierCount: suppliers.length,
        suppliers,
        dateRange: { from: from.toISOString(), to: to.toISOString() },
      });
    }

    if (type === "budget_actual") {
      // Project Budget vs Actual
      const projects = await prisma.project.findMany({
        where: {
          tenantId: user.tenantId,
          ...(projectIds.length > 0 ? { id: { in: projectIds } } : {}),
        },
        select: {
          id: true,
          name: true,
          code: true,
          status: true,
          contractValue: true,
          startDate: true,
          expectedEndDate: true,
          budgetCategories: {
            select: {
              category: true,
              allocated: true,
              spent: true,
              committed: true,
            },
          },
          clientPayments: {
            where: { createdAt: { gte: from, lte: to } },
            select: { amount: true, paymentDate: true, paymentMethod: true },
          },
        },
      });

      const report = projects.map((p) => {
        const totalAllocated = p.budgetCategories.reduce(
          (s, b) => s + Number(b.allocated),
          0
        );
        const totalSpent = p.budgetCategories.reduce(
          (s, b) => s + Number(b.spent),
          0
        );
        const totalCommitted = p.budgetCategories.reduce(
          (s, b) => s + Number(b.committed),
          0
        );
        const totalReceived = p.clientPayments.reduce(
          (s, pay) => s + Number(pay.amount),
          0
        );
        const contractValue = p.contractValue ? Number(p.contractValue) : 0;
        const utilization =
          totalAllocated > 0 ? (totalSpent / totalAllocated) * 100 : 0;

        return {
          id: p.id,
          name: p.name,
          code: p.code,
          status: p.status,
          contractValue: Math.round(contractValue),
          totalAllocated: Math.round(totalAllocated),
          totalSpent: Math.round(totalSpent),
          totalCommitted: Math.round(totalCommitted),
          totalReceived: Math.round(totalReceived),
          remaining: Math.round(totalAllocated - totalSpent),
          utilization: Math.round(utilization),
          categories: p.budgetCategories.map((b) => ({
            category: b.category,
            allocated: Math.round(Number(b.allocated)),
            spent: Math.round(Number(b.spent)),
            committed: Math.round(Number(b.committed)),
          })),
        };
      });

      return NextResponse.json({
        type: "budget_actual",
        projects: report,
        dateRange: { from: from.toISOString(), to: to.toISOString() },
      });
    }

    return NextResponse.json({ error: "Unknown report type" }, { status: 400 });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      );
    }
    console.error("Reports error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
