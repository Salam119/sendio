'use client';

import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

type UserType = 'client' | 'worker' | 'company';

type AccountOption = {
  value: UserType;
  label: string;
  icon: string;
  activeClass: string;
  inactiveClass: string;
  chipClass: string;
};

type RegisterNotice = {
  type: 'error' | 'pending';
  title: string;
  body?: string;
};

const accountOptions: AccountOption[] = [
  {
    value: 'client',
    label: 'Client',
    icon: '👤',
    activeClass: 'border-emerald-300 bg-emerald-50 text-emerald-700',
    inactiveClass:
      'border-emerald-100 bg-white/90 text-slate-600 hover:bg-emerald-50',
    chipClass: 'border-emerald-100 bg-emerald-50 text-emerald-700',
  },
  {
    value: 'worker',
    label: 'Worker',
    icon: '💼',
    activeClass: 'border-blue-300 bg-blue-50 text-blue-700',
    inactiveClass: 'border-blue-100 bg-white/90 text-slate-600 hover:bg-blue-50',
    chipClass: 'border-blue-100 bg-blue-50 text-blue-700',
  },
  {
    value: 'company',
    label: 'Company',
    icon: '🏢',
    activeClass: 'border-violet-300 bg-violet-50 text-violet-700',
    inactiveClass:
      'border-violet-100 bg-white/90 text-slate-600 hover:bg-violet-50',
    chipClass: 'border-violet-100 bg-violet-50 text-violet-700',
  },
];

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.15v2.84C3.96 20.53 7.67 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.15C1.41 8.53 1 10.21 1 12s.41 3.47 1.15 4.94l3.69-2.84z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.67 1 3.96 3.47 2.15 7.06l3.69 2.84C6.71 7.31 9.14 5.38 12 5.38z"
      />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path
        fill="#1877F2"
        d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.412c0-3.025 1.792-4.697 4.533-4.697 1.313 0 2.686.236 2.686.236v2.97H15.83c-1.491 0-1.956.931-1.956 1.887v2.265h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z"
      />
    </svg>
  );
}

function isUserType(value: string | null | undefined): value is UserType {
  return value === 'client' || value === 'worker' || value === 'company';
}

function getInitialUserType(): UserType | null {
  if (typeof window === 'undefined') return null;

  const params = new URLSearchParams(window.location.search);
  const typeFromUrl = params.get('type');

  if (isUserType(typeFromUrl)) {
    return typeFromUrl;
  }

  return null;
}

function getRedirectPath(type: UserType) {
  if (type === 'company') return '/dashboard/company';
  if (type === 'worker') return '/dashboard/worker';

  return '/';
}

function saveAccountTypeNotice(savedType: UserType, requestedType: UserType) {
  if (typeof window === 'undefined') return;
  if (savedType === requestedType) return;

  window.sessionStorage.setItem(
    'sendio_account_type_notice',
    `This email is already registered as ${savedType}. You have been redirected to your existing account.`,
  );
}

export default function RegisterPage() {
  const router = useRouter();

  const [userType, setUserType] = useState<UserType | null>(getInitialUserType);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [notice, setNotice] = useState<RegisterNotice | null>(null);

  const selectedAccount = useMemo(() => {
    return accountOptions.find((option) => option.value === userType) ?? null;
  }, [userType]);

  useEffect(() => {
    async function redirectSignedInUser() {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error || !user) return;

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('user_type')
        .eq('id', user.id)
        .maybeSingle();

      if (profileError) {
        console.error('Profile lookup error:', profileError.message);
      }

      const profileUserType = (
        profileData as { user_type: string | null } | null
      )?.user_type;

      const savedUserType = isUserType(profileUserType)
        ? profileUserType
        : isUserType(user.user_metadata?.user_type)
          ? user.user_metadata.user_type
          : null;

      if (!savedUserType) return;

      const requestedType = getInitialUserType();

      if (requestedType && requestedType !== savedUserType) {
        saveAccountTypeNotice(savedUserType, requestedType);
      }

      router.replace(getRedirectPath(savedUserType));
    }

    void redirectSignedInUser();
  }, [router]);

  function requireAccountType() {
    if (userType) return true;

    setNotice({
      type: 'error',
      title: 'Please choose an account type first.',
      body: 'Select Client, Worker, or Company before creating your account.',
    });

    return false;
  }

  async function handleGoogleRegister() {
    setNotice(null);

    if (!requireAccountType()) return;

    const selectedType = userType;

    if (!selectedType) return;

    setGoogleLoading(true);

    const redirectTo = `${window.location.origin}/auth/callback`;

    window.localStorage.setItem('sendio_pending_user_type', selectedType);
    window.localStorage.setItem('sendio_pending_auth_provider', 'google');

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        queryParams: {
          access_type: 'offline',
          prompt: 'select_account',
        },
      },
    });

    if (error) {
      setNotice({
        type: 'error',
        title: error.message,
      });
      setGoogleLoading(false);
    }
  }

  async function handleRegister(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setNotice(null);

    if (!requireAccountType()) {
      setLoading(false);
      return;
    }

    const selectedType = userType;

    if (!selectedType) {
      setLoading(false);
      return;
    }

    const formData = new FormData(e.currentTarget);

    const email = String(formData.get('email') || '').trim();
    const password = String(formData.get('password') || '');
    const confirmPassword = String(formData.get('confirmPassword') || '');
    const fullName = String(formData.get('fullName') || '').trim();

    if (password !== confirmPassword) {
      setNotice({
        type: 'error',
        title: 'Passwords do not match.',
        body: 'Please type the same password in both password fields.',
      });
      setLoading(false);
      return;
    }

    const redirectTo = `${window.location.origin}/auth/callback`;

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectTo,
        data: {
          full_name: fullName,
          user_type: selectedType,
        },
      },
    });

    if (error) {
      setNotice({
        type: 'error',
        title: error.message,
        body: 'Please check your email address and try again.',
      });
      setLoading(false);
      return;
    }

    const userId = data.user?.id;

    if (userId && selectedType === 'company') {
      const { error: companyError } = await supabase.from('companies').insert([
        {
          user_id: userId,
          name: fullName,
          email,
          status: 'available',
          views: 0,
          connections: 0,
          rating: 0,
          reviews_count: 0,
        },
      ]);

      if (companyError) {
        setNotice({
          type: 'error',
          title: companyError.message,
          body: 'Your account was created, but the company profile could not be prepared.',
        });
        setLoading(false);
        return;
      }
    }

    if (data.session) {
      router.replace(getRedirectPath(selectedType));
      return;
    }

    setNotice({
      type: 'pending',
      title: 'Waiting for email confirmation',
      body: 'We sent a verification link if this email address is valid. Please check your inbox and Spam/Junk folder. After confirming your email, Sendio will continue from the confirmation link.',
    });

    setLoading(false);
  }

  return (
    <div className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,#eef6ff_0,#ffffff_48%,#f7f3ff_100%)] px-3 py-2 text-slate-950">
      <button
        type="button"
        onClick={() => router.push('/')}
        className="fixed left-3 top-3 z-10 rounded-full border border-blue-100 bg-white/85 px-3 py-1.5 text-xs font-black text-slate-700 shadow-sm backdrop-blur transition hover:bg-white"
      >
        ← Back
      </button>

      {notice ? (
        <div
          className={`fixed inset-0 z-50 flex items-center justify-center px-4 backdrop-blur-sm ${
            notice.type === 'pending' ? 'bg-white/70' : 'bg-white/60'
          }`}
        >
          <div
            className={`w-full max-w-[330px] rounded-[26px] border p-5 text-center shadow-2xl ${
              notice.type === 'pending'
                ? 'border-sky-100 bg-white text-sky-950'
                : 'border-red-100 bg-white text-red-700'
            }`}
          >
            {notice.type === 'pending' ? (
              <div className="mx-auto mb-4 h-9 w-9 animate-spin rounded-full border-[3px] border-sky-100 border-t-sky-600" />
            ) : (
              <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-red-500 text-lg font-black text-white">
                !
              </div>
            )}

            <h2 className="text-sm font-black">{notice.title}</h2>

            {notice.body ? (
              <p
                className={`mt-2 text-[11px] font-semibold leading-5 ${
                  notice.type === 'pending' ? 'text-sky-700' : 'text-red-600'
                }`}
              >
                {notice.body}
              </p>
            ) : null}

            {notice.type === 'pending' ? (
              <p className="mt-4 rounded-2xl bg-sky-50 px-3 py-2 text-[10px] font-bold leading-4 text-sky-800">
                Keep this page open, then confirm your email from the link.
              </p>
            ) : (
              <button
                type="button"
                onClick={() => setNotice(null)}
                className="mt-4 rounded-full bg-red-500 px-4 py-2 text-xs font-black text-white transition hover:bg-red-600"
              >
                Try again
              </button>
            )}
          </div>
        </div>
      ) : null}

      <div className="mx-auto flex min-h-[calc(100vh-16px)] w-full items-center justify-center">
        <main className="w-full max-w-[305px]">
          <div className="rounded-[24px] bg-white/20 px-2 py-2 shadow-none backdrop-blur-sm sm:px-2.5">
            <div className="mb-2 flex items-center justify-center gap-1.5">
              <Image
                src="/logo.png"
                alt="Sendio logo"
                width={26}
                height={26}
                className="h-6 w-6 object-contain"
                priority
              />

              <span className="text-[1.38rem] font-black leading-none tracking-tight text-slate-950">
                Send
                <span className="relative inline-block">
                  <span>ı</span>
                  <span className="absolute left-1/2 top-0 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1 rounded-full bg-blue-600" />
                </span>
                o
              </span>
            </div>

            <div className="mb-2 grid grid-cols-3 gap-1.5">
              {accountOptions.map((option) => {
                const isSelected = userType === option.value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      setUserType(option.value);
                      setNotice(null);
                    }}
                    className={`relative rounded-xl border px-1 py-1 text-center text-[10px] font-black transition hover:-translate-y-0.5 ${
                      isSelected ? option.activeClass : option.inactiveClass
                    }`}
                  >
                    {isSelected && (
                      <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-[9px] text-white">
                        ✓
                      </span>
                    )}

                    <span className="mx-auto mb-0.5 flex h-5 w-5 items-center justify-center rounded-md bg-white text-[10px] shadow-sm">
                      {option.icon}
                    </span>

                    {option.label}
                  </button>
                );
              })}
            </div>

            <div
              className={`mb-2 h-8 rounded-xl border px-3 py-1.5 text-sm font-black ${
                selectedAccount
                  ? selectedAccount.chipClass
                  : 'border-slate-200 bg-slate-50 text-slate-400'
              }`}
            >
              {selectedAccount ? selectedAccount.label : 'What?'}
            </div>

            <form onSubmit={handleRegister} className="space-y-2">
              <input
                name="fullName"
                placeholder="Full name"
                className="h-8 w-full rounded-xl border border-slate-200 bg-white/90 px-3 text-sm font-bold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:ring-4 focus:ring-blue-50"
                required
              />

              <input
                name="email"
                type="email"
                placeholder="Email address"
                className="h-8 w-full rounded-xl border border-slate-200 bg-white/90 px-3 text-sm font-bold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:ring-4 focus:ring-blue-50"
                required
              />

              <input
                name="password"
                type="password"
                placeholder="Password"
                className="h-8 w-full rounded-xl border border-slate-200 bg-white/90 px-3 text-sm font-bold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:ring-4 focus:ring-blue-50"
                required
              />

              <input
                name="confirmPassword"
                type="password"
                placeholder="Confirm password"
                className="h-8 w-full rounded-xl border border-slate-200 bg-white/90 px-3 text-sm font-bold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:ring-4 focus:ring-blue-50"
                required
              />

              <button
                disabled={loading || googleLoading}
                className="h-8 w-full rounded-xl bg-blue-600 text-sm font-black text-white shadow-[0_14px_28px_-20px_rgba(37,99,235,0.9)] transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? 'Sending email...' : 'Create account →'}
              </button>
            </form>

            <div className="my-2 flex items-center gap-2">
              <span className="h-px flex-1 bg-slate-200" />
              <span className="text-[10px] font-bold text-slate-400">or</span>
              <span className="h-px flex-1 bg-slate-200" />
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={handleGoogleRegister}
                disabled={loading || googleLoading}
                className="flex h-8 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white/90 text-sm font-black text-slate-700 shadow-sm transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                <GoogleIcon />
                {googleLoading ? 'Opening Google...' : 'Sign up with Google'}
              </button>

              <button
                type="button"
                disabled
                className="flex h-8 w-full cursor-not-allowed items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50/80 text-sm font-black text-slate-400"
                title="Facebook login is not enabled yet"
              >
                <FacebookIcon />
                Sign up with Facebook
              </button>
            </div>

            <p className="mt-2 text-center text-xs font-semibold text-slate-500">
              Already have an account?{' '}
              <a href="/login" className="font-black text-blue-600">
                Sign in
              </a>
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}