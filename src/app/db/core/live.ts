import { useMutation as useConvexMutation, useQuery as useConvexQuery } from 'convex/react';
import type { FunctionReference } from 'convex/server';
import { useCallback, useState } from 'react';

type MutationOptions<TResult, TVariables> = {
  onSuccess?: (data: TResult, variables: TVariables) => void;
  onError?: (error: Error, variables: TVariables) => void;
  onSettled?: (data: TResult | undefined, error: Error | null, variables: TVariables) => void;
};

export type LiveQueryResult<TData> = {
  data: TData | undefined;
  isPending: boolean;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
};

export type LiveMutationResult<TVariables, TResult> = {
  mutate: (variables: TVariables, options?: MutationOptions<TResult, TVariables>) => void;
  mutateAsync: (variables: TVariables) => Promise<TResult>;
  isPending: boolean;
  isError: boolean;
  error: Error | null;
  data: TResult | undefined;
  reset: () => void;
};

export function useLiveQuery<TData, TArgs extends Record<string, unknown>>(
  queryRef: FunctionReference<'query'>,
  args: TArgs,
  options?: { enabled?: boolean; initialData?: () => TData | undefined }
): LiveQueryResult<TData> {
  const enabled = options?.enabled ?? true;
  const liveData = useConvexQuery(queryRef, enabled ? (args as never) : 'skip');
  const fallbackData = options?.initialData?.();
  const data = (liveData as TData | undefined) ?? fallbackData;

  return {
    data,
    isPending: enabled && liveData === undefined,
    isLoading: enabled && liveData === undefined,
    isError: false,
    error: null,
  };
}

export function useLiveMutation<TVariables, TResult>(
  mutationRef: FunctionReference<'mutation'>
): LiveMutationResult<TVariables, TResult> {
  const mutateRef = useConvexMutation(mutationRef);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [data, setData] = useState<TResult | undefined>(undefined);

  const mutateAsync = useCallback(
    async (variables: TVariables): Promise<TResult> => {
      setIsPending(true);
      setError(null);
      try {
        const result = (await mutateRef(variables as never)) as TResult;
        setData(result);
        return result;
      } catch (err) {
        const normalized = err instanceof Error ? err : new Error(String(err));
        setError(normalized);
        throw normalized;
      } finally {
        setIsPending(false);
      }
    },
    [mutateRef]
  );

  const mutate = useCallback(
    (variables: TVariables, options?: MutationOptions<TResult, TVariables>) => {
      void mutateAsync(variables)
        .then((result) => {
          options?.onSuccess?.(result, variables);
          options?.onSettled?.(result, null, variables);
        })
        .catch((err: Error) => {
          options?.onError?.(err, variables);
          options?.onSettled?.(undefined, err, variables);
        });
    },
    [mutateAsync]
  );

  const reset = useCallback(() => {
    setIsPending(false);
    setError(null);
    setData(undefined);
  }, []);

  return {
    mutate,
    mutateAsync,
    isPending,
    isError: error != null,
    error,
    data,
    reset,
  };
}
