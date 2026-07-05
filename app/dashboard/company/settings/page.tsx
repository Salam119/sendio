'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getCompanyId } from '@/lib/getCompanyId';
import { supabase } from '@/lib/supabase';

type CompanyStatus = 'available' | 'busy' | 'closed';
type ThemeMode = 'auto' | 'fixed';
type ThemeName = 'Sky' | 'Lavender' | 'Mint';

type CompanySettings = {
  id: string;
  name: string | null;
  slug: string | null;
  status: CompanyStatus | null;
  working_hours: string | null;
};

const themeOptions: ThemeName[] = ['Sky', 'Lavender', 'Mint'];

export default function CompanySettingsPage() {
  const [company, setCompany] = useState<CompanySettings | null>(null);
  const [accountEmail, setAccountEmail] = useState('');
  const [status, setStatus] = useState<CompanyStatus>('available');
  const [workingHours, setWorkingHours] = useState('');
  const [themeMode, setThemeMode] = useState<ThemeMode>('auto');
  const [themeName, setThemeName] = useState<ThemeName>('Sky');
  const [loading, setLoading] = useState(true);
  const [savingCompany, setSavingCompany] = useState(false);
  const [savingTheme, setSavingTheme] = useState(false);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let isMounted = true;

    async function loadSettings() {
      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!isMounted) {
        return;
      }

      setAccountEmail(user?.email ?? '');

      const companyId = await getCompanyId();

      if (!isMounted) {
        return;
      }

      if (!companyId) {
        setNotice('Company profile was not found for this account.');
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('companies')
        .select('id, name, slug, status, working_hours')
        .eq('id', companyId)
        .single();

      if (!isMounted) {
        return;
      }

      if (error) {
        setNotice(error.message);
        setLoading(false);
        return;
      }

      const companyData = data as CompanySettings;

      setCompany(companyData);
      setStatus(companyData.status ?? 'available');
      setWorkingHours(companyData.working_hours ?? '');

      const savedMode = window.localStorage.getItem(
        'sendio-company-theme-mode',
      );
      const savedTheme = window.localStorage.getItem('sendio-company-theme');

      if (savedMode === 'fixed' || savedMode === 'auto') {
        setThemeMode(savedMode);
      }

      if (
        savedTheme === 'Sky' ||
        savedTheme === 'Lavender' ||
        savedTheme === 'Mint'
      ) {
        setThemeName(savedTheme);
      }

      setLoading(false);
    }

    void loadSettings();

    return () => {
      isMounted = false;
    };
  }, []);

  async function saveCompanySettings() {
    if (!company) {
      setNotice('Company profile was not found.');
      return;
    }

    setSavingCompany(true);
    setNotice('');

    const { error } = await supabase
      .from('companies')
      .update({
        status,
        working_hours: workingHours.trim() || null,
      })
      .eq('id', company.id);

    if (error) {
      setNotice(error.message);
      setSavingCompany(false);
      return;
    }

    setCompany((current) =>
      current
        ? {
            ...current,
            status,
            working_hours: workingHours.trim() || null,
          }
        : current,
    );

    setNotice('Company settings saved successfully.');
    setSavingCompany(false);
  }

  function saveThemeSettings() {
    setSavingTheme(true);
    setNotice('');

    window.localStorage.setItem('sendio-company-theme-mode', themeMode);
    window.localStorage.setItem('sendio-company-theme', themeName);

    setNotice('Dashboard theme saved. The page will refresh to apply it.');

    window.setTimeout(() => {
      window.location.reload();
    }, 700);
  }

  const publicProfileHref = company?.slug
    ? `/companies/${company.slug}`
    : '/dashboard/company';

  if (loading) {
    return (
      <div className="rounded-[28px] border border-[var(--sendio-border)] bg-white p-6 shadow-sm">
        <p className="text-sm font-bold text-[var(--sendio-muted)]">
          Loading company settings...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <section className="rounded-[28px] border border-[var(--sendio-border)] bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[var(--sendio-muted)]">
              Company Settings
            </p>

            <h1 className="mt-2 text-3xl font-black tracking-tight text-[var(--sendio-text)]">
              Settings
            </h1>

            <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-[var(--sendio-muted)]">
              Manage your company availability, dashboard theme, and public
              profile access from one clean place.
            </p>
          </div>

          <Link
            href={publicProfileHref}
            className="rounded-2xl border border-[var(--sendio-border)] bg-[var(--sendio-soft)] px-4 py-2 text-sm font-black text-[var(--sendio-text)] transition hover:bg-[var(--sendio-soft-hover)]"
          >
            Open public profile
          </Link>
        </div>

        {notice ? (
          <div className="mt-4 rounded-2xl border border-[var(--sendio-border)] bg-[var(--sendio-soft)] px-4 py-3 text-sm font-bold text-[var(--sendio-text)]">
            {notice}
          </div>
        ) : null}
      </section>

      <div className="grid gap-5 xl:grid-cols-3">
        <section className="rounded-[28px] border border-[var(--sendio-border)] bg-white p-5 shadow-sm xl:col-span-2">
          <div className="mb-4">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--sendio-muted)]">
              Availability
            </p>

            <h2 className="mt-1 text-xl font-black text-[var(--sendio-text)]">
              Company status
            </h2>

            <p className="mt-1 text-sm font-semibold text-[var(--sendio-muted)]">
              This status appears on your public company profile.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-xs font-black uppercase tracking-[0.15em] text-[var(--sendio-muted)]">
                Status
              </span>

              <select
                value={status}
                onChange={(event) =>
                  setStatus(event.target.value as CompanyStatus)
                }
                className="w-full rounded-2xl border border-[var(--sendio-border)] bg-white px-4 py-3 text-sm font-bold text-[var(--sendio-text)] outline-none focus:border-[var(--sendio-accent)]"
              >
                <option value="available">Available</option>
                <option value="busy">Busy</option>
                <option value="closed">Closed</option>
              </select>
            </label>

            <label className="space-y-2">
              <span className="text-xs font-black uppercase tracking-[0.15em] text-[var(--sendio-muted)]">
                Working hours
              </span>

              <input
                value={workingHours}
                onChange={(event) => setWorkingHours(event.target.value)}
                placeholder="Example: Mon - Fri, 09:00 - 18:00"
                className="w-full rounded-2xl border border-[var(--sendio-border)] bg-white px-4 py-3 text-sm font-semibold text-[var(--sendio-text)] outline-none placeholder:text-gray-400 focus:border-[var(--sendio-accent)]"
              />
            </label>
          </div>

          <button
            type="button"
            onClick={saveCompanySettings}
            disabled={savingCompany}
            className="mt-5 rounded-full bg-[var(--sendio-accent)] px-5 py-2.5 text-sm font-black text-[var(--sendio-accent-text)] transition hover:opacity-90 disabled:opacity-60"
          >
            {savingCompany ? 'Saving...' : 'Save company settings'}
          </button>
        </section>

        <section className="rounded-[28px] border border-[var(--sendio-border)] bg-white p-5 shadow-sm">
          <div className="mb-4">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--sendio-muted)]">
              Account
            </p>

            <h2 className="mt-1 text-xl font-black text-[var(--sendio-text)]">
              Safety
            </h2>
          </div>

          <div className="space-y-3 rounded-2xl border border-[var(--sendio-border)] bg-[var(--sendio-soft)] p-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--sendio-muted)]">
                Company
              </p>
              <p className="mt-1 text-sm font-black text-[var(--sendio-text)]">
                {company?.name || 'Company profile'}
              </p>
            </div>

            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--sendio-muted)]">
                Account email
              </p>
              <p className="mt-1 break-all text-sm font-bold text-[var(--sendio-text)]">
                {accountEmail || 'Not available'}
              </p>
            </div>

            <p className="text-xs font-bold leading-5 text-[var(--sendio-muted)]">
              Account type and permissions are protected and managed by Sendio
              admin rules.
            </p>
          </div>
        </section>
      </div>

      <section className="rounded-[28px] border border-[var(--sendio-border)] bg-white p-5 shadow-sm">
        <div className="mb-4">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--sendio-muted)]">
            Appearance
          </p>

          <h2 className="mt-1 text-xl font-black text-[var(--sendio-text)]">
            Dashboard theme
          </h2>

          <p className="mt-1 text-sm font-semibold text-[var(--sendio-muted)]">
            Choose whether the dashboard rotates colors automatically or keeps a
            fixed Sendio theme.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2">
            <span className="text-xs font-black uppercase tracking-[0.15em] text-[var(--sendio-muted)]">
              Theme mode
            </span>

            <select
              value={themeMode}
              onChange={(event) => setThemeMode(event.target.value as ThemeMode)}
              className="w-full rounded-2xl border border-[var(--sendio-border)] bg-white px-4 py-3 text-sm font-bold text-[var(--sendio-text)] outline-none focus:border-[var(--sendio-accent)]"
            >
              <option value="auto">Auto rotate</option>
              <option value="fixed">Fixed theme</option>
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-xs font-black uppercase tracking-[0.15em] text-[var(--sendio-muted)]">
              Fixed theme
            </span>

            <select
              value={themeName}
              onChange={(event) => setThemeName(event.target.value as ThemeName)}
              className="w-full rounded-2xl border border-[var(--sendio-border)] bg-white px-4 py-3 text-sm font-bold text-[var(--sendio-text)] outline-none focus:border-[var(--sendio-accent)]"
            >
              {themeOptions.map((theme) => (
                <option key={theme} value={theme}>
                  {theme}
                </option>
              ))}
            </select>
          </label>
        </div>

        <button
          type="button"
          onClick={saveThemeSettings}
          disabled={savingTheme}
          className="mt-5 rounded-full border border-[var(--sendio-border)] bg-[var(--sendio-soft)] px-5 py-2.5 text-sm font-black text-[var(--sendio-text)] transition hover:bg-[var(--sendio-soft-hover)] disabled:opacity-60"
        >
          {savingTheme ? 'Applying...' : 'Save theme settings'}
        </button>
      </section>
    </div>
  );
}