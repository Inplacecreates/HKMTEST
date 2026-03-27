import type { ActivityAction } from "@/types";

export interface ActivityEvent {
  tenantId: string;
  userId: string;
  entityType: string;
  entityId: string;
  action: ActivityAction;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
}
