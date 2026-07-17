// Generated after assembling the complete publisher Static Assets release.
// Run `bun run publisher:assets` after changing release assets or the PDF contract.
export const rendererManifest = {
  schemaVersion: 1,
  rendererVersion: 'faction-sheet-v2',
  supportedRendererVersions: ['faction-sheet-v1', 'faction-sheet-v2'],
  rendererId:
    'faction-sheet/sha256:fcd66d60dc8f20b6beaa399a6b766acc36840998157a5e9f6ac959c1b55aa39b',
  digest: 'fcd66d60dc8f20b6beaa399a6b766acc36840998157a5e9f6ac959c1b55aa39b',
  contract: {
    rendererVersion: 'faction-sheet-v2',
    supportedRendererVersions: ['faction-sheet-v1', 'faction-sheet-v2'],
    viewport: {
      width: 1500,
      height: 1950,
      deviceScaleFactor: 1,
    },
    pdf: {
      pageCount: 2,
      pageWidthMm: 150,
      pageHeightMm: 195,
      pageSizeToleranceMm: 0.5,
      displayHeaderFooter: false,
      marginMm: {
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
      },
      preferCssPageSize: true,
      printBackground: true,
    },
  },
} as const;
