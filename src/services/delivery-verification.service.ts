import { prisma } from "@/lib/prisma/client";
import { eventEmitter } from "@/lib/events/emitter";
import { NotificationService } from "./notification.service";
import type { ItemCondition } from "@/generated/prisma";
import "@/services/activity-log.service";

interface VerifyDeliveryInput {
  tenantId: string;
  userId: string;
  purchaseOrderId: string;
  notes?: string;
  items: {
    poItemId: string;
    qtyExpected: number;
    qtyReceived: number;
    condition: ItemCondition;
    photoUrl?: string;
    notes?: string;
  }[];
}

/**
 * Delivery Verification Service
 *
 * Handles site manager verification of delivered materials.
 * Detects discrepancies and creates reports automatically.
 */
export class DeliveryVerificationService {
  static async verify(input: VerifyDeliveryInput) {
    // Check for discrepancies
    const hasDiscrepancy = input.items.some(
      (item) =>
        item.qtyReceived !== item.qtyExpected ||
        item.condition !== "GOOD"
    );

    const verification = await prisma.$transaction(async (tx) => {
      const created = await tx.deliveryVerification.create({
        data: {
          purchaseOrderId: input.purchaseOrderId,
          verifiedBy: input.userId,
          status: hasDiscrepancy ? "DISCREPANCY" : "COMPLETE",
          notes: input.notes,
          items: {
            create: input.items.map((item) => ({
              poItemId: item.poItemId,
              qtyExpected: item.qtyExpected,
              qtyReceived: item.qtyReceived,
              condition: item.condition,
              photoUrl: item.photoUrl,
              notes: item.notes,
            })),
          },
        },
        include: {
          items: true,
          purchaseOrder: {
            select: {
              id: true,
              poNumber: true,
              requisition: {
                select: {
                  id: true,
                  requisitionNumber: true,
                  requestedBy: true,
                  assignedPm: true,
                },
              },
            },
          },
        },
      });

      // If discrepancy, create a report
      if (hasDiscrepancy) {
        const discrepancyItems = input.items.filter(
          (item) => item.qtyReceived !== item.qtyExpected || item.condition !== "GOOD"
        );

        await tx.discrepancyReport.create({
          data: {
            verificationId: created.id,
            reportedBy: input.userId,
            status: "OPEN",
            description: `Discrepancy found in ${discrepancyItems.length} item(s) for PO ${created.purchaseOrder.poNumber}`,
          },
        });
      }

      // Update received quantities on requisition items
      for (const item of input.items) {
        const poItem = await tx.purchaseOrderItem.findUnique({
          where: { id: item.poItemId },
          select: { requisitionItemId: true },
        });
        if (poItem) {
          await tx.requisitionItem.update({
            where: { id: poItem.requisitionItemId },
            data: {
              qtyReceived: item.qtyReceived,
              status: item.qtyReceived >= item.qtyExpected ? "DELIVERED" : "DISCREPANCY",
            },
          });
        }
      }

      return created;
    });

    const action = hasDiscrepancy ? "delivery.discrepancy" : "delivery.verified";

    await eventEmitter.emit({
      tenantId: input.tenantId,
      userId: input.userId,
      entityType: "delivery_verification",
      entityId: verification.id,
      action,
      metadata: {
        purchaseOrderId: input.purchaseOrderId,
        poNumber: verification.purchaseOrder.poNumber,
        hasDiscrepancy,
        itemCount: input.items.length,
      },
    });

    // Notify PM about verification
    const pmId = verification.purchaseOrder.requisition.assignedPm;
    if (pmId) {
      await NotificationService.notify({
        tenantId: input.tenantId,
        userId: pmId,
        type: hasDiscrepancy ? "delivery_discrepancy" : "delivery_verified",
        title: hasDiscrepancy ? "Delivery Discrepancy" : "Delivery Verified",
        message: `Delivery for PO ${verification.purchaseOrder.poNumber} has been ${hasDiscrepancy ? "flagged with discrepancies" : "verified successfully"}.`,
        link: `/purchase-orders/${input.purchaseOrderId}`,
        relatedEntityType: "purchase_order",
        relatedEntityId: input.purchaseOrderId,
      });
    }

    return verification;
  }

  static async getByPurchaseOrder(purchaseOrderId: string) {
    return prisma.deliveryVerification.findMany({
      where: { purchaseOrderId },
      include: {
        items: {
          include: {
            poItem: {
              include: {
                requisitionItem: { select: { itemName: true, unit: true } },
              },
            },
          },
        },
        verifier: { select: { id: true, fullName: true } },
        discrepancies: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }
}
