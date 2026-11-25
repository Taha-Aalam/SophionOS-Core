"use client";
import { useI18n } from "@/components/providers/i18n-provider";

import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatDateTime } from "@/lib/format";

type ActivityEvent = {
  id: string;
  event_type: string;
  action: string;
  actor_type: string;
  client_name: string | null;
  entity_type: string | null;
  entity_id: string | null;
  occurred_at: string;
  metadata: Record<string, unknown>;
};

async function apiFetch<T>(input: string): Promise<T> {
  const res = await fetch(input);
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json?.error?.message ?? `Request failed (${res.status})`);
  }
  return json?.data as T;
}

export function AiActivityList() {
  const { t } = useI18n();
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [eventType, setEventType] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({
        page: String(page),
        pageSize: "20",
      });
      if (eventType) qs.set("eventType", eventType);
      const data = await apiFetch<{
        events: ActivityEvent[];
        pagination: { totalPages: number };
      }>(`/api/v1/user/ai-activity?${qs.toString()}`);
      setEvents(data.events ?? []);
      setTotalPages(data.pagination?.totalPages ?? 1);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("aiActivityList.failedToLoadActivity"));
    } finally {
      setLoading(false);
    }
  }, [page, eventType, t]);

  /* eslint-disable react-hooks/set-state-in-effect -- page/filter fetch */
  useEffect(() => {
    void load();
  }, [load]);
  /* eslint-enable react-hooks/set-state-in-effect */

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("aiActivityList.aiApiActivity")}</CardTitle>
        <CardDescription>
          {t("aiActivityList.attributableActionsForYourAccountBodiesSec")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2 items-center">
          <label className="text-sm text-muted-foreground" htmlFor="ev-filter">
            {t("aiActivityList.filter")}
          </label>
          <select
            id="ev-filter"
            className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
            value={eventType}
            onChange={(e) => {
              setPage(1);
              setEventType(e.target.value);
            }}
          >
            <option value="">{t("aiActivityList.allEventFamilies")}</option>
            <option value="credentials">{t("aiActivityList.credentials")}</option>
            <option value="ai_access">{t("aiActivityList.aiAccess")}</option>
            <option value="mcp_api_write">{t("aiActivityList.apiMcpWrites")}</option>
            <option value="privacy">{t("legal.privacy")}</option>
            <option value="security">{t("legal.security")}</option>
          </select>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> {t("action.loading")}
          </div>
        ) : events.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("aiActivityList.noActivityYet")}</p>
        ) : (
          <ul className="space-y-3">
            {events.map((e) => (
              <li key={e.id} className="border rounded-md p-3 text-sm space-y-1">
                <div className="font-medium">
                  {e.client_name || e.actor_type} · {e.action}
                </div>
                <div className="text-muted-foreground text-xs">
                  {formatDateTime(e.occurred_at)} · {e.event_type}
                  {e.entity_type ? ` · ${e.entity_type}` : ""}
                  {typeof e.metadata?.route === "string"
                    ? ` · ${e.metadata.route}`
                    : ""}
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            {t("aiActivityList.previous")}
          </Button>
          <span className="text-sm text-muted-foreground self-center">
            {t("aiActivityList.page")} {page} / {totalPages}
          </span>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            {t("aiActivityList.next")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
