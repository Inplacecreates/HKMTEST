import { prisma } from "./client";

/**
 * Creates a tenant-scoped prisma client that auto-filters by tenant_id.
 * Use this in all API routes and server actions to ensure tenant isolation.
 */
export function getTenantPrisma(tenantId: string) {
  return prisma.$extends({
    query: {
      $allOperations({ model, operation, args, query }) {
        // Models that have tenantId field
        const tenantScopedModels = [
          "User", "Project", "Site", "Requisition", "PurchaseOrder",
          "Supplier", "ItemCatalog", "Inventory", "Document",
          "Notification", "ActivityLog", "SnagItem",
        ];

        if (model && tenantScopedModels.includes(model)) {
          if (["findMany", "findFirst", "findUnique", "count", "aggregate", "groupBy"].includes(operation)) {
            args.where = { ...args.where, tenantId };
          }
          if (["create"].includes(operation)) {
            if (args.data && typeof args.data === "object" && !Array.isArray(args.data)) {
              (args.data as Record<string, unknown>).tenantId = tenantId;
            }
          }
          if (["createMany"].includes(operation)) {
            if (args.data && Array.isArray(args.data)) {
              args.data = args.data.map((d: Record<string, unknown>) => ({ ...d, tenantId }));
            }
          }
          if (["update", "updateMany", "delete", "deleteMany"].includes(operation)) {
            args.where = { ...args.where, tenantId };
          }
        }

        return query(args);
      },
    },
  });
}
