'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

type ProfileData = {
  user_type: string | null;
};

function getHashValue(key: string) {
  if (typeof window === 'undefined') return null;

  const hash = window.location.hash.replace(/^#/, '');
  const params = new URLSearchParams(hash);

  return params.get(key);
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

        const { data: profileData } = await supabase
          .from('profiles')
          .select('user_type')
          .eq('id', user.id)
          .maybeSingle();

        const userType =
          (profileData as ProfileData | null)?.user_type ??
          user.user_metadata?.user_type ??
          null;

        if (userType === 'company') {
          router.replace('/dashboard/company');
          return;
        }

        if (userType === 'worker') {
          router.replace('/dashboard/worker');
          return;
        }

        router.replace('/');
      } catch (error) {
        console.error('Unexpected auth callback error:', error);
        router.replace('/login');
      }
    }

    handleCallback();
  }, [router]);

  return (
    <div className="min-h-screen bg-[#fefcf5] flex items-center justify-center">
      <p className="text-[#2c3e2f] font-semibold">
        Confirming your account...
      </p>
    </div>
  );
}