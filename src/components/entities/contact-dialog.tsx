"use client";

import { useEffect } from "react";
import { Controller, FormProvider, useForm } from "react-hook-form";

import { Contact } from "@/lib/types/domain.types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FormControl, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const CONTACT_GROUPS = [
  "Client",
  "Team Member",
  "Vendor",
  "Mentor",
  "Collaborator",
  "Partner",
];

interface ContactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact?: Contact | null;
  onSubmit?: (values: ContactFormValues) => void;
}

interface ContactFormValues {
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
}

const EMPTY_FORM_VALUES: ContactFormValues = {
  name: "",
  role: "",
  organization: "",
  group: "",
  phone: "",
  email: "",
  linkedin: "",
  website: "",
  follow_up_interval_days: "14",
  notes: "",
};

function buildContactFormValues(contact: Contact | null | undefined): ContactFormValues {
  if (!contact) return EMPTY_FORM_VALUES;

  return {
    name: contact.name ?? "",
    role: contact.role ?? "",
    organization: contact.organization ?? "",
    group: contact.group ?? "",
    phone: contact.phone ?? "",
    email: contact.email ?? "",
    linkedin: contact.linkedin ?? "",
    website: contact.website ?? "",
    follow_up_interval_days: String(contact.follow_up_interval_days ?? 14),
    notes: contact.notes ?? "",
  };
}

export function ContactDialog({
  open,
  onOpenChange,
  contact,
  onSubmit,
}: ContactDialogProps) {
  const form = useForm<ContactFormValues>({
    defaultValues: EMPTY_FORM_VALUES,
  });

  useEffect(() => {
    if (!open) return;
    form.reset(buildContactFormValues(contact));
  }, [open, contact, form]);

  const handleSubmit = form.handleSubmit(async (values) => {
    form.clearErrors();
    onSubmit?.(values);
    onOpenChange(false);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{contact ? "Edit Contact" : "Create Contact"}</DialogTitle>
          <DialogDescription>
            Add a professional contact and track your interactions.
          </DialogDescription>
        </DialogHeader>

        <FormProvider {...form}>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <FormItem>
              <FormLabel>Name *</FormLabel>
              <FormControl>
                <Input autoFocus placeholder="Full name" {...form.register("name")} />
              </FormControl>
              <FormMessage>{form.formState.errors.name?.message}</FormMessage>
            </FormItem>

            <div className="grid grid-cols-2 gap-4">
              <FormItem>
                <FormLabel>Role</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. Product Manager" {...form.register("role")} />
                </FormControl>
              </FormItem>

              <FormItem>
                <FormLabel>Organization</FormLabel>
                <FormControl>
                  <Input placeholder="Company name" {...form.register("organization")} />
                </FormControl>
              </FormItem>
            </div>

            <FormItem>
              <FormLabel>Group</FormLabel>
              <Controller
                control={form.control}
                name="group"
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select group" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {CONTACT_GROUPS.map((g) => (
                        <SelectItem key={g} value={g}>{g}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </FormItem>

            <div className="grid grid-cols-2 gap-4">
              <FormItem>
                <FormLabel>Phone</FormLabel>
                <FormControl>
                  <Input type="tel" placeholder="+1 555 000 0000" {...form.register("phone")} />
                </FormControl>
              </FormItem>

              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="email@example.com" {...form.register("email")} />
                </FormControl>
              </FormItem>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormItem>
                <FormLabel>LinkedIn</FormLabel>
                <FormControl>
                  <Input placeholder="linkedin.com/in/..." {...form.register("linkedin")} />
                </FormControl>
              </FormItem>

              <FormItem>
                <FormLabel>Website</FormLabel>
                <FormControl>
                  <Input placeholder="https://..." {...form.register("website")} />
                </FormControl>
              </FormItem>
            </div>

            <FormItem>
              <FormLabel>Follow-up Interval (days)</FormLabel>
              <Controller
                control={form.control}
                name="follow_up_interval_days"
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="7">Every 7 days</SelectItem>
                      <SelectItem value="14">Every 14 days</SelectItem>
                      <SelectItem value="30">Every 30 days</SelectItem>
                      <SelectItem value="60">Every 60 days</SelectItem>
                      <SelectItem value="90">Every 90 days</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </FormItem>

            <FormItem>
              <FormLabel>Notes</FormLabel>
              <FormControl>
                <Textarea placeholder="Context, background, notes..." rows={3} {...form.register("notes")} />
              </FormControl>
            </FormItem>

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit">
                {contact ? "Update Contact" : "Create Contact"}
              </Button>
            </div>
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
}