import { describe, expect, it } from "vitest";

import { InvalidKontentUrlError, validateKontentUrl } from "../../../src/utils/kontentUrl.js";

describe("validateKontentUrl", () => {
  it.each([
    { input: "kontent.ai", expected: "kontent.ai" },
    { input: "https://kontent.ai", expected: "kontent.ai" },
    { input: "http://kontent.ai", expected: "kontent.ai" },
    { input: "eu-01.kontent.ai", expected: "eu-01.kontent.ai" },
    { input: "devkontentmasters.com", expected: "devkontentmasters.com" },
    { input: "sub.devkontentmasters.com", expected: "sub.devkontentmasters.com" },
    { input: "kontent.ai/", expected: "kontent.ai" },
  ] as const)("returns the normalized host $expected for allowed input $input", ({
    input,
    expected,
  }) => {
    expect(validateKontentUrl(input)).toBe(expected);
  });

  it.each([
    { input: "evil.com" },
    { input: "evilkontent.ai" },
    { input: "kontent.ai.evil.com" },
    { input: "evil.com/kontent.ai" },
    { input: "http://evil.com" },
    { input: "foo@evil.com" },
    { input: "notdevkontentmasters.com" },
    { input: "" },
  ] as const)("throws InvalidKontentUrlError for disallowed input $input", ({ input }) => {
    expect(() => validateKontentUrl(input)).toThrow(InvalidKontentUrlError);
  });

  it.each([
    { input: "127.0.0.1" },
    { input: "https://127.0.0.1" },
    { input: "169.254.169.254" }, // cloud metadata endpoint
    { input: "192.168.0.1" },
    { input: "10.0.0.1" },
    { input: "[::1]" },
  ] as const)("rejects raw IP address $input", ({ input }) => {
    expect(() => validateKontentUrl(input)).toThrow(InvalidKontentUrlError);
  });

  it.each([
    { input: "127.0.0.1.nip.io" }, // the DNS-to-loopback host used by the PoC
    { input: "kontent.ai.127.0.0.1.nip.io" },
    { input: "https://127.0.0.1.nip.io" },
  ] as const)("rejects DNS-to-loopback host $input", ({ input }) => {
    expect(() => validateKontentUrl(input)).toThrow(InvalidKontentUrlError);
  });

  it.each([
    { input: "kontent.ai:8080" },
    { input: "https://kontent.ai:8080" },
    { input: "kontent.ai:1234" },
    { input: "devkontentmasters.com:3000" },
    { input: "sub.kontent.ai:22" },
  ] as const)("rejects allowed host with a non-standard port $input", ({ input }) => {
    expect(() => validateKontentUrl(input)).toThrow(InvalidKontentUrlError);
  });

  it.each([
    { input: "user:pass@kontent.ai" },
    { input: "user@kontent.ai" },
    { input: "https://admin:secret@devkontentmasters.com" },
    { input: "evil.com@kontent.ai" }, // deceptive userinfo, real host is the allowed one
  ] as const)("rejects allowed host with embedded credentials $input", ({ input }) => {
    expect(() => validateKontentUrl(input)).toThrow(InvalidKontentUrlError);
  });
});
