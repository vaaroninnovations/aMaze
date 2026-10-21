import { useCallback } from "react";
import {
  useAction,
  useMutation,
  usePaginatedQuery,
  useQuery,
} from "convex/react";
import type { FunctionArgs, FunctionReference } from "convex/server";
import { getAnonymousSessionId } from "./anonymous-session.ts";

type ArgsWithDeviceKey<Reference extends FunctionReference> = Omit<
  FunctionArgs<Reference>,
  "ownerKey"
>;

export function useAnonymousQuery<
  Reference extends FunctionReference<"query">,
>(reference: Reference, args: ArgsWithDeviceKey<Reference> | "skip") {
  const ownerKey = getAnonymousSessionId();
  return useQuery(
    reference,
    args === "skip" ? "skip" : { ...args, ownerKey },
  );
}

export function useAnonymousMutation<
  Reference extends FunctionReference<"mutation">,
>(reference: Reference) {
  const mutate = useMutation(reference);
  return useCallback(
    (args: ArgsWithDeviceKey<Reference>) =>
      mutate({ ...args, ownerKey: getAnonymousSessionId() }),
    [mutate],
  );
}

export function useAnonymousAction<
  Reference extends FunctionReference<"action">,
>(reference: Reference) {
  const run = useAction(reference);
  return useCallback(
    (args: ArgsWithDeviceKey<Reference>) =>
      run({ ...args, ownerKey: getAnonymousSessionId() }),
    [run],
  );
}

export function useAnonymousPaginatedQuery<
  Reference extends FunctionReference<"query">,
>(
  reference: Reference,
  args: ArgsWithDeviceKey<Reference>,
  options: Parameters<typeof usePaginatedQuery<Reference>>[2],
) {
  return usePaginatedQuery(
    reference,
    { ...args, ownerKey: getAnonymousSessionId() },
    options,
  );
}
