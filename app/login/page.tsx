'use client';

import {
  useEffect,
  useState,
  type FormEvent,
} from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

type UserType = 'client' | 'worker' | 'company';

const REMEMBERED_EMAIL_KEY =
  'sendio_remembered_login_email';

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] =
    useState(false);
  const [showPassword, setShowPassword] =
    useState(false);

  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] =
    useState(false);
  const [errorMessage, setErrorMessage] =
    useState('');

  useEffect(() => {
  const rememberedEmail =
    window.localStorage.getItem(
      REMEMBERED_EMAIL_KEY
    );

  if (!rememberedEmail) {
    return;
  }

  const animationFrame =
    window.requestAnimationFrame(() => {
      setEmail(rememberedEmail);
      setRememberMe(true);
    });

  return () => {
    window.cancelAnimationFrame(animationFrame);
  };
}, []);

  async function redirectByUserType(
    userId: string,
    fallbackType?: UserType
  ) {
    const { data: profileData } = await supabase
      .from('profiles')
      .select('user_type')
      .eq('id', userId)
      .maybeSingle();

    const userType =
      (
        profileData as {
          user_type: UserType | null;
        } | null
      )?.user_type ??
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

  async function handleLogin(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (loading || googleLoading) {
      return;
    }

    setLoading(true);
    setErrorMessage('');

    const cleanEmail = email.trim();

    const { data, error } =
      await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

    if (error || !data.user) {
      setErrorMessage(
        'The email or password is incorrect.'
      );
      setLoading(false);
      return;
    }

    if (rememberMe) {
      window.localStorage.setItem(
        REMEMBERED_EMAIL_KEY,
        cleanEmail
      );
    } else {
      window.localStorage.removeItem(
        REMEMBERED_EMAIL_KEY
      );
    }

    const metadataUserType =
      data.user.user_metadata?.user_type as
        | UserType
        | undefined;

    await redirectByUserType(
      data.user.id,
      metadataUserType
    );
  }

  async function handleGoogleLogin() {
    if (loading || googleLoading) {
      return;
    }

    setGoogleLoading(true);
    setErrorMessage('');

    const { error } =
      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

    if (error) {
      setErrorMessage(
        'Google sign-in could not be completed. Please try again.'
      );
      setGoogleLoading(false);
    }
  }

  function updateEmail(value: string) {
    setEmail(value);

    if (errorMessage) {
      setErrorMessage('');
    }
  }

  function updatePassword(value: string) {
    setPassword(value);

    if (errorMessage) {
      setErrorMessage('');
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[linear-gradient(145deg,#dff7ff_0%,#cceff8_42%,#edfaff_100%)] px-4 py-6 text-[#111827]">
      <div className="pointer-events-none absolute left-[-110px] top-[-120px] h-80 w-80 rounded-full bg-white/60 blur-3xl" />

      <div className="pointer-events-none absolute bottom-[-150px] right-[-100px] h-96 w-96 rounded-full bg-[#8fddf1]/30 blur-3xl" />

      <div className="pointer-events-none absolute left-1/2 top-0 h-52 w-[760px] max-w-[92vw] -translate-x-1/2 rounded-full bg-white/25 blur-3xl" />

      <div className="relative z-10 flex min-h-[calc(100vh-48px)] items-center justify-center pt-10">
        <section className="relative w-full max-w-[440px]">
          <button
            type="button"
            onClick={() => router.push('/')}
            className="mx-auto mb-8 flex h-10 items-center justify-center rounded-full border border-white/75 bg-white/65 px-4 text-xs font-black text-[#1f3f55] shadow-[0_10px_30px_rgba(15,23,42,0.08)] backdrop-blur-xl transition hover:-translate-y-0.5 hover:bg-white"
          >
            ← Back to Sendio
          </button>

          <div className="relative rounded-[28px] border border-white/80 bg-[linear-gradient(145deg,rgba(184,231,244,0.96),rgba(216,245,252,0.96))] px-5 pb-5 pt-14 shadow-[0_28px_80px_rgba(15,62,82,0.22)] sm:px-6">
            <div className="absolute left-1/2 top-[-42px] h-[76px] w-[148px] -translate-x-1/2">
              <div className="absolute left-1/2 top-0 h-[46px] w-[70px] -translate-x-1/2 rounded-t-[38px] border-[10px] border-b-0 border-[#eef6f8] bg-transparent shadow-[0_-5px_16px_rgba(15,23,42,0.10)]">
                <div className="absolute left-1/2 top-[6px] h-3.5 w-3.5 -translate-x-1/2 rounded-full border border-[#cbd5dc] bg-white shadow-inner" />
              </div>

              <div className="absolute bottom-0 left-1/2 h-[38px] w-[148px] -translate-x-1/2 rounded-[16px] border border-white/80 bg-[linear-gradient(180deg,#ffffff_0%,#e7eef1_100%)] shadow-[0_10px_24px_rgba(15,23,42,0.18)]">
                <div className="absolute left-1/2 top-2 h-1.5 w-16 -translate-x-1/2 rounded-full bg-white/80" />
              </div>
            </div>

            <div className="mb-4 text-center">
              <div className="mx-auto flex h-[58px] w-[58px] items-center justify-center rounded-[19px] border border-white/80 bg-white/76 shadow-[0_14px_30px_rgba(15,23,42,0.10)] backdrop-blur-xl">
                <Image
                  src="/logo.png"
                  alt="Sendio"
                  width={40}
                  height={40}
                  className="h-10 w-10 object-contain"
                  priority
                />
              </div>

              <div
                className="mt-2 inline-flex items-start text-[29px] font-black leading-none tracking-[-0.055em] text-[#111827]"
                aria-label="Sendio"
              >
                <span>Send</span>

                <span className="relative inline-block">
                  <span className="absolute left-1/2 top-[-6px] h-[6px] w-[6px] -translate-x-1/2 rounded-full bg-[#29b9f3] shadow-[0_0_12px_rgba(41,185,243,0.65)]" />
                  i
                </span>

                <span>o</span>
              </div>
            </div>

            <form
              onSubmit={handleLogin}
              className="space-y-3"
            >
              <div className="grid gap-1.5 sm:grid-cols-[100px_minmax(0,1fr)] sm:items-center">
                <label
                  htmlFor="sendio-login-email"
                  className="text-xs font-black text-[#24475c]"
                >
                  Email
                </label>

                <input
                  id="sendio-login-email"
                  name="email"
                  type="email"
                  value={email}
                  onChange={(event) =>
                    updateEmail(event.target.value)
                  }
                  autoComplete="email"
                  placeholder="Email address"
                  className="h-10 w-full rounded-[14px] border border-white/90 bg-white px-4 text-sm font-bold text-[#111827] shadow-[inset_0_1px_2px_rgba(15,23,42,0.05),0_7px_18px_rgba(15,62,82,0.08)] outline-none transition placeholder:text-slate-400 focus:border-[#29b9f3] focus:ring-4 focus:ring-[#29b9f3]/15"
                  required
                />
              </div>

              <div className="grid gap-1.5 sm:grid-cols-[100px_minmax(0,1fr)] sm:items-center">
                <label
                  htmlFor="sendio-login-password"
                  className="text-xs font-black text-[#24475c]"
                >
                  Password
                </label>

                <div className="relative">
                  <input
                    id="sendio-login-password"
                    name="password"
                    type={
                      showPassword
                        ? 'text'
                        : 'password'
                    }
                    value={password}
                    onChange={(event) =>
                      updatePassword(
                        event.target.value
                      )
                    }
                    autoComplete="current-password"
                    placeholder="Password"
                    className="h-10 w-full rounded-[14px] border border-white/90 bg-white py-2 pl-4 pr-[68px] text-sm font-bold text-[#111827] shadow-[inset_0_1px_2px_rgba(15,23,42,0.05),0_7px_18px_rgba(15,62,82,0.08)] outline-none transition placeholder:text-slate-400 focus:border-[#29b9f3] focus:ring-4 focus:ring-[#29b9f3]/15"
                    required
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowPassword(
                        (current) => !current
                      )
                    }
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full px-2 py-1 text-[10px] font-black text-[#315b72] transition hover:bg-[#dff5fb]"
                  >
                    {showPassword
                      ? 'Hide'
                      : 'Show'}
                  </button>
                </div>
              </div>

              {errorMessage ? (
                <div
                  role="alert"
                  className="rounded-[14px] border border-red-200 bg-red-50/95 px-3 py-2.5 text-center text-xs font-black text-red-700 shadow-sm"
                >
                  {errorMessage}
                </div>
              ) : null}

              <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:items-center sm:justify-between">
                <label className="inline-flex cursor-pointer items-center gap-2.5 text-xs font-black text-[#24475c]">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(event) =>
                      setRememberMe(
                        event.target.checked
                      )
                    }
                    className="h-4 w-4 cursor-pointer rounded border-white bg-white accent-[#29b9f3]"
                  />

                  <span>Remember me</span>
                </label>

                <button
                  type="submit"
                  disabled={
                    loading || googleLoading
                  }
                  className="inline-flex min-h-10 items-center justify-center rounded-[14px] bg-[#29b9f3] px-7 text-sm font-black text-white shadow-[0_12px_24px_rgba(41,185,243,0.28)] transition hover:-translate-y-0.5 hover:bg-[#20aee8] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading
                    ? 'Signing in...'
                    : 'Sign in'}
                </button>
              </div>
            </form>

            <div className="my-4 flex items-center gap-3">
              <span className="h-px flex-1 bg-[#8bc8d8]/65" />

              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[#416779]">
                or
              </span>

              <span className="h-px flex-1 bg-[#8bc8d8]/65" />
            </div>

            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={googleLoading || loading}
              className="flex min-h-10 w-full items-center justify-center gap-3 rounded-[14px] border border-white/90 bg-white/85 px-4 text-xs font-black text-[#111827] shadow-[0_9px_20px_rgba(15,62,82,0.10)] transition hover:-translate-y-0.5 hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-sm font-black shadow-sm">
                G
              </span>

              {googleLoading
                ? 'Connecting...'
                : 'Continue with Google'}
            </button>

            <p className="mt-4 text-center text-xs font-bold text-[#31576a]">
              Not a member?{' '}

              <Link
                href="/register"
                className="font-black text-[#111827] underline decoration-[#29b9f3] decoration-2 underline-offset-4"
              >
                Create account
              </Link>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}