import { describe, expect, it } from 'vitest';
import { resolve } from 'node:path';
import { createTask, planTask } from '../../packages/runtime/src/index.js';

describe('task planner', () => {
  it('builds an R1 team with builder, reviewer, and validator', () => {
    const task = createTask('Implement a safe change', 'R1', resolve('.'));
    const plan = planTask(resolve('.'), task, { availableHarnesses: new Set(['codex', 'claude']) });
    expect(plan.assignments.map((a) => a.role)).toEqual(['builder', 'reviewer', 'validator']);
    expect(plan.assignments.find((a) => a.role === 'builder')?.authority).toContain('modify_worktree');
    expect(plan.assignments.find((a) => a.role === 'reviewer')?.authority).not.toContain('modify_worktree');
  });

  it('uses a different provider for the R2 challenger when possible', () => {
    const task = createTask('Change several components', 'R2', resolve('.'));
    const plan = planTask(resolve('.'), task, { availableHarnesses: new Set(['codex', 'claude']) });
    const builder = plan.assignments.find((a) => a.role === 'builder');
    const challenger = plan.assignments.find((a) => a.role === 'challenger');
    expect(builder).toBeDefined();
    expect(challenger).toBeDefined();
    expect(challenger?.provider).not.toBe(builder?.provider);
  });
});
