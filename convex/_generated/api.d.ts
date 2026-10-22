/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as auth from "../auth.js";
import type * as contact from "../contact.js";
import type * as experiments_experiments from "../experiments/experiments.js";
import type * as experiments_groups from "../experiments/groups.js";
import type * as experiments_sharing from "../experiments/sharing.js";
import type * as experiments_subjects from "../experiments/subjects.js";
import type * as experiments_trials from "../experiments/trials.js";
import type * as helpers_access from "../helpers/access.js";
import type * as http from "../http.js";
import type * as schema_experiments from "../schema/experiments.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  contact: typeof contact;
  "experiments/experiments": typeof experiments_experiments;
  "experiments/groups": typeof experiments_groups;
  "experiments/sharing": typeof experiments_sharing;
  "experiments/subjects": typeof experiments_subjects;
  "experiments/trials": typeof experiments_trials;
  "helpers/access": typeof helpers_access;
  http: typeof http;
  "schema/experiments": typeof schema_experiments;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
