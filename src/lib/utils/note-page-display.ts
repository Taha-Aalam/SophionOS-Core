export const NOTES_TABS_LIST_CLASS_NAME =
  "flex h-auto w-full flex-nowrap gap-0 rounded-none overflow-x-auto bg-transparent p-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden";

export const NOTES_PAGE_SHELL_CLASS_NAME = "content-fade-in reveal-stagger mx-auto flex w-full max-w-7xl flex-col gap-6 p-6";

export const NOTES_TABLE_WRAPPER_CLASS_NAME = "overflow-x-auto rounded-lg border";
export const NOTES_RELATION_BADGE_CLASS_NAME =
  "max-w-full min-h-5 whitespace-normal text-2xs h-auto";
export const NOTES_RELATION_BADGE_LIMIT_CLASS_NAME = "text-2xs";

export const NOTES_ROW_ACTION_BUTTON_CLASS_NAME =
  "rounded p-1 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100 hover:text-foreground";

export const NOTES_SEARCH_PLACEHOLDER = "Search...";
export const NOTES_LOADING_LABEL = "Loading notes...";
export const NOTES_EMPTY_VALUE = "-";

export function formatNotesSummary(activeCount: number, archivedCount: number): string {
  return `${activeCount} active note${activeCount === 1 ? "" : "s"} - ${archivedCount} archived`;
}

export function getNoteArchiveActionCopy(isArchived: boolean): "Archive" | "Restore" {
  return isArchived ? "Restore" : "Archive";
}
