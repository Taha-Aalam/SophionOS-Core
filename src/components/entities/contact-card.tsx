"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { Archive, ArchiveRestore, Mail, Phone, Star, User2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Contact } from "@/lib/types/domain.types";
import { contactService } from "@/lib/services/contact.service";
import { encodeReturnTo } from "@/lib/utils/return-to";
import { CONTACT_GROUP_COLORS } from "@/lib/constants/entity-colors";

import { DeleteEntityPopover } from "./delete-entity-popover";

interface ContactCardProps {
  contact: Contact;
  onEdit?: (contact: Contact) => void;
  onDelete?: (id: string) => void;
  onToggleFavorite?: (id: string) => void;
  onArchive?: (id: string, archive: boolean) => void;
  returnTo?: string;
  returnToChain?: string;
}

export function ContactCard({
  contact,
  onEdit,
  onDelete,
  onToggleFavorite,
  onArchive,
  returnTo,
  returnToChain,
}: ContactCardProps) {
  const router = useRouter();
  const groupColor = contact.group ? CONTACT_GROUP_COLORS[contact.group] ?? "" : "";

  return (
    <Card
      className="group flex h-full cursor-pointer flex-col transition-all duration-500 ease-[var(--ease-out-quint)] will-change-transform hover:-translate-y-1 hover:shadow-soft-lg hover:ring-2 hover:ring-primary/20 active:translate-y-0 active:duration-150"
      onClick={() => {
        const base = `/contacts/${contact.slug ?? contact.id}`;
        router.push(
          returnTo
            ? `${base}?returnTo=${encodeReturnTo(returnTo)}${
                returnToChain ? `&chain=${returnToChain}` : ""
              }`
            : base,
        );
      }}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            {/* Avatar circle */}
            <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 overflow-hidden bg-muted relative">
              {contact.image_display_url ? (
                <Image src={contact.image_display_url} alt={contact.name} fill className="object-cover" unoptimized />
              ) : (
                <User2 className="size-5 text-muted-foreground" />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="font-medium truncate">{contact.name}</span>
                {contact.favorite && (
                  <Star className="size-3 shrink-0 fill-yellow-400 text-yellow-400" />
                )}
              </div>
              {(contact.role || contact.organization) && (
                <p className="text-sm text-muted-foreground truncate">
                  {[contact.role, contact.organization].filter(Boolean).join(" · ")}
                </p>
              )}
              {contact.group && (
                <Badge variant="secondary" className={cn("mt-1 text-[10px]", groupColor)}>
                  {contact.group}
                </Badge>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div
            className="flex items-center gap-1 shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => onToggleFavorite?.(contact.id)}
              title={contact.favorite ? "Remove from favorites" : "Add to favorites"}
            >
              <Star className={cn("size-3.5", contact.favorite && "fill-yellow-400 text-yellow-400")} />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => onArchive?.(contact.id, !contact.archive)}
              title={contact.archive ? "Restore contact" : "Archive contact"}
            >
              {contact.archive ? (
                <ArchiveRestore className="size-3.5" />
              ) : (
                <Archive className="size-3.5" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => onEdit?.(contact)}
              title="Edit contact"
            >
              Edit
            </Button>
            <DeleteEntityPopover
              variant="row"
              entityLabel="contact"
              entityName={contact.name}
              requireTypedConfirmation={false}
              onConfirm={() => onDelete?.(contact.id)}
            />
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col justify-end">
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          {contact.phone && (
            <a
              href={`tel:${contact.phone}`}
              className="flex items-center gap-1 hover:text-foreground"
              onClick={(e) => e.stopPropagation()}
            >
              <Phone className="size-3" />
              {contact.phone}
            </a>
          )}
          {contact.email && (
            <a
              href={`mailto:${contact.email}`}
              className="flex items-center gap-1 hover:text-foreground"
              onClick={(e) => e.stopPropagation()}
            >
              <Mail className="size-3" />
              {contact.email}
            </a>
          )}
        </div>
        <div className="mt-3 flex items-stretch gap-2">
          <div className="flex-1 rounded-md border bg-muted/40 px-3 py-2">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">Last log</p>
            <p className="text-xs font-medium">
              {contact.last_interaction_at
                ? (() => {
                    const days = contactService.computeDaysSinceInteraction(contact.last_interaction_at);
                    return days === 0 ? "Today" : `${days}d ago`;
                  })()
                : "Never"}
            </p>
          </div>

          <div className="flex-1 rounded-md border bg-muted/40 px-3 py-2">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">Follow-up</p>
            {(() => {
              if (!contact.last_interaction_at && contact.follow_up_interval_days) {
                return <p className="text-xs font-medium text-destructive">Overdue</p>;
              }
              const daysUntil = contactService.computeDaysUntilFollowUp(
                contact.last_interaction_at,
                contact.follow_up_interval_days,
              );
              if (daysUntil === null) {
                return <p className="text-xs font-medium text-muted-foreground">—</p>;
              }
              if (daysUntil >= 0) {
                return <p className="text-xs font-medium">{daysUntil}d left</p>;
              }
              return <p className="text-xs font-medium text-destructive">{Math.abs(daysUntil)}d overdue</p>;
            })()}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
