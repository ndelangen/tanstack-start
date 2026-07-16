const BASE64URL_SEGMENT = /^[A-Za-z0-9_-]+$/;
const HMAC_SHA256_BASE64URL_CHARACTERS = 43;

export const MAX_RENDER_CAPABILITY_BYTES = 8_192;

/**
 * Checks the bounded wire grammar produced by Convex's createRenderCapability.
 * Cryptographic authority and payload semantics remain the Convex render route's job.
 */
export function isRenderCapability(value: unknown): value is string {
  // Accepted segments are ASCII-only, so string length is also the encoded byte length.
  if (typeof value !== 'string' || value.length > MAX_RENDER_CAPABILITY_BYTES) return false;

  const separator = value.indexOf('.');
  if (separator <= 0 || value.indexOf('.', separator + 1) !== -1) return false;

  const payload = value.slice(0, separator);
  const signature = value.slice(separator + 1);
  return (
    payload.length % 4 !== 1 &&
    signature.length === HMAC_SHA256_BASE64URL_CHARACTERS &&
    BASE64URL_SEGMENT.test(payload) &&
    BASE64URL_SEGMENT.test(signature)
  );
}
