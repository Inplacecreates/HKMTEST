import type { UserRole } from "@/generated/prisma";
import type { WorkflowDefinition, WorkflowTransition, TransitionResult } from "./types";

/**
 * Generic Workflow Engine
 *
 * Reusable state machine that any module can use.
 * - Validates transitions against the definition
 * - Checks role-based guards
 * - Returns available next steps for a given state + role
 */
export class WorkflowEngine<TStatus extends string> {
  constructor(private definition: WorkflowDefinition<TStatus>) {}

  /**
   * Get the workflow name
   */
  get name(): string {
    return this.definition.name;
  }

  /**
   * Get the initial status
   */
  get initialStatus(): TStatus {
    return this.definition.initialStatus;
  }

  /**
   * Check if a status is terminal (no further transitions possible)
   */
  isTerminal(status: TStatus): boolean {
    return this.definition.terminalStatuses.includes(status);
  }

  /**
   * Validate if a transition is allowed for a given role
   */
  canTransition(currentStatus: TStatus, targetStatus: TStatus, role: UserRole): TransitionResult {
    const transition = this.findTransition(currentStatus, targetStatus);

    if (!transition) {
      return {
        success: false,
        error: `Invalid transition from ${currentStatus} to ${targetStatus}`,
      };
    }

    if (!transition.allowedRoles.includes(role)) {
      return {
        success: false,
        error: `Role ${role} is not authorized for this transition`,
      };
    }

    return { success: true };
  }

  /**
   * Get all available transitions from a given status for a specific role
   */
  getAvailableTransitions(currentStatus: TStatus, role: UserRole): WorkflowTransition<TStatus>[] {
    return this.definition.transitions.filter(
      (t) => t.from === currentStatus && t.allowedRoles.includes(role)
    );
  }

  /**
   * Get all possible next statuses from current status (regardless of role)
   */
  getNextStatuses(currentStatus: TStatus): TStatus[] {
    return this.definition.transitions
      .filter((t) => t.from === currentStatus)
      .map((t) => t.to);
  }

  /**
   * Find a specific transition definition
   */
  findTransition(from: TStatus, to: TStatus): WorkflowTransition<TStatus> | undefined {
    return this.definition.transitions.find(
      (t) => t.from === from && t.to === to
    );
  }

  /**
   * Get all statuses in the workflow
   */
  getAllStatuses(): TStatus[] {
    const statuses = new Set<TStatus>();
    statuses.add(this.definition.initialStatus);
    for (const t of this.definition.transitions) {
      statuses.add(t.from);
      statuses.add(t.to);
    }
    return Array.from(statuses);
  }
}
