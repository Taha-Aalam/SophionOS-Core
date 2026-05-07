import { createClient } from "../supabase/client";
import { DatabaseError } from "../api/error-handler";

export interface NoteDefaults {
  default_status?: "inbox" | "to_review" | "active";
  default_type?: "note" | "research" | "journal";
  default_notebook?: string | null;
}

const NOTE_DEFAULTS_KEY = "note_defaults";

export const userSettingsService = {
  async get<T>(userId: string, key: string): Promise<T | null> {
    const { data, error } = await createClient()
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

  async set<T>(userId: string, key: string, value: T): Promise<void> {
    const { error } = await createClient()
      .from("user_settings")
      .upsert({ user_id: userId, key, value }, { onConflict: "user_id,key" });

    if (error) {
      throw new DatabaseError(error.message);
    }
  },

  async getNoteDefaults(userId: string): Promise<NoteDefaults | null> {
    return this.get<NoteDefaults>(userId, NOTE_DEFAULTS_KEY);
  },

  async setNoteDefaults(userId: string, defaults: NoteDefaults): Promise<void> {
    return this.set(userId, NOTE_DEFAULTS_KEY, defaults);
  },
};
