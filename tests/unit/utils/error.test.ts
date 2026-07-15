import { SharedModels } from "@kontent-ai/management-sdk";
import { AxiosError, AxiosHeaders } from "axios";
import { describe, expect, it } from "vitest";

import { redactingReplacer, simplifyAxiosErrors } from "../../../src/utils/error.ts";

const fakeToken = "fake-token-123";
const bearerToken = `Bearer ${fakeToken}`;

const createAxiosError = () => {
  const headers = new AxiosHeaders({
    Authorization: bearerToken,
    "Content-Type": "application/json",
  });

  const config = {
    url: "https://manage.kontent.ai/v2/projects/env-id/items",
    method: "post",
    headers,
    data: '{"name":"item"}',
  };

  return new AxiosError(
    "Request failed with status code 401",
    "ERR_BAD_REQUEST",
    config as never,
    {},
    { status: 401, statusText: "Unauthorized", headers: {}, config } as never,
  );
};

describe("simplifyAxiosErrors", () => {
  it("masks the credential in the request headers while keeping the key and the rest", () => {
    const simplified = simplifyAxiosErrors(createAxiosError()) as {
      requestHeaders: Record<string, unknown>;
      status: number;
    };

    expect(simplified.requestHeaders["Authorization"]).toBe("***redacted***");
    expect(simplified.requestHeaders["Content-Type"]).toBe("application/json");
    expect(simplified.status).toBe(401);
    expect(JSON.stringify(simplified)).not.toContain(fakeToken);
  });

  it("returns a non-axios error untouched", () => {
    const plain = new Error("boom");

    expect(simplifyAxiosErrors(plain)).toBe(plain);
  });
});

describe("redactingReplacer", () => {
  it("masks a raw axios error nested in a Kontent error without dropping other fields", () => {
    const kontentError = new SharedModels.ContentManagementBaseKontentError({
      message: "The provided API key is invalid.",
      requestId: "request-id-42",
      errorCode: 5,
      originalError: createAxiosError(),
      validationErrors: [],
    });

    const output = JSON.stringify(kontentError, redactingReplacer);

    expect(output).not.toContain(fakeToken);
    expect(output).toContain("The provided API key is invalid.");
    expect(output).toContain("request-id-42");
  });

  it("masks credential keys at any depth and leaves harmless keys alone", () => {
    const payload = {
      level1: {
        authorization: bearerToken,
        level2: {
          "api-key": fakeToken,
          api_key: fakeToken,
          apiKey: fakeToken,
          harmless: "keep-me",
        },
      },
    };

    const output = JSON.stringify(payload, redactingReplacer);

    expect(output).not.toContain(fakeToken);
    expect(output).toContain("keep-me");
    expect(output.match(/\*\*\*redacted\*\*\*/g)).toHaveLength(4);
  });

  it("leaves the shape unchanged apart from the masked values", () => {
    const parsed = JSON.parse(
      JSON.stringify({ status: 401, headers: { authorization: bearerToken } }, redactingReplacer),
    );

    expect(parsed).toEqual({ status: 401, headers: { authorization: "***redacted***" } });
  });
});
