"use client";

import { EmptyState } from "@/components/shared/empty-state";
import { ClipboardList } from "lucide-react";

export default function RequisitionsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Requisitions</h1>
        <p className="text-muted-foreground">Material requisition requests across all projects</p>
      </div>

      <EmptyState
        icon={ClipboardList}
        title="Requisitions module coming soon"
        description="The material requisition workflow with pipeline tracking will be built in Phase 2. This will include the full flow from site manager request to CEO approval to delivery verification."
      />
    </div>
  );
}
