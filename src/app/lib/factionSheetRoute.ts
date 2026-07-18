/** True when pathname is `/preview/sheet/:factionSlug` (bare document layout, no app chrome). */
export function isFactionSheetBarePath(pathname: string): boolean {
  return /^\/preview\/sheet\/[^/]+\/?$/.test(pathname);
}
