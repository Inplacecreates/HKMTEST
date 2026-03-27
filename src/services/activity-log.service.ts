import { prisma } from "@/lib/prisma/client";
import { eventEmitter } from "@/lib/events/emitter";
import type { ActivityEvent } from "@/lib/events/types";

/**
 * Activity Log Service
 *
 * Persists all activity events to the database.
 * Registered as a global event handler on startup.
 */
export class ActivityLogService {
  /**
   * Log an activity event directly
   */
  static async log(event: ActivityEvent) {
    await prisma.activityLog.create({
      data: {
        tenantId: event.tenantId,
        userId: event.userId,
        entityType: event.entityType,
        entityId: event.entityId,
        action: event.action,
        metadata: event.metadata ? JSON.parse(JSON.stringify(event.metadata)) : undefined,
        ipAddress: event.ipAddress,
      },
    });
  }

  /**
   * Get activity timeline for a specific entity
   */
  static async getEntityTimeline(entityType: string, entityId: string, limit = 50) {
    return prisma.activityLog.findMany({
      where: { entityType, entityId },
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        user: {
          select: { id: true, fullName: true, role: true, avatarUrl: true },
        },
      },
    });
  }

  /**
   * Get recent activity for a tenant
   */
  static async getRecentActivity(tenantId: string, limit = 20) {
    return prisma.activityLog.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        user: {
          select: { id: true, fullName: true, role: true, avatarUrl: true },
        },
      },
    });
  }

  /**
   * Get activity for a specific user
   */
  static async getUserActivity(userId: string, limit = 20) {
    return prisma.activityLog.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  }
}

// Register the activity log handler with the event emitter
eventEmitter.on(async (event) => {
  await ActivityLogService.log(event);
});
