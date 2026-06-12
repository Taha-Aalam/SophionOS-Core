import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockPush = vi.fn();
const capturedHookArgs: Record<string, unknown[]> = {};

vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "my-project-slug" }),
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/lib/stores/ui.store", () => ({
  useUIStore: () => ({ setPageTitle: vi.fn() }),
}));

vi.mock("@/lib/hooks/use-projects", () => ({
  useProject: (id: string) => {
    capturedHookArgs["useProject"] = [id];
    return {
      data: {
        id: "resolved-uuid-123",
        user_id: "user-1",
        name: "My Project",
        slug: "my-project-slug",
        description: null,
        status: "planning",
        priority: "medium",
        area_id: null,
        start_date: null,
        due_date: null,
        progress: 0,
        is_archived: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      isLoading: false,
    };
  },
  useProjectWithRelations: (id: string) => {
    capturedHookArgs["useProjectWithRelations"] = [id];
    return { data: { goal_ids: [] } };
  },
  useProjects: () => ({ data: [] }),
  useUpdateProject: () => ({ mutateAsync: vi.fn() }),
  useDeleteProject: () => ({ mutateAsync: vi.fn() }),
  useLinkProjectToGoal: () => ({ mutateAsync: vi.fn() }),
  useUnlinkProjectFromGoal: () => ({ mutateAsync: vi.fn() }),
  useLinkProjectToArea: () => ({ mutateAsync: vi.fn(), mutate: vi.fn() }),
  useUnlinkProjectFromArea: () => ({ mutateAsync: vi.fn(), mutate: vi.fn() }),
  useArchiveProject: () => ({ mutateAsync: vi.fn() }),
  useRestoreProject: () => ({ mutateAsync: vi.fn() }),
}));

vi.mock("@/lib/hooks/use-goals", () => ({
  useGoals: () => ({ data: [], isLoading: false }),
  useRestoreGoal: () => ({ mutateAsync: vi.fn() }),
  useArchiveGoal: () => ({ mutateAsync: vi.fn() }),
  GOALS_QUERY_KEY: "goals",
}));

vi.mock("@/lib/hooks/use-areas", () => ({
  useAreas: () => ({ data: [] }),
}));

vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
  useQuery: () => ({ data: [], isLoading: false }),
}));

vi.mock("@/lib/hooks/use-tasks", () => ({
  useTasks: () => ({ data: [], isLoading: false }),
  useArchivedTasks: () => ({ data: [], isLoading: false }),
  useCompleteTask: () => ({ mutateAsync: vi.fn() }),
  useUncompleteTask: () => ({ mutateAsync: vi.fn() }),
  useFocusTask: () => ({ mutateAsync: vi.fn() }),
  useUpdateTask: () => ({ mutateAsync: vi.fn() }),
  useDeleteTask: () => ({ mutateAsync: vi.fn() }),
  useArchiveTask: () => ({ mutateAsync: vi.fn() }),
  useRestoreTask: () => ({ mutateAsync: vi.fn() }),
  usePermanentDeleteTask: () => ({ mutateAsync: vi.fn() }),
}));

vi.mock("@/lib/hooks/use-topics", () => ({
  useTopics: () => ({ data: [] }),
}));

vi.mock("@/lib/hooks/use-notes", () => ({
  useNotesByProject: (id: string) => {
    capturedHookArgs["useNotesByProject"] = [id];
    return { data: [], isLoading: false };
  },
  useNotes: () => ({ data: [], isLoading: false }),
  useToggleFavoriteNote: () => ({ mutate: vi.fn() }),
  useTogglePinNote: () => ({ mutate: vi.fn() }),
  useArchiveNote: () => ({ mutateAsync: vi.fn() }),
  useRestoreNote: () => ({ mutateAsync: vi.fn() }),
  useDeleteNote: () => ({ mutateAsync: vi.fn() }),
  useUpdateNote: () => ({ mutateAsync: vi.fn() }),
}));

vi.mock("@/lib/hooks/use-contacts", () => ({
  useContacts: () => ({ data: [] }),
  useContactByProject: (id: string) => {
    capturedHookArgs["useContactByProject"] = [id];
    return { data: [] };
  },
  useLinkContactToProject: () => ({ mutateAsync: vi.fn(), mutate: vi.fn() }),
  useUnlinkContactFromProject: () => ({ mutateAsync: vi.fn(), mutate: vi.fn() }),
  useLinkContactToArea: () => ({ mutateAsync: vi.fn(), mutate: vi.fn() }),
  useUnlinkContactFromArea: () => ({ mutateAsync: vi.fn(), mutate: vi.fn() }),
  useLinkContactToGoal: () => ({ mutateAsync: vi.fn(), mutate: vi.fn() }),
  useUnlinkContactFromGoal: () => ({ mutateAsync: vi.fn(), mutate: vi.fn() }),
  useLinkContactToTask: () => ({ mutateAsync: vi.fn(), mutate: vi.fn() }),
  useUnlinkContactFromTask: () => ({ mutateAsync: vi.fn(), mutate: vi.fn() }),
  useLogInteraction: () => ({ mutateAsync: vi.fn() }),
  useContactLogs: () => ({ data: [] }),
  useCreateContactLog: () => ({ mutateAsync: vi.fn() }),
  useCreateContact: () => ({ mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false }),
  useUpdateContact: () => ({ mutateAsync: vi.fn() }),
  useDeleteContact: () => ({ mutateAsync: vi.fn() }),
  useToggleContactFavorite: () => ({ mutateAsync: vi.fn() }),
  useArchiveContact: () => ({ mutateAsync: vi.fn() }),
}));

vi.mock("@/lib/hooks/use-resources", () => ({
  useResourcesByProject: (id: string) => {
    capturedHookArgs["useResourcesByProject"] = [id];
    return { data: [], isLoading: false };
  },
  useResources: () => ({ data: [], isLoading: false }),
  useCreateResource: () => ({ mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false }),
  useToggleFavoriteResource: () => ({ mutate: vi.fn() }),
  useUpdateResource: () => ({ mutate: vi.fn(), mutateAsync: vi.fn() }),
  useArchiveResource: () => ({ mutateAsync: vi.fn() }),
  useUnarchiveResource: () => ({ mutateAsync: vi.fn() }),
  useDeleteResource: () => ({ mutateAsync: vi.fn() }),
}));

vi.mock("@/components/entities/project-dialog", () => ({
  ProjectDialog: () => null,
}));

vi.mock("@/components/entities/contact-dialog", () => ({
  ContactDialog: () => null,
}));

vi.mock("@/components/entities/task-dialog", () => ({
  TaskDialog: () => null,
}));

vi.mock("@/components/entities/resource-dialog", () => ({
  ResourceDialog: () => null,
}));

vi.mock("@/components/entities/note-editor-dialog", () => ({
  NoteEditorDialog: () => null,
}));

vi.mock("@/components/entities/goal-dialog", () => ({
  GoalDialog: () => null,
}));

vi.mock("@/components/ui/skeleton", () => ({
  Skeleton: ({ className }: { className?: string }) => (
    <div className={className} data-slot="skeleton" />
  ),
}));

import { ProjectDetailContent as ProjectDetailPage } from "@/app/(dashboard)/projects/[id]/project-detail-content";

describe("ProjectDetailPage slug route UUID resolution", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(capturedHookArgs).forEach((k) => delete capturedHookArgs[k]);
  });

  it("calls useProject with the raw slug param", () => {
    renderToStaticMarkup(<ProjectDetailPage />);
    expect(capturedHookArgs["useProject"]).toEqual(["my-project-slug"]);
  });

  it("calls downstream relation hooks with the resolved UUID, not the slug", () => {
    renderToStaticMarkup(<ProjectDetailPage />);
    expect(capturedHookArgs["useProjectWithRelations"]).toEqual(["resolved-uuid-123"]);
    expect(capturedHookArgs["useNotesByProject"]).toEqual(["resolved-uuid-123"]);
    expect(capturedHookArgs["useContactByProject"]).toEqual(["resolved-uuid-123"]);
  });
});
