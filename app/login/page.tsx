'use client';

import { useState } from 'react';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

type UserType = 'client' | 'worker' | 'company';

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  async function redirectByUserType(userId: string, fallbackType?: UserType) {
    const { data: profileData } = await supabase
      .from('profiles')
      .select('user_type')
      .eq('id', userId)
      .maybeSingle();

    const userType =
      (profileData as { user_type: UserType | null } | null)?.user_type ??
      fallbackType ??
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
  }

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);

    const email = String(formData.get('email') || '').trim();
    const password = String(formData.get('password') || '');

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.user) {
      alert(error?.message || 'Login failed');
      setLoading(false);
      return;
    }

    const metadataUserType =
      data.user.user_metadata?.user_type as UserType | undefined;

    await redirectByUserType(data.user.id, metadataUserType);
  }

  async function handleGoogleLogin() {
    setGoogleLoading(true);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      alert(error.message);
      setGoogleLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#f8fbff] via-white to-[#eef6ff] px-4 py-8 text-[var(--sendio-text)]">
      <div className="pointer-events-none fixed left-[-90px] top-[-90px] h-72 w-72 rounded-full bg-[#45cfe7]/20 blur-3xl" />
      <div className="pointer-events-none fixed bottom-[-120px] right-[-90px] h-80 w-80 rounded-full bg-[#e8e1f1]/70 blur-3xl" />

      <div className="relative z-10 flex min-h-[calc(100vh-64px)] items-center justify-center">
        <section className="w-full max-w-[330px]">
          <button
            type="button"
            onClick={() => router.push('/')}
            className="mx-auto mb-5 flex h-10 items-center justify-center rounded-full border border-[var(--sendio-border)] bg-white/75 px-4 text-xs font-black text-[var(--sendio-muted)] shadow-sm backdrop-blur-xl transition hover:bg-white"
          >
            ← Back to Sendio
          </button>

          <div className="rounded-[26px] border border-white/80 bg-white/72 p-4 shadow-[0_20px_60px_rgba(15,23,42,0.10)] backdrop-blur-2xl">
            <div className="mb-4 text-center">
              <div className="mb-3 flex items-center justify-center gap-2">
                <Image
                  src="/logo.png"
                  alt="Sendio"
                  width={26}
                  height={26}
                  className="rounded-md"
                  priority
                />

                <span className="text-2xl font-black tracking-tight text-[var(--sendio-text)]">
                  Sendio
                </span>
              </div>

              <h1 className="text-xl font-black tracking-tight text-[var(--sendio-text)]">
                Welcome back
              </h1>

              <p className="mt-1 text-[11px] font-bold leading-5 text-[var(--sendio-muted)]">
                Sign in to continue.
              </p>
            </div>

            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={googleLoading || loading}
              className="mb-4 flex w-full items-center justify-center gap-3 rounded-full border border-[var(--sendio-border)] bg-white px-4 py-2.5 text-sm font-black text-[var(--sendio-text)] shadow-sm transition hover:bg-[var(--sendio-soft)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-base shadow-sm">
                G
              </span>
              {googleLoading ? 'Connecting...' : 'Continue with Google'}
            </button>

            <div className="mb-4 flex items-center gap-3">
              <span className="h-px flex-1 bg-[var(--sendio-border)]" />
              <span className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--sendio-muted)]">
                or
              </span>
              <span className="h-px flex-1 bg-[var(--sendio-border)]" />
            </div>

            <form onSubmit={handleLogin} className="space-y-3">
              <input
                name="email"
                type="email"
                placeholder="Email address"
                className="w-full rounded-full border border-[var(--sendio-border)] bg-white px-4 py-2.5 text-sm font-bold text-[var(--sendio-text)] outline-none transition placeholder:text-slate-400 focus:border-[#45cfe7] focus:ring-4 focus:ring-[#45cfe7]/15"
                required
              />

              <input
                name="password"
                type="password"
                placeholder="Password"
                className="w-full rounded-full border border-[var(--sendio-border)] bg-white px-4 py-2.5 text-sm font-bold text-[var(--sendio-text)] outline-none transition placeholder:text-slate-400 focus:border-[#45cfe7] focus:ring-4 focus:ring-[#45cfe7]/15"
                required
              />

              <button
                disabled={loading || googleLoading}
                className="w-full rounded-full bg-[var(--sendio-accent)] px-4 py-2.5 text-sm font-black text-[var(--sendio-accent-text)] shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? 'Signing in...' : 'Sign in →'}
              </button>
            </form>

            <p className="mt-5 text-center text-xs font-bold text-[var(--sendio-muted)]">
              Don&apos;t have an account?{' '}
              <a
                href="/register"
                className="font-black text-[var(--sendio-text)] underline decoration-[#45cfe7]/50 underline-offset-4"
              >
                Create account
              </a>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}