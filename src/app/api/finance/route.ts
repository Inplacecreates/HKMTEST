import { NextResponse } from "next/server";
import { requirePermission, AuthError } from "@/lib/auth/guards";
import { FinanceService } from "@/services/finance.service";
import "@/services/activity-log.service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const user = await requirePermission("budgets:read");
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");

    if (projectId) {
      const [budget, payments] = await Promise.all([
        FinanceService.getProjectBudget(projectId),
        FinanceService.getProjectPayments(projectId),
      ]);
      return NextResponse.json({ ...budget, payments });
    }

    const overview = await FinanceService.getTenantOverview(user.tenantId);
    return NextResponse.json(overview);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requirePermission("payments:record");
    const body = await request.json();

    if (!body.projectId || !body.amount || !body.paymentDate) {
      return NextResponse.json(
        { error: "projectId, amount, and paymentDate are required" },
        { status: 400 }
      );
    }

    const payment = await FinanceService.recordPayment({
      tenantId: user.tenantId,
      userId: user.id,
      projectId: body.projectId,
      amount: body.amount,
      paymentDate: body.paymentDate,
      reference: body.reference,
      notes: body.notes,
    });

    return NextResponse.json(payment, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
