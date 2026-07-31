import {
  createRemoteJWKSet,
  jwtVerify,
  type JWTPayload,
} from "jose";

const jwksCache = new Map<
  string,
  ReturnType<typeof createRemoteJWKSet>
>();

export type VerifiedSession = {
  userId: string;
  email: string | null;
  expiresAt: number | null;
  payload: JWTPayload;
};

function normalizeSupabaseUrl(value: string): string {
  return value.replace(/\/+$/, "");
}

function getBearerToken(request: Request): string | null {
  const authorization = request.headers.get("authorization");

  if (!authorization) {
    return null;
  }

  const [scheme, token] = authorization.trim().split(/\s+/, 2);

  if (scheme?.toLowerCase() !== "bearer" || !token) {
    return null;
  }

  return token;
}

function getRemoteJwks(supabaseUrl: string) {
  const normalizedUrl = normalizeSupabaseUrl(supabaseUrl);
  const cached = jwksCache.get(normalizedUrl);

  if (cached) {
    return cached;
  }

  const remoteJwks = createRemoteJWKSet(
    new URL(`${normalizedUrl}/auth/v1/.well-known/jwks.json`),
  );

  jwksCache.set(normalizedUrl, remoteJwks);

  return remoteJwks;
}

export async function verifySupabaseSession(
  request: Request,
  supabaseUrl: string,
): Promise<VerifiedSession | null> {
  const token = getBearerToken(request);

  if (!token) {
    return null;
  }

  const normalizedUrl = normalizeSupabaseUrl(supabaseUrl);

  try {
    const { payload } = await jwtVerify(
      token,
      getRemoteJwks(normalizedUrl),
      {
        issuer: `${normalizedUrl}/auth/v1`,
        audience: "authenticated",
        algorithms: ["ES256"],
      },
    );

    if (!payload.sub) {
      return null;
    }

    return {
      userId: payload.sub,
      email:
        typeof payload.email === "string"
          ? payload.email
          : null,
      expiresAt:
        typeof payload.exp === "number"
          ? payload.exp
          : null,
      payload,
    };
  } catch {
    return null;
  }
}
