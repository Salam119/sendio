'use client';

import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { createSendioNotification } from '@/lib/notifications';
type ServiceCategoryRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  parent_id: string | null;
  is_active: boolean | null;
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

type CompanyCategoryLink = {
  company_id: string | null;
  service_category_id: string | null;
};

type WorkerCategoryLink = {
  worker_id: string | null;
  service_category_id: string | null;
};

type Provider = {
  id: string;
  userId: string | null;
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
  categoryIds: string[];
  categoryNames: string[];
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

const FALLBACK_ICONS = ['🧰', '🔧', '🏠', '🧹', '🚚', '💡', '🌿', '🎨'];

function normalizeText(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? '';
}

function getFallbackIcon(name: string) {
  const total = name.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return FALLBACK_ICONS[total % FALLBACK_ICONS.length];
}

function getServiceIcon(service: ServiceCategoryRow | null) {
  if (!service) {
    return '🧰';
  }

  const icon = service.icon?.trim().toLowerCase();
  return icon ? SERVICE_ICON_MAP[icon] ?? getFallbackIcon(service.name) : getFallbackIcon(service.name);
}

function cleanPhone(phone: string | null) {
  return phone?.replace(/[^\d+]/g, '') ?? '';
}

function getWhatsappHref(phone: string | null) {
  const cleaned = cleanPhone(phone).replace('+', '');
  return cleaned ? `https://wa.me/${cleaned}` : '';
}

function getProviderHref(provider: Provider) {
  return provider.kind === 'company' ? `/companies/${provider.slug}` : `/workers/${provider.slug}`;
}

function shortDescription(value: string) {
  const words = value.split(/\s+/).filter(Boolean).slice(0, 18);
  return words.length > 0 ? words.join(' ') : 'Open this provider profile on Sendio.';
}

function collectDescendantIds(categories: ServiceCategoryRow[], rootId: string) {
  const childrenByParent = new Map<string, string[]>();

  categories.forEach((category) => {
    if (!category.parent_id) {
      return;
    }

    const current = childrenByParent.get(category.parent_id) ?? [];
    current.push(category.id);
    childrenByParent.set(category.parent_id, current);
  });

  const visited = new Set<string>();
  const queue = [rootId];

  while (queue.length > 0) {
    const currentId = queue.shift();

    if (!currentId || visited.has(currentId)) {
      continue;
    }

    visited.add(currentId);
    (childrenByParent.get(currentId) ?? []).forEach((childId) => queue.push(childId));
  }

  return Array.from(visited);
}

function buildCategoryMap<T extends { service_category_id: string | null }>(
  rows: T[],
  getProviderId: (row: T) => string | null
) {
  const result = new Map<string, Set<string>>();

  rows.forEach((row) => {
    const providerId = getProviderId(row);
    const categoryId = row.service_category_id;

    if (!providerId || !categoryId) {
      return;
    }

    const current = result.get(providerId) ?? new Set<string>();
    current.add(categoryId);
    result.set(providerId, current);
  });

  return result;
}

export default function ServiceRequestPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();

  const slugParam = params?.slug;
  const slug = Array.isArray(slugParam) ? slugParam[0] : slugParam ?? '';
  const providerTypeFromQuery = searchParams.get('providerType');
  const providerIdFromQuery = searchParams.get('providerId');
  const cityFromQuery = searchParams.get('city') ?? '';

  const [service, setService] = useState<ServiceCategoryRow | null>(null);
  const [categoryOptions, setCategoryOptions] = useState<ServiceCategoryRow[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [warning, setWarning] = useState('');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [accountEmail, setAccountEmail] = useState('');

  const [cityFilter, setCityFilter] = useState(cityFromQuery);
  const [areaFilter, setAreaFilter] = useState('');
  const [providerKindFilter, setProviderKindFilter] = useState<'all' | 'company' | 'worker'>('all');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [requestCategoryId, setRequestCategoryId] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [submittedRequestId, setSubmittedRequestId] = useState<string | null>(null);
  const [cancelMessage, setCancelMessage] = useState('');

  const [street, setStreet] = useState('');
  const [houseNumber, setHouseNumber] = useState('');
  const [city, setCity] = useState(cityFromQuery);
  const [postalCode, setPostalCode] = useState('');
  const [preferredDate, setPreferredDate] = useState('');
  const [preferredTime, setPreferredTime] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  useEffect(() => {
    let active = true;

    async function loadData() {
      setLoading(true);
      setWarning('');

      const [categoriesResult, userResult] = await Promise.all([
        supabase
          .from('service_categories')
          .select('id, name, slug, description, icon, parent_id, is_active')
          .eq('is_active', true)
          .order('name', { ascending: true }),
        supabase.auth.getUser(),
      ]);

      if (!active) {
        return;
      }

      const user = userResult.data.user ?? null;
      setCurrentUserId(user?.id ?? null);
      setAccountEmail(user?.email ?? '');
      setEmail('');

      if (categoriesResult.error) {
        setService(null);
        setProviders([]);
        setWarning(categoriesResult.error.message);
        setLoading(false);
        return;
      }

      const allCategories = (categoriesResult.data ?? []) as ServiceCategoryRow[];
      const currentService = allCategories.find((category) => category.slug === slug) ?? null;

      if (!currentService) {
        setService(null);
        setProviders([]);
        setLoading(false);
        return;
      }

      setService(currentService);

      const descendantIds = collectDescendantIds(allCategories, currentService.id);
      const descendantSet = new Set(descendantIds);
      const scopedCategories = allCategories.filter((category) => descendantSet.has(category.id));
      setCategoryOptions(scopedCategories);

      const [companyLinksResult, workerLinksResult] = await Promise.all([
        supabase
          .from('company_service_categories')
          .select('company_id, service_category_id')
          .in('service_category_id', descendantIds),
        supabase
          .from('worker_service_categories')
          .select('worker_id, service_category_id')
          .in('service_category_id', descendantIds),
      ]);

      if (!active) {
        return;
      }

      if (companyLinksResult.error || workerLinksResult.error) {
        setWarning(
          companyLinksResult.error?.message ||
            workerLinksResult.error?.message ||
            'Linked providers could not be loaded.'
        );
      }

      const companyLinks = (companyLinksResult.data ?? []) as CompanyCategoryLink[];
      const workerLinks = (workerLinksResult.data ?? []) as WorkerCategoryLink[];
      const companyCategoryMap = buildCategoryMap(companyLinks, (row) => row.company_id);
      const workerCategoryMap = buildCategoryMap(workerLinks, (row) => row.worker_id);
      const companyIds = Array.from(companyCategoryMap.keys());
      const workerIds = Array.from(workerCategoryMap.keys());

      const [companiesResult, workersResult] = await Promise.all([
        companyIds.length > 0
          ? supabase
              .from('companies')
              .select('id, user_id, name, slug, description, logo, city, address, phone, email, status, rating')
              .in('id', companyIds)
          : Promise.resolve({ data: [], error: null }),
        workerIds.length > 0
          ? supabase
              .from('workers')
              .select('id, user_id, name, slug, description, avatar, city, phone, email, status, rating')
              .in('id', workerIds)
          : Promise.resolve({ data: [], error: null }),
      ]);

      if (!active) {
        return;
      }

      if (companiesResult.error || workersResult.error) {
        setWarning(
          companiesResult.error?.message ||
            workersResult.error?.message ||
            'Provider profiles could not be loaded.'
        );
      }

      const categoryNameById = new Map(scopedCategories.map((category) => [category.id, category.name]));
      const companyProviders: Provider[] = ((companiesResult.data ?? []) as RawCompanyRow[]).map((company) => {
        const categoryIds = Array.from(companyCategoryMap.get(company.id) ?? []);

        return {
          id: company.id,
          userId: company.user_id,
          kind: 'company',
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
          categoryIds,
          categoryNames: categoryIds.map((id) => categoryNameById.get(id)).filter((name): name is string => Boolean(name)),
        };
      });

      const workerProviders: Provider[] = ((workersResult.data ?? []) as RawWorkerRow[]).map((worker) => {
        const categoryIds = Array.from(workerCategoryMap.get(worker.id) ?? []);

        return {
          id: worker.id,
          userId: worker.user_id,
          kind: 'worker',
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
          categoryIds,
          categoryNames: categoryIds.map((id) => categoryNameById.get(id)).filter((name): name is string => Boolean(name)),
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

  const categoryById = useMemo(
    () => new Map(categoryOptions.map((category) => [category.id, category])),
    [categoryOptions]
  );

  const filteredProviders = useMemo(() => {
    const normalizedCity = normalizeText(cityFilter);
    const normalizedArea = normalizeText(areaFilter);

    return providers.filter((provider) => {
      const cityMatches = normalizedCity ? normalizeText(provider.city).includes(normalizedCity) : true;
      const areaText = normalizeText(`${provider.address} ${provider.city}`);
      const areaMatches = normalizedArea ? areaText.includes(normalizedArea) : true;
      const kindMatches = providerKindFilter === 'all' ? true : provider.kind === providerKindFilter;
      const categoryMatches = categoryFilter ? provider.categoryIds.includes(categoryFilter) : true;

      return cityMatches && areaMatches && kindMatches && categoryMatches;
    });
  }, [areaFilter, categoryFilter, cityFilter, providerKindFilter, providers]);

  const selectedProvider =
    providerIdFromQuery &&
    (providerTypeFromQuery === 'company' || providerTypeFromQuery === 'worker')
      ? providers.find(
          (provider) =>
            provider.id === providerIdFromQuery && provider.kind === providerTypeFromQuery
        ) ?? null
      : null;

  const selectedProviderKey = selectedProvider
    ? `${selectedProvider.kind}:${selectedProvider.id}`
    : '';

  const effectiveRequestCategoryId =
    selectedProvider &&
    requestCategoryId &&
    selectedProvider.categoryIds.includes(requestCategoryId)
      ? requestCategoryId
      : selectedProvider?.categoryIds[0] || service?.id || '';

  const selectedRequestCategory =
    (effectiveRequestCategoryId
      ? categoryById.get(effectiveRequestCategoryId)
      : null) ?? service;

  function selectProvider(provider: Provider) {
    const preferredCategoryId =
      (categoryFilter && provider.categoryIds.includes(categoryFilter) ? categoryFilter : '') ||
      provider.categoryIds[0] ||
      service?.id ||
      '';

    setRequestCategoryId(preferredCategoryId);
    setWarning('');
    setSubmittedRequestId(null);
    setCancelMessage('');

    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.set('providerType', provider.kind);
    nextParams.set('providerId', provider.id);

    if (cityFilter.trim()) {
      nextParams.set('city', cityFilter.trim());
    } else {
      nextParams.delete('city');
    }

    router.replace(`/services/${service?.slug ?? slug}?${nextParams.toString()}`, { scroll: false });

    window.setTimeout(() => {
      document.getElementById('sendio-request-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 0);
  }

  function clearSelectedProvider() {
    setRequestCategoryId('');
    setWarning('');

    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.delete('providerType');
    nextParams.delete('providerId');
    router.replace(`/services/${service?.slug ?? slug}${nextParams.toString() ? `?${nextParams.toString()}` : ''}`, {
      scroll: false,
    });
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

  async function submitProviderRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!service || !selectedProvider || !selectedRequestCategory) {
      setWarning('Please choose a provider and service first.');
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

    if (!street.trim() || !houseNumber.trim() || !city.trim() || !postalCode.trim()) {
      setSubmitting(false);
      setWarning('Please add your full service address.');
      return;
    }

    if (!preferredDate || !preferredTime) {
      setSubmitting(false);
      setWarning('Please choose the preferred day and time.');
      return;
    }

    if (!projectDescription.trim()) {
      setSubmitting(false);
      setWarning('Please add the requested service details.');
      return;
    }

    const contactEmail = email.trim() || user.email || null;
    const contactPhone = phone.trim() || null;

    const { data: requestData, error: requestError } = await supabase
      .from('service_requests')
      .insert({
        service_category_id: selectedRequestCategory.id,
        service_slug: selectedRequestCategory.slug,
        service_name: selectedRequestCategory.name,
        client_id: user.id,
        selected_provider_type: selectedProvider.kind,
        selected_company_id: selectedProvider.kind === 'company' ? selectedProvider.id : null,
        selected_worker_id: selectedProvider.kind === 'worker' ? selectedProvider.id : null,
        email: contactEmail,
        phone: contactPhone,
        city: city.trim(),
        postal_code: postalCode.trim(),
        street: street.trim(),
        house_number: houseNumber.trim(),
        service_type: selectedRequestCategory.name,
        service_scope: selectedProvider.categoryNames.join(', ') || selectedRequestCategory.name,
        urgency: 'not_sure',
        preferred_date: preferredDate,
        preferred_time: preferredTime,
        preferred_time_window: 'specific_time',
        project_description: projectDescription.trim(),
        project_answers: {
          directProviderRequest: true,
          sourceCategoryId: service.id,
          sourceCategorySlug: service.slug,
          selectedServiceCategoryId: selectedRequestCategory.id,
          selectedServiceCategorySlug: selectedRequestCategory.slug,
          selectedProviderName: selectedProvider.name,
          selectedProviderType: selectedProvider.kind,
          optionalPhone: contactPhone,
          optionalEmail: email.trim() || null,
          preferredDate,
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

    const { error: matchError } = await supabase
  .from('service_request_matches')
  .insert({
    request_id: requestData.id,
    provider_type: selectedProvider.kind,
    company_id:
      selectedProvider.kind === 'company'
        ? selectedProvider.id
        : null,
    worker_id:
      selectedProvider.kind === 'worker'
        ? selectedProvider.id
        : null,
    match_rank: 1,
    city_match: normalizeText(selectedProvider.city).includes(
      normalizeText(city)
    ),
    service_match: selectedProvider.categoryIds.includes(
      selectedRequestCategory.id
    ),
    status: 'pending',
    provider_seen: false,
    client_seen: false,
  });

if (matchError) {
  console.error('SERVICE REQUEST MATCH ERROR:', matchError);

  setCancelMessage(
    `تم حفظ الطلب، لكن تعذر ربطه بالمزود: ${matchError.message}`
  );

  setSubmittedRequestId(requestData.id);
  setSubmitting(false);
  return;
}

if (!selectedProvider.userId) {
  setCancelMessage(
    'The request was saved, but the provider account could not receive a notification.'
  );

  setSubmittedRequestId(requestData.id);
  setSubmitting(false);
  return;
}

const providerTargetUrl =
  selectedProvider.kind === 'company'
    ? '/dashboard/company/messages'
    : '/dashboard/worker/requests';

const notificationCreated =
  await createSendioNotification(supabase, {
    recipientId: selectedProvider.userId,
    actorId: user.id,
    recipientType: selectedProvider.kind,
    eventType:
      selectedProvider.kind === 'company'
        ? 'company_service_request_received'
        : 'worker_service_request_received',
    sourceTable: 'service_requests',
    sourceId: requestData.id,
    title: 'New service request',
    body: `${selectedRequestCategory.name}: ${projectDescription.trim()}`,
    targetUrl: providerTargetUrl,
    metadata: {
      request_id: requestData.id,
      provider_type: selectedProvider.kind,
      provider_id: selectedProvider.id,
      provider_name: selectedProvider.name,
      company_id:
        selectedProvider.kind === 'company'
          ? selectedProvider.id
          : null,
      worker_id:
        selectedProvider.kind === 'worker'
          ? selectedProvider.id
          : null,
      service_category_id: selectedRequestCategory.id,
      service_name: selectedRequestCategory.name,
      service_slug: selectedRequestCategory.slug,
      client_id: user.id,
      client_email: contactEmail,
      client_phone: contactPhone,
      city: city.trim(),
    },
  });

if (!notificationCreated) {
  setCancelMessage(
    'The request was saved, but the floating notification could not be created.'
  );
} else {
  setCancelMessage('');
}

     setSubmittedRequestId(requestData.id);
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

      <section className="providerDirectoryShell">
        <div className="serviceHead directoryServiceHead">
          <span>{getServiceIcon(service)}</span>
          <div>
            <h1>{service.name}</h1>
            <p>{service.description || 'Choose a linked company or worker before sending your request.'}</p>
          </div>
        </div>

        <section className="providerFilters" aria-label="Provider filters">
          <input
            value={cityFilter}
            onChange={(event) => setCityFilter(event.target.value)}
            placeholder="City, for example Liège"
            type="search"
          />
          <input
            value={areaFilter}
            onChange={(event) => setAreaFilter(event.target.value)}
            placeholder="Area or address, for example Hesbaye"
            type="search"
          />
          <select
            value={categoryFilter}
            onChange={(event) => setCategoryFilter(event.target.value)}
            aria-label="Service type"
          >
            <option value="">All related service types</option>
            {categoryOptions.map((category) => (
              <option value={category.id} key={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          <select
            value={providerKindFilter}
            onChange={(event) =>
              setProviderKindFilter(event.target.value as 'all' | 'company' | 'worker')
            }
            aria-label="Provider type"
          >
            <option value="all">Companies and workers</option>
            <option value="company">Companies only</option>
            <option value="worker">Workers only</option>
          </select>
        </section>

        <div className="providerCountRow">
          <strong>{filteredProviders.length}</strong>
          <span>{filteredProviders.length === 1 ? 'linked provider' : 'linked providers'}</span>
        </div>

        {warning ? <p className="warningBox">{warning}</p> : null}

        <section className="providerSelectionGrid">
          {filteredProviders.length > 0 ? (
            filteredProviders.map((provider) => {
              const providerKey = `${provider.kind}:${provider.id}`;
              const isSelected = selectedProviderKey === providerKey;
              const whatsappHref = getWhatsappHref(provider.phone);

              return (
                <article
                  className={isSelected ? 'providerChoiceCard providerChoiceCardSelected' : 'providerChoiceCard'}
                  key={providerKey}
                >
                  <Link
                    href={getProviderHref(provider)}
                    className="providerChoiceImage"
                    style={provider.image ? { backgroundImage: `url("${provider.image}")` } : undefined}
                  >
                    {!provider.image ? provider.name.charAt(0).toUpperCase() : null}
                  </Link>

                  <div className="providerChoiceBody">
                    <div className="providerChoiceTitle">
                      <Link href={getProviderHref(provider)}>{provider.name}</Link>
                      <span>{provider.kind === 'company' ? 'Company' : 'Worker'}</span>
                    </div>
                    <p>{shortDescription(provider.description)}</p>
                    <div className="providerChoiceMeta">
                      <span>{provider.city || 'Area not specified'}</span>
                      <span>{provider.rating ? `★ ${provider.rating.toFixed(1)}` : 'No rating yet'}</span>
                      <span>{provider.status}</span>
                    </div>
                    <div className="providerCategoryChips">
                      {provider.categoryNames.map((name) => (
                        <span key={`${providerKey}-${name}`}>{name}</span>
                      ))}
                    </div>
                    <div className="providerChoiceActions">
                      <Link href={getProviderHref(provider)} className="backButton">
                        Open profile
                      </Link>
                      <button type="button" className="nextButton" onClick={() => selectProvider(provider)}>
                        {isSelected ? 'Selected' : 'Choose provider'}
                      </button>
                    </div>
                    <div className="tinyActions">
                      {provider.phone ? (
                        currentUserId ? (
                          <a href={`tel:${cleanPhone(provider.phone)}`} aria-label="Call provider">☎</a>
                        ) : (
                          <button type="button" onClick={handleLockedContact} aria-label="Call provider">☎</button>
                        )
                      ) : null}
                      {provider.email ? (
                        currentUserId ? (
                          <a href={`mailto:${provider.email}`} aria-label="Email provider">✉</a>
                        ) : (
                          <button type="button" onClick={handleLockedContact} aria-label="Email provider">✉</button>
                        )
                      ) : null}
                      {whatsappHref ? (
                        currentUserId ? (
                          <a href={whatsappHref} target="_blank" rel="noreferrer" aria-label="Open WhatsApp">●</a>
                        ) : (
                          <button type="button" onClick={handleLockedContact} aria-label="Open WhatsApp">●</button>
                        )
                      ) : null}
                    </div>
                  </div>
                </article>
              );
            })
          ) : (
            <div className="emptyResult">
              <h2>No linked providers match these filters</h2>
              <p>Remove one filter or choose another related service type.</p>
            </div>
          )}
        </section>
      </section>

      {selectedProvider ? (
        <section id="sendio-request-form" className="requestShell directShell selectedRequestShell">
          {submittedRequestId ? (
            <section className="requestSuccessBox">
              <span>{getServiceIcon(selectedRequestCategory)}</span>
              <h1>Your request was sent.</h1>
              <p>
                {selectedRequestCategory?.name} was sent to {selectedProvider.name}. You can follow it from your client page.
              </p>
              <div className="successActions">
                <Link href="/clients" className="nextButton">Open my requests</Link>
                <button type="button" className="backButton" onClick={cancelRequest}>Cancel request</button>
              </div>
              {cancelMessage ? <span className="cancelMessage">{cancelMessage}</span> : null}
            </section>
          ) : (
            <section className="directRequestGrid">
              <article className="directPanel providerPanel">
                <p className="panelLabel">Selected provider</p>
                <div
                  className="directProviderImage"
                  style={selectedProvider.image ? { backgroundImage: `url("${selectedProvider.image}")` } : undefined}
                >
                  {!selectedProvider.image ? selectedProvider.name.charAt(0).toUpperCase() : null}
                </div>
                <div className="providerTitleBlock">
                  <h1>{selectedProvider.name}</h1>
                  <span>{selectedProvider.kind === 'company' ? 'Company' : 'Worker'}</span>
                </div>
                <div className="providerMetaGrid">
                  <span>{selectedProvider.city || 'Area not specified'}</span>
                  <span>{selectedProvider.status}</span>
                  <span>{selectedProvider.rating ? `★ ${selectedProvider.rating.toFixed(1)}` : 'No rating yet'}</span>
                  <span>{selectedProvider.categoryNames.length} service link(s)</span>
                </div>
                <div className="providerCategoryChips providerCategoryChipsLarge">
                  {selectedProvider.categoryNames.map((name) => <span key={name}>{name}</span>)}
                </div>
                <button type="button" className="backButton changeProviderButton" onClick={clearSelectedProvider}>
                  Change provider
                </button>
              </article>

              <article className="directPanel clientPanel">
                <p className="panelLabel">Your request</p>
                <h1>Send your request</h1>

                {!currentUserId ? (
                  <div className="loginLockBox">
                    <p>You can browse providers freely. Sign in only when you are ready to send the request.</p>
                    <div className="loginLockActions">
                      <button type="button" className="nextButton" onClick={requestLogin}>Sign in</button>
                      <Link href="/register" className="backButton">Create account</Link>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={submitProviderRequest} className="providerRequestForm">
                    <label className="requestServiceField">
                      <span>Service symbol</span>
                      <select value={effectiveRequestCategoryId} onChange={(event) => setRequestCategoryId(event.target.value)}>
                        {selectedProvider.categoryIds.map((categoryId) => {
                          const category = categoryById.get(categoryId);
                          return category ? (
                            <option value={category.id} key={category.id}>{getServiceIcon(category)} {category.name}</option>
                          ) : null;
                        })}
                      </select>
                    </label>

                    <div className="fieldGrid">
                      <input value={street} onChange={(event) => setStreet(event.target.value)} placeholder="Street" />
                      <input value={houseNumber} onChange={(event) => setHouseNumber(event.target.value)} placeholder="House number" />
                      <input value={city} onChange={(event) => setCity(event.target.value)} placeholder="City" />
                      <input value={postalCode} onChange={(event) => setPostalCode(event.target.value)} placeholder="Postal code" />
                    </div>

                    <div className="fieldGrid directTimeGrid">
                      <input value={preferredDate} onChange={(event) => setPreferredDate(event.target.value)} type="date" />
                      <input value={preferredTime} onChange={(event) => setPreferredTime(event.target.value)} type="time" />
                      <input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="Phone optional" />
                      <input
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        placeholder={accountEmail ? `Email optional (${accountEmail})` : 'Email optional'}
                        type="email"
                      />
                    </div>

                    <textarea
                      value={projectDescription}
                      onChange={(event) => setProjectDescription(event.target.value)}
                      placeholder="Describe the requested service"
                      maxLength={2000}
                    />

                    {warning ? <p className="warningBox">{warning}</p> : null}

                    <div className="bottomActions">
                      <button type="button" className="backButton" onClick={clearSelectedProvider}>Change provider</button>
                      <button type="submit" className="nextButton" disabled={submitting}>
                        {submitting ? 'Sending request...' : 'Send request'}
                      </button>
                    </div>
                  </form>
                )}
              </article>
            </section>
          )}
        </section>
      ) : null}

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


  .providerDirectoryShell {
    width: min(1160px, calc(100% - 32px));
    margin: 34px auto 54px;
  }

  .directoryServiceHead {
    justify-content: flex-start;
    align-items: flex-start;
    border: 1px solid var(--sendio-border);
    border-radius: 18px;
    background: var(--sendio-card-bg);
    padding: 18px;
  }

  .directoryServiceHead h1 {
    margin: 0;
    font-size: clamp(27px, 5vw, 42px);
    line-height: 1.05;
    letter-spacing: -0.04em;
  }

  .directoryServiceHead p {
    margin: 8px 0 0;
    color: var(--sendio-muted);
    font-size: 13px;
    line-height: 1.5;
  }

  .providerFilters {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 10px;
    margin: 18px 0 12px;
  }

  .providerCountRow {
    display: flex;
    align-items: baseline;
    gap: 7px;
    color: var(--sendio-muted);
    font-size: 13px;
    font-weight: 800;
  }

  .providerCountRow strong {
    color: var(--sendio-text);
    font-size: 22px;
  }

  .providerSelectionGrid {
    margin-top: 18px;
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 14px;
  }

  .providerChoiceCard {
    display: grid;
    grid-template-columns: 142px minmax(0, 1fr);
    gap: 13px;
    border: 1px solid var(--sendio-border);
    border-radius: 16px;
    background: var(--sendio-card-bg);
    padding: 11px;
    transition: border-color 0.18s ease, transform 0.18s ease;
  }

  .providerChoiceCard:hover,
  .providerChoiceCardSelected {
    border-color: var(--sendio-button-bg);
    transform: translateY(-1px);
  }

  .providerChoiceImage {
    min-height: 152px;
    border-radius: 13px;
    background-color: var(--sendio-rectangle-bg);
    background-size: cover;
    background-position: center;
    color: var(--sendio-button-bg);
    display: flex;
    align-items: center;
    justify-content: center;
    text-decoration: none;
    font-size: 40px;
    font-weight: 950;
  }

  .providerChoiceBody {
    min-width: 0;
    display: grid;
    align-content: start;
    gap: 8px;
  }

  .providerChoiceTitle {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 9px;
  }

  .providerChoiceTitle a {
    color: var(--sendio-text);
    text-decoration: none;
    font-size: 17px;
    font-weight: 950;
  }

  .providerChoiceTitle span {
    border: 1px solid var(--sendio-border);
    border-radius: 999px;
    background: var(--sendio-rectangle-bg);
    padding: 5px 8px;
    font-size: 10px;
    font-weight: 900;
  }

  .providerChoiceBody > p {
    margin: 0;
    color: var(--sendio-muted);
    font-size: 12px;
    line-height: 1.45;
    font-weight: 700;
  }

  .providerChoiceMeta,
  .providerCategoryChips {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .providerChoiceMeta span,
  .providerCategoryChips span {
    border: 1px solid var(--sendio-border);
    border-radius: 999px;
    background: var(--sendio-rectangle-bg);
    color: var(--sendio-muted);
    padding: 5px 8px;
    font-size: 10px;
    font-weight: 800;
  }

  .providerCategoryChips span {
    color: var(--sendio-text);
  }

  .providerChoiceActions {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }

  .providerChoiceActions .backButton,
  .providerChoiceActions .nextButton {
    min-height: 36px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    text-decoration: none;
    font-size: 11px;
  }

  .tinyActions button {
    width: 24px;
    height: 24px;
    border: 0;
    border-radius: 50%;
    background: var(--sendio-button-bg);
    color: var(--sendio-text);
    font-size: 11px;
    font-weight: 950;
    cursor: pointer;
  }

  .selectedRequestShell {
    scroll-margin-top: 20px;
  }

  .providerCategoryChipsLarge {
    margin-top: 14px;
  }

  .changeProviderButton {
    width: 100%;
    margin-top: 16px;
  }

  .providerRequestForm {
    display: grid;
    gap: 12px;
  }

  .requestServiceField {
    display: grid;
    gap: 7px;
  }

  .requestServiceField > span {
    color: var(--sendio-muted);
    font-size: 11px;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  .requestSuccessBox {
    border: 1px solid var(--sendio-border);
    border-radius: 18px;
    background: var(--sendio-card-bg);
    padding: 28px;
    text-align: center;
  }

  .requestSuccessBox > span {
    font-size: 42px;
  }

  .requestSuccessBox h1 {
    margin: 12px 0 8px;
  }

  .requestSuccessBox p {
    color: var(--sendio-muted);
    line-height: 1.5;
  }

  .successActions {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
    margin-top: 18px;
  }

  .successActions a,
  .successActions button {
    min-height: 46px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    text-decoration: none;
  }

  @media (max-width: 900px) {
    .providerFilters,
    .providerSelectionGrid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (max-width: 620px) {
    .providerFilters,
    .providerSelectionGrid,
    .providerChoiceActions,
    .successActions {
      grid-template-columns: 1fr;
    }

    .providerChoiceCard {
      grid-template-columns: 96px minmax(0, 1fr);
    }

    .providerChoiceImage {
      min-height: 112px;
    }
  }

`;