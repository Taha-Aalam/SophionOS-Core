"use client";

import { Mail, Phone, Star, Trash2, User2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Contact } from "@/lib/types/domain.types";
import { contactService } from "@/lib/services/contact.service";

const GROUP_COLORS: Record<string, string> = {
  Client: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
  "Team Member": "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  Vendor: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
  Mentor: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  Collaborator: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900 dark:text-cyan-300",
  Partner: "bg-pink-100 text-pink-700 dark:bg-pink-900 dark:text-pink-300",
};

interface ContactListItemProps {
  contact: Contact;
  onEdit?: (contact: Contact) => void;
  onDelete?: (id: string) => void;
  onLogInteraction?: (id: string) => void;
  onToggleFavorite?: (id: string) => void;
}

export function ContactListItem({
  contact,
  onEdit,
  onDelete,
  onLogInteraction,
  onToggleFavorite,
}: ContactListItemProps) {
  const status = contactService.computeFollowUpStatus(
    contact.last_interaction_at,
    contact.follow_up_interval_days,
  );
  const daysSince = contactService.computeDaysSinceInteraction(contact.last_interaction_at);
  const groupColor = contact.group ? GROUP_COLORS[contact.group] : "";

  return (
    <div className="flex items-start justify-between gap-3 rounded-lg border p-4 transition-colors hover:bg-muted/30">
      <div className="flex items-start gap-3 min-w-0">
        <div className="mt-0.5 shrink-0">
          <User2 className="size-5 text-muted-foreground" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium truncate">{contact.name}</span>
            {contact.favorite && (
              <Star className="size-3 shrink-0 fill-yellow-400 text-yellow-400" />
            )}
            {contact.group && (
              <Badge variant="secondary" className={cn("text-[10px]", groupColor)}>
                {contact.group}
              </Badge>
            )}
          </div>
          {(contact.role || contact.organization) && (
            <p className="mt-0.5 text-sm text-muted-foreground truncate">
              {[contact.role, contact.organization].filter(Boolean).join(" · ")}
            </p>
          )}
          <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            {contact.phone && (
              <a href={`tel:${contact.phone}`} className="hover:text-foreground">
                <Phone className="size-3 inline mr-1" />
                {contact.phone}
              </a>
            )}
            {contact.email && (
              <a href={`mailto:${contact.email}`} className="hover:text-foreground">
                <Mail className="size-3 inline mr-1" />
                {contact.email}
              </a>
            )}
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <Badge
              variant={status === "ON TRACK" ? "outline" : "destructive"}
              className="text-[10px]"
            >
              {status}
            </Badge>
            {daysSince !== null && (
              <span className="text-xs text-muted-foreground">
                {daysSince === 0 ? "Today" : `${daysSince}d ago`}
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onLogInteraction?.(contact.id)}
          title="Log interaction"
          className="text-xs"
        >
          Log
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onToggleFavorite?.(contact.id)}
          title={contact.favorite ? "Remove from favorites" : "Add to favorites"}
        >
          <Star className={cn("size-3.5", contact.favorite && "fill-yellow-400 text-yellow-400")} />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onEdit?.(contact)}
          title="Edit contact"
        >
          Edit
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDelete?.(contact.id)}
          title="Delete contact"
        >
          <Trash2 className="size-3.5 text-destructive" />
        </Button>
      </div>
    </div>
  );
}