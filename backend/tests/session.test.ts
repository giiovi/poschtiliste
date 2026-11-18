import { useSecureSessionCookie } from "../src/session";

describe("session cookie security", () => {
  test("defaults to secure cookies in production", () => {
    expect(useSecureSessionCookie({ NODE_ENV: "production" })).toBe(true);
  });

  test("defaults to non-secure cookies outside production", () => {
    expect(useSecureSessionCookie({ NODE_ENV: "development" })).toBe(false);
  });

  test.each([
    ["true", true],
    [" TRUE ", true],
    ["false", false],
    [" FALSE ", false],
  ])("accepts the explicit value %s", (value, expected) => {
    expect(
      useSecureSessionCookie({
        NODE_ENV: "production",
        SESSION_COOKIE_SECURE: value,
      }),
    ).toBe(expected);
  });

  test("rejects invalid explicit values", () => {
    expect(() =>
      useSecureSessionCookie({ SESSION_COOKIE_SECURE: "sometimes" }),
    ).toThrow("SESSION_COOKIE_SECURE must be true or false");
  });
});
