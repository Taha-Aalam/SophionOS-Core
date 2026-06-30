import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "../supabase/client";
import { DatabaseError } from "../api/error-handler";

type ServiceOptions = { supabase?: SupabaseClient };

export interface NoteDefaults {
  default_status?: "inbox" | "to_review" | "active";
  default_type?: "note" | "research" | "journal";
  default_notebook?: string | null;
}

const NOTE_DEFAULTS_KEY = "note_defaults";

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
};
