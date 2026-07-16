import { describe, expect, test, vi } from 'vitest';

import { handleProofCaptureAsset } from './capture-route';

const token = 'capture-secret';

function assets() {
  return {
    fetch: vi.fn(async (request: Request) => new Response(new URL(request.url).pathname)),
  };
}

describe('proof capture Static Assets gate', () => {
  test.each([
    '/capture/proof/faction-sheet',
    '/proof-capture.html',
  ])('rejects unauthenticated access to %s before fetching an asset', async (pathname) => {
    const binding = assets();
    const response = await handleProofCaptureAsset(
      new Request(`https://proof.workers.dev${pathname}`),
      binding,
      token
    );

    expect(response?.status).toBe(404);
    expect(response?.headers.get('Cache-Control')).toBe('no-store');
    expect(binding.fetch).not.toHaveBeenCalled();
  });

  test.each([
    '/capture/proof/faction-sheet',
    '/proof-capture.html',
  ])('serves %s through the concrete protected asset after authentication', async (pathname) => {
    const binding = assets();
    const response = await handleProofCaptureAsset(
      new Request(`https://proof.workers.dev${pathname}`, {
        headers: { 'X-Asset-Proof-Token': token },
      }),
      binding,
      token
    );

    expect(response?.status).toBe(200);
    expect(response?.headers.get('Cache-Control')).toBe('no-store');
    await expect(response?.text()).resolves.toBe('/proof-capture.html');
    expect(binding.fetch).toHaveBeenCalledOnce();
  });

  test('is inert when the capture secret is absent', async () => {
    const binding = assets();
    const response = await handleProofCaptureAsset(
      new Request('https://proof.workers.dev/proof-capture.html', {
        headers: { 'X-Asset-Proof-Token': '' },
      }),
      binding,
      ''
    );

    expect(response?.status).toBe(404);
    expect(binding.fetch).not.toHaveBeenCalled();
  });

  test('leaves unrelated paths to the Worker router', async () => {
    const binding = assets();
    await expect(
      handleProofCaptureAsset(
        new Request('https://proof.workers.dev/proof-capture/entry.js'),
        binding,
        token
      )
    ).resolves.toBeUndefined();
  });
});
