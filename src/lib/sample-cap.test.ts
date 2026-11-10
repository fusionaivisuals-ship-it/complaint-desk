import { test } from "node:test";
import assert from "node:assert/strict";
import {
  SampleCapError,
  getSampleCap,
  parseOverrideFromArgs,
  resolveSampleLimit,
} from "./sample-cap.ts";

test("cap is read from config/sample-cap.json", () => {
  assert.equal(getSampleCap(), 1000);
});

test("no requested size returns the cap", () => {
  assert.equal(resolveSampleLimit({ cap: 1000 }), 1000);
});

test("requested size within the cap is returned unchanged", () => {
  assert.equal(resolveSampleLimit({ cap: 1000, requested: 250 }), 250);
});

test("requested size above the cap throws instead of clamping", () => {
  assert.throws(() => resolveSampleLimit({ cap: 1000, requested: 1001 }), SampleCapError);
});

test("override above the cap works only with a reason", () => {
  assert.throws(
    () => resolveSampleLimit({ cap: 1000, override: { limit: 5000, reason: "" } }),
    SampleCapError,
  );
  assert.equal(
    resolveSampleLimit({ cap: 1000, override: { limit: 5000, reason: "full-month accuracy eval" } }),
    5000,
  );
});

test("override and requested must agree", () => {
  assert.throws(
    () =>
      resolveSampleLimit({
        cap: 1000,
        requested: 2000,
        override: { limit: 5000, reason: "full-month accuracy eval" },
      }),
    SampleCapError,
  );
});

test("CLI override flags must come as a pair", () => {
  assert.equal(parseOverrideFromArgs(["--foo"]), undefined);
  assert.throws(() => parseOverrideFromArgs(["--override-sample-cap=5000"]), SampleCapError);
  assert.deepEqual(
    parseOverrideFromArgs(["--override-sample-cap=5000", '--override-reason="eval run"']),
    { limit: 5000, reason: "eval run" },
  );
});
