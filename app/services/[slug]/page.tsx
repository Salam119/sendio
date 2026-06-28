'use client';

import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

type ServiceCategoryRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
};

type RawCompanyRow = {
  id: string;
  user_id: string | null;
  name: string | null;
  slug: string | null;
  description: string | null;
  logo: string | null;
  city: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  category: string | null;
  status: string | null;
  rating: number | null;
};

type RawWorkerRow = {
  id: string;
  user_id: string | null;
  name: string | null;
  slug: string | null;
  description: string | null;
  avatar: string | null;
  city: string | null;
  phone: string | null;
  email: string | null;
  status: string | null;
  rating: number | null;
};

type RawCompanyServiceRow = {
  company_id: string | null;
  title: string | null;
  description: string | null;
};

type RawWorkerServiceRow = {
  worker_id: string | null;
  title: string | null;
  description: string | null;
};

type Provider = {
  id: string;
  kind: 'company' | 'worker';
  name: string;
  slug: string;
  description: string;
  image: string | null;
  city: string;
  address: string;
  phone: string | null;
  email: string | null;
  status: string;
  rating: number | null;
  specialty: string;
  searchText: string;
};

const SERVICE_ICON_MAP: Record<string, string> = {
  sparkles: '🧹',
  home: '🏠',
  brush: '🎨',
  building: '🏢',
  window: '🪟',
  layers: '🧽',
  wrench: '🔧',
  pipe: '🚰',
  drop: '💧',
  faucet: '🚰',
  bulb: '💡',
  plug: '🔌',
  truck: '🚚',
  tree: '🌳',
  hammer: '🔨',
  roof: '🏠',
  bug: '🐞',
  computer: '💻',
};

const fallbackIcons = ['🧰', '🔧', '🏠', '🧹', '🚚', '💡', '🌿', '🎨'];

function normalizeText(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? '';
}

function getFallbackIcon(name: string) {
  const total = name.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return fallbackIcons[total % fallbackIcons.length];
}

function getServiceIcon(service: ServiceCategoryRow | null) {
  if (!service) {
    return '🧰';
  }

  const icon = service.icon?.trim().toLowerCase();

  if (!icon) {
    return getFallbackIcon(service.name);
  }

  return SERVICE_ICON_MAP[icon] ?? getFallbackIcon(service.name);
}

function cleanPhone(phone: string | null) {
  return phone?.replace(/[^\d+]/g, '') ?? '';
}

function getWhatsappHref(phone: string | null) {
  const cleaned = cleanPhone(phone).replace('+', '');

  if (!cleaned) {
    return '';
  }

  return `https://wa.me/${cleaned}`;
}

function getProviderHref(provider: Provider) {
  return provider.kind === 'company' ? `/companies/${provider.slug}` : `/workers/${provider.slug}`;
}

function providerMatchesService(provider: Provider, serviceName: string) {
  const cleanServiceName = serviceName.toLowerCase().replace(/services?/g, '').trim();
  const words = cleanServiceName.split(/\s+/).filter((word) => word.length > 2);

  if (provider.searchText.includes(serviceName.toLowerCase())) {
    return true;
  }

  if (cleanServiceName && provider.searchText.includes(cleanServiceName)) {
    return true;
  }

  return words.some((word) => provider.searchText.includes(word));
}

function sortByCity(providers: Provider[], city: string) {
  const normalizedCity = normalizeText(city);

  if (!normalizedCity) {
    return providers;
  }

  return [...providers].sort((a, b) => {
    const aExact = normalizeText(a.city).includes(normalizedCity) ? 0 : 1;
    const bExact = normalizeText(b.city).includes(normalizedCity) ? 0 : 1;

    return aExact - bExact;
  });
}

function shortDescription(value: string) {
  return value.split(/\s+/).filter(Boolean).slice(0, 12).join(' ');
}

export default function ServiceRequestPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();

  const slugParam = params?.slug;
  const slug = Array.isArray(slugParam) ? slugParam[0] : slugParam ?? '';
  const selectedProviderType = searchParams.get('providerType');
  const selectedProviderId = searchParams.get('providerId');
  const cityFromQuery = searchParams.get('city') ?? '';

  const [service, setService] = useState<ServiceCategoryRow | null>(null);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [warning, setWarning] = useState('');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submittedRequestId, setSubmittedRequestId] = useState<string | null>(null);
  const [cancelMessage, setCancelMessage] = useState('');

  const [serviceType, setServiceType] = useState('');
  const [serviceScope, setServiceScope] = useState('');
  const [urgency, setUrgency] = useState('urgent_1_2_days');
  const [street, setStreet] = useState('');
  const [houseNumber, setHouseNumber] = useState('');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [preferredDate, setPreferredDate] = useState('');
  const [preferredTimeWindow, setPreferredTimeWindow] = useState('flexible');
  const [preferredTime, setPreferredTime] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  useEffect(() => {
    if (cityFromQuery) {
      setCity(cityFromQuery);
    }
  }, [cityFromQuery]);

  useEffect(() => {
    let active = true;

    async function loadData() {
      setLoading(true);
      setWarning('');

      const { data: serviceData, error: serviceError } = await supabase
        .from('service_categories')
        .select('id, name, slug, description, icon')
        .eq('slug', slug)
        .eq('is_active', true)
        .maybeSingle();

      if (!active) {
        return;
      }

      if (serviceError || !serviceData) {
        setService(null);
        setLoading(false);
        return;
      }

      setService(serviceData as ServiceCategoryRow);

      const [
        companiesResult,
        workersResult,
        companyServicesResult,
        workerServicesResult,
        userResult,
      ] = await Promise.all([
        supabase
          .from('companies')
          .select('id, user_id, name, slug, description, logo, city, address, phone, email, category, status, rating')
          .limit(100),
        supabase
          .from('workers')
          .select('id, user_id, name, slug, description, avatar, city, phone, email, status, rating')
          .limit(100),
        supabase.from('company_services').select('company_id, title, description').limit(300),
        supabase.from('worker_services').select('worker_id, title, description').limit(300),
        supabase.auth.getUser(),
      ]);

      if (!active) {
        return;
      }

      const user = userResult.data.user ?? null;
      const userEmail = user?.email ?? '';
      setCurrentUserId(user?.id ?? null);
      setEmail(userEmail);

      const companyServices = (companyServicesResult.data ?? []) as RawCompanyServiceRow[];
      const workerServices = (workerServicesResult.data ?? []) as RawWorkerServiceRow[];

      const companyServiceMap = new Map<string, RawCompanyServiceRow[]>();
      const workerServiceMap = new Map<string, RawWorkerServiceRow[]>();

      companyServices.forEach((item) => {
        if (!item.company_id) {
          return;
        }

        const current = companyServiceMap.get(item.company_id) ?? [];
        current.push(item);
        companyServiceMap.set(item.company_id, current);
      });

      workerServices.forEach((item) => {
        if (!item.worker_id) {
          return;
        }

        const current = workerServiceMap.get(item.worker_id) ?? [];
        current.push(item);
        workerServiceMap.set(item.worker_id, current);
      });

      const companyProviders = ((companiesResult.data ?? []) as RawCompanyRow[]).map((company) => {
        const serviceRows = companyServiceMap.get(company.id) ?? [];
        const specialty = serviceRows[0]?.title || company.category || 'Company service';
        const serviceText = serviceRows
          .map((item) => `${item.title ?? ''} ${item.description ?? ''}`)
          .join(' ');

        return {
          id: company.id,
          kind: 'company' as const,
          name: company.name || 'Company',
          slug: company.slug || company.id,
          description: company.description || 'Open this company profile on Sendio.',
          image: company.logo,
          city: company.city || '',
          address: company.address || '',
          phone: company.phone,
          email: company.email,
          status: company.status || 'available',
          rating: company.rating,
          specialty,
          searchText: `${company.name ?? ''} ${company.category ?? ''} ${
            company.description ?? ''
          } ${serviceText}`.toLowerCase(),
        };
      });

      const workerProviders = ((workersResult.data ?? []) as RawWorkerRow[]).map((worker) => {
        const serviceRows = workerServiceMap.get(worker.id) ?? [];
        const specialty = serviceRows[0]?.title || 'Worker service';
        const serviceText = serviceRows
          .map((item) => `${item.title ?? ''} ${item.description ?? ''}`)
          .join(' ');

        return {
          id: worker.id,
          kind: 'worker' as const,
          name: worker.name || 'Worker',
          slug: worker.slug || worker.id,
          description: worker.description || 'Open this worker profile on Sendio.',
          image: worker.avatar,
          city: worker.city || '',
          address: '',
          phone: worker.phone,
          email: worker.email,
          status: worker.status || 'available',
          rating: worker.rating,
          specialty,
          searchText: `${worker.name ?? ''} ${worker.description ?? ''} ${serviceText}`.toLowerCase(),
        };
      });

      setProviders([...companyProviders, ...workerProviders]);
      setLoading(false);
    }

    loadData();

    return () => {
      active = false;
    };
  }, [slug]);

  const serviceProviders = service
    ? providers.filter((provider) => providerMatchesService(provider, service.name))
    : [];

  const matchingProviders = sortByCity(serviceProviders, city);
  const selectedProvider =
    selectedProviderId && (selectedProviderType === 'company' || selectedProviderType === 'worker')
      ? providers.find(
          (provider) =>
            provider.id === selectedProviderId && provider.kind === selectedProviderType
        ) ?? null
      : null;
  const prioritizedProviders = selectedProvider
    ? [
        selectedProvider,
        ...matchingProviders.filter(
          (provider) =>
            provider.id !== selectedProvider.id || provider.kind !== selectedProvider.kind
        ),
      ]
    : matchingProviders;
  const closestProviders = prioritizedProviders.slice(0, 12);

  function goNext() {
    setWarning('');

    if (step === 2 && (!city || !postalCode)) {
      setWarning('Please add your city and postal code.');
      return;
    }

    if (step === 4 && (!firstName || !phone)) {
      setWarning('Please add your first name and phone number.');
      return;
    }

    if (step < 4) {
      setStep((current) => current + 1);
      return;
    }

    submitRequest();
  }

  function goBack() {
    setWarning('');

    if (step === 0) {
      router.back();
      return;
    }

    setStep((current) => current - 1);
  }

  function getCurrentRequestPath() {
    const query = searchParams.toString();
    const basePath = `/services/${service?.slug ?? slug}`;

    return query ? `${basePath}?${query}` : basePath;
  }

  function requestLogin() {
    router.push(`/login?redirectTo=${encodeURIComponent(getCurrentRequestPath())}`);
  }

  function handleLockedContact() {
    setWarning('Please sign in to use contact actions.');
  }

  async function submitDirectProviderRequest() {
    if (!service || !selectedProvider) {
      return;
    }

    setSubmitting(true);
    setWarning('');

    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;

    if (!user) {
      setSubmitting(false);
      setCurrentUserId(null);
      setWarning('Please sign in first, then send your service request.');
      requestLogin();
      return;
    }

    setCurrentUserId(user.id);
    setEmail(user.email ?? '');

    if (!street || !houseNumber || !city || !postalCode) {
      setSubmitting(false);
      setWarning('Please add your full address before sending the request.');
      return;
    }

    if (!preferredDate || (!preferredTime && preferredTimeWindow === 'specific_time')) {
      setSubmitting(false);
      setWarning('Please add the preferred date and time.');
      return;
    }

    if (!projectDescription.trim()) {
      setSubmitting(false);
      setWarning('Please add the requested service details.');
      return;
    }

    const { data: requestData, error: requestError } = await supabase
      .from('service_requests')
      .insert({
        service_category_id: service.id,
        service_slug: service.slug,
        service_name: service.name,
        client_id: user.id,

        selected_provider_type: selectedProvider.kind,
        selected_company_id:
          selectedProvider.kind === 'company' ? selectedProvider.id : null,
        selected_worker_id:
          selectedProvider.kind === 'worker' ? selectedProvider.id : null,

        email: user.email,
        phone: phone || null,

        city,
        postal_code: postalCode,
        street,
        house_number: houseNumber,

        service_type: service.name,
        service_scope: selectedProvider.specialty,
        urgency,
        preferred_date: preferredDate || null,
        preferred_time: preferredTime || null,
        preferred_time_window: preferredTimeWindow,
        project_description: projectDescription,

        project_answers: {
          directProviderRequest: true,
          selectedProviderName: selectedProvider.name,
          selectedProviderType: selectedProvider.kind,
          optionalPhone: phone || null,
          preferredDate,
          preferredTimeWindow,
          preferredTime,
        },

        status: 'submitted',
        submitted_at: new Date().toISOString(),
        client_seen: true,
        provider_seen: false,
        admin_seen: false,
      })
      .select('id')
      .single();

    if (requestError || !requestData) {
      console.error('DIRECT SERVICE REQUEST SAVE ERROR:', requestError);

      setSubmitting(false);
      setWarning(
        requestError?.message
          ? `تعذر حفظ الطلب: ${requestError.message}`
          : 'تعذر حفظ الطلب. يرجى المحاولة مرة أخرى.'
      );
      return;
    }

    const { error: matchError } = await supabase.from('service_request_matches').insert({
      request_id: requestData.id,
      provider_type: selectedProvider.kind,
      company_id: selectedProvider.kind === 'company' ? selectedProvider.id : null,
      worker_id: selectedProvider.kind === 'worker' ? selectedProvider.id : null,
      match_rank: 1,
      city_match: city
        ? normalizeText(selectedProvider.city).includes(normalizeText(city))
        : false,
      service_match: true,
      status: 'pending',
    });

    if (matchError) {
      console.error('DIRECT SERVICE REQUEST MATCH ERROR:', matchError);
      setCancelMessage(
        `تم حفظ الطلب، لكن تعذر ربطه بالمزود: ${matchError.message}`
      );
    } else {
      setCancelMessage('');
    }

    setSubmittedRequestId(requestData.id);
    setStep(5);
    setSubmitting(false);
  }

  async function submitRequest() {
    if (!service) {
      return;
    }

    setSubmitting(true);
    setWarning('');

    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;

    if (!user) {
      setSubmitting(false);
      setWarning('Please sign in first, then send your service request.');
      router.push(`/login?redirectTo=/services/${service.slug}`);
      return;
    }

    const { data: requestData, error: requestError } = await supabase
      .from('service_requests')
      .insert({
        service_category_id: service.id,
        service_slug: service.slug,
        service_name: service.name,
        client_id: user.id,

        selected_provider_type: selectedProvider ? selectedProvider.kind : null,
        selected_company_id:
          selectedProvider?.kind === 'company' ? selectedProvider.id : null,
        selected_worker_id:
          selectedProvider?.kind === 'worker' ? selectedProvider.id : null,

        first_name: firstName,
        last_name: lastName,
        email: email || user.email,
        phone,

        city,
        postal_code: postalCode,
        street,
        house_number: houseNumber,

        service_type: serviceType,
        service_scope: serviceScope,
        urgency,
        preferred_date: preferredDate || null,
        preferred_time: preferredTime || null,
        preferred_time_window: preferredTimeWindow,
        project_description: projectDescription,

        project_answers: {
          serviceType,
          serviceScope,
          urgency,
          preferredDate,
          preferredTimeWindow,
          preferredTime,
        },

        status: 'submitted',
        submitted_at: new Date().toISOString(),
        client_seen: true,
        provider_seen: false,
        admin_seen: false,
      })
      .select('id')
      .single();

    if (requestError || !requestData) {
      console.error('SERVICE REQUEST SAVE ERROR:', requestError);

      setSubmitting(false);
      setWarning(
        requestError?.message
          ? `تعذر حفظ الطلب: ${requestError.message}`
          : 'تعذر حفظ الطلب. يرجى المحاولة مرة أخرى.'
      );
      return;
    }

    const providersToNotify = selectedProvider ? [selectedProvider] : closestProviders;

    const matchRows = providersToNotify.slice(0, 12).map((provider, index) => ({
      request_id: requestData.id,
      provider_type: provider.kind,
      company_id: provider.kind === 'company' ? provider.id : null,
      worker_id: provider.kind === 'worker' ? provider.id : null,
      match_rank: index + 1,
      city_match: city ? normalizeText(provider.city).includes(normalizeText(city)) : false,
      service_match: true,
      status: 'pending',
    }));

    if (matchRows.length > 0) {
      const { error: matchesError } = await supabase
        .from('service_request_matches')
        .insert(matchRows);

      if (matchesError) {
        console.error('SERVICE REQUEST MATCHES ERROR:', matchesError);
        setCancelMessage(
          `تم حفظ الطلب، لكن تعذر ربطه بالمزودين: ${matchesError.message}`
        );
      } else {
        setCancelMessage('');
      }
    }

    setSubmittedRequestId(requestData.id);
    setStep(5);
    setSubmitting(false);
  }

  async function cancelRequest() {
    if (!submittedRequestId) {
      return;
    }

    const { error } = await supabase
      .from('service_requests')
      .update({
        status: 'cancelled',
        cancelled_reason: 'Client cancelled the request from the service page.',
      })
      .eq('id', submittedRequestId);

    if (error) {
      setCancelMessage('The request could not be cancelled right now.');
      return;
    }

    setCancelMessage('Your request has been cancelled.');
  }

  if (loading) {
    return (
      <main className="requestPage">
        <section className="requestShell">
          <h1>Loading service...</h1>
        </section>

        <style>{styles}</style>
      </main>
    );
  }

  if (!service) {
    return (
      <main className="requestPage">
        <section className="requestShell">
          <h1>Service not found</h1>
          <p>This service is not available on Sendio yet.</p>

          <div className="navRow">
            <Link href="/">Home</Link>
            <Link href="/services">Services</Link>
          </div>
        </section>

        <style>{styles}</style>
      </main>
    );
  }

  return (
    <main className="requestPage">
      <header className="requestTop">
        <Link href="/" className="logo">
          Sendio
        </Link>

        <div className="navRow">
          <button type="button" onClick={() => router.back()}>
            Back
          </button>
          <Link href="/">Home</Link>
          <Link href="/services">Services</Link>
        </div>
      </header>

      <div className="progressBar">
        <span style={{ width: `${step === 5 ? 100 : (step + 1) * 20}%` }} />
      </div>

      {step < 5 ? (
        <section className={selectedProvider ? 'requestShell directShell' : 'requestShell'}>
          <div className="serviceHead">
            <span>{getServiceIcon(service)}</span>
            <p>{service.name}</p>
          </div>

          {selectedProvider ? (
            <section className="directRequestGrid">
              <article className="directPanel providerPanel">
                <p className="panelLabel">Selected provider</p>

                <div
                  className="directProviderImage"
                  style={
                    selectedProvider.image
                      ? {
                          backgroundImage: `url("${selectedProvider.image}")`,
                        }
                      : undefined
                  }
                >
                  {!selectedProvider.image
                    ? selectedProvider.name.charAt(0).toUpperCase()
                    : null}
                </div>

                <div className="providerTitleBlock">
                  <h1>{selectedProvider.name}</h1>
                  <span>{selectedProvider.kind === 'company' ? 'Company' : 'Worker'}</span>
                </div>

                <div className="providerMetaGrid">
                  <span>{selectedProvider.city || 'Nearby area'}</span>
                  <span>{selectedProvider.status}</span>
                  <span>{selectedProvider.specialty}</span>
                  <span>{selectedProvider.rating ? `★ ${selectedProvider.rating.toFixed(1)}` : 'No rating yet'}</span>
                </div>

                <p className="providerDirectDescription">
                  {shortDescription(selectedProvider.description)}
                </p>

                <div className="iconContactRow" aria-label="Provider contact actions">
                  {selectedProvider.phone ? (
                    currentUserId ? (
                      <a href={`tel:${cleanPhone(selectedProvider.phone)}`} aria-label="Call provider">
                        ☎
                      </a>
                    ) : (
                      <button type="button" onClick={handleLockedContact} aria-label="Call provider">
                        ☎
                      </button>
                    )
                  ) : null}

                  {getWhatsappHref(selectedProvider.phone) ? (
                    currentUserId ? (
                      <a
                        href={getWhatsappHref(selectedProvider.phone)}
                        target="_blank"
                        rel="noreferrer"
                        aria-label="Open WhatsApp"
                      >
                        ◉
                      </a>
                    ) : (
                      <button type="button" onClick={handleLockedContact} aria-label="Open WhatsApp">
                        ◉
                      </button>
                    )
                  ) : null}

                  {selectedProvider.phone ? (
                    currentUserId ? (
                      <a href={`viber://chat?number=${cleanPhone(selectedProvider.phone)}`} aria-label="Open Viber">
                        V
                      </a>
                    ) : (
                      <button type="button" onClick={handleLockedContact} aria-label="Open Viber">
                        V
                      </button>
                    )
                  ) : null}

                  {selectedProvider.email ? (
                    currentUserId ? (
                      <a href={`mailto:${selectedProvider.email}`} aria-label="Email provider">
                        ✉
                      </a>
                    ) : (
                      <button type="button" onClick={handleLockedContact} aria-label="Email provider">
                        ✉
                      </button>
                    )
                  ) : null}
                </div>

                {!currentUserId ? (
                  <p className="lockedText">Sign in to request this provider or use contact actions.</p>
                ) : null}
              </article>

              <article className="directPanel clientPanel">
                <p className="panelLabel">Your request</p>
                <h1>Send your request</h1>

                {!currentUserId ? (
                  <div className="loginLockBox">
                    <p>Please sign in first. You can view the provider, but requests and contact actions require a real account.</p>

                    <div className="loginLockActions">
                      <button type="button" className="nextButton" onClick={requestLogin}>
                        Sign in
                      </button>

                      <Link href="/register" className="backButton">
                        Create account
                      </Link>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="fieldGrid">
                      <input value={street} onChange={(event) => setStreet(event.target.value)} placeholder="Street" />
                      <input
                        value={houseNumber}
                        onChange={(event) => setHouseNumber(event.target.value)}
                        placeholder="House number"
                      />
                      <input value={city} onChange={(event) => setCity(event.target.value)} placeholder="City" />
                      <input
                        value={postalCode}
                        onChange={(event) => setPostalCode(event.target.value)}
                        placeholder="Postal code"
                      />
                    </div>

                    <div className="fieldGrid directTimeGrid">
                      <input
                        value={phone}
                        onChange={(event) => setPhone(event.target.value)}
                        placeholder="Phone optional"
                      />

                      <input
                        value={preferredDate}
                        onChange={(event) => setPreferredDate(event.target.value)}
                        type="date"
                      />

                      <select
                        value={preferredTimeWindow}
                        onChange={(event) => setPreferredTimeWindow(event.target.value)}
                      >
                        <option value="morning">Morning</option>
                        <option value="afternoon">Afternoon</option>
                        <option value="evening">Evening</option>
                        <option value="specific_time">Specific time</option>
                        <option value="flexible">Flexible</option>
                      </select>

                      <input
                        value={preferredTime}
                        onChange={(event) => setPreferredTime(event.target.value)}
                        type="time"
                      />
                    </div>

                    <textarea
                      value={projectDescription}
                      onChange={(event) => setProjectDescription(event.target.value)}
                      placeholder="Requested service details"
                      maxLength={2000}
                    />

                    <div className="bottomActions">
                      <button type="button" className="backButton" onClick={() => router.back()}>
                        Back
                      </button>

                      <button
                        type="button"
                        className="nextButton"
                        onClick={submitDirectProviderRequest}
                        disabled={submitting}
                      >
                        {submitting ? 'Sending request...' : 'Send request'}
                      </button>
                    </div>
                  </>
                )}
              </article>
            </section>
          ) : null}

          {!selectedProvider && step === 0 ? (
            <section className="stepBlock">
              <h1>What type of service do you need?</h1>

              <div className="choiceGrid">
                {['Home', 'Business'].map((item) => (
                  <button
                    type="button"
                    className={serviceType === item ? 'choiceButton activeChoice' : 'choiceButton'}
                    onClick={() => setServiceType(item)}
                    key={item}
                  >
                    {item}
                  </button>
                ))}
              </div>

              <div className="choiceGrid smallChoices">
                {['Indoor', 'Outdoor', 'Both'].map((item) => (
                  <button
                    type="button"
                    className={serviceScope === item ? 'choiceButton activeChoice' : 'choiceButton'}
                    onClick={() => setServiceScope(item)}
                    key={item}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </section>
          ) : null}

          {!selectedProvider && step === 1 ? (
            <section className="stepBlock">
              <h1>When do you need this work done?</h1>

              <div className="radioList">
                {[
                  ['urgent_1_2_days', 'Urgent: 1–2 days'],
                  ['within_2_weeks', 'Within 2 weeks'],
                  ['more_than_2_weeks', 'More than 2 weeks'],
                  ['not_sure', 'Not sure / planning'],
                ].map(([value, label]) => (
                  <button
                    type="button"
                    className={urgency === value ? 'radioLine activeRadio' : 'radioLine'}
                    onClick={() => setUrgency(value)}
                    key={value}
                  >
                    <span />
                    {label}
                  </button>
                ))}
              </div>
            </section>
          ) : null}

          {!selectedProvider && step === 2 ? (
            <section className="stepBlock">
              <h1>What is your project address?</h1>

              <div className="fieldGrid">
                <input value={street} onChange={(event) => setStreet(event.target.value)} placeholder="Street" />
                <input
                  value={houseNumber}
                  onChange={(event) => setHouseNumber(event.target.value)}
                  placeholder="House number"
                />
                <input value={city} onChange={(event) => setCity(event.target.value)} placeholder="City" />
                <input
                  value={postalCode}
                  onChange={(event) => setPostalCode(event.target.value)}
                  placeholder="Postal code"
                />
              </div>
            </section>
          ) : null}

          {!selectedProvider && step === 3 ? (
            <section className="stepBlock">
              <h1>Please tell us a little about your project.</h1>

              <textarea
                value={projectDescription}
                onChange={(event) => setProjectDescription(event.target.value)}
                placeholder="Tell us in your own words..."
                maxLength={2000}
              />

              <div className="fieldGrid">
                <input
                  value={preferredDate}
                  onChange={(event) => setPreferredDate(event.target.value)}
                  type="date"
                />

                <select
                  value={preferredTimeWindow}
                  onChange={(event) => setPreferredTimeWindow(event.target.value)}
                >
                  <option value="morning">Morning</option>
                  <option value="afternoon">Afternoon</option>
                  <option value="evening">Evening</option>
                  <option value="specific_time">Specific time</option>
                  <option value="flexible">Flexible</option>
                </select>

                <input
                  value={preferredTime}
                  onChange={(event) => setPreferredTime(event.target.value)}
                  type="time"
                />
              </div>
            </section>
          ) : null}

          {!selectedProvider && step === 4 ? (
            <section className="stepBlock">
              <h1>We have matching providers in your area.</h1>
              <p className="subText">Add your contact details so providers can respond to your request.</p>

              <div className="fieldGrid">
                <input
                  value={firstName}
                  onChange={(event) => setFirstName(event.target.value)}
                  placeholder="First name"
                />
                <input
                  value={lastName}
                  onChange={(event) => setLastName(event.target.value)}
                  placeholder="Last name"
                />
                <input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="Phone" />
                <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email" />
              </div>
            </section>
          ) : null}

          {warning ? <p className="warningBox">{warning}</p> : null}

          {!selectedProvider ? (
            <>
              <div className="bottomActions">
                <button type="button" className="backButton" onClick={goBack}>
                  Back
                </button>

                <button type="button" className="nextButton" onClick={goNext} disabled={submitting}>
                  {submitting ? 'Building your request...' : step === 4 ? 'View Matching Providers' : 'Next'}
                </button>
              </div>

              <button
                type="button"
                className="tinyCancelButton"
                onClick={() => router.push('/services')}
              >
                تراجع عن الطلب
              </button>
            </>
          ) : null}
        </section>
      ) : (
        <section className="resultShell">
          <div className="resultHead">
            <h1>Your request was sent.</h1>
            <p>Closest matching providers are shown first. Providers can accept or decline your request.</p>

            <button type="button" className="tinyCancel" onClick={cancelRequest}>
              Cancel request
            </button>

            {cancelMessage ? <span className="cancelMessage">{cancelMessage}</span> : null}
          </div>

          <div className="providerGrid">
            {closestProviders.length > 0 ? (
              closestProviders.map((provider) => {
                const whatsappHref = getWhatsappHref(provider.phone);

                return (
                  <article className="providerCard" key={`${provider.kind}-${provider.id}`}>
                    <Link
                      href={getProviderHref(provider)}
                      className="providerImage"
                      style={
                        provider.image
                          ? {
                              backgroundImage: `url("${provider.image}")`,
                            }
                          : undefined
                      }
                    >
                      {!provider.image ? provider.name.charAt(0).toUpperCase() : null}
                    </Link>

                    <div className="providerInfo">
                      <Link href={getProviderHref(provider)} className="providerName">
                        {provider.name}
                      </Link>

                      <p>{provider.specialty}</p>
                      <span>{provider.city || 'Nearby area'}</span>
                      <span>{provider.status}</span>
                      <span>{provider.rating ? `★ ${provider.rating.toFixed(1)}` : 'No rating yet'}</span>
                      <small>{shortDescription(provider.description)}</small>

                      <div className="tinyActions">
                        {provider.phone ? <a href={`tel:${cleanPhone(provider.phone)}`}>☎</a> : null}
                        {provider.email ? <a href={`mailto:${provider.email}`}>✉</a> : null}
                        {whatsappHref ? (
                          <a href={whatsappHref} target="_blank" rel="noreferrer">
                            ●
                          </a>
                        ) : null}
                      </div>
                    </div>
                  </article>
                );
              })
            ) : (
              <div className="emptyResult">
                <h2>No matching providers yet</h2>
                <p>Your request was saved. Sendio can show providers here when they join this service.</p>
              </div>
            )}
          </div>
        </section>
      )}

      <style>{styles}</style>
    </main>
  );
}

const styles = `
  .requestPage {
    min-height: 100vh;
    background: var(--sendio-page-bg);
    color: var(--sendio-text);
  }

  .requestTop {
    min-height: 58px;
    padding: 0 18px;
    background: var(--sendio-card-bg);
    border-bottom: 1px solid var(--sendio-border);
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .logo {
    color: var(--sendio-button-bg);
    font-size: 24px;
    font-weight: 950;
    text-decoration: none;
    letter-spacing: -0.05em;
  }

  .navRow {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .navRow a,
  .navRow button {
    min-height: 32px;
    border: 1px solid var(--sendio-border);
    border-radius: 999px;
    background: var(--sendio-card-bg);
    color: var(--sendio-text);
    padding: 0 12px;
    text-decoration: none;
    font-size: 12px;
    font-weight: 850;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
  }

  .progressBar {
    height: 4px;
    background: var(--sendio-border);
  }

  .progressBar span {
    display: block;
    height: 100%;
    background: var(--sendio-button-bg);
    transition: width 0.25s ease;
  }

  .requestShell,
  .resultShell {
    width: min(620px, calc(100% - 32px));
    margin: 34px auto 70px;
  }

  .directShell {
    width: min(1120px, calc(100% - 32px));
  }

  .serviceHead {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    margin-bottom: 26px;
  }

  .serviceHead span {
    font-size: 28px;
  }

  .serviceHead p {
    margin: 0;
    font-weight: 900;
    color: var(--sendio-muted);
  }

  .selectedProviderBox {
    margin: -10px auto 24px;
    border: 1px solid var(--sendio-border);
    border-radius: 12px;
    background: var(--sendio-card-bg);
    padding: 12px;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: center;
    gap: 8px;
    color: var(--sendio-muted);
    font-size: 12px;
    font-weight: 800;
  }

  .selectedProviderBox strong {
    color: var(--sendio-text);
    font-size: 13px;
  }

  .selectedProviderBox span,
  .selectedProviderBox a {
    border: 1px solid var(--sendio-border);
    border-radius: 999px;
    background: var(--sendio-rectangle-bg);
    color: var(--sendio-text);
    text-decoration: none;
    padding: 5px 9px;
  }

  .directRequestGrid {
    display: grid;
    grid-template-columns: minmax(0, 0.92fr) minmax(0, 1.08fr);
    gap: 18px;
    align-items: stretch;
  }

  .directPanel {
    border: 1px solid var(--sendio-border);
    border-radius: 18px;
    background: var(--sendio-card-bg);
    box-shadow: 0 14px 36px rgba(17, 24, 39, 0.06);
    padding: 18px;
  }

  .panelLabel {
    margin: 0 0 12px;
    color: var(--sendio-muted);
    font-size: 11px;
    font-weight: 950;
    letter-spacing: 0.18em;
    text-transform: uppercase;
  }

  .directProviderImage {
    min-height: 170px;
    border-radius: 16px;
    background-color: var(--sendio-rectangle-bg);
    background-size: cover;
    background-position: center;
    color: var(--sendio-button-bg);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 48px;
    font-weight: 950;
  }

  .providerTitleBlock {
    margin-top: 16px;
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
  }

  .providerTitleBlock h1,
  .clientPanel h1 {
    margin: 0;
    color: var(--sendio-text);
    font-size: clamp(24px, 4vw, 34px);
    line-height: 1.04;
    letter-spacing: -0.045em;
  }

  .providerTitleBlock span {
    flex: 0 0 auto;
    border: 1px solid var(--sendio-border);
    border-radius: 999px;
    background: var(--sendio-rectangle-bg);
    color: var(--sendio-text);
    padding: 6px 10px;
    font-size: 11px;
    font-weight: 900;
  }

  .providerMetaGrid {
    margin-top: 14px;
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
  }

  .providerMetaGrid span {
    border: 1px solid var(--sendio-border);
    border-radius: 999px;
    background: var(--sendio-rectangle-bg);
    color: var(--sendio-muted);
    padding: 8px 10px;
    font-size: 12px;
    font-weight: 850;
  }

  .providerDirectDescription,
  .lockedText,
  .loginLockBox p {
    color: var(--sendio-muted);
    font-size: 13px;
    font-weight: 700;
    line-height: 1.55;
  }

  .iconContactRow {
    margin-top: 14px;
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .iconContactRow a,
  .iconContactRow button {
    width: 38px;
    height: 38px;
    border: 1px solid var(--sendio-border);
    border-radius: 50%;
    background: var(--sendio-button-bg);
    color: var(--sendio-text);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    text-decoration: none;
    font-size: 13px;
    font-weight: 950;
    cursor: pointer;
  }

  .iconContactRow button {
    opacity: 0.62;
  }

  .clientPanel {
    display: grid;
    gap: 14px;
  }

  .directTimeGrid {
    margin-top: 10px;
  }

  .loginLockBox {
    border: 1px solid var(--sendio-border);
    border-radius: 14px;
    background: var(--sendio-rectangle-bg);
    padding: 14px;
  }

  .loginLockActions {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
    margin-top: 14px;
  }

  .loginLockActions .backButton {
    min-height: 46px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    text-decoration: none;
  }

  .stepBlock h1,
  .resultHead h1 {
    margin: 0 0 24px;
    text-align: center;
    font-size: clamp(28px, 6vw, 40px);
    line-height: 1.05;
    letter-spacing: -0.045em;
  }

  .subText,
  .resultHead p {
    margin: -10px 0 24px;
    text-align: center;
    color: var(--sendio-muted);
    font-size: 14px;
    line-height: 1.5;
    font-weight: 650;
  }

  .choiceGrid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
  }

  .smallChoices {
    margin-top: 12px;
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .choiceButton,
  .radioLine {
    min-height: 52px;
    border: 1px solid var(--sendio-border);
    background: var(--sendio-card-bg);
    color: var(--sendio-text);
    border-radius: 9px;
    font-size: 14px;
    font-weight: 850;
    cursor: pointer;
  }

  .activeChoice,
  .activeRadio {
    border-color: var(--sendio-button-bg);
    background: var(--sendio-rectangle-bg);
  }

  .radioList {
    border: 1px solid var(--sendio-border);
    border-radius: 10px;
    overflow: hidden;
    background: var(--sendio-card-bg);
  }

  .radioLine {
    width: 100%;
    border: 0;
    border-bottom: 1px solid var(--sendio-border);
    border-radius: 0;
    display: flex;
    align-items: center;
    gap: 12px;
    justify-content: flex-start;
    padding: 0 14px;
    text-align: left;
  }

  .radioLine span {
    width: 18px;
    height: 18px;
    border: 2px solid var(--sendio-border);
    border-radius: 50%;
  }

  .activeRadio span {
    border-color: var(--sendio-button-bg);
    box-shadow: inset 0 0 0 4px var(--sendio-card-bg);
    background: var(--sendio-button-bg);
  }

  .fieldGrid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
  }

  input,
  select,
  textarea {
    width: 100%;
    border: 1px solid var(--sendio-border);
    border-radius: 8px;
    background: var(--sendio-card-bg);
    color: var(--sendio-text);
    padding: 13px;
    font-size: 14px;
    outline: none;
  }

  textarea {
    min-height: 150px;
    resize: vertical;
    margin-bottom: 12px;
  }

  input:focus,
  select:focus,
  textarea:focus {
    border-color: var(--sendio-button-bg);
  }

  .warningBox {
    margin: 18px 0 0;
    border: 1px solid var(--sendio-button-bg);
    background: var(--sendio-rectangle-bg);
    color: var(--sendio-text);
    border-radius: 9px;
    padding: 12px;
    font-size: 13px;
    font-weight: 800;
  }

  .bottomActions {
    margin-top: 24px;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }

  .backButton,
  .nextButton {
    min-height: 46px;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 900;
    cursor: pointer;
  }

  .backButton {
    border: 1px solid var(--sendio-border);
    background: var(--sendio-card-bg);
    color: var(--sendio-text);
  }

  .nextButton {
    border: 0;
    background: var(--sendio-button-bg);
    color: var(--sendio-text);
  }

  .nextButton:disabled {
    opacity: 0.65;
    cursor: wait;
  }

  .tinyCancelButton {
    display: block;
    width: fit-content;
    margin: 12px auto 0;
    border: 0;
    background: transparent;
    color: var(--sendio-muted);
    font-size: 11px;
    font-weight: 800;
    cursor: pointer;
    text-decoration: underline;
  }

  .tinyCancelButton:hover {
    color: var(--sendio-button-bg);
  }

  .resultHead {
    text-align: center;
    margin-bottom: 22px;
  }

  .tinyCancel {
    min-height: 28px;
    border: 1px solid var(--sendio-border);
    border-radius: 999px;
    background: var(--sendio-card-bg);
    color: var(--sendio-muted);
    font-size: 11px;
    font-weight: 850;
    padding: 0 12px;
    cursor: pointer;
  }

  .cancelMessage {
    display: block;
    margin-top: 10px;
    color: var(--sendio-muted);
    font-size: 12px;
    font-weight: 750;
  }

  .providerGrid {
    display: grid;
    gap: 14px;
  }

  .providerCard {
    display: grid;
    grid-template-columns: 116px 1fr;
    gap: 12px;
    border: 1px solid var(--sendio-border);
    background: var(--sendio-card-bg);
    border-radius: 14px;
    padding: 10px;
  }

  .providerImage {
    min-height: 116px;
    border-radius: 12px;
    background-color: var(--sendio-rectangle-bg);
    background-size: cover;
    background-position: center;
    color: var(--sendio-button-bg);
    display: flex;
    align-items: center;
    justify-content: center;
    text-decoration: none;
    font-size: 34px;
    font-weight: 950;
  }

  .providerInfo {
    min-width: 0;
    display: grid;
    gap: 4px;
  }

  .providerName {
    color: var(--sendio-text);
    text-decoration: none;
    font-size: 16px;
    font-weight: 950;
  }

  .providerInfo p,
  .providerInfo span,
  .providerInfo small {
    color: var(--sendio-muted);
    margin: 0;
    font-size: 12px;
    line-height: 1.35;
    font-weight: 700;
  }

  .tinyActions {
    display: inline-flex;
    gap: 6px;
    margin-top: 4px;
  }

  .tinyActions a {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: var(--sendio-button-bg);
    color: var(--sendio-text);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    text-decoration: none;
    font-size: 11px;
    font-weight: 950;
  }

  .emptyResult {
    border: 1px solid var(--sendio-border);
    background: var(--sendio-card-bg);
    border-radius: 14px;
    padding: 20px;
    text-align: center;
  }

  @media (max-width: 560px) {
    .requestTop {
      align-items: flex-start;
      gap: 8px;
      padding: 12px 14px;
      flex-direction: column;
    }

    .directRequestGrid,
    .fieldGrid,
    .choiceGrid,
    .smallChoices,
    .bottomActions,
    .loginLockActions {
      grid-template-columns: 1fr;
    }

    .providerCard {
      grid-template-columns: 88px 1fr;
    }

    .providerImage {
      min-height: 88px;
    }
  }
`;