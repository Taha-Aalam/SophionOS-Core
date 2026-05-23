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
    const mockData = { id: taskId, is_completed: true, completed_at: new Date().toISOString() };
    const mockClient = {
      from: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: mockData, error: null }),
    } as any;

    vi.mocked(createClient).mockImplementation(() => mockClient);

    const result = await taskService.complete(userId, taskId);
    expect(result).toEqual(mockData);
    expect(mockClient.update).toHaveBeenCalledWith({
      is_completed: true,
      completed_at: expect.any(String),
    });
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

    vi.mocked(createClient)
      .mockImplementationOnce(() => taskClient)
      .mockImplementationOnce(() => relationLookupClient)
      .mockImplementationOnce(() => relationInsertClient)
      .mockImplementationOnce(() => touchClient);

    const result = await taskService.create(userId, input as never);

    expect(result).toEqual(createdTask);
    expect(taskClient.insert).toHaveBeenCalledWith({
      area_id: undefined,
      description: undefined,
      due_date: undefined,
      goal_ids: undefined,
      is_archived: false,
      is_completed: false,
      is_focused: false,
      is_important: false,
      is_urgent: false,
      name: 'Task with goals',
      priority: PRIORITY.HIGH,
      project_id: undefined,
      status: TASK_STATUS.INBOX,
      user_id: userId,
    });
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

    vi.mocked(createClient)
      .mockImplementationOnce(() => updateClient)
      .mockImplementationOnce(() => relationLookupClient)
      .mockImplementationOnce(() => relationInsertClient)
      .mockImplementationOnce(() => relationDeleteClient)
      .mockImplementationOnce(() => touchClient);

    const result = await taskService.update(userId, taskId, {
      name: 'Retargeted task',
      goal_ids: [goalB, goalC],
    } as never);

    expect(result).toEqual(updatedTask);
    expect(updateClient.update).toHaveBeenCalledWith({
      is_archived: false,
      is_completed: false,
      is_focused: false,
      is_important: false,
      is_urgent: false,
      name: 'Retargeted task',
      priority: PRIORITY.MEDIUM,
      status: TASK_STATUS.INBOX,
    });
    expect(relationInsertClient.insert).toHaveBeenCalledWith([{ goal_id: goalC, task_id: taskId }]);
    expect(relationDeleteClient.in).toHaveBeenCalledWith('goal_id', [goalA]);
  });

  it('clears completion state on uncomplete()', async () => {
    const mockData = { id: taskId, is_completed: false, completed_at: null };
    const mockClient = {
      from: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: mockData, error: null }),
    } as any;

    vi.mocked(createClient).mockImplementation(() => mockClient);

    const result = await taskService.uncomplete(userId, taskId);
    expect(result).toEqual(mockData);
    expect(mockClient.update).toHaveBeenCalledWith({
      completed_at: null,
      is_completed: false,
    });
  });
});
