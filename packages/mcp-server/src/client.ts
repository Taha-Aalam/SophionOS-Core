/**
 * Typed HTTP client for the SophionOS Core REST API (`/api/v1`).
 *
 * Auth: every request carries `Authorization: Bearer <sop_…>`. The SophionOS API
 * resolves the key to a Clerk user id server-side and applies RLS.
 *
 * Envelope handling (see api-response.ts in the web app):
 *   - success/created → `{ data }`            → returns `data`
 *   - paginated       → `{ data, pagination }` → returns `{ data, pagination }`
 *   - error           → `{ error: { code, message } }` → throws SophionOSApiError
 */

import {
  SophionOSApiError,
  type PaginatedEnvelope,
  type SuccessEnvelope,
} from "./types.js";

type QueryValue = string | number | boolean | undefined | null;
type Query = Record<string, QueryValue>;

export interface SophionOSClientOptions {
  /** Base origin of the SophionOS app, e.g. `https://app.sophionos.example`. No trailing slash. */
  baseUrl: string;
  /** SophionOS API key (`sop_…`). */
  apiKey: string;
  /** Optional fetch override (tests). Defaults to global fetch. */
  fetchImpl?: typeof fetch;
}

export class SophionOSClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly fetchImpl: typeof fetch;

  constructor(options: SophionOSClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, "");
    this.apiKey = options.apiKey;
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  // ---- low-level request --------------------------------------------------

  private buildUrl(path: string, query?: Query): string {
    // Defense in depth 1: reject dot segments BEFORE new URL() collapses
    // them ("./.." ids would otherwise silently rewrite the route).
    const segments = path.split("?")[0].split("/");
    if (segments.some((s) => decodeURIComponent(s) === "." || decodeURIComponent(s) === "..")) {
      throw new Error(
        `Refusing path with dot segment (route traversal): ${path}`,
      );
    }
    const url = new URL(`${this.baseUrl}/api/v1${path}`);
    // Defense in depth 2: the final pathname must stay under the API root.
    if (!url.pathname.startsWith("/api/v1/")) {
      throw new Error(`Refusing to build URL outside /api/v1: ${url.pathname}`);
    }
    if (query) {
      for (const [key, value] of Object.entries(query)) {
        if (value !== undefined && value !== null) {
          url.searchParams.set(key, String(value));
        }
      }
    }
    return url.toString();
  }

  private async request<T>(
    method: string,
    path: string,
    opts: { query?: Query; body?: unknown } = {},
  ): Promise<T> {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.apiKey}`,
      Accept: "application/json",
    };
    const init: RequestInit = { method, headers };
    if (opts.body !== undefined) {
      headers["Content-Type"] = "application/json";
      init.body = JSON.stringify(opts.body);
    }

    const res = await this.fetchImpl(this.buildUrl(path, opts.query), init);

    let json: unknown = null;
    const text = await res.text();
    if (text) {
      try {
        json = JSON.parse(text);
      } catch {
        json = null;
      }
    }

    if (!res.ok) {
      const err = (json as { error?: { code?: string; message?: string } })
        ?.error;
      throw new SophionOSApiError(
        res.status,
        err?.code ?? "HTTP_ERROR",
        err?.message ?? `Request failed with status ${res.status}`,
      );
    }

    return json as T;
  }

  /** Unwrap a `{ data }` envelope. */
  private async get<T>(path: string, query?: Query): Promise<T> {
    const env = await this.request<SuccessEnvelope<T>>("GET", path, { query });
    return env.data;
  }

  private async post<T>(path: string, body?: unknown, query?: Query): Promise<T> {
    const env = await this.request<SuccessEnvelope<T>>("POST", path, {
      body: body ?? {},
      query,
    });
    return env.data;
  }

  private async put<T>(path: string, body?: unknown): Promise<T> {
    const env = await this.request<SuccessEnvelope<T>>("PUT", path, {
      body: body ?? {},
    });
    return env.data;
  }

  private async patch<T>(path: string, body: unknown): Promise<T> {
    const env = await this.request<SuccessEnvelope<T>>("PATCH", path, { body });
    return env.data;
  }

  private async del<T>(
    path: string,
    opts: { query?: Query; body?: unknown } = {},
  ): Promise<T> {
    const env = await this.request<SuccessEnvelope<T>>("DELETE", path, opts);
    return env.data;
  }

  /** Return the full paginated envelope (`{ data, pagination }`). */
  private async list<T>(
    path: string,
    query?: Query,
  ): Promise<PaginatedEnvelope<T>> {
    return this.request<PaginatedEnvelope<T>>("GET", path, { query });
  }

  // ---- areas --------------------------------------------------------------

  areas = {
    list: (q?: {
      grouped?: boolean;
      inactive?: boolean;
      archive?: boolean;
      type?: string;
      page?: number;
      pageSize?: number;
    }) => this.list("/areas", q),
    get: (id: string) => this.get(`/areas/${encodeURIComponent(id)}`),
    create: (body: Record<string, unknown>) => this.post("/areas", body),
    update: (id: string, body: Record<string, unknown>) =>
      this.patch(`/areas/${encodeURIComponent(id)}`, body),
    delete: (id: string) => this.del(`/areas/${encodeURIComponent(id)}`),
    archive: (id: string) => this.post(`/areas/${encodeURIComponent(id)}/archive`),
    restore: (id: string) => this.post(`/areas/${encodeURIComponent(id)}/restore`),
  };

  // ---- goals --------------------------------------------------------------

  goals = {
    list: (q?: {
      term?: string;
      status?: string;
      area_id?: string;
      priority?: string;
      archive?: boolean;
      completed?: boolean;
      inactive?: boolean;
      page?: number;
      pageSize?: number;
    }) => this.list("/goals", q),
    get: (id: string) => this.get(`/goals/${encodeURIComponent(id)}`),
    create: (body: Record<string, unknown>) => this.post("/goals", body),
    update: (id: string, body: Record<string, unknown>) =>
      this.patch(`/goals/${encodeURIComponent(id)}`, body),
    delete: (id: string) => this.del(`/goals/${encodeURIComponent(id)}`),
    archive: (id: string) => this.post(`/goals/${encodeURIComponent(id)}/archive`),
    restore: (id: string) => this.post(`/goals/${encodeURIComponent(id)}/restore`),
    listAreas: (id: string) => this.get(`/goals/${encodeURIComponent(id)}/areas`),
    linkArea: (id: string, area_id: string) =>
      this.post(`/goals/${encodeURIComponent(id)}/areas`, { area_id }),
    unlinkArea: (id: string, area_id: string) =>
      this.del(`/goals/${encodeURIComponent(id)}/areas`, { query: { area_id } }), // query-param style
  };

  // ---- projects -----------------------------------------------------------

  projects = {
    list: (q?: {
      status?: string;
      area_id?: string;
      goal_id?: string;
      contact_id?: string;
      archive?: boolean;
      group_by?: "area" | "status";
      page?: number;
      pageSize?: number;
    }) => this.list("/projects", q),
    get: (id: string) => this.get(`/projects/${encodeURIComponent(id)}`),
    create: (body: Record<string, unknown>) => this.post("/projects", body),
    update: (id: string, body: Record<string, unknown>) =>
      this.patch(`/projects/${encodeURIComponent(id)}`, body),
    delete: (id: string) => this.del(`/projects/${encodeURIComponent(id)}`),
    archive: (id: string) => this.post(`/projects/${encodeURIComponent(id)}/archive`),
    restore: (id: string) => this.post(`/projects/${encodeURIComponent(id)}/restore`),
    listAreas: (id: string) => this.get(`/projects/${encodeURIComponent(id)}/areas`),
    linkArea: (id: string, area_id: string) =>
      this.post(`/projects/${encodeURIComponent(id)}/areas`, { area_id }),
    unlinkArea: (id: string, area_id: string) =>
      this.del(`/projects/${encodeURIComponent(id)}/areas`, { query: { area_id } }), // query-param style
    listGoals: (id: string) => this.get(`/projects/${encodeURIComponent(id)}/goals`),
    linkGoal: (id: string, goal_id: string) =>
      this.post(`/projects/${encodeURIComponent(id)}/goals`, { goal_id }),
    unlinkGoal: (id: string, goal_id: string) =>
      this.del(`/projects/${encodeURIComponent(id)}/goals`, { query: { goal_id } }), // query-param style
  };

  // ---- tasks --------------------------------------------------------------

  tasks = {
    list: (q?: {
      status?: string;
      priority?: string;
      area_id?: string;
      project_id?: string;
      goal_id?: string;
      contact_id?: string;
      focused?: boolean;
      overdue?: boolean;
      upcoming?: boolean;
      due_date_from?: string;
      due_date_to?: string;
      sort?: string;
      page?: number;
      pageSize?: number;
    }) => this.list("/tasks", q),
    get: (id: string) => this.get(`/tasks/${encodeURIComponent(id)}`),
    create: (body: Record<string, unknown>) => this.post("/tasks", body),
    update: (id: string, body: Record<string, unknown>) =>
      this.patch(`/tasks/${encodeURIComponent(id)}`, body),
    delete: (id: string) => this.del(`/tasks/${encodeURIComponent(id)}`),
    archive: (id: string) => this.post(`/tasks/${encodeURIComponent(id)}/archive`),
    restore: (id: string) => this.post(`/tasks/${encodeURIComponent(id)}/restore`),
    listAreas: (id: string) => this.get(`/tasks/${encodeURIComponent(id)}/areas`),
    linkArea: (id: string, area_id: string) =>
      this.post(`/tasks/${encodeURIComponent(id)}/areas`, { area_id }),
    unlinkArea: (id: string, area_id: string) =>
      this.del(`/tasks/${encodeURIComponent(id)}/areas`, { body: { area_id } }), // body style
    listGoals: (id: string) => this.get(`/tasks/${encodeURIComponent(id)}/goals`),
    linkGoal: (id: string, goal_id: string) =>
      this.post(`/tasks/${encodeURIComponent(id)}/goals`, { goal_id }),
    unlinkGoal: (id: string, goal_id: string) =>
      this.del(`/tasks/${encodeURIComponent(id)}/goals`, { body: { goal_id } }), // body style
    listProjects: (id: string) => this.get(`/tasks/${encodeURIComponent(id)}/projects`),
    linkProject: (id: string, project_id: string) =>
      this.post(`/tasks/${encodeURIComponent(id)}/projects`, { project_id }),
    unlinkProject: (id: string, project_id: string) =>
      this.del(`/tasks/${encodeURIComponent(id)}/projects`, { body: { project_id } }), // body style
    bulkComplete: (ids: string[]) =>
      this.post("/tasks/bulk/complete", { ids }),
    bulkArchive: (ids: string[]) => this.post("/tasks/bulk/archive", { ids }),
    bulkDelete: (ids: string[]) => this.post("/tasks/bulk/delete", { ids }),
  };

  // ---- notes --------------------------------------------------------------

  notes = {
    list: (q?: {
      notebook?: string;
      goal_id?: string;
      topic_id?: string;
      project_id?: string;
      area_id?: string;
      status?: string;
      favorite?: boolean;
      pinned?: boolean;
      type?: string;
      group_by?: "notebook" | "status" | "type";
      page?: number;
      pageSize?: number;
    }) => this.list("/notes", q),
    get: (id: string) => this.get(`/notes/${encodeURIComponent(id)}`),
    create: (body: Record<string, unknown>) => this.post("/notes", body),
    update: (id: string, body: Record<string, unknown>) =>
      this.patch(`/notes/${encodeURIComponent(id)}`, body),
    delete: (id: string) => this.del(`/notes/${encodeURIComponent(id)}`),
    archive: (id: string) => this.post(`/notes/${encodeURIComponent(id)}/archive`),
    restore: (id: string) => this.post(`/notes/${encodeURIComponent(id)}/restore`),
    related: (id: string) => this.get(`/notes/${encodeURIComponent(id)}/related`),
    listAreas: (id: string) => this.get(`/notes/${encodeURIComponent(id)}/areas`),
    linkArea: (id: string, area_id: string) =>
      this.post(`/notes/${encodeURIComponent(id)}/areas`, { area_id }),
    unlinkArea: (id: string, area_id: string) =>
      this.del(`/notes/${encodeURIComponent(id)}/areas`, { query: { area_id } }), // query-param style
    listProjects: (id: string) => this.get(`/notes/${encodeURIComponent(id)}/projects`),
    linkProject: (id: string, project_id: string) =>
      this.post(`/notes/${encodeURIComponent(id)}/projects`, { project_id }),
    unlinkProject: (id: string, project_id: string) =>
      this.del(`/notes/${encodeURIComponent(id)}/projects`, { query: { project_id } }), // query-param style
    listGoals: (id: string) => this.get(`/notes/${encodeURIComponent(id)}/goals`),
    linkGoal: (id: string, goal_id: string) =>
      this.post(`/notes/${encodeURIComponent(id)}/goals`, { goal_id }),
    unlinkGoal: (id: string, goal_id: string) =>
      this.del(`/notes/${encodeURIComponent(id)}/goals`, { query: { goal_id } }), // query-param style
    listTasks: (id: string) => this.get(`/notes/${encodeURIComponent(id)}/tasks`),
    linkTask: (id: string, task_id: string) =>
      this.post(`/notes/${encodeURIComponent(id)}/tasks`, { task_id }),
    unlinkTask: (id: string, task_id: string) =>
      this.del(`/notes/${encodeURIComponent(id)}/tasks`, { query: { task_id } }), // query-param style
    listTopics: (id: string) => this.get(`/notes/${encodeURIComponent(id)}/topics`),
    setTopic: (id: string, topic_id: string) =>
      this.post(`/notes/${encodeURIComponent(id)}/topics`, { topic_id }),
    clearTopic: (id: string) => this.del(`/notes/${encodeURIComponent(id)}/topics`),
    listNotebooks: (id: string) => this.get(`/notes/${encodeURIComponent(id)}/notebooks`),
    replaceNotebooks: (id: string, notebooks: string[]) =>
      this.put(`/notes/${encodeURIComponent(id)}/notebooks`, { notebooks }), // PUT replace
    addNotebook: (id: string, notebook: string) =>
      this.post(`/notes/${encodeURIComponent(id)}/notebooks`, { notebook }),
    removeNotebook: (id: string, notebook: string) =>
      this.del(`/notes/${encodeURIComponent(id)}/notebooks`, { query: { notebook } }), // query-param style
    // collection-level
    allNotebooks: () => this.get<string[]>("/notes/notebooks"),
    types: () => this.get("/notes/types"),
    bulkArchive: (ids: string[]) => this.post("/notes/bulk/archive", { ids }),
    bulkDelete: (ids: string[]) => this.post("/notes/bulk/delete", { ids }),
    bulkUpdateStatus: (ids: string[], status: string) =>
      this.post("/notes/bulk/update-status", { ids, status }),
  };

  // ---- resources ----------------------------------------------------------

  resources = {
    list: (q?: {
      status?: string;
      favorite?: boolean;
      type?: string;
      area_id?: string;
      goal_id?: string;
      project_id?: string;
      topic_id?: string;
      group_by?: string;
      page?: number;
      pageSize?: number;
    }) => this.list("/resources", q),
    get: (id: string) => this.get(`/resources/${encodeURIComponent(id)}`),
    create: (body: Record<string, unknown>) => this.post("/resources", body),
    update: (id: string, body: Record<string, unknown>) =>
      this.patch(`/resources/${encodeURIComponent(id)}`, body),
    delete: (id: string) => this.del(`/resources/${encodeURIComponent(id)}`),
    archive: (id: string) => this.post(`/resources/${encodeURIComponent(id)}/archive`),
    restore: (id: string) => this.post(`/resources/${encodeURIComponent(id)}/restore`),
    listAreas: (id: string) => this.get(`/resources/${encodeURIComponent(id)}/areas`),
    linkArea: (id: string, area_id: string) =>
      this.post(`/resources/${encodeURIComponent(id)}/areas`, { area_id }),
    unlinkArea: (id: string, area_id: string) =>
      this.del(`/resources/${encodeURIComponent(id)}/areas`, { body: { area_id } }), // body style
    listProjects: (id: string) => this.get(`/resources/${encodeURIComponent(id)}/projects`),
    linkProject: (id: string, project_id: string) =>
      this.post(`/resources/${encodeURIComponent(id)}/projects`, { project_id }),
    unlinkProject: (id: string, project_id: string) =>
      this.del(`/resources/${encodeURIComponent(id)}/projects`, { body: { project_id } }), // body style
    listGoals: (id: string) => this.get(`/resources/${encodeURIComponent(id)}/goals`),
    linkGoal: (id: string, goal_id: string) =>
      this.post(`/resources/${encodeURIComponent(id)}/goals`, { goal_id }),
    unlinkGoal: (id: string, goal_id: string) =>
      this.del(`/resources/${encodeURIComponent(id)}/goals`, { body: { goal_id } }), // body style
    listTasks: (id: string) => this.get(`/resources/${encodeURIComponent(id)}/tasks`),
    linkTask: (id: string, task_id: string) =>
      this.post(`/resources/${encodeURIComponent(id)}/tasks`, { task_id }),
    unlinkTask: (id: string, task_id: string) =>
      this.del(`/resources/${encodeURIComponent(id)}/tasks`, { body: { task_id } }), // body style
  };

  // ---- topics -------------------------------------------------------------

  topics = {
    list: (q?: {
      grouped?: boolean;
      archive?: boolean;
      favorite?: boolean;
      inactive?: boolean;
      page?: number;
      pageSize?: number;
    }) => this.list("/topics", q),
    get: (id: string) => this.get(`/topics/${encodeURIComponent(id)}`),
    create: (body: Record<string, unknown>) => this.post("/topics", body),
    update: (id: string, body: Record<string, unknown>) =>
      this.patch(`/topics/${encodeURIComponent(id)}`, body),
    delete: (id: string) => this.del(`/topics/${encodeURIComponent(id)}`),
    archive: (id: string) => this.post(`/topics/${encodeURIComponent(id)}/archive`),
    restore: (id: string) => this.post(`/topics/${encodeURIComponent(id)}/restore`),
  };

  // ---- contacts -----------------------------------------------------------

  contacts = {
    list: (q?: {
      follow_up?: boolean;
      group?: string;
      archive?: boolean;
      favorite?: boolean;
      page?: number;
      pageSize?: number;
    }) => this.list("/contacts", q),
    get: (id: string) => this.get(`/contacts/${encodeURIComponent(id)}`),
    create: (body: Record<string, unknown>) => this.post("/contacts", body),
    update: (id: string, body: Record<string, unknown>) =>
      this.patch(`/contacts/${encodeURIComponent(id)}`, body),
    delete: (id: string) => this.del(`/contacts/${encodeURIComponent(id)}`),
    archive: (id: string) => this.post(`/contacts/${encodeURIComponent(id)}/archive`),
    restore: (id: string) => this.post(`/contacts/${encodeURIComponent(id)}/restore`),
    log: (id: string, message?: string) =>
      this.post(`/contacts/${encodeURIComponent(id)}/log`, message ? { message } : {}),
    logHistory: (id: string) => this.get(`/contacts/${encodeURIComponent(id)}/log`),
    groups: () => this.list("/contacts/groups"),
    groupedByArea: () => this.list("/contacts/grouped-by-area"),
    groupedByGoal: () => this.list("/contacts/grouped-by-goal"),
    listAreas: (id: string) => this.get(`/contacts/${encodeURIComponent(id)}/areas`),
    linkArea: (id: string, area_id: string) =>
      this.post(`/contacts/${encodeURIComponent(id)}/areas`, { area_id }),
    unlinkArea: (id: string, area_id: string) =>
      this.del(`/contacts/${encodeURIComponent(id)}/areas`, { query: { area_id } }), // query-param style
    listGoals: (id: string) => this.get(`/contacts/${encodeURIComponent(id)}/goals`),
    linkGoal: (id: string, goal_id: string) =>
      this.post(`/contacts/${encodeURIComponent(id)}/goals`, { goal_id }),
    unlinkGoal: (id: string, goal_id: string) =>
      this.del(`/contacts/${encodeURIComponent(id)}/goals`, { query: { goal_id } }), // query-param style
    listProjects: (id: string) => this.get(`/contacts/${encodeURIComponent(id)}/projects`),
    linkProject: (id: string, project_id: string, role_in_project?: string) =>
      this.post(`/contacts/${encodeURIComponent(id)}/projects`, { project_id, role_in_project }),
    unlinkProject: (id: string, project_id: string) =>
      this.del(`/contacts/${encodeURIComponent(id)}/projects`, { body: { project_id } }), // body style
    listTasks: (id: string) => this.get(`/contacts/${encodeURIComponent(id)}/tasks`),
    linkTask: (id: string, task_id: string, role_in_task?: string) =>
      this.post(`/contacts/${encodeURIComponent(id)}/tasks`, { task_id, role_in_task }),
    unlinkTask: (id: string, task_id: string) =>
      this.del(`/contacts/${encodeURIComponent(id)}/tasks`, { body: { task_id } }), // body style
  };

  // ---- system / aggregates ------------------------------------------------

  dashboard = {
    today: () => this.get("/dashboard/today"),
    activity: () => this.get("/dashboard/activity"),
  };

  inbox = () => this.get("/inbox");
  myDay = () => this.get("/my-day");

  /** `/knowledge/search` → `{ data: results }`. */
  knowledgeSearch = (q: string) => this.get("/knowledge/search", { q });

  /** `/search` → `{ data: { query, results } }` (note the extra `query` wrapper). */
  search = (q: string) =>
    this.get<{ query: string; results: unknown }>("/search", { q });

  user = {
    /** Startup tier/auth probe — 200 = valid key on a paid tier; 403 = free. */
    health: () => this.get<{ ok: boolean; tier_ok: boolean }>("/mcp/health"),
    /** Used by startup validation — a 200 means the key is valid. */
    getSettings: () => this.get("/user/settings"),
    updateSettings: (body: Record<string, unknown>) =>
      this.patch("/user/settings", body),
    listApiKeys: () => this.get("/user/api-keys"),
    createApiKey: (name: string) => this.post("/user/api-keys", { name }),
    revokeApiKey: (id: string) => this.del(`/user/api-keys/${encodeURIComponent(id)}`),
    listIntegrations: () => this.get("/user/integrations"),
    createIntegration: (type: string, external_id: string) =>
      this.post("/user/integrations", { type, external_id }),
    deleteIntegration: (id: string) => this.del(`/user/integrations/${encodeURIComponent(id)}`),
  };
}
