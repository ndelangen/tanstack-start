/** True when pathname is `/preview/sheet/:functionSlug` (bare layout, no Page chrome). */
export function isFactionSheetBarePath(pathname: string): boolean {
  return /^\/preview\/sheet\/[^/]+\/?$/.test(pathname);
}
