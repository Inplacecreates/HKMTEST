"use client";

import type { RequisitionStatus } from "@/generated/prisma";
import { cn } from "@/lib/utils/cn";

/**
 * Pipeline steps represent the simplified view for site managers:
 * Sourcing → Finance → Approved → Dispatched → Received on Site
 *
 * Maps multiple statuses to each pipeline stage.
 */
const PIPELINE_STAGES = [
  {
    key: "request",
    label: "Request",
    statuses: ["DRAFT", "SUBMITTED"] as RequisitionStatus[],
  },
  {
    key: "sourcing",
    label: "Sourcing",
    statuses: ["PRICING", "VERIFICATION"] as RequisitionStatus[],
  },
  {
    key: "finance",
    label: "Finance",
    statuses: ["BUDGET_CHECK", "PENDING_APPROVAL", "ON_HOLD"] as RequisitionStatus[],
  },
  {
    key: "approved",
    label: "Approved",
    statuses: ["APPROVED"] as RequisitionStatus[],
  },
  {
    key: "procurement",
    label: "Procurement",
    statuses: ["PO_CREATED", "DISPATCHED"] as RequisitionStatus[],
  },
  {
    key: "received",
    label: "Received",
    statuses: ["DELIVERED", "VERIFICATION_COMPLETE", "RECEIPTED", "COMPLETE"] as RequisitionStatus[],
  },
];

function getStageState(
  stageStatuses: RequisitionStatus[],
  currentStatus: RequisitionStatus,
  stageIndex: number
): "completed" | "current" | "upcoming" {
  // Find which stage the current status belongs to
  const currentStageIndex = PIPELINE_STAGES.findIndex((stage) =>
    stage.statuses.includes(currentStatus)
  );

  if (currentStatus === "CANCELLED") return "upcoming";
  if (stageIndex < currentStageIndex) return "completed";
  if (stageIndex === currentStageIndex) return "current";
  return "upcoming";
}

interface RequisitionPipelineProps {
  status: RequisitionStatus;
  className?: string;
}

export function RequisitionPipeline({ status, className }: RequisitionPipelineProps) {
  if (status === "CANCELLED") {
    return (
      <div className={cn("flex items-center gap-2 rounded-lg bg-red-50 px-4 py-3", className)}>
        <div className="h-3 w-3 rounded-full bg-red-500" />
        <span className="text-sm font-medium text-red-700">Cancelled</span>
      </div>
    );
  }

  return (
    <div className={cn("w-full", className)}>
      {/* Desktop view */}
      <div className="hidden sm:flex items-center">
        {PIPELINE_STAGES.map((stage, index) => {
          const state = getStageState(stage.statuses, status, index);
          return (
            <div key={stage.key} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1">
                <div
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-colors",
                    state === "completed" && "bg-green-500 text-white",
                    state === "current" && "bg-primary-600 text-white ring-4 ring-primary-100",
                    state === "upcoming" && "bg-gray-200 text-gray-500"
                  )}
                >
                  {state === "completed" ? (
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    index + 1
                  )}
                </div>
                <span
                  className={cn(
                    "mt-1 text-xs font-medium text-center",
                    state === "completed" && "text-green-700",
                    state === "current" && "text-primary-700",
                    state === "upcoming" && "text-gray-400"
                  )}
                >
                  {stage.label}
                </span>
              </div>
              {index < PIPELINE_STAGES.length - 1 && (
                <div
                  className={cn(
                    "h-0.5 flex-1 -mt-4",
                    state === "completed" ? "bg-green-500" : "bg-gray-200"
                  )}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Mobile view - vertical */}
      <div className="sm:hidden space-y-2">
        {PIPELINE_STAGES.map((stage, index) => {
          const state = getStageState(stage.statuses, status, index);
          return (
            <div key={stage.key} className="flex items-center gap-3">
              <div
                className={cn(
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                  state === "completed" && "bg-green-500 text-white",
                  state === "current" && "bg-primary-600 text-white",
                  state === "upcoming" && "bg-gray-200 text-gray-500"
                )}
              >
                {state === "completed" ? (
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  index + 1
                )}
              </div>
              <span
                className={cn(
                  "text-sm",
                  state === "completed" && "text-green-700 font-medium",
                  state === "current" && "text-primary-700 font-semibold",
                  state === "upcoming" && "text-gray-400"
                )}
              >
                {stage.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
