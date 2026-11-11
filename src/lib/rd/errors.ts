const MESSAGES: Record<number, string> = {
  5: "Slow down, too many requests",
  8: "Session expired, sign in again",
  9: "Real-Debrid refused this action",
  16: "This host isn't supported",
  17: "This host is under maintenance",
  18: "Daily limit reached for this host",
  19: "Link is no longer available on Real-Debrid",
  20: "Requires a premium account",
  21: "Too many active downloads",
  23: "Traffic exhausted",
  24: "File is unavailable",
  25: "Real-Debrid is temporarily unavailable",
  29: "Torrent is too big",
  30: "Torrent file is invalid",
  33: "Torrent is already active",
  34: "Too many requests, try again shortly",
  35: "File removed for infringement",
  36: "Fair usage limit reached",
};

export class RdError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: number | null,
  ) {
    super(message);
    this.name = "RdError";
  }
}

export async function toRdError(res: Response): Promise<RdError> {
  // Non-JSON error bodies (proxies, outages) fall through to the status text.
  const body: { error?: string | null; error_code?: number | null } = await res.json().catch(() => ({}));
  const code = body.error_code ?? null;
  const message = (code !== null && MESSAGES[code]) || humanize(body.error) || res.statusText || `HTTP ${res.status}`;
  return new RdError(message, res.status, code);
}

function humanize(error: string | null | undefined): string | undefined {
  if (!error) return undefined;
  const text = error.replace(/_/g, " ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}
