"use client";

import type { RequisitionStatus } from "@/generated/prisma";
import { REQUISITION_STATUS_LABELS, REQUISITION_STATUS_COLORS } from "@/lib/utils/constants";
import { cn } from "@/lib/utils/cn";

interface StatusBadgeProps {
  status: RequisitionStatus;
  size?: "sm" | "md";
}

export function StatusBadge({ status, size = "sm" }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full font-medium",
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm",
        REQUISITION_STATUS_COLORS[status]
      )}
    >
      {REQUISITION_STATUS_LABELS[status]}
    </span>
  );
}
