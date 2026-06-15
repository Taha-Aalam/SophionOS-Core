"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";

import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { AreaEmoji } from "@/components/layout/area-emoji";
import { ContactsEmoji } from "@/components/layout/contacts-emoji";
import { GoalEmoji } from "@/components/layout/goal-emoji";
import { NoteEmoji } from "@/components/layout/note-emoji";
import { ProjectEmoji } from "@/components/layout/project-emoji";
import { ResourceEmoji } from "@/components/layout/resource-emoji";
import { TagEmoji } from "@/components/layout/tag-emoji";
import { TaskEmoji } from "@/components/layout/task-emoji";
import { AreaDialog } from "@/components/entities/area-dialog";
import { GoalDialog } from "@/components/entities/goal-dialog";
import { ProjectDialog } from "@/components/entities/project-dialog";
import { TaskDialog } from "@/components/entities/task-dialog";
import { NoteEditorDialog } from "@/components/entities/note-editor-dialog";
import { ContactDialog } from "@/components/entities/contact-dialog";
import { ResourceDialog } from "@/components/entities/resource-dialog";
import { TopicDialog } from "@/components/entities/topic-dialog";
import { useAuth } from "@/components/providers/auth-provider";
import { useKeyboardShortcut } from "@/lib/hooks/use-keyboard";
import { useCreateArea, useAreas } from "@/lib/hooks/use-areas";
import { useCreateContact, useContacts } from "@/lib/hooks/use-contacts";
import { useGoals } from "@/lib/hooks/use-goals";
import { useNotes } from "@/lib/hooks/use-notes";
import { useProjects } from "@/lib/hooks/use-projects";
import { useCreateResource, useResources, useUpdateResource } from "@/lib/hooks/use-resources";
import { useTasks } from "@/lib/hooks/use-tasks";
import { useTopics } from "@/lib/hooks/use-topics";
import { useUIStore } from "@/lib/stores/ui.store";
import { coreNavItems, systemNavItems } from "@/components/layout/navigation";
import type { Resource, Task } from "@/lib/types/domain.types";
import { buildAreaDetailHref } from "@/lib/utils/area-urls";
import { buildContactCreateInput } from "@/lib/utils/contact-input";
import { buildGoalDetailHref } from "@/lib/utils/goal-urls";
import { buildProjectDetailHref } from "@/lib/utils/project-urls";

type CreateEntity = "area" | "goal" | "project" | "task" | "note" | "resource" | "contact" | "topic";

const CREATE_ACTIONS: Array<{ entity: CreateEntity; label: string }> = [
  { entity: "area", label: "Create area" },
  { entity: "goal", label: "Create goal" },
  { entity: "project", label: "Create project" },
  { entity: "task", label: "Create task" },
  { entity: "note", label: "Create note" },
  { entity: "resource", label: "Create resource" },
  { entity: "contact", label: "Create contact" },
  { entity: "topic", label: "Create topic" },
];

export function CommandPalette() {
  const router = useRouter();
  const { commandPaletteOpen, closeCommandPalette, toggleCommandPalette } = useUIStore();
  const [query, setQuery] = useState("");
  const [createEntity, setCreateEntity] = useState<CreateEntity | null>(null);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [editResource, setEditResource] = useState<Resource | null>(null);

  const { data: tasks = [] } = useTasks();
  const { data: goals = [] } = useGoals({ status: "all" });
  const { data: projects = [] } = useProjects({ status: "all" });
  const { data: notes = [] } = useNotes();
  const { data: resources = [] } = useResources({ status: "all" });
  const { data: contacts = [] } = useContacts();
  const { data: areas = [] } = useAreas({ archive: false });
  const { data: topics = [] } = useTopics();

  const { user } = useAuth();
  const createArea = useCreateArea(user?.id);
  const createResource = useCreateResource();
  const updateResource = useUpdateResource();
  const createContact = useCreateContact();

  // Cmd+K (macOS) / Ctrl+K (Windows/Linux) — skip when inside a rich-text editor
  useKeyboardShortcut(
    (e) => {
      if (!((e.metaKey || e.ctrlKey) && e.key === "k")) return false;
      const target = e.target as HTMLElement;
      return !target.closest("[contenteditable='true']");
    },
    toggleCommandPalette,
  );

  const close = useCallback(() => {
    setQuery("");
    closeCommandPalette();
  }, [closeCommandPalette]);

  const go = useCallback(
    (href: string) => {
      router.push(href);
      close();
    },
    [router, close],
  );

  const openCreate = useCallback(
    (entity: CreateEntity) => {
      setCreateEntity(entity);
      setQuery("");
      closeCommandPalette();
    },
    [closeCommandPalette],
  );

  const hasQuery = query.length > 0;
  const q = query.toLowerCase();

  // Client-side search (entities already in cache from their own pages)
  const filteredTasks = hasQuery
    ? tasks.filter((t) => !t.is_archived && t.name.toLowerCase().includes(q)).slice(0, 5)
    : [];
  const filteredGoals = hasQuery
    ? goals.filter((g) => !g.is_archived && g.name.toLowerCase().includes(q)).slice(0, 5)
    : [];
  const filteredProjects = hasQuery
    ? projects.filter((p) => !p.is_archived && p.name.toLowerCase().includes(q)).slice(0, 5)
    : [];
  const filteredNotes = hasQuery
    ? notes.filter((n) => !n.is_archived && n.name.toLowerCase().includes(q)).slice(0, 5)
    : [];
  const filteredResources = hasQuery
    ? resources.filter((r) => !r.is_archived && r.name.toLowerCase().includes(q)).slice(0, 5)
    : [];
  const filteredContacts = hasQuery
    ? contacts.filter((c) => !c.archive && c.name.toLowerCase().includes(q)).slice(0, 5)
    : [];
  const filteredAreas = hasQuery
    ? areas.filter((a) => !a.archive && a.name.toLowerCase().includes(q)).slice(0, 5)
    : [];
  const filteredTopics = hasQuery
    ? topics.filter((t) => !t.inactive && t.name.toLowerCase().includes(q)).slice(0, 5)
    : [];

  const filteredCore = coreNavItems.filter(
    (i) => !hasQuery || i.label.toLowerCase().includes(q),
  );
  const filteredSystem = systemNavItems.filter(
    (i) => !hasQuery || i.label.toLowerCase().includes(q),
  );

  const filteredCreateActions = hasQuery
    ? CREATE_ACTIONS.filter((c) => c.label.toLowerCase().includes(q))
    : CREATE_ACTIONS;

  const hasEntityResults =
    filteredTasks.length > 0 ||
    filteredAreas.length > 0 ||
    filteredGoals.length > 0 ||
    filteredProjects.length > 0 ||
    filteredNotes.length > 0 ||
    filteredResources.length > 0 ||
    filteredTopics.length > 0 ||
    filteredContacts.length > 0;

  const showEmptyState = hasQuery && !hasEntityResults && filteredCore.length === 0 && filteredSystem.length === 0 && filteredCreateActions.length === 0;

  return (
    <>
      <CommandDialog
        open={commandPaletteOpen}
        onOpenChange={(open) => {
          if (!open) close();
        }}
      >
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search or create…"
            value={query}
            onValueChange={setQuery}
            autoFocus
          />
          <CommandList>
            {filteredCore.length > 0 && (
              <CommandGroup heading="Core">
                {filteredCore.map((item) => {
                  const Icon = item.icon;
                  return (
                    <CommandItem
                      key={item.href}
                      value={`nav-${item.href}`}
                      onSelect={() => go(item.href)}
                    >
                      <Icon className="size-4 text-muted-foreground" />
                      {item.label}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            )}

            {filteredSystem.length > 0 && (
              <CommandGroup heading="System">
                {filteredSystem.map((item) => {
                  const Icon = item.icon;
                  return (
                    <CommandItem
                      key={item.href}
                      value={`nav-${item.href}`}
                      onSelect={() => go(item.href)}
                    >
                      <Icon className="size-4 text-muted-foreground" />
                      {item.label}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            )}

            {filteredCreateActions.length > 0 && (
              <CommandGroup heading="Create">
                {filteredCreateActions.map((c) => (
                  <CommandItem
                    key={c.entity}
                    value={`create-${c.entity}`}
                    onSelect={() => openCreate(c.entity)}
                  >
                    <Plus className="size-4 text-muted-foreground" />
                    {c.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {filteredTasks.length > 0 && (
              <CommandGroup heading="Tasks">
                {filteredTasks.map((task) => (
                  <CommandItem
                    key={task.id}
                    value={`task-${task.id}`}
                    onSelect={() => {
                      setEditTask(task);
                      setQuery("");
                      closeCommandPalette();
                    }}
                  >
                    <TaskEmoji className="size-4 text-muted-foreground" />
                    {task.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {filteredGoals.length > 0 && (
              <CommandGroup heading="Goals">
                {filteredGoals.map((goal) => (
                  <CommandItem
                    key={goal.id}
                    value={`goal-${goal.id}`}
                    onSelect={() => go(buildGoalDetailHref(goal))}
                  >
                    <GoalEmoji className="size-4 text-muted-foreground" />
                    {goal.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {filteredProjects.length > 0 && (
              <CommandGroup heading="Projects">
                {filteredProjects.map((project) => (
                  <CommandItem
                    key={project.id}
                    value={`project-${project.id}`}
                    onSelect={() => go(buildProjectDetailHref(project))}
                  >
                    <ProjectEmoji className="size-4 text-muted-foreground" />
                    {project.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {filteredAreas.length > 0 && (
              <CommandGroup heading="Areas">
                {filteredAreas.map((area) => (
                  <CommandItem
                    key={area.id}
                    value={`area-${area.id}`}
                    onSelect={() => go(buildAreaDetailHref(area))}
                  >
                    <AreaEmoji className="size-4 text-muted-foreground" />
                    {area.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {filteredNotes.length > 0 && (
              <CommandGroup heading="Notes">
                {filteredNotes.map((note) => (
                  <CommandItem
                    key={note.id}
                    value={`note-${note.id}`}
                    onSelect={() => go(`/notes/${note.id}`)}
                  >
                    <NoteEmoji className="size-4 text-muted-foreground" />
                    {note.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {filteredResources.length > 0 && (
              <CommandGroup heading="Resources">
                {filteredResources.map((resource) => (
                  <CommandItem
                    key={resource.id}
                    value={`resource-${resource.id}`}
                    onSelect={() => {
                      setEditResource(resource);
                      setQuery("");
                      closeCommandPalette();
                    }}
                  >
                    <ResourceEmoji className="size-4 text-muted-foreground" />
                    {resource.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {filteredTopics.length > 0 && (
              <CommandGroup heading="Topics">
                {filteredTopics.map((topic) => (
                  <CommandItem
                    key={topic.id}
                    value={`topic-${topic.id}`}
                    onSelect={() => go(`/topics/${topic.id}`)}
                  >
                    <TagEmoji className="size-4 text-muted-foreground" />
                    {topic.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {filteredContacts.length > 0 && (
              <CommandGroup heading="Contacts">
                {filteredContacts.map((contact) => (
                  <CommandItem
                    key={contact.id}
                    value={`contact-${contact.id}`}
                    onSelect={() => go(`/contacts/${contact.id}`)}
                  >
                    <ContactsEmoji className="size-4 text-muted-foreground" />
                    {contact.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {showEmptyState && <CommandEmpty>No results for &ldquo;{query}&rdquo;</CommandEmpty>}
          </CommandList>
        </Command>
      </CommandDialog>

      <AreaDialog
        open={createEntity === "area"}
        onOpenChange={(o) => {
          if (!o) setCreateEntity(null);
        }}
        onSubmit={async (data) => {
          await createArea.mutateAsync(data);
          setCreateEntity(null);
        }}
        isLoading={createArea.isPending}
      />

      <GoalDialog
        open={createEntity === "goal"}
        onOpenChange={(o) => {
          if (!o) setCreateEntity(null);
        }}
        onSuccess={() => setCreateEntity(null)}
      />

      <ProjectDialog
        open={createEntity === "project"}
        onOpenChange={(o) => {
          if (!o) setCreateEntity(null);
        }}
        onSuccess={() => setCreateEntity(null)}
      />

      <TaskDialog
        open={createEntity === "task" || !!editTask}
        onOpenChange={(o) => {
          if (!o) {
            setCreateEntity(null);
            setEditTask(null);
          }
        }}
        task={editTask}
        onSuccess={() => {
          setCreateEntity(null);
          setEditTask(null);
        }}
      />

      <NoteEditorDialog
        open={createEntity === "note"}
        onOpenChange={(o) => {
          if (!o) setCreateEntity(null);
        }}
        note={null}
        onSuccess={() => setCreateEntity(null)}
      />

      <ContactDialog
        open={createEntity === "contact"}
        onOpenChange={(o) => {
          if (!o) setCreateEntity(null);
        }}
        onSubmit={(values) => {
          createContact.mutate(buildContactCreateInput(values));
          setCreateEntity(null);
        }}
      />

      <ResourceDialog
        open={createEntity === "resource" || !!editResource}
        onOpenChange={(o) => {
          if (!o) {
            setCreateEntity(null);
            setEditResource(null);
          }
        }}
        resource={editResource}
        onSubmit={(input) => {
          if (editResource) {
            updateResource.mutate({ id: editResource.id, input });
          } else {
            createResource.mutate(input as Parameters<typeof createResource.mutate>[0]);
          }
          setCreateEntity(null);
          setEditResource(null);
        }}
        isPending={createResource.isPending || updateResource.isPending}
      />

      <TopicDialog
        open={createEntity === "topic"}
        onOpenChange={(o) => {
          if (!o) setCreateEntity(null);
        }}
        onSuccess={() => setCreateEntity(null)}
      />
    </>
  );
}
