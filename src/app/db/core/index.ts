/** biome-ignore-all lint/style/noNonNullAssertion: <environment variables are always defined> */
import { ConvexReactClient } from 'convex/react';

const convexUrl = import.meta.env.VITE_CONVEX_URL!;
export const convex = new ConvexReactClient(convexUrl);

export const db = {
  query: async <T>(fn: string, args?: Record<string, unknown>): Promise<T> =>
    (await convex.query(fn as never, args as never)) as T,
  mutation: async <T>(fn: string, args?: Record<string, unknown>): Promise<T> =>
    (await convex.mutation(fn as never, args as never)) as T,
};

export const auth = {
  getUser: async () => {
    const userId = await db.query<string | null>('profiles:currentUserId', {});
    return { data: { user: userId ? { id: userId } : null } };
  },
};

export * from './types';
