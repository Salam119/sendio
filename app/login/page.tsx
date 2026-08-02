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
type HomeLanguage = 'fr' | 'nl' | 'en' | 'ar' | 'es';

const LOGIN_TEXT = {
  fr: {
    back: ' Retour ', emailLabel: 'E-mail', emailPlaceholder: 'Adresse e-mail', passwordLabel: 'Mot de passe', passwordPlaceholder: 'Mot de passe', show: 'Afficher', hide: 'Masquer', remember: 'Se souvenir de moi', signIn: 'Se connecter', signingIn: 'Connexion...', or: 'ou', connecting: 'Connexion...', google: 'Continuer avec Google', linkedin: 'Continuer avec LinkedIn', notMember: 'Pas encore membre ?', createAccount: 'Créer un compte', invalidCredentials: "L’adresse e-mail ou le mot de passe est incorrect.", googleError: 'La connexion avec Google n’a pas pu être effectuée. Veuillez réessayer.', linkedinError: 'La connexion avec LinkedIn n’a pas pu être effectuée. Veuillez réessayer.'
  },
  nl: {
    back: 'Terug ', emailLabel: 'E-mail', emailPlaceholder: 'E-mailadres', passwordLabel: 'Wachtwoord', passwordPlaceholder: 'Wachtwoord', show: 'Tonen', hide: 'Verbergen', remember: 'Onthoud mij', signIn: 'Aanmelden', signingIn: 'Bezig met aanmelden...', or: 'of', connecting: 'Verbinden...', google: 'Doorgaan met Google', linkedin: 'Doorgaan met LinkedIn', notMember: 'Nog geen lid?', createAccount: 'Account aanmaken', invalidCredentials: 'Het e-mailadres of wachtwoord is onjuist.', googleError: 'Aanmelden met Google is niet gelukt. Probeer het opnieuw.', linkedinError: 'Aanmelden met LinkedIn is niet gelukt. Probeer het opnieuw.'
  },
  en: {
    back: ' Back ', emailLabel: 'Email', emailPlaceholder: 'Email address', passwordLabel: 'Password', passwordPlaceholder: 'Password', show: 'Show', hide: 'Hide', remember: 'Remember me', signIn: 'Sign in', signingIn: 'Signing in...', or: 'or', connecting: 'Connecting...', google: 'Continue with Google', linkedin: 'Continue with LinkedIn', notMember: 'Not a member?', createAccount: 'Create account', invalidCredentials: 'The email or password is incorrect.', googleError: 'Google sign-in could not be completed. Please try again.', linkedinError: 'LinkedIn sign-in could not be completed. Please try again.'
  },
  ar: {
    back: 'العوده', emailLabel: 'البريد الإلكتروني', emailPlaceholder: 'عنوان البريد الإلكتروني', passwordLabel: 'كلمة المرور', passwordPlaceholder: 'كلمة المرور', show: 'إظهار', hide: 'إخفاء', remember: 'تذكرني', signIn: 'تسجيل الدخول', signingIn: 'جارٍ تسجيل الدخول...', or: 'أو', connecting: 'جارٍ الاتصال...', google: 'المتابعة باستخدام Google', linkedin: 'المتابعة باستخدام LinkedIn', notMember: 'ليس لديك حساب؟', createAccount: 'إنشاء حساب', invalidCredentials: 'البريد الإلكتروني أو كلمة المرور غير صحيحة.', googleError: 'تعذر إكمال تسجيل الدخول عبر Google. حاول مرة أخرى.', linkedinError: 'تعذر إكمال تسجيل الدخول عبر LinkedIn. حاول مرة أخرى.'
  },
  es: {
    back: ' Volver ', emailLabel: 'Correo electrónico', emailPlaceholder: 'Dirección de correo electrónico', passwordLabel: 'Contraseña', passwordPlaceholder: 'Contraseña', show: 'Mostrar', hide: 'Ocultar', remember: 'Recordarme', signIn: 'Iniciar sesión', signingIn: 'Iniciando sesión...', or: 'o', connecting: 'Conectando...', google: 'Continuar con Google', linkedin: 'Continuar con LinkedIn', notMember: '¿Aún no tienes cuenta?', createAccount: 'Crear cuenta', invalidCredentials: 'El correo electrónico o la contraseña son incorrectos.', googleError: 'No se pudo completar el inicio de sesión con Google. Inténtalo de nuevo.', linkedinError: 'No se pudo completar el inicio de sesión con LinkedIn. Inténtalo de nuevo.'
  },
} as const;

function detectLanguage(): HomeLanguage {
  if (typeof window === 'undefined') return 'fr';
  const savedLanguage = window.localStorage.getItem('sendio-home-language');
  if (savedLanguage === 'fr' || savedLanguage === 'nl' || savedLanguage === 'en' || savedLanguage === 'ar' || savedLanguage === 'es') return savedLanguage;
  const browserLanguage = window.navigator.language?.toLowerCase() ?? '';
  if (browserLanguage.startsWith('nl')) return 'nl';
  if (browserLanguage.startsWith('en')) return 'en';
  if (browserLanguage.startsWith('ar')) return 'ar';
  if (browserLanguage.startsWith('es')) return 'es';
  return 'fr';
}


const REMEMBERED_EMAIL_KEY =
  'sendio_remembered_login_email';

export default function LoginPage() {
  const router = useRouter();

  const [language, setLanguage] = useState<HomeLanguage>('fr');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] =
    useState(false);
  const [showPassword, setShowPassword] =
    useState(false);

  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] =
    useState(false);
  const [linkedinLoading, setLinkedinLoading] =
    useState(false);
  const [errorMessage, setErrorMessage] =
    useState('');

  const text = LOGIN_TEXT[language];
  const isArabic = language === 'ar';

  useEffect(() => {
    window.requestAnimationFrame(() => {
  setLanguage(detectLanguage());
});
    const handleStorage = (event: StorageEvent) => {
      if (event.key === 'sendio-home-language') setLanguage(detectLanguage());
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

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

    if (loading || googleLoading || linkedinLoading) {
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
        text.invalidCredentials
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
    if (loading || googleLoading || linkedinLoading) {
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
        text.googleError
      );
      setGoogleLoading(false);
    }
  }

  async function handleLinkedInLogin() {
    if (loading || googleLoading || linkedinLoading) {
      return;
    }

    setLinkedinLoading(true);
    setErrorMessage('');

    window.localStorage.setItem(
      'sendio_pending_auth_provider',
      'linkedin_oidc'
    );

    const { error } =
      await supabase.auth.signInWithOAuth({
        provider: 'linkedin_oidc',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

    if (error) {
      setErrorMessage(
        text.linkedinError
      );
      setLinkedinLoading(false);
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
    <main
      dir={isArabic ? 'rtl' : 'ltr'}
      className="relative min-h-screen overflow-hidden bg-[linear-gradient(145deg,#dff7ff_0%,#cceff8_42%,#edfaff_100%)] px-4 py-6 text-[#111827]">
      <div className="pointer-events-none absolute left-[-110px] top-[-120px] h-80 w-80 rounded-full bg-white/60 blur-3xl" />

      <div className="pointer-events-none absolute bottom-[-150px] right-[-100px] h-96 w-96 rounded-full bg-[#8fddf1]/30 blur-3xl" />

      <div className="pointer-events-none absolute left-1/2 top-0 h-52 w-[760px] max-w-[92vw] -translate-x-1/2 rounded-full bg-white/25 blur-3xl" />

      <div className="relative z-10 flex min-h-[calc(100vh-48px)] items-center justify-center pt-10">
        <section className="relative w-full max-w-[440px]">
          

          <div className="relative rounded-[28px] border border-white/80 bg-[linear-gradient(145deg,rgba(184,231,244,0.96),rgba(216,245,252,0.96))] px-5 pb-5 pt-14 shadow-[0_28px_80px_rgba(15,62,82,0.22)] sm:px-6">
            <div className="absolute left-1/2 top-[-42px] h-[76px] w-[148px] -translate-x-1/2">
              <div className="absolute left-1/2 top-0 h-[46px] w-[70px] -translate-x-1/2 rounded-t-[38px] border-[10px] border-b-0 border-[#eef6f8] bg-transparent shadow-[0_-5px_16px_rgba(15,23,42,0.10)]">
                <div className="absolute left-1/2 top-[6px] h-3.5 w-3.5 -translate-x-1/2 rounded-full border border-[#cbd5dc] bg-white shadow-inner" />
              </div>

              <button
  type="button"
  onClick={() => router.push('/')}
  className="absolute bottom-0 left-1/2 flex h-[38px] w-[148px] -translate-x-1/2 items-center justify-center rounded-[16px] border border-white/80 bg-[linear-gradient(180deg,#ffffff_0%,#e7eef1_100%)] text-xs font-black text-[#1f3f55] shadow-[0_10px_24px_rgba(15,23,42,0.18)] transition hover:bg-white"
>
  {text.back}
</button>
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
                dir="ltr"
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
                  {text.emailLabel}
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
                  placeholder={text.emailPlaceholder}
                 className="h-10 w-full rounded-[14px] border border-white/90 bg-white px-4 text-sm font-bold text-[#111827] shadow-[inset_0_1px_2px_rgba(15,23,42,0.05),0_7px_18px_rgba(15,62,82,0.08)] outline-none transition placeholder:text-slate-400 focus:border-[#29b9f3] focus:ring-4 focus:ring-[#29b9f3]/15"
required
/>
                
              </div>

             <div className="grid gap-1.5 sm:grid-cols-[100px_minmax(0,1fr)] sm:items-center">
                <label
                  htmlFor="sendio-login-password"
                  className="text-xs font-black text-[#24475c]"
                >
                  {text.passwordLabel}
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
                    placeholder={text.passwordPlaceholder}
                    className={`h-10 w-full rounded-[14px] border border-white/90 bg-white py-2 text-sm font-bold text-[#111827] shadow-[inset_0_1px_2px_rgba(15,23,42,0.05),0_7px_18px_rgba(15,62,82,0.08)] outline-none transition placeholder:text-slate-400 focus:border-[#29b9f3] focus:ring-4 focus:ring-[#29b9f3]/15 ${isArabic ? 'pr-4 pl-[76px]' : 'pl-4 pr-[76px]'}`}
                    required
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowPassword(
                        (current) => !current
                      )
                    }
                    className={`absolute top-1/2 -translate-y-1/2 rounded-full px-2 py-1 text-[10px] font-black text-[#315b72] transition hover:bg-[#dff5fb] ${isArabic ? 'left-2.5' : 'right-2.5'}`}
                  >
                    👁️
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

                  <span>{text.remember}</span>
                </label>

                <button
                  type="submit"
                  disabled={
                    loading || googleLoading || linkedinLoading
                  }
                  className="inline-flex min-h-10 items-center justify-center rounded-[14px] bg-[#29b9f3] px-7 text-sm font-black text-white shadow-[0_12px_24px_rgba(41,185,243,0.28)] transition hover:-translate-y-0.5 hover:bg-[#20aee8] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading
                    ? text.signingIn
                    : text.signIn}
                </button>
              </div>
            </form>

            <div className="my-4 flex items-center gap-3">
              <span className="h-px flex-1 bg-[#8bc8d8]/65" />

              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[#416779]">
                {text.or}
              </span>

              <span className="h-px flex-1 bg-[#8bc8d8]/65" />
            </div>

            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={googleLoading || linkedinLoading || loading}
              className="flex min-h-10 w-full items-center justify-center gap-3 rounded-[14px] border border-white/90 bg-white/85 px-4 text-xs font-black text-[#111827] shadow-[0_9px_20px_rgba(15,62,82,0.10)] transition hover:-translate-y-0.5 hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-sm font-black shadow-sm">
                G
              </span>

              {googleLoading
                ? text.connecting
                : text.google}
            </button>

            <button
              type="button"
              onClick={handleLinkedInLogin}
              disabled={linkedinLoading || googleLoading || loading}
              className="mt-3 flex min-h-10 w-full items-center justify-center gap-3 rounded-[14px] border border-white/90 bg-white/85 px-4 text-xs font-black text-[#111827] shadow-[0_9px_20px_rgba(15,62,82,0.10)] transition hover:-translate-y-0.5 hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#0A66C2] text-[11px] font-black text-white shadow-sm">
                in
              </span>

              {linkedinLoading
                ? text.connecting
                : text.linkedin}
            </button>

            <p className="mt-4 text-center text-xs font-bold text-[#31576a]">
              {text.notMember}{' '}

              <Link
                href="/register"
                className="font-black text-[#111827] underline decoration-[#29b9f3] decoration-2 underline-offset-4"
              >
                {text.createAccount}
              </Link>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
