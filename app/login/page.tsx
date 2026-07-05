'use client';

import { useState } from 'react';
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
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-br from-[#f8fbff] via-[#f4f7ff] to-[#eef6ff] px-4 py-8 text-[var(--sendio-text)]">
      <div className="pointer-events-none absolute left-[-120px] top-[-120px] h-80 w-80 rounded-full bg-[#45cfe7]/20 blur-3xl" />
      <div className="pointer-events-none absolute bottom-[-140px] right-[-120px] h-96 w-96 rounded-full bg-[#e8e1f1]/70 blur-3xl" />
      <div className="pointer-events-none absolute left-1/2 top-1/3 h-72 w-72 -translate-x-1/2 rounded-full bg-white/70 blur-3xl" />

      <div className="relative z-10 flex min-h-[calc(100vh-64px)] items-center justify-center">
        <section className="w-full max-w-[430px]">
          <div className="mb-5 text-center">
            <button
              type="button"
              onClick={() => router.push('/')}
              className="mb-5 inline-flex items-center justify-center rounded-full border border-white/70 bg-white/60 px-4 py-2 text-xs font-black text-[var(--sendio-muted)] shadow-sm backdrop-blur-xl transition hover:bg-white"
            >
              ← Back to Sendio
            </button>

            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/80 bg-white/70 text-lg font-black text-[var(--sendio-text)] shadow-sm backdrop-blur-xl">
              S
            </div>

            <h1 className="text-3xl font-black tracking-tight text-[var(--sendio-text)]">
              Welcome back
            </h1>

            <p className="mt-2 text-sm font-semibold text-[var(--sendio-muted)]">
              Sign in and continue managing your Sendio account.
            </p>
          </div>

          <div className="rounded-[34px] border border-white/70 bg-white/55 p-5 shadow-[0_24px_80px_rgba(15,23,42,0.12)] backdrop-blur-2xl">
            <div className="rounded-[28px] border border-white/80 bg-white/70 p-5 shadow-sm">
              <div className="mb-5 rounded-[24px] border border-[var(--sendio-border)] bg-[var(--sendio-soft)] px-4 py-4 text-center">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[var(--sendio-muted)]">
                  Secure login
                </p>

                <h2 className="mt-1 text-lg font-black text-[var(--sendio-text)]">
                  Access your dashboard
                </h2>
              </div>

              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={googleLoading || loading}
                className="mb-4 flex w-full items-center justify-center gap-3 rounded-full border border-[var(--sendio-border)] bg-white/85 px-5 py-3 text-sm font-black text-[var(--sendio-text)] shadow-sm transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-base shadow-sm">
                  G
                </span>
                {googleLoading ? 'Connecting with Google...' : 'Continue with Google'}
              </button>

              <div className="mb-4 flex items-center gap-3">
                <span className="h-px flex-1 bg-[var(--sendio-border)]" />
                <span className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--sendio-muted)]">
                  or
                </span>
                <span className="h-px flex-1 bg-[var(--sendio-border)]" />
              </div>

              <form onSubmit={handleLogin} className="space-y-3">
                <label className="block">
                  <span className="mb-1 block text-xs font-black text-[var(--sendio-muted)]">
                    Email address
                  </span>

                  <input
                    name="email"
                    type="email"
                    placeholder="you@example.com"
                    className="w-full rounded-full border border-[var(--sendio-border)] bg-white/85 px-5 py-3 text-sm font-bold text-[var(--sendio-text)] outline-none transition placeholder:text-slate-300 focus:border-[#45cfe7] focus:ring-4 focus:ring-[#45cfe7]/15"
                    required
                  />
                </label>

                <label className="block">
                  <span className="mb-1 block text-xs font-black text-[var(--sendio-muted)]">
                    Password
                  </span>

                  <input
                    name="password"
                    type="password"
                    placeholder="Your password"
                    className="w-full rounded-full border border-[var(--sendio-border)] bg-white/85 px-5 py-3 text-sm font-bold text-[var(--sendio-text)] outline-none transition placeholder:text-slate-300 focus:border-[#45cfe7] focus:ring-4 focus:ring-[#45cfe7]/15"
                    required
                  />
                </label>

                <button
                  disabled={loading || googleLoading}
                  className="mt-2 w-full rounded-full bg-[var(--sendio-accent)] px-5 py-3 text-sm font-black text-[var(--sendio-accent-text)] shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? 'Signing in...' : 'Sign in →'}
                </button>
              </form>

              <div className="mt-5 rounded-2xl border border-[var(--sendio-border)] bg-white/70 px-4 py-3 text-center">
                <p className="text-xs font-bold text-[var(--sendio-muted)]">
                  Don&apos;t have an account?{' '}
                  <a
                    href="/register"
                    className="font-black text-[var(--sendio-text)] underline decoration-[#45cfe7]/50 underline-offset-4"
                  >
                    Create account
                  </a>
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}