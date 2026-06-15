import type { CreateContactInput } from "@/lib/types/domain.types";

export interface ContactFormValues {
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
  area_ids?: string[];
  goal_ids?: string[];
  project_ids?: string[];
  task_ids?: string[];
}

export function buildContactCreateInput(values: ContactFormValues): CreateContactInput {
  return {
    name: values.name,
    role: values.role || null,
    organization: values.organization || null,
    group: values.group || null,
    phone: values.phone || null,
    email: values.email || null,
    linkedin: values.linkedin || null,
    website: values.website || null,
    image_url: values.image_url || null,
    follow_up_interval_days:
      values.follow_up_interval_days === "none"
        ? null
        : values.follow_up_interval_days
          ? parseInt(values.follow_up_interval_days, 10)
          : 14,
    notes: values.notes || null,
    area_ids: values.area_ids ?? [],
    goal_ids: values.goal_ids ?? [],
    project_ids: values.project_ids ?? [],
    task_ids: values.task_ids ?? [],
  };
}
