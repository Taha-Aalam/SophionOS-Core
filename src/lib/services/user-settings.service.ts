import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "../supabase/client";
import { DatabaseError } from "../api/error-handler";

type ServiceOptions = { supabase?: SupabaseClient };

export interface NoteDefaults {
  default_status?: "inbox" | "to_review" | "active";
  default_type?: "note" | "research" | "journal";
  default_notebook?: string | null;
}

export interface PreferencesSettings {
  timezone?: string;
  theme?: "light" | "dark" | "system";
  language?: string;
}

export interface NotificationSettings {
  morning_briefing_enabled?: boolean;
  morning_briefing_time?: string | null;
  evening_review_enabled?: boolean;
  evening_review_time?: string | null;
  weekly_digest_day?: number | null;
  /** Default true when undefined — email channel opt-in */
  email_enabled?: boolean;
}

export interface ProfileContactSettings {
  phone_number?: string | null;
}

export const ONBOARDING_STEPS = [
  "areas",
  "goal",
  "project",
  "tasks",
  "my_day",
  "inbox",
  "knowledge",
  "notes",
  "resources",
  "contacts",
] as const;

export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

export interface OnboardingState {
  completed: boolean;
  current_step: OnboardingStep;
  draft?: Record<string, unknown>;
  completed_at?: string | null;
}

export const DEFAULT_ONBOARDING_STATE: OnboardingState = {
  completed: false,
  current_step: "areas",
};

const NOTE_DEFAULTS_KEY = "note_defaults";
const PREFERENCES_KEY = "preferences";
const NOTIFICATIONS_KEY = "notifications";
const ONBOARDING_KEY = "onboarding";
const PROFILE_CONTACT_KEY = "profile_contact";

export const userSettingsService = {
  async get<T>(
    userId: string,
    key: string,
    options?: ServiceOptions,
  ): Promise<T | null> {
    const sb = options?.supabase ?? createClient();
    const { data, error } = await sb
      .from("user_settings")
      .select("value")
      .eq("user_id", userId)
      .eq("key", key)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      throw new DatabaseError(error.message);
    }

    return data?.value as T | null;
  },

  async set<T>(
    userId: string,
    key: string,
    value: T,
    options?: ServiceOptions,
  ): Promise<void> {
    const sb = options?.supabase ?? createClient();
    const { error } = await sb
      .from("user_settings")
      .upsert({ user_id: userId, key, value }, { onConflict: "user_id,key" });

    if (error) {
      throw new DatabaseError(error.message);
    }
  },

  async getNoteDefaults(
    userId: string,
    options?: ServiceOptions,
  ): Promise<NoteDefaults | null> {
    return this.get<NoteDefaults>(userId, NOTE_DEFAULTS_KEY, options);
  },

  async setNoteDefaults(
    userId: string,
    defaults: NoteDefaults,
    options?: ServiceOptions,
  ): Promise<void> {
    return this.set(userId, NOTE_DEFAULTS_KEY, defaults, options);
  },

  async getPreferences(
    userId: string,
    options?: ServiceOptions,
  ): Promise<PreferencesSettings | null> {
    return this.get<PreferencesSettings>(userId, PREFERENCES_KEY, options);
  },

  async setPreferences(
    userId: string,
    preferences: PreferencesSettings,
    options?: ServiceOptions,
  ): Promise<void> {
    return this.set(userId, PREFERENCES_KEY, preferences, options);
  },

  async getNotifications(
    userId: string,
    options?: ServiceOptions,
  ): Promise<NotificationSettings | null> {
    return this.get<NotificationSettings>(userId, NOTIFICATIONS_KEY, options);
  },

  async setNotifications(
    userId: string,
    notifications: NotificationSettings,
    options?: ServiceOptions,
  ): Promise<void> {
    return this.set(userId, NOTIFICATIONS_KEY, notifications, options);
  },

  async getProfileContact(
    userId: string,
    options?: ServiceOptions,
  ): Promise<ProfileContactSettings | null> {
    return this.get<ProfileContactSettings>(userId, PROFILE_CONTACT_KEY, options);
  },

  async setProfileContact(
    userId: string,
    contact: ProfileContactSettings,
    options?: ServiceOptions,
  ): Promise<void> {
    return this.set(userId, PROFILE_CONTACT_KEY, contact, options);
  },

  async getOnboardingState(
    userId: string,
    options?: ServiceOptions,
  ): Promise<OnboardingState> {
    const stored = await this.get<OnboardingState>(
      userId,
      ONBOARDING_KEY,
      options,
    );
    return stored ?? { ...DEFAULT_ONBOARDING_STATE };
  },

  async setOnboardingState(
    userId: string,
    state: OnboardingState,
    options?: ServiceOptions,
  ): Promise<void> {
    return this.set(userId, ONBOARDING_KEY, state, options);
  },
};
