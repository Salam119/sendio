import type { VerifiedSession } from "./auth";
import type {
  ChatParticipant,
  ChatRole,
} from "./types";

export type ChatWorkerEnv = Env & {
  SUPABASE_ANON_KEY: string;
};

type ProfileRow = {
  full_name: string | null;
  user_type: string | null;
  role: string | null;
};

type CompanyRow = {
  slug: string | null;
  logo: string | null;
};

type WorkerRow = {
  slug: string | null;
  avatar: string | null;
};

type JsonRecord = Record<string, unknown>;

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object"
    ? (value as JsonRecord)
    : {};
}

function getBearerToken(request: Request): string {
  const authorization = request.headers.get("authorization");
  const [scheme, token] =
    authorization?.trim().split(/\s+/, 2) ?? [];

  if (scheme?.toLowerCase() !== "bearer" || !token) {
    throw new Error("authorization_required");
  }

  return token;
}

function isPublicRole(value: unknown): value is ChatRole {
  return (
    value === "client" ||
    value === "worker" ||
    value === "company"
  );
}

function isAdminRole(value: unknown): value is ChatRole {
  return value === "admin" || value === "super_admin";
}

function resolveProfileRole(profile: ProfileRow): ChatRole {
  if (isAdminRole(profile.role)) return profile.role;
  if (isPublicRole(profile.user_type)) return profile.user_type;

  throw new Error("unsupported_chat_role");
}

function resolveClaimRole(
  session: VerifiedSession,
): ChatRole | null {
  const appMetadata = asRecord(session.payload.app_metadata);
  const userMetadata = asRecord(session.payload.user_metadata);

  if (isAdminRole(appMetadata.role)) {
    return appMetadata.role;
  }

  const userType =
    appMetadata.user_type ?? userMetadata.user_type;

  return isPublicRole(userType) ? userType : null;
}

function getFallbackName(session: VerifiedSession): string {
  const userMetadata = asRecord(session.payload.user_metadata);
  const metadataName = [
    userMetadata.full_name,
    userMetadata.name,
    userMetadata.display_name,
  ].find(
    (value): value is string =>
      typeof value === "string" && Boolean(value.trim()),
  );

  if (metadataName) return metadataName.trim();

  const emailName = session.email?.split("@")[0]?.trim();

  return emailName || "Sendio user";
}

async function fetchRows<T>(
  env: ChatWorkerEnv,
  request: Request,
  path: string,
): Promise<T[]> {
  const token = getBearerToken(request);
  const baseUrl = env.SUPABASE_URL.replace(/\/+$/, "");

  const response = await fetch(`${baseUrl}/rest/v1/${path}`, {
    headers: {
      apikey: env.SUPABASE_ANON_KEY,
      authorization: `Bearer ${token}`,
      accept: "application/json",
    },
  });

  if (!response.ok) {
    console.error("sendio_profile_lookup_failed", {
      status: response.status,
      path: path.split("?")[0],
    });
    throw new Error("profile_lookup_failed");
  }

  return (await response.json()) as T[];
}

async function loadOptionalProfileAssets(
  env: ChatWorkerEnv,
  request: Request,
  userId: string,
  role: ChatRole,
): Promise<{
  profileUrl: string | null;
  avatarUrl: string | null;
}> {
  try {
    if (role === "company") {
      const companyRows = await fetchRows<CompanyRow>(
        env,
        request,
        `companies?user_id=eq.${encodeURIComponent(userId)}&select=slug,logo&limit=1`,
      );
      const company = companyRows[0];

      return {
        profileUrl: company?.slug
          ? `/companies/${company.slug}`
          : null,
        avatarUrl: company?.logo ?? null,
      };
    }

    if (role === "worker") {
      const workerRows = await fetchRows<WorkerRow>(
        env,
        request,
        `workers?user_id=eq.${encodeURIComponent(userId)}&select=slug,avatar&limit=1`,
      );
      const worker = workerRows[0];

      return {
        profileUrl: worker?.slug
          ? `/workers/${worker.slug}`
          : null,
        avatarUrl: worker?.avatar ?? null,
      };
    }
  } catch {
    // Identity remains valid even when optional public profile data is unavailable.
  }

  return {
    profileUrl: null,
    avatarUrl: null,
  };
}

export async function loadChatParticipant(
  env: ChatWorkerEnv,
  request: Request,
  session: VerifiedSession,
): Promise<ChatParticipant> {
  let profile: ProfileRow | null = null;

  try {
    const profileRows = await fetchRows<ProfileRow>(
      env,
      request,
      `profiles?id=eq.${encodeURIComponent(session.userId)}&select=full_name,user_type,role&limit=1`,
    );
    profile = profileRows[0] ?? null;
  } catch {
    profile = null;
  }

  let role: ChatRole | null = null;

  if (profile) {
    try {
      role = resolveProfileRole(profile);
    } catch {
      role = resolveClaimRole(session);
    }
  } else {
    role = resolveClaimRole(session);
  }

  if (!role) {
    role = "client";
  }

  const displayName =
    profile?.full_name?.trim() || getFallbackName(session);

  const assets = await loadOptionalProfileAssets(
    env,
    request,
    session.userId,
    role,
  );

  return {
    userId: session.userId,
    role,
    displayName,
    profileUrl: assets.profileUrl,
    avatarUrl: assets.avatarUrl,
  };
}

export type ChatRecipientType = "company" | "worker";

type RecipientCompanyRow = {
  user_id: string | null;
  name: string | null;
  slug: string | null;
  logo: string | null;
};

type RecipientWorkerRow = {
  user_id: string | null;
  name: string | null;
  slug: string | null;
  avatar: string | null;
};

function normalizeRecipientIdentifier(identifier: string): string {
  const normalized = identifier.trim();

  if (!normalized || normalized.length > 160) {
    throw new Error("recipient_identifier_invalid");
  }

  return normalized;
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function getRecipientFilter(identifier: string): string {
  const column = isUuid(identifier) ? "id" : "slug";
  return `${column}=eq.${encodeURIComponent(identifier)}`;
}

export async function loadChatRecipient(
  env: ChatWorkerEnv,
  request: Request,
  recipientType: ChatRecipientType,
  identifier: string,
): Promise<ChatParticipant> {
  const normalizedIdentifier =
    normalizeRecipientIdentifier(identifier);
  const filter = getRecipientFilter(normalizedIdentifier);

  if (recipientType === "company") {
    const rows = await fetchRows<RecipientCompanyRow>(
      env,
      request,
      `companies?${filter}&select=user_id,name,slug,logo&limit=1`,
    );
    const company = rows[0];

    if (!company?.user_id || !company.name?.trim()) {
      throw new Error("recipient_not_found");
    }

    return {
      userId: company.user_id,
      role: "company",
      displayName: company.name.trim(),
      profileUrl: company.slug
        ? `/companies/${company.slug}`
        : null,
      avatarUrl: company.logo ?? null,
    };
  }

  const rows = await fetchRows<RecipientWorkerRow>(
    env,
    request,
    `workers?${filter}&select=user_id,name,slug,avatar&limit=1`,
  );
  const worker = rows[0];

  if (!worker?.user_id || !worker.name?.trim()) {
    throw new Error("recipient_not_found");
  }

  return {
    userId: worker.user_id,
    role: "worker",
    displayName: worker.name.trim(),
    profileUrl: worker.slug
      ? `/workers/${worker.slug}`
      : null,
    avatarUrl: worker.avatar ?? null,
  };
}
