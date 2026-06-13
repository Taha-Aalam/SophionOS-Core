/**
 * Filters link-candidate lists to entities whose linked areas overlap the
 * parent entity's areas, while keeping entities with no area assignment.
 *
 * Used by goal- and project-detail "Link X" dialogs so the candidate set is
 * scoped to area-relevant items, plus unassigned items the user might still
 * want to attach.
 */
export function filterCandidatesByAreaScope<T>(
  candidates: T[],
  parentAreaIds: string[],
  getCandidateAreaIds: (item: T) => string[],
): T[] {
  if (parentAreaIds.length === 0) {
    return candidates;
  }

  const allowed = new Set(parentAreaIds);
  return candidates.filter((item) => {
    const ids = getCandidateAreaIds(item);
    if (ids.length === 0) {
      return true;
    }
    return ids.some((id) => allowed.has(id));
  });
}

export function getContactLinkedAreaIds<T extends { linkedAreaIds?: string[] }>(
  contact: T,
): string[] {
  return contact.linkedAreaIds ?? [];
}
