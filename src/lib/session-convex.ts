import { useCallback } from "react";
import {
  useAction,
  useMutation,
  usePaginatedQuery,
  useQuery,
} from "convex/react";
import { useConvexAuth } from "@convex-dev/auth/react";
import type { FunctionArgs, FunctionReference } from "convex/server";
import { getAnonymousSessionId } from "./anonymous-session.ts";

type ArgsWithDeviceKey<Reference extends FunctionReference> = Omit<
  FunctionArgs<Reference>,
  "ownerKey"
>;

export function useSessionOwnerKey() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  return {
    ownerKey: isAuthenticated ? undefined : getAnonymousSessionId(),
    isLoading,
    isAuthenticated,
  };
}

export function useSessionQuery<
  Reference extends FunctionReference<"query">,
>(reference: Reference, args: ArgsWithDeviceKey<Reference> | "skip") {
  const { isAuthenticated, isLoading } = useConvexAuth();
  return useQuery(
    reference,
    args === "skip" || isLoading
      ? "skip"
      : {
          ...args,
          ...(!isAuthenticated ? { ownerKey: getAnonymousSessionId() } : {}),
        },
  );
}

export function useSessionMutation<
  Reference extends FunctionReference<"mutation">,
>(reference: Reference) {
  const mutate = useMutation(reference);
  const { isAuthenticated, isLoading } = useConvexAuth();
  return useCallback(
    (args: ArgsWithDeviceKey<Reference>) => {
      if (isLoading) throw new Error("Authentication is still loading.");
      return mutate({
        ...args,
        ...(!isAuthenticated ? { ownerKey: getAnonymousSessionId() } : {}),
      });
    },
    [isAuthenticated, isLoading, mutate],
  );
}

export function useSessionAction<
  Reference extends FunctionReference<"action">,
>(reference: Reference) {
  const run = useAction(reference);
  const { isAuthenticated, isLoading } = useConvexAuth();
  return useCallback(
    (args: ArgsWithDeviceKey<Reference>) => {
      if (isLoading) throw new Error("Authentication is still loading.");
      return run({
        ...args,
        ...(!isAuthenticated ? { ownerKey: getAnonymousSessionId() } : {}),
      });
    },
    [isAuthenticated, isLoading, run],
  );
}

export function useSessionPaginatedQuery<
  Reference extends FunctionReference<"query">,
>(
  reference: Reference,
  args: ArgsWithDeviceKey<Reference>,
  options: Parameters<typeof usePaginatedQuery<Reference>>[2],
) {
  const { isAuthenticated } = useConvexAuth();
  return usePaginatedQuery(
    reference,
    {
      ...args,
      ...(!isAuthenticated ? { ownerKey: getAnonymousSessionId() } : {}),
    },
    options,
  );
}
