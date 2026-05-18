"use client";

import { useEffect, useState } from "react";
import { Controller, FormProvider, useForm } from "react-hook-form";
import { X } from "lucide-react";
import { toast } from "sonner";

import { Contact } from "@/lib/types/domain.types";
import { useAuth } from "@/components/providers/auth-provider";
import { CONTACT_GROUPS } from "@/lib/constants/contact-groups";
import { contactService } from "@/lib/services/contact.service";
import { useAreas } from "@/lib/hooks/use-areas";
import { useGoals } from "@/lib/hooks/use-goals";
import { useProjects } from "@/lib/hooks/use-projects";
import { useTasks } from "@/lib/hooks/use-tasks";
import { useContactRelationshipOptions } from "@/lib/hooks/use-contact-relationship-options";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FormControl, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export interface ContactDialogDefaults {
  group?: string;
  area_ids?: string[];
  goal_ids?: string[];
  project_ids?: string[];
  task_ids?: string[];
}

interface ContactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact?: Contact | null;
  defaults?: ContactDialogDefaults;
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
  image_url: string;
  follow_up_interval_days: string;
  notes: string;
  area_ids: string[];
  goal_ids: string[];
  project_ids: string[];
  task_ids: string[];
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
  image_url: "",
  follow_up_interval_days: "14",
  notes: "",
  area_ids: [],
  goal_ids: [],
  project_ids: [],
  task_ids: [],
};

function buildContactFormValues(contact: Contact | null | undefined): ContactFormValues {
  if (!contact) return EMPTY_FORM_VALUES;

  const interval = contact.follow_up_interval_days;
  const intervalStr =
    interval === null || interval === undefined || interval === 0 ? "none" : String(interval);

  return {
    name: contact.name ?? "",
    role: contact.role ?? "",
    organization: contact.organization ?? "",
    group: contact.group ?? "",
    phone: contact.phone ?? "",
    email: contact.email ?? "",
    linkedin: contact.linkedin ?? "",
    website: contact.website ?? "",
    image_url: contact.image_url ?? "",
    follow_up_interval_days: intervalStr,
    notes: contact.notes ?? "",
    area_ids: contact.linkedAreaIds ?? [],
    goal_ids: contact.linkedGoalIds ?? [],
    project_ids: contact.linkedProjectIds ?? [],
    task_ids: contact.linkedTaskIds ?? [],
  };
}

function mergeContactFormDefaults(defaults?: ContactDialogDefaults): ContactFormValues {
  return {
    ...EMPTY_FORM_VALUES,
    ...defaults,
    area_ids: defaults?.area_ids ?? [],
    goal_ids: defaults?.goal_ids ?? [],
    project_ids: defaults?.project_ids ?? [],
    task_ids: defaults?.task_ids ?? [],
  };
}

export function ContactDialog({
  open,
  onOpenChange,
  contact,
  defaults,
  onSubmit,
}: ContactDialogProps) {
  const form = useForm<ContactFormValues>({
    defaultValues: EMPTY_FORM_VALUES,
  });

  const { user } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const [isRemovingImage, setIsRemovingImage] = useState(false);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);

  useEffect(() => {
    setUploadPreview(contact?.image_url ?? null);
  }, [contact?.image_url]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      const tempId = contact?.id ?? crypto.randomUUID();
      const url = await contactService.uploadContactImage(user!.id, tempId, file);
      form.setValue("image_url", url);
      setUploadPreview(url);
    } catch {
      toast.error("Failed to upload image");
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveImage = async () => {
    if (!uploadPreview) return;

    try {
      setIsRemovingImage(true);
      await contactService.deleteContactImage(uploadPreview);
      form.setValue("image_url", "");
      setUploadPreview(null);
      toast.success("Profile image removed");
    } catch {
      toast.error("Failed to remove image");
    } finally {
      setIsRemovingImage(false);
    }
  };

  const { data: allAreas = [] } = useAreas();
  const { data: allGoals = [] } = useGoals({ status: "all" });
  const { data: allProjects = [] } = useProjects({ status: "all" });
  const { data: allTasks = [] } = useTasks();

  const areaIds: string[] = form.watch("area_ids") ?? [];
  const goalIds: string[] = form.watch("goal_ids") ?? [];
  const projectIds: string[] = form.watch("project_ids") ?? [];
  const taskIds: string[] = form.watch("task_ids") ?? [];

  const {
    visibleAreas,
    filteredGoals,
    filteredProjects,
    filteredTasks,
    isRelationsLoading,
    cleanSelections,
  } = useContactRelationshipOptions({
    allAreas,
    allGoals,
    allProjects,
    allTasks,
    selectedAreaIds: areaIds,
    selectedGoalIds: goalIds,
    selectedProjectIds: projectIds,
    selectedTaskIds: taskIds,
    enabled: open,
  });

  const activeAreas = allAreas.filter((a) => !a.archive);
  const activeGoals = allGoals.filter((g) => !g.is_archived);
  const activeProjects = allProjects.filter((p) => !p.is_archived);

  // Clean up invalid selections when filters change
  useEffect(() => {
    if (isRelationsLoading) return;
    const cleaned = cleanSelections();
    if (!cleaned.changed) return;
    if (cleaned.areaIds.length !== areaIds.length) form.setValue("area_ids", cleaned.areaIds);
    if (cleaned.goalIds.length !== goalIds.length) form.setValue("goal_ids", cleaned.goalIds);
    if (cleaned.projectIds.length !== projectIds.length) form.setValue("project_ids", cleaned.projectIds);
    if (cleaned.taskIds.length !== taskIds.length) form.setValue("task_ids", cleaned.taskIds);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleAreas, filteredGoals, filteredProjects, filteredTasks, isRelationsLoading]);

  const toggleId = (
    field: "area_ids" | "goal_ids" | "project_ids" | "task_ids",
    id: string,
  ) => {
    const current: string[] = form.getValues(field) ?? [];
    const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
    form.setValue(field, next);
  };

  useEffect(() => {
    if (!open) return;
    form.reset(contact ? buildContactFormValues(contact) : mergeContactFormDefaults(defaults));
  }, [open, contact, defaults, form]);

  const handleSubmit = form.handleSubmit(async (values) => {
    form.clearErrors();
    let hasError = false;
    if (!values.phone.trim()) {
      form.setError("phone", { message: "Phone is required" });
      hasError = true;
    }
    if (!values.email.trim()) {
      form.setError("email", { message: "Email is required" });
      hasError = true;
    }
    if (hasError) return;
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
                <FormLabel>Phone *</FormLabel>
                <FormControl>
                  <Input type="tel" placeholder="+1 555 000 0000" {...form.register("phone")} />
                </FormControl>
                <FormMessage>{form.formState.errors.phone?.message}</FormMessage>
              </FormItem>

              <FormItem>
                <FormLabel>Email *</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="email@example.com" {...form.register("email")} />
                </FormControl>
                <FormMessage>{form.formState.errors.email?.message}</FormMessage>
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
                      <SelectItem value="none">No follow-up required</SelectItem>
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

            {/* Area + Goals row */}
            <div className="grid grid-cols-2 gap-4">
              {/* Areas */}
              <FormItem>
                <div className="flex items-center justify-between">
                  <FormLabel>Areas</FormLabel>
                  <DropdownMenu>
                    <DropdownMenuTrigger className={buttonVariants({ variant: "outline", size: "sm" })}>
                      {areaIds.length === 0 ? "Select areas..." : `${areaIds.length} selected`}
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-56">
                      <DropdownMenuItem onClick={() => form.setValue("area_ids", [])}>
                        Clear selection
                      </DropdownMenuItem>
                      <ScrollArea className="max-h-56">
                        {visibleAreas.length === 0 ? (
                          <div className="px-2 py-1.5 text-sm text-muted-foreground">No areas.</div>
                        ) : (
                          visibleAreas.map((area) => (
                            <DropdownMenuCheckboxItem
                              key={area.id}
                              checked={areaIds.includes(area.id)}
                              onCheckedChange={() => toggleId("area_ids", area.id)}
                              className="flex items-center gap-2"
                            >
                              {area.icon ? `${area.icon} ` : ""}
                              {area.name}
                            </DropdownMenuCheckboxItem>
                          ))
                        )}
                      </ScrollArea>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                {areaIds.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {areaIds
                      .map((id) => activeAreas.find((a) => a.id === id))
                      .filter(Boolean)
                      .map((area) => (
                        <Badge key={area!.id} variant="secondary" className="flex items-center gap-1">
                          {area!.icon ? `${area!.icon} ` : ""}
                          {area!.name}
                          <button
                            type="button"
                            onClick={() => toggleId("area_ids", area!.id)}
                            className="ml-1 rounded-full p-0.5 hover:bg-muted"
                          >
                            <X className="size-3" />
                          </button>
                        </Badge>
                      ))}
                  </div>
                )}
              </FormItem>

              {/* Goals */}
              <FormItem>
                <div className="flex items-center justify-between">
                  <FormLabel>Goals</FormLabel>
                  <DropdownMenu>
                    <DropdownMenuTrigger className={buttonVariants({ variant: "outline", size: "sm" })}>
                      {goalIds.length === 0 ? "Select goals..." : `${goalIds.length} selected`}
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-56">
                      <DropdownMenuItem onClick={() => form.setValue("goal_ids", [])}>
                        Clear selection
                      </DropdownMenuItem>
                      <ScrollArea className="max-h-56">
                        {filteredGoals.length === 0 ? (
                          <div className="px-2 py-1.5 text-sm text-muted-foreground">No goals.</div>
                        ) : (
                          filteredGoals.map((goal) => (
                            <DropdownMenuCheckboxItem
                              key={goal.id}
                              checked={goalIds.includes(goal.id)}
                              onCheckedChange={() => toggleId("goal_ids", goal.id)}
                              className="flex items-center gap-2"
                            >
                              {goal.name}
                            </DropdownMenuCheckboxItem>
                          ))
                        )}
                      </ScrollArea>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                {goalIds.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {goalIds
                      .map((id) => activeGoals.find((g) => g.id === id))
                      .filter(Boolean)
                      .map((goal) => (
                        <Badge key={goal!.id} variant="secondary" className="flex items-center gap-1">
                          {goal!.name}
                          <button
                            type="button"
                            onClick={() => toggleId("goal_ids", goal!.id)}
                            className="ml-1 rounded-full p-0.5 hover:bg-muted"
                          >
                            <X className="size-3" />
                          </button>
                        </Badge>
                      ))}
                  </div>
                )}
              </FormItem>
            </div>

            {/* Projects + Tasks row */}
            <div className="grid grid-cols-2 gap-4">
              {/* Projects */}
              <FormItem>
                <div className="flex items-center justify-between">
                  <FormLabel>Projects</FormLabel>
                  <DropdownMenu>
                    <DropdownMenuTrigger className={buttonVariants({ variant: "outline", size: "sm" })}>
                      {projectIds.length === 0 ? "Select projects..." : `${projectIds.length} selected`}
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-56">
                      <DropdownMenuItem onClick={() => form.setValue("project_ids", [])}>
                        Clear selection
                      </DropdownMenuItem>
                      <ScrollArea className="max-h-56">
                        {filteredProjects.length === 0 ? (
                          <div className="px-2 py-1.5 text-sm text-muted-foreground">No projects.</div>
                        ) : (
                          filteredProjects.map((project) => (
                            <DropdownMenuCheckboxItem
                              key={project.id}
                              checked={projectIds.includes(project.id)}
                              onCheckedChange={() => toggleId("project_ids", project.id)}
                              className="flex items-center gap-2"
                            >
                              {project.name}
                            </DropdownMenuCheckboxItem>
                          ))
                        )}
                      </ScrollArea>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                {projectIds.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {projectIds
                      .map((id) => activeProjects.find((p) => p.id === id))
                      .filter(Boolean)
                      .map((project) => (
                        <Badge key={project!.id} variant="secondary" className="flex items-center gap-1">
                          {project!.name}
                          <button
                            type="button"
                            onClick={() => toggleId("project_ids", project!.id)}
                            className="ml-1 rounded-full p-0.5 hover:bg-muted"
                          >
                            <X className="size-3" />
                          </button>
                        </Badge>
                      ))}
                  </div>
                )}
              </FormItem>

              {/* Tasks */}
              <FormItem>
                <div className="flex items-center justify-between">
                  <FormLabel>Tasks</FormLabel>
                  <DropdownMenu>
                    <DropdownMenuTrigger className={buttonVariants({ variant: "outline", size: "sm" })}>
                      {taskIds.length === 0 ? "Select tasks..." : `${taskIds.length} selected`}
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-56">
                      <DropdownMenuItem onClick={() => form.setValue("task_ids", [])}>
                        Clear selection
                      </DropdownMenuItem>
                      <ScrollArea className="max-h-56">
                        {filteredTasks.length === 0 ? (
                          <div className="px-2 py-1.5 text-sm text-muted-foreground">No tasks.</div>
                        ) : (
                          filteredTasks.map((task) => (
                            <DropdownMenuCheckboxItem
                              key={task.id}
                              checked={taskIds.includes(task.id)}
                              onCheckedChange={() => toggleId("task_ids", task.id)}
                              className="flex items-center gap-2"
                            >
                              {task.name}
                            </DropdownMenuCheckboxItem>
                          ))
                        )}
                      </ScrollArea>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                {taskIds.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {taskIds
                      .map((id) => allTasks.find((t) => t.id === id))
                      .filter(Boolean)
                      .map((task) => (
                        <Badge key={task!.id} variant="secondary" className="flex items-center gap-1">
                          {task!.name}
                          <button
                            type="button"
                            onClick={() => toggleId("task_ids", task!.id)}
                            className="ml-1 rounded-full p-0.5 hover:bg-muted"
                          >
                            <X className="size-3" />
                          </button>
                        </Badge>
                      ))}
                  </div>
                )}
              </FormItem>
            </div>

            <FormItem>
              <FormLabel>Notes</FormLabel>
              <FormControl>
                <Textarea placeholder="Context, background, notes..." rows={3} {...form.register("notes")} />
              </FormControl>
            </FormItem>

            <FormItem>
              <FormLabel>Profile Image</FormLabel>
              <FormControl>
                <div className="flex flex-col gap-2">
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    onChange={handleFileChange}
                    disabled={isUploading}
                    className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-1.5 file:text-sm file:font-medium hover:file:bg-muted/80 disabled:opacity-50"
                  />
                  {isUploading && (
                    <p className="text-xs text-muted-foreground">Uploading…</p>
                  )}
                  {uploadPreview && !isUploading && (
                    <div className="flex items-center gap-3">
                      <div className="size-10 overflow-hidden rounded-full bg-muted shrink-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={uploadPreview}
                          alt="Preview"
                          className="size-full object-cover"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <p className="text-xs text-muted-foreground">Image preview</p>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleRemoveImage}
                          disabled={isUploading || isRemovingImage}
                        >
                          Remove Image
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </FormControl>
            </FormItem>

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isUploading || isRemovingImage}>
                {contact ? "Update Contact" : "Create Contact"}
              </Button>
            </div>
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
}
