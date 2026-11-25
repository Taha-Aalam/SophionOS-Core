"use client";

import { useI18n } from "@/components/providers/i18n-provider";
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { SCORE_COLORS } from '@/lib/constants/entity-colors';

interface SmartPriorityBadgeProps {
  score: number;
  className?: string;
}

export function SmartPriorityBadge({ score, className }: SmartPriorityBadgeProps) {
  const { t, tp } = useI18n();
  const clamped = Math.max(1, Math.min(5, score));
  return (
    <Badge
      variant="secondary"
      className={cn('text-xs font-bold shrink-0', SCORE_COLORS[clamped] ?? SCORE_COLORS[1], className)}
      title={t("smartPriorityBadge.smartPriorityV05", { v0: clamped })}
    >
      {clamped}
    </Badge>
  );
}
