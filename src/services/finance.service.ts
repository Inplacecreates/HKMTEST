import { prisma } from "@/lib/prisma/client";
import { eventEmitter } from "@/lib/events/emitter";
import { NotificationService } from "./notification.service";
import "@/services/activity-log.service";

/**
 * Finance Service
 *
 * Handles project budgets, client payments, and financial summaries.
 */
export class FinanceService {
  /**
   * Get budget summary for a project
   */
  static async getProjectBudget(projectId: string) {
    const budgets = await prisma.projectBudget.findMany({
      where: { projectId },
      include: {
        project: { select: { id: true, name: true, code: true, totalBudget: true } },
      },
    });

    const totals = budgets.reduce(
      (acc, b) => ({
        allocated: acc.allocated + Number(b.allocated),
        spent: acc.spent + Number(b.spent),
        committed: acc.committed + Number(b.committed),
      }),
      { allocated: 0, spent: 0, committed: 0 }
    );

    return { budgets, totals };
  }

  /**
   * Update budget allocation
   */
  static async updateBudget(params: {
    tenantId: string;
    userId: string;
    budgetId: string;
    allocated?: number;
    spent?: number;
    committed?: number;
  }) {
    const budget = await prisma.projectBudget.update({
      where: { id: params.budgetId },
      data: {
        ...(params.allocated !== undefined ? { allocated: params.allocated } : {}),
        ...(params.spent !== undefined ? { spent: params.spent } : {}),
        ...(params.committed !== undefined ? { committed: params.committed } : {}),
      },
      include: { project: { select: { id: true, name: true, totalBudget: true } } },
    });

    await eventEmitter.emit({
      tenantId: params.tenantId,
      userId: params.userId,
      entityType: "budget",
      entityId: params.budgetId,
      action: "budget.updated",
      metadata: {
        projectId: budget.projectId,
        category: budget.category,
      },
    });

    // Check budget threshold - alert if >80% spent
    const totalBudget = Number(budget.project.totalBudget);
    if (totalBudget > 0) {
      const spentPercentage = (Number(budget.spent) / Number(budget.allocated)) * 100;
      if (spentPercentage >= 80) {
        // Find CEO users for budget alerts
        const ceos = await prisma.user.findMany({
          where: { tenantId: params.tenantId, role: "CEO", isActive: true },
          select: { id: true },
        });
        if (ceos.length > 0) {
          await NotificationService.notifyMany({
            tenantId: params.tenantId,
            userIds: ceos.map((c) => c.id),
            type: "budget_alert",
            title: "Budget Alert",
            message: `${budget.category} budget for ${budget.project.name} is at ${Math.round(spentPercentage)}%.`,
            link: `/finance?projectId=${budget.projectId}`,
            relatedEntityType: "project",
            relatedEntityId: budget.projectId,
          });
        }
      }
    }

    return budget;
  }

  /**
   * Record a client payment
   */
  static async recordPayment(params: {
    tenantId: string;
    userId: string;
    projectId: string;
    amount: number;
    paymentDate: string;
    reference?: string;
    notes?: string;
  }) {
    const payment = await prisma.clientPayment.create({
      data: {
        projectId: params.projectId,
        amount: params.amount,
        paymentDate: new Date(params.paymentDate),
        reference: params.reference,
        notes: params.notes,
        recordedBy: params.userId,
      },
    });

    await eventEmitter.emit({
      tenantId: params.tenantId,
      userId: params.userId,
      entityType: "payment",
      entityId: payment.id,
      action: "payment.recorded",
      metadata: {
        projectId: params.projectId,
        amount: params.amount,
        reference: params.reference,
      },
    });

    return payment;
  }

  /**
   * Get client payments for a project
   */
  static async getProjectPayments(projectId: string) {
    return prisma.clientPayment.findMany({
      where: { projectId },
      orderBy: { paymentDate: "desc" },
      include: {
        recorder: { select: { id: true, fullName: true } },
      },
    });
  }

  /**
   * Get financial overview for all projects in a tenant
   */
  static async getTenantOverview(tenantId: string) {
    const projects = await prisma.project.findMany({
      where: { tenantId, status: { not: "ARCHIVED" } },
      select: {
        id: true,
        name: true,
        code: true,
        totalBudget: true,
        status: true,
        budgets: {
          select: { category: true, allocated: true, spent: true, committed: true },
        },
        clientPayments: {
          select: { amount: true },
        },
      },
      orderBy: { name: "asc" },
    });

    return projects.map((project) => {
      const totalAllocated = project.budgets.reduce((s, b) => s + Number(b.allocated), 0);
      const totalSpent = project.budgets.reduce((s, b) => s + Number(b.spent), 0);
      const totalCommitted = project.budgets.reduce((s, b) => s + Number(b.committed), 0);
      const totalPayments = project.clientPayments.reduce((s, p) => s + Number(p.amount), 0);

      return {
        id: project.id,
        name: project.name,
        code: project.code,
        status: project.status,
        totalBudget: Number(project.totalBudget),
        totalAllocated,
        totalSpent,
        totalCommitted,
        totalPayments,
        budgetUtilization: totalAllocated > 0 ? (totalSpent / totalAllocated) * 100 : 0,
        budgets: project.budgets,
      };
    });
  }
}
