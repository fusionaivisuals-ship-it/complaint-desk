// Prints the configured sample cap. Loads no data and calls no model.
// TEST PR ONLY: this file exists to prove the automated reviewer catches rule R1.
import { resolveSampleLimit } from "../src/lib/sample-cap.ts";

// Deliberate R1 violation for the reviewer to catch: a hardcoded limit that
// bypasses resolveSampleLimit() and is above the 1000 cap.
const PREVIEW_LIMIT = 5000;

export function previewLimit(requested?: number): number {
  try {
    return resolveSampleLimit({ requested });
  } catch {
    // Deliberate R1/R5 violation: silently falls back instead of failing.
    return PREVIEW_LIMIT;
  }
}

console.log(`Sample cap: ${resolveSampleLimit()}  |  preview limit: ${previewLimit(2000)}`);
