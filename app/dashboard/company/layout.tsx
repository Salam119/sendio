'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { CompanyProvider } from '@/context/CompanyContext';

type CompanyDashboardLayoutProps = {
  children: React.ReactNode;
};

type ThemePalette = {
  name: string;
  page: string;
  card: string;
  soft: string;
  softHover: string;
  border: string;
  text: string;
  muted: string;
  accent: string;
  accentText: string;
};

const themePalettes: ThemePalette[] = [
  {
    name: 'Sky',
    page: '#ffffff',
    card: '#ffffff',
    soft: '#eef6ff',
    softHover: '#e3efff',
    border: '#dbeafe',
    text: '#111827',
    muted: '#374151',
    accent: '#29b9f3',
    accentText: '#ffffff',
  },
  {
    name: 'Lavender',
    page: '#f8f5ff',
    card: '#ffffff',
    soft: '#f0ebff',
    softHover: '#e8e1ff',
    border: '#ddd6fe',
    text: '#111827',
    muted: '#374151',
    accent: '#8b5cf6',
    accentText: '#ffffff',
  },
  {
    name: 'Mint',
    page: '#f7fffb',
    card: '#ffffff',
    soft: '#ecfdf5',
    softHover: '#dcfce7',
    border: '#bbf7d0',
    text: '#111827',
    muted: '#374151',
    accent: '#10b981',
    accentText: '#ffffff',
  },
];

const navItems = [
  { label: 'Dashboard', href: '/dashboard/company' },
  { label: 'Services', href: '/dashboard/company/services' },
  { label: 'Projects', href: '/dashboard/company/projects' },
  { label: 'Gallery', href: '/dashboard/company/gallery' },
  { label: 'Articles', href: '/dashboard/company/articles' },
  { label: 'Reviews', href: '/dashboard/company/reviews' },
  { label: 'Messages', href: '/dashboard/company/messages' },
  { label: 'Ads', href: '/dashboard/company/ads' },
  { label: 'Analytics', href: '/dashboard/company/analytics' },
  { label: 'Settings', href: '/dashboard/company/settings' },
];

export default function CompanyDashboardLayout({
  children,
}: CompanyDashboardLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [checking, setChecking] = useState(true);
  const [paletteIndex, setPaletteIndex] = useState(0);

    useEffect(() => {
    async function checkSession() {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error || !user) {
        router.replace('/login');
        return;
      }

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('user_type')
        .eq('id', user.id)
        .maybeSingle();

      if (profileError) {
        console.error('Profile lookup error:', profileError.message);
      }

      const userType =
        (profileData as { user_type: string | null } | null)?.user_type ??
        user.user_metadata?.user_type ??
        null;

      if (userType === 'company') {
        setChecking(false);
        return;
      }

      if (userType === 'worker') {
        router.replace('/dashboard/worker');
        return;
      }

      router.replace('/');
    }

    void checkSession();
  }, [router]);
useEffect(() => {
  const savedTheme = window.localStorage.getItem('sendio-company-theme');
  const savedMode = window.localStorage.getItem('sendio-company-theme-mode');

  if (savedTheme) {
    const savedIndex = themePalettes.findIndex(
      (palette) => palette.name === savedTheme,
    );

    if (savedIndex >= 0) {
      window.setTimeout(() => {
        setPaletteIndex(savedIndex);
      }, 0);
    }
  }

  if (savedMode === 'fixed') {
    return;
  }

  const interval = window.setInterval(() => {
    setPaletteIndex((current) => (current + 1) % themePalettes.length);
  }, 120000);

  return () => {
    window.clearInterval(interval);
  };
}, []);
 
  const activePalette = themePalettes[paletteIndex];

  const themeStyle = useMemo(
    () =>
      ({
        '--sendio-page': activePalette.page,
        '--sendio-card': activePalette.card,
        '--sendio-soft': activePalette.soft,
        '--sendio-soft-hover': activePalette.softHover,
        '--sendio-border': activePalette.border,
        '--sendio-text': activePalette.text,
        '--sendio-muted': activePalette.muted,
        '--sendio-accent': activePalette.accent,
        '--sendio-accent-text': activePalette.accentText,
      }) as React.CSSProperties,
    [activePalette],
  );

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace('/');
  }

  function handleBack() {
    router.back();
  }

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <p className="text-sm font-semibold text-gray-700">
          Checking session...
        </p>
      </div>
    );
  }

  return (
    <CompanyProvider>
      <div
        style={themeStyle}
        className="flex min-h-screen bg-[var(--sendio-page)] text-[var(--sendio-text)]"
      >
        <aside className="sticky top-0 hidden h-screen w-56 shrink-0 border-r border-[var(--sendio-border)] bg-white/95 shadow-sm lg:flex lg:flex-col">
          <div className="border-b border-[var(--sendio-border)] px-5 py-4">
            <h1 className="text-xl font-black tracking-tight text-[var(--sendio-text)]">
              SENDIO
            </h1>

            <p className="mt-1 text-xs font-semibold text-[var(--sendio-muted)]">
              Company Dashboard
            </p>
          </div>

          <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
            {navItems.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== '/dashboard/company' &&
                  pathname.startsWith(`${item.href}/`));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={[
                    'block rounded-2xl px-4 py-2.5 text-sm font-bold transition',
                    isActive
                      ? 'bg-[var(--sendio-soft)] text-[var(--sendio-text)] shadow-sm'
                      : 'text-[var(--sendio-muted)] hover:bg-[var(--sendio-soft-hover)] hover:text-[var(--sendio-text)]',
                  ].join(' ')}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="border-t border-[var(--sendio-border)] px-4 py-3">
            <p className="text-xs font-bold leading-5 text-[var(--sendio-muted)]">
              Build trust, stay visible, and grow with Sendio.
            </p>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 border-b border-[var(--sendio-border)] bg-white/95 px-4 py-3 backdrop-blur md:px-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-xl font-black tracking-tight text-[var(--sendio-text)]">
                  Company Dashboard
                </h2>

                <p className="mt-0.5 text-xs font-semibold text-[var(--sendio-muted)]">
                  Manage your company profile, visibility, messages, and growth.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleBack}
                  className="rounded-2xl border border-[var(--sendio-border)] bg-white px-4 py-2 text-sm font-bold text-[var(--sendio-text)] transition hover:bg-[var(--sendio-soft-hover)]"
                >
                  Back
                </button>

                <Link
                  href="/"
                  className="rounded-2xl border border-[var(--sendio-border)] bg-white px-4 py-2 text-sm font-bold text-[var(--sendio-text)] transition hover:bg-[var(--sendio-soft-hover)]"
                >
                  View Website
                </Link>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="rounded-2xl bg-red-600 px-4 py-2 text-sm font-bold text-white transition hover:opacity-90"
                >
                  Logout
                </button>
              </div>
            </div>

            <nav className="mt-3 flex gap-2 overflow-x-auto pb-1 lg:hidden">
              {navItems.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== '/dashboard/company' &&
                    pathname.startsWith(`${item.href}/`));

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={[
                      'shrink-0 rounded-2xl border px-3 py-2 text-xs font-bold transition',
                      isActive
                        ? 'border-[var(--sendio-border)] bg-[var(--sendio-soft)] text-[var(--sendio-text)]'
                        : 'border-[var(--sendio-border)] bg-white text-[var(--sendio-muted)] hover:bg-[var(--sendio-soft-hover)]',
                    ].join(' ')}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </header>

          <main className="flex-1 px-4 py-4 md:px-6 md:py-5">
            <div className="mx-auto w-full max-w-[1502px]">
              {children}
            </div>
          </main>

          <footer className="border-t border-[var(--sendio-border)] bg-white px-4 py-3 md:px-6">
            <div className="mx-auto flex w-full max-w-[1502px] flex-col gap-1 text-xs font-bold text-[var(--sendio-muted)] md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-black text-[var(--sendio-text)]">
                  SENDIO
                </span>
                <span>Company tools</span>
              </div>

              <p>
                Keep your profile clear, active, and ready for new clients.
              </p>
            </div>
          </footer>
        </div>
      </div>
    </CompanyProvider>
  );
}