export function buildAreaDetailHref(area: { id: string; slug?: string | null }): string {
  return `/areas/${area.slug ?? area.id}`;
}
