"use client";

import { EmptyState } from "@/components/shared/empty-state";
import { DollarSign } from "lucide-react";

export default function FinancePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Finance</h1>
        <p className="text-muted-foreground">Budget tracking, client payments, and receipt management</p>
      </div>

      <EmptyState
        icon={DollarSign}
        title="Finance module coming soon"
        description="Project budgets, client payment tracking, company wallet management, and receipt gallery will be built in Phase 5."
      />
    </div>
  );
}
