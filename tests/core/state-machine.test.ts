import { describe, expect, it } from 'vitest';
import { TaskStateMachine, canTransition, isRiskAtLeast } from '../../packages/core/src/index.js';

describe('TaskStateMachine', () => {
  it('permits the normal lifecycle', () => {
    const machine = new TaskStateMachine();
    expect(machine.transition('planned')).toBe('planned');
    expect(machine.transition('running')).toBe('running');
    expect(machine.transition('review')).toBe('review');
    expect(machine.transition('ready')).toBe('ready');
    expect(machine.transition('completed')).toBe('completed');
  });

  it('rejects invalid transitions', () => {
    expect(canTransition('created', 'completed')).toBe(false);
    expect(() => new TaskStateMachine().transition('completed')).toThrow(/Invalid task transition/);
  });

  it('orders risk classes', () => {
    expect(isRiskAtLeast('R3', 'R2')).toBe(true);
    expect(isRiskAtLeast('R1', 'R2')).toBe(false);
  });
});
