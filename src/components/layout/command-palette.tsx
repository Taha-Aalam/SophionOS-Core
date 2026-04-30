"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckSquare,
  FolderKanban,
  Globe,
  LayoutDashboard,
  Map,
  NotebookPen,
  Plus,
  Settings,
  Target,
  Users,
} from "lucide-react";

import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { useKeyboardShortcut } from "@/lib/hooks/use-keyboard";
import { useContacts } from "@/lib/hooks/use-contacts";
import { useGoals } from "@/lib/hooks/use-goals";
import { buildGoalDetailHref } from "@/lib/utils/goal-urls";
import { buildProjectDetailHref } from "@/lib/utils/project-urls";
import { useCreateNote, useNotes } from "@/lib/hooks/use-notes";
import { useCreateResource, useResources } from "@/lib/hooks/use-resources";
import { useProjects } from "@/lib/hooks/use-projects";
import { useCreateTask, useTasks } from "@/lib/hooks/use-tasks";
import { useUIStore } from "@/lib/stores/ui.store";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Areas", href: "/areas", icon: Map },
  { label: "Projects", href: "/projects", icon: FolderKanban },
  { label: "Tasks", href: "/tasks", icon: CheckSquare },
  { label: "Goals", href: "/goals", icon: Target },
  { label: "Notes", href: "/notes", icon: NotebookPen },
  { label: "Settings", href: "/settings", icon: Settings },
] as const;

const CREATE_TASK_RE = /^create\s+task:\s*(.+)/i;
const CREATE_NOTE_RE = /^create\s+note:\s*(.+)/i;
const CREATE_RESOURCE_RE = /^create\s+resource:\s*(.+)/i;

export function CommandPalette() {
  const router = useRouter();
  const { commandPaletteOpen, closeCommandPalette, toggleCommandPalette } = useUIStore();
  const [query, setQuery] = useState("");

  const { data: tasks = [] } = useTasks();
  const { data: goals = [] } = useGoals({ status: "all" });
  const { data: projects = [] } = useProjects({ status: "all" });
  const { data: notes = [] } = useNotes();
  const { data: resources = [] } = useResources({ status: "all" });
  const { data: contacts = [] } = useContacts();

  const createTask = useCreateTask();
  const createNote = useCreateNote();
  const createResource = useCreateResource();

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

  // Parse explicit create-mode patterns
  const taskMatch = CREATE_TASK_RE.exec(query);
  const noteMatch = CREATE_NOTE_RE.exec(query);
  const resourceMatch = CREATE_RESOURCE_RE.exec(query);
  const explicitTaskName = taskMatch?.[1]?.trim() ?? null;
  const explicitNoteName = noteMatch?.[1]?.trim() ?? null;
  const explicitResourceUrl = resourceMatch?.[1]?.trim() ?? null;
  const isExplicitCreate = explicitTaskName !== null || explicitNoteName !== null || explicitResourceUrl !== null;

  const hasQuery = query.length > 0;
  const q = query.toLowerCase();

  // Client-side search (entities already in cache from their own pages)
  const filteredTasks = hasQuery && !isExplicitCreate
    ? tasks.filter((t) => !t.is_archived && t.name.toLowerCase().includes(q)).slice(0, 5)
    : [];
  const filteredGoals = hasQuery && !isExplicitCreate
    ? goals.filter((g) => !g.is_archived && g.name.toLowerCase().includes(q)).slice(0, 5)
    : [];
  const filteredProjects = hasQuery && !isExplicitCreate
    ? projects.filter((p) => !p.is_archived && p.name.toLowerCase().includes(q)).slice(0, 5)
    : [];
  const filteredNotes = hasQuery && !isExplicitCreate
    ? notes.filter((n) => !n.is_archived && n.name.toLowerCase().includes(q)).slice(0, 5)
    : [];
  const filteredResources = hasQuery && !isExplicitCreate
    ? resources.filter((r) => !r.is_archived && r.name.toLowerCase().includes(q)).slice(0, 5)
    : [];
  const filteredContacts = hasQuery && !isExplicitCreate
    ? contacts.filter((c) => !c.archive && c.name.toLowerCase().includes(q)).slice(0, 5)
    : [];
  const filteredNav = NAV_ITEMS.filter(
    (item) => !hasQuery || item.label.toLowerCase().includes(q),
  );

  const hasEntityResults =
    filteredTasks.length > 0 ||
    filteredGoals.length > 0 ||
    filteredProjects.length > 0 ||
    filteredNotes.length > 0 ||
    filteredResources.length > 0 ||
    filteredContacts.length > 0;

  const handleCreateTask = useCallback(
    async (name: string) => {
      if (!name) return;
      try {
        await createTask.mutateAsync({ name });
        close();
      } catch {
        // toast handled inside the mutation
      }
    },
    [createTask, close],
  );

  const handleCreateNote = useCallback(
    async (name: string) => {
      if (!name) return;
      try {
        const note = await createNote.mutateAsync({ name });
        router.push(`/notes/${note.id}`);
        close();
      } catch {
        // toast handled inside the mutation
      }
    },
    [createNote, router, close],
  );

  const handleCreateResource = useCallback(
    async (url: string) => {
      if (!url) return;
      try {
        // Try to extract a name from the URL
        let name = url;
        try {
          const u = new URL(url);
          name = u.hostname.replace(/^www\./, "");
        } catch {
          // use the URL as name
        }
        await createResource.mutateAsync({ name, url });
        close();
      } catch {
        // toast handled inside the mutation
      }
    },
    [createResource, close],
  );

  return (
    <CommandDialog
      open={commandPaletteOpen}
      onOpenChange={(open) => {
        if (!open) close();
      }}
    >
      <Command shouldFilter={false}>
        <CommandInput
          placeholder="Search or type 'Create task: …' / 'Create note: …'"
          value={query}
          onValueChange={setQuery}
          autoFocus
        />
        <CommandList>
          {/* ── Explicit create mode ── */}
          {isExplicitCreate && (
            <CommandGroup heading="Create">
              {explicitTaskName && (
                <CommandItem
                  value="explicit-create-task"
                  disabled={createTask.isPending}
                  onSelect={() => handleCreateTask(explicitTaskName)}
                >
                  <Plus className="size-4 text-muted-foreground" />
                  <span>
                    Create task:{" "}
                    <span className="font-medium">{explicitTaskName}</span>
                  </span>
                </CommandItem>
              )}
              {explicitNoteName && (
                <CommandItem
                  value="explicit-create-note"
                  disabled={createNote.isPending}
                  onSelect={() => handleCreateNote(explicitNoteName)}
                >
                  <Plus className="size-4 text-muted-foreground" />
                  <span>
                    Create note:{" "}
                    <span className="font-medium">{explicitNoteName}</span>
                  </span>
                </CommandItem>
              )}
              {explicitResourceUrl && (
                <CommandItem
                  value="explicit-create-resource"
                  disabled={createResource.isPending}
                  onSelect={() => handleCreateResource(explicitResourceUrl)}
                >
                  <Globe className="size-4 text-muted-foreground" />
                  <span>
                    Create resource:{" "}
                    <span className="font-medium">{explicitResourceUrl}</span>
                  </span>
                </CommandItem>
              )}
            </CommandGroup>
          )}

          {/* ── Normal mode ── */}
          {!isExplicitCreate && (
            <>
              {/* Navigation */}
              {filteredNav.length > 0 && (
                <CommandGroup heading="Navigation">
                  {filteredNav.map((item) => {
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

              {/* Create actions */}
              {!hasQuery ? (
                <>
                  <CommandSeparator />
                  <CommandGroup heading="Create">
                    <CommandItem
                      value="hint-create-task"
                      onSelect={() => setQuery("Create task: ")}
                    >
                      <Plus className="size-4 text-muted-foreground" />
                      Create task…
                    </CommandItem>
                    <CommandItem
                      value="hint-create-note"
                      onSelect={() => setQuery("Create note: ")}
                    >
                      <Plus className="size-4 text-muted-foreground" />
                      Create note…
                    </CommandItem>
                  </CommandGroup>
                </>
              ) : (
                <>
                  <CommandSeparator />
                  <CommandGroup heading="Create">
                    <CommandItem
                      value="quick-create-task"
                      disabled={createTask.isPending}
                      onSelect={() => handleCreateTask(query.trim())}
                    >
                      <Plus className="size-4 text-muted-foreground" />
                      <span>
                        Create task:{" "}
                        <span className="font-medium">{query.trim()}</span>
                      </span>
                    </CommandItem>
                    <CommandItem
                      value="quick-create-note"
                      disabled={createNote.isPending}
                      onSelect={() => handleCreateNote(query.trim())}
                    >
                      <Plus className="size-4 text-muted-foreground" />
                      <span>
                        Create note:{" "}
                        <span className="font-medium">{query.trim()}</span>
                      </span>
                    </CommandItem>
                  </CommandGroup>
                </>
              )}

              {/* Entity results (only when searching) */}
              {filteredTasks.length > 0 && (
                <>
                  <CommandSeparator />
                  <CommandGroup heading="Tasks">
                    {filteredTasks.map((task) => (
                      <CommandItem
                        key={task.id}
                        value={`task-${task.id}`}
                        onSelect={() => go("/tasks")}
                      >
                        <CheckSquare className="size-4 text-muted-foreground" />
                        {task.name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </>
              )}

              {filteredGoals.length > 0 && (
                <>
                  <CommandSeparator />
                  <CommandGroup heading="Goals">
                    {filteredGoals.map((goal) => (
                      <CommandItem
                        key={goal.id}
                        value={`goal-${goal.id}`}
                        onSelect={() => go(buildGoalDetailHref(goal))}
                      >
                        <Target className="size-4 text-muted-foreground" />
                        {goal.name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </>
              )}

              {filteredProjects.length > 0 && (
                <>
                  <CommandSeparator />
                  <CommandGroup heading="Projects">
                    {filteredProjects.map((project) => (
                      <CommandItem
                        key={project.id}
                        value={`project-${project.id}`}
                        onSelect={() => go(buildProjectDetailHref(project))}
                      >
                        <FolderKanban className="size-4 text-muted-foreground" />
                        {project.name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </>
              )}

              {filteredNotes.length > 0 && (
                <>
                  <CommandSeparator />
                  <CommandGroup heading="Notes">
                    {filteredNotes.map((note) => (
                      <CommandItem
                        key={note.id}
                        value={`note-${note.id}`}
                        onSelect={() => go(`/notes/${note.id}`)}
                      >
                        <NotebookPen className="size-4 text-muted-foreground" />
                        {note.name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </>
              )}

              {filteredResources.length > 0 && (
                <>
                  <CommandSeparator />
                  <CommandGroup heading="Resources">
                    {filteredResources.map((resource) => (
                      <CommandItem
                        key={resource.id}
                        value={`resource-${resource.id}`}
                        onSelect={() => go("/resources")}
                      >
                        <Globe className="size-4 text-muted-foreground" />
                        {resource.name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </>
              )}

              {filteredContacts.length > 0 && (
                <>
                  <CommandSeparator />
                  <CommandGroup heading="Contacts">
                    {filteredContacts.map((contact) => (
                      <CommandItem
                        key={contact.id}
                        value={`contact-${contact.id}`}
                        onSelect={() => go("/contacts")}
                      >
                        <Users className="size-4 text-muted-foreground" />
                        {contact.name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </>
              )}

              {/* Empty state: query present but no matches anywhere */}
              {hasQuery &&
                filteredNav.length === 0 &&
                !hasEntityResults && (
                  <CommandEmpty>
                    No results for &ldquo;{query}&rdquo;
                  </CommandEmpty>
                )}
            </>
          )}
        </CommandList>
      </Command>
    </CommandDialog>
  );
}
