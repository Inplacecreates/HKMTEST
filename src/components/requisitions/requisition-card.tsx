"use client";

import Link from "next/link";
import type { RequisitionStatus, RequisitionPriority } from "@/generated/prisma";
import { StatusBadge } from "./status-badge";
import { formatKES, formatRelativeTime } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

const PRIORITY_COLORS: Record<string, string> = {
  LOW: "text-gray-500",
  NORMAL: "text-blue-600",
  URGENT: "text-orange-600",
  CRITICAL: "text-red-600 font-bold",
};

interface RequisitionCardProps {
  requisition: {
    id: string;
    requisitionNumber: string;
    status: RequisitionStatus;
    priority: RequisitionPriority;
    totalEstimated: string | number;
    createdAt: string;
    site: { id: string; name: string };
    project: { id: string; name: string; code: string };
    requester: { id: string; fullName: string };
    projectManager?: { id: string; fullName: string } | null;
    _count: { items: number; purchaseOrders: number };
  };
}

export function RequisitionCard({ requisition }: RequisitionCardProps) {
  return (
    <Link href={`/requisitions/${requisition.id}`}>
      <div className="rounded-lg border bg-white p-4 hover:shadow-md transition-shadow cursor-pointer">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-sm font-semibold text-gray-900">
                {requisition.requisitionNumber}
              </span>
              <StatusBadge status={requisition.status} />
              <span className={cn("text-xs", PRIORITY_COLORS[requisition.priority])}>
                {requisition.priority}
              </span>
            </div>
            <p className="mt-1 text-sm text-gray-600 truncate">
              {requisition.project.name} &middot; {requisition.site.name}
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-sm font-semibold text-gray-900">
              {formatKES(Number(requisition.totalEstimated))}
            </p>
            <p className="text-xs text-gray-500">
              {requisition._count.items} item{requisition._count.items !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
          <span>By {requisition.requester.fullName}</span>
          {requisition.projectManager && (
            <span>PM: {requisition.projectManager.fullName}</span>
          )}
          <span>{formatRelativeTime(new Date(requisition.createdAt))}</span>
        </div>
      </div>
    </Link>
  );
}
