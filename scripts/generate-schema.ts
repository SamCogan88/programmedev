/**
 * Programme Schema Generator
 *
 * Generates public/assets/programme.schema.json from the TypeScript
 * Programme type definition. The TypeScript types are the single source
 * of truth — this script produces a JSON Schema 2020-12 document that
 * mirrors them.
 *
 * Usage: npx tsx scripts/generate-schema.ts
 *
 * Also invoked automatically during `vite build` via the Vite plugin
 * in vite.config.ts.
 *
 * @module scripts/generate-schema
 */

import { writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

import { createGenerator } from "ts-json-schema-generator";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, "..");

// ---------------------------------------------------------------------------
// Schema node type for recursive processing
// ---------------------------------------------------------------------------

interface SchemaNode {
  [key: string]: unknown;
  properties?: Record<string, SchemaNode>;
  additionalProperties?: SchemaNode | boolean;
  items?: SchemaNode | SchemaNode[];
  anyOf?: SchemaNode[];
  oneOf?: SchemaNode[];
  allOf?: SchemaNode[];
  definitions?: Record<string, SchemaNode>;
  $defs?: Record<string, SchemaNode>;
  $ref?: string;
}

// ---------------------------------------------------------------------------
// Post-processing helpers
// ---------------------------------------------------------------------------

/**
 * Remove additionalProperties from object schemas that have named properties.
 *
 * TypeScript interfaces with index signatures (`[key: string]: unknown`)
 * generate `additionalProperties: {}` which makes the schema accept any
 * extra keys. Since those index signatures exist only for runtime flexibility,
 * we strip them to produce a stricter validation schema.
 *
 * Objects that are *only* additionalProperties (e.g. Record<string, T>)
 * are left untouched — they have no named properties.
 */
function stripIndexSignatures(node: SchemaNode, visited = new Set<SchemaNode>()): void {
  if (typeof node !== "object" || node === null || visited.has(node)) {
    return;
  }
  visited.add(node);

  // Core rule: named properties + additionalProperties → strip the latter
  if (node.properties && node.additionalProperties !== undefined) {
    delete node.additionalProperties;
  }

  // Recurse into sub-schemas
  if (node.properties) {
    for (const prop of Object.values(node.properties)) {
      stripIndexSignatures(prop, visited);
    }
  }
  if (typeof node.additionalProperties === "object" && node.additionalProperties) {
    stripIndexSignatures(node.additionalProperties, visited);
  }
  if (node.items) {
    if (Array.isArray(node.items)) {
      node.items.forEach((i) => stripIndexSignatures(i, visited));
    } else {
      stripIndexSignatures(node.items, visited);
    }
  }
  for (const key of ["anyOf", "oneOf", "allOf"] as const) {
    if (Array.isArray(node[key])) {
      (node[key] as SchemaNode[]).forEach((s) => stripIndexSignatures(s, visited));
    }
  }
  for (const key of ["definitions", "$defs"] as const) {
    if (node[key]) {
      for (const def of Object.values(node[key] as Record<string, SchemaNode>)) {
        stripIndexSignatures(def, visited);
      }
    }
  }
}

/**
 * Rename `definitions` → `$defs` and update `$ref` paths for
 * JSON Schema 2020-12 compatibility.
 */
function upgradeTo202012(node: unknown, visited = new Set<unknown>()): void {
  if (typeof node !== "object" || node === null || visited.has(node)) {
    return;
  }
  visited.add(node);

  const obj = node as Record<string, unknown>;

  // Rename top-level definitions → $defs
  if (obj.definitions && !obj.$defs) {
    obj.$defs = obj.definitions;
    delete obj.definitions;
  }

  // Rewrite $ref paths
  if (typeof obj.$ref === "string") {
    obj.$ref = obj.$ref.replace("#/definitions/", "#/$defs/");
  }

  for (const value of Object.values(obj)) {
    if (typeof value === "object" && value !== null) {
      if (Array.isArray(value)) {
        value.forEach((item) => upgradeTo202012(item, visited));
      } else {
        upgradeTo202012(value, visited);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Main generation function
// ---------------------------------------------------------------------------

export function generateProgrammeSchema(rootDir: string = ROOT): void {
  const generator = createGenerator({
    path: resolve(rootDir, "src/types/programme.ts"),
    tsconfig: resolve(rootDir, "tsconfig.json"),
    type: "Programme",
    skipTypeCheck: true,
  });

  const schema = generator.createSchema("Programme") as SchemaNode;

  // 1. Add JSON Schema 2020-12 metadata
  schema.$schema = "https://json-schema.org/draft/2020-12/schema";
  schema.$id = "https://ncirl.ie/schemas/programme.schema.json";
  schema.title = "NCI Programme Design Schema";
  schema.description =
    "Schema for NCI Programme Design Studio programme data — auto-generated from TypeScript types";

  // 2. Strip index-signature artifacts ([key: string]: unknown)
  stripIndexSignatures(schema);

  // 3. Upgrade naming from draft-07 to 2020-12
  upgradeTo202012(schema);

  const outputPath = resolve(rootDir, "public/assets/programme.schema.json");
  writeFileSync(outputPath, JSON.stringify(schema, null, 2) + "\n");
  console.log("✓ Schema written to public/assets/programme.schema.json");
}

// ---------------------------------------------------------------------------
// CLI entry point — run when executed directly (not when imported)
// ---------------------------------------------------------------------------

const isDirectExecution = process.argv[1]?.endsWith("generate-schema.ts");
if (isDirectExecution) {
  generateProgrammeSchema();
}
