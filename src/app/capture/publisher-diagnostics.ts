const ABSOLUTE_URL = /https?:\/\/(?:[^\s"'`<>\])}]|<redacted>)+/giu;
const NETWORK_PATH_URL = /(^|[^\p{L}\p{N}\p{M}_./:-])(\/\/(?:[^\s"'`<>\])}]|<redacted>)+)/giu;
const ROOT_RELATIVE_URL = /(^|[\s([{:])\/(?!\/)[^\s"'<>]+/gu;
const DIAGNOSTIC_BASE_URL = 'https://publisher.invalid';
const REDACTED_SUFFIX = /(?:<redacted>)+$/u;

export function redactPublisherResource(value: string, base?: string): string {
  try {
    const resource = new URL(value, base);
    if (resource.protocol !== 'http:' && resource.protocol !== 'https:') {
      return '<redacted-resource>';
    }
    return `${resource.origin}/<redacted>`;
  } catch {
    return '<redacted-resource>';
  }
}

function redactAbsoluteResource(value: string): string {
  const normalized = value.replace(REDACTED_SUFFIX, '<redacted>');
  const redacted = redactPublisherResource(normalized);
  return redacted === normalized ? normalized : redacted;
}

export function sanitizePublisherDiagnostic(value: string): string {
  return value
    .replace(ABSOLUTE_URL, (url) => redactAbsoluteResource(url))
    .replace(NETWORK_PATH_URL, (_match, prefix: string, url: string) => {
      return `${prefix}${redactPublisherResource(url, DIAGNOSTIC_BASE_URL)}`;
    })
    .replace(ROOT_RELATIVE_URL, (_url, prefix: string) => `${prefix}/<redacted>`);
}

export function publisherErrorMessage(error: unknown): string {
  return sanitizePublisherDiagnostic(error instanceof Error ? error.message : String(error));
}

export function serializePublisherLogEvent(event: Record<string, unknown>): string {
  return JSON.stringify(event, (_key, value: unknown) => {
    if (value instanceof Error) return publisherErrorMessage(value);
    return typeof value === 'string' ? sanitizePublisherDiagnostic(value) : value;
  });
}
