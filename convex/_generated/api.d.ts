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
import type * as e2e from "../e2e.js";
import type * as factions from "../factions.js";
import type * as faq from "../faq.js";
import type * as groups from "../groups.js";
import type * as http from "../http.js";
import type * as lib_faqRulesetList from "../lib/faqRulesetList.js";
import type * as lib_ids from "../lib/ids.js";
import type * as lib_memberGroups from "../lib/memberGroups.js";
import type * as lib_policy from "../lib/policy.js";
import type * as lib_profileBootstrap from "../lib/profileBootstrap.js";
import type * as lib_profileSummary from "../lib/profileSummary.js";
import type * as lib_utils from "../lib/utils.js";
import type * as members from "../members.js";
import type * as migrations from "../migrations.js";
import type * as migrationsTemplate from "../migrationsTemplate.js";
import type * as profiles from "../profiles.js";
import type * as rulesets from "../rulesets.js";
import type * as types from "../types.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  e2e: typeof e2e;
  factions: typeof factions;
  faq: typeof faq;
  groups: typeof groups;
  http: typeof http;
  "lib/faqRulesetList": typeof lib_faqRulesetList;
  "lib/ids": typeof lib_ids;
  "lib/memberGroups": typeof lib_memberGroups;
  "lib/policy": typeof lib_policy;
  "lib/profileBootstrap": typeof lib_profileBootstrap;
  "lib/profileSummary": typeof lib_profileSummary;
  "lib/utils": typeof lib_utils;
  members: typeof members;
  migrations: typeof migrations;
  migrationsTemplate: typeof migrationsTemplate;
  profiles: typeof profiles;
  rulesets: typeof rulesets;
  types: typeof types;
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

export declare const components: {
  migrations: {
    lib: {
      cancel: FunctionReference<
        "mutation",
        "internal",
        { name: string },
        {
          batchSize?: number;
          cursor?: string | null;
          error?: string;
          isDone: boolean;
          latestEnd?: number;
          latestStart: number;
          name: string;
          next?: Array<string>;
          processed: number;
          state: "inProgress" | "success" | "failed" | "canceled" | "unknown";
        }
      >;
      cancelAll: FunctionReference<
        "mutation",
        "internal",
        { sinceTs?: number },
        Array<{
          batchSize?: number;
          cursor?: string | null;
          error?: string;
          isDone: boolean;
          latestEnd?: number;
          latestStart: number;
          name: string;
          next?: Array<string>;
          processed: number;
          state: "inProgress" | "success" | "failed" | "canceled" | "unknown";
        }>
      >;
      clearAll: FunctionReference<
        "mutation",
        "internal",
        { before?: number },
        null
      >;
      getStatus: FunctionReference<
        "query",
        "internal",
        { limit?: number; names?: Array<string> },
        Array<{
          batchSize?: number;
          cursor?: string | null;
          error?: string;
          isDone: boolean;
          latestEnd?: number;
          latestStart: number;
          name: string;
          next?: Array<string>;
          processed: number;
          state: "inProgress" | "success" | "failed" | "canceled" | "unknown";
        }>
      >;
      migrate: FunctionReference<
        "mutation",
        "internal",
        {
          batchSize?: number;
          cursor?: string | null;
          dryRun: boolean;
          fnHandle: string;
          name: string;
          next?: Array<{ fnHandle: string; name: string }>;
          oneBatchOnly?: boolean;
        },
        {
          batchSize?: number;
          cursor?: string | null;
          error?: string;
          isDone: boolean;
          latestEnd?: number;
          latestStart: number;
          name: string;
          next?: Array<string>;
          processed: number;
          state: "inProgress" | "success" | "failed" | "canceled" | "unknown";
        }
      >;
    };
  };
};
