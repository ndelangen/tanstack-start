import type { AnyDataModel, GenericMutationCtx, GenericQueryCtx } from 'convex/server';

export type QueryCtx = GenericQueryCtx<AnyDataModel>;
export type MutationCtx = GenericMutationCtx<AnyDataModel>;
