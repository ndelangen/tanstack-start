// Generated after assembling the complete publisher Static Assets release.
// Run `bun run publisher:assets` after changing release assets or the PDF contract.
export const rendererManifest = {
  schemaVersion: 1,
  rendererVersion: 'faction-sheet-v1',
  rendererId:
    'faction-sheet/sha256:8675058cb7378bcaa87017da6866ca12f15e6697bd4eb2a0eb38f81c11bf9f72',
  digest: '8675058cb7378bcaa87017da6866ca12f15e6697bd4eb2a0eb38f81c11bf9f72',
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
