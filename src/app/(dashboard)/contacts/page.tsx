"use client";

import { useMemo, useState } from "react";
import { Building2, Plus, Star, Target, Users } from "lucide-react";

import { ContactDialog } from "@/components/entities/contact-dialog";
import { ContactListItem } from "@/components/entities/contact-list-item";
import { EmptyState } from "@/components/views/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useContacts, useContactsByProject, useCreateContact, useDeleteContact, useLogInteraction, useToggleContactFavorite, useUpdateContact } from "@/lib/hooks/use-contacts";
import type { Contact, CreateContactInput } from "@/lib/types/domain.types";
import { contactService } from "@/lib/services/contact.service";

function buildCreateInput(values: {
  name: string;
  role: string;
  organization: string;
  group: string;
  phone: string;
  email: string;
  linkedin: string;
  website: string;
  follow_up_interval_days: string;
  notes: string;
}): CreateContactInput {
  return {
    name: values.name,
    role: values.role || null,
    organization: values.organization || null,
    group: values.group || null,
    phone: values.phone || null,
    email: values.email || null,
    linkedin: values.linkedin || null,
    website: values.website || null,
    follow_up_interval_days: values.follow_up_interval_days === "none"
      ? null
      : values.follow_up_interval_days
        ? parseInt(values.follow_up_interval_days, 10)
        : 14,
    notes: values.notes || null,
  };
}

export default function ContactsPage() {
  const [activeTab, setActiveTab] = useState<"all" | "fav" | "by-group" | "by-project" | "follow-up">("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);

  const { data: allContacts = [], isLoading } = useContacts();
  const { data: byProject = [], isLoading: isLoadingByProject } = useContactsByProject();

  const createContact = useCreateContact();
  const updateContact = useUpdateContact();
  const deleteContact = useDeleteContact();
  const logInteraction = useLogInteraction();
  const toggleFavorite = useToggleContactFavorite();

  const favContacts = useMemo(
    () => allContacts.filter((c) => c.favorite),
    [allContacts],
  );

  const groupedContacts = useMemo(() => contactService.getByGroupSync(allContacts), [allContacts]);

  const followUpContacts = useMemo(
    () => allContacts.filter(
      (c) => contactService.computeFollowUpStatus(c.last_interaction_at, c.follow_up_interval_days) === "FOLLOW UP",
    ),
    [allContacts],
  );

  const handleSubmit = (values: {
    name: string;
    role: string;
    organization: string;
    group: string;
    phone: string;
    email: string;
    linkedin: string;
    website: string;
    follow_up_interval_days: string;
    notes: string;
  }) => {
    const input = buildCreateInput(values);
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

  const handleLogInteraction = (id: string) => {
    logInteraction.mutate(id);
  };

  const handleToggleFavorite = (id: string) => {
    toggleFavorite.mutate(id);
  };

  if (isLoading) {
    return (
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="size-5 text-muted-foreground" />
          <h1 className="text-3xl font-bold tracking-tight">Contacts</h1>
          <Badge variant="secondary">{allContacts.length}</Badge>
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
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="fav">Fav.</TabsTrigger>
          <TabsTrigger value="by-group">By Group</TabsTrigger>
          <TabsTrigger value="by-project">By Project</TabsTrigger>
          <TabsTrigger value="follow-up">Follow-up</TabsTrigger>
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
            <div className="space-y-2">
              {allContacts.map((contact) => (
                <ContactListItem
                  key={contact.id}
                  contact={contact}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onLogInteraction={handleLogInteraction}
                  onToggleFavorite={handleToggleFavorite}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="fav" className="mt-4">
          {favContacts.length === 0 ? (
            <EmptyState
              icon={Star}
              title="No favorites"
              description="Star contacts to see them here."
            />
          ) : (
            <div className="space-y-2">
              {favContacts.map((contact) => (
                <ContactListItem
                  key={contact.id}
                  contact={contact}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onLogInteraction={handleLogInteraction}
                  onToggleFavorite={handleToggleFavorite}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="by-group" className="mt-4">
          {Object.keys(groupedContacts).length === 0 ? (
            <EmptyState
              icon={Building2}
              title="No grouped contacts"
              description="Assign groups to your contacts to see them organized here."
            />
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedContacts).map(([group, contacts]) => (
                <div key={group}>
                  <div className="mb-2 flex items-center gap-2">
                    <h3 className="font-semibold">{group}</h3>
                    <Badge variant="secondary">{contacts.length}</Badge>
                  </div>
                  <div className="space-y-2">
                    {contacts.map((contact) => (
                      <ContactListItem
                        key={contact.id}
                        contact={contact}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        onLogInteraction={handleLogInteraction}
                        onToggleFavorite={handleToggleFavorite}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="by-project" className="mt-4">
          {isLoadingByProject ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : byProject.length === 0 ? (
            <EmptyState
              icon={Target}
              title="No project-linked contacts"
              description="Link contacts to projects from the project detail page to see them here."
            />
          ) : (
            <div className="space-y-6">
              {byProject.map(({ projectId, projectName, contacts }) => (
                <div key={projectId}>
                  <div className="mb-2 flex items-center gap-2">
                    <h3 className="font-semibold">{projectName}</h3>
                    <Badge variant="secondary">{contacts.length}</Badge>
                  </div>
                  <div className="space-y-2">
                    {contacts.map((contact) => (
                      <ContactListItem
                        key={contact.id}
                        contact={contact}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        onLogInteraction={handleLogInteraction}
                        onToggleFavorite={handleToggleFavorite}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="follow-up" className="mt-4">
          {followUpContacts.length === 0 ? (
            <EmptyState
              icon={Target}
              title="All caught up"
              description="No contacts need follow-up right now."
            />
          ) : (
            <div className="space-y-2">
              {followUpContacts.map((contact) => (
                <ContactListItem
                  key={contact.id}
                  contact={contact}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onLogInteraction={handleLogInteraction}
                  onToggleFavorite={handleToggleFavorite}
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
          if (!open) setEditingContact(null);
        }}
        contact={editingContact}
        onSubmit={handleSubmit}
      />
    </div>
  );
}