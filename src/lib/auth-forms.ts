export type OrganisationType = "Hotel" | "NGO" | "Volunteer";

export function isOrganisationType(value: unknown): value is OrganisationType {
  return value === "Hotel" || value === "NGO" || value === "Volunteer";
}

export function validateOrganisation(name: string, phone: string, capacity: number): string | null {
  if (name.length < 2 || name.length > 120)
    return "Enter an organisation name between 2 and 120 characters.";
  if (
    phone.length > 40 ||
    !/^[+\d(][\d\s()+.-]*$/.test(phone) ||
    phone.replace(/\D/g, "").length < 6
  ) {
    return "Enter a valid contact phone number, including your area or country code.";
  }
  if (!Number.isSafeInteger(capacity) || capacity < 0 || capacity > 1_000_000) {
    return "Enter a whole-number serving capacity between 0 and 1,000,000 meals per donation.";
  }
  return null;
}

export function authErrorMessage(
  error: unknown,
  fallback = "Something went wrong. Please try again.",
): string {
  const code =
    typeof error === "object" && error !== null && "code" in error ? String(error.code) : "";
  const message = error instanceof Error ? error.message : "";
  if (code === "invalid_credentials")
    return "The email or password is incorrect. Please try again.";
  if (code === "email_not_confirmed")
    return "Confirm your email using the link in your inbox before signing in.";
  if (code === "user_already_exists" || code === "email_exists")
    return "An account with this email already exists. Please sign in.";
  if (code === "weak_password") return "Choose a stronger password with at least 8 characters.";
  if (code === "same_password") return "Choose a password different from your current password.";
  if (
    code === "over_email_send_rate_limit" ||
    code === "over_request_rate_limit" ||
    code === "over_email_rate_limit"
  ) {
    return "Too many attempts. Please wait a few minutes and try again.";
  }
  if (
    code === "otp_expired" ||
    code === "flow_state_expired" ||
    code === "flow_state_not_found" ||
    code === "bad_code_verifier"
  ) {
    return "This link has expired or was already used. Please request a new one.";
  }
  if (/fetch|network|load failed/i.test(message))
    return "We could not connect. Check your internet connection and try again.";
  return fallback;
}

export function authCallbackParameters() {
  const url = new URL(window.location.href);
  const hash = new URLSearchParams(url.hash.slice(1));
  return {
    error:
      url.searchParams.get("error") ||
      hash.get("error") ||
      url.searchParams.get("error_code") ||
      hash.get("error_code") ||
      url.searchParams.get("error_description") ||
      hash.get("error_description"),
    recovery: (url.searchParams.get("type") || hash.get("type")) === "recovery",
  };
}
