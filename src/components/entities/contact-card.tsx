"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { Archive, ArchiveRestore, Mail, Pencil, Phone, Star, User2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Contact } from "@/lib/types/domain.types";
import { contactService } from "@/lib/services/contact.service";
import { encodeReturnTo } from "@/lib/utils/return-to";
import { CONTACT_GROUP_COLORS } from "@/lib/constants/entity-colors";

import { DeleteEntityPopover } from "./delete-entity-popover";
import { useClickableProps } from "@/components/ui/clickable";

interface ContactCardProps {
  contact: Contact;
  onEdit?: (contact: Contact) => void;
  onDelete?: (id: string) => void;
  onToggleFavorite?: (id: string) => void;
  onArchive?: (id: string, archive: boolean) => void;
  returnTo?: string;
  returnToChain?: string;
}

/** On mobile, stack org under role once role is long enough to crowd action buttons. */
const MOBILE_ROLE_STACK_THRESHOLD = 22;

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
  const roleOrgLine = [contact.role, contact.organization].filter(Boolean).join(" · ");
  const stackRoleOrgOnMobile =
    Boolean(contact.role && contact.organization) &&
    contact.role!.length > MOBILE_ROLE_STACK_THRESHOLD;

  return (
    <Card
      className="group flex h-full cursor-pointer flex-col overflow-hidden hover-lift"
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
      {...useClickableProps(() => {
        const base = `/contacts/${contact.slug ?? contact.id}`;
        router.push(
          returnTo
            ? `${base}?returnTo=${encodeReturnTo(returnTo)}${
                returnToChain ? `&chain=${returnToChain}` : ""
              }`
            : base,
        );
      })}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          {/* flex-1 + min-w-0 lets this column shrink so action buttons keep their slot */}
          <div className="flex min-w-0 flex-1 items-center gap-3 overflow-hidden">
            {/* Avatar circle */}
            <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 overflow-hidden bg-muted relative">
              {contact.image_display_url ? (
                <Image src={contact.image_display_url} alt={contact.name} fill className="object-cover" unoptimized />
              ) : (
                <User2 className="size-5 text-muted-foreground" />
              )}
            </div>
            <div className="min-w-0 flex-1 overflow-hidden">
              <div className="flex min-w-0 items-center gap-1.5">
                <span className="min-w-0 truncate font-medium">{contact.name}</span>
                {contact.favorite && (
                  <Star className="size-3 shrink-0 fill-yellow-400 text-yellow-400" />
                )}
              </div>
              {(contact.role || contact.organization) && (
                <>
                  {/* Desktop: keep role · organization on one line */}
                  <p className="hidden text-sm text-muted-foreground truncate md:block">
                    {roleOrgLine}
                  </p>
                  {/* Mobile: stack org under long roles so buttons stay in-card */}
                  {stackRoleOrgOnMobile ? (
                    <div className="md:hidden text-sm text-muted-foreground">
                      <p className="truncate">{contact.role}</p>
                      <p className="truncate">{contact.organization}</p>
                    </div>
                  ) : (
                    <p className="truncate text-sm text-muted-foreground md:hidden">
                      {roleOrgLine}
                    </p>
                  )}
                </>
              )}
              {contact.group && (
                <Badge variant="secondary" className={cn("mt-1 text-2xs", groupColor)}>
                  {contact.group}
                </Badge>
              )}
            </div>
          </div>

          {/* Action buttons — fixed-width cluster; does not shrink with long metadata */}
          <div
            className="flex shrink-0 items-center gap-1"
            onClick={(e) => e.stopPropagation()}
          >
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => onToggleFavorite?.(contact.id)}
              aria-label={contact.favorite ? "Remove from favorites" : "Add to favorites"}
            >
              <Star className={cn("size-3.5", contact.favorite && "fill-yellow-400 text-yellow-400")} />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => onArchive?.(contact.id, !contact.archive)}
              aria-label={contact.archive ? "Restore contact" : "Archive contact"}
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
              aria-label="Edit contact"
            >
              <Pencil className="size-3.5" />
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
            <p className="text-2xs text-muted-foreground uppercase tracking-wide mb-0.5">Last log</p>
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
            <p className="text-2xs text-muted-foreground uppercase tracking-wide mb-0.5">Follow-up</p>
            {(() => {
              if (!contact.last_interaction_at && contact.follow_up_interval_days) {
                return <p className="text-xs font-medium text-destructive">Overdue</p>;
              }
              const daysUntil = contactService.computeDaysUntilFollowUp(
                contact.last_interaction_at,
                contact.follow_up_interval_days,
              );
              if (daysUntil === null) {
                return <p className="text-xs font-medium text-muted-foreground">N/A</p>;
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
