'use client';

import Link from 'next/link';
import { FormEvent, ReactNode, useEffect, useState } from 'react';

import CompanyHeader from '@/components/company/CompanyHeader';
import CompanyServices from '@/components/company/CompanyServices';
import CompanyProjects from '@/components/company/CompanyProjects';
import CompanyAbout from '@/components/company/CompanyAbout';
import CompanyInfo from '@/components/company/CompanyInfo';
import CompanySocialLinks from '@/components/company/CompanySocialLinks';
import CompanyStatus from '@/components/company/CompanyStatus';
import CompanyFeatures from '@/components/company/CompanyFeatures';
import CompanyGallery from '@/components/company/CompanyGallery';
import { supabase } from '@/lib/supabase';

type VerificationStatus = 'pending' | 'verified' | 'rejected';

type VisibilityField =
  | 'show_public_messages'
  | 'show_public_about'
  | 'show_public_address'
  | 'show_public_status'
  | 'show_public_services'
  | 'show_public_projects'
  | 'show_public_gallery'
  | 'show_public_branches'
  | 'show_public_showcase'
  | 'show_public_features'
  | 'show_public_articles'
  | 'show_public_social_links';

type CompanyRow = {
  id: string;
  name: string;
  slug: string;
  registration_number: string | null;
  verification_status: VerificationStatus | null;
  show_public_messages: boolean | null;
  show_public_about: boolean | null;
  show_public_address: boolean | null;
  show_public_status: boolean | null;
  show_public_services: boolean | null;
  show_public_projects: boolean | null;
  show_public_gallery: boolean | null;
  show_public_branches: boolean | null;
  show_public_showcase: boolean | null;
  show_public_features: boolean | null;
  show_public_articles: boolean | null;
  show_public_social_links: boolean | null;
};

type SetupStepId =
  | 'identity'
  | 'status'
  | 'about'
  | 'public-tools'
  | 'services'
  | 'projects'
  | 'features'
  | 'social'
  | 'gallery';

type SetupStep = {
  id: SetupStepId;
  title: string;
  description: string;
};

const COMPANY_SELECT =
  'id,name,slug,registration_number,verification_status,show_public_messages,show_public_about,show_public_address,show_public_status,show_public_services,show_public_projects,show_public_gallery,show_public_branches,show_public_showcase,show_public_features,show_public_articles,show_public_social_links' as const;

const SETUP_STEPS: SetupStep[] = [
  {
    id: 'identity',
    title: 'Company information',
    description:
      'Add your logo, cover, contact details, address, and other identity information.',
  },
  {
    id: 'status',
    title: 'Company status',
    description:
      'Set availability and working hours without changing any existing controls.',
  },
  {
    id: 'about',
    title: 'About the company',
    description: 'Add a public introduction when you are ready.',
  },
  {
    id: 'public-tools',
    title: 'Public profile tools',
    description:
      'Open showcase, location, branches, or articles and choose which sections may appear publicly.',
  },
  {
    id: 'services',
    title: 'Company services',
    description:
      'Manage the services linked to the profile, service pages, requests, and advertisements.',
  },
  {
    id: 'projects',
    title: 'Company projects',
    description: 'Add completed projects and control their public visibility.',
  },
  {
    id: 'features',
    title: 'Company features',
    description: 'Add company strengths and control their public visibility.',
  },
  {
    id: 'social',
    title: 'Social links',
    description: 'Add official links and decide whether they appear publicly.',
  },
  {
    id: 'gallery',
    title: 'Company gallery',
    description:
      'Manage company images through the existing R2-connected gallery controls.',
  },
];

function makeSlug(value: string) {
  const cleanValue = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return cleanValue || `company-${Date.now()}`;
}

function getVisibilityValue(company: CompanyRow, field: VisibilityField) {
  return company[field] === true;
}

export default function CompanyDashboardPage() {
  const [checkingCompany, setCheckingCompany] = useState(true);
  const [company, setCompany] = useState<CompanyRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [justCreated, setJustCreated] = useState(false);
  const [createMessagesVisible, setCreateMessagesVisible] = useState(false);
  const [savingVisibilityField, setSavingVisibilityField] =
    useState<VisibilityField | null>(null);
  const [visibleStepCount, setVisibleStepCount] = useState(0);
  const [showSetupPrompt, setShowSetupPrompt] = useState(true);

  useEffect(() => {
    async function checkCompany() {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setCheckingCompany(false);
        setCompany(null);
        return;
      }

      const { data, error } = await supabase
        .from('companies')
        .select(COMPANY_SELECT)
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Company lookup error:', error.message);
      }

      const selectedCompany = (data as CompanyRow | null) ?? null;

      setCompany(selectedCompany);

      if (selectedCompany) {
        setVisibleStepCount(SETUP_STEPS.length);
        setShowSetupPrompt(false);
      }

      setCheckingCompany(false);
    }

    void checkCompany();
  }, []);

  async function handleCreateCompany(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (creating) return;

    setCreating(true);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        alert('Please sign in again.');
        return;
      }

      const formData = new FormData(event.currentTarget);
      const name = String(formData.get('name') || '').trim();
      const registrationNumber = String(
        formData.get('registration_number') || '',
      ).trim();

      if (!name || !registrationNumber) {
        alert('Company name and national registration number are required.');
        return;
      }

      const slug = `${makeSlug(name)}-${Date.now()}`;

      const { data, error } = await supabase
        .from('companies')
        .insert([
          {
            user_id: user.id,
            name,
            slug,
            registration_number: registrationNumber,
            verification_status: 'pending',
            show_public_messages: createMessagesVisible,
            show_public_about: false,
            show_public_address: false,
            show_public_status: false,
            show_public_services: false,
            show_public_projects: false,
            show_public_gallery: false,
            show_public_branches: false,
            show_public_showcase: false,
            show_public_features: false,
            show_public_articles: false,
            show_public_social_links: false,
            email: user.email || null,
            status: 'available',
          },
        ])
        .select(COMPANY_SELECT)
        .single();

      if (error) {
        alert(error.message);
        return;
      }

      setCompany(data as CompanyRow);
      setJustCreated(true);
      setVisibleStepCount(0);
      setShowSetupPrompt(true);
    } finally {
      setCreating(false);
    }
  }

  async function handleVisibilityChange(
    field: VisibilityField,
    enabled: boolean,
  ) {
    if (!company || savingVisibilityField) return;

    const previousValue = company[field];

    setSavingVisibilityField(field);
    setCompany((current) =>
      current ? { ...current, [field]: enabled } : current,
    );

    const { error } = await supabase
      .from('companies')
      .update({ [field]: enabled })
      .eq('id', company.id);

    if (error) {
      setCompany((current) =>
        current ? { ...current, [field]: previousValue } : current,
      );
      alert(error.message);
    }

    setSavingVisibilityField(null);
  }

  function showFirstOptionalSection() {
    setVisibleStepCount(1);
    setShowSetupPrompt(true);
  }

  function showNextOptionalSection() {
    setVisibleStepCount((current) =>
      Math.min(current + 1, SETUP_STEPS.length),
    );
    setShowSetupPrompt(true);
  }

  function stopOptionalSetup() {
    setShowSetupPrompt(false);
  }

  function renderVisibilityToggle(
    field: VisibilityField,
    label: string,
    description?: string,
  ) {
    if (!company) return null;

    return (
      <VisibilityToggle
        label={label}
        description={description}
        enabled={getVisibilityValue(company, field)}
        disabled={savingVisibilityField === field}
        onChange={(enabled) => void handleVisibilityChange(field, enabled)}
      />
    );
  }

  function renderPublicTools() {
    if (!company) return null;

    return (
      <section className="rounded-[22px] border border-[var(--sendio-border)] bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--sendio-muted)]">
              Public profile tools
            </p>

            <h2 className="mt-1 text-base font-black text-[var(--sendio-text)]">
              Showcase, location, branches & articles
            </h2>
          </div>

          <span className="rounded-full bg-[var(--sendio-soft)] px-3 py-1 text-[11px] font-black text-[var(--sendio-text)]">
            Optional
          </span>
        </div>

        <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-4">
          <PublicToolCard
            href="/dashboard/company/showcase"
            title="Showcase"
            description="Products, achievements, offers, and profile highlights."
            visibilityToggle={renderVisibilityToggle(
              'show_public_showcase',
              'Show Showcase in public profile',
            )}
          />

          <PublicToolCard
            href="/dashboard/company/location"
            title="Location"
            description="Address and Google Maps directions for clients."
            visibilityToggle={renderVisibilityToggle(
              'show_public_address',
              'Show Address and Map in public profile',
            )}
          />

          <PublicToolCard
            href="/dashboard/company/branches"
            title="Branches"
            description="Branches and partner company links."
            visibilityToggle={renderVisibilityToggle(
              'show_public_branches',
              'Show Branches in public profile',
            )}
          />

          <PublicToolCard
            href="/dashboard/company/articles"
            title="Articles"
            description="Company articles and public updates."
            visibilityToggle={renderVisibilityToggle(
              'show_public_articles',
              'Show Articles in public profile',
            )}
          />
        </div>
      </section>
    );
  }

  function renderStepContent(step: SetupStep) {
    switch (step.id) {
      case 'identity':
        return (
          <div className="space-y-3">
            <CompanyInfo />
            {renderVisibilityToggle(
              'show_public_address',
              'Show company details and address in public profile',
              'The company name, logo, cover, rating, and verification badge remain in their current places.',
            )}
          </div>
        );
      case 'status':
        return (
          <div className="space-y-3">
            <CompanyStatus />
            {renderVisibilityToggle(
              'show_public_status',
              'Show status and working hours in public profile',
            )}
          </div>
        );
      case 'about':
        return (
          <div className="space-y-3">
            <CompanyAbout />
            {renderVisibilityToggle(
              'show_public_about',
              'Show About in public profile',
            )}
          </div>
        );
      case 'public-tools':
        return renderPublicTools();
      case 'services':
        return (
          <div className="space-y-3">
            <CompanyServices />
            {renderVisibilityToggle(
              'show_public_services',
              'Show Services in public profile',
            )}
          </div>
        );
      case 'projects':
        return (
          <div className="space-y-3">
            <CompanyProjects />
            {renderVisibilityToggle(
              'show_public_projects',
              'Show Projects in public profile',
            )}
          </div>
        );
      case 'features':
        return (
          <div className="space-y-3">
            <CompanyFeatures />
            {renderVisibilityToggle(
              'show_public_features',
              'Show Features in public profile',
            )}
          </div>
        );
      case 'social':
        return (
          <div className="space-y-3">
            <CompanySocialLinks />
            {renderVisibilityToggle(
              'show_public_social_links',
              'Show website and social links in public profile',
            )}
          </div>
        );
      case 'gallery':
        return (
          <div className="space-y-3">
            <CompanyGallery />
            {renderVisibilityToggle(
              'show_public_gallery',
              'Show Gallery in public profile',
            )}
          </div>
        );
      default:
        return null;
    }
  }

  if (checkingCompany) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-sm font-bold text-[var(--sendio-muted)]">
          Checking company profile...
        </p>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="mx-auto max-w-4xl space-y-4">
        <section className="overflow-hidden rounded-[30px] border border-[var(--sendio-border)] bg-white shadow-sm">
          <div className="bg-[var(--sendio-soft)] px-6 py-7 md:px-8">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[var(--sendio-muted)]">
              Company setup
            </p>
            <h1 className="mt-2 text-2xl font-black tracking-tight text-[var(--sendio-text)] md:text-4xl">
              Publish your company in a few simple steps
            </h1>
            <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-[var(--sendio-muted)]">
              Only the company name and national registration number are required.
              Logo, cover, messages, and all remaining sections are optional.
            </p>
          </div>

          <form onSubmit={handleCreateCompany} className="space-y-5 p-6 md:p-8">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-xs font-black text-[var(--sendio-text)]">
                  Company name
                </span>
                <input
                  name="name"
                  type="text"
                  placeholder="Company name"
                  className="w-full rounded-2xl border border-[var(--sendio-border)] bg-white px-5 py-3.5 text-sm font-bold text-[var(--sendio-text)] outline-none transition focus:border-[var(--sendio-accent)] focus:ring-4 focus:ring-sky-100"
                  required
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-xs font-black text-[var(--sendio-text)]">
                  National company registration number
                </span>
                <input
                  name="registration_number"
                  type="text"
                  placeholder="Registration number"
                  className="w-full rounded-2xl border border-[var(--sendio-border)] bg-white px-5 py-3.5 text-sm font-bold text-[var(--sendio-text)] outline-none transition focus:border-[var(--sendio-accent)] focus:ring-4 focus:ring-sky-100"
                  required
                />
              </label>
            </div>

            <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4">
              <p className="text-sm font-black text-sky-950">
                Continue while we verify your company details.
              </p>
              <p className="mt-1 text-xs font-semibold leading-5 text-sky-800">
                The registration number stays private and is visible only to the
                company and administrators.
              </p>
            </div>

            <VisibilityToggle
              label="Show messages and service requests in public profile"
              description="Optional. The company controls this setting."
              enabled={createMessagesVisible}
              onChange={setCreateMessagesVisible}
            />

            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-2xl border border-[var(--sendio-border)] bg-white p-4">
                <p className="text-sm font-black text-[var(--sendio-text)]">
                  Logo
                </p>
                <p className="mt-1 text-xs font-semibold text-[var(--sendio-muted)]">
                  Optional — add it after publishing through the existing R2 image controls.
                </p>
              </div>

              <div className="rounded-2xl border border-[var(--sendio-border)] bg-white p-4">
                <p className="text-sm font-black text-[var(--sendio-text)]">
                  Cover
                </p>
                <p className="mt-1 text-xs font-semibold text-[var(--sendio-muted)]">
                  Optional — add it after publishing through the existing R2 image controls.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                type="submit"
                disabled={creating}
                className="rounded-full bg-[var(--sendio-accent)] px-7 py-3.5 text-sm font-black text-[var(--sendio-accent-text)] shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {creating ? 'Publishing...' : 'Publish Company Profile'}
              </button>

              <Link
                href="/"
                className="rounded-full border border-[var(--sendio-border)] bg-white px-7 py-3.5 text-sm font-black text-[var(--sendio-text)] transition hover:bg-[var(--sendio-soft-hover)]"
              >
                Back to Home
              </Link>
            </div>
          </form>
        </section>
      </div>
    );
  }

  const isVerified = company.verification_status === 'verified';
  const visibleSteps = SETUP_STEPS.slice(0, visibleStepCount);
  const allStepsVisible = visibleStepCount >= SETUP_STEPS.length;

  return (
    <div className="space-y-4">
      <CompanyHeader />

      <section className="overflow-hidden rounded-[30px] border border-[var(--sendio-border)] bg-white shadow-sm">
        <div className="bg-[var(--sendio-soft)] px-5 py-6 md:px-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[var(--sendio-muted)]">
                  Company dashboard
                </p>
                <span
                  className={`rounded-full px-3 py-1 text-[11px] font-black ${
                    isVerified
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {isVerified ? 'Verified' : 'Unverified'}
                </span>
              </div>

              <h1 className="mt-2 text-2xl font-black tracking-tight text-[var(--sendio-text)] md:text-3xl">
                {company.name}
              </h1>

              {!isVerified ? (
                <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-[var(--sendio-muted)]">
                  Continue using Sendio while we verify your company details.
                </p>
              ) : null}
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href={`/companies/${company.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full border border-[var(--sendio-border)] bg-white px-5 py-3 text-sm font-black text-[var(--sendio-text)] transition hover:bg-[var(--sendio-soft-hover)]"
              >
                Preview Profile
              </Link>
              <Link
                href="/dashboard/company/info"
                className="rounded-full bg-[var(--sendio-text)] px-5 py-3 text-sm font-black text-white transition hover:opacity-90"
              >
                Edit identity
              </Link>
            </div>
          </div>
        </div>

        <div className="p-5 md:p-7">
          {renderVisibilityToggle(
            'show_public_messages',
            'Show messages and service requests in public profile',
            'On: blue switch on the right. Off: gray switch on the left.',
          )}
        </div>
      </section>

      {justCreated ? (
        <section className="rounded-[26px] border border-emerald-200 bg-emerald-50 p-5 shadow-sm md:p-6">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-700">
            Company published
          </p>
          <h2 className="mt-2 text-xl font-black text-emerald-950">
            Congratulations! Your company profile is now public.
          </h2>
          <Link
            href={`/companies/${company.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex rounded-full bg-emerald-700 px-5 py-3 text-sm font-black text-white transition hover:opacity-90"
          >
            Preview Profile
          </Link>
        </section>
      ) : null}

      <section className="rounded-[26px] border border-[var(--sendio-border)] bg-white p-5 shadow-sm md:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--sendio-muted)]">
              First promotion
            </p>
            <h2 className="mt-2 text-xl font-black text-[var(--sendio-text)]">
              Congratulations — publish your first advertisement for free
            </h2>
          </div>

          <Link
            href="/dashboard/company/ads"
            className="shrink-0 rounded-full bg-[var(--sendio-accent)] px-6 py-3 text-sm font-black text-[var(--sendio-accent-text)] shadow-sm transition hover:opacity-90"
          >
            Publish first advertisement
          </Link>
        </div>
      </section>

      {visibleSteps.map((step, index) => {
        const isLastVisibleStep = index === visibleSteps.length - 1;

        return (
          <section key={step.id} className="space-y-4">
            <div className="rounded-[26px] border border-[var(--sendio-border)] bg-white p-5 shadow-sm md:p-6">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--sendio-muted)]">
                Optional section {index + 1} of {SETUP_STEPS.length}
              </p>
              <h2 className="mt-2 text-xl font-black text-[var(--sendio-text)]">
                {step.title}
              </h2>
              <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-[var(--sendio-muted)]">
                {step.description}
              </p>
            </div>

            {renderStepContent(step)}

            {isLastVisibleStep && showSetupPrompt ? (
              <ContinueSectionPrompt
                isFinalStep={allStepsVisible}
                onContinue={
                  allStepsVisible ? stopOptionalSetup : showNextOptionalSection
                }
                onStop={stopOptionalSetup}
              />
            ) : null}
          </section>
        );
      })}

      {visibleStepCount === 0 && showSetupPrompt ? (
        <section className="rounded-[26px] border border-[var(--sendio-border)] bg-white p-5 shadow-sm md:p-6">
          <h2 className="text-lg font-black text-[var(--sendio-text)]">
            Would you like to complete the remaining company information?
          </h2>
          <p className="mt-2 text-sm font-semibold leading-6 text-[var(--sendio-muted)]">
            Sections appear one by one. Every section also remains available in the
            left sidebar.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={showFirstOptionalSection}
              className="rounded-full bg-[var(--sendio-text)] px-6 py-3 text-sm font-black text-white transition hover:opacity-90"
            >
              Yes, continue
            </button>
            <button
              type="button"
              onClick={stopOptionalSetup}
              className="rounded-full border border-[var(--sendio-border)] bg-white px-6 py-3 text-sm font-black text-[var(--sendio-text)]"
            >
              Not now
            </button>
          </div>
        </section>
      ) : null}
    </div>
  );
}

function VisibilityToggle({
  label,
  description,
  enabled,
  disabled = false,
  onChange,
}: {
  label: string;
  description?: string;
  enabled: boolean;
  disabled?: boolean;
  onChange: (enabled: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-2xl border border-[var(--sendio-border)] bg-white p-4 shadow-sm">
      <div>
        <p className="text-sm font-black text-[var(--sendio-text)]">{label}</p>
        {description ? (
          <p className="mt-1 text-xs font-semibold leading-5 text-[var(--sendio-muted)]">
            {description}
          </p>
        ) : null}
      </div>

      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(!enabled)}
        className={`relative h-7 w-12 shrink-0 rounded-full transition ${
          enabled ? 'bg-blue-600' : 'bg-slate-300'
        } disabled:cursor-not-allowed disabled:opacity-60`}
        aria-pressed={enabled}
        aria-label={label}
      >
        <span
          className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition ${
            enabled ? 'left-6' : 'left-1'
          }`}
        />
      </button>
    </div>
  );
}

function PublicToolCard({
  href,
  title,
  description,
  visibilityToggle,
}: {
  href: string;
  title: string;
  description: string;
  visibilityToggle: ReactNode;
}) {
  return (
    <article className="space-y-3 rounded-2xl border border-[var(--sendio-border)] bg-[var(--sendio-soft)] p-3 text-[var(--sendio-text)]">
      <Link
        href={href}
        className="group block text-[var(--sendio-text)] transition hover:opacity-90"
      >
        <p className="text-xs font-black">{title}</p>
        <p className="mt-1 text-[11px] font-semibold leading-5 text-[var(--sendio-muted)]">
          {description}
        </p>
        <span className="mt-3 inline-flex rounded-full bg-white px-3 py-1 text-[11px] font-black">
          Open
        </span>
      </Link>
      {visibilityToggle}
    </article>
  );
}

function ContinueSectionPrompt({
  isFinalStep,
  onContinue,
  onStop,
}: {
  isFinalStep: boolean;
  onContinue: () => void;
  onStop: () => void;
}) {
  return (
    <div className="rounded-[22px] border border-[var(--sendio-border)] bg-white p-4 shadow-sm">
      <p className="text-sm font-black text-[var(--sendio-text)]">
        {isFinalStep
          ? 'You have reached the final optional section.'
          : 'Would you like to continue and add the next section?'}
      </p>
      <div className="mt-3 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onContinue}
          className="rounded-full bg-[var(--sendio-accent)] px-5 py-2.5 text-xs font-black text-[var(--sendio-accent-text)]"
        >
          {isFinalStep ? 'Finish optional setup' : 'Yes, show next section'}
        </button>
        {!isFinalStep ? (
          <button
            type="button"
            onClick={onStop}
            className="rounded-full border border-[var(--sendio-border)] bg-white px-5 py-2.5 text-xs font-black text-[var(--sendio-text)]"
          >
            Not now
          </button>
        ) : null}
      </div>
    </div>
  );
}
