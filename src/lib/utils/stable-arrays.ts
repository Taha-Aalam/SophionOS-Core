const EMPTY_STRING_ARRAY: string[] = [];

export function getStableStringArray(values?: string[] | null): string[] {
  return values ?? EMPTY_STRING_ARRAY;
}
