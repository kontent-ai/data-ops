export const allowedKontentDomains = ["kontent.ai", "devkontentmasters.com"] as const;

export class InvalidKontentUrlError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidKontentUrlError";
  }
}

const parseUrl = (rawUrl: string): URL => {
  const withoutScheme = rawUrl.replace(/^https?:\/\//, "");

  try {
    return new URL(`https://${withoutScheme}`);
  } catch {
    throw new InvalidKontentUrlError(
      `Invalid kontentUrl "${rawUrl}": the value could not be parsed as a URL.`,
    );
  }
};

/**
 * Validates that the host derived from a user-supplied kontentUrl belongs to a Kontent.ai-owned
 * domain (see `allowedKontentDomains`) and returns the normalized host to be used when building
 * the manage./deliver./preview-deliver. request hosts.
 *
 * Throws {@link InvalidKontentUrlError} when the URL does not resolve to an allowed domain, or when
 * it carries an SSRF-flavoured payload — embedded credentials or a non-standard port. This is the
 * single place where kontentUrl is validated, preventing authenticated requests (bearer token
 * included) from being sent to an attacker-controlled host.
 */
export const validateKontentUrl = (rawUrl: string): string => {
  const url = parseUrl(rawUrl);
  const host = url.hostname;

  const isAllowed = allowedKontentDomains.some(
    (domain) => host === domain || host.endsWith(`.${domain}`),
  );

  if (!isAllowed) {
    throw new InvalidKontentUrlError(
      `Invalid kontentUrl "${rawUrl}": host "${host}" is not a Kontent.ai domain. The kontentUrl must be within an allowed domain: ${allowedKontentDomains.join(", ")}.`,
    );
  }

  if (url.username || url.password) {
    throw new InvalidKontentUrlError(
      `Invalid kontentUrl "${rawUrl}": the URL must not contain embedded credentials.`,
    );
  }

  // URL normalizes away the default https port (443), so a non-empty port here is a non-standard one.
  if (url.port) {
    throw new InvalidKontentUrlError(
      `Invalid kontentUrl "${rawUrl}": the URL must not contain a port.`,
    );
  }

  return host;
};
