'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

type UserType = 'client' | 'worker' | 'company';

type ProfileData = {
  user_type: string | null;
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

  const pendingType = window.localStorage.getItem('sendio_pending_user_type');

  if (isUserType(pendingType)) {
    return pendingType;
  }

  return null;
}

function clearPendingAuthData() {
  if (typeof window === 'undefined') return;

  window.localStorage.removeItem('sendio_pending_user_type');
  window.localStorage.removeItem('sendio_pending_auth_provider');
}

function saveAccountTypeNotice(savedType: UserType, requestedType: UserType) {
  if (typeof window === 'undefined') return;

  if (savedType === requestedType) return;

  window.sessionStorage.setItem(
    'sendio_account_type_notice',
    `This email is already registered as ${savedType}. You have been redirected to your existing account.`,
  );
}

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    async function handleCallback() {
      try {
        const url = new URL(window.location.href);
        const code = url.searchParams.get('code');

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);

          if (error) {
            console.error('Auth code exchange error:', error.message);
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

        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('user_type')
          .eq('id', user.id)
          .maybeSingle();

        if (profileError) {
          console.error('Profile lookup error:', profileError.message);
        }

        const profileUserType = (profileData as ProfileData | null)?.user_type;
        const metadataUserType = user.user_metadata?.user_type;

        const savedUserType = isUserType(profileUserType)
          ? profileUserType
          : isUserType(metadataUserType)
            ? metadataUserType
            : null;

        if (savedUserType) {
          if (pendingUserType && pendingUserType !== savedUserType) {
            saveAccountTypeNotice(savedUserType, pendingUserType);
          }

          clearPendingAuthData();
          router.replace(getRedirectPath(savedUserType));
          return;
        }

        if (pendingUserType) {
          const { error: metadataError } = await supabase.auth.updateUser({
            data: {
              user_type: pendingUserType,
              full_name:
                user.user_metadata?.full_name ??
                user.user_metadata?.name ??
                user.email ??
                '',
            },
          });

          if (metadataError) {
            console.error('Update user metadata error:', metadataError.message);
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
            console.error('Profile upsert error:', profileUpsertError.message);
          }

          clearPendingAuthData();
          router.replace(getRedirectPath(pendingUserType));
          return;
        }

        clearPendingAuthData();
        router.replace('/');
      } catch (error) {
        console.error('Unexpected auth callback error:', error);
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