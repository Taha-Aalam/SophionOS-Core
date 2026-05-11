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
  if (intervalDays === null || intervalDays === undefined || intervalDays === 0) return "ON TRACK";
  if (!lastInteractionAt) return "FOLLOW UP";
  const lastDate = new Date(lastInteractionAt);
  const now = new Date();
  const diffMs = now.getTime() - lastDate.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  return diffDays <= intervalDays ? "ON TRACK" : "FOLLOW UP";
}

function computeDaysSinceInteraction(lastInteractionAt: string | null | undefined): number | null {
  if (!lastInteractionAt) return null;
  const lastDate = new Date(lastInteractionAt);
  const now = new Date();
  const diffMs = now.getTime() - lastDate.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

async function syncContactLinks(
  contactId: string,
  links: {
    area_ids?: string[];
    goal_ids?: string[];
    project_ids?: string[];
    task_ids?: string[];
  },
): Promise<void> {
  const client = createClient();

  if (links.area_ids !== undefined) {
    await client.from("contact_areas").delete().eq("contact_id", contactId);
    if (links.area_ids.length > 0) {
      await client
        .from("contact_areas")
        .insert(links.area_ids.map((area_id) => ({ contact_id: contactId, area_id })));
    }
  }

  if (links.goal_ids !== undefined) {
    await client.from("contact_goals").delete().eq("contact_id", contactId);
    if (links.goal_ids.length > 0) {
      await client
        .from("contact_goals")
        .insert(links.goal_ids.map((goal_id) => ({ contact_id: contactId, goal_id })));
    }
  }

  if (links.project_ids !== undefined) {
    await client.from("contact_projects").delete().eq("contact_id", contactId);
    if (links.project_ids.length > 0) {
      await client
        .from("contact_projects")
        .insert(
          links.project_ids.map((project_id) => ({
            contact_id: contactId,
            project_id,
            role_in_project: null,
          })),
        );
    }
  }

  if (links.task_ids !== undefined) {
    await client.from("contact_tasks").delete().eq("contact_id", contactId);
    if (links.task_ids.length > 0) {
      await client
        .from("contact_tasks")
        .insert(
          links.task_ids.map((task_id) => ({
            contact_id: contactId,
            task_id,
            role_in_task: null,
          })),
        );
    }
  }
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
    if (!data || data.length === 0) return [];

    const contactIds = data.map((c) => c.id);
    const client = createClient();

    const [areasRes, goalsRes, projectsRes, tasksRes] = await Promise.all([
      client.from("contact_areas").select("contact_id, area_id").in("contact_id", contactIds),
      client.from("contact_goals").select("contact_id, goal_id").in("contact_id", contactIds),
      client.from("contact_projects").select("contact_id, project_id").in("contact_id", contactIds),
      client.from("contact_tasks").select("contact_id, task_id").in("contact_id", contactIds),
    ]);

    const areaIdsByContact = new Map<string, string[]>();
    for (const row of (areasRes.data ?? [])) {
      const current = areaIdsByContact.get(row.contact_id) ?? [];
      current.push(row.area_id);
      areaIdsByContact.set(row.contact_id, current);
    }

    const goalIdsByContact = new Map<string, string[]>();
    for (const row of (goalsRes.data ?? [])) {
      const current = goalIdsByContact.get(row.contact_id) ?? [];
      current.push(row.goal_id);
      goalIdsByContact.set(row.contact_id, current);
    }

    const projectIdsByContact = new Map<string, string[]>();
    for (const row of (projectsRes.data ?? [])) {
      const current = projectIdsByContact.get(row.contact_id) ?? [];
      current.push(row.project_id);
      projectIdsByContact.set(row.contact_id, current);
    }

    const taskIdsByContact = new Map<string, string[]>();
    for (const row of (tasksRes.data ?? [])) {
      const current = taskIdsByContact.get(row.contact_id) ?? [];
      current.push(row.task_id);
      taskIdsByContact.set(row.contact_id, current);
    }

    return data.map((contact) => ({
      ...contact,
      linkedAreaIds: areaIdsByContact.get(contact.id) ?? [],
      linkedGoalIds: goalIdsByContact.get(contact.id) ?? [],
      linkedProjectIds: projectIdsByContact.get(contact.id) ?? [],
      linkedTaskIds: taskIdsByContact.get(contact.id) ?? [],
    }));
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
    // Strip link arrays from DB payload
    const { area_ids, goal_ids, project_ids, task_ids, ...dbPayload } = validated as typeof validated & {
      area_ids?: string[];
      goal_ids?: string[];
      project_ids?: string[];
      task_ids?: string[];
    };

    const { data, error } = await createClient()
      .from("contacts")
      .insert({ ...dbPayload, user_id: userId })
      .select(CONTACT_SELECT)
      .single();

    if (error) throw new DatabaseError(error.message);

    await syncContactLinks(data.id, {
      area_ids: area_ids ?? input.area_ids ?? [],
      goal_ids: goal_ids ?? input.goal_ids ?? [],
      project_ids: project_ids ?? input.project_ids ?? [],
      task_ids: task_ids ?? input.task_ids ?? [],
    });

    return {
      ...data,
      linkedAreaIds: input.area_ids ?? [],
      linkedGoalIds: input.goal_ids ?? [],
      linkedProjectIds: input.project_ids ?? [],
      linkedTaskIds: input.task_ids ?? [],
    };
  },

  async update(userId: string, id: string, input: UpdateContactInput): Promise<Contact> {
    const validated = updateContactSchema.parse(input);
    const { area_ids, goal_ids, project_ids, task_ids, ...dbPayload } = validated as typeof validated & {
      area_ids?: string[];
      goal_ids?: string[];
      project_ids?: string[];
      task_ids?: string[];
    };

    const hasUpdates = Object.keys(dbPayload).length > 0;

    const contact = hasUpdates
      ? await (async () => {
          const { data, error } = await createClient()
            .from("contacts")
            .update(dbPayload)
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

    await syncContactLinks(id, {
      ...(area_ids !== undefined && { area_ids }),
      ...(goal_ids !== undefined && { goal_ids }),
      ...(project_ids !== undefined && { project_ids }),
      ...(task_ids !== undefined && { task_ids }),
    });

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