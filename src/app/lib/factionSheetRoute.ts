/** True when pathname is `/factions/:factionId/sheet` (bare layout, no Page chrome). */
export function isFactionSheetBarePath(pathname: string): boolean {
  return /^\/factions\/[^/]+\/sheet\/?$/.test(pathname);
}
