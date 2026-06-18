"use client";

import { useMemo, useState } from "react";
import { Archive, Clock, FolderKanban, Map as MapIcon, Plus, Star, Target as GoalIcon, Users } from "lucide-react";

import { ContactCard } from "@/components/entities/contact-card";
import { ContactDialog, type ContactDialogDefaults } from "@/components/entities/contact-dialog";
import { ContactsByCategoryView } from "@/components/views/contacts-by-category-view";
import { ContactsFollowUpView } from "@/components/views/contacts-follow-up-view";
import { EmptyState } from "@/components/views/empty-state";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAreas } from "@/lib/hooks/use-areas";
import { useContacts, useContactsByArea, useContactsByGoal, useContactsByProject, useCreateContact, useDeleteContact, useToggleContactFavorite, useUpdateContact, useArchiveContact } from "@/lib/hooks/use-contacts";
import { useGoals } from "@/lib/hooks/use-goals";
import { useProjects } from "@/lib/hooks/use-projects";
import type { Contact } from "@/lib/types/domain.types";
import { buildContactCreateInput } from "@/lib/utils/contact-input";
import { contactService } from "@/lib/services/contact.service";
import {
  buildAreaSections,
  buildFollowUpSections,
  buildGoalSections,
  buildGroupSections,
  buildProjectSections,
} from "@/lib/utils/contact-category-sections";
import type { ContactCategorySection } from "@/lib/utils/contact-category-sections";

export function ContactsContent() {
  const [activeTab, setActiveTab] = useState<
    "all" | "favorite" | "follow-up" | "by-group" | "by-project" | "by-area" | "by-goal" | "archive"
  >("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [createDefaults, setCreateDefaults] = useState<ContactDialogDefaults | undefined>(undefined);

  const { data: allContacts = [], isLoading } = useContacts();
  const { data: archivedContacts = [], isLoading: isLoadingArchived } = useContacts({ archive: true });
  const { data: byProject = [], isLoading: isLoadingByProject } = useContactsByProject();
  const { data: byArea = [], isLoading: isLoadingByArea } = useContactsByArea();
  const { data: byGoal = [], isLoading: isLoadingByGoal } = useContactsByGoal();

  const { data: areas = [] } = useAreas();
  const { data: goals = [] } = useGoals({});
  const { data: projects = [] } = useProjects({});

  const createContact = useCreateContact();
  const updateContact = useUpdateContact();
  const deleteContact = useDeleteContact();
  const toggleFavorite = useToggleContactFavorite();
  const archiveContact = useArchiveContact();

  const favContacts = useMemo(
    () => allContacts.filter((c) => c.favorite),
    [allContacts],
  );

  const groupedContacts = useMemo(() => contactService.getByGroupSync(allContacts), [allContacts]);

  const followUpSections = useMemo(
    () => buildFollowUpSections(allContacts),
    [allContacts],
  );

  const groupSections = useMemo(() => buildGroupSections(groupedContacts), [groupedContacts]);
  const projectSections = useMemo(() => buildProjectSections(projects, byProject), [projects, byProject]);
  const areaSections = useMemo(() => buildAreaSections(areas, byArea), [areas, byArea]);
  const goalSections = useMemo(() => buildGoalSections(goals, byGoal), [goals, byGoal]);

  const handleSubmit = (values: {
    name: string;
    role: string;
    organization: string;
    group: string;
    phone: string;
    email: string;
    linkedin: string;
    website: string;
    image_url: string;
    follow_up_interval_days: string;
    notes: string;
    area_ids: string[];
    goal_ids: string[];
    project_ids: string[];
    task_ids: string[];
  }) => {
    const input = buildContactCreateInput(values);
    if (editingContact) {
      updateContact.mutate({ id: editingContact.id, input });
    } else {
      createContact.mutate(input);
    }
    setEditingContact(null);
  };

  const handleEdit = (contact: Contact) => {
    setEditingContact(contact);
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    deleteContact.mutate(id);
  };

  const handleToggleFavorite = (id: string) => {
    toggleFavorite.mutate(id);
  };

  const handleArchive = (id: string, archive: boolean) => {
    archiveContact.mutate({ id, archive });
  };

  const handleCreateInSection = (section: ContactCategorySection) => {
    const defaults: ContactDialogDefaults = {};
    const category = section.id.split(":")[0];
    const entityId = section.id.split(":")[1];

    if (category === "group") {
      defaults.group = entityId;
    } else if (category === "project") {
      defaults.project_ids = [entityId];
    } else if (category === "area") {
      defaults.area_ids = [entityId];
    } else if (category === "goal") {
      defaults.goal_ids = [entityId];
    }

    setCreateDefaults(defaults);
    setEditingContact(null);
    setIsDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto w-full">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="reveal-stagger flex flex-col gap-6 p-6 max-w-7xl mx-auto w-full">
      <div className="flex items-start justify-between border-b border-border/50 py-5">
        <div className="flex items-center gap-3">
          <span className="text-2xl leading-none" aria-hidden="true">👥</span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Contacts</h1>
            <p className="text-sm text-muted-foreground">
              {allContacts.length === 0
                ? "No contacts yet — add your first one to start tracking relationships"
                : `${allContacts.length} contact${allContacts.length !== 1 ? "s" : ""} in your network`}
            </p>
          </div>
        </div>
        <Button
          onClick={() => {
            setEditingContact(null);
            setIsDialogOpen(true);
          }}
        >
          <Plus className="mr-2 size-4" />
          Add Contact
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
        <TabsList className="flex h-auto w-full flex-nowrap gap-0 overflow-x-auto bg-transparent p-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <TabsTrigger value="all" className="rounded-none border-b-2 border-transparent px-3 py-2 text-sm leading-none data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none">
            All
          </TabsTrigger>
          <TabsTrigger value="favorite" className="rounded-none border-b-2 border-transparent px-3 py-2 text-sm leading-none data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none">
            <Star className="mr-1.5 size-3.5" />
            Favorite
          </TabsTrigger>
          <TabsTrigger value="follow-up" className="rounded-none border-b-2 border-transparent px-3 py-2 text-sm leading-none data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none">
            <Clock className="mr-1.5 size-3.5" />
            Follow-up
          </TabsTrigger>
          <TabsTrigger value="by-group" className="rounded-none border-b-2 border-transparent px-3 py-2 text-sm leading-none data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none">
            <Users className="mr-1.5 size-3.5" />
            By Group
          </TabsTrigger>
          <TabsTrigger value="by-project" className="rounded-none border-b-2 border-transparent px-3 py-2 text-sm leading-none data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none">
            <FolderKanban className="mr-1.5 size-3.5" />
            By Project
          </TabsTrigger>
          <TabsTrigger value="by-area" className="rounded-none border-b-2 border-transparent px-3 py-2 text-sm leading-none data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none">
            <MapIcon className="mr-1.5 size-3.5" />
            By Area
          </TabsTrigger>
          <TabsTrigger value="by-goal" className="rounded-none border-b-2 border-transparent px-3 py-2 text-sm leading-none data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none">
            <GoalIcon className="mr-1.5 size-3.5" />
            By Goal
          </TabsTrigger>
          <TabsTrigger value="archive" className="rounded-none border-b-2 border-transparent px-3 py-2 text-sm leading-none data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none">
            <Archive className="mr-1.5 size-3.5" />
            Archive
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-4">
          {allContacts.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No contacts yet"
              description="Add your first professional contact to start tracking relationships."
              actionLabel="Add Contact"
              onAction={() => {
                setEditingContact(null);
                setIsDialogOpen(true);
              }}
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {allContacts.map((contact) => (
                <ContactCard
                  key={contact.id}
                  contact={contact}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onToggleFavorite={handleToggleFavorite}
                  onArchive={handleArchive}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="favorite" className="mt-4">
          {favContacts.length === 0 ? (
            <EmptyState
              icon={Star}
              title="No favorites"
              description="Star contacts to see them here."
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {favContacts.map((contact) => (
                <ContactCard
                  key={contact.id}
                  contact={contact}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onToggleFavorite={handleToggleFavorite}
                  onArchive={handleArchive}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="follow-up" className="mt-4">
          {followUpSections.length === 0 ? (
            <EmptyState
              icon={Clock}
              title="All caught up"
              description="No contacts need follow-up right now."
            />
          ) : (
            <ContactsFollowUpView
              sections={followUpSections}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onToggleFavorite={handleToggleFavorite}
              onArchive={handleArchive}
            />
          )}
        </TabsContent>

        <TabsContent value="by-group" className="mt-4">
          <ContactsByCategoryView
            sections={groupSections}
            onCreateInSection={handleCreateInSection}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onToggleFavorite={handleToggleFavorite}
            onArchive={handleArchive}
          />
        </TabsContent>

        <TabsContent value="by-project" className="mt-4">
          {isLoadingByProject ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-40 w-full" />
              ))}
            </div>
          ) : (
            <ContactsByCategoryView
              sections={projectSections}
              onCreateInSection={handleCreateInSection}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onToggleFavorite={handleToggleFavorite}
              onArchive={handleArchive}
            />
          )}
        </TabsContent>

        <TabsContent value="by-area" className="mt-4">
          {isLoadingByArea ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-40 w-full" />)}
            </div>
          ) : (
            <ContactsByCategoryView
              sections={areaSections}
              onCreateInSection={handleCreateInSection}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onToggleFavorite={handleToggleFavorite}
              onArchive={handleArchive}
            />
          )}
        </TabsContent>

        <TabsContent value="by-goal" className="mt-4">
          {isLoadingByGoal ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-40 w-full" />)}
            </div>
          ) : (
            <ContactsByCategoryView
              sections={goalSections}
              onCreateInSection={handleCreateInSection}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onToggleFavorite={handleToggleFavorite}
              onArchive={handleArchive}
            />
          )}
        </TabsContent>

        <TabsContent value="archive" className="mt-4">
          {isLoadingArchived ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-40 w-full" />)}
            </div>
          ) : archivedContacts.length === 0 ? (
            <EmptyState
              icon={Archive}
              title="No archived contacts"
              description="Archived contacts will appear here."
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {archivedContacts.map((contact) => (
                <ContactCard
                  key={contact.id}
                  contact={contact}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onToggleFavorite={handleToggleFavorite}
                  onArchive={handleArchive}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <ContactDialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) {
            setEditingContact(null);
            setCreateDefaults(undefined);
          }
        }}
        contact={editingContact}
        defaults={createDefaults}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
