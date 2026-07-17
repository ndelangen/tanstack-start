// Generated after assembling the complete publisher Static Assets release.
// Run `bun run publisher:assets` after changing release assets or the PDF contract.
export const rendererManifest = {
  schemaVersion: 1,
  rendererVersion: 'faction-sheet-v2',
  supportedRendererVersions: ['faction-sheet-v1', 'faction-sheet-v2'],
  rendererId:
    'faction-sheet/sha256:d773253212512200a4f0bf6907954fc9f881f264f593b789638aba6e1c124993',
  digest: 'd773253212512200a4f0bf6907954fc9f881f264f593b789638aba6e1c124993',
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
