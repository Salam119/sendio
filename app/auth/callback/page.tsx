'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

type UserType = 'client' | 'worker' | 'company';

type ProfileData = {
  user_type: string | null;
};

type CallbackUser = {
  id: string;
  email?: string | null;
  user_metadata?: {
    user_type?: unknown;
    full_name?: unknown;
    name?: unknown;
    enterprise_number?: unknown;
  };
};

const PENDING_CONFIRMATION_STORAGE_KEY =
  'sendio_pending_email_confirmation';
const PENDING_COMPANY_NUMBER_STORAGE_KEY = 'sendio_pending_company_number';

type BceCompany = {
  number: string;
  name: string;
  status_code: string;
};

type BceLookupResponse = {
  ok: boolean;
  message?: string;
  company?: BceCompany;
};

function getHashValue(key: string) {
  if (typeof window === 'undefined') return null;

  const hash = window.location.hash.replace(/^#/, '');
  const params = new URLSearchParams(hash);

  return params.get(key);
}

function isUserType(value: string | null | undefined): value is UserType {
  return value === 'client' || value === 'worker' || value === 'company';
}

function getRedirectPath(userType: UserType | null) {
  if (userType === 'company') return '/dashboard/company';
  if (userType === 'worker') return '/dashboard/worker';

  return '/';
}

function getPendingUserType() {
  if (typeof window === 'undefined') return null;

  const pendingType = window.localStorage.getItem(
    'sendio_pending_user_type',
  );

  if (isUserType(pendingType)) {
    return pendingType;
  }

  return null;
}

function getPendingCompanyNumber() {
  if (typeof window === 'undefined') return '';

  return (
    window.localStorage.getItem(PENDING_COMPANY_NUMBER_STORAGE_KEY) ?? ''
  )
    .replace(/\D/g, '')
    .slice(0, 10);
}

function clearPendingAuthData() {
  if (typeof window === 'undefined') return;

  window.localStorage.removeItem('sendio_pending_user_type');
  window.localStorage.removeItem('sendio_pending_auth_provider');
  window.localStorage.removeItem(PENDING_COMPANY_NUMBER_STORAGE_KEY);
  window.sessionStorage.removeItem(PENDING_CONFIRMATION_STORAGE_KEY);
}

function saveAccountTypeNotice(
  savedType: UserType,
  requestedType: UserType,
) {
  if (typeof window === 'undefined') return;
  if (savedType === requestedType) return;

  window.sessionStorage.setItem(
    'sendio_account_type_notice',
    `This email is already registered as ${savedType}. You have been redirected to your existing account.`,
  );
}

function getMetadataText(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function getCompanyName(user: CallbackUser) {
  const fullName = getMetadataText(user.user_metadata?.full_name);
  if (fullName) return fullName;

  const name = getMetadataText(user.user_metadata?.name);
  if (name) return name;

  const emailName = user.email?.split('@')[0]?.trim();
  if (emailName) return emailName;

  return 'Company';
}

async function lookupBceCompany(enterpriseNumber: string) {
  const response = await fetch(
    `/api/bce/company?number=${encodeURIComponent(enterpriseNumber)}`,
    {
      cache: 'no-store',
    },
  );

  const payload = (await response.json()) as BceLookupResponse;

  if (!response.ok || !payload.ok || !payload.company) {
    throw new Error(
      payload.message || 'The company could not be verified in the BCE register.',
    );
  }

  if (payload.company.status_code !== 'AC') {
    throw new Error('The company is not active in the BCE register.');
  }

  return payload.company;
}

async function ensureCompanyProfile(
  user: CallbackUser,
  pendingCompanyNumber: string,
) {
  const { data: existingCompany, error: lookupError } = await supabase
    .from('companies')
    .select('id')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle();

  if (lookupError) {
    return lookupError.message;
  }

  if (existingCompany) {
    return null;
  }

  const metadataCompanyNumber = getMetadataText(
    user.user_metadata?.enterprise_number,
  ).replace(/\D/g, '');

  const enterpriseNumber = (
    metadataCompanyNumber || pendingCompanyNumber
  ).slice(0, 10);

  if (enterpriseNumber.length !== 10) {
    return 'A verified Belgian enterprise number is required.';
  }

  let bceCompany: BceCompany;

  try {
    bceCompany = await lookupBceCompany(enterpriseNumber);
  } catch (error) {
    return error instanceof Error
      ? error.message
      : 'The BCE verification could not be completed.';
  }

  const { data: registrationOwner, error: registrationLookupError } =
    await supabase
      .from('companies')
      .select('id')
      .eq('registration_number', bceCompany.number)
      .limit(1)
      .maybeSingle();

  if (registrationLookupError) {
    return registrationLookupError.message;
  }

  if (registrationOwner) {
    return 'This Belgian enterprise number is already registered on Sendio.';
  }

  const { error: insertError } = await supabase.from('companies').insert({
    user_id: user.id,
    name: bceCompany.name || getCompanyName(user),
    email: user.email ?? null,
    registration_number: bceCompany.number,
    verification_status: 'verified',
    status: 'available',
    views: 0,
    connections: 0,
    rating: 0,
    reviews_count: 0,
  });

  if (insertError?.code === '23505') {
    return 'This Belgian enterprise number is already registered on Sendio.';
  }

  return insertError?.message ?? null;
}

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    async function finishAuthentication(
      user: CallbackUser,
      userType: UserType,
    ) {
      if (userType === 'company') {
        const companyProfileError = await ensureCompanyProfile(
          user,
          getPendingCompanyNumber(),
        );

        if (companyProfileError) {
          console.error(
            'Company profile setup error:',
            companyProfileError,
          );

          window.sessionStorage.setItem(
            'sendio_company_profile_setup_error',
            companyProfileError,
          );

          await supabase.auth.signOut();
          clearPendingAuthData();
          router.replace('/register?type=company');
          return;
        }
      }

      clearPendingAuthData();
      router.replace(getRedirectPath(userType));
    }

    async function handleCallback() {
      try {
        const url = new URL(window.location.href);
        const code = url.searchParams.get('code');

        if (code) {
          const { error } =
            await supabase.auth.exchangeCodeForSession(code);

          if (error) {
            console.error(
              'Auth code exchange error:',
              error.message,
            );
            router.replace('/login');
            return;
          }
        } else {
          const accessToken = getHashValue('access_token');
          const refreshToken = getHashValue('refresh_token');

          if (accessToken && refreshToken) {
            const { error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });

            if (error) {
              console.error('Set session error:', error.message);
              router.replace('/login');
              return;
            }
          }
        }

        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          console.error('Get user error:', userError?.message);
          router.replace('/login');
          return;
        }

        const pendingUserType = getPendingUserType();

        const { data: profileData, error: profileError } =
          await supabase
            .from('profiles')
            .select('user_type')
            .eq('id', user.id)
            .maybeSingle();

        if (profileError) {
          console.error(
            'Profile lookup error:',
            profileError.message,
          );
        }

        const profileUserType = (
          profileData as ProfileData | null
        )?.user_type;

        const metadataUserType = user.user_metadata?.user_type;

        const savedUserType = isUserType(profileUserType)
          ? profileUserType
          : isUserType(metadataUserType)
            ? metadataUserType
            : null;

        if (savedUserType) {
          if (
            pendingUserType &&
            pendingUserType !== savedUserType
          ) {
            saveAccountTypeNotice(
              savedUserType,
              pendingUserType,
            );
          }

          await finishAuthentication(user, savedUserType);
          return;
        }

        if (pendingUserType) {
          const { error: metadataError } =
            await supabase.auth.updateUser({
              data: {
                user_type: pendingUserType,
                full_name:
                  user.user_metadata?.full_name ??
                  user.user_metadata?.name ??
                  user.email ??
                  '',
                enterprise_number:
                  pendingUserType === 'company'
                    ? getPendingCompanyNumber()
                    : undefined,
              },
            });

          if (metadataError) {
            console.error(
              'Update user metadata error:',
              metadataError.message,
            );
          }

          const { error: profileUpsertError } = await supabase
            .from('profiles')
            .upsert(
              {
                id: user.id,
                user_type: pendingUserType,
              },
              {
                onConflict: 'id',
              },
            );

          if (profileUpsertError) {
            console.error(
              'Profile upsert error:',
              profileUpsertError.message,
            );
          }

          await finishAuthentication(user, pendingUserType);
          return;
        }

        clearPendingAuthData();
        router.replace('/');
      } catch (error) {
        console.error(
          'Unexpected auth callback error:',
          error,
        );
        router.replace('/login');
      }
    }

    void handleCallback();
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#fefcf5]">
      <p className="font-semibold text-[#2c3e2f]">
        Confirming your account...
      </p>
    </div>
  );
}
