import { prisma } from "@/lib/prisma/client";
import { eventEmitter } from "@/lib/events/emitter";
import "@/services/activity-log.service";

/**
 * Supplier Service
 */
export class SupplierService {
  static async list(tenantId: string, activeOnly = true) {
    return prisma.supplier.findMany({
      where: { tenantId, ...(activeOnly ? { isActive: true } : {}) },
      orderBy: { name: "asc" },
      include: {
        _count: { select: { purchaseOrders: true, requisitionItems: true } },
      },
    });
  }

  static async getById(tenantId: string, supplierId: string) {
    return prisma.supplier.findFirst({
      where: { id: supplierId, tenantId },
      include: {
        priceHistory: {
          orderBy: { quotedDate: "desc" },
          take: 20,
        },
        _count: { select: { purchaseOrders: true, requisitionItems: true } },
      },
    });
  }

  static async create(params: {
    tenantId: string;
    userId: string;
    data: {
      name: string;
      contactPerson?: string;
      phone?: string;
      email?: string;
      address?: string;
      categories?: string[];
      paymentTerms?: string;
    };
  }) {
    const supplier = await prisma.supplier.create({
      data: {
        tenantId: params.tenantId,
        ...params.data,
        categories: params.data.categories || [],
      },
    });

    await eventEmitter.emit({
      tenantId: params.tenantId,
      userId: params.userId,
      entityType: "supplier",
      entityId: supplier.id,
      action: "supplier.created",
      metadata: { name: supplier.name },
    });

    return supplier;
  }

  static async update(params: {
    tenantId: string;
    userId: string;
    supplierId: string;
    data: {
      name?: string;
      contactPerson?: string;
      phone?: string;
      email?: string;
      address?: string;
      categories?: string[];
      paymentTerms?: string;
      rating?: number;
      isActive?: boolean;
    };
  }) {
    const supplier = await prisma.supplier.update({
      where: { id: params.supplierId },
      data: params.data,
    });

    await eventEmitter.emit({
      tenantId: params.tenantId,
      userId: params.userId,
      entityType: "supplier",
      entityId: supplier.id,
      action: "supplier.updated",
      metadata: { changes: Object.keys(params.data) },
    });

    return supplier;
  }

  static async addPriceHistory(params: {
    supplierId: string;
    itemName: string;
    unit: string;
    price: number;
    quotedDate: Date;
  }) {
    return prisma.supplierPriceHistory.create({
      data: {
        supplierId: params.supplierId,
        itemName: params.itemName,
        unit: params.unit,
        price: params.price,
        quotedDate: params.quotedDate,
      },
    });
  }
}
