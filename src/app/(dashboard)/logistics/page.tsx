"use client";

import { EmptyState } from "@/components/shared/empty-state";
import { Truck } from "lucide-react";

export default function LogisticsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Logistics</h1>
        <p className="text-muted-foreground">Driver assignments and delivery tracking</p>
      </div>

      <EmptyState
        icon={Truck}
        title="Logistics tracking coming soon"
        description="Driver assignment, collection tracking, and delivery status will be built in Phase 3."
      />
    </div>
  );
}
