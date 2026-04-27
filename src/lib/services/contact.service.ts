import { createClient } from "../supabase/client";
import type {
  Contact,
  ContactProject,
  ContactTask,
  CreateContactInput,
  FollowUpStatus,
  UpdateContactInput,
} from "../types/domain.types";
import { createContactSchema, updateContactSchema } from "../validators/contact.schema";
import { DatabaseError, NotFoundError } from "../api/error-handler";

const CONTACT_SELECT =
  "id, user_id, name, role, organization, group, phone, email, linkedin, website, last_interaction_at, follow_up_interval_days, favorite, notes, archive, metadata, created_at, updated_at";

function computeFollowUpStatus(
  lastInteractionAt: string | null | undefined,
  intervalDays: number | null | undefined,
): FollowUpStatus {
  if (!lastInteractionAt) return "FOLLOW UP";
  const interval = intervalDays ?? 14;
  const lastDate = new Date(lastInteractionAt);
  const now = new Date();
  const diffMs = now.getTime() - lastDate.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  return diffDays <= interval ? "ON TRACK" : "FOLLOW UP";
}

function computeDaysSinceInteraction(lastInteractionAt: string | null | undefined): number | null {
  if (!lastInteractionAt) return null;
  const lastDate = new Date(lastInteractionAt);
  const now = new Date();
  const diffMs = now.getTime() - lastDate.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

export const contactService = {
  computeFollowUpStatus,
  computeDaysSinceInteraction,

  async list(userId: string, filters?: { group?: string; archive?: boolean }): Promise<Contact[]> {
    let query = createClient()
      .from("contacts")
      .select(CONTACT_SELECT)
      .eq("user_id", userId);

    if (filters?.archive) {
      query = query.eq("archive", true);
    } else {
      query = query.eq("archive", false);
    }

    if (filters?.group) {
      query = query.eq("group", filters.group);
    }

    query = query.order("name", { ascending: true });

    const { data, error } = await query;
    if (error) throw new DatabaseError(error.message);
    return data || [];
  },

  async getById(userId: string, id: string): Promise<Contact> {
    const { data, error } = await createClient()
      .from("contacts")
      .select(CONTACT_SELECT)
      .eq("user_id", userId)
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") throw new NotFoundError("Contact", id);
      throw new DatabaseError(error.message);
    }
    return data;
  },

  async create(userId: string, input: CreateContactInput): Promise<Contact> {
    const validated = createContactSchema.parse(input);
    const { data, error } = await createClient()
      .from("contacts")
      .insert({ ...validated, user_id: userId })
      .select(CONTACT_SELECT)
      .single();

    if (error) throw new DatabaseError(error.message);
    return data;
  },

  async update(userId: string, id: string, input: UpdateContactInput): Promise<Contact> {
    const validated = updateContactSchema.parse(input);
    const hasUpdates = Object.keys(validated).length > 0;

    const contact = hasUpdates
      ? await (async () => {
          const { data, error } = await createClient()
            .from("contacts")
            .update(validated)
            .eq("user_id", userId)
            .eq("id", id)
            .select(CONTACT_SELECT)
            .single();

          if (error) {
            if (error.code === "PGRST116") throw new NotFoundError("Contact", id);
            throw new DatabaseError(error.message);
          }
          return data;
        })()
      : await this.getById(userId, id);

    return contact;
  },

  async delete(userId: string, id: string): Promise<void> {
    const { error } = await createClient()
      .from("contacts")
      .delete()
      .eq("user_id", userId)
      .eq("id", id);

    if (error) throw new DatabaseError(error.message);
  },

  async toggleFavorite(userId: string, id: string): Promise<Contact> {
    const contact = await this.getById(userId, id);
    const { data, error } = await createClient()
      .from("contacts")
      .update({ favorite: !contact.favorite })
      .eq("user_id", userId)
      .eq("id", id)
      .select(CONTACT_SELECT)
      .single();

    if (error) {
      if (error.code === "PGRST116") throw new NotFoundError("Contact", id);
      throw new DatabaseError(error.message);
    }
    return data;
  },

  async logInteraction(userId: string, id: string): Promise<Contact> {
    const { data, error } = await createClient()
      .from("contacts")
      .update({ last_interaction_at: new Date().toISOString() })
      .eq("user_id", userId)
      .eq("id", id)
      .select(CONTACT_SELECT)
      .single();

    if (error) {
      if (error.code === "PGRST116") throw new NotFoundError("Contact", id);
      throw new DatabaseError(error.message);
    }
    return data;
  },

  async getByGroup(userId: string): Promise<Record<string, Contact[]>> {
    const contacts = await this.list(userId);
    const grouped: Record<string, Contact[]> = {};
    for (const contact of contacts) {
      const key = contact.group ?? "Ungrouped";
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(contact);
    }
    return grouped;
  },

  async getNeedFollowUp(userId: string): Promise<Contact[]> {
    const contacts = await this.list(userId);
    return contacts.filter(
      (c) => computeFollowUpStatus(c.last_interaction_at, c.follow_up_interval_days) === "FOLLOW UP",
    );
  },

  async linkToProject(
    userId: string,
    contactId: string,
    projectId: string,
    roleInProject?: string,
  ): Promise<void> {
    await this.getById(userId, contactId);
    const { error } = await createClient()
      .from("contact_projects")
      .upsert(
        { contact_id: contactId, project_id: projectId, role_in_project: roleInProject ?? null },
        { onConflict: "contact_id,project_id" },
      );

    if (error) throw new DatabaseError(error.message);
  },

  async unlinkFromProject(userId: string, contactId: string, projectId: string): Promise<void> {
    await this.getById(userId, contactId);
    const { error } = await createClient()
      .from("contact_projects")
      .delete()
      .eq("contact_id", contactId)
      .eq("project_id", projectId);

    if (error) throw new DatabaseError(error.message);
  },

  async getProjectLinks(userId: string, contactId: string): Promise<ContactProject[]> {
    await this.getById(userId, contactId);
    const { data, error } = await createClient()
      .from("contact_projects")
      .select("contact_id, project_id, role_in_project")
      .eq("contact_id", contactId);

    if (error) throw new DatabaseError(error.message);
    return data || [];
  },

  async linkToTask(
    userId: string,
    contactId: string,
    taskId: string,
    roleInTask?: string,
  ): Promise<void> {
    await this.getById(userId, contactId);
    const { error } = await createClient()
      .from("contact_tasks")
      .upsert(
        { contact_id: contactId, task_id: taskId, role_in_task: roleInTask ?? null },
        { onConflict: "contact_id,task_id" },
      );

    if (error) throw new DatabaseError(error.message);
  },

  async unlinkFromTask(userId: string, contactId: string, taskId: string): Promise<void> {
    await this.getById(userId, contactId);
    const { error } = await createClient()
      .from("contact_tasks")
      .delete()
      .eq("contact_id", contactId)
      .eq("task_id", taskId);

    if (error) throw new DatabaseError(error.message);
  },

  async getTaskLinks(userId: string, contactId: string): Promise<ContactTask[]> {
    await this.getById(userId, contactId);
    const { data, error } = await createClient()
      .from("contact_tasks")
      .select("contact_id, task_id, role_in_task")
      .eq("contact_id", contactId);

    if (error) throw new DatabaseError(error.message);
    return data || [];
  },

  async getByProject(userId: string, projectId: string): Promise<ContactProject[]> {
    const { data, error } = await createClient()
      .from("contact_projects")
      .select("contact_id, project_id, role_in_project")
      .eq("project_id", projectId);

    if (error) throw new DatabaseError(error.message);
    return data || [];
  },

  async getContactsGroupedByProject(userId: string): Promise<Array<{ projectId: string; projectName: string; contacts: Contact[] }>> {
    const { data: links, error } = await createClient()
      .from("contact_projects")
      .select("contact_id, project_id, role_in_project");

    if (error) throw new DatabaseError(error.message);
    if (!links || links.length === 0) return [];

    const projectIds = [...new Set(links.map((l) => l.project_id))];

    const { data: projects, error: projectError } = await createClient()
      .from("projects")
      .select("id, name")
      .eq("user_id", userId)
      .in("id", projectIds);

    if (projectError) throw new DatabaseError(projectError.message);

    const projectNameMap: Record<string, string> = {};
    for (const p of projects ?? []) {
      projectNameMap[p.id] = p.name;
    }

    const contactIds = [...new Set(links.map((l) => l.contact_id))];
    const { data: contacts, error: contactError } = await createClient()
      .from("contacts")
      .select(CONTACT_SELECT)
      .eq("user_id", userId)
      .in("id", contactIds);

    if (contactError) throw new DatabaseError(contactError.message);

    const contactMap: Record<string, Contact> = {};
    for (const c of contacts ?? []) {
      contactMap[c.id] = c;
    }

    const grouped: Record<string, Contact[]> = {};
    for (const link of links) {
      const contact = contactMap[link.contact_id];
      if (!contact) continue;
      if (!grouped[link.project_id]) grouped[link.project_id] = [];
      grouped[link.project_id].push(contact);
    }

    return Object.entries(grouped)
      .map(([projectId, projectContacts]) => ({
        projectId,
        projectName: projectNameMap[projectId] ?? "Unknown Project",
        contacts: projectContacts,
      }))
      .sort((a, b) => a.projectName.localeCompare(b.projectName));
  },

  async getByTask(userId: string, taskId: string): Promise<ContactTask[]> {
    const { data, error } = await createClient()
      .from("contact_tasks")
      .select("contact_id, task_id, role_in_task")
      .eq("task_id", taskId);

    if (error) throw new DatabaseError(error.message);
    return data || [];
  },

  getByGroupSync(contacts: Contact[]): Record<string, Contact[]> {
    const grouped: Record<string, Contact[]> = {};
    for (const contact of contacts) {
      const key = contact.group ?? "Ungrouped";
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(contact);
    }
    return grouped;
  },
};