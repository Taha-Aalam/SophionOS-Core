"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/components/providers/auth-provider";
import { DASHBOARD_QUERY_KEY, dashboardService, type TodayData } from "../services/dashboard.service";

export { DASHBOARD_QUERY_KEY };

export function useDashboardToday(): TodayData | undefined {
  const { user } = useAuth();

  const { data } = useQuery({
    queryKey: [DASHBOARD_QUERY_KEY, user?.id, "today"],
    queryFn: () => dashboardService.getToday(user!.id),
    enabled: !!user,
    staleTime: 30_000,
  });

  return data;
}