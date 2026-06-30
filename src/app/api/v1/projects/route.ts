import type { NextRequest } from "next/server";

import { requireAuth } from "@/lib/api/api-auth";
import { created, error, paginated, success } from "@/lib/api/api-response";
import { validateBody } from "@/lib/api/api-validator";
import { AppError } from "@/lib/api/error-handler";
import { getPaginationParams } from "@/lib/api/pagination";
import { rateLimit } from "@/lib/api/rate-limiter";
import { contactService } from "@/lib/services/contact.service";
import { projectService } from "@/lib/services/project.service";
import { createClient } from "@/lib/supabase/server";
import type { Project } from "@/lib/types/domain.types";
import type { ProjectStatus } from "@/lib/utils/constants";
import { createProjectSchema } from "@/lib/validators/project.schema";

function isTruthy(value: string | null): boolean {
  return value === "true" || value === "1";
}

/**
 * GET /api/v1/projects — paginated list. Filters: `status` (inbox/in_progress
 * → mapped onto project status), `area_id`, `goal_id`, `contact_id`, and the
 * boolean `archive`. `group_by=area|status` returns a grouped map instead of a
 * flat page.
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await requireAuth(request);

    const rl = await rateLimit(request, userId);
    if (!rl.success) {
      return error(new AppError("Too many requests", 429, "RATE_LIMITED"));
    }

    const supabase = await createClient();
    const searchParams = new URL(request.url).searchParams;

    const areaId = searchParams.get("area_id") ?? undefined;
    const goalId = searchParams.get("goal_id") ?? undefined;
    const contactId = searchParams.get("contact_id") ?? undefined;
    const groupBy = searchParams.get("group_by") ?? undefined;
    const archive = isTruthy(searchParams.get("archive"));

    // "in_progress" is the API alias for the project workflow "active" status.
    const statusParam = searchParams.get("status") ?? undefined;
    let status: ProjectStatus | "all" | undefined;
    if (archive) {
      status = "archived";
    } else if (statusParam === "in_progress") {
      status = "active";
    } else if (statusParam) {
      status = statusParam as ProjectStatus | "all";
    }

    let projects: Project[];
    if (goalId) {
      projects = await projectService.listByGoal(userId, goalId, { supabase });
    } else if (areaId) {
      projects = await projectService.listByArea(userId, areaId, { supabase });
    } else {
      projects = await projectService.list(
        userId,
        { status, areaId },
        { supabase },
      );
    }

    if (contactId) {
      const links = await contactService.getProjectLinks(userId, contactId, {
        supabase,
      });
      const linkedIds = new Set(links.map((l) => l.project_id));
      projects = projects.filter((p) => linkedIds.has(p.id));
    }

    if (groupBy === "area" || groupBy === "status") {
      const groups: Record<string, Project[]> = {};
      for (const project of projects) {
        const key =
          groupBy === "area" ? project.area_id ?? "unassigned" : project.status;
        (groups[key] ??= []).push(project);
      }
      return success({ groupBy, groups });
    }

    const { page, pageSize, offset, limit } = getPaginationParams(searchParams);
    const pageItems = projects.slice(offset, offset + limit);
    return paginated(pageItems, projects.length, page, pageSize);
  } catch (err) {
    return err instanceof AppError
      ? error(err)
      : error(new AppError("Internal server error"));
  }
}

/**
 * POST /api/v1/projects — create a project. Requires `application/json`.
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await requireAuth(request);

    const rl = await rateLimit(request, userId);
    if (!rl.success) {
      return error(new AppError("Too many requests", 429, "RATE_LIMITED"));
    }

    const contentType = request.headers.get("content-type") ?? "";
    if (!contentType.includes("application/json")) {
      return error(
        new AppError("Unsupported Media Type", 415, "UNSUPPORTED_MEDIA_TYPE"),
      );
    }

    const body = await validateBody(request, createProjectSchema);
    const supabase = await createClient();
    const project = await projectService.create(userId, body, { supabase });
    return created(project);
  } catch (err) {
    return err instanceof AppError
      ? error(err)
      : error(new AppError("Internal server error"));
  }
}
