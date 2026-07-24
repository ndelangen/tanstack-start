// Generated after assembling the complete publisher Static Assets release.
// Run `bun run publisher:assets` after changing release assets or the PDF contract.
export const rendererManifest = {
  schemaVersion: 1,
  rendererVersion: 'faction-sheet-v4',
  supportedRendererVersions: ['faction-sheet-v4'],
  rendererId:
    'faction-sheet/sha256:960b2e636a3ddef5ffd80f76ebcc9fd31393d78089c920b7ed6eaea33fc7d48c',
  digest: '960b2e636a3ddef5ffd80f76ebcc9fd31393d78089c920b7ed6eaea33fc7d48c',
  contract: {
    rendererVersion: 'faction-sheet-v4',
    supportedRendererVersions: ['faction-sheet-v4'],
    viewport: {
      width: 2100,
      height: 2970,
      deviceScaleFactor: 1,
    },
    pdf: {
      pageCount: 2,
      pageWidthMm: 210,
      pageHeightMm: 297,
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
