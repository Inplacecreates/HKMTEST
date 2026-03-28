import { prisma } from "@/lib/prisma/client";
import { eventEmitter } from "@/lib/events/emitter";
import { NotificationService } from "./notification.service";
import type { POStatus, UserRole } from "@/generated/prisma";
import "@/services/activity-log.service";

interface CreatePOInput {
  tenantId: string;
  userId: string;
  requisitionId: string;
  supplierId: string;
  items: {
    requisitionItemId: string;
    qtyOrdered: number;
    unitPrice: number;
  }[];
  assignedDriver?: string;
  coDriver?: string;
  showFinancials?: boolean;
  collectionDate?: string;
}

interface ListPOsInput {
  tenantId: string;
  userId: string;
  userRole: UserRole;
  requisitionId?: string;
  status?: POStatus;
  limit?: number;
  offset?: number;
}

/**
 * Purchase Order Service
 *
 * Handles PO creation from approved requisitions, driver assignment,
 * and collection tracking. Strips financial data for drivers.
 */
export class PurchaseOrderService {
  /**
   * Generate PO number: PO-{projectCode}-{seq}
   */
  private static async generatePONumber(tenantId: string, requisitionId: string): Promise<string> {
    const requisition = await prisma.requisition.findFirst({
      where: { id: requisitionId },
      include: { project: { select: { code: true } } },
    });

    const code = requisition?.project?.code || "GEN";
    const count = await prisma.purchaseOrder.count({ where: { tenantId } });
    const seq = String(count + 1).padStart(4, "0");
    return `PO-${code}-${seq}`;
  }

  /**
   * Create a PO from an approved requisition
   */
  static async create(input: CreatePOInput) {
    const poNumber = await this.generatePONumber(input.tenantId, input.requisitionId);

    const totalAmount = input.items.reduce(
      (sum, item) => sum + item.qtyOrdered * item.unitPrice,
      0
    );

    const po = await prisma.$transaction(async (tx) => {
      const created = await tx.purchaseOrder.create({
        data: {
          tenantId: input.tenantId,
          requisitionId: input.requisitionId,
          poNumber,
          supplierId: input.supplierId,
          totalAmount,
          assignedDriver: input.assignedDriver,
          coDriver: input.coDriver,
          showFinancials: input.showFinancials ?? false,
          collectionDate: input.collectionDate ? new Date(input.collectionDate) : null,
          createdBy: input.userId,
          items: {
            create: input.items.map((item) => ({
              requisitionItemId: item.requisitionItemId,
              qtyOrdered: item.qtyOrdered,
              unitPrice: item.unitPrice,
            })),
          },
        },
        include: {
          items: true,
          supplier: { select: { id: true, name: true, phone: true } },
          requisition: { select: { id: true, requisitionNumber: true } },
        },
      });

      // Update requisition items to ORDERED status
      await tx.requisitionItem.updateMany({
        where: { id: { in: input.items.map((i) => i.requisitionItemId) } },
        data: { status: "ORDERED" },
      });

      return created;
    });

    await eventEmitter.emit({
      tenantId: input.tenantId,
      userId: input.userId,
      entityType: "purchase_order",
      entityId: po.id,
      action: "purchase_order.created",
      metadata: {
        poNumber,
        requisitionId: input.requisitionId,
        supplierId: input.supplierId,
        totalAmount,
        itemCount: input.items.length,
      },
    });

    // Notify driver if assigned
    if (input.assignedDriver) {
      await NotificationService.notify({
        tenantId: input.tenantId,
        userId: input.assignedDriver,
        type: "po_assigned",
        title: "New PO Assignment",
        message: `You have been assigned to collect PO ${poNumber}.`,
        link: `/purchase-orders/${po.id}`,
        relatedEntityType: "purchase_order",
        relatedEntityId: po.id,
      });
    }

    return po;
  }

  /**
   * Get PO by ID - strips financials for drivers
   */
  static async getById(tenantId: string, poId: string, userRole: UserRole) {
    const po = await prisma.purchaseOrder.findFirst({
      where: { id: poId, tenantId },
      include: {
        items: {
          include: {
            requisitionItem: { select: { id: true, itemName: true, unit: true, description: true } },
          },
        },
        supplier: { select: { id: true, name: true, contactPerson: true, phone: true, address: true } },
        requisition: {
          select: {
            id: true,
            requisitionNumber: true,
            project: { select: { id: true, name: true, code: true } },
            site: { select: { id: true, name: true, address: true } },
          },
        },
        driver: { select: { id: true, fullName: true, phone: true } },
        coDriverUser: { select: { id: true, fullName: true, phone: true } },
        creator: { select: { id: true, fullName: true } },
        verifications: { select: { id: true, status: true, createdAt: true } },
      },
    });

    if (!po) return null;

    // Strip financial data for drivers unless showFinancials is true
    if ((userRole === "DRIVER" || userRole === "CO_DRIVER") && !po.showFinancials) {
      return {
        ...po,
        totalAmount: undefined,
        items: po.items.map((item) => ({
          ...item,
          unitPrice: undefined,
        })),
      };
    }

    return po;
  }

  /**
   * List POs filtered by role
   */
  static async list(input: ListPOsInput) {
    const where: Record<string, unknown> = { tenantId: input.tenantId };

    if (input.userRole === "DRIVER") {
      where.assignedDriver = input.userId;
    } else if (input.userRole === "CO_DRIVER") {
      where.coDriver = input.userId;
    }

    if (input.requisitionId) where.requisitionId = input.requisitionId;
    if (input.status) where.status = input.status;

    const [purchaseOrders, total] = await Promise.all([
      prisma.purchaseOrder.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: input.limit || 50,
        skip: input.offset || 0,
        include: {
          supplier: { select: { id: true, name: true } },
          requisition: {
            select: {
              id: true,
              requisitionNumber: true,
              project: { select: { id: true, name: true, code: true } },
              site: { select: { id: true, name: true } },
            },
          },
          driver: { select: { id: true, fullName: true } },
          _count: { select: { items: true } },
        },
      }),
      prisma.purchaseOrder.count({ where }),
    ]);

    // Strip financials for drivers
    if (input.userRole === "DRIVER" || input.userRole === "CO_DRIVER") {
      return {
        purchaseOrders: purchaseOrders.map((po) => ({
          ...po,
          totalAmount: po.showFinancials ? po.totalAmount : undefined,
        })),
        total,
      };
    }

    return { purchaseOrders, total };
  }

  /**
   * Update PO status (e.g., mark as collected)
   */
  static async updateStatus(params: {
    tenantId: string;
    userId: string;
    userRole: UserRole;
    poId: string;
    status: POStatus;
  }) {
    const po = await prisma.purchaseOrder.findFirst({
      where: { id: params.poId, tenantId: params.tenantId },
      include: { requisition: { select: { requestedBy: true } } },
    });

    if (!po) throw new Error("Purchase order not found");

    // Validate status transitions
    const validTransitions: Record<string, string[]> = {
      CREATED: ["SENT", "CANCELLED"],
      SENT: ["PARTIALLY_COLLECTED", "COLLECTED", "CANCELLED"],
      PARTIALLY_COLLECTED: ["COLLECTED"],
      COLLECTED: [],
      CANCELLED: [],
    };

    if (!validTransitions[po.status]?.includes(params.status)) {
      throw new Error(`Cannot transition from ${po.status} to ${params.status}`);
    }

    const updated = await prisma.purchaseOrder.update({
      where: { id: params.poId },
      data: { status: params.status },
    });

    const action = params.status === "COLLECTED" ? "purchase_order.collected" : "purchase_order.assigned";

    await eventEmitter.emit({
      tenantId: params.tenantId,
      userId: params.userId,
      entityType: "purchase_order",
      entityId: params.poId,
      action,
      metadata: { fromStatus: po.status, toStatus: params.status, poNumber: po.poNumber },
    });

    // Notify on collection
    if (params.status === "COLLECTED") {
      // Notify site manager (requester)
      await NotificationService.notify({
        tenantId: params.tenantId,
        userId: po.requisition.requestedBy,
        type: "po_collected",
        title: "PO Collected",
        message: `PO ${po.poNumber} has been collected and is on the way.`,
        link: `/purchase-orders/${po.id}`,
        relatedEntityType: "purchase_order",
        relatedEntityId: po.id,
      });
    }

    return updated;
  }

  /**
   * Assign driver to PO
   */
  static async assignDriver(params: {
    tenantId: string;
    userId: string;
    poId: string;
    driverId: string;
    coDriverId?: string;
    showFinancials?: boolean;
    collectionDate?: string;
  }) {
    const updated = await prisma.purchaseOrder.update({
      where: { id: params.poId },
      data: {
        assignedDriver: params.driverId,
        coDriver: params.coDriverId,
        showFinancials: params.showFinancials ?? false,
        collectionDate: params.collectionDate ? new Date(params.collectionDate) : undefined,
      },
    });

    await eventEmitter.emit({
      tenantId: params.tenantId,
      userId: params.userId,
      entityType: "purchase_order",
      entityId: params.poId,
      action: "purchase_order.assigned",
      metadata: { driverId: params.driverId, poNumber: updated.poNumber },
    });

    await NotificationService.notify({
      tenantId: params.tenantId,
      userId: params.driverId,
      type: "po_assigned",
      title: "New PO Assignment",
      message: `You have been assigned to collect PO ${updated.poNumber}.`,
      link: `/purchase-orders/${params.poId}`,
      relatedEntityType: "purchase_order",
      relatedEntityId: params.poId,
    });

    return updated;
  }
}
