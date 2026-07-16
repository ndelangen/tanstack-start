import { useEffect, useState } from 'react';

import { FactionSheetView } from '@app/components/factions/sheet/FactionSheetView';

import { proofFaction } from './proofFaction';

const IMAGE_SETTLE_TIMEOUT_MS = 15_000;

type CaptureState = 'loading' | 'ready' | 'error';

function imageLabel(image: HTMLImageElement): string {
  return image.currentSrc || image.src || image.alt || '<unknown image>';
}

function svgHref(element: SVGImageElement | SVGUseElement): string | undefined {
  return (
    element.getAttribute('href') ??
    element.getAttributeNS('http://www.w3.org/1999/xlink', 'href') ??
    undefined
  );
}

function abortError(signal: AbortSignal): unknown {
  return signal.reason ?? new Error('Capture asset settlement was aborted');
}

async function settleImage(image: HTMLImageElement, signal: AbortSignal): Promise<void> {
  if (signal.aborted) {
    throw signal.reason;
  }

  if (!image.complete) {
    await new Promise<void>((resolve, reject) => {
      const cleanup = () => {
        image.removeEventListener('load', onLoad);
        image.removeEventListener('error', onError);
        signal.removeEventListener('abort', onAbort);
      };
      const onAbort = () => {
        cleanup();
        reject(signal.reason);
      };
      const onError = () => {
        cleanup();
        reject(new Error(`Image failed to load: ${imageLabel(image)}`));
      };
      const onLoad = () => {
        cleanup();
        resolve();
      };

      image.addEventListener('load', onLoad, { once: true });
      image.addEventListener('error', onError, { once: true });
      signal.addEventListener('abort', onAbort, { once: true });
    });
  }

  if (image.naturalWidth === 0) {
    throw new Error(`Image has no decoded pixels: ${imageLabel(image)}`);
  }

  await image.decode();
}

async function settleSvgImage(href: string, signal: AbortSignal): Promise<void> {
  if (signal.aborted) {
    throw abortError(signal);
  }

  const image = new Image();
  image.src = new URL(href, document.baseURI).href;
  const onAbort = () => {
    image.src = '';
  };
  signal.addEventListener('abort', onAbort, { once: true });
  try {
    await image.decode();
    if (signal.aborted) {
      throw abortError(signal);
    }
    if (image.naturalWidth === 0 || image.naturalHeight === 0) {
      throw new Error(`SVG image has no decoded pixels: ${href}`);
    }
  } catch (error) {
    if (signal.aborted) {
      throw abortError(signal);
    }
    throw new Error(`SVG image failed to decode: ${href}`, { cause: error });
  } finally {
    signal.removeEventListener('abort', onAbort);
  }
}

async function settleExternalSvgUse(href: string, signal: AbortSignal): Promise<void> {
  if (signal.aborted) {
    throw abortError(signal);
  }

  const resource = new URL(href, document.baseURI);
  const fragment = resource.hash.slice(1);
  resource.hash = '';
  const response = await fetch(resource, { signal, cache: 'force-cache' });
  if (!response.ok) {
    throw new Error(`SVG use returned HTTP ${response.status}: ${href}`);
  }

  const svgText = await response.text();
  const svgDocument = new DOMParser().parseFromString(svgText, 'image/svg+xml');
  if (svgDocument.documentElement.localName !== 'svg' || svgDocument.querySelector('parsererror')) {
    throw new Error(`SVG use returned invalid SVG: ${href}`);
  }

  if (fragment) {
    const decodedFragment = decodeURIComponent(fragment);
    const hasFragment = Array.from(svgDocument.querySelectorAll('[id]')).some(
      (element) => element.getAttribute('id') === decodedFragment
    );
    if (!hasFragment) {
      throw new Error(`SVG use target #${decodedFragment} is missing: ${href}`);
    }
  }
}

async function settleSvgResources(signal: AbortSignal): Promise<void> {
  const imageHrefs = new Set(
    Array.from(document.querySelectorAll<SVGImageElement>('svg image'), svgHref).filter(
      (href): href is string => Boolean(href)
    )
  );
  const externalUseHrefs = new Set(
    Array.from(document.querySelectorAll<SVGUseElement>('svg use'), svgHref).filter(
      (href): href is string => Boolean(href && !href.startsWith('#'))
    )
  );

  await Promise.all([
    ...Array.from(imageHrefs, (href) => settleSvgImage(href, signal)),
    ...Array.from(externalUseHrefs, (href) => settleExternalSvgUse(href, signal)),
  ]);
}

export function ProofFactionSheetCapture() {
  const [state, setState] = useState<CaptureState>('loading');
  const [detail, setDetail] = useState('Waiting for fonts and images');

  useEffect(() => {
    document.documentElement.dataset.factionSheet = '';
    let disposed = false;
    const controller = new AbortController();
    const timeout = window.setTimeout(
      () => controller.abort(new Error('Timed out waiting for capture assets')),
      IMAGE_SETTLE_TIMEOUT_MS
    );

    const settle = async () => {
      try {
        await document.fonts.ready;
        await Promise.all(
          Array.from(document.images, (image) => settleImage(image, controller.signal))
        );
        await settleSvgResources(controller.signal);
        if (!disposed && !controller.signal.aborted) {
          setState('ready');
          setDetail('Fonts, HTML images, and SVG resources are ready');
        }
      } catch (error) {
        if (!disposed) {
          setState('error');
          setDetail(error instanceof Error ? error.message : String(error));
        }
      } finally {
        window.clearTimeout(timeout);
      }
    };

    void settle();

    return () => {
      disposed = true;
      controller.abort(new Error('Capture route unmounted'));
      window.clearTimeout(timeout);
      delete document.documentElement.dataset.factionSheet;
    };
  }, []);

  return (
    <>
      <output id="capture-status" data-capture-state={state} aria-live="polite" hidden>
        {detail}
      </output>
      <FactionSheetView faction={proofFaction} />
    </>
  );
}
