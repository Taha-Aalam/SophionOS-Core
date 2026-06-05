import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockPush = vi.fn();
const capturedHookArgs: Record<string, unknown[]> = {};

vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "my-goal-slug" }),
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/lib/stores/ui.store", () => ({
  useUIStore: () => ({ setPageTitle: vi.fn() }),
}));

vi.mock("@/lib/hooks/use-goal-detail", () => ({
  useGoalDetail: (id: string) => {
    capturedHookArgs.useGoalDetail = [id];
    return {
      data: {
        goal: {
          id: "resolved-goal-uuid-123",
          user_id: "user-1",
          name: "My Goal",
          slug: "my-goal-slug",
          description: null,
          term: "short",
          priority: "medium",
          target_date: null,
          progress: 0,
          is_completed: false,
          is_archived: false,
          area_id: null,
          linkedAreaIds: [],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        projects: [],
        tasks: [],
        notes: [],
        resources: [],
        rollups: {
          projectCount: 0,
          taskCount: 0,
          completedTaskCount: 0,
          noteCount: 0,
          resourceCount: 0,
        },
      },
      isLoading: false,
    };
  },
}));

vi.mock("@/lib/hooks/use-areas", () => ({
  useAreas: () => ({ data: [] }),
}));

vi.mock("@/lib/hooks/use-projects", () => ({
  useProjects: () => ({ data: [] }),
  useLinkProjectToGoal: () => ({ mutateAsync: vi.fn() }),
  useArchiveProject: () => ({ mutateAsync: vi.fn() }),
  useRestoreProject: () => ({ mutateAsync: vi.fn() }),
}));

vi.mock("@/lib/hooks/use-topics", () => ({
  useTopics: () => ({ data: [] }),
}));

vi.mock("@/lib/hooks/use-goals", () => ({
  useUpdateGoal: () => ({ mutateAsync: vi.fn() }),
  useDeleteGoal: () => ({ mutateAsync: vi.fn() }),
  useLinkGoalToArea: () => ({ mutateAsync: vi.fn(), mutate: vi.fn() }),
  useUnlinkGoalFromArea: () => ({ mutateAsync: vi.fn(), mutate: vi.fn() }),
}));

vi.mock("@/lib/hooks/use-tasks", () => ({
  useCompleteTaskWithGoalRefresh: () => ({ mutateAsync: vi.fn() }),
  useDeleteTask: () => ({ mutateAsync: vi.fn() }),
  useFocusTask: () => ({ mutateAsync: vi.fn() }),
  useUpdateTask: () => ({ mutateAsync: vi.fn() }),
  useArchiveTask: () => ({ mutateAsync: vi.fn() }),
  useRestoreTask: () => ({ mutateAsync: vi.fn() }),
  usePermanentDeleteTask: () => ({ mutateAsync: vi.fn() }),
  useTasks: () => ({ data: [] }),
}));

vi.mock("@/lib/hooks/use-notes", () => ({
  useToggleFavoriteNote: () => ({ mutate: vi.fn() }),
  useTogglePinNote: () => ({ mutate: vi.fn() }),
  useArchiveNote: () => ({ mutateAsync: vi.fn() }),
  useRestoreNote: () => ({ mutateAsync: vi.fn() }),
  useDeleteNote: () => ({ mutateAsync: vi.fn() }),
  useLinkNoteToGoal: () => ({ mutateAsync: vi.fn() }),
  useNotes: () => ({ data: [] }),
}));

vi.mock("@/lib/hooks/use-resources", () => ({
  useToggleFavoriteResource: () => ({ mutate: vi.fn() }),
  useCreateResource: () => ({ mutate: vi.fn(), mutateAsync: vi.fn() }),
  useUpdateResource: () => ({ mutate: vi.fn(), mutateAsync: vi.fn() }),
  useArchiveResource: () => ({ mutateAsync: vi.fn() }),
  useUnarchiveResource: () => ({ mutateAsync: vi.fn() }),
  useLinkResourceToGoal: () => ({ mutateAsync: vi.fn() }),
  useResources: () => ({ data: [] }),
}));

vi.mock("@/lib/hooks/use-contacts", () => ({
  useContacts: () => ({ data: [] }),
  useContactByGoal: (id: string) => {
    capturedHookArgs.useContactByGoal = [id];
    return { data: [] };
  },
  useCreateContact: () => ({ mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false }),
  useUpdateContact: () => ({ mutateAsync: vi.fn() }),
  useDeleteContact: () => ({ mutateAsync: vi.fn() }),
  useToggleContactFavorite: () => ({ mutateAsync: vi.fn() }),
  useArchiveContact: () => ({ mutateAsync: vi.fn() }),
  useLinkContactToGoal: () => ({ mutate: vi.fn(), mutateAsync: vi.fn() }),
  useUnlinkContactFromGoal: () => ({ mutate: vi.fn(), mutateAsync: vi.fn() }),
  useLinkContactToProject: () => ({ mutate: vi.fn(), mutateAsync: vi.fn() }),
  useUnlinkContactFromProject: () => ({ mutate: vi.fn(), mutateAsync: vi.fn() }),
  useLinkContactToArea: () => ({ mutate: vi.fn(), mutateAsync: vi.fn() }),
  useUnlinkContactFromArea: () => ({ mutate: vi.fn(), mutateAsync: vi.fn() }),
  useLinkContactToTask: () => ({ mutate: vi.fn(), mutateAsync: vi.fn() }),
  useUnlinkContactFromTask: () => ({ mutate: vi.fn(), mutateAsync: vi.fn() }),
  useLogInteraction: () => ({ mutateAsync: vi.fn() }),
  useContactLogs: () => ({ data: [] }),
  useCreateContactLog: () => ({ mutateAsync: vi.fn() }),
}));

vi.mock("@/components/entities/contact-card", () => ({
  ContactCard: () => null,
}));

vi.mock("@/components/entities/contact-dialog", () => ({
  ContactDialog: () => null,
}));

vi.mock("@/components/entities/goal-dialog", () => ({
  GoalDialog: () => null,
}));

vi.mock("@/components/entities/goal-detail-section", () => ({
  GoalDetailSection: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/entities/priority-badge", () => ({
  PriorityBadge: () => null,
}));

vi.mock("@/components/entities/project-card", () => ({
  ProjectCard: () => null,
}));

vi.mock("@/components/entities/project-dialog", () => ({
  ProjectDialog: () => null,
}));

vi.mock("@/components/entities/resource-dialog", () => ({
  ResourceDialog: () => null,
}));

vi.mock("@/components/entities/resource-table", () => ({
  ResourceTable: () => null,
}));

vi.mock("@/components/entities/task-dialog", () => ({
  TaskDialog: () => null,
}));

vi.mock("@/components/entities/task-list-item", () => ({
  TaskListItem: () => null,
}));

vi.mock("@/components/views/empty-state", () => ({
  EmptyState: () => null,
}));

vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({ children }: { children?: React.ReactNode }) => <button type="button">{children}</button>,
}));

vi.mock("@/components/ui/checkbox", () => ({
  Checkbox: () => null,
}));

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  DialogContent: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/input", () => ({
  Input: () => null,
}));

vi.mock("@/components/ui/label", () => ({
  Label: ({ children }: { children?: React.ReactNode }) => <label>{children}</label>,
}));

vi.mock("@/components/ui/separator", () => ({
  Separator: () => null,
}));

vi.mock("@/components/ui/skeleton", () => ({
  Skeleton: ({ className }: { className?: string }) => (
    <div className={className} data-slot="skeleton" />
  ),
}));

import { GoalDetailContent as GoalDetailPage } from "@/app/(dashboard)/goals/[id]/goal-detail-content";

describe("GoalDetailPage slug route UUID resolution", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(capturedHookArgs).forEach((key) => delete capturedHookArgs[key]);
  });

  it("calls useGoalDetail with the raw slug param", () => {
    renderToStaticMarkup(<GoalDetailPage />);

    expect(capturedHookArgs.useGoalDetail).toEqual(["my-goal-slug"]);
  });

  it("calls the goal-contact relation hook with the resolved UUID, not the slug", () => {
    renderToStaticMarkup(<GoalDetailPage />);

    expect(capturedHookArgs.useContactByGoal).toEqual(["resolved-goal-uuid-123"]);
  });
});
