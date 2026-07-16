export function fakeR2Object(options: {
  key?: string;
  etag: string;
  size: number;
  uploaded: Date;
  customMetadata?: Record<string, string>;
}): R2Object {
  return {
    key: options.key ?? 'factions/faction/sheet.pdf',
    version: 'version',
    size: options.size,
    etag: options.etag,
    httpEtag: `"${options.etag}"`,
    checksums: { toJSON: () => ({}) },
    uploaded: options.uploaded,
    customMetadata: options.customMetadata,
    storageClass: 'Standard',
    writeHttpMetadata(_headers: Headers) {},
  } satisfies R2Object;
}
