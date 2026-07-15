export type ProofAssets = {
  fetch(request: Request): Promise<Response>;
};

export function proofCaptureAssetPath(pathname: string): string | undefined {
  if (pathname === '/capture/proof/faction-sheet' || pathname === '/proof-capture.html') {
    return '/proof-capture.html';
  }
  return undefined;
}

export async function handleProofCaptureAsset(
  request: Request,
  assets: ProofAssets,
  expectedToken: string
): Promise<Response | undefined> {
  const assetPath = proofCaptureAssetPath(new URL(request.url).pathname);
  if (!assetPath) {
    return undefined;
  }
  if (expectedToken.length === 0 || request.headers.get('X-Asset-Proof-Token') !== expectedToken) {
    return Response.json(
      { error: 'Not found' },
      { status: 404, headers: { 'Cache-Control': 'no-store' } }
    );
  }

  const assetUrl = new URL(assetPath, request.url);
  const assetResponse = await assets.fetch(new Request(assetUrl, request));
  const headers = new Headers(assetResponse.headers);
  headers.set('Cache-Control', 'no-store');
  return new Response(assetResponse.body, {
    status: assetResponse.status,
    statusText: assetResponse.statusText,
    headers,
  });
}
