export type BriefKind =
  | "morning_briefing"
  | "evening_review"
  | "weekly_digest";

export type DeliveryChannel = "email";

export type DeliveryStatus = "sent" | "failed" | "skipped";

// Briefs are configured as 1-hour slots: the user picks the hour, and the
// brief is due on the first hourly tick at/after that hour in their local
// timezone (same-day catch-up; the delivery log prevents re-sends).
export interface NotificationPrefs {
  morning_briefing_enabled?: boolean;
  morning_briefing_hour?: number | null;
  evening_review_enabled?: boolean;
  evening_review_hour?: number | null;
  weekly_digest_day?: number | null;
  weekly_digest_hour?: number | null;
  /** Default true when undefined */
  email_enabled?: boolean;
}

export interface DueBrief {
  kind: BriefKind;
  localDate: string; // YYYY-MM-DD in user TZ
  configuredTime: string; // HH:mm — the slot anchor, e.g. "08:00"
}
