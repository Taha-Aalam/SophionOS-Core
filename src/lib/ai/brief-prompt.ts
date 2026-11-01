import type { TodayData } from "@/lib/services/dashboard.service";
import type { BriefKind } from "@/lib/notifications/types";

// Prompt construction for AI brief narration. Data-scope rule: the model sees
// exactly the fields the deterministic brief already emails (stats, top
// tasks, active goals) — nothing more, nothing less. The system prompt
// hard-constrains the model to that data so the narration can never invent
// tasks or goals (SPEC-brief-narration.md).

const KIND_FRAMING: Record<BriefKind, string> = {
  morning_briefing:
    "It is the start of the user's day. Set up the day: what needs attention first and why, what can wait.",
  evening_review:
    "The user's day is wrapping up. Acknowledge progress, surface what slipped, and set up tomorrow in one or two moves.",
  weekly_digest:
    "This is the user's weekly wrap-up. Point out patterns across the week and suggest one clear focus for next week.",
};

const SYSTEM_RULES =
  "You write the opening summary for a personal life-organizer email. " +
  "Use ONLY the data provided in the user message. Do not invent facts, tasks, goals, names, or numbers. " +
  "Tone: warm, direct, specific — a competent assistant, not a marketer. " +
  "Length: 120-180 words. Plain prose paragraphs only (no headings, no bullet lists, no sign-off).";

const KIND_TITLE: Record<BriefKind, string> = {
  morning_briefing: "morning briefing",
  evening_review: "evening review",
  weekly_digest: "weekly digest",
};

export function buildBriefDataSummary(
  kind: BriefKind,
  today: TodayData,
  localDate: string,
): string {
  const tasks = today.todayTasks.slice(0, 10);
  const goals = today.activeGoals.slice(0, 5);
  const lines: string[] = [
    `${KIND_TITLE[kind]} data — ${localDate}`,
    "",
    `Overdue: ${today.stats.overdueCount}`,
    `Due / focus items today: ${today.tasksTodayCount}`,
    `Completed this week: ${today.stats.completedThisWeek}`,
    `Active goals: ${today.stats.activeGoalsCount}`,
    "",
    "Top tasks:",
  ];
  if (tasks.length === 0) lines.push("  (none listed)");
  for (const t of tasks) {
    const flag = t.isOverdue ? " [overdue]" : "";
    lines.push(`  - ${t.title}${flag}`);
  }
  lines.push("", "Goals:");
  if (goals.length === 0) lines.push("  (none listed)");
  for (const g of goals) {
    lines.push(`  - ${g.title} (${g.progress}%)`);
  }
  return lines.join("\n");
}

export function buildBriefPrompt(
  kind: BriefKind,
  today: TodayData,
  localDate: string,
): { system: string; prompt: string } {
  return {
    system: `${SYSTEM_RULES} Context: ${KIND_FRAMING[kind]}`,
    prompt: `Write the opening summary for the user's ${KIND_TITLE[kind]}. The user's local date is ${localDate}.\n\nData:\n${buildBriefDataSummary(kind, today, localDate)}`,
  };
}
