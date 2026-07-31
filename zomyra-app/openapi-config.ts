/**
 * `@rtk-query/codegen-openapi` config — the mechanism behind O-11.
 *
 * Run it with `yarn api:generate` **once the backend serves its OpenAPI
 * schema** (O-8). It reads the schema, emits typed endpoints into
 * `src/api/generated/endpoints.ts`, and from that point a field the backend
 * renamed is a TypeScript error at build time instead of a 400 discovered
 * during integration.
 *
 * Why this matters more than it sounds: both sides of this project are being
 * built in parallel from TDDs that describe their own field names as
 * "illustrative, not finalized". O-16 — the backend having no `state` field, so
 * Module 5's onboarding submit will 400 — was found by diffing two Word
 * documents by hand. This is the mechanised version of that, and the reason
 * `src/api/contract.ts` is labelled provisional.
 *
 * ⚠️ Generate against the **schema**, not against what we wish it said. If the
 * served schema has no `state` field, the generated types will not have one
 * either, and that is the correct outcome — it is O-16 showing up as a compile
 * error, which is exactly the point. Do not hand-patch generated output.
 *
 * NestJS with `@nestjs/swagger` serves the schema at `/v1/docs-json`.
 */
import type { ConfigFile } from "@rtk-query/codegen-openapi";

const host = process.env.EXPO_PUBLIC_API_URL ?? "";

const config: ConfigFile = {
  schemaFile: `${host.replace(/\/+$/, "")}/v1/docs-json`,
  apiFile: "./src/api/api.ts",
  apiImport: "api",
  outputFile: "./src/api/generated/endpoints.ts",
  exportName: "generatedApi",
  hooks: { queries: true, lazyQueries: true, mutations: true },
  tag: true,
};

export default config;
