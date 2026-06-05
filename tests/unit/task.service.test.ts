/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { taskService } from '../../src/lib/services/task.service';
import { createClient } from '../../src/lib/supabase/client';
import { ValidationError, NotFoundError } from '../../src/lib/api/error-handler';
import { PRIORITY, TASK_STATUS } from '../../src/lib/utils/constants';

vi.mock('../../src/lib/supabase/client', () => {
  return {
    createClient: vi.fn(),
  };
});

describe('taskService', () => {
  const userId = 'user-123';
  const taskId = 'task-123';
  const goalA = '11111111-1111-4111-8111-111111111111';
  const goalB = '22222222-2222-4222-8222-222222222222';
  const goalC = '33333333-3333-4333-8333-333333333333';

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(createClient).mockReset();
  });

  it('should create a task with valid input', async () => {
    const input = { name: 'Test Task', priority: PRIORITY.HIGH };
    const mockData = { id: taskId, ...input, user_id: userId };

    const mockClient = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: mockData, error: null }),
    } as any;

    // Force createClient mock to return mockClient
    vi.mocked(createClient).mockImplementation(() => mockClient);

    const result = await taskService.create(userId, input);
    expect(result).toEqual(mockData);
    expect(mockClient.from).toHaveBeenCalledWith('tasks');
  });

  it('should throw ValidationError for empty name', async () => {
    const input = { name: '', priority: PRIORITY.HIGH };
    await expect(taskService.create(userId, input)).rejects.toThrow(ValidationError);
  });

  it('should throw NotFoundError for non-existent task', async () => {
    const mockClient = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
    } as any;

    vi.mocked(createClient).mockImplementation(() => mockClient);

    await expect(taskService.getById(userId, taskId)).rejects.toThrow(NotFoundError);
  });

  it('should set is_completed true and completed_at on complete()', async () => {
    const currentTask = {
      id: taskId,
      status: TASK_STATUS.INBOX,
      is_completed: false,
      previous_status: null,
      area_id: null,
      project_id: null,
    };
    const completedTask = {
      id: taskId,
      is_completed: true,
      completed_at: new Date().toISOString(),
      status: TASK_STATUS.COMPLETED,
      previous_status: TASK_STATUS.INBOX,
    };

    // getById: tasks select+single
    const getByIdClient = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: currentTask, error: null }),
    } as any;
    // getById: task_areas hydration
    const taskAreasClient = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      in: vi.fn().mockResolvedValue({ data: [], error: null }),
    } as any;
    // getById: goal_tasks hydration
    const goalTasksClient = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      in: vi.fn().mockResolvedValue({ data: [], error: null }),
    } as any;
    // getById: task_projects hydration
    const taskProjectsClient = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      in: vi.fn().mockResolvedValue({ data: [], error: null }),
    } as any;
    // complete(): the actual update
    const updateClient = {
      from: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: completedTask, error: null }),
    } as any;

    vi.mocked(createClient)
      .mockImplementationOnce(() => getByIdClient)
      .mockImplementationOnce(() => taskAreasClient)
      .mockImplementationOnce(() => goalTasksClient)
      .mockImplementationOnce(() => taskProjectsClient)
      .mockImplementationOnce(() => updateClient);

    const result = await taskService.complete(userId, taskId);
    expect(result.completedTask).toEqual(completedTask);
    expect(updateClient.update).toHaveBeenCalledWith(
      expect.objectContaining({
        is_completed: true,
        completed_at: expect.any(String),
        status: TASK_STATUS.COMPLETED,
        previous_status: TASK_STATUS.INBOX,
      }),
    );
  });

  it('should set is_archived true on archive()', async () => {
    const mockData = { id: taskId, is_archived: true };
    const mockClient = {
      from: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: mockData, error: null }),
    } as any;

    vi.mocked(createClient).mockImplementation(() => mockClient);

    const result = await taskService.archive(userId, taskId);
    expect(result).toEqual(mockData);
    expect(mockClient.update).toHaveBeenCalledWith({
      is_archived: true,
    });
  });

  it('clears is_archived on restore()', async () => {
    const mockData = { id: taskId, is_archived: false };
    const mockClient = {
      from: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: mockData, error: null }),
    } as any;

    vi.mocked(createClient).mockImplementation(() => mockClient);

    const result = await taskService.restore(userId, taskId);
    expect(result).toEqual(mockData);
    expect(mockClient.update).toHaveBeenCalledWith({
      is_archived: false,
    });
  });

  it('creates a task and links selected goals', async () => {
    const input = {
      name: 'Task with goals',
      priority: PRIORITY.HIGH,
      goal_ids: [goalA, goalB],
      due_date: '2026-06-10',
    };
    const createdTask = { id: taskId, name: input.name, user_id: userId };

    const taskClient = {
      from: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: createdTask, error: null }),
    } as any;
    const relationLookupClient = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ data: [], error: null }),
    } as any;
    const relationInsertClient = {
      from: vi.fn().mockReturnThis(),
      insert: vi.fn().mockResolvedValue({ error: null }),
    } as any;
    const touchClient = {
      from: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: createdTask, error: null }),
    } as any;
    // syncTaskStatusFromContext (called from replaceGoalLinks): returns null so
    // the function early-returns before the link lookups fire, leaving the
    // final createClient() call (touch) on the touchClient mock.
    const syncFetchClient = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    } as any;

    vi.mocked(createClient)
      .mockImplementationOnce(() => taskClient)
      .mockImplementationOnce(() => relationLookupClient)
      .mockImplementationOnce(() => relationInsertClient)
      .mockImplementationOnce(() => syncFetchClient)
      .mockImplementationOnce(() => touchClient);

    const result = await taskService.create(userId, input as never);

    expect(result).toEqual(createdTask);
    expect(taskClient.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        area_id: null,
        is_archived: false,
        is_completed: false,
        is_focused: false,
        is_important: false,
        is_urgent: false,
        name: 'Task with goals',
        priority: PRIORITY.HIGH,
        status: TASK_STATUS.TODO,
        user_id: userId,
      }),
    );
    expect(relationInsertClient.insert).toHaveBeenCalledWith([
      { goal_id: goalA, task_id: taskId },
      { goal_id: goalB, task_id: taskId },
    ]);
  });

  it('syncs goal links during update', async () => {
    const updatedTask = {
      id: taskId,
      name: 'Retargeted task',
      user_id: userId,
    };

    const updateClient = {
      from: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: updatedTask, error: null }),
    } as any;
    const relationLookupClient = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({
        data: [{ goal_id: goalA }, { goal_id: goalB }],
        error: null,
      }),
    } as any;
    const relationInsertClient = {
      from: vi.fn().mockReturnThis(),
      insert: vi.fn().mockResolvedValue({ error: null }),
    } as any;
    const relationDeleteClient = {
      from: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockResolvedValue({ error: null }),
    } as any;
    const touchClient = {
      from: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: updatedTask, error: null }),
    } as any;
    // syncTaskStatusFromContext (called from replaceGoalLinks): returning null
    // here means the function early-returns before any link lookups or
    // status updates, so the final createClient() call (touch) lands on
    // touchClient as expected.
    const syncFetchClient = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    } as any;

    vi.mocked(createClient)
      .mockImplementationOnce(() => updateClient)
      .mockImplementationOnce(() => relationLookupClient)
      .mockImplementationOnce(() => relationInsertClient)
      .mockImplementationOnce(() => relationDeleteClient)
      .mockImplementationOnce(() => syncFetchClient)
      .mockImplementationOnce(() => touchClient);

    const result = await taskService.update(userId, taskId, {
      name: 'Retargeted task',
      goal_ids: [goalB, goalC],
      due_date: '2026-06-10',
    } as never);

    expect(result).toEqual(updatedTask);
    // Partial updates must only send the fields the caller specified, plus
    // the status re-derivation when goal_ids + due_date change (both are
    // required for a task to be `todo`). Toggling is_focused via
    // useFocusTask must not reset is_completed/is_archived/is_important/
    // is_urgent/priority on the row.
    expect(updateClient.update).toHaveBeenCalledWith({
      name: 'Retargeted task',
      status: TASK_STATUS.TODO,
      due_date: '2026-06-10',
    });
    expect(relationInsertClient.insert).toHaveBeenCalledWith([{ goal_id: goalC, task_id: taskId }]);
    expect(relationDeleteClient.in).toHaveBeenCalledWith('goal_id', [goalA]);
  });

  it('clears completion state on uncomplete()', async () => {
    const currentTask = {
      id: taskId,
      status: TASK_STATUS.COMPLETED,
      is_completed: true,
      previous_status: TASK_STATUS.INBOX,
      area_id: null,
      project_id: null,
    };
    const uncompletedTask = {
      id: taskId,
      is_completed: false,
      completed_at: null,
      status: TASK_STATUS.INBOX,
      previous_status: null,
    };

    // getById: tasks select+single
    const getByIdClient = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: currentTask, error: null }),
    } as any;
    // getById: task_areas hydration
    const taskAreasClient = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      in: vi.fn().mockResolvedValue({ data: [], error: null }),
    } as any;
    // getById: goal_tasks hydration
    const goalTasksClient = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      in: vi.fn().mockResolvedValue({ data: [], error: null }),
    } as any;
    // getById: task_projects hydration
    const taskProjectsClient = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      in: vi.fn().mockResolvedValue({ data: [], error: null }),
    } as any;
    // uncomplete(): the actual update
    const updateClient = {
      from: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: uncompletedTask, error: null }),
    } as any;

    vi.mocked(createClient)
      .mockImplementationOnce(() => getByIdClient)
      .mockImplementationOnce(() => taskAreasClient)
      .mockImplementationOnce(() => goalTasksClient)
      .mockImplementationOnce(() => taskProjectsClient)
      .mockImplementationOnce(() => updateClient);

    const result = await taskService.uncomplete(userId, taskId);
    expect(result).toEqual(uncompletedTask);
    expect(updateClient.update).toHaveBeenCalledWith(
      expect.objectContaining({
        completed_at: null,
        is_completed: false,
        status: TASK_STATUS.INBOX,
        previous_status: null,
      }),
    );
  });

  it('preserves other fields when toggling is_focused only', async () => {
    // Regression: a partial update with just { is_focused: true } must not
    // leak default values for status/priority/other booleans into the
    // database update payload, otherwise toggling focus would clobber the
    // task's status, priority, archive state, completion state, etc.
    const updatedTask = {
      id: taskId,
      is_focused: true,
      user_id: userId,
    };

    const updateClient = {
      from: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: updatedTask, error: null }),
    } as any;

    vi.mocked(createClient).mockImplementationOnce(() => updateClient);

    await taskService.update(userId, taskId, { is_focused: true });

    expect(updateClient.update).toHaveBeenCalledWith({ is_focused: true });
  });

  it('preserves other fields when updating name only', async () => {
    // Regression: editing a task name (e.g. via the inline editor) must
    // not reset is_focused, is_archived, is_completed, is_important,
    // is_urgent, status, or priority.
    const updatedTask = {
      id: taskId,
      name: 'Renamed task',
      user_id: userId,
    };

    const updateClient = {
      from: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: updatedTask, error: null }),
    } as any;

    vi.mocked(createClient).mockImplementationOnce(() => updateClient);

    await taskService.update(userId, taskId, { name: 'Renamed task' });

    expect(updateClient.update).toHaveBeenCalledWith({ name: 'Renamed task' });
  });
});
