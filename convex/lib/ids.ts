import type { MutationCtx } from '../types';

export async function nextNumberId(ctx: MutationCtx, key: string) {
  const counter = await ctx.db
    .query('counters')
    .withIndex('by_key', (q) => q.eq('key', key))
    .unique();

  if (!counter) {
    await ctx.db.insert('counters', { key, value: 1 });
    return 1;
  }

  const nextValue = counter.value + 1;
  await ctx.db.patch(counter._id, { value: nextValue });
  return nextValue;
}
