import fs from "node:fs";

const registerPath = "app/register/page.tsx";
const callbackPath = "app/auth/callback/page.tsx";

function replaceOnce(source, search, replacement, label) {
  const firstIndex = source.indexOf(search);

  if (firstIndex === -1) {
    throw new Error(`Missing patch anchor: ${label}`);
  }

  if (source.indexOf(search, firstIndex + search.length) !== -1) {
    throw new Error(`Duplicate patch anchor: ${label}`);
  }

  return source.slice(0, firstIndex) + replacement + source.slice(firstIndex + search.length);
}

function applyEol(source, value) {
  const eol = source.includes("\r\n") ? "\r\n" : "\n";
  return value.replace(/\n/g, eol);
}

let registerSource = fs.readFileSync(registerPath, "utf8");
let callbackSource = fs.readFileSync(callbackPath, "utf8");

registerSource = replaceOnce(
  registerSource,
  applyEol(registerSource, `type StoredPendingConfirmation = {
  email: string;
  deadline: number;
};

const CONFIRMATION_WAIT_SECONDS`),
  applyEol(registerSource, `type StoredPendingConfirmation = {
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

const CONFIRMATION_WAIT_SECONDS`),
  "register BCE types",
);

registerSource = replaceOnce(
  registerSource,
  applyEol(registerSource, `const PENDING_CONFIRMATION_STORAGE_KEY = 'sendio_pending_email_confirmation';`),
  applyEol(registerSource, `const PENDING_CONFIRMATION_STORAGE_KEY = 'sendio_pending_email_confirmation';
const PENDING_COMPANY_NUMBER_STORAGE_KEY = 'sendio_pending_company_number';`),
  "register company storage key",
);

registerSource = replaceOnce(
  registerSource,
  applyEol(registerSource, `function clearPendingConfirmation() {
  if (typeof window === 'undefined') return;

  window.sessionStorage.removeItem(PENDING_CONFIRMATION_STORAGE_KEY);
}

function getResendErrorMessage`),
  applyEol(registerSource, `function clearPendingConfirmation() {
  if (typeof window === 'undefined') return;

  window.sessionStorage.removeItem(PENDING_CONFIRMATION_STORAGE_KEY);
}

function normalizeCompanyNumberInput(value: string) {
  return value.replace(/\\D/g, '').slice(0, 10);
}

function formatCompanyNumber(value: string) {
  const digits = normalizeCompanyNumberInput(value);

  if (digits.length <= 4) return digits;
  if (digits.length <= 7) return \`\${digits.slice(0, 4)}.\${digits.slice(4)}\`;

  return \`\${digits.slice(0, 4)}.\${digits.slice(4, 7)}.\${digits.slice(7)}\`;
}

function savePendingCompanyNumber(value: string | null) {
  if (typeof window === 'undefined') return;

  if (value) {
    window.localStorage.setItem(PENDING_COMPANY_NUMBER_STORAGE_KEY, value);
    return;
  }

  window.localStorage.removeItem(PENDING_COMPANY_NUMBER_STORAGE_KEY);
}

function getResendErrorMessage`),
  "register company helpers",
);

registerSource = replaceOnce(
  registerSource,
  applyEol(registerSource, `  const [resendFeedback, setResendFeedback] = useState<ResendFeedback | null>(
    null,
  );

  const selectedAccount = useMemo(() => {`),
  applyEol(registerSource, `  const [resendFeedback, setResendFeedback] = useState<ResendFeedback | null>(
    null,
  );
  const [companyNumber, setCompanyNumber] = useState('');
  const [companyLookupState, setCompanyLookupState] =
    useState<CompanyLookupState>('idle');
  const [verifiedCompany, setVerifiedCompany] = useState<BceCompany | null>(null);
  const [companyLookupMessage, setCompanyLookupMessage] = useState('');

  const selectedAccount = useMemo(() => {`),
  "register company state",
);

registerSource = replaceOnce(
  registerSource,
  applyEol(registerSource, `  const selectedAccount = useMemo(() => {
    return accountOptions.find((option) => option.value === userType) ?? null;
  }, [userType]);

  function startConfirmationWait(`),
  applyEol(registerSource, `  const selectedAccount = useMemo(() => {
    return accountOptions.find((option) => option.value === userType) ?? null;
  }, [userType]);

  const registrationUnlocked =
    userType !== 'company' || companyLookupState === 'verified';

  useEffect(() => {
    if (userType !== 'company' || companyNumber.length !== 10) return;

    const controller = new AbortController();

    const lookupTimer = window.setTimeout(async () => {
      setCompanyLookupState('checking');
      setVerifiedCompany(null);
      setCompanyLookupMessage('Checking the official BCE register...');

      try {
        const response = await fetch(
          \`/api/bce/company?number=\${encodeURIComponent(companyNumber)}\`,
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

  function startConfirmationWait(`),
  "register lookup effect",
);

registerSource = replaceOnce(
  registerSource,
  applyEol(registerSource, `  function requireAccountType() {
    if (userType) return true;

    setNotice({
      type: 'error',
      title: 'Please choose an account type first.',
      body: 'Select Client, Worker, or Company before creating your account.',
    });

    return false;
  }

  async function handleGoogleRegister()`),
  applyEol(registerSource, `  function requireAccountType() {
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
    setUserType(value);
    setNotice(null);

    if (value !== 'company') {
      resetCompanyVerification();
    }
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

  async function handleGoogleRegister()`),
  "register company handlers",
);

for (const marker of [
  `    if (!selectedType) return;

    setGoogleLoading(true);`,
  `  if (!selectedType) return;

  setFacebookLoading(true);`,
  `  if (!selectedType) return;

  setLinkedinLoading(true);`,
]) {
  const loadingLine = marker.split("\n").at(-1);
  registerSource = replaceOnce(
    registerSource,
    applyEol(registerSource, marker),
    applyEol(
      registerSource,
      marker.replace(
        loadingLine,
        `  if (!prepareCompanyRegistration(selectedType)) return;

${loadingLine}`,
      ),
    ),
    `OAuth verification guard: ${loadingLine}`,
  );
}

registerSource = replaceOnce(
  registerSource,
  applyEol(registerSource, `    if (!selectedType) {
      setLoading(false);
      return;
    }

    const formData = new FormData(e.currentTarget);`),
  applyEol(registerSource, `    if (!selectedType) {
      setLoading(false);
      return;
    }

    if (!prepareCompanyRegistration(selectedType)) {
      setLoading(false);
      return;
    }

    const formData = new FormData(e.currentTarget);`),
  "email registration verification guard",
);

registerSource = replaceOnce(
  registerSource,
  applyEol(registerSource, `        data: {
          full_name: fullName,
          user_type: selectedType,
        },`),
  applyEol(registerSource, `        data: {
          full_name: fullName,
          user_type: selectedType,
          enterprise_number:
            selectedType === 'company' ? verifiedCompany?.number : undefined,
        },`),
  "email metadata enterprise number",
);

registerSource = replaceOnce(
  registerSource,
  applyEol(registerSource, `                    onClick={() => {
                      setUserType(option.value);
                      setNotice(null);
                    }}`),
  applyEol(registerSource, `                    onClick={() => handleAccountTypeSelection(option.value)}`),
  "account type button",
);

registerSource = replaceOnce(
  registerSource,
  applyEol(registerSource, `            <form onSubmit={handleRegister} className="space-y-2">`),
  applyEol(registerSource, `            {userType === 'company' ? (
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
                        ? \` · \${verifiedCompany.legal_form_fr}\`
                        : ''}
                    </p>
                    <p className="mt-1 text-[11px] font-semibold text-slate-500">
                      {[
                        verifiedCompany.street_fr,
                        verifiedCompany.house_number,
                        verifiedCompany.box
                          ? \`box \${verifiedCompany.box}\`
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
                <form onSubmit={handleRegister} className="space-y-2">`),
  "company verification UI start",
);

registerSource = replaceOnce(
  registerSource,
  applyEol(registerSource, `            <p className="mt-2 text-center text-xs font-semibold text-slate-500">
              Already have an account?{' '}`),
  applyEol(registerSource, `              </>
            ) : (
              <p className="mb-2 rounded-xl border border-violet-100 bg-violet-50 px-3 py-2 text-center text-xs font-bold text-violet-700">
                Enter a valid active Belgian enterprise number to unlock registration.
              </p>
            )}

            <p className="mt-2 text-center text-xs font-semibold text-slate-500">
              Already have an account?{' '}`),
  "company verification UI end",
);

callbackSource = replaceOnce(
  callbackSource,
  applyEol(callbackSource, `    name?: unknown;
  };
};`),
  applyEol(callbackSource, `    name?: unknown;
    enterprise_number?: unknown;
  };
};`),
  "callback enterprise metadata type",
);

callbackSource = replaceOnce(
  callbackSource,
  applyEol(callbackSource, `const PENDING_CONFIRMATION_STORAGE_KEY =
  'sendio_pending_email_confirmation';`),
  applyEol(callbackSource, `const PENDING_CONFIRMATION_STORAGE_KEY =
  'sendio_pending_email_confirmation';
const PENDING_COMPANY_NUMBER_STORAGE_KEY = 'sendio_pending_company_number';

type BceCompany = {
  number: string;
  name: string;
  status_code: string;
};

type BceLookupResponse = {
  ok: boolean;
  message?: string;
  company?: BceCompany;
};`),
  "callback BCE types",
);

callbackSource = replaceOnce(
  callbackSource,
  applyEol(callbackSource, `function clearPendingAuthData() {
  if (typeof window === 'undefined') return;

  window.localStorage.removeItem('sendio_pending_user_type');
  window.localStorage.removeItem('sendio_pending_auth_provider');
  window.sessionStorage.removeItem(PENDING_CONFIRMATION_STORAGE_KEY);
}`),
  applyEol(callbackSource, `function getPendingCompanyNumber() {
  if (typeof window === 'undefined') return '';

  return (
    window.localStorage.getItem(PENDING_COMPANY_NUMBER_STORAGE_KEY) ?? ''
  )
    .replace(/\\D/g, '')
    .slice(0, 10);
}

function clearPendingAuthData() {
  if (typeof window === 'undefined') return;

  window.localStorage.removeItem('sendio_pending_user_type');
  window.localStorage.removeItem('sendio_pending_auth_provider');
  window.localStorage.removeItem(PENDING_COMPANY_NUMBER_STORAGE_KEY);
  window.sessionStorage.removeItem(PENDING_CONFIRMATION_STORAGE_KEY);
}`),
  "callback pending company number",
);

callbackSource = replaceOnce(
  callbackSource,
  /async function ensureCompanyProfile[\s\S]*?\r?\n}\r?\n\r?\nexport default function/.exec(callbackSource)?.[0] ?? "",
  applyEol(callbackSource, `async function lookupBceCompany(enterpriseNumber: string) {
  const response = await fetch(
    \`/api/bce/company?number=\${encodeURIComponent(enterpriseNumber)}\`,
    {
      cache: 'no-store',
    },
  );

  const payload = (await response.json()) as BceLookupResponse;

  if (!response.ok || !payload.ok || !payload.company) {
    throw new Error(
      payload.message || 'The company could not be verified in the BCE register.',
    );
  }

  if (payload.company.status_code !== 'AC') {
    throw new Error('The company is not active in the BCE register.');
  }

  return payload.company;
}

async function ensureCompanyProfile(
  user: CallbackUser,
  pendingCompanyNumber: string,
) {
  const { data: existingCompany, error: lookupError } = await supabase
    .from('companies')
    .select('id')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle();

  if (lookupError) {
    return lookupError.message;
  }

  if (existingCompany) {
    return null;
  }

  const metadataCompanyNumber = getMetadataText(
    user.user_metadata?.enterprise_number,
  ).replace(/\\D/g, '');

  const enterpriseNumber = (
    metadataCompanyNumber || pendingCompanyNumber
  ).slice(0, 10);

  if (enterpriseNumber.length !== 10) {
    return 'A verified Belgian enterprise number is required.';
  }

  let bceCompany: BceCompany;

  try {
    bceCompany = await lookupBceCompany(enterpriseNumber);
  } catch (error) {
    return error instanceof Error
      ? error.message
      : 'The BCE verification could not be completed.';
  }

  const { error: insertError } = await supabase.from('companies').insert({
    user_id: user.id,
    name: bceCompany.name || getCompanyName(user),
    email: user.email ?? null,
    registration_number: bceCompany.number,
    verification_status: 'verified',
    status: 'available',
    views: 0,
    connections: 0,
    rating: 0,
    reviews_count: 0,
  });

  return insertError?.message ?? null;
}

export default function`),
  "callback company profile function",
);

callbackSource = replaceOnce(
  callbackSource,
  applyEol(callbackSource, `      if (userType === 'company') {
        const companyProfileError = await ensureCompanyProfile(user);

        if (companyProfileError) {
          console.error(
            'Company profile setup error:',
            companyProfileError,
          );

          window.sessionStorage.setItem(
            'sendio_company_profile_setup_error',
            companyProfileError,
          );
        }
      }

      clearPendingAuthData();
      router.replace(getRedirectPath(userType));`),
  applyEol(callbackSource, `      if (userType === 'company') {
        const companyProfileError = await ensureCompanyProfile(
          user,
          getPendingCompanyNumber(),
        );

        if (companyProfileError) {
          console.error(
            'Company profile setup error:',
            companyProfileError,
          );

          window.sessionStorage.setItem(
            'sendio_company_profile_setup_error',
            companyProfileError,
          );

          await supabase.auth.signOut();
          clearPendingAuthData();
          router.replace('/register?type=company');
          return;
        }
      }

      clearPendingAuthData();
      router.replace(getRedirectPath(userType));`),
  "callback fail closed",
);

callbackSource = replaceOnce(
  callbackSource,
  applyEol(callbackSource, `                full_name:
                  user.user_metadata?.full_name ??
                  user.user_metadata?.name ??
                  user.email ??
                  '',
              },`),
  applyEol(callbackSource, `                full_name:
                  user.user_metadata?.full_name ??
                  user.user_metadata?.name ??
                  user.email ??
                  '',
                enterprise_number:
                  pendingUserType === 'company'
                    ? getPendingCompanyNumber()
                    : undefined,
              },`),
  "callback metadata enterprise number",
);

fs.writeFileSync(registerPath, registerSource, "utf8");
fs.writeFileSync(callbackPath, callbackSource, "utf8");

console.log("BCE registration integration patch prepared successfully.");
