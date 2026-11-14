import { describe, expect, test } from "bun:test";
import { nextConsentRoute, type ConsentMeta } from "./consent";

const complete: ConsentMeta = {
  age_verified: true,
  age_verification_version: "v1",
  tos_version: "v2",
  tos_accepted_at: "2026-11-14T01:26:00Z",
  aor_version: "v1",
  aor_decision: "accepted",
  aor_decided_at: "2026-11-14T01:27:00Z",
};

describe("mandatory consent ordering", () => {
  test("age verification is required before either legal step", () => {
    expect(nextConsentRoute({ ...complete, age_verified: false })).toBe("/age-verification");
    expect(nextConsentRoute(undefined)).toBe("/age-verification");
  });
  test("missing or outdated Terms always block app access", () => {
    expect(nextConsentRoute({ ...complete, tos_version: undefined })).toBe("/terms");
    expect(nextConsentRoute({ ...complete, tos_version: "v1" })).toBe("/terms");
  });
  test("Terms require a recorded acceptance timestamp", () => {
    expect(nextConsentRoute({ ...complete, tos_accepted_at: undefined })).toBe("/terms");
    expect(nextConsentRoute({ ...complete, tos_accepted_at: "invalid" })).toBe("/terms");
  });
  test("attestation follows accepted Terms and requires the current version", () => {
    expect(nextConsentRoute({ ...complete, aor_decision: null })).toBe("/authority-of-record");
    expect(nextConsentRoute({ ...complete, aor_version: undefined })).toBe("/authority-of-record");
  });
  test("attestation requires a recorded decision timestamp", () => {
    expect(nextConsentRoute({ ...complete, aor_decided_at: undefined })).toBe("/authority-of-record");
  });
  test("an elective Authority of Record decline permits entry", () => {
    expect(nextConsentRoute({ ...complete, aor_decision: "declined" })).toBeNull();
  });
  test("both completed current-version steps permit entry", () => {
    expect(nextConsentRoute(complete)).toBeNull();
  });
});