// Generated after assembling the complete publisher Static Assets release.
// Run `bun run publisher:assets` after changing release assets or the PDF contract.
export const rendererManifest = {
  schemaVersion: 1,
  rendererVersion: 'faction-sheet-v1',
  rendererId:
    'faction-sheet/sha256:7b238b0865715ff3c32f7fc20259db89d3633b2d05273cc9a969f6600091d813',
  digest: '7b238b0865715ff3c32f7fc20259db89d3633b2d05273cc9a969f6600091d813',
  contract: {
    rendererVersion: 'faction-sheet-v1',
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
