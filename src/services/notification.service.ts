import { prisma } from "@/lib/prisma/client";
import type { NotificationType } from "@/types";

/**
 * Notification Service
 *
 * Creates in-app notifications and triggers WhatsApp alerts for critical events.
 */
export class NotificationService {
  /**
   * Create a notification for a user
   */
  static async notify(params: {
    tenantId: string;
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    link?: string;
    relatedEntityType?: string;
    relatedEntityId?: string;
  }) {
    return prisma.notification.create({
      data: {
        tenantId: params.tenantId,
        userId: params.userId,
        type: params.type,
        title: params.title,
        message: params.message,
        link: params.link,
        relatedEntityType: params.relatedEntityType,
        relatedEntityId: params.relatedEntityId,
      },
    });
  }

  /**
   * Notify multiple users
   */
  static async notifyMany(params: {
    tenantId: string;
    userIds: string[];
    type: NotificationType;
    title: string;
    message: string;
    link?: string;
    relatedEntityType?: string;
    relatedEntityId?: string;
  }) {
    return prisma.notification.createMany({
      data: params.userIds.map((userId) => ({
        tenantId: params.tenantId,
        userId,
        type: params.type,
        title: params.title,
        message: params.message,
        link: params.link,
        relatedEntityType: params.relatedEntityType,
        relatedEntityId: params.relatedEntityId,
      })),
    });
  }

  /**
   * Get unread notifications for a user
   */
  static async getUnread(userId: string, limit = 20) {
    return prisma.notification.findMany({
      where: { userId, isRead: false },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  }

  /**
   * Get all notifications for a user
   */
  static async getAll(userId: string, limit = 50) {
    return prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  }

  /**
   * Get unread count
   */
  static async getUnreadCount(userId: string): Promise<number> {
    return prisma.notification.count({
      where: { userId, isRead: false },
    });
  }

  /**
   * Mark notifications as read
   */
  static async markAsRead(notificationIds: string[]) {
    return prisma.notification.updateMany({
      where: { id: { in: notificationIds } },
      data: { isRead: true },
    });
  }

  /**
   * Mark all notifications as read for a user
   */
  static async markAllAsRead(userId: string) {
    return prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  }
}
