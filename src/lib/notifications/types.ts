export type BriefKind =
  | "morning_briefing"
  | "evening_review"
  | "weekly_digest";

export type DeliveryChannel = "email";

export type DeliveryStatus = "sent" | "failed" | "skipped";

export interface NotificationPrefs {
  morning_briefing_enabled?: boolean;
  morning_briefing_time?: string | null;
  evening_review_enabled?: boolean;
  evening_review_time?: string | null;
  weekly_digest_day?: number | null;
  /** Default true when undefined */
  email_enabled?: boolean;
}

export interface DueBrief {
  kind: BriefKind;
  localDate: string; // YYYY-MM-DD in user TZ
  configuredTime: string; // HH:mm
}
