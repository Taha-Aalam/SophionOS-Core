import { createClient } from "../supabase/client";
import type {
  Contact,
  ContactLog,
  ContactProject,
  ContactTask,
  CreateContactInput,
  CreateContactLogInput,
  FollowUpStatus,
  UpdateContactInput,
} from "../types/domain.types";
import { createContactSchema, updateContactSchema } from "../validators/contact.schema";
import { DatabaseError, NotFoundError } from "../api/error-handler";
import { LIST_SAFETY_CAP } from "../utils/constants";

const CONTACT_SELECT =
  "id, user_id, name, slug, role, organization, group, phone, email, linkedin, website, last_interaction_at, follow_up_interval_days, favorite, notes, archive, image_url, metadata, created_at, updated_at";

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
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
}

function computeDaysUntilFollowUp(
  lastInteractionAt: string | null | undefined,
  intervalDays: number | null | undefined,
): number | null {
  if (!intervalDays || intervalDays === 0) return null;
  if (!lastInteractionAt) return -intervalDays;
  const lastDate = new Date(lastInteractionAt);
  const now = new Date();
  const daysSince = (now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24);
  return Math.round(intervalDays - daysSince);
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

function getContactImagePath(imageUrl: string | null | undefined): string | null {
  if (!imageUrl) return null;

  const marker = "/storage/v1/object/public/contact-avatars/";
  const index = imageUrl.indexOf(marker);
  if (index !== -1) {
    const rawPath = imageUrl.slice(index + marker.length);
    return rawPath ? decodeURIComponent(rawPath) : null;
  }

  // Already a bare object path (e.g. "<user_id>/<contact_id>.png"). Reject
  // anything carrying a URI scheme (http://, javascript:, data:, …) — a
  // storage path never contains a scheme colon.
  if (/^[a-z][a-z0-9+.-]*:/i.test(imageUrl)) return null;
  return imageUrl;
}

const SIGNED_URL_TTL_SECONDS = 3600;

/** Resolve a short-lived signed URL for a single stored image path/URL. */
async function signContactImage(
  imageUrl: string | null | undefined,
): Promise<string | null> {
  const path = getContactImagePath(imageUrl);
  if (!path) return null;

  const { data } = await createClient()
    .storage
    .from("contact-avatars")
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);

  return data?.signedUrl ?? null;
}

/** Attach `image_display_url` (signed) to a batch of contacts in one call. */
async function attachSignedImageUrls(contacts: Contact[]): Promise<Contact[]> {
  const pathByContact = new Map<string, string>();
  for (const contact of contacts) {
    const path = getContactImagePath(contact.image_url);
    if (path) pathByContact.set(contact.id, path);
  }

  const paths = Array.from(new Set(pathByContact.values()));
  if (paths.length === 0) {
    return contacts.map((contact) => ({ ...contact, image_display_url: null }));
  }

  const { data } = await createClient()
    .storage
    .from("contact-avatars")
    .createSignedUrls(paths, SIGNED_URL_TTL_SECONDS);

  const signedByPath = new Map<string, string>();
  for (const item of data ?? []) {
    if (item.path && item.signedUrl) signedByPath.set(item.path, item.signedUrl);
  }

  return contacts.map((contact) => {
    const path = pathByContact.get(contact.id);
    return {
      ...contact,
      image_display_url: path ? signedByPath.get(path) ?? null : null,
    };
  });
}

export const contactService = {
  computeFollowUpStatus,
  computeDaysSinceInteraction,
  computeDaysUntilFollowUp,
  getContactImagePath,
  signContactImage,

  async deleteContactImage(imageUrl: string | null | undefined): Promise<void> {
    const path = getContactImagePath(imageUrl);
    if (!path) return;

    const { error } = await createClient()
      .storage
      .from("contact-avatars")
      .remove([path]);

    if (error) throw new DatabaseError(error.message);
  },

  /**
   * Upload an avatar and return the stored object PATH (not a URL). The bucket
   * is private; callers resolve a signed URL for display via
   * `signContactImage` / `image_display_url`.
   */
  async uploadContactImage(userId: string, contactId: string, file: File): Promise<string> {
    const client = createClient();
    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `${userId}/${contactId}.${ext}`;

    const { error } = await client.storage
      .from("contact-avatars")
      .upload(path, file, { upsert: true, contentType: file.type });

    if (error) throw new DatabaseError(error.message);

    return path;
  },

  async list(
    userId: string,
    filters?: { group?: string; archive?: boolean },
    options?: { offset?: number; limit?: number },
  ): Promise<Contact[]> {
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

    // Opt-in pagination: a requested page fetches exactly that window;
    // otherwise fall back to the safety cap (unbounded lists scale poorly).
    if (options?.limit !== undefined) {
      const offset = options.offset ?? 0;
      query = query.range(offset, offset + options.limit - 1);
    } else {
      query = query.limit(LIST_SAFETY_CAP);
    }

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

    return attachSignedImageUrls(
      data.map((contact) => ({
        ...contact,
        linkedAreaIds: areaIdsByContact.get(contact.id) ?? [],
        linkedGoalIds: goalIdsByContact.get(contact.id) ?? [],
        linkedProjectIds: projectIdsByContact.get(contact.id) ?? [],
        linkedTaskIds: taskIdsByContact.get(contact.id) ?? [],
      })),
    );
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
    return { ...data, image_display_url: await signContactImage(data.image_url) };
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
      image_display_url: await signContactImage(data.image_url),
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

    return { ...contact, image_display_url: await signContactImage(contact.image_url) };
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

  async getAreaLinks(userId: string, contactId: string): Promise<{ contact_id: string; area_id: string }[]> {
    await this.getById(userId, contactId);
    const { data, error } = await createClient()
      .from("contact_areas")
      .select("contact_id, area_id")
      .eq("contact_id", contactId);

    if (error) throw new DatabaseError(error.message);
    return data || [];
  },

  async getGoalLinks(userId: string, contactId: string): Promise<{ contact_id: string; goal_id: string }[]> {
    await this.getById(userId, contactId);
    const { data, error } = await createClient()
      .from("contact_goals")
      .select("contact_id, goal_id")
      .eq("contact_id", contactId);

    if (error) throw new DatabaseError(error.message);
    return data || [];
  },

  async linkToArea(userId: string, contactId: string, areaId: string): Promise<void> {
    await this.getById(userId, contactId);
    const { error } = await createClient()
      .from("contact_areas")
      .upsert(
        { contact_id: contactId, area_id: areaId },
        { onConflict: "contact_id,area_id" },
      );
    if (error) throw new DatabaseError(error.message);
  },

  async unlinkFromArea(userId: string, contactId: string, areaId: string): Promise<void> {
    await this.getById(userId, contactId);
    const { error } = await createClient()
      .from("contact_areas")
      .delete()
      .eq("contact_id", contactId)
      .eq("area_id", areaId);
    if (error) throw new DatabaseError(error.message);
  },

  async linkToGoal(userId: string, contactId: string, goalId: string): Promise<void> {
    await this.getById(userId, contactId);
    const { error } = await createClient()
      .from("contact_goals")
      .upsert(
        { contact_id: contactId, goal_id: goalId },
        { onConflict: "contact_id,goal_id" },
      );
    if (error) throw new DatabaseError(error.message);
  },

  async unlinkFromGoal(userId: string, contactId: string, goalId: string): Promise<void> {
    await this.getById(userId, contactId);
    const { error } = await createClient()
      .from("contact_goals")
      .delete()
      .eq("contact_id", contactId)
      .eq("goal_id", goalId);
    if (error) throw new DatabaseError(error.message);
  },

  async getBySlug(userId: string, slug: string): Promise<Contact> {
    const { data, error } = await createClient()
      .from("contacts")
      .select(CONTACT_SELECT)
      .eq("user_id", userId)
      .eq("slug", slug)
      .single();

    if (error) {
      if (error.code === "PGRST116") throw new NotFoundError("Contact", slug);
      throw new DatabaseError(error.message);
    }
    return data;
  },

  async getByGoal(userId: string, goalId: string): Promise<{ contact_id: string; goal_id: string }[]> {
    const { data, error } = await createClient()
      .from("contact_goals")
      .select("contact_id, goal_id")
      .eq("goal_id", goalId);
    if (error) throw new DatabaseError(error.message);
    return data || [];
  },

  async getByArea(userId: string, areaId: string): Promise<{ contact_id: string; area_id: string }[]> {
    const { data, error } = await createClient()
      .from("contact_areas")
      .select("contact_id, area_id")
      .eq("area_id", areaId);
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

  async getContactsGroupedByArea(userId: string): Promise<Array<{ areaId: string; areaName: string; contacts: Contact[] }>> {
    const client = createClient();
    const { data: contacts } = await client
      .from("contacts")
      .select(`${CONTACT_SELECT}, contact_areas(area_id, areas(id, name))`)
      .eq("user_id", userId)
      .eq("archive", false)
      .order("name");

    if (!contacts) return [];

    const areaMap = new Map<string, { areaId: string; areaName: string; contacts: Contact[] }>();
    for (const raw of contacts) {
      const row = raw as Record<string, unknown>;
      const areas = (row.contact_areas as Array<Record<string, unknown>>) ?? [];
      for (const link of areas) {
        const areaId = link.area_id as string;
        const areaName = (link.areas as Record<string, string>)?.name ?? areaId;
        if (!areaMap.has(areaId)) {
          areaMap.set(areaId, { areaId, areaName, contacts: [] });
        }
        const contact = Object.fromEntries(
          Object.entries(row).filter(([k]) => k !== "contact_areas"),
        );
        areaMap.get(areaId)!.contacts.push(contact as unknown as Contact);
      }
    }
    return Array.from(areaMap.values()).sort((a, b) => a.areaName.localeCompare(b.areaName));
  },

  async getContactsGroupedByGoal(userId: string): Promise<Array<{ goalId: string; goalName: string; contacts: Contact[] }>> {
    const client = createClient();
    const { data: contacts } = await client
      .from("contacts")
      .select(`${CONTACT_SELECT}, contact_goals(goal_id, goals(id, name))`)
      .eq("user_id", userId)
      .eq("archive", false)
      .order("name");

    if (!contacts) return [];

    const goalMap = new Map<string, { goalId: string; goalName: string; contacts: Contact[] }>();
    for (const raw of contacts) {
      const row = raw as Record<string, unknown>;
      const goals = (row.contact_goals as Array<Record<string, unknown>>) ?? [];
      for (const link of goals) {
        const goalId = link.goal_id as string;
        const goalName = (link.goals as Record<string, string>)?.name ?? goalId;
        if (!goalMap.has(goalId)) {
          goalMap.set(goalId, { goalId, goalName, contacts: [] });
        }
        const contact = Object.fromEntries(
          Object.entries(row).filter(([k]) => k !== "contact_goals"),
        );
        goalMap.get(goalId)!.contacts.push(contact as unknown as Contact);
      }
    }
    return Array.from(goalMap.values()).sort((a, b) => a.goalName.localeCompare(b.goalName));
  },

  async listLogs(userId: string, contactId: string): Promise<ContactLog[]> {
    const client = createClient();
    const { data, error } = await client
      .from("contact_logs")
      .select("*")
      .eq("user_id", userId)
      .eq("contact_id", contactId)
      .order("logged_at", { ascending: false });
    if (error) throw new DatabaseError(error.message);
    return (data ?? []) as ContactLog[];
  },

  async createLog(userId: string, contactId: string, input: CreateContactLogInput): Promise<ContactLog> {
    const client = createClient();
    const { data, error } = await client
      .from("contact_logs")
      .insert({ user_id: userId, contact_id: contactId, message: input.message })
      .select("id, contact_id, user_id, message, logged_at, created_at")
      .single();
    if (error) throw new DatabaseError(error.message);

    // Update last_interaction_at on the contact
    await client
      .from("contacts")
      .update({ last_interaction_at: data.logged_at })
      .eq("user_id", userId)
      .eq("id", contactId);

    return data as ContactLog;
  },
};