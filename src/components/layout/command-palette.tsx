"use client";

import { useCallback, useState } from "react";
import type { ComponentType } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  MapPinIcon,
  SquarePenIcon,
  UsersIcon,
} from "@/components/icons";

import { ENTITY_ICONS } from "@/lib/constants/entity-icons";
import { AreaDialog } from "@/components/entities/area-dialog";
import { GoalDialog } from "@/components/entities/goal-dialog";
import { ProjectDialog } from "@/components/entities/project-dialog";
import { TaskDialog } from "@/components/entities/task-dialog";
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
import { useI18n } from "@/components/providers/i18n-provider";
import { coreNavItems, systemNavItems } from "@/components/layout/navigation";
import type { TranslationKey } from "@/lib/i18n/dictionary";
import { navSearchKeywords } from "@/lib/i18n/nav-search-keywords";
import type { Resource, Task } from "@/lib/types/domain.types";
import { buildAreaDetailHref } from "@/lib/utils/area-urls";
import { buildContactCreateInput } from "@/lib/utils/contact-input";
import { buildGoalDetailHref } from "@/lib/utils/goal-urls";
import { buildProjectDetailHref } from "@/lib/utils/project-urls";
import {
  getRawReturnToChain,
  getReturnToFromSearchParams,
  isValidReturnTo,
  setReturnToParams,
} from "@/lib/utils/return-to";

type CreateEntity = "area" | "goal" | "project" | "task" | "note" | "resource" | "contact" | "topic";

const CREATE_ACTIONS: Array<{
  entity: CreateEntity;
  labelKey: TranslationKey;
  Icon: ComponentType<{ className?: string; size?: number }>;
}> = [
  { entity: "area", labelKey: "action.createArea", Icon: MapPinIcon },
  { entity: "goal", labelKey: "action.createGoal", Icon: ENTITY_ICONS.goal },
  { entity: "project", labelKey: "action.createProject", Icon: ENTITY_ICONS.project },
  { entity: "task", labelKey: "action.createTask", Icon: ENTITY_ICONS.task },
  { entity: "note", labelKey: "action.createNote", Icon: SquarePenIcon },
  { entity: "resource", labelKey: "action.createResource", Icon: ENTITY_ICONS.resource },
  { entity: "contact", labelKey: "action.createContact", Icon: UsersIcon },
  { entity: "topic", labelKey: "action.createTopic", Icon: ENTITY_ICONS.topic },
];

/** Case/width-insensitive match: IME output and full-width Latin both match. */
function normalizeSearch(value: string): string {
  return value.normalize("NFKC").toLocaleLowerCase();
}

export function CommandPalette() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { commandPaletteOpen, closeCommandPalette, toggleCommandPalette } = useUIStore();
  const { t } = useI18n();
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

  const withReturnTo = useCallback(
    (base: string): string => {
      if (!isValidReturnTo(pathname)) return base;
      const incomingReturnTo = getReturnToFromSearchParams(searchParams);
      const incomingChain = getRawReturnToChain(searchParams);
      const destChain = incomingReturnTo
        ? [incomingReturnTo, ...incomingChain]
        : incomingChain;
      const params = new URLSearchParams();
      setReturnToParams(params, pathname, destChain);
      return `${base}?${params.toString()}`;
    },
    [pathname, searchParams],
  );

  const go = useCallback(
    (href: string) => {
      router.push(href);
      close();
    },
    [router, close],
  );

  const openCreate = useCallback(
    (entity: CreateEntity) => {
      if (entity === "note") {
        go(withReturnTo("/notes/new"));
        return;
      }
      setCreateEntity(entity);
      setQuery("");
      closeCommandPalette();
    },
    [go, withReturnTo, closeCommandPalette],
  );

  const hasQuery = query.length > 0;
  const q = normalizeSearch(query);

  // A nav item matches its active-locale label, or any of its keywords: the
  // label in every stored Tier-1 locale plus Japanese romaji readings. This is
  // what lets a Japanese word (or an in-progress romaji composition) find a
  // page whose visible label is English.
  const navMatches = (labelKey: TranslationKey, label: string): boolean =>
    !hasQuery ||
    [label, ...navSearchKeywords(labelKey)].some((source) =>
      normalizeSearch(source).includes(q),
    );

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

  const filteredCore = coreNavItems.filter((i) => navMatches(i.labelKey, t(i.labelKey)));
  const filteredSystem = systemNavItems.filter((i) =>
    navMatches(i.labelKey, t(i.labelKey)),
  );

  const filteredCreateActions = CREATE_ACTIONS.filter(
    (c) => !hasQuery || normalizeSearch(t(c.labelKey)).includes(q),
  );

  const hasEntityResults =
    filteredTasks.length > 0 ||
    filteredAreas.length > 0 ||
    filteredGoals.length > 0 ||
    filteredProjects.length > 0 ||
    filteredNotes.length > 0 ||
    filteredResources.length > 0 ||
    filteredTopics.length > 0 ||
    filteredContacts.length > 0;

  const showEmptyState =
    hasQuery &&
    !hasEntityResults &&
    filteredCore.length === 0 &&
    filteredSystem.length === 0 &&
    filteredCreateActions.length === 0;

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
            placeholder={t("chrome.searchOrCreate")}
            value={query}
            onValueChange={setQuery}
            autoFocus
          />
          <CommandList>
            {filteredCore.length > 0 && (
              <CommandGroup heading={t("chrome.core")}>
                {filteredCore.map((item) => {
                  const Icon = item.icon;
                  return (
                    <CommandItem
                      key={item.href}
                      value={`nav-${item.href}`}
                      onSelect={() => go(item.href)}
                    >
                      <Icon size={16} />
                      {t(item.labelKey)}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            )}

            {filteredSystem.length > 0 && (
              <CommandGroup heading={t("chrome.system")}>
                {filteredSystem.map((item) => {
                  const Icon = item.icon;
                  return (
                    <CommandItem
                      key={item.href}
                      value={`nav-${item.href}`}
                      onSelect={() => go(item.href)}
                    >
                      <Icon size={16} />
                      {t(item.labelKey)}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            )}

            {filteredCreateActions.length > 0 && (
              <CommandGroup heading={t("chrome.create")}>
                {filteredCreateActions.map((c) => {
                  const Icon = c.Icon;
                  return (
                    <CommandItem
                      key={c.entity}
                      value={`create-${c.entity}`}
                      onSelect={() => openCreate(c.entity)}
                    >
                      <Icon size={16} />
                      {t(c.labelKey)}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            )}

            {filteredTasks.length > 0 && (
              <CommandGroup heading={t("nav.tasks")}>
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
                    <ENTITY_ICONS.task size={16} />
                    {task.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {filteredGoals.length > 0 && (
              <CommandGroup heading={t("nav.goals")}>
                {filteredGoals.map((goal) => (
                  <CommandItem
                    key={goal.id}
                    value={`goal-${goal.id}`}
                    onSelect={() => go(withReturnTo(buildGoalDetailHref(goal)))}
                  >
                    <ENTITY_ICONS.goal size={16} />
                    {goal.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {filteredProjects.length > 0 && (
              <CommandGroup heading={t("nav.projects")}>
                {filteredProjects.map((project) => (
                  <CommandItem
                    key={project.id}
                    value={`project-${project.id}`}
                    onSelect={() => go(withReturnTo(buildProjectDetailHref(project)))}
                  >
                    <ENTITY_ICONS.project size={16} />
                    {project.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {filteredAreas.length > 0 && (
              <CommandGroup heading={t("nav.areas")}>
                {filteredAreas.map((area) => (
                  <CommandItem
                    key={area.id}
                    value={`area-${area.id}`}
                    onSelect={() => go(withReturnTo(buildAreaDetailHref(area)))}
                  >
                    {area.icon ? (
                      <span
                        role="img"
                        aria-hidden="true"
                        className="inline-flex size-4 items-center justify-center leading-none"
                      >
                        {area.icon}
                      </span>
                    ) : (
                      <MapPinIcon size={16} />
                    )}
                    {area.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {filteredNotes.length > 0 && (
              <CommandGroup heading={t("nav.notes")}>
                {filteredNotes.map((note) => (
                  <CommandItem
                    key={note.id}
                    value={`note-${note.id}`}
                    onSelect={() => go(withReturnTo(`/notes/${note.slug ?? note.id}`))}
                  >
                    <SquarePenIcon size={16} />
                    {note.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {filteredResources.length > 0 && (
              <CommandGroup heading={t("nav.resources")}>
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
                    <ENTITY_ICONS.resource size={16} />
                    {resource.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {filteredTopics.length > 0 && (
              <CommandGroup heading={t("nav.topics")}>
                {filteredTopics.map((topic) => (
                  <CommandItem
                    key={topic.id}
                    value={`topic-${topic.id}`}
                    onSelect={() => go(withReturnTo(`/topics/${topic.slug ?? topic.id}`))}
                  >
                    <ENTITY_ICONS.topic size={16} />
                    {topic.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {filteredContacts.length > 0 && (
              <CommandGroup heading={t("nav.contacts")}>
                {filteredContacts.map((contact) => (
                  <CommandItem
                    key={contact.id}
                    value={`contact-${contact.id}`}
                    onSelect={() => go(withReturnTo(`/contacts/${contact.slug ?? contact.id}`))}
                  >
                    <UsersIcon size={16} />
                    {contact.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {showEmptyState && (
              <CommandEmpty>{t("chrome.noResults", { query })}</CommandEmpty>
            )}
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
