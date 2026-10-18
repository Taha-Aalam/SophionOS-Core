import type { TodayData } from "@/lib/services/dashboard.service";
import type { BriefKind } from "./types";

export interface ComposedEmail {
  subject: string;
  text: string;
  html: string;
}

const KIND_TITLE: Record<BriefKind, string> = {
  morning_briefing: "Morning briefing",
  evening_review: "Evening review",
  weekly_digest: "Weekly digest",
};

// Policy pages stay publicly readable, so an emailed footer link always works
// even for a signed-out reader. Order matches the sidebar's Policies group.
// Kept local: importing the sidebar nav config would drag lucide icons into a
// server email path for no benefit.
const POLICY_LINKS: ReadonlyArray<{ path: string; label: string }> = [
  { path: "/terms", label: "Terms" },
  { path: "/privacy", label: "Privacy" },
  { path: "/security", label: "Security" },
  { path: "/subprocessors", label: "Subprocessors" },
  { path: "/data-and-ai", label: "Data & AI" },
  { path: "/responsible-disclosure", label: "Responsible Disclosure" },
];

export function composeBriefEmail(input: {
  kind: BriefKind;
  today: TodayData;
  appUrl: string;
  localDate: string;
}): ComposedEmail {
  const title = KIND_TITLE[input.kind];
  const base = input.appUrl.replace(/\/$/, "");
  const dash = `${base}/dashboard`;
  const policyLinks = POLICY_LINKS.map((l) => ({ ...l, url: `${base}${l.path}` }));
  const tasks = input.today.todayTasks.slice(0, 10);
  const goals = input.today.activeGoals.slice(0, 5);
  const lines: string[] = [
    `${title} — ${input.localDate}`,
    "",
    `Overdue: ${input.today.stats.overdueCount}`,
    `Due / focus items today: ${input.today.tasksTodayCount}`,
    `Completed this week: ${input.today.stats.completedThisWeek}`,
    `Active goals: ${input.today.stats.activeGoalsCount}`,
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
  lines.push(
    "",
    `Open dashboard: ${dash}`,
    "",
    "Policies:",
    ...policyLinks.map((l) => `  - ${l.label}: ${l.url}`),
    "",
    "— SophionOS",
  );

  const text = lines.join("\n");
  const html = `
    <div style="font-family:system-ui,sans-serif;line-height:1.5;color:#111">
      <h1 style="font-size:18px">${escapeHtml(title)} — ${escapeHtml(input.localDate)}</h1>
      <p>Overdue: <strong>${input.today.stats.overdueCount}</strong> ·
         Today: <strong>${input.today.tasksTodayCount}</strong> ·
         Week done: <strong>${input.today.stats.completedThisWeek}</strong></p>
      <h2 style="font-size:14px">Top tasks</h2>
      <ul>${tasks.map((t) => `<li>${escapeHtml(t.title)}${t.isOverdue ? " <em>(overdue)</em>" : ""}</li>`).join("") || "<li><em>None</em></li>"}</ul>
      <h2 style="font-size:14px">Goals</h2>
      <ul>${goals.map((g) => `<li>${escapeHtml(g.title)} (${g.progress}%)</li>`).join("") || "<li><em>None</em></li>"}</ul>
      <p><a href="${escapeHtml(dash)}">Open dashboard</a></p>
      <p style="color:#666;font-size:12px">
        SophionOS ·
        ${policyLinks
          .map(
            (l, i) =>
              `${i === 0 ? "" : " · "}<a href="${escapeHtml(l.url)}" style="color:#666">${escapeHtml(l.label)}</a>`,
          )
          .join("")}
      </p>
    </div>`;

  return {
    subject: `SophionOS ${title} — ${input.localDate}`,
    text,
    html,
  };
}

function escapeHtml(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
