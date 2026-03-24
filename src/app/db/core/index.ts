/** biome-ignore-all lint/style/noNonNullAssertion: <environment variables are always defined> */
import { ConvexHttpClient } from 'convex/browser';
import { ConvexReactClient } from 'convex/react';

const convexUrl = import.meta.env.VITE_CONVEX_URL!;
export const convex = new ConvexReactClient(convexUrl);

/** TanStack Start sets this while generating static HTML; no user session or reliable backend. */
export function isTanStackStartPrerendering(): boolean {
  return typeof process !== 'undefined' && process.env?.TSS_PRERENDERING === 'true';
}

let prerenderHttpClient: ConvexHttpClient | null = null;

function convexBackendForDb(): ConvexReactClient | ConvexHttpClient {
  if (isTanStackStartPrerendering()) {
    if (!prerenderHttpClient) {
      prerenderHttpClient = new ConvexHttpClient(convexUrl, { logger: false });
    }
    return prerenderHttpClient;
  }
  return convex;
}

export const db = {
  query: async <T>(fn: string, args?: Record<string, unknown>): Promise<T> => {
    const backend = convexBackendForDb();
    return (await backend.query(fn as never, args as never)) as T;
  },
  mutation: async <T>(fn: string, args?: Record<string, unknown>): Promise<T> => {
    const backend = convexBackendForDb();
    return (await backend.mutation(fn as never, args as never)) as T;
  },
};

export const auth = {
  getUser: async () => {
    const userId = await db.query<string | null>('profiles:currentUserId', {});
    return { data: { user: userId ? { id: userId } : null } };
  },
};

export * from './types';
