"use client";

import { EmptyState } from "@/components/shared/empty-state";
import { BarChart3 } from "lucide-react";

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Reports</h1>
        <p className="text-muted-foreground">Analytics and exportable reports</p>
      </div>

      <EmptyState
        icon={BarChart3}
        title="Reports coming soon"
        description="CEO dashboards, spending analytics, requisition cycle time reports, and PDF/Excel exports will be built in Phase 6."
      />
    </div>
  );
}
