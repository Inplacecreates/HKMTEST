import type { UserRole } from "@/generated/prisma";

/**
 * A transition in the workflow state machine
 */
export interface WorkflowTransition<TStatus extends string> {
  from: TStatus;
  to: TStatus;
  allowedRoles: UserRole[];
  label: string;
  requiresNote?: boolean;
}

/**
 * A workflow definition defines all states and valid transitions
 */
export interface WorkflowDefinition<TStatus extends string> {
  name: string;
  initialStatus: TStatus;
  terminalStatuses: TStatus[];
  transitions: WorkflowTransition<TStatus>[];
}

/**
 * Result of attempting a transition
 */
export interface TransitionResult {
  success: boolean;
  error?: string;
}
