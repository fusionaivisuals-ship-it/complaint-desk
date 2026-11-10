/**
 * The sample cap: the maximum number of complaints any script may load or
 * send to a model. Every data or model script must get its limit from
 * resolveSampleLimit() — never from a hardcoded number.
 *
 * Rules (DECISIONS.md D2, CLAUDE.md R1):
 * - The cap lives in one place: config/sample-cap.json.
 * - Asking for more than the cap without an override throws. There is no
 *   silent clamping and no silent default above the cap.
 * - Going above the cap needs an explicit override with a number AND a reason,
 *   and the override is announced on stderr.
 */
import { readFileSync } from "node:fs";

const CONFIG_URL = new URL("../../config/sample-cap.json", import.meta.url);

export class SampleCapError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SampleCapError";
  }
}

export type SampleCapOverride = {
  /** The limit to use instead of the cap. Must be a positive integer. */
  limit: number;
  /** Why the cap is being exceeded. Required, so overrides are deliberate. */
  reason: string;
};

function assertPositiveInt(value: unknown, what: string): asserts value is number {
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
    throw new SampleCapError(`${what} must be a positive integer, got ${JSON.stringify(value)}`);
  }
}

/** Reads the cap from config/sample-cap.json. Throws if missing or invalid. */
export function getSampleCap(configUrl: URL = CONFIG_URL): number {
  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(configUrl, "utf8"));
  } catch (err) {
    throw new SampleCapError(`Could not read sample cap config at ${configUrl.pathname}: ${String(err)}`);
  }
  const cap = (parsed as { sampleCap?: unknown }).sampleCap;
  assertPositiveInt(cap, "sampleCap in config/sample-cap.json");
  return cap;
}

/**
 * Returns how many complaints a script may process.
 *
 * - No requested size: returns the cap.
 * - Requested size within the cap: returns it.
 * - Requested size above the cap, no override: throws SampleCapError.
 * - Override given: validates it, prints a warning to stderr, returns override.limit.
 */
export function resolveSampleLimit(
  options: { requested?: number; override?: SampleCapOverride; cap?: number } = {},
): number {
  const cap = options.cap ?? getSampleCap();
  const { requested, override } = options;

  if (override) {
    assertPositiveInt(override.limit, "override.limit");
    if (typeof override.reason !== "string" || override.reason.trim().length < 10) {
      throw new SampleCapError("override.reason is required (at least 10 characters) when exceeding the sample cap");
    }
    if (requested !== undefined && requested !== override.limit) {
      throw new SampleCapError(
        `requested (${requested}) and override.limit (${override.limit}) disagree; pass only one number`,
      );
    }
    console.warn(
      `[sample-cap] OVERRIDE: using ${override.limit} (cap is ${cap}). Reason: ${override.reason.trim()}`,
    );
    return override.limit;
  }

  if (requested === undefined) return cap;
  assertPositiveInt(requested, "requested");
  if (requested > cap) {
    throw new SampleCapError(
      `Requested ${requested} complaints but the sample cap is ${cap}. ` +
        `Pass an explicit override (--override-sample-cap=<n> --override-reason="<why>") or raise the cap in config/sample-cap.json on purpose.`,
    );
  }
  return requested;
}

/**
 * Parses an override from CLI args, for scripts:
 *   --override-sample-cap=5000 --override-reason="full-month accuracy eval"
 * Returns undefined when neither flag is present. Throws if only one is given.
 */
export function parseOverrideFromArgs(args: readonly string[]): SampleCapOverride | undefined {
  const get = (flag: string) => {
    const hit = args.find((a) => a.startsWith(`${flag}=`));
    return hit === undefined ? undefined : hit.slice(flag.length + 1).replace(/^["']|["']$/g, "");
  };
  const limitRaw = get("--override-sample-cap");
  const reason = get("--override-reason");
  if (limitRaw === undefined && reason === undefined) return undefined;
  if (limitRaw === undefined || reason === undefined) {
    throw new SampleCapError("--override-sample-cap and --override-reason must be passed together");
  }
  return { limit: Number(limitRaw), reason };
}
