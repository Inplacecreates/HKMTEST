"use client";

import { EmptyState } from "@/components/shared/empty-state";
import { ShoppingCart } from "lucide-react";

export default function PurchaseOrdersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Purchase Orders</h1>
        <p className="text-muted-foreground">Track purchase orders from creation to collection</p>
      </div>

      <EmptyState
        icon={ShoppingCart}
        title="Purchase orders module coming soon"
        description="Purchase order creation, driver assignment, and collection tracking will be built in Phase 3."
      />
    </div>
  );
}
