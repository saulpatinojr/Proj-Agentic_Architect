import type { RiskClass } from '@code-conductor/schemas';

export type TaskLifecycleState =
  | 'created'
  | 'planned'
  | 'running'
  | 'blocked'
  | 'review'
  | 'ready'
  | 'completed'
  | 'failed'
  | 'cancelled';

const transitions: Record<TaskLifecycleState, readonly TaskLifecycleState[]> = {
  created: ['planned', 'cancelled'],
  planned: ['running', 'cancelled'],
  running: ['blocked', 'review', 'failed', 'cancelled'],
  blocked: ['running', 'failed', 'cancelled'],
  review: ['running', 'ready', 'blocked', 'failed', 'cancelled'],
  ready: ['completed', 'running', 'cancelled'],
  completed: [],
  failed: [],
  cancelled: [],
};

export function canTransition(from: TaskLifecycleState, to: TaskLifecycleState): boolean {
  return transitions[from].includes(to);
}

export class TaskStateMachine {
  #state: TaskLifecycleState;

  constructor(initial: TaskLifecycleState = 'created') {
    this.#state = initial;
  }

  get state(): TaskLifecycleState {
    return this.#state;
  }

  transition(to: TaskLifecycleState): TaskLifecycleState {
    if (!canTransition(this.#state, to)) {
      throw new Error(`Invalid task transition: ${this.#state} -> ${to}`);
    }
    this.#state = to;
    return this.#state;
  }
}

export const riskRank: Record<RiskClass, number> = {
  R0: 0,
  R1: 1,
  R2: 2,
  R3: 3,
  R4: 4,
};

export function isRiskAtLeast(actual: RiskClass, threshold: RiskClass): boolean {
  return riskRank[actual] >= riskRank[threshold];
}
