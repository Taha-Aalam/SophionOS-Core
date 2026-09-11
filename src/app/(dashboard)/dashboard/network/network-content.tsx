"use client";

import { useMemo } from "react";

import { NetworkExplorer } from "@/components/dashboard/network/network-explorer";
import { Spinner } from "@/components/ui/spinner";
import { useAreas } from "@/lib/hooks/use-areas";
import { useContacts } from "@/lib/hooks/use-contacts";
import { useGoals } from "@/lib/hooks/use-goals";
import { useNotes } from "@/lib/hooks/use-notes";
import { useArchivedResources, useResources } from "@/lib/hooks/use-resources";
import { useArchivedTasks, useTasks } from "@/lib/hooks/use-tasks";
import { useArchivedTopics, useTopics } from "@/lib/hooks/use-topics";
import { useProjects } from "@/lib/hooks/use-projects";

function dedupeById<T extends { id: string }>(...lists: T[][]): T[] {
  const seen = new Set<string>();
  const merged: T[] = [];
  for (const list of lists) {
    for (const item of list) {
      if (seen.has(item.id)) continue;
      seen.add(item.id);
      merged.push(item);
    }
  }
  return merged;
}

export function NetworkContent() {
  const { data: areas = [], isLoading: areasLoading, isError: areasError } = useAreas();
  const {
    data: goalsAll = [],
    isLoading: goalsLoading,
    isError: goalsError,
  } = useGoals({ status: "all" });
  const {
    data: projectsAll = [],
    isLoading: projectsLoading,
    isError: projectsError,
  } = useProjects({ status: "all" });
  const { data: archivedProjects = [] } = useProjects({ status: "archived" });
  const { data: tasks = [], isLoading: tasksLoading, isError: tasksError } = useTasks();
  const { data: archivedTasks = [] } = useArchivedTasks();
  const {
    data: notes = [],
    isLoading: notesLoading,
    isError: notesError,
  } = useNotes({ includeArchived: true });
  const {
    data: resources = [],
    isLoading: resourcesLoading,
    isError: resourcesError,
  } = useResources({ status: "all" });
  const { data: archivedResources = [] } = useArchivedResources();
  const { data: topics = [] } = useTopics();
  const { data: archivedTopics = [] } = useArchivedTopics();
  const {
    data: contacts = [],
    isLoading: contactsLoading,
    isError: contactsError,
  } = useContacts({ archive: false });
  const { data: archivedContacts = [] } = useContacts({ archive: true });

  const allProjects = useMemo(
    () => dedupeById(projectsAll, archivedProjects),
    [projectsAll, archivedProjects],
  );
  const allTasks = useMemo(() => dedupeById(tasks, archivedTasks), [tasks, archivedTasks]);
  const allResources = useMemo(
    () => dedupeById(resources, archivedResources),
    [resources, archivedResources],
  );
  const allTopics = useMemo(() => dedupeById(topics, archivedTopics), [topics, archivedTopics]);
  const allContacts = useMemo(
    () => dedupeById(contacts, archivedContacts),
    [contacts, archivedContacts],
  );

  const isLoading =
    areasLoading ||
    goalsLoading ||
    projectsLoading ||
    tasksLoading ||
    notesLoading ||
    resourcesLoading ||
    contactsLoading;

  const isError =
    areasError ||
    goalsError ||
    projectsError ||
    tasksError ||
    notesError ||
    resourcesError ||
    contactsError;

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center px-4 py-16">
        <p className="text-muted-foreground">Failed to load network data.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div
        className="flex items-center justify-center gap-2 py-16 text-muted-foreground"
        role="status"
        aria-label="Loading network"
      >
        <Spinner />
        <span className="text-sm">Loading network…</span>
      </div>
    );
  }

  return (
    <NetworkExplorer
      areas={areas}
      goals={goalsAll}
      projects={allProjects}
      tasks={allTasks}
      notes={notes}
      resources={allResources}
      topics={allTopics}
      contacts={allContacts}
    />
  );
}
