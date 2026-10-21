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

type AnySessionFunction = FunctionReference<"query" | "mutation" | "action">;

type ArgsWithDeviceKey<Reference extends AnySessionFunction> = Omit<
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

export function useSessionQuery<Reference extends FunctionReference<"query">>(
  reference: Reference,
  args: ArgsWithDeviceKey<Reference> | "skip",
) {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const queryArgs: "skip" | FunctionArgs<Reference> =
    args === "skip" || isLoading
      ? "skip"
      : ({
          ...args,
          ...(!isAuthenticated ? { ownerKey: getAnonymousSessionId() } : {}),
        } as FunctionArgs<Reference>);
  return useQuery(reference, queryArgs);
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
      } as FunctionArgs<Reference>);
    },
    [isAuthenticated, isLoading, mutate],
  );
}

export function useSessionAction<Reference extends FunctionReference<"action">>(
  reference: Reference,
) {
  const run = useAction(reference);
  const { isAuthenticated, isLoading } = useConvexAuth();
  return useCallback(
    (args: ArgsWithDeviceKey<Reference>) => {
      if (isLoading) throw new Error("Authentication is still loading.");
      return run({
        ...args,
        ...(!isAuthenticated ? { ownerKey: getAnonymousSessionId() } : {}),
      } as FunctionArgs<Reference>);
    },
    [isAuthenticated, isLoading, run],
  );
}

export function useSessionPaginatedQuery<
  Reference extends FunctionReference<"query">,
>(
  reference: Reference,
  args: Omit<FunctionArgs<Reference>, "ownerKey" | "paginationOpts">,
  options: Parameters<typeof usePaginatedQuery<Reference>>[2],
) {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const queryArgs = isLoading
    ? "skip"
    : ({
        ...args,
        ...(!isAuthenticated ? { ownerKey: getAnonymousSessionId() } : {}),
      } as Parameters<typeof usePaginatedQuery<Reference>>[1]);
  return usePaginatedQuery(reference, queryArgs, options);
}
