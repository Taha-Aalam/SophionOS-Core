"use client";

import { useState } from "react";
import { ChevronDownIcon, ChevronRightIcon } from "lucide-react";

import { ContactCard } from "@/components/entities/contact-card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Contact } from "@/lib/types/domain.types";
import type { FollowUpSection } from "@/lib/utils/contact-category-sections";

const SECTION_BADGE_CLASSES: Record<string, string> = {
  overdue:       "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
  upcoming:      "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
  "this-month":  "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  "next-month":  "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  "this-quarter":"bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
};

interface ContactsFollowUpViewProps {
  sections: FollowUpSection[];
  onEdit: (contact: Contact) => void;
  onDelete: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  onArchive: (id: string, archive: boolean) => void;
}

function CollapsibleFollowUpSection({
  section,
  onEdit,
  onDelete,
  onToggleFavorite,
  onArchive,
}: {
  section: FollowUpSection;
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
        className="mb-3 flex w-full cursor-pointer items-center gap-2"
        onClick={() => setIsOpen((o) => !o)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setIsOpen((o) => !o);
          }
        }}
      >
        <span className="text-muted-foreground">
          {isOpen
            ? <ChevronDownIcon className="size-4" />
            : <ChevronRightIcon className="size-4" />}
        </span>
        <Badge className={cn("text-xs font-medium", SECTION_BADGE_CLASSES[section.key])}>
          {section.label}
        </Badge>
        <span className="text-sm text-muted-foreground">
          ({section.contacts.length}{" "}
          {section.contacts.length === 1 ? "contact" : "contacts"})
        </span>
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
        </div>
      )}
    </div>
  );
}

export function ContactsFollowUpView({
  sections,
  onEdit,
  onDelete,
  onToggleFavorite,
  onArchive,
}: ContactsFollowUpViewProps) {
  return (
    <div>
      {sections.map((section) => (
        <CollapsibleFollowUpSection
          key={section.key}
          section={section}
          onEdit={onEdit}
          onDelete={onDelete}
          onToggleFavorite={onToggleFavorite}
          onArchive={onArchive}
        />
      ))}
    </div>
  );
}
