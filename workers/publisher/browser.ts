import type {
  Browser,
  BrowserContext,
  BrowserWorker,
  ConsoleMessage,
  Page,
  Response as PlaywrightResponse,
} from '@cloudflare/playwright';

import {
  publisherErrorMessage,
  redactPublisherResource,
  sanitizePublisherDiagnostic,
} from '../../src/app/capture/publisher-diagnostics';
import { inspectChromiumPdf } from '../proof/pdf';
import { captureCapabilityCookie, captureDeadlineCookie } from './capture-route';

const FIXED_VIEWPORT = { width: 1_500, height: 1_950 };
const EXPECTED_PAGE_WIDTH_MM = 150;
const EXPECTED_PAGE_HEIGHT_MM = 195;
const PAGE_SIZE_TOLERANCE_MM = 0.5;

export type CapturedPdf = {
  bytes: Uint8Array;
  pageCount: number;
  pageWidthMm: number;
  pageHeightMm: number;
  consoleErrors: string[];
  requestFailures: string[];
  pageErrors: string[];
  httpErrors: string[];
};

export type CaptureDiagnostics = Pick<
  CapturedPdf,
  'consoleErrors' | 'requestFailures' | 'pageErrors' | 'httpErrors'
>;

export function assertCapturedPdfOutput(inspection: {
  pageCount: number;
  pageWidthMm: number;
  pageHeightMm: number;
}): void {
  if (inspection.pageCount !== 2) throw new Error('Captured PDF must contain exactly two pages');
  if (
    Math.abs(inspection.pageWidthMm - EXPECTED_PAGE_WIDTH_MM) > PAGE_SIZE_TOLERANCE_MM ||
    Math.abs(inspection.pageHeightMm - EXPECTED_PAGE_HEIGHT_MM) > PAGE_SIZE_TOLERANCE_MM
  ) {
    throw new Error('Captured PDF MediaBoxes must be 150 mm × 195 mm within 0.5 mm');
  }
}

export function assertCaptureDiagnostics(diagnostics: CaptureDiagnostics): void {
  if (diagnostics.consoleErrors.length) {
    throw new Error(`Capture console errors: ${diagnostics.consoleErrors.join(' | ')}`);
  }
  if (diagnostics.pageErrors.length) {
    throw new Error(`Capture page errors: ${diagnostics.pageErrors.join(' | ')}`);
  }
  if (diagnostics.requestFailures.length) {
    throw new Error(`Capture request failures: ${diagnostics.requestFailures.join(' | ')}`);
  }
  if (diagnostics.httpErrors.length) {
    throw new Error(`Capture HTTP errors: ${diagnostics.httpErrors.join(' | ')}`);
  }
}

function remaining(deadline: number): number {
  const value = Math.ceil(deadline - performance.now());
  if (value <= 0) throw new Error('Browser capture exhausted its deadline');
  return value;
}

function failureLabel(request: {
  method(): string;
  url(): string;
  failure(): { errorText: string } | null;
}): string {
  return `${request.method()} ${redactPublisherResource(request.url())}: ${sanitizePublisherDiagnostic(
    request.failure()?.errorText ?? 'unknown failure'
  )}`;
}

function responseFailureLabel(response: PlaywrightResponse): string {
  return `${response.request().method()} ${redactPublisherResource(
    response.url()
  )}: HTTP ${response.status()}`;
}

export function registerCaptureDiagnostics(page: Page): CaptureDiagnostics {
  const diagnostics: CaptureDiagnostics = {
    consoleErrors: [],
    requestFailures: [],
    pageErrors: [],
    httpErrors: [],
  };
  page.on('console', (message: ConsoleMessage) => {
    if (message.type() === 'error') {
      diagnostics.consoleErrors.push(sanitizePublisherDiagnostic(message.text()));
    }
  });
  page.on('requestfailed', (request) => diagnostics.requestFailures.push(failureLabel(request)));
  page.on('pageerror', (error) => diagnostics.pageErrors.push(publisherErrorMessage(error)));
  page.on('response', (response) => {
    if (response.status() >= 400) diagnostics.httpErrors.push(responseFailureLabel(response));
  });
  return diagnostics;
}

export function publisherCaptureCookies(
  captureBaseUrl: string,
  renderCapability: string,
  lifecycleDeadlineAt: number
): Parameters<BrowserContext['addCookies']>[0] {
  return [
    {
      name: captureCapabilityCookie,
      value: renderCapability,
      url: captureBaseUrl,
      httpOnly: true,
      secure: true,
      sameSite: 'Strict',
    },
    {
      name: captureDeadlineCookie,
      value: String(lifecycleDeadlineAt),
      url: captureBaseUrl,
      httpOnly: true,
      secure: true,
      sameSite: 'Strict',
    },
  ];
}

export async function inspectPublisherPdf(bytes: Uint8Array) {
  const inspection = await inspectChromiumPdf(bytes);
  assertCapturedPdfOutput(inspection);
  return inspection;
}

async function assertPageBounds(page: Page, deadline: number): Promise<void> {
  await page.emulateMedia({ media: 'print' });
  const margins = await page.evaluate(() => {
    const browserGlobal = globalThis as typeof globalThis & {
      document: { body: unknown };
      getComputedStyle(element: unknown): {
        marginTop: string;
        marginRight: string;
        marginBottom: string;
        marginLeft: string;
      };
    };
    const style = browserGlobal.getComputedStyle(browserGlobal.document.body);
    return [style.marginTop, style.marginRight, style.marginBottom, style.marginLeft];
  });
  if (margins.some((margin) => margin !== '0px')) {
    throw new Error(`Capture document body margins are not zero: ${margins.join(' ')}`);
  }
  const width = (EXPECTED_PAGE_WIDTH_MM * 96) / 25.4;
  const height = (EXPECTED_PAGE_HEIGHT_MM * 96) / 25.4;
  const pages = page.locator('[data-faction-sheet-page]');
  if ((await pages.count()) !== 2)
    throw new Error('Capture route did not render exactly two pages');
  for (let index = 0; index < 2; index += 1) {
    const bounds = await pages.nth(index).boundingBox({ timeout: remaining(deadline) });
    if (
      !bounds ||
      Math.abs(bounds.x) > 0.5 ||
      Math.abs(bounds.y - index * height) > 0.5 ||
      Math.abs(bounds.width - width) > 0.5 ||
      Math.abs(bounds.height - height) > 0.5
    ) {
      throw new Error(`Capture page ${index + 1} has invalid physical bounds`);
    }
  }
}

export class PublisherBrowserSession {
  private context?: BrowserContext;

  constructor(
    private readonly browser: Browser,
    private readonly captureBaseUrl: string
  ) {}

  async capture(renderCapability: string, timeoutMs: number): Promise<CapturedPdf> {
    const deadline = performance.now() + timeoutMs;
    const lifecycleDeadlineAt = Date.now() + timeoutMs;
    this.context = await this.browser.newContext({
      deviceScaleFactor: 1,
      locale: 'en-US',
      timezoneId: 'UTC',
      viewport: FIXED_VIEWPORT,
    });
    await this.context.addCookies(
      publisherCaptureCookies(this.captureBaseUrl, renderCapability, lifecycleDeadlineAt)
    );
    const page = await this.context.newPage();
    const diagnostics = registerCaptureDiagnostics(page);
    const response = await page.goto(`${this.captureBaseUrl}/__asset-publisher/capture`, {
      waitUntil: 'domcontentloaded',
      timeout: remaining(deadline),
    });
    if (!response?.ok()) throw new Error(`Capture navigation returned HTTP ${response?.status()}`);
    const marker = page.locator('#capture-status');
    await marker.waitFor({ state: 'attached', timeout: remaining(deadline) });
    await page.waitForFunction(
      () => {
        const browserGlobal = globalThis as typeof globalThis & {
          document: {
            querySelector(selector: string): { getAttribute(name: string): string | null } | null;
          };
        };
        return (
          browserGlobal.document
            .querySelector('#capture-status')
            ?.getAttribute('data-capture-state') !== 'loading'
        );
      },
      undefined,
      { timeout: remaining(deadline) }
    );
    const state = await marker.getAttribute('data-capture-state');
    if (state !== 'ready') {
      throw new Error(`Capture route reported ${state}: ${await marker.textContent()}`);
    }
    await assertPageBounds(page, deadline);
    assertCaptureDiagnostics(diagnostics);
    const bytes = await page.pdf({
      displayHeaderFooter: false,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
      preferCSSPageSize: true,
      printBackground: true,
    });
    const inspection = await inspectPublisherPdf(bytes);
    assertCaptureDiagnostics(diagnostics);
    return {
      bytes,
      ...inspection,
      ...diagnostics,
    };
  }

  async close(): Promise<void> {
    const results = await Promise.allSettled([
      this.context?.close() ?? Promise.resolve(),
      this.browser.close(),
    ]);
    const rejected = results.find((result) => result.status === 'rejected');
    if (rejected?.status === 'rejected') throw rejected.reason;
  }
}

export async function browserAvailable(binding: BrowserWorker): Promise<boolean> {
  const { limits } = await import('@cloudflare/playwright');
  const result = await limits(binding);
  return (
    result.allowedBrowserAcquisitions > 0 &&
    result.activeSessions.length < result.maxConcurrentSessions
  );
}

export async function openPublisherBrowser(
  binding: BrowserWorker,
  captureBaseUrl: string
): Promise<PublisherBrowserSession> {
  const { launch } = await import('@cloudflare/playwright');
  return new PublisherBrowserSession(await launch(binding), captureBaseUrl);
}
