import { timingSafeEqual } from "crypto";

const SECRET_HEADER = "authorization";

export function readAdminSecret(): string | null {
  const secret = process.env.ADMIN_SYNC_SECRET?.trim();
  return secret ? secret : null;
}

export function isAdminConfigured(): boolean {
  return Boolean(readAdminSecret());
}

export function extractBearerToken(request: Request): string | null {
  const header = request.headers.get(SECRET_HEADER);
  if (!header) {
    return null;
  }

  const [scheme, token] = header.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) {
    return null;
  }

  return token.trim();
}

export function isValidAdminSecret(provided: string | null | undefined): boolean {
  const expected = readAdminSecret();
  if (!expected || !provided) {
    return false;
  }

  const expectedBuffer = Buffer.from(expected);
  const providedBuffer = Buffer.from(provided);

  if (expectedBuffer.length !== providedBuffer.length) {
    return false;
  }

  return timingSafeEqual(expectedBuffer, providedBuffer);
}
