import { test } from "node:test";
import assert from "node:assert/strict";
import {
  authCallbackParameters,
  authErrorMessage,
  isOrganisationType,
  validateOrganisation,
} from "../src/lib/auth-forms.ts";

test("organisation validation accepts boundary values and complete contact numbers", () => {
  assert.equal(validateOrganisation("AB", "123456", 0), null);
  assert.equal(validateOrganisation("A".repeat(120), "+91 (98765) 43210", 1_000_000), null);
  assert.equal(validateOrganisation("Hope Kitchen", "555-123-4567", 250), null);
  assert.equal(validateOrganisation("Hope Kitchen", "123456" + " ".repeat(34), 250), null);
});

test("organisation validation rejects out-of-range names, invalid phones and non-integer capacity", () => {
  for (const name of ["", "A", "A".repeat(121)]) {
    assert.match(validateOrganisation(name, "123456", 10), /organisation name/);
  }
  for (const phone of ["", "12345", "12abc3456", "123456@", "123456" + " ".repeat(35)]) {
    assert.match(validateOrganisation("Hope Kitchen", phone, 10), /phone number/);
  }
  for (const capacity of [-1, 1.5, 1_000_001, NaN, Infinity]) {
    assert.match(
      validateOrganisation("Hope Kitchen", "123456", capacity),
      /serving capacity.*per donation/,
    );
  }
});

test("only the three supported account roles are accepted", () => {
  assert.equal(isOrganisationType("Hotel"), true);
  assert.equal(isOrganisationType("NGO"), true);
  assert.equal(isOrganisationType("Volunteer"), true);
  for (const role of ["Admin", "hotel", "ngo", "", null, undefined, 1]) {
    assert.equal(isOrganisationType(role), false);
  }
});

test("auth errors give actionable guidance for credentials, confirmation, passwords and rate limits", () => {
  assert.match(authErrorMessage({ code: "invalid_credentials" }), /email or password is incorrect/);
  assert.match(authErrorMessage({ code: "email_not_confirmed" }), /Confirm your email/);
  for (const code of ["user_already_exists", "email_exists"]) {
    assert.match(authErrorMessage({ code }), /already exists/);
  }
  assert.match(authErrorMessage({ code: "weak_password" }), /at least 8 characters/);
  assert.match(authErrorMessage({ code: "same_password" }), /different from your current/);
  for (const code of [
    "over_email_send_rate_limit",
    "over_request_rate_limit",
    "over_email_rate_limit",
  ]) {
    assert.match(authErrorMessage({ code }), /wait a few minutes/);
  }
  for (const code of [
    "otp_expired",
    "flow_state_expired",
    "flow_state_not_found",
    "bad_code_verifier",
  ]) {
    assert.match(authErrorMessage({ code }), /request a new one/);
  }
});

test("network errors and unknown auth failures preserve safe useful fallbacks", () => {
  assert.match(authErrorMessage(new Error("Failed to fetch")), /internet connection/);
  assert.match(authErrorMessage(new Error("Network request failed")), /internet connection/);
  assert.equal(
    authErrorMessage({ code: "unknown", message: "private internal details" }, "Please try later."),
    "Please try later.",
  );
  assert.equal(authErrorMessage(null, "Please try later."), "Please try later.");
});

function withLocation(href, callback) {
  const original = Object.getOwnPropertyDescriptor(globalThis, "window");
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    writable: true,
    value: { location: { href } },
  });
  try {
    callback();
  } finally {
    if (original) Object.defineProperty(globalThis, "window", original);
    else delete globalThis.window;
  }
}

test("auth callback reads errors and recovery state from query strings and implicit-link fragments", () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, "window");
  withLocation("https://foodhope.example/auth", () => {
    assert.deepEqual(authCallbackParameters(), { error: null, recovery: false });
  });
  withLocation("https://foodhope.example/auth?error=access_denied#error_code=otp_expired", () => {
    assert.equal(authCallbackParameters().error, "access_denied");
  });
  withLocation("https://foodhope.example/auth#error_code=otp_expired", () => {
    assert.equal(authCallbackParameters().error, "otp_expired");
  });
  withLocation("https://foodhope.example/auth?error_description=Link%20expired", () => {
    assert.equal(authCallbackParameters().error, "Link expired");
  });
  withLocation("https://foodhope.example/auth#error_description=Link%20expired", () => {
    assert.equal(authCallbackParameters().error, "Link expired");
  });
  withLocation(
    "https://foodhope.example/update-password#type=recovery&access_token=fixture",
    () => {
      assert.deepEqual(authCallbackParameters(), { error: null, recovery: true });
    },
  );
  withLocation("https://foodhope.example/auth?type=recovery&code=fixture", () => {
    assert.equal(authCallbackParameters().recovery, true);
  });
  withLocation("https://foodhope.example/auth#type=signup", () => {
    assert.equal(authCallbackParameters().recovery, false);
  });
  assert.deepEqual(Object.getOwnPropertyDescriptor(globalThis, "window"), original);
});

test("callback fixture restores window even when an assertion or callback fails", () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, "window");
  assert.throws(
    () =>
      withLocation("https://foodhope.example/auth", () => {
        throw new Error("fixture failure");
      }),
    /fixture failure/,
  );
  assert.deepEqual(Object.getOwnPropertyDescriptor(globalThis, "window"), original);
});
