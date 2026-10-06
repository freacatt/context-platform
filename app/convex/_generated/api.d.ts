/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as ai from "../ai.js";
import type * as aiSettings from "../aiSettings.js";
import type * as auth from "../auth.js";
import type * as contextDocuments from "../contextDocuments.js";
import type * as contextPacks from "../contextPacks.js";
import type * as decisions from "../decisions.js";
import type * as designSystems from "../designSystems.js";
import type * as diagrams from "../diagrams.js";
import type * as directories from "../directories.js";
import type * as glossaries from "../glossaries.js";
import type * as http from "../http.js";
import type * as knowledge from "../knowledge.js";
import type * as lib_access from "../lib/access.js";
import type * as lib_ai from "../lib/ai.js";
import type * as lib_knowledge from "../lib/knowledge.js";
import type * as lib_openrouter from "../lib/openrouter.js";
import type * as lib_pyramidContext from "../lib/pyramidContext.js";
import type * as lib_specDocs from "../lib/specDocs.js";
import type * as lib_workspaceTransfer from "../lib/workspaceTransfer.js";
import type * as links from "../links.js";
import type * as productDefinitions from "../productDefinitions.js";
import type * as pyramidFiles from "../pyramidFiles.js";
import type * as pyramidMigrations from "../pyramidMigrations.js";
import type * as pyramidPresets from "../pyramidPresets.js";
import type * as pyramidRunner from "../pyramidRunner.js";
import type * as pyramids from "../pyramids.js";
import type * as researchStudies from "../researchStudies.js";
import type * as roadmaps from "../roadmaps.js";
import type * as technicalArchitectures from "../technicalArchitectures.js";
import type * as technicalPlans from "../technicalPlans.js";
import type * as uiUxArchitectures from "../uiUxArchitectures.js";
import type * as users from "../users.js";
import type * as workspaces from "../workspaces.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  ai: typeof ai;
  aiSettings: typeof aiSettings;
  auth: typeof auth;
  contextDocuments: typeof contextDocuments;
  contextPacks: typeof contextPacks;
  decisions: typeof decisions;
  designSystems: typeof designSystems;
  diagrams: typeof diagrams;
  directories: typeof directories;
  glossaries: typeof glossaries;
  http: typeof http;
  knowledge: typeof knowledge;
  "lib/access": typeof lib_access;
  "lib/ai": typeof lib_ai;
  "lib/knowledge": typeof lib_knowledge;
  "lib/openrouter": typeof lib_openrouter;
  "lib/pyramidContext": typeof lib_pyramidContext;
  "lib/specDocs": typeof lib_specDocs;
  "lib/workspaceTransfer": typeof lib_workspaceTransfer;
  links: typeof links;
  productDefinitions: typeof productDefinitions;
  pyramidFiles: typeof pyramidFiles;
  pyramidMigrations: typeof pyramidMigrations;
  pyramidPresets: typeof pyramidPresets;
  pyramidRunner: typeof pyramidRunner;
  pyramids: typeof pyramids;
  researchStudies: typeof researchStudies;
  roadmaps: typeof roadmaps;
  technicalArchitectures: typeof technicalArchitectures;
  technicalPlans: typeof technicalPlans;
  uiUxArchitectures: typeof uiUxArchitectures;
  users: typeof users;
  workspaces: typeof workspaces;
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
