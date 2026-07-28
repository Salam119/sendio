'use client';

import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

type UserType = 'client' | 'worker' | 'company';

type AccountOption = {
  value: UserType;
  label: string;
  activeClass: string;
  inactiveClass: string;
  chipClass: string;
};

type RegisterNotice = {
  type: 'error' | 'pending';
  title: string;
  body?: string;
};

type ConfirmationPhase = 'idle' | 'waiting' | 'ready' | 'resending';

type ResendFeedback = {
  type: 'success' | 'error';
  message: string;
};

type StoredPendingConfirmation = {
  email: string;
  deadline: number;
};

type BceCompany = {
  number: string;
  name: string;
  status_code: string;
  status_fr: string;
  legal_form_fr: string;
  postal_code: string;
  city_fr: string;
  street_fr: string;
  house_number: string;
  box: string;
};

type BceLookupResponse = {
  ok: boolean;
  message?: string;
  company?: BceCompany;
};

type CompanyLookupState = 'idle' | 'checking' | 'verified' | 'error';

const CONFIRMATION_WAIT_SECONDS = 3 * 60;
const CONFIRMATION_WAIT_MS = CONFIRMATION_WAIT_SECONDS * 1000;
const PENDING_CONFIRMATION_STORAGE_KEY = 'sendio_pending_email_confirmation';
const PENDING_COMPANY_NUMBER_STORAGE_KEY = 'sendio_pending_company_number';

const pendingConfirmationNotice: RegisterNotice = {
  type: 'pending',
  title: 'Waiting for email confirmation',
  body: 'We sent a verification link if this email address is valid. Please check your inbox and Spam/Junk folder. After confirming your email, Sendio will continue from the confirmation link.',
};

const accountOptions: AccountOption[] = [
  {
    value: 'client',
    label: 'Client',
    activeClass: 'border-emerald-300 bg-emerald-50 text-emerald-700',
    inactiveClass:
      'border-emerald-100 bg-white/90 text-slate-600 hover:bg-emerald-50',
    chipClass: 'border-emerald-100 bg-emerald-50 text-emerald-700',
  },
  {
    value: 'worker',
    label: 'Worker',
    activeClass: 'border-blue-300 bg-blue-50 text-blue-700',
    inactiveClass: 'border-blue-100 bg-white/90 text-slate-600 hover:bg-blue-50',
    chipClass: 'border-blue-100 bg-blue-50 text-blue-700',
  },
  {
    value: 'company',
    label: 'Company',
    activeClass: 'border-violet-300 bg-violet-50 text-violet-700',
    inactiveClass:
      'border-violet-100 bg-white/90 text-slate-600 hover:bg-violet-50',
    chipClass: 'border-violet-100 bg-violet-50 text-violet-700',
  },
];
      function AccountTypeIcon({ type }: { type: UserType }) {
  if (type === 'client') {
    return (
      <svg
        viewBox="0 0 24 24"
        className="h-4 w-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="8" r="3" />
        <path d="M5.5 20c.8-4 3-6 6.5-6s5.7 2 6.5 6" />
      </svg>
    );
  }

  if (type === 'worker') {
    return (
      <svg
        viewBox="0 0 24 24"
        className="h-4 w-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M4 14h16" />
        <path d="M6 14v-1a6 6 0 0 1 12 0v1" />
        <path d="M9 8V6.5h6V8" />
        <path d="M7 18h10" />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="5" y="4" width="14" height="16" rx="1.5" />
      <path d="M9 8h2M13 8h2M9 12h2M13 12h2" />
      <path d="M10 20v-4h4v4" />
    </svg>
  );
}
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

function getRemainingConfirmationSeconds(deadline: number) {
  return Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
}

function formatConfirmationCountdown(totalSeconds: number) {
  const safeSeconds = Math.max(0, totalSeconds);
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function savePendingConfirmation(email: string, deadline: number) {
  if (typeof window === 'undefined') return;

  const value: StoredPendingConfirmation = { email, deadline };

  window.sessionStorage.setItem(
    PENDING_CONFIRMATION_STORAGE_KEY,
    JSON.stringify(value),
  );
}

function readPendingConfirmation(): StoredPendingConfirmation | null {
  if (typeof window === 'undefined') return null;

  const storedValue = window.sessionStorage.getItem(
    PENDING_CONFIRMATION_STORAGE_KEY,
  );

  if (!storedValue) return null;

  try {
    const parsed = JSON.parse(storedValue) as Partial<StoredPendingConfirmation>;

    if (typeof parsed.email !== 'string' || !parsed.email.trim()) {
      return null;
    }

    if (typeof parsed.deadline !== 'number') {
      return null;
    }

    return {
      email: parsed.email.trim(),
      deadline: parsed.deadline,
    };
  } catch {
    return null;
  }
}

function clearPendingConfirmation() {
  if (typeof window === 'undefined') return;

  window.sessionStorage.removeItem(PENDING_CONFIRMATION_STORAGE_KEY);
}

function normalizeCompanyNumberInput(value: string) {
  return value.replace(/\D/g, '').slice(0, 10);
}

function formatCompanyNumber(value: string) {
  const digits = normalizeCompanyNumberInput(value);

  if (digits.length <= 4) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 4)}.${digits.slice(4)}`;

  return `${digits.slice(0, 4)}.${digits.slice(4, 7)}.${digits.slice(7)}`;
}

function savePendingCompanyNumber(value: string | null) {
  if (typeof window === 'undefined') return;

  if (value) {
    window.localStorage.setItem(PENDING_COMPANY_NUMBER_STORAGE_KEY, value);
    return;
  }

  window.localStorage.removeItem(PENDING_COMPANY_NUMBER_STORAGE_KEY);
}

function getResendErrorMessage(message: string) {
  const normalizedMessage = message.toLowerCase();

  if (normalizedMessage.includes('rate limit')) {
    return 'Too many email requests were made. Please wait a few minutes, then try again.';
  }

  if (normalizedMessage.includes('invalid') && normalizedMessage.includes('email')) {
    return 'The email address is not valid. Please return and check the address.';
  }

  return `We could not resend the confirmation email. ${message}`;
}

function getAccountTypeLabel(value: string | null | undefined) {
  if (value === 'client') return 'Client';
  if (value === 'worker') return 'Worker';
  if (value === 'company') return 'Company';

  return 'Sendio';
}

function getExistingEmailNotice(
  existingUserType?: string | null,
): RegisterNotice {
  const accountLabel = getAccountTypeLabel(existingUserType);

  return {
    type: 'error',
    title: 'This email is already registered.',
    body:
      accountLabel === 'Sendio'
        ? 'Please sign in to your existing account or use a different email address.'
        : `This email already belongs to a ${accountLabel} account. Please sign in to your existing account or use a different email address.`,
  };
}

function isObfuscatedExistingUser(
  user: { identities?: unknown[] | null } | null | undefined,
) {
  return Array.isArray(user?.identities) && user.identities.length === 0;
}

export default function RegisterPage() {
  const router = useRouter();

  const [userType, setUserType] = useState<UserType | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [facebookLoading, setFacebookLoading] = useState(false);
  const [linkedinLoading, setLinkedinLoading] = useState(false);
  const [notice, setNotice] = useState<RegisterNotice | null>(null);
  const [pendingEmail, setPendingEmail] = useState('');
  const [confirmationDeadline, setConfirmationDeadline] = useState<number | null>(
    null,
  );
  const [confirmationSeconds, setConfirmationSeconds] = useState(0);
  const [confirmationPhase, setConfirmationPhase] =
    useState<ConfirmationPhase>('idle');
  const [resendFeedback, setResendFeedback] = useState<ResendFeedback | null>(
    null,
  );
  const [companyNumber, setCompanyNumber] = useState('');
  const [companyLookupState, setCompanyLookupState] =
    useState<CompanyLookupState>('idle');
  const [verifiedCompany, setVerifiedCompany] = useState<BceCompany | null>(null);
  const [companyLookupMessage, setCompanyLookupMessage] = useState('');

  const selectedAccount = useMemo(() => {
    return accountOptions.find((option) => option.value === userType) ?? null;
  }, [userType]);

  const registrationUnlocked =
    userType !== 'company' || companyLookupState === 'verified';

  useEffect(() => {
    const initialType = getInitialUserType();

    if (!initialType) return;

    const initialTypeTimer = window.setTimeout(() => {
      if (initialType === 'company') {
        router.replace('/register/company');
        return;
      }

      setUserType(initialType);
    }, 0);

    return () => window.clearTimeout(initialTypeTimer);
  }, [router]);

  useEffect(() => {
    if (userType !== 'company' || companyNumber.length !== 10) return;

    const controller = new AbortController();

    const lookupTimer = window.setTimeout(async () => {
      setCompanyLookupState('checking');
      setVerifiedCompany(null);
      setCompanyLookupMessage('Checking the official BCE register...');

      try {
        const response = await fetch(
          `/api/bce/company?number=${encodeURIComponent(companyNumber)}`,
          {
            cache: 'no-store',
            signal: controller.signal,
          },
        );

        const payload = (await response.json()) as BceLookupResponse;

        if (!response.ok || !payload.ok || !payload.company) {
          throw new Error(
            payload.message || 'The company was not found in the BCE register.',
          );
        }

        if (payload.company.status_code !== 'AC') {
          throw new Error('This company is not active in the BCE register.');
        }

        setVerifiedCompany(payload.company);
        setCompanyLookupState('verified');
        setCompanyLookupMessage('');
        savePendingCompanyNumber(payload.company.number);
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return;
        }

        setVerifiedCompany(null);
        setCompanyLookupState('error');
        setCompanyLookupMessage(
          error instanceof Error
            ? error.message
            : 'The BCE verification could not be completed.',
        );
        savePendingCompanyNumber(null);
      }
    }, 350);

    return () => {
      window.clearTimeout(lookupTimer);
      controller.abort();
    };
  }, [companyNumber, userType]);

  useEffect(() => {
    const callbackError = window.sessionStorage.getItem(
      'sendio_company_profile_setup_error',
    );

    if (!callbackError) return;

    window.sessionStorage.removeItem('sendio_company_profile_setup_error');

    const errorTimer = window.setTimeout(() => {
      setNotice({
        type: 'error',
        title: 'Company verification could not be completed.',
        body: callbackError,
      });
    }, 0);

    return () => window.clearTimeout(errorTimer);
  }, []);

  function startConfirmationWait(
    email: string,
    feedback: ResendFeedback | null = null,
  ) {
    const deadline = Date.now() + CONFIRMATION_WAIT_MS;

    setPendingEmail(email);
    setConfirmationDeadline(deadline);
    setConfirmationSeconds(CONFIRMATION_WAIT_SECONDS);
    setConfirmationPhase('waiting');
    setResendFeedback(feedback);
    setNotice({ ...pendingConfirmationNotice });
    savePendingConfirmation(email, deadline);
  }

   useEffect(() => {
   const storedConfirmation = readPendingConfirmation();

  if (!storedConfirmation) return;

   const restoreTimer = window.setTimeout(() => {
    const remainingSeconds = getRemainingConfirmationSeconds(
      storedConfirmation.deadline,
    );

    setPendingEmail(storedConfirmation.email);
    setConfirmationSeconds(remainingSeconds);
    setConfirmationPhase(remainingSeconds > 0 ? 'waiting' : 'ready');
    setConfirmationDeadline(
      remainingSeconds > 0 ? storedConfirmation.deadline : null,
    );
    setNotice({ ...pendingConfirmationNotice });
  }, 0);

  return () => window.clearTimeout(restoreTimer);
}, []);

  useEffect(() => {
    if (notice?.type !== 'pending' || !confirmationDeadline) return;

    const updateCountdown = () => {
      const remainingSeconds = getRemainingConfirmationSeconds(
        confirmationDeadline,
      );

      setConfirmationSeconds(remainingSeconds);

      if (remainingSeconds > 0) return;

      setConfirmationDeadline(null);
      setConfirmationPhase('ready');
      setResendFeedback(null);

      if (pendingEmail) {
        savePendingConfirmation(pendingEmail, 0);
      }
    };

    updateCountdown();

    const timer = window.setInterval(updateCountdown, 1000);

    return () => window.clearInterval(timer);
  }, [confirmationDeadline, notice?.type, pendingEmail]);

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

      clearPendingConfirmation();
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

  function resetCompanyVerification() {
    setCompanyNumber('');
    setCompanyLookupState('idle');
    setVerifiedCompany(null);
    setCompanyLookupMessage('');
    savePendingCompanyNumber(null);
  }

  function handleAccountTypeSelection(value: UserType) {
    setNotice(null);

    if (value === 'company') {
      resetCompanyVerification();
      router.push('/register/company');
      return;
    }

    setUserType(value);
    resetCompanyVerification();
  }

  function handleCompanyNumberChange(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    setCompanyNumber(normalizeCompanyNumberInput(event.target.value));
    setCompanyLookupState('idle');
    setVerifiedCompany(null);
    setCompanyLookupMessage('');
    savePendingCompanyNumber(null);
  }

  function prepareCompanyRegistration(selectedType: UserType) {
    if (selectedType !== 'company') return true;

    if (companyLookupState !== 'verified' || !verifiedCompany) {
      setNotice({
        type: 'error',
        title: 'Verify the company first.',
        body: 'Enter a valid active Belgian enterprise number before continuing.',
      });

      return false;
    }

    savePendingCompanyNumber(verifiedCompany.number);
    return true;
  }

  async function handleGoogleRegister() {
    setNotice(null);

    if (!requireAccountType()) return;

    const selectedType = userType;

    if (!selectedType) return;

  if (!prepareCompanyRegistration(selectedType)) return;

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
        async function handleFacebookRegister() {
  setNotice(null);

  if (!requireAccountType()) return;

  const selectedType = userType;

  if (!selectedType) return;

  if (!prepareCompanyRegistration(selectedType)) return;

  setFacebookLoading(true);

  const redirectTo = `${window.location.origin}/auth/callback`;

  window.localStorage.setItem('sendio_pending_user_type', selectedType);
  window.localStorage.setItem('sendio_pending_auth_provider', 'facebook');

  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'facebook',
    options: {
      redirectTo,
      queryParams: {
        auth_type: 'reauthorize',
      },
    },
  });

  if (error) {
    setNotice({
      type: 'error',
      title: error.message,
    });
    setFacebookLoading(false);
  }
}
 async function handleLinkedInRegister() {
  setNotice(null);

  if (!requireAccountType()) return;

  const selectedType = userType;

  if (!selectedType) return;

  if (!prepareCompanyRegistration(selectedType)) return;

  setLinkedinLoading(true);

  const redirectTo = `${window.location.origin}/auth/callback`;

  window.localStorage.setItem(
    'sendio_pending_user_type',
    selectedType,
  );

  window.localStorage.setItem(
    'sendio_pending_auth_provider',
    'linkedin_oidc',
  );

  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'linkedin_oidc',
    options: {
      redirectTo,
    },
  });

  if (error) {
    setNotice({
      type: 'error',
      title: error.message,
    });

    setLinkedinLoading(false);
  }
}
async function handleResendConfirmation() {
    if (!pendingEmail || confirmationPhase === 'resending') return;

    setConfirmationPhase('resending');
    setResendFeedback(null);

    const redirectTo = `${window.location.origin}/auth/callback`;

    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: pendingEmail,
      options: {
        emailRedirectTo: redirectTo,
      },
    });

    if (error) {
      setConfirmationPhase('ready');
      setResendFeedback({
        type: 'error',
        message: getResendErrorMessage(error.message),
      });
      return;
    }

    startConfirmationWait(pendingEmail, {
      type: 'success',
      message:
        'A new confirmation email was sent. Please check your inbox and Spam/Junk folder.',
    });
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

    if (!prepareCompanyRegistration(selectedType)) {
      setLoading(false);
      return;
    }

    const formData = new FormData(e.currentTarget);

    const email = String(formData.get('email') || '').trim().toLowerCase();
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

    const { data: existingProfile, error: existingProfileError } =
      await supabase
        .from('profiles')
        .select('user_type')
        .ilike('email', email)
        .limit(1)
        .maybeSingle();

    if (existingProfileError) {
      console.error(
        'Existing email lookup error:',
        existingProfileError.message,
      );
    }

    if (existingProfile) {
      clearPendingConfirmation();
      setNotice(
        getExistingEmailNotice(
          (existingProfile as { user_type: string | null }).user_type,
        ),
      );
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
          enterprise_number:
            selectedType === 'company' ? verifiedCompany?.number : undefined,
        },
      },
    });

    if (error) {
      const normalizedError = error.message.toLowerCase();

      if (
        normalizedError.includes('already registered') ||
        normalizedError.includes('already been registered')
      ) {
        clearPendingConfirmation();
        setNotice(getExistingEmailNotice());
      } else {
        setNotice({
          type: 'error',
          title: error.message,
          body: 'Please check your email address and try again.',
        });
      }

      setLoading(false);
      return;
    }

    if (isObfuscatedExistingUser(data.user)) {
      clearPendingConfirmation();
      setNotice(getExistingEmailNotice());
      setLoading(false);
      return;
    }

    if (data.session) {
      clearPendingConfirmation();
      router.replace(
        selectedType === 'company'
          ? '/auth/callback'
          : getRedirectPath(selectedType),
      );
      return;
    }

    startConfirmationWait(email);

    setLoading(false);
  }

  return (
    <div className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,#eef6ff_0,#ffffff_48%,#f7f3ff_100%)] px-3 py-2 text-slate-950">
      <button
        type="button"
        onClick={() => router.push('/')}
        className="fixed left-3 top-3 z-10 rounded-full border border-blue-100 bg-white/85 px-3 py-1.5 text-xs font-black text-slate-700 shadow-sm backdrop-blur transition hover:bg-white"
      >
        &larr; Back
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
              <div className="relative mx-auto mb-4 h-9 w-9">
                <div
                  className={`absolute inset-0 rounded-full border-[3px] border-sky-100 border-t-sky-600 ${
                    confirmationPhase === 'waiting' ||
                    confirmationPhase === 'resending'
                      ? 'animate-spin'
                      : ''
                  }`}
                />
                <span className="absolute inset-0 flex items-center justify-center text-[7px] font-black tracking-[-0.04em] text-emerald-900 tabular-nums">
                  {formatConfirmationCountdown(confirmationSeconds)}
                </span>
              </div>
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
              <>
                <p className="mt-4 rounded-2xl bg-sky-50 px-3 py-2 text-[10px] font-bold leading-4 text-sky-800">
                  Keep this page open, then confirm your email from the link.
                </p>

                {confirmationPhase === 'ready' ||
                confirmationPhase === 'resending' ? (
                  <div className="mt-3">
                    <p className="text-[10px] font-bold leading-4 text-sky-800">
                      Didn&apos;t receive the confirmation email?
                    </p>
                    <button
                      type="button"
                      onClick={handleResendConfirmation}
                      disabled={confirmationPhase === 'resending'}
                      className="mt-2 rounded-full bg-sky-600 px-4 py-2 text-xs font-black text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {confirmationPhase === 'resending'
                        ? 'Sending again...'
                        : 'Resend confirmation email'}
                    </button>
                  </div>
                ) : null}

                {resendFeedback ? (
                  <p
                    className={`mt-3 text-[10px] font-bold leading-4 ${
                      resendFeedback.type === 'success'
                        ? 'text-emerald-800'
                        : 'text-red-600'
                    }`}
                  >
                    {resendFeedback.message}
                  </p>
                ) : null}
              </>
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
                <span>&#305;</span>
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
                    onClick={() => handleAccountTypeSelection(option.value)}
                    className={`relative rounded-xl border px-1 py-1 text-center text-[10px] font-black transition hover:-translate-y-0.5 ${
                      isSelected ? option.activeClass : option.inactiveClass
                    }`}
                  >
                    {isSelected && (
                      <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-[9px] text-white">
                        {'\u2713'}
                      </span>
                    )}

                    <span className="mx-auto mb-0.5 flex h-5 w-5 items-center justify-center rounded-md bg-white text-[10px] shadow-sm">
                    <AccountTypeIcon type={option.value} />
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

            {userType === 'company' ? (
              <div className="mb-2 space-y-2 rounded-2xl border border-violet-100 bg-violet-50/70 p-3">
                <label className="block text-xs font-black text-violet-800">
                  Belgian enterprise number
                </label>

                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  value={formatCompanyNumber(companyNumber)}
                  onChange={handleCompanyNumberChange}
                  placeholder="0123.456.789"
                  maxLength={12}
                  className="h-9 w-full rounded-xl border border-violet-200 bg-white px-3 text-sm font-black text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                />

                {companyLookupState === 'checking' ? (
                  <p className="text-xs font-bold text-blue-700">
                    Checking the official BCE register...
                  </p>
                ) : null}

                {companyLookupState === 'error' && companyLookupMessage ? (
                  <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700">
                    {companyLookupMessage}
                  </p>
                ) : null}

                {companyLookupState === 'verified' && verifiedCompany ? (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2">
                    <p className="text-xs font-black text-emerald-800">
                      Company verified
                    </p>
                    <p className="mt-1 text-sm font-black text-slate-900">
                      {verifiedCompany.name}
                    </p>
                    <p className="mt-1 text-[11px] font-bold text-slate-600">
                      {verifiedCompany.status_fr}
                      {verifiedCompany.legal_form_fr
                        ? ` آ· ${verifiedCompany.legal_form_fr}`
                        : ''}
                    </p>
                    <p className="mt-1 text-[11px] font-semibold text-slate-500">
                      {[
                        verifiedCompany.street_fr,
                        verifiedCompany.house_number,
                        verifiedCompany.box
                          ? `box ${verifiedCompany.box}`
                          : '',
                        verifiedCompany.postal_code,
                        verifiedCompany.city_fr,
                      ]
                        .filter(Boolean)
                        .join(' ')}
                    </p>
                  </div>
                ) : null}
              </div>
            ) : null}

            {registrationUnlocked ? (
              <>
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
                {loading ? 'Sending email...' : 'Create account \u2192'}
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
  onClick={handleFacebookRegister}
  disabled={loading || facebookLoading}
  className="flex h-8 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white/90 text-sm font-black text-slate-700 shadow-sm transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
>
  <FacebookIcon />
  {facebookLoading ? 'Opening Facebook...' : 'Sign up with Facebook'}
</button>
            <button
  type="button"
  onClick={handleLinkedInRegister}
  disabled={loading || linkedinLoading}
  className="flex h-8 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white/90 text-sm font-black text-slate-700 shadow-sm transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
>
  <span className="text-[#0A66C2] font-black text-base">
    in
  </span>

  {linkedinLoading
    ? 'Opening LinkedIn...'
    : 'Sign up with LinkedIn'}
</button>
            </div>

              </>
            ) : (
              <p className="mb-2 rounded-xl border border-violet-100 bg-violet-50 px-3 py-2 text-center text-xs font-bold text-violet-700">
                Enter a valid active Belgian enterprise number to unlock registration.
              </p>
            )}

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
