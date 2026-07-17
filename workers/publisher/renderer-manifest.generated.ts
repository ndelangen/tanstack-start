// Generated after assembling the complete publisher Static Assets release.
// Run `bun run publisher:assets` after changing release assets or the PDF contract.
export const rendererManifest = {
  schemaVersion: 1,
  rendererVersion: 'faction-sheet-v1',
  rendererId:
    'faction-sheet/sha256:c8c802f6b35aaff3239a1b16c55b7c02d35f1d08102cd64c5e7acbf332447ea5',
  digest: 'c8c802f6b35aaff3239a1b16c55b7c02d35f1d08102cd64c5e7acbf332447ea5',
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
