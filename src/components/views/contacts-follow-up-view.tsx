"use client";

import { useState } from "react";
import { ChevronDownIcon, ChevronRightIcon, Bell } from "lucide-react";

import { ContactCard } from "@/components/entities/contact-card";
import { EmptyState } from "@/components/views/empty-state";
import { Badge } from "@/components/ui/badge";
import { cardGrid } from "@/components/ui/layout";
import { cn } from "@/lib/utils";
import type { Contact } from "@/lib/types/domain.types";
import type { FollowUpSection } from "@/lib/utils/contact-category-sections";
import { BADGE_COLOR } from "@/lib/constants/entity-colors";

const SECTION_BADGE_CLASSES: Record<string, string> = {
  overdue:       BADGE_COLOR.red,
  upcoming:      BADGE_COLOR.orange,
  "this-month":  BADGE_COLOR.blue,
  "next-month":  BADGE_COLOR.green,
  "this-quarter":BADGE_COLOR.neutral,
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
        aria-expanded={isOpen}
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
        <div className={cardGrid}>
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
  if (sections.length === 0 || sections.every((s) => s.contacts.length === 0)) {
    return <EmptyState icon={Bell} title="No follow-ups" description="No contacts need follow-up right now." />;
  }

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
