import { NextResponse } from "next/server";
import { requirePermission, AuthError } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma/client";
import { FinanceService } from "@/services/finance.service";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requirePermission("budgets:read");
    const { id } = await params;

    const [budget, payments] = await Promise.all([
      FinanceService.getProjectBudget(id),
      FinanceService.getProjectPayments(id),
    ]);

    const project = await prisma.project.findFirst({
      where: { id, tenantId: user.tenantId },
      select: {
        id: true, name: true, code: true, contractValue: true,
        totalBudget: true, startDate: true, targetEndDate: true, expectedEndDate: true,
      },
    });

    return NextResponse.json({ ...budget, payments, project });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requirePermission("budgets:manage");
    const { id } = await params;
    const body = await request.json();

    // Verify project belongs to tenant
    const project = await prisma.project.findFirst({
      where: { id, tenantId: user.tenantId },
    });
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Update project contract value and dates
    if (body.contractValue !== undefined || body.startDate !== undefined || body.expectedEndDate !== undefined) {
      await prisma.project.update({
        where: { id },
        data: {
          ...(body.contractValue !== undefined ? { contractValue: parseFloat(body.contractValue) } : {}),
          ...(body.startDate ? { startDate: new Date(body.startDate) } : {}),
          ...(body.expectedEndDate ? { expectedEndDate: new Date(body.expectedEndDate) } : {}),
        },
      });
    }

    // Update budget categories
    if (body.budgets && Array.isArray(body.budgets)) {
      for (const b of body.budgets) {
        await prisma.projectBudget.upsert({
          where: { projectId_category: { projectId: id, category: b.category } },
          update: { allocated: parseFloat(b.allocated) },
          create: { projectId: id, category: b.category, allocated: parseFloat(b.allocated) },
        });
      }
    }

    // Add client payment
    if (body.payment) {
      await prisma.clientPayment.create({
        data: {
          projectId: id,
          tenantId: user.tenantId,
          amount: parseFloat(body.payment.amount),
          paymentDate: new Date(body.payment.paymentDate),
          paymentMethod: body.payment.paymentMethod ?? null,
          reference: body.payment.reference ?? null,
          referenceNumber: body.payment.referenceNumber ?? null,
          notes: body.payment.notes ?? null,
          recordedBy: user.id,
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error("Finance update error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
