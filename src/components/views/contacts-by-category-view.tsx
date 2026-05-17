"use client";

import { useState } from "react";
import { ChevronDownIcon, ChevronRightIcon, Plus } from "lucide-react";

import { ContactCard } from "@/components/entities/contact-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Contact } from "@/lib/types/domain.types";
import type { ContactCategorySection } from "@/lib/utils/contact-category-sections";

interface ContactsByCategoryViewProps {
  sections: ContactCategorySection[];
  onCreateInSection: (section: ContactCategorySection) => void;
  onEdit: (contact: Contact) => void;
  onDelete: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  onArchive: (id: string, archive: boolean) => void;
}

function CollapsibleContactSection({
  section,
  onCreateInSection,
  onEdit,
  onDelete,
  onToggleFavorite,
  onArchive,
}: {
  section: ContactCategorySection;
  onCreateInSection: (section: ContactCategorySection) => void;
  onEdit: (contact: Contact) => void;
  onDelete: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  onArchive: (id: string, archive: boolean) => void;
}) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="mb-6">
      <div
        role="button"
        tabIndex={0}
        className="group mb-3 flex w-full items-center gap-2 cursor-pointer"
        onClick={() => setIsOpen((open) => !open)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            setIsOpen((open) => !open);
          }
        }}
      >
        {isOpen ? <ChevronDownIcon className="size-4 text-muted-foreground" /> : <ChevronRightIcon className="size-4 text-muted-foreground" />}
        <h3 className="font-semibold">{section.label}</h3>
        <Badge variant="secondary">{section.contacts.length}</Badge>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="ml-auto opacity-0 transition-opacity group-hover:opacity-100"
          onClick={(event) => {
            event.stopPropagation();
            onCreateInSection(section);
          }}
          title={section.createLabel}
        >
          <Plus className="size-4" />
        </Button>
      </div>

      {isOpen && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {section.contacts.map((contact) => (
            <ContactCard
              key={contact.id}
              contact={contact}
              onEdit={onEdit}
              onDelete={onDelete}
              onToggleFavorite={onToggleFavorite}
              onArchive={onArchive}
            />
          ))}
          <button
            type="button"
            onClick={() => onCreateInSection(section)}
            className="flex h-full min-h-48 flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border text-muted-foreground transition-all hover:border-primary/50 hover:bg-muted/50 hover:text-foreground"
          >
            <Plus className="size-8" />
            <span className="text-sm font-medium">{section.createLabel}</span>
          </button>
        </div>
      )}
    </div>
  );
}

export function ContactsByCategoryView(props: ContactsByCategoryViewProps) {
  return (
    <div>
      {props.sections.map((section) => (
        <CollapsibleContactSection
          key={section.id}
          section={section}
          onCreateInSection={props.onCreateInSection}
          onEdit={props.onEdit}
          onDelete={props.onDelete}
          onToggleFavorite={props.onToggleFavorite}
          onArchive={props.onArchive}
        />
      ))}
    </div>
  );
}
