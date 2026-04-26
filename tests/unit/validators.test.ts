import { describe, it, expect } from 'vitest';
import { createAreaSchema } from '../../src/lib/validators/area.schema';
import { createTaskSchema } from '../../src/lib/validators/task.schema';
import { createGoalSchema } from '../../src/lib/validators/goal.schema';
import { createProjectSchema } from '../../src/lib/validators/project.schema';
import { PRIORITY, GOAL_TERM } from '../../src/lib/utils/constants';

describe('Validators', () => {
  describe('createAreaSchema', () => {
    it('should reject unknown fields to prevent schema drift', () => {
      const invalidArea = {
        name: 'Fitness',
        type: 'personal',
        unexpected: true,
      };

      expect(() => createAreaSchema.parse(invalidArea)).toThrow();
    });
  });

  describe('createTaskSchema', () => {
    it('should pass with valid input', () => {
      const validTask = {
        name: 'Test Task',
        priority: PRIORITY.HIGH,
      };
      const result = createTaskSchema.parse(validTask);
      expect(result).toMatchObject(validTask);
    });

    it('should reject empty name', () => {
      const invalidTask = {
        name: '',
        priority: PRIORITY.HIGH,
      };
      expect(() => createTaskSchema.parse(invalidTask)).toThrow();
    });

    it('should reject unknown fields (.strict())', () => {
      const invalidTask = {
        name: 'Test Task',
        priority: PRIORITY.HIGH,
        unknownField: 'should not be here',
      };
      expect(() => createTaskSchema.parse(invalidTask)).toThrow();
    });

    it('should accept linked goal ids for real task alignment', () => {
      const validTask = {
        name: 'Test Task',
        goal_ids: ['11111111-1111-4111-8111-111111111111'],
        priority: PRIORITY.HIGH,
      };

      const result = createTaskSchema.parse(validTask);
      expect(result).toMatchObject(validTask);
    });
  });

  describe('createGoalSchema', () => {
    it('should reject invalid term value', () => {
      const invalidGoal = {
        name: 'Test Goal',
        term: 'invalid_term',
        priority: PRIORITY.MEDIUM,
      };
      expect(() => createGoalSchema.parse(invalidGoal)).toThrow();
    });

    it('should pass with valid term', () => {
      const validGoal = {
        name: 'Test Goal',
        term: GOAL_TERM.SHORT,
        priority: PRIORITY.MEDIUM,
      };
      const result = createGoalSchema.parse(validGoal);
      expect(result).toMatchObject(validGoal);
    });
  });

  describe('createProjectSchema', () => {
    it('should accept HTML date input values for date fields', () => {
      const validProject = {
        name: 'Launch plan',
        start_date: '2026-05-01',
        due_date: '2026-05-31',
      };

      const result = createProjectSchema.parse(validProject);
      expect(result).toMatchObject(validProject);
    });
  });
});
