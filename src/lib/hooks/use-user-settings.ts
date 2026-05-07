import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { useAuth } from "@/components/providers/auth-provider";
import { userSettingsService, type NoteDefaults } from "@/lib/services/user-settings.service";

export const USER_SETTINGS_QUERY_KEY = "user-settings";

export function useNoteDefaults() {
  const { user } = useAuth();

  return useQuery({
    queryKey: [USER_SETTINGS_QUERY_KEY, "note_defaults", user?.id ?? null],
    queryFn: () => userSettingsService.getNoteDefaults(user!.id),
    enabled: !!user,
  });
}

export function useUpdateNoteDefaults() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (defaults: NoteDefaults) =>
      userSettingsService.setNoteDefaults(user!.id, defaults),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [USER_SETTINGS_QUERY_KEY] });
      toast.success("Note defaults saved");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to save defaults");
    },
  });
}
