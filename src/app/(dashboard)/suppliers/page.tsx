"use client";

import { EmptyState } from "@/components/shared/empty-state";
import { Building2 } from "lucide-react";

export default function SuppliersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Suppliers</h1>
        <p className="text-muted-foreground">Manage your supplier database and pricing history</p>
      </div>

      <EmptyState
        icon={Building2}
        title="Supplier database coming soon"
        description="Supplier management with contact details, categories, ratings, and price history will be built in Phase 7."
      />
    </div>
  );
}
