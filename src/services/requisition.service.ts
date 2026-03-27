import { prisma } from "@/lib/prisma/client";
import { requisitionWorkflow } from "@/lib/workflow/requisition-workflow";
import { eventEmitter } from "@/lib/events/emitter";
import { NotificationService } from "./notification.service";
import type { RequisitionStatus, UserRole, RequisitionPriority, FundingSource } from "@/generated/prisma";
import "@/services/activity-log.service";

interface CreateRequisitionInput {
  tenantId: string;
  userId: string;
  siteId: string;
  projectId: string;
  priority?: RequisitionPriority;
  notes?: string;
  clientSpecs?: string;
  items: {
    itemName: string;
    description?: string;
    unit: string;
    qtyRequested: number;
    catalogItemId?: string;
  }[];
}

interface TransitionInput {
  tenantId: string;
  userId: string;
  userRole: UserRole;
  requisitionId: string;
  targetStatus: RequisitionStatus;
  note?: string;
  metadata?: Record<string, unknown>;
}

interface PriceItemInput {
  tenantId: string;
  userId: string;
  requisitionId: string;
  items: {
    itemId: string;
    unitPrice: number;
    supplierId?: string;
    qtyApproved?: number;
  }[];
}

interface ListRequisitionsInput {
  tenantId: string;
  userId: string;
  userRole: UserRole;
  projectId?: string;
  siteId?: string;
  status?: RequisitionStatus;
  limit?: number;
  offset?: number;
}

/**
 * Requisition Service
 *
 * Handles the full requisition lifecycle:
 * - CRUD operations
 * - Workflow transitions (via WorkflowEngine)
 * - Item pricing
 * - Role-filtered listing
 * - Activity events + notifications on every transition
 */
export class RequisitionService {
  /**
   * Generate next requisition number: REQ-{projectCode}-{seq}
   */
  private static async generateRequisitionNumber(tenantId: string, projectId: string): Promise<string> {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { code: true },
    });

    const code = project?.code || "GEN";

    const count = await prisma.requisition.count({
      where: { tenantId, projectId },
    });

    const seq = String(count + 1).padStart(4, "0");
    return `REQ-${code}-${seq}`;
  }

  /**
   * Create a new requisition with items
   */
  static async create(input: CreateRequisitionInput) {
    const requisitionNumber = await this.generateRequisitionNumber(input.tenantId, input.projectId);

    const requisition = await prisma.requisition.create({
      data: {
        tenantId: input.tenantId,
        siteId: input.siteId,
        projectId: input.projectId,
        requisitionNumber,
        requestedBy: input.userId,
        priority: input.priority || "NORMAL",
        notes: input.notes,
        clientSpecs: input.clientSpecs,
        status: "DRAFT",
        items: {
          create: input.items.map((item) => ({
            itemName: item.itemName,
            description: item.description,
            unit: item.unit,
            qtyRequested: item.qtyRequested,
            catalogItemId: item.catalogItemId,
          })),
        },
      },
      include: {
        items: true,
        site: { select: { id: true, name: true } },
        project: { select: { id: true, name: true, code: true } },
        requester: { select: { id: true, fullName: true } },
      },
    });

    await eventEmitter.emit({
      tenantId: input.tenantId,
      userId: input.userId,
      entityType: "requisition",
      entityId: requisition.id,
      action: "requisition.created",
      metadata: {
        requisitionNumber,
        projectId: input.projectId,
        siteId: input.siteId,
        itemCount: input.items.length,
      },
    });

    return requisition;
  }

  /**
   * Get a requisition by ID with full details
   */
  static async getById(tenantId: string, requisitionId: string) {
    return prisma.requisition.findFirst({
      where: { id: requisitionId, tenantId },
      include: {
        items: {
          include: {
            supplier: { select: { id: true, name: true } },
            catalogItem: { select: { id: true, name: true } },
          },
        },
        site: { select: { id: true, name: true } },
        project: { select: { id: true, name: true, code: true } },
        requester: { select: { id: true, fullName: true, role: true } },
        projectManager: { select: { id: true, fullName: true } },
        approver: { select: { id: true, fullName: true } },
        statusLogs: {
          orderBy: { createdAt: "desc" },
          take: 20,
          include: {
            requisition: false,
          },
        },
        purchaseOrders: {
          select: { id: true, poNumber: true, status: true, totalAmount: true },
        },
        _count: { select: { documents: true } },
      },
    });
  }

  /**
   * List requisitions filtered by role
   * - CEO/QS/Architect: see all in tenant
   * - PM: see all assigned to them + unassigned
   * - Site Manager: see their own requests
   * - Driver: not applicable (they see POs)
   */
  static async list(input: ListRequisitionsInput) {
    const where: Record<string, unknown> = {
      tenantId: input.tenantId,
    };

    // Role-based filtering
    if (input.userRole === "SITE_MANAGER") {
      where.requestedBy = input.userId;
    } else if (input.userRole === "PROJECT_MANAGER") {
      where.OR = [
        { assignedPm: input.userId },
        { assignedPm: null, status: { in: ["SUBMITTED"] } },
      ];
    }
    // CEO, QS, ARCHITECT see all

    if (input.projectId) where.projectId = input.projectId;
    if (input.siteId) where.siteId = input.siteId;
    if (input.status) where.status = input.status;

    const [requisitions, total] = await Promise.all([
      prisma.requisition.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: input.limit || 50,
        skip: input.offset || 0,
        include: {
          site: { select: { id: true, name: true } },
          project: { select: { id: true, name: true, code: true } },
          requester: { select: { id: true, fullName: true } },
          projectManager: { select: { id: true, fullName: true } },
          _count: { select: { items: true, purchaseOrders: true } },
        },
      }),
      prisma.requisition.count({ where }),
    ]);

    return { requisitions, total };
  }

  /**
   * Transition a requisition to a new status
   */
  static async transition(input: TransitionInput) {
    const requisition = await prisma.requisition.findFirst({
      where: { id: input.requisitionId, tenantId: input.tenantId },
      include: {
        requester: { select: { id: true, fullName: true } },
        project: { select: { id: true, name: true, code: true } },
        site: { select: { id: true, name: true } },
      },
    });

    if (!requisition) {
      throw new Error("Requisition not found");
    }

    // Validate transition via workflow engine
    const result = requisitionWorkflow.canTransition(
      requisition.status,
      input.targetStatus,
      input.userRole
    );

    if (!result.success) {
      throw new Error(result.error);
    }

    // Check if note is required
    const transition = requisitionWorkflow.findTransition(requisition.status, input.targetStatus);
    if (transition?.requiresNote && !input.note) {
      throw new Error("A note is required for this transition");
    }

    // Build update data
    const updateData: Record<string, unknown> = {
      status: input.targetStatus,
    };

    // Track key timestamps
    if (input.targetStatus === "SUBMITTED") {
      updateData.submittedAt = new Date();
    } else if (input.targetStatus === "APPROVED") {
      updateData.approvedBy = input.userId;
      updateData.approvedAt = new Date();
    } else if (input.targetStatus === "COMPLETE") {
      updateData.completedAt = new Date();
    }

    // Auto-assign PM on SUBMITTED → PRICING
    if (input.targetStatus === "PRICING" && requisition.status === "SUBMITTED") {
      updateData.assignedPm = input.userId;
    }

    const updated = await prisma.$transaction(async (tx) => {
      // Update requisition
      const updatedReq = await tx.requisition.update({
        where: { id: input.requisitionId },
        data: updateData,
        include: {
          items: true,
          site: { select: { id: true, name: true } },
          project: { select: { id: true, name: true, code: true } },
          requester: { select: { id: true, fullName: true } },
          projectManager: { select: { id: true, fullName: true } },
        },
      });

      // Log status change
      await tx.requisitionStatusLog.create({
        data: {
          requisitionId: input.requisitionId,
          fromStatus: requisition.status,
          toStatus: input.targetStatus,
          changedBy: input.userId,
          note: input.note,
        },
      });

      return updatedReq;
    });

    // Emit activity event
    await eventEmitter.emit({
      tenantId: input.tenantId,
      userId: input.userId,
      entityType: "requisition",
      entityId: input.requisitionId,
      action: "requisition.transition",
      metadata: {
        requisitionNumber: requisition.requisitionNumber,
        fromStatus: requisition.status,
        toStatus: input.targetStatus,
        note: input.note,
        ...(input.metadata || {}),
      },
    });

    // Send notifications based on transition
    await this.notifyOnTransition(
      input.tenantId,
      updated,
      requisition.status,
      input.targetStatus,
      input.userId
    );

    return updated;
  }

  /**
   * Price requisition items (PM action during PRICING status)
   */
  static async priceItems(input: PriceItemInput) {
    const requisition = await prisma.requisition.findFirst({
      where: { id: input.requisitionId, tenantId: input.tenantId },
    });

    if (!requisition) {
      throw new Error("Requisition not found");
    }

    if (requisition.status !== "PRICING") {
      throw new Error("Requisition must be in PRICING status to price items");
    }

    // Update each item
    const updates = input.items.map((item) =>
      prisma.requisitionItem.update({
        where: { id: item.itemId },
        data: {
          unitPrice: item.unitPrice,
          supplierId: item.supplierId,
          qtyApproved: item.qtyApproved,
          status: "PRICED",
        },
      })
    );

    await Promise.all(updates);

    // Recalculate totals
    const items = await prisma.requisitionItem.findMany({
      where: { requisitionId: input.requisitionId },
    });

    const totalEstimated = items.reduce((sum, item) => {
      const price = Number(item.unitPrice || 0);
      const qty = Number(item.qtyApproved || item.qtyRequested);
      return sum + price * qty;
    }, 0);

    const updated = await prisma.requisition.update({
      where: { id: input.requisitionId },
      data: { totalEstimated },
      include: {
        items: {
          include: {
            supplier: { select: { id: true, name: true } },
          },
        },
      },
    });

    await eventEmitter.emit({
      tenantId: input.tenantId,
      userId: input.userId,
      entityType: "requisition",
      entityId: input.requisitionId,
      action: "requisition.item_priced",
      metadata: {
        requisitionNumber: requisition.requisitionNumber,
        itemCount: input.items.length,
        totalEstimated,
      },
    });

    return updated;
  }

  /**
   * Update requisition details (only in DRAFT status)
   */
  static async update(params: {
    tenantId: string;
    userId: string;
    requisitionId: string;
    data: {
      priority?: RequisitionPriority;
      notes?: string;
      clientSpecs?: string;
      fundingSource?: FundingSource;
    };
  }) {
    const requisition = await prisma.requisition.findFirst({
      where: { id: params.requisitionId, tenantId: params.tenantId },
    });

    if (!requisition) throw new Error("Requisition not found");
    if (requisition.status !== "DRAFT") {
      throw new Error("Can only edit requisitions in DRAFT status");
    }

    const updated = await prisma.requisition.update({
      where: { id: params.requisitionId },
      data: params.data,
    });

    await eventEmitter.emit({
      tenantId: params.tenantId,
      userId: params.userId,
      entityType: "requisition",
      entityId: params.requisitionId,
      action: "requisition.updated",
      metadata: { changes: Object.keys(params.data) },
    });

    return updated;
  }

  /**
   * Add items to a requisition (DRAFT status only)
   */
  static async addItems(params: {
    tenantId: string;
    userId: string;
    requisitionId: string;
    items: {
      itemName: string;
      description?: string;
      unit: string;
      qtyRequested: number;
      catalogItemId?: string;
    }[];
  }) {
    const requisition = await prisma.requisition.findFirst({
      where: { id: params.requisitionId, tenantId: params.tenantId },
    });

    if (!requisition) throw new Error("Requisition not found");
    if (requisition.status !== "DRAFT") {
      throw new Error("Can only add items to requisitions in DRAFT status");
    }

    const created = await prisma.requisitionItem.createMany({
      data: params.items.map((item) => ({
        requisitionId: params.requisitionId,
        itemName: item.itemName,
        description: item.description,
        unit: item.unit,
        qtyRequested: item.qtyRequested,
        catalogItemId: item.catalogItemId,
      })),
    });

    await eventEmitter.emit({
      tenantId: params.tenantId,
      userId: params.userId,
      entityType: "requisition",
      entityId: params.requisitionId,
      action: "requisition.item_added",
      metadata: { itemCount: created.count },
    });

    return created;
  }

  /**
   * Remove an item from a requisition (DRAFT status only)
   */
  static async removeItem(params: {
    tenantId: string;
    requisitionId: string;
    itemId: string;
  }) {
    const requisition = await prisma.requisition.findFirst({
      where: { id: params.requisitionId, tenantId: params.tenantId },
    });

    if (!requisition) throw new Error("Requisition not found");
    if (requisition.status !== "DRAFT") {
      throw new Error("Can only remove items from requisitions in DRAFT status");
    }

    return prisma.requisitionItem.delete({
      where: { id: params.itemId },
    });
  }

  /**
   * Get requisition counts by status for dashboard
   */
  static async getStatusCounts(tenantId: string, userId?: string, userRole?: UserRole) {
    const where: Record<string, unknown> = { tenantId };

    if (userRole === "SITE_MANAGER" && userId) {
      where.requestedBy = userId;
    } else if (userRole === "PROJECT_MANAGER" && userId) {
      where.assignedPm = userId;
    }

    const counts = await prisma.requisition.groupBy({
      by: ["status"],
      where,
      _count: { status: true },
    });

    return counts.reduce(
      (acc, { status, _count }) => {
        acc[status] = _count.status;
        return acc;
      },
      {} as Record<string, number>
    );
  }

  /**
   * Send notifications based on workflow transition
   */
  private static async notifyOnTransition(
    tenantId: string,
    requisition: { id: string; requisitionNumber: string; requestedBy: string; assignedPm: string | null },
    fromStatus: RequisitionStatus,
    toStatus: RequisitionStatus,
    actorId: string
  ) {
    const link = `/requisitions/${requisition.id}`;

    switch (toStatus) {
      case "SUBMITTED": {
        // Notify all PMs
        const pms = await prisma.user.findMany({
          where: { tenantId, role: "PROJECT_MANAGER", isActive: true },
          select: { id: true },
        });
        if (pms.length > 0) {
          await NotificationService.notifyMany({
            tenantId,
            userIds: pms.map((pm) => pm.id),
            type: "requisition_submitted",
            title: "New Requisition Submitted",
            message: `Requisition ${requisition.requisitionNumber} has been submitted and needs pricing.`,
            link,
            relatedEntityType: "requisition",
            relatedEntityId: requisition.id,
          });
        }
        break;
      }

      case "VERIFICATION": {
        // Notify the requester (site manager) to verify pricing
        await NotificationService.notify({
          tenantId,
          userId: requisition.requestedBy,
          type: "requisition_priced",
          title: "Requisition Priced - Verify",
          message: `Requisition ${requisition.requisitionNumber} has been priced. Please verify.`,
          link,
          relatedEntityType: "requisition",
          relatedEntityId: requisition.id,
        });
        break;
      }

      case "PENDING_APPROVAL": {
        // Notify CEO
        const ceos = await prisma.user.findMany({
          where: { tenantId, role: "CEO", isActive: true },
          select: { id: true },
        });
        if (ceos.length > 0) {
          await NotificationService.notifyMany({
            tenantId,
            userIds: ceos.map((c) => c.id),
            type: "requisition_submitted",
            title: "Requisition Awaiting Approval",
            message: `Requisition ${requisition.requisitionNumber} is ready for approval.`,
            link,
            relatedEntityType: "requisition",
            relatedEntityId: requisition.id,
          });
        }
        break;
      }

      case "APPROVED": {
        // Notify requester + PM
        const notifyIds = [requisition.requestedBy];
        if (requisition.assignedPm) notifyIds.push(requisition.assignedPm);
        await NotificationService.notifyMany({
          tenantId,
          userIds: Array.from(new Set(notifyIds)),
          type: "requisition_approved",
          title: "Requisition Approved",
          message: `Requisition ${requisition.requisitionNumber} has been approved.`,
          link,
          relatedEntityType: "requisition",
          relatedEntityId: requisition.id,
        });
        break;
      }

      case "ON_HOLD": {
        // Notify requester + PM
        const holdNotifyIds = [requisition.requestedBy];
        if (requisition.assignedPm) holdNotifyIds.push(requisition.assignedPm);
        await NotificationService.notifyMany({
          tenantId,
          userIds: Array.from(new Set(holdNotifyIds)),
          type: "requisition_on_hold",
          title: "Requisition On Hold",
          message: `Requisition ${requisition.requisitionNumber} has been put on hold.`,
          link,
          relatedEntityType: "requisition",
          relatedEntityId: requisition.id,
        });
        break;
      }

      case "CANCELLED": {
        const cancelNotifyIds = [requisition.requestedBy];
        if (requisition.assignedPm) cancelNotifyIds.push(requisition.assignedPm);
        await NotificationService.notifyMany({
          tenantId,
          userIds: Array.from(new Set(cancelNotifyIds.filter((id) => id !== actorId))),
          type: "requisition_cancelled",
          title: "Requisition Cancelled",
          message: `Requisition ${requisition.requisitionNumber} has been cancelled.`,
          link,
          relatedEntityType: "requisition",
          relatedEntityId: requisition.id,
        });
        break;
      }
    }
  }
}
