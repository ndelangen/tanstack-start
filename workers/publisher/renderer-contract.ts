export const PUBLISHER_RENDERER_CONTRACT = {
  viewport: { width: 1_500, height: 1_950, deviceScaleFactor: 1 },
  pdf: {
    pageCount: 2,
    pageWidthMm: 150,
    pageHeightMm: 195,
    pageSizeToleranceMm: 0.5,
    displayHeaderFooter: false,
    marginMm: { top: 0, right: 0, bottom: 0, left: 0 },
    preferCssPageSize: true,
    printBackground: true,
  },
} as const;
