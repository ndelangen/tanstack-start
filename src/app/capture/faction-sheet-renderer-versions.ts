export const INITIAL_FACTION_SHEET_RENDERER_VERSION = 'faction-sheet-v1' as const;
export const CURRENT_FACTION_SHEET_RENDERER_VERSION = 'faction-sheet-v2' as const;

export const SUPPORTED_FACTION_SHEET_RENDERER_VERSIONS = [
  INITIAL_FACTION_SHEET_RENDERER_VERSION,
  CURRENT_FACTION_SHEET_RENDERER_VERSION,
] as const;

export type SupportedFactionSheetRendererVersion =
  (typeof SUPPORTED_FACTION_SHEET_RENDERER_VERSIONS)[number];

export function isSupportedFactionSheetRendererVersion(
  version: string
): version is SupportedFactionSheetRendererVersion {
  return SUPPORTED_FACTION_SHEET_RENDERER_VERSIONS.some(
    (supportedVersion) => supportedVersion === version
  );
}
