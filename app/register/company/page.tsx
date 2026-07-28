'use client';

import {
  type ClipboardEvent,
  type KeyboardEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useRouter } from 'next/navigation';

import { supabase } from '@/lib/supabase';

type EntityKind = 'enterprise' | 'establishment' | 'branch';
type PhoneKind = 'mobile' | 'landline' | 'unknown';

type CompanyActivity = {
  group: string;
  version: string;
  code: string;
  classification: string;
  label: string;
};

type CompanyAddress = {
  street: string;
  houseNumber: string;
  box: string;
  extraInfo: string;
  postalCode: string;
  city: string;
};

type CompanyEntity = {
  id: string;
  kind: EntityKind;
  number: string;
  name: string;
  address: CompanyAddress;
  activities: CompanyActivity[];
};

type CompanyContact = {
  id: string;
  type: 'email' | 'phone' | 'website';
  maskedValue: string;
  selectable: boolean;
  phoneKind: PhoneKind | null;
  sourceEntityNumber: string;
  sourceEntityName: string;
  sourceKind: EntityKind;
};

type PreviewResponse = {
  ok: boolean;
  previewOnly?: boolean;
  message?: string;
  company?: {
    number: string;
    statusCode: string;
    name: string;
    entities: CompanyEntity[];
    contacts: CompanyContact[];
  };
};

type LookupState = 'idle' | 'checking' | 'ready' | 'error';
type OtpState =
  | 'idle'
  | 'sending'
  | 'sent'
  | 'verifying'
  | 'verified'
  | 'error';

type SendOtpResponse = {
  ok: boolean;
  challengeId?: string;
  expiresInSeconds?: number;
  maskedDestination?: string;
  message?: string;
};

type VerifyOtpResponse = {
  ok: boolean;
  verified?: boolean;
  accountCreated?: boolean;
  message?: string;
  session?: {
    accessToken: string;
    refreshToken: string;
  } | null;
};

const EMPTY_OTP_DIGITS = ['', '', '', '', '', ''];

function normalizeNumber(value: string) {
  return value.replace(/\D/g, '').slice(0, 10);
}

function formatNumber(value: string) {
  const digits = normalizeNumber(value);

  if (digits.length <= 4) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 4)}.${digits.slice(4)}`;

  return `${digits.slice(0, 4)}.${digits.slice(4, 7)}.${digits.slice(7)}`;
}

function entityKindLabel(kind: EntityKind) {
  if (kind === 'enterprise') return 'Main company';
  if (kind === 'establishment') return 'Establishment';

  return 'Branch';
}

function formatAddress(address: CompanyAddress) {
  const firstLine = [
    address.street,
    address.houseNumber,
    address.box ? `box ${address.box}` : '',
  ]
    .filter(Boolean)
    .join(' ');
  const secondLine = [address.postalCode, address.city]
    .filter(Boolean)
    .join(' ');

  return [firstLine, address.extraInfo, secondLine].filter(Boolean);
}

function contactTitle(contact: CompanyContact) {
  if (contact.type === 'email') return 'Official email';
  if (contact.type === 'website') return 'Official website';
  if (contact.phoneKind === 'mobile') return 'Official mobile';
  if (contact.phoneKind === 'landline') return 'Official landline';

  return 'Official phone';
}

export default function CompanyRegistrationPage() {
  const router = useRouter();
  const [companyNumber, setCompanyNumber] = useState('');
  const [lookupState, setLookupState] = useState<LookupState>('idle');
  const [message, setMessage] = useState('');
  const [company, setCompany] = useState<PreviewResponse['company']>();
  const [selectedEntityId, setSelectedEntityId] = useState('');
  const [selectedContactId, setSelectedContactId] = useState('');
  const [revealedSections, setRevealedSections] = useState(0);
  const [otpState, setOtpState] = useState<OtpState>('idle');
  const [otpMessage, setOtpMessage] = useState('');
  const [otpChallengeId, setOtpChallengeId] = useState('');
  const [otpDigits, setOtpDigits] = useState<string[]>(EMPTY_OTP_DIGITS);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const otpInputRefs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    if (companyNumber.length !== 10) return;

    const controller = new AbortController();
    const revealTimers: number[] = [];
    const timer = window.setTimeout(async () => {
      setLookupState('checking');
      setMessage('Please wait while we verify the official BCE data…');
      setCompany(undefined);
      setSelectedEntityId('');
      setSelectedContactId('');
      setRevealedSections(0);

      try {
        const response = await fetch(
          `/api/bce/company-preview?number=${encodeURIComponent(companyNumber)}`,
          {
            cache: 'no-store',
            signal: controller.signal,
          },
        );
        const payload = (await response.json()) as PreviewResponse;

        if (!response.ok || !payload.ok || !payload.company) {
          throw new Error(payload.message || 'The company could not be loaded.');
        }

        setCompany(payload.company);
        setSelectedEntityId(payload.company.entities[0]?.id ?? '');
        setLookupState('ready');
        setMessage('Official BCE data found.');

        [1, 2, 3, 4].forEach((section, index) => {
          revealTimers.push(
            window.setTimeout(
              () => setRevealedSections(section),
              120 + index * 150,
            ),
          );
        });
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return;
        }

        setLookupState('error');
        setMessage(
          error instanceof Error
            ? error.message
            : 'The company could not be loaded.',
        );
      }
    }, 450);

    return () => {
      window.clearTimeout(timer);
      revealTimers.forEach((revealTimer) =>
        window.clearTimeout(revealTimer),
      );
      controller.abort();
    };
  }, [companyNumber]);

  function resetOtpFlow() {
    setOtpState('idle');
    setOtpMessage('');
    setOtpChallengeId('');
    setOtpDigits([...EMPTY_OTP_DIGITS]);
    setPassword('');
    setConfirmPassword('');
  }

  function handleCompanyNumberChange(value: string) {
    setCompanyNumber(normalizeNumber(value));
    setLookupState('idle');
    setMessage('');
    setCompany(undefined);
    setSelectedEntityId('');
    setSelectedContactId('');
    setRevealedSections(0);
    resetOtpFlow();
  }

  const selectedEntity = useMemo(() => {
    return company?.entities.find((entity) => entity.id === selectedEntityId);
  }, [company, selectedEntityId]);

  const selectedEntityContacts = useMemo(() => {
    if (!selectedEntity) return [];

    return (company?.contacts ?? []).filter(
      (contact) => contact.sourceEntityNumber === selectedEntity.number,
    );
  }, [company, selectedEntity]);

  const selectableContacts = useMemo(() => {
    return selectedEntityContacts.filter((contact) => contact.selectable);
  }, [selectedEntityContacts]);

  const selectedContact = useMemo(() => {
    return selectedEntityContacts.find(
      (contact) => contact.id === selectedContactId,
    );
  }, [selectedContactId, selectedEntityContacts]);

  const hasSelectableContactOnAnotherEntity = useMemo(() => {
    if (!company || !selectedEntity) return false;

    return company.contacts.some(
      (contact) =>
        contact.sourceEntityNumber !== selectedEntity.number &&
        contact.selectable,
    );
  }, [company, selectedEntity]);

  async function handleSendOtp() {
    if (!company || !selectedEntity || !selectedContact) return;

    setOtpState('sending');
    setOtpMessage('Sending the 6-digit verification code…');
    setOtpChallengeId('');
    setOtpDigits([...EMPTY_OTP_DIGITS]);

    try {
      const response = await fetch('/api/bce/company-otp/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
        body: JSON.stringify({
          companyNumber: company.number,
          entityNumber: selectedEntity.number,
          contactId: selectedContact.id,
        }),
      });
      const payload = (await response.json()) as SendOtpResponse;

      if (!response.ok || !payload.ok || !payload.challengeId) {
        throw new Error(payload.message || 'The verification code could not be sent.');
      }

      setOtpChallengeId(payload.challengeId);
      setOtpState('sent');
      setOtpMessage(
        payload.message ||
          'A 6-digit verification code was sent to the official email address.',
      );
      window.requestAnimationFrame(() => otpInputRefs.current[0]?.focus());
    } catch (error) {
      setOtpState('error');
      setOtpMessage(
        error instanceof Error
          ? error.message
          : 'The verification code could not be sent.',
      );
    }
  }

  function handleOtpDigitChange(index: number, value: string) {
    const digit = value.replace(/\D/g, '').slice(-1);
    const nextDigits = [...otpDigits];
    nextDigits[index] = digit;
    setOtpDigits(nextDigits);

    if (digit && index < nextDigits.length - 1) {
      otpInputRefs.current[index + 1]?.focus();
    }
  }

  function handleOtpKeyDown(
    index: number,
    event: KeyboardEvent<HTMLInputElement>,
  ) {
    if (event.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  }

  function handleOtpPaste(event: ClipboardEvent<HTMLInputElement>) {
    const pasted = event.clipboardData
      .getData('text')
      .replace(/\D/g, '')
      .slice(0, 6);

    if (!pasted) return;

    event.preventDefault();
    const nextDigits = [...EMPTY_OTP_DIGITS];

    pasted.split('').forEach((digit, index) => {
      nextDigits[index] = digit;
    });

    setOtpDigits(nextDigits);
    otpInputRefs.current[Math.min(pasted.length, 6) - 1]?.focus();
  }

  async function handleVerifyOtp() {
    const code = otpDigits.join('');

    if (!otpChallengeId || code.length !== 6) return;

    if (password.length < 8) {
      setOtpState('error');
      setOtpMessage('Use a password with at least 8 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setOtpState('error');
      setOtpMessage('The two password fields do not match.');
      return;
    }

    setOtpState('verifying');
    setOtpMessage('Checking the 6-digit code…');

    try {
      const response = await fetch('/api/bce/company-otp/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
        body: JSON.stringify({
          challengeId: otpChallengeId,
          code,
          password,
          confirmPassword,
        }),
      });
      const payload = (await response.json()) as VerifyOtpResponse;

      if (!response.ok || !payload.ok || !payload.verified) {
        throw new Error(payload.message || 'The verification code is incorrect.');
      }

      if (payload.session) {
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: payload.session.accessToken,
          refresh_token: payload.session.refreshToken,
        });

        if (sessionError) {
          throw new Error(
            'The account was created, but the automatic sign-in failed. Open the login page and use the official email with your new password.',
          );
        }

        setOtpState('verified');
        setOtpMessage(
          payload.message || 'Your verified company account was created successfully.',
        );
        router.replace('/dashboard/company');
        return;
      }

      setOtpState('verified');
      setOtpMessage(
        payload.message ||
          'Your verified company account was created. Sign in with the official email and your new password.',
      );
    } catch (error) {
      setOtpState('error');
      setOtpMessage(
        error instanceof Error
          ? error.message
          : 'The verification code could not be checked.',
      );
    }
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#eaf7ff_0%,#ffffff_48%,#f5f1ff_100%)] px-4 py-8 text-slate-950">
      <div className="mx-auto w-full max-w-[560px]">
        <button
          type="button"
          onClick={() => router.push('/')}
          className="mb-6 rounded-full border border-sky-100 bg-white/90 px-4 py-2 text-xs font-black text-slate-700 shadow-sm transition hover:bg-white"
        >
          ← Back to Sendio
        </button>

        <section className="overflow-hidden rounded-[30px] border border-white bg-white/90 shadow-[0_28px_80px_rgba(32,88,120,0.16)] backdrop-blur-xl">
          <div className="bg-[linear-gradient(135deg,#dff4ff_0%,#f1ebff_100%)] px-5 py-6 sm:px-7">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-sky-700">
              Official company verification
            </p>
            <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-950">
              Register your company
            </h1>
            <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
              Enter the Belgian BCE number, choose the correct company entity, and verify access to its official email. BCE contact details remain private.
            </p>
          </div>

          <div className="space-y-4 p-5 sm:p-7">
            <label className="block">
              <span className="mb-2 block text-xs font-black text-slate-700">
                BCE / KBO number
              </span>
              <div className="relative">
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  value={formatNumber(companyNumber)}
                  onChange={(event) =>
                    handleCompanyNumberChange(event.target.value)
                  }
                  placeholder="0200.065.765"
                  maxLength={12}
                  className="h-12 w-full rounded-2xl border border-sky-100 bg-white px-4 pr-12 text-base font-black tracking-wide text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                />

                {lookupState === 'checking' ? (
                  <span className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 animate-spin rounded-full border-2 border-sky-100 border-t-sky-600" />
                ) : null}
              </div>
            </label>

            {message ? (
              <div
                className={`rounded-2xl border px-4 py-3 text-xs font-bold leading-5 ${
                  lookupState === 'error'
                    ? 'border-red-200 bg-red-50 text-red-700'
                    : lookupState === 'ready'
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                      : 'border-sky-100 bg-sky-50 text-sky-700'
                }`}
              >
                {message}
              </div>
            ) : null}

            {company && revealedSections >= 1 ? (
              <section className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                  Company or branch
                </p>
                <div className="mt-3 grid gap-2">
                  {company.entities.map((entity) => {
                    const selected = entity.id === selectedEntityId;

                    return (
                      <button
                        key={entity.id}
                        type="button"
                        onClick={() => {
                          setSelectedEntityId(entity.id);
                          setSelectedContactId('');
                          resetOtpFlow();
                        }}
                        className={`rounded-2xl border px-4 py-3 text-left transition ${
                          selected
                            ? 'border-sky-400 bg-sky-50 shadow-sm'
                            : 'border-white bg-white hover:border-sky-200'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-sky-700">
                              {entityKindLabel(entity.kind)}
                            </p>
                            <p className="mt-1 text-sm font-black text-slate-950">
                              {entity.name}
                            </p>
                            <p className="mt-1 text-[11px] font-semibold text-slate-500">
                              {formatNumber(entity.number)}
                            </p>
                          </div>
                          <span
                            className={`mt-1 flex h-5 w-5 items-center justify-center rounded-full border text-[10px] font-black ${
                              selected
                                ? 'border-sky-500 bg-sky-500 text-white'
                                : 'border-slate-200 bg-white text-transparent'
                            }`}
                          >
                            ✓
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>
            ) : null}

            {selectedEntity && revealedSections >= 2 ? (
              <section className="rounded-2xl border border-violet-100 bg-violet-50/70 p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-violet-700">
                  Official identity
                </p>
                <h2 className="mt-2 text-xl font-black tracking-tight text-slate-950">
                  {selectedEntity.name}
                </h2>

                {selectedEntity.activities.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {selectedEntity.activities.map((activity) => (
                      <span
                        key={`${activity.version}-${activity.code}`}
                        className="rounded-full border border-violet-100 bg-white px-3 py-1.5 text-[11px] font-bold text-violet-800"
                      >
                        {activity.label}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 text-xs font-semibold text-slate-500">
                    No official activity label was selected for this entity.
                  </p>
                )}
              </section>
            ) : null}

            {selectedEntity && revealedSections >= 3 ? (
              <section className="rounded-2xl border border-amber-100 bg-amber-50/70 p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-700">
                  Official address
                </p>
                <div className="mt-2 space-y-1 text-sm font-bold text-slate-800">
                  {formatAddress(selectedEntity.address).map((line) => (
                    <p key={line}>{line}</p>
                  ))}
                </div>
                <p className="mt-3 text-[11px] font-semibold leading-5 text-amber-800">
                  The BCE address remains the official reference. The company can
                  later add an office, floor, or public access details.
                </p>
              </section>
            ) : null}

            {company && revealedSections >= 4 ? (
              <section className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-700">
                  Choose the official verification method
                </p>

                <div className="mt-3 space-y-2">
                  {selectedEntityContacts.map((contact) => {
                    const selected = contact.id === selectedContactId;

                    return (
                      <label
                        key={contact.id}
                        className={`flex items-start gap-3 rounded-2xl border px-4 py-3 ${
                          contact.selectable
                            ? 'cursor-pointer border-white bg-white transition hover:border-emerald-200'
                            : 'border-slate-100 bg-slate-50 opacity-75'
                        }`}
                      >
                        <input
                          type="radio"
                          name="verification-contact"
                          value={contact.id}
                          checked={selected}
                          disabled={!contact.selectable}
                          onChange={() => {
                            setSelectedContactId(contact.id);
                            resetOtpFlow();
                          }}
                          className="mt-1 h-4 w-4 accent-emerald-600"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-xs font-black text-slate-900">
                              {contactTitle(contact)}
                            </p>
                            {!contact.selectable ? (
                              <span className="rounded-full bg-slate-200 px-2 py-1 text-[9px] font-black text-slate-600">
                                {contact.type === 'phone'
                                  ? 'SMS unavailable'
                                  : 'Alternative method'}
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-1 break-all text-sm font-black tracking-wide text-emerald-800">
                            {contact.maskedValue}
                          </p>
                          <p className="mt-1 text-[10px] font-semibold text-slate-500">
                            From {entityKindLabel(contact.sourceKind).toLowerCase()}:{' '}
                            {contact.sourceEntityName}
                          </p>
                        </div>
                      </label>
                    );
                  })}
                </div>

                {selectedEntityContacts.length === 0 ? (
                  <p className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-3 text-xs font-bold leading-5 text-amber-800">
                    {hasSelectableContactOnAnotherEntity
                      ? 'No direct official email or SMS-capable mobile number is registered for this entity. Select the relevant establishment or branch to continue.'
                      : 'No official electronic contact was found for this entity. Website, postal, or manual verification will be offered in the next stage.'}
                  </p>
                ) : null}

                {
                  selectedEntityContacts.length > 0 &&
                  selectableContacts.length === 0 ? (
                    <p className="mt-3 text-xs font-bold leading-5 text-slate-600">
                      This entity has no email or SMS-capable mobile number.
                      Landline numbers are displayed but cannot receive an SMS
                      code.
                    </p>
                  ) : null
                }

                {selectedContact?.type === 'email' ? (
                  <div className="mt-4 rounded-2xl border border-sky-100 bg-sky-50 p-4">
                    <p className="text-xs font-black text-sky-900">
                      Official 6-digit verification
                    </p>
                    <p className="mt-1 text-[11px] font-semibold leading-5 text-sky-800">
                      The code is sent to the official BCE email. After the code is accepted, Sendio creates the verified company account and signs you in.
                    </p>

                    {otpState === 'idle' ||
                    otpState === 'sending' ||
                    (otpState === 'error' && !otpChallengeId) ? (
                      <button
                        type="button"
                        onClick={handleSendOtp}
                        disabled={otpState === 'sending'}
                        className="mt-3 h-11 w-full rounded-2xl bg-sky-600 px-4 text-xs font-black text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {otpState === 'sending'
                          ? 'Sending code…'
                          : 'Send 6-digit verification code'}
                      </button>
                    ) : null}

                    {otpChallengeId && otpState !== 'verified' ? (
                      <div className="mt-4">
                        <div className="grid grid-cols-6 gap-2">
                          {otpDigits.map((digit, index) => (
                            <input
                              key={index}
                              ref={(element) => {
                                otpInputRefs.current[index] = element;
                              }}
                              type="text"
                              inputMode="numeric"
                              autoComplete={index === 0 ? 'one-time-code' : 'off'}
                              value={digit}
                              maxLength={1}
                              aria-label={`Verification digit ${index + 1}`}
                              onChange={(event) =>
                                handleOtpDigitChange(index, event.target.value)
                              }
                              onKeyDown={(event) =>
                                handleOtpKeyDown(index, event)
                              }
                              onPaste={handleOtpPaste}
                              className="h-12 min-w-0 rounded-xl border border-sky-200 bg-white text-center text-lg font-black text-slate-950 outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
                            />
                          ))}
                        </div>

                        <div className="mt-4 grid gap-3">
                          <label className="block">
                            <span className="mb-1.5 block text-[11px] font-black text-slate-700">
                              Create password
                            </span>
                            <input
                              type="password"
                              autoComplete="new-password"
                              value={password}
                              onChange={(event) => {
                                setPassword(event.target.value);
                                if (otpState === 'error') setOtpState('sent');
                              }}
                              placeholder="At least 8 characters"
                              className="h-11 w-full rounded-xl border border-sky-200 bg-white px-3 text-sm font-bold text-slate-950 outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
                            />
                          </label>

                          <label className="block">
                            <span className="mb-1.5 block text-[11px] font-black text-slate-700">
                              Confirm password
                            </span>
                            <input
                              type="password"
                              autoComplete="new-password"
                              value={confirmPassword}
                              onChange={(event) => {
                                setConfirmPassword(event.target.value);
                                if (otpState === 'error') setOtpState('sent');
                              }}
                              placeholder="Repeat the password"
                              className="h-11 w-full rounded-xl border border-sky-200 bg-white px-3 text-sm font-bold text-slate-950 outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
                            />
                          </label>
                        </div>

                        <button
                          type="button"
                          onClick={handleVerifyOtp}
                          disabled={
                            otpState === 'verifying' ||
                            otpDigits.some((digit) => !digit) ||
                            password.length < 8 ||
                            password !== confirmPassword
                          }
                          className="mt-3 h-11 w-full rounded-2xl bg-emerald-600 px-4 text-xs font-black text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {otpState === 'verifying'
                            ? 'Creating verified account…'
                            : 'Verify and create company account'}
                        </button>

                        <button
                          type="button"
                          onClick={handleSendOtp}
                          disabled={
                            otpState === 'sending' || otpState === 'verifying'
                          }
                          className="mt-2 w-full py-2 text-[11px] font-black text-sky-700 disabled:opacity-50"
                        >
                          Send a new code
                        </button>
                      </div>
                    ) : null}

                    {otpMessage ? (
                      <div
                        className={`mt-3 rounded-xl border px-3 py-3 text-[11px] font-bold leading-5 ${
                          otpState === 'verified'
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                            : otpState === 'error'
                              ? 'border-red-200 bg-red-50 text-red-700'
                              : 'border-sky-200 bg-white text-sky-800'
                        }`}
                      >
                        {otpMessage}
                      </div>
                    ) : null}
                  </div>
                ) : selectedContact?.type === 'phone' ? (
                  <p className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-3 text-xs font-bold leading-5 text-amber-800">
                    SMS verification is not enabled yet. Choose the official email address.
                  </p>
                ) : null}
              </section>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}
