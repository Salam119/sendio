'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import PlatformNotice from '@/components/site/PlatformNotice';
import { supabase } from '@/lib/supabase';

type RequestStatus = string | null;

type ServiceRequestRow = {
  id: string;
  service_category_id: string | null;
  service_name: string | null;
  service_slug: string | null;
  client_id: string | null;
  selected_provider_type: 'company' | 'worker' | null;
  selected_company_id: string | null;
  selected_worker_id: string | null;
  phone: string | null;
  city: string | null;
  postal_code: string | null;
  street: string | null;
  house_number: string | null;
  preferred_date: string | null;
  preferred_time: string | null;
  preferred_time_window: string | null;
  project_description: string | null;
  status: RequestStatus;
  submitted_at: string | null;
  created_at: string | null;
  cancelled_reason: string | null;
};

type ServiceRequestMatchRow = {
  id: string;
  request_id: string | null;
  provider_type: 'company' | 'worker' | null;
  company_id: string | null;
  worker_id: string | null;
  status: RequestStatus;
  created_at: string | null;
};

type CompanyRow = {
  id: string;
  name: string | null;
  slug: string | null;
  logo: string | null;
  city: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  status: string | null;
};

type WorkerRow = {
  id: string;
  name: string | null;
  slug: string | null;
  avatar: string | null;
  city: string | null;
  phone: string | null;
  email: string | null;
  status: string | null;
};

type ServiceCategoryRow = {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
};

type ProviderInfo = {
  id: string;
  kind: 'company' | 'worker';
  name: string;
  slug: string;
  image: string | null;
  city: string;
  address: string;
  phone: string | null;
  email: string | null;
  status: string;
};

type ClientRequestItem = ServiceRequestRow & {
  match: ServiceRequestMatchRow | null;
  provider: ProviderInfo | null;
  category: ServiceCategoryRow | null;
};

type ClientActivityRow = {
  id: string;
  title: string;
  body: string | null;
  event_type: string;
  target_url: string;
  metadata: Record<string, unknown> | null;
  is_seen: boolean;
  is_archived: boolean | null;
  created_at: string;
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
  toilet: '🚽',
  faucet: '🚰',
  bulb: '💡',
  plug: '🔌',
  fan: '🌀',
  camera: '📷',
  paint: '🖌️',
  truck: '🚚',
  box: '📦',
  tree: '🌳',
  leaf: '🍃',
  scissors: '✂️',
  hammer: '🔨',
  key: '🔑',
  roof: '🏠',
  chimney: '🏚️',
  bug: '🐞',
  floor: '🧱',
  tile: '▦',
  kitchen: '🍽️',
  water: '💧',
  cabinet: '🗄️',
  store: '🏪',
  phone: '📱',
  computer: '💻',
  printer: '🖨️',
};

function getServiceIcon(category: ServiceCategoryRow | null) {
  const icon = category?.icon?.trim().toLowerCase();

  if (!icon) {
    return '🧰';
  }

  return SERVICE_ICON_MAP[icon] ?? category?.icon ?? '🧰';
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

function getProviderHref(provider: ProviderInfo) {
  return provider.kind === 'company' ? `/companies/${provider.slug}` : `/workers/${provider.slug}`;
}

function getAddressLine(request: ServiceRequestRow) {
  return [request.street, request.house_number, request.postal_code, request.city]
    .filter(Boolean)
    .join(' ');
}

function getLocationHref(request: ServiceRequestRow) {
  const address = getAddressLine(request);

  if (!address) {
    return '';
  }

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${address} Belgium`)}`;
}

function formatDateTime(value: string | null) {
  if (!value) {
    return 'No date';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatPreferredTime(request: ServiceRequestRow) {
  const pieces = [
    request.preferred_date,
    request.preferred_time || request.preferred_time_window,
  ].filter(Boolean);

  return pieces.length > 0 ? pieces.join(' • ') : 'Flexible';
}

function normalizeStatus(value: RequestStatus) {
  return value?.replaceAll('_', ' ') || 'pending';
}

function getRequestTone(status: RequestStatus) {
  const normalized = status?.toLowerCase() ?? '';

  if (normalized.includes('accepted') || normalized.includes('completed')) {
    return 'good';
  }

  if (normalized.includes('declined') || normalized.includes('cancelled')) {
    return 'danger';
  }

  if (normalized.includes('viewed')) {
    return 'info';
  }

  return 'neutral';
}

function canCancelRequest(request: ClientRequestItem) {
  const requestStatus = request.status?.toLowerCase() ?? '';
  const matchStatus = request.match?.status?.toLowerCase() ?? '';

  return ![requestStatus, matchStatus].some(
    (status) =>
      status.includes('cancelled') ||
      status.includes('completed') ||
      status.includes('accepted')
  );
}

function canReviewRequest(request: ClientRequestItem) {
  const requestStatus = request.status?.toLowerCase() ?? '';
  const matchStatus = request.match?.status?.toLowerCase() ?? '';

  return requestStatus.includes('completed') || matchStatus.includes('completed');
}

function canComplainAboutRequest(request: ClientRequestItem) {
  return Boolean(request.provider);
}

export default function ClientsPage() {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [logoutConfirmSource, setLogoutConfirmSource] = useState<'hero' | 'menu' | ''>('');
  const [loggingOut, setLoggingOut] = useState(false);
  const [currentUserEmail, setCurrentUserEmail] = useState('');
  const [currentUserId, setCurrentUserId] = useState('');
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<ClientRequestItem[]>([]);
  const [activities, setActivities] = useState<ClientActivityRow[]>([]);
  const [archivedActivities, setArchivedActivities] = useState<ClientActivityRow[]>([]);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [archiveLoading, setArchiveLoading] = useState(false);
  const [activityActionId, setActivityActionId] = useState('');
  const [activitySectionOpen, setActivitySectionOpen] = useState(false);
  const [expandedActivityId, setExpandedActivityId] = useState('');
  const [expandedRequestId, setExpandedRequestId] = useState('');
  const [showAllActivities, setShowAllActivities] = useState(false);
  const [showAllRequests, setShowAllRequests] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState('');
  const [deleteAllArchiveConfirm, setDeleteAllArchiveConfirm] = useState(false);
  const [deletingAllArchive, setDeletingAllArchive] = useState(false);
  const [warning, setWarning] = useState('');
  const [notice, setNotice] = useState('');
  const [cancellingId, setCancellingId] = useState('');
  const [complaintActionId, setComplaintActionId] = useState('');
  const [reviewActionId, setReviewActionId] = useState('');
  const [complaintsSupported, setComplaintsSupported] = useState(false);
  const [companyVerifiedReviewsSupported, setCompanyVerifiedReviewsSupported] = useState(false);
  const [workerVerifiedReviewsSupported, setWorkerVerifiedReviewsSupported] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadClientRequests() {
      setLoading(true);
      setWarning('');
      setNotice('');

      const { data: userData, error: userError } = await supabase.auth.getUser();
      const user = userData.user;

      if (!active) {
        return;
      }

      if (userError) {
        setWarning(userError.message);
      }

      if (!user) {
        setCurrentUserEmail('');
        setCurrentUserId('');
        setRequests([]);
        setActivities([]);
        setLoading(false);
        return;
      }

      setCurrentUserEmail(user.email ?? '');
      setCurrentUserId(user.id);

      const [
        complaintsCapability,
        companyReviewsCapability,
        workerReviewsCapability,
      ] = await Promise.all([
        supabase.from('request_complaints').select('id').limit(1),
        supabase
          .from('company_reviews')
          .select('id, request_id, service_category_id, is_verified')
          .limit(1),
        supabase
          .from('worker_reviews')
          .select('id, request_id, service_category_id, is_verified')
          .limit(1),
      ]);

      if (!active) {
        return;
      }

      setComplaintsSupported(!complaintsCapability.error);
      setCompanyVerifiedReviewsSupported(!companyReviewsCapability.error);
      setWorkerVerifiedReviewsSupported(!workerReviewsCapability.error);

      const { data: activityRows, error: activitiesError } = await supabase
        .from('sendio_notifications')
        .select('id, title, body, event_type, target_url, metadata, is_seen, is_archived, created_at')
        .eq('recipient_id', user.id)
        .eq('is_archived', false)
        .order('created_at', { ascending: false })
        .limit(50);

      if (!active) {
        return;
      }

      if (activitiesError) {
        setWarning(activitiesError.message);
        setActivities([]);
      } else {
        setActivities((activityRows ?? []) as ClientActivityRow[]);
      }

      const { data: requestRows, error: requestError } = await supabase
        .from('service_requests')
        .select(
          'id, service_category_id, service_name, service_slug, client_id, selected_provider_type, selected_company_id, selected_worker_id, phone, city, postal_code, street, house_number, preferred_date, preferred_time, preferred_time_window, project_description, status, submitted_at, created_at, cancelled_reason'
        )
        .eq('client_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (!active) {
        return;
      }

      if (requestError) {
        setWarning(requestError.message);
        setRequests([]);
        setLoading(false);
        return;
      }

      const safeRequests = (requestRows ?? []) as ServiceRequestRow[];

      if (safeRequests.length === 0) {
        setRequests([]);
        setLoading(false);
        return;
      }

      const requestIds = safeRequests.map((request) => request.id);

      const { data: matchRows, error: matchesError } = await supabase
        .from('service_request_matches')
        .select('id, request_id, provider_type, company_id, worker_id, status, created_at')
        .in('request_id', requestIds)
        .order('created_at', { ascending: true });

      if (!active) {
        return;
      }

      if (matchesError) {
        setWarning(matchesError.message);
      }

      const safeMatches = (matchRows ?? []) as ServiceRequestMatchRow[];
      const matchByRequestId = new Map<string, ServiceRequestMatchRow>();

      safeMatches.forEach((match) => {
        if (match.request_id && !matchByRequestId.has(match.request_id)) {
          matchByRequestId.set(match.request_id, match);
        }
      });

      const serviceCategoryIds = Array.from(
        new Set(
          safeRequests
            .map((request) => request.service_category_id)
            .filter(Boolean) as string[]
        )
      );

      const companyIds = Array.from(
        new Set(
          safeRequests
            .map((request) => request.selected_company_id)
            .concat(safeMatches.map((match) => match.company_id))
            .filter(Boolean) as string[]
        )
      );

      const workerIds = Array.from(
        new Set(
          safeRequests
            .map((request) => request.selected_worker_id)
            .concat(safeMatches.map((match) => match.worker_id))
            .filter(Boolean) as string[]
        )
      );

      const [companiesResult, workersResult, categoriesResult] = await Promise.all([
        companyIds.length > 0
          ? supabase
              .from('companies')
              .select('id, name, slug, logo, city, address, phone, email, status')
              .in('id', companyIds)
          : Promise.resolve({ data: [] as CompanyRow[], error: null }),
        workerIds.length > 0
          ? supabase
              .from('workers')
              .select('id, name, slug, avatar, city, phone, email, status')
              .in('id', workerIds)
          : Promise.resolve({ data: [] as WorkerRow[], error: null }),
        serviceCategoryIds.length > 0
          ? supabase
              .from('service_categories')
              .select('id, name, slug, icon')
              .in('id', serviceCategoryIds)
          : Promise.resolve({ data: [] as ServiceCategoryRow[], error: null }),
      ]);

      if (!active) {
        return;
      }

      if (companiesResult.error) {
        setWarning(companiesResult.error.message);
      }

      if (workersResult.error) {
        setWarning(workersResult.error.message);
      }

      if (categoriesResult.error) {
        setWarning(categoriesResult.error.message);
      }

      const companyMap = new Map<string, ProviderInfo>();
      const categoryMap = new Map<string, ServiceCategoryRow>();
      const workerMap = new Map<string, ProviderInfo>();

      ((companiesResult.data ?? []) as CompanyRow[]).forEach((company) => {
        companyMap.set(company.id, {
          id: company.id,
          kind: 'company',
          name: company.name || 'Company',
          slug: company.slug || company.id,
          image: company.logo,
          city: company.city || '',
          address: company.address || '',
          phone: company.phone,
          email: company.email,
          status: company.status || 'available',
        });
      });

      ((workersResult.data ?? []) as WorkerRow[]).forEach((worker) => {
        workerMap.set(worker.id, {
          id: worker.id,
          kind: 'worker',
          name: worker.name || 'Worker',
          slug: worker.slug || worker.id,
          image: worker.avatar,
          city: worker.city || '',
          address: '',
          phone: worker.phone,
          email: worker.email,
          status: worker.status || 'available',
        });
      });

      ((categoriesResult.data ?? []) as ServiceCategoryRow[]).forEach((category) => {
        categoryMap.set(category.id, category);
      });

      const items = safeRequests.map((request) => {
        const match = matchByRequestId.get(request.id) ?? null;
        const companyId = request.selected_company_id || match?.company_id || '';
        const workerId = request.selected_worker_id || match?.worker_id || '';

        return {
          ...request,
          match,
          provider: companyId ? companyMap.get(companyId) ?? null : workerMap.get(workerId) ?? null,
          category: request.service_category_id
            ? categoryMap.get(request.service_category_id) ?? null
            : null,
        };
      });

      setRequests(items);
      setLoading(false);
    }

    loadClientRequests();

    return () => {
      active = false;
    };
  }, []);

  const requestCounts = useMemo(() => {
    const accepted = requests.filter((request) => {
      const requestStatus = request.status?.toLowerCase() ?? '';
      const matchStatus = request.match?.status?.toLowerCase() ?? '';

      return requestStatus.includes('accepted') || matchStatus.includes('accepted');
    }).length;

    const pending = requests.filter((request) => {
      const requestStatus = request.status?.toLowerCase() ?? '';
      const matchStatus = request.match?.status?.toLowerCase() ?? '';

      return (
        !requestStatus.includes('cancelled') &&
        !requestStatus.includes('completed') &&
        !requestStatus.includes('declined') &&
        !matchStatus.includes('accepted') &&
        !matchStatus.includes('declined')
      );
    }).length;

    const closed = requests.filter((request) => {
      const requestStatus = request.status?.toLowerCase() ?? '';
      const matchStatus = request.match?.status?.toLowerCase() ?? '';

      return (
        requestStatus.includes('cancelled') ||
        requestStatus.includes('completed') ||
        requestStatus.includes('declined') ||
        matchStatus.includes('declined')
      );
    }).length;

    return {
      total: requests.length,
      accepted,
      pending,
      closed,
    };
  }, [requests]);

  async function handleLogout() {
    if (loggingOut) {
      return;
    }

    setLoggingOut(true);
    setWarning('');

    const { error } = await supabase.auth.signOut();

    if (error) {
      setWarning(error.message);
      setLoggingOut(false);
      return;
    }

    setLogoutConfirmSource('');
    router.push('/login');
  }

  async function cancelRequest(requestId: string) {
    if (!currentUserId) {
      return;
    }

    const confirmed = window.confirm('Cancel this request?');

    if (!confirmed) {
      return;
    }

    const optionalReason = window.prompt(
      'Optional: add a short cancellation reason.',
      ''
    );

    if (optionalReason === null) {
      return;
    }

    const cancellationReason =
      optionalReason.trim() ||
      'Client cancelled the request from the clients page.';

    setCancellingId(requestId);
    setWarning('');
    setNotice('');

    const { error: requestError } = await supabase
      .from('service_requests')
      .update({
        status: 'cancelled',
        cancelled_reason: cancellationReason,
      })
      .eq('id', requestId)
      .eq('client_id', currentUserId);

    if (requestError) {
      setWarning(requestError.message);
      setCancellingId('');
      return;
    }

    const { error: matchesError } = await supabase
      .from('service_request_matches')
      .update({ status: 'cancelled' })
      .eq('request_id', requestId);

    if (matchesError) {
      setWarning(matchesError.message);
    }

    setRequests((current) =>
      current.map((request) =>
        request.id === requestId
          ? {
              ...request,
              status: 'cancelled',
              cancelled_reason: cancellationReason,
              match: request.match
                ? { ...request.match, status: 'cancelled' }
                : request.match,
            }
          : request
      )
    );

    setNotice('Your request was cancelled.');
    setCancellingId('');
  }

  async function submitComplaint(request: ClientRequestItem) {
    if (
      !currentUserId ||
      !request.provider ||
      !complaintsSupported ||
      complaintActionId
    ) {
      return;
    }

    const complaintType = window.prompt(
      'Complaint type, for example: no show, delay, service quality, price, conduct, or other.',
      'other'
    );

    if (complaintType === null) {
      return;
    }

    const description = window.prompt(
      'Describe the complaint clearly.',
      ''
    );

    if (description === null) {
      return;
    }

    const cleanDescription = description.trim();

    if (cleanDescription.length < 10) {
      setWarning('Please add at least 10 characters describing the complaint.');
      return;
    }

    setComplaintActionId(request.id);
    setWarning('');
    setNotice('');

    const { data: existingComplaint, error: existingComplaintError } =
      await supabase
        .from('request_complaints')
        .select('id, status')
        .eq('request_id', request.id)
        .eq('client_id', currentUserId)
        .in('status', ['open', 'under_review'])
        .limit(1)
        .maybeSingle();

    if (existingComplaintError) {
      setWarning(existingComplaintError.message);
      setComplaintActionId('');
      return;
    }

    if (existingComplaint) {
      setWarning('An open complaint already exists for this request.');
      setComplaintActionId('');
      return;
    }

    const { error } = await supabase.from('request_complaints').insert({
      request_id: request.id,
      request_source: 'service_requests',
      client_id: currentUserId,
      provider_type: request.provider.kind,
      provider_id: request.provider.id,
      service_category_id: request.service_category_id,
      complaint_type: complaintType.trim() || 'other',
      description: cleanDescription,
      status: 'open',
    });

    if (error) {
      setWarning(error.message);
      setComplaintActionId('');
      return;
    }

    setNotice('Your complaint was submitted to Sendio for review.');
    setComplaintActionId('');
  }

  async function submitVerifiedReview(request: ClientRequestItem) {
    if (!currentUserId || !request.provider || reviewActionId) {
      return;
    }

    const supported =
      request.provider.kind === 'company'
        ? companyVerifiedReviewsSupported
        : workerVerifiedReviewsSupported;

    if (!supported) {
      return;
    }

    const ratingInput = window.prompt('Rating from 1 to 5.', '5');

    if (ratingInput === null) {
      return;
    }

    const rating = Number(ratingInput);

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      setWarning('Rating must be a whole number from 1 to 5.');
      return;
    }

    const commentInput = window.prompt('Optional review comment.', '');

    if (commentInput === null) {
      return;
    }

    const table =
      request.provider.kind === 'company'
        ? 'company_reviews'
        : 'worker_reviews';

    setReviewActionId(request.id);
    setWarning('');
    setNotice('');

    const { data: existingReview, error: existingReviewError } = await supabase
      .from(table)
      .select('id')
      .eq('request_id', request.id)
      .eq('user_id', currentUserId)
      .limit(1)
      .maybeSingle();

    if (existingReviewError) {
      setWarning(existingReviewError.message);
      setReviewActionId('');
      return;
    }

    const reviewPayload = {
      user_name: currentUserEmail.split('@')[0] || 'Sendio Client',
      rating,
      comment: commentInput.trim() || null,
      request_id: request.id,
      service_category_id: request.service_category_id,
      is_verified: true,
    };

    const reviewResult = existingReview
      ? await supabase
          .from(table)
          .update(reviewPayload)
          .eq('id', existingReview.id)
          .eq('user_id', currentUserId)
      : await supabase.from(table).insert({
          ...(request.provider.kind === 'company'
            ? { company_id: request.provider.id }
            : { worker_id: request.provider.id }),
          user_id: currentUserId,
          ...reviewPayload,
        });

    if (reviewResult.error) {
      setWarning(reviewResult.error.message);
      setReviewActionId('');
      return;
    }

    setNotice(
      existingReview
        ? 'Your verified review was updated.'
        : 'Your verified review was added.'
    );
    setReviewActionId('');
  }

  function getActivityProviderHref(activity: ClientActivityRow) {
    const metadata = activity.metadata ?? {};
    const providerType =
      typeof metadata.provider_type === 'string'
        ? metadata.provider_type
        : typeof metadata.recipient_type === 'string'
          ? metadata.recipient_type
          : '';

    const companySlug =
      typeof metadata.company_slug === 'string' ? metadata.company_slug : '';
    const workerSlug =
      typeof metadata.worker_slug === 'string' ? metadata.worker_slug : '';
    const companyId =
      typeof metadata.company_id === 'string' ? metadata.company_id : '';
    const workerId =
      typeof metadata.worker_id === 'string' ? metadata.worker_id : '';

    if (providerType === 'company' && (companySlug || companyId)) {
      return `/companies/${companySlug || companyId}`;
    }

    if (providerType === 'worker' && (workerSlug || workerId)) {
      return `/workers/${workerSlug || workerId}`;
    }

    if (companySlug || companyId) {
      return `/companies/${companySlug || companyId}`;
    }

    if (workerSlug || workerId) {
      return `/workers/${workerSlug || workerId}`;
    }

    return '';
  }

  async function openArchive() {
    if (!currentUserId || archiveLoading) {
      return;
    }

    setArchiveOpen(true);
    setArchiveLoading(true);
    setDeleteConfirmId('');
    setDeleteAllArchiveConfirm(false);
    setWarning('');

    const { data, error } = await supabase
      .from('sendio_notifications')
      .select('id, title, body, event_type, target_url, metadata, is_seen, is_archived, created_at')
      .eq('recipient_id', currentUserId)
      .eq('is_archived', true)
      .order('created_at', { ascending: false });

    if (error) {
      setWarning(error.message);
      setArchivedActivities([]);
      setArchiveLoading(false);
      return;
    }

    setArchivedActivities((data ?? []) as ClientActivityRow[]);
    setArchiveLoading(false);
  }

  function closeArchive() {
    setArchiveOpen(false);
    setDeleteConfirmId('');
    setDeleteAllArchiveConfirm(false);
    setExpandedActivityId('');
  }

  async function archiveActivity(activityId: string) {
    if (!currentUserId) return;

    setActivityActionId(activityId);
    setWarning('');

    const activityToArchive = activities.find((activity) => activity.id === activityId) ?? null;

    const { error } = await supabase
      .from('sendio_notifications')
      .update({ is_archived: true, is_seen: true, seen_at: new Date().toISOString() })
      .eq('id', activityId)
      .eq('recipient_id', currentUserId);

    if (error) {
      setWarning(error.message);
      setActivityActionId('');
      return;
    }

    setActivities((current) => current.filter((activity) => activity.id !== activityId));

    if (activityToArchive) {
      setArchivedActivities((current) => [
        { ...activityToArchive, is_archived: true, is_seen: true },
        ...current.filter((activity) => activity.id !== activityId),
      ]);
    }

    setDeleteConfirmId('');
    setExpandedActivityId((current) => (current === activityId ? '' : current));
    setActivityActionId('');
  }

  async function restoreActivity(activityId: string) {
    if (!currentUserId) return;

    setActivityActionId(activityId);
    setWarning('');

    const activityToRestore =
      archivedActivities.find((activity) => activity.id === activityId) ?? null;

    const { error } = await supabase
      .from('sendio_notifications')
      .update({ is_archived: false })
      .eq('id', activityId)
      .eq('recipient_id', currentUserId);

    if (error) {
      setWarning(error.message);
      setActivityActionId('');
      return;
    }

    setArchivedActivities((current) =>
      current.filter((activity) => activity.id !== activityId)
    );

    if (activityToRestore) {
      setActivities((current) => [
        { ...activityToRestore, is_archived: false },
        ...current.filter((activity) => activity.id !== activityId),
      ]);
    }

    setDeleteConfirmId('');
    setExpandedActivityId((current) => (current === activityId ? '' : current));
    setActivityActionId('');
  }

  async function deleteActivity(
    activityId: string,
    source: 'active' | 'archive'
  ) {
    if (!currentUserId) return;

    setActivityActionId(activityId);
    setWarning('');

    const { error } = await supabase
      .from('sendio_notifications')
      .delete()
      .eq('id', activityId)
      .eq('recipient_id', currentUserId);

    if (error) {
      setWarning(error.message);
      setActivityActionId('');
      return;
    }

    if (source === 'archive') {
      setArchivedActivities((current) =>
        current.filter((activity) => activity.id !== activityId)
      );
    } else {
      setActivities((current) =>
        current.filter((activity) => activity.id !== activityId)
      );
    }

    setDeleteConfirmId('');
    setExpandedActivityId((current) => (current === activityId ? '' : current));
    setActivityActionId('');
  }

  async function deleteAllArchivedActivities() {
    if (!currentUserId || deletingAllArchive) {
      return;
    }

    setDeletingAllArchive(true);
    setWarning('');

    const { error } = await supabase
      .from('sendio_notifications')
      .delete()
      .eq('recipient_id', currentUserId)
      .eq('is_archived', true);

    if (error) {
      setWarning(error.message);
      setDeletingAllArchive(false);
      return;
    }

    setArchivedActivities([]);
    setDeleteConfirmId('');
    setDeleteAllArchiveConfirm(false);
    setExpandedActivityId('');
    setDeletingAllArchive(false);
    setNotice('The activity archive was deleted permanently.');
  }

  const visibleActivities = showAllActivities ? activities : activities.slice(0, 3);
  const visibleRequests = showAllRequests ? requests : requests.slice(0, 3);

  return (
    <main className="clientsPage">
      <header className="clientTopBar">
        <Link href="/" className="sendioMiniLogo">
          Sendio
        </Link>

        <div className="clientTopActions">
          <Link href="/" className="accountLink">
            Home
          </Link>

          {currentUserId ? (
            <span className="clientEmail">{currentUserEmail || 'Client account'}</span>
          ) : (
            <Link href="/login?redirectTo=/clients" className="accountLink">
              Login
            </Link>
          )}

          <button
            type="button"
            className="menuButton"
            aria-label="Open menu"
            onClick={() => setMenuOpen(true)}
          >
            ☰
          </button>
        </div>
      </header>

      {menuOpen ? (
        <div className="menuLayer">
          <button
            type="button"
            className="menuShade"
            aria-label="Close menu"
            onClick={() => setMenuOpen(false)}
          />

          <aside className="sideMenu">
            <div className="menuHead">
              <strong>Sendio</strong>

              <button
                type="button"
                className="menuClose"
                onClick={() => setMenuOpen(false)}
              >
                ×
              </button>
            </div>

            <nav className="menuLinks">
              <Link href="/services">Services</Link>
              <Link href="/contact">Help</Link>
              {currentUserId ? (
                <div className="menuLogoutArea">
                  <button
                    type="button"
                    className="menuLogoutButton"
                    onClick={() =>
                      setLogoutConfirmSource((current) =>
                        current === 'menu' ? '' : 'menu'
                      )
                    }
                  >
                    Logout
                  </button>

                  {logoutConfirmSource === 'menu' ? (
                    <div className="logoutConfirm menuLogoutConfirm">
                      <strong>Do you want to log out?</strong>
                      <button
                        type="button"
                        onClick={() => setLogoutConfirmSource('')}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        className="confirmLogoutButton"
                        onClick={handleLogout}
                        disabled={loggingOut}
                      >
                        {loggingOut ? 'Logging out...' : 'Yes, logout'}
                      </button>
                    </div>
                  ) : null}
                </div>
              ) : (
                <Link href="/register">Create Account</Link>
              )}
            </nav>
          </aside>
        </div>
      ) : null}

      <section className="hero">
        <div className="heroContent">
          <p className="eyebrow">SENDIO CLIENTS</p>

          <h1>{currentUserId ? 'My service requests.' : 'Find the right provider faster.'}</h1>

          <p className="intro">
            {currentUserId
              ? 'Track your real Sendio service requests, provider responses, address details, and contact actions in one place.'
              : 'Browse services and public providers freely. Sign in when you want to send a request, contact a provider, or manage your request history.'}
          </p>

          <div className="heroActions">
            <Link href="/services" className="primaryButton">
              Browse Services
            </Link>

            {currentUserId ? (
              <div className="logoutControl">
                <button
                  type="button"
                  className="secondaryButton logoutButton"
                  onClick={() =>
                    setLogoutConfirmSource((current) =>
                      current === 'hero' ? '' : 'hero'
                    )
                  }
                >
                  Logout
                </button>

                {logoutConfirmSource === 'hero' ? (
                  <div className="logoutConfirm">
                    <strong>Do you want to log out?</strong>
                    <button
                      type="button"
                      onClick={() => setLogoutConfirmSource('')}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="confirmLogoutButton"
                      onClick={handleLogout}
                      disabled={loggingOut}
                    >
                      {loggingOut ? 'Logging out...' : 'Yes, logout'}
                    </button>
                  </div>
                ) : null}
              </div>
            ) : (
              <Link href="/register" className="secondaryButton">
                Create Client Account
              </Link>
            )}
          </div>
        </div>

        <aside className="safetyMiniCard" aria-label="Sendio client safety support">
          <span className="safetyIcon" aria-hidden="true">🛡</span>
          <div>
            <strong>Your safety matters to us</strong>
            <p>
              If you face inappropriate behavior or unwanted contact, report it to Sendio.
              We are here to support you.
            </p>
            <a href="mailto:info@sendio.be?subject=Sendio%20support%20or%20complaint">
              info@sendio.be
            </a>
          </div>
        </aside>
      </section>

      <PlatformNotice compact />

      {warning ? <p className="warningBox">{warning}</p> : null}
      {notice ? <p className="noticeBox">{notice}</p> : null}

      {loading ? (
        <section className="section">
          <h2>Loading your requests...</h2>
        </section>
      ) : currentUserId ? (
        <>
          <section className="summaryGrid">
            <article>
              <span>Total</span>
              <strong>{requestCounts.total}</strong>
            </article>

            <article>
              <span>Pending</span>
              <strong>{requestCounts.pending}</strong>
            </article>

            <article>
              <span>Accepted</span>
              <strong>{requestCounts.accepted}</strong>
            </article>

            <article>
              <span>Closed</span>
              <strong>{requestCounts.closed}</strong>
            </article>
          </section>

          <section
            className={`section activitySection ${
              activitySectionOpen ? 'activitySectionOpen' : 'activitySectionClosed'
            }`}
          >
            <button
              type="button"
              className="activitySectionToggle"
              aria-expanded={activitySectionOpen}
              onClick={() => {
                setActivitySectionOpen((current) => {
                  const next = !current;

                  if (!next) {
                    setExpandedActivityId('');
                    setDeleteConfirmId('');
                    setShowAllActivities(false);
                  }

                  return next;
                });
              }}
            >
              <span className="activitySectionIcon" aria-hidden="true">✉</span>

              <span className="activitySectionSummary">
                <strong>Contact and request updates</strong>
                <span>
                  {activities.length > 0
                    ? `${activities.length} active update${activities.length === 1 ? '' : 's'}`
                    : 'No active updates'}
                </span>
              </span>

              <span className="activitySectionChevron" aria-hidden="true">
                {activitySectionOpen ? '⌃' : '⌄'}
              </span>
            </button>

            {activitySectionOpen ? (
              <div className="activitySectionContent">
                {activities.length > 3 ? (
                  <div className="activitySectionControls">
                    <button
                      type="button"
                      className="smallControlButton"
                      onClick={() => setShowAllActivities((current) => !current)}
                    >
                      {showAllActivities ? 'Show latest only' : `View all (${activities.length})`}
                    </button>
                  </div>
                ) : null}

                {visibleActivities.length > 0 ? (
                  <div className="activityList">
                    {visibleActivities.map((activity) => {
                      const metadata = activity.metadata ?? {};
                      const providerName =
                        typeof metadata.provider_name === 'string'
                          ? metadata.provider_name
                          : typeof metadata.company_name === 'string'
                            ? metadata.company_name
                            : typeof metadata.worker_name === 'string'
                              ? metadata.worker_name
                              : '';
                      const providerType =
                        typeof metadata.provider_type === 'string'
                          ? metadata.provider_type
                          : '';
                      const activityExpanded = expandedActivityId === activity.id;
                      const deleteOpen = deleteConfirmId === activity.id;

                      return (
                        <article
                          className={`activityCard ${activityExpanded ? 'activityCardOpen' : ''} ${
                            activity.is_seen ? 'activitySeen' : 'activityNew'
                          }`}
                          key={activity.id}
                        >
                          <div className="activitySummaryRow">
                            <button
                              type="button"
                              className="activityToggle"
                              aria-expanded={activityExpanded}
                              onClick={() =>
                                setExpandedActivityId((current) =>
                                  current === activity.id ? '' : activity.id
                                )
                              }
                            >
                              <span className="activityDot" aria-hidden="true">●</span>
                              <span className="activitySummaryText">
                                <strong>{activity.title}</strong>
                                <span>{formatDateTime(activity.created_at)}</span>
                              </span>
                              <span className="foldChevron" aria-hidden="true">
                                {activityExpanded ? '⌃' : '⌄'}
                              </span>
                            </button>

                            <div className="activityActions">
                              {getActivityProviderHref(activity) ? (
                                <Link href={getActivityProviderHref(activity)}>
                                  Open provider
                                </Link>
                              ) : null}

                              <button
                                type="button"
                                onClick={() => archiveActivity(activity.id)}
                                disabled={activityActionId === activity.id}
                              >
                                {activityActionId === activity.id ? 'Archiving...' : 'Archive'}
                              </button>

                              <button
                                type="button"
                                className="deleteActivityButton"
                                onClick={() =>
                                  setDeleteConfirmId((current) =>
                                    current === activity.id ? '' : activity.id
                                  )
                                }
                                disabled={activityActionId === activity.id}
                              >
                                Delete
                              </button>
                            </div>
                          </div>

                          {deleteOpen ? (
                            <div className="inlineDeleteConfirm">
                              <strong>Delete permanently?</strong>
                              <button type="button" onClick={() => setDeleteConfirmId('')}>
                                Cancel
                              </button>
                              <button
                                type="button"
                                className="confirmDeleteButton"
                                onClick={() => deleteActivity(activity.id, 'active')}
                                disabled={activityActionId === activity.id}
                              >
                                {activityActionId === activity.id ? 'Deleting...' : 'Yes, delete'}
                              </button>
                            </div>
                          ) : null}

                          {activityExpanded ? (
                            <div className="activityDetails">
                              <p>
                                {activity.body ||
                                  (providerName
                                    ? `${providerName}${providerType ? ` (${providerType})` : ''}`
                                    : 'Sendio activity update')}
                              </p>
                            </div>
                          ) : null}
                        </article>
                      );
                    })}
                  </div>
                ) : (
                  <div className="compactEmptyState">
                    <strong>No active updates</strong>
                    <span>Your new contact and request updates will appear here.</span>
                  </div>
                )}
              </div>
            ) : null}
          </section>

          <section className="section requestsSection">
            <div className="sectionHeader compactSectionHeader">
              <div>
                <p className="sectionLabel">REAL REQUESTS</p>
                <h2>My requests</h2>
              </div>

              {requests.length > 3 ? (
                <button
                  type="button"
                  className="smallControlButton"
                  onClick={() => setShowAllRequests((current) => !current)}
                >
                  {showAllRequests ? 'Show latest only' : `View all (${requests.length})`}
                </button>
              ) : null}
            </div>

            {visibleRequests.length > 0 ? (
              <div className="requestList">
                {visibleRequests.map((request) => {
                  const provider = request.provider;
                  const locationHref = getLocationHref(request);
                  const whatsappHref = provider ? getWhatsappHref(provider.phone) : '';
                  const requestTone = getRequestTone(request.status);
                  const matchTone = getRequestTone(request.match?.status ?? null);
                  const serviceHref =
                    request.category?.slug || request.service_slug
                      ? `/services/${request.category?.slug || request.service_slug}`
                      : '';
                  const canUseVerifiedReview =
                    Boolean(provider) &&
                    canReviewRequest(request) &&
                    (provider?.kind === 'company'
                      ? companyVerifiedReviewsSupported
                      : workerVerifiedReviewsSupported);
                  const requestExpanded = expandedRequestId === request.id;

                  return (
                    <article
                      className={`requestCard ${requestExpanded ? 'requestCardOpen' : ''}`}
                      key={request.id}
                    >
                      <div className="requestCardHead requestSummaryHead">
                        <button
                          type="button"
                          className="requestToggle"
                          aria-expanded={requestExpanded}
                          onClick={() =>
                            setExpandedRequestId((current) =>
                              current === request.id ? '' : request.id
                            )
                          }
                        >
                          <span className="serviceIcon" aria-hidden="true">
                            {getServiceIcon(request.category)}
                          </span>
                          <span className="requestSummaryText">
                            <strong>
                              {request.category?.name ||
                                request.service_name ||
                                'Service request'}
                            </strong>
                            <span>
                              Sent {formatDateTime(request.submitted_at || request.created_at)}
                            </span>
                          </span>
                          <span className="foldChevron" aria-hidden="true">
                            {requestExpanded ? '⌃' : '⌄'}
                          </span>
                        </button>

                        <div className="badgeGroup">
                          <span className={`statusBadge ${requestTone}`}>
                            Request: {normalizeStatus(request.status)}
                          </span>

                          {request.match ? (
                            <span className={`statusBadge ${matchTone}`}>
                              Provider: {normalizeStatus(request.match.status)}
                            </span>
                          ) : null}
                        </div>
                      </div>

                      {requestExpanded ? (
                        <>
                          <div className="requestBody">
                            <div className="providerPanel">
                              {provider ? (
                                <>
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
                                    <span>{provider.kind === 'company' ? 'Company' : 'Worker'}</span>
                                    <span>{provider.city || 'Nearby area'}</span>
                                    <span>{provider.status}</span>
                                  </div>
                                </>
                              ) : (
                                <div className="providerMissing">
                                  <strong>Provider selection pending</strong>
                                  <span>Provider details will appear after a match is available.</span>
                                </div>
                              )}
                            </div>

                            <div className="detailsPanel">
                              <div>
                                <span>Address</span>
                                <strong>{getAddressLine(request) || 'No address saved'}</strong>
                              </div>

                              <div>
                                <span>Preferred time</span>
                                <strong>{formatPreferredTime(request)}</strong>
                              </div>

                              <div>
                                <span>Service identity</span>
                                <strong>
                                  {request.category?.name ||
                                    request.service_name ||
                                    'Not available'}
                                </strong>
                              </div>

                              <div>
                                <span>Client phone</span>
                                <strong>{request.phone || 'No phone added'}</strong>
                              </div>

                              <div>
                                <span>Request details</span>
                                <strong>{request.project_description || 'No description added'}</strong>
                              </div>

                              {request.cancelled_reason ? (
                                <div>
                                  <span>Cancellation reason</span>
                                  <strong>{request.cancelled_reason}</strong>
                                </div>
                              ) : null}
                            </div>
                          </div>

                          <div className="cardActions">
                            {serviceHref ? <Link href={serviceHref}>View service</Link> : null}
                            {provider ? <Link href={getProviderHref(provider)}>Open provider</Link> : null}

                            {locationHref ? (
                              <a href={locationHref} target="_blank" rel="noreferrer">
                                Location
                              </a>
                            ) : null}

                            {provider?.phone ? (
                              <a href={`tel:${cleanPhone(provider.phone)}`}>Call</a>
                            ) : null}

                            {whatsappHref ? (
                              <a href={whatsappHref} target="_blank" rel="noreferrer">
                                WhatsApp
                              </a>
                            ) : null}

                            {provider?.email ? <a href={`mailto:${provider.email}`}>Email</a> : null}

                            {complaintsSupported && canComplainAboutRequest(request) ? (
                              <button
                                type="button"
                                className="complaintButton"
                                onClick={() => submitComplaint(request)}
                                disabled={complaintActionId === request.id}
                              >
                                {complaintActionId === request.id
                                  ? 'Submitting...'
                                  : 'Submit complaint'}
                              </button>
                            ) : null}

                            {canUseVerifiedReview ? (
                              <button
                                type="button"
                                className="reviewButton"
                                onClick={() => submitVerifiedReview(request)}
                                disabled={reviewActionId === request.id}
                              >
                                {reviewActionId === request.id
                                  ? 'Saving...'
                                  : 'Rate provider'}
                              </button>
                            ) : null}

                            {canCancelRequest(request) ? (
                              <button
                                type="button"
                                className="cancelButton"
                                onClick={() => cancelRequest(request.id)}
                                disabled={cancellingId === request.id}
                              >
                                {cancellingId === request.id ? 'Cancelling...' : 'Cancel request'}
                              </button>
                            ) : null}
                          </div>
                        </>
                      ) : null}
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="emptyState">
                <h3>No service requests yet</h3>
                <p>Your real Sendio service requests will appear here after you send one.</p>

                <Link href="/services" className="primaryButton">
                  Browse Services
                </Link>
              </div>
            )}
          </section>

          <div className="archiveFooterLauncher">
            <button
              type="button"
              className="archiveToggleButton"
              aria-label="Open archive"
              title="Open archive"
              onClick={openArchive}
            >
              Archive
            </button>
          </div>
        </>
      ) : (
        <section className="section publicGrid">
          <article className="panel">
            <p className="sectionLabel">VISITOR ACCESS</p>
            <h2>Browse first, request after login.</h2>
            <p>
              Visitors can view services, companies, workers, ratings, and public profiles.
              Contact actions and service requests open only after login.
            </p>

            <Link href="/services" className="primaryButton">
              Browse Services
            </Link>
          </article>

          <article className="panel">
            <p className="sectionLabel">CLIENT ACCOUNT</p>
            <h2>Use a real account for requests.</h2>
            <p>
              Your request will be linked to your Sendio account and email, so providers
              can respond through a real request record.
            </p>

            <div className="inlineActions">
              <Link href="/login?redirectTo=/clients" className="primaryButton">
                Login
              </Link>

              <Link href="/register" className="secondaryLightButton">
                Create Account
              </Link>
            </div>
          </article>
        </section>
      )}

      {archiveOpen ? (
        <div className="archiveLayer" role="dialog" aria-modal="true" aria-label="Activity archive">
          <button
            type="button"
            className="archiveShade"
            aria-label="Close archive"
            onClick={closeArchive}
          />

          <section className="archivePanel">
            <header className="archiveHeader">
              <div>
                <p className="sectionLabel">STORED ACTIVITY</p>
                <h2>Archive</h2>
                <p>Archived messages stay hidden from the client page until you open this list.</p>
              </div>

              <button type="button" className="archiveCloseButton" onClick={closeArchive}>
                ×
              </button>
            </header>

            <div className="archiveToolbar">
              <span>{archivedActivities.length} archived item{archivedActivities.length === 1 ? '' : 's'}</span>

              {archivedActivities.length > 0 ? (
                <button
                  type="button"
                  className="deleteAllArchiveButton"
                  onClick={() => setDeleteAllArchiveConfirm((current) => !current)}
                  disabled={deletingAllArchive}
                >
                  Delete all archive
                </button>
              ) : null}
            </div>

            {deleteAllArchiveConfirm ? (
              <div className="inlineDeleteConfirm deleteAllConfirm">
                <div>
                  <strong>Delete all archived items permanently?</strong>
                  <span>This action cannot be undone.</span>
                </div>
                <button type="button" onClick={() => setDeleteAllArchiveConfirm(false)}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="confirmDeleteButton"
                  onClick={deleteAllArchivedActivities}
                  disabled={deletingAllArchive}
                >
                  {deletingAllArchive ? 'Deleting...' : 'Yes, delete all'}
                </button>
              </div>
            ) : null}

            {archiveLoading ? (
              <div className="archiveEmptyState">Loading archive...</div>
            ) : archivedActivities.length > 0 ? (
              <div className="archiveList">
                {archivedActivities.map((activity) => {
                  const activityExpanded = expandedActivityId === activity.id;
                  const deleteOpen = deleteConfirmId === activity.id;

                  return (
                    <article className="archiveItem" key={activity.id}>
                      <div className="activitySummaryRow">
                        <button
                          type="button"
                          className="activityToggle"
                          aria-expanded={activityExpanded}
                          onClick={() =>
                            setExpandedActivityId((current) =>
                              current === activity.id ? '' : activity.id
                            )
                          }
                        >
                          <span className="activityDot archivedDot" aria-hidden="true">●</span>
                          <span className="activitySummaryText">
                            <strong>{activity.title}</strong>
                            <span>{formatDateTime(activity.created_at)}</span>
                          </span>
                          <span className="foldChevron" aria-hidden="true">
                            {activityExpanded ? '⌃' : '⌄'}
                          </span>
                        </button>

                        <div className="activityActions">
                          {getActivityProviderHref(activity) ? (
                            <Link href={getActivityProviderHref(activity)}>
                              Open provider
                            </Link>
                          ) : null}

                          <button
                            type="button"
                            onClick={() => restoreActivity(activity.id)}
                            disabled={activityActionId === activity.id}
                          >
                            {activityActionId === activity.id ? 'Restoring...' : 'Restore'}
                          </button>

                          <button
                            type="button"
                            className="deleteActivityButton"
                            onClick={() =>
                              setDeleteConfirmId((current) =>
                                current === activity.id ? '' : activity.id
                              )
                            }
                            disabled={activityActionId === activity.id}
                          >
                            Delete
                          </button>
                        </div>
                      </div>

                      {deleteOpen ? (
                        <div className="inlineDeleteConfirm">
                          <strong>Delete permanently?</strong>
                          <button type="button" onClick={() => setDeleteConfirmId('')}>
                            Cancel
                          </button>
                          <button
                            type="button"
                            className="confirmDeleteButton"
                            onClick={() => deleteActivity(activity.id, 'archive')}
                            disabled={activityActionId === activity.id}
                          >
                            {activityActionId === activity.id ? 'Deleting...' : 'Yes, delete'}
                          </button>
                        </div>
                      ) : null}

                      {activityExpanded ? (
                        <div className="activityDetails">
                          <p>{activity.body || 'Sendio activity update'}</p>
                        </div>
                      ) : null}
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="archiveEmptyState">
                <strong>The archive is empty</strong>
                <span>Items you archive will be stored here.</span>
              </div>
            )}
          </section>
        </div>
      ) : null}

      <style>{styles}</style>
    </main>
  );
}

const styles = `
  .clientsPage {
    min-height: 100vh;
    background: var(--sendio-page-bg, #ffffff);
    color: var(--sendio-text, #111827);
    padding: 18px 20px 70px;
  }

  .clientTopBar,
  .hero,
  .section,
  .summaryGrid,
  .warningBox,
  .noticeBox {
    max-width: 1120px;
    margin-left: auto;
    margin-right: auto;
  }

  .clientTopBar {
    min-height: 46px;
    margin-bottom: 14px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .sendioMiniLogo {
    color: var(--sendio-button-bg, #29b9f3);
    text-decoration: none;
    font-size: 24px;
    font-weight: 950;
    letter-spacing: -0.05em;
  }

  .clientTopActions {
    display: inline-flex;
    align-items: center;
    gap: 10px;
  }

  .clientEmail,
  .accountLink,
  .menuButton {
    min-height: 38px;
    border-radius: 999px;
    border: 1px solid var(--sendio-border, #dbeafe);
    background: var(--sendio-card-bg, #ffffff);
    color: var(--sendio-text, #111827);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    text-decoration: none;
    font-size: 12px;
    font-weight: 900;
    padding: 0 14px;
  }

  .menuButton {
    width: 38px;
    padding: 0;
    font-size: 18px;
    cursor: pointer;
  }

  .menuLayer {
    position: fixed;
    inset: 0;
    z-index: 100;
    pointer-events: none;
  }

  .menuShade {
    position: absolute;
    inset: 0;
    border: 0;
    background: transparent;
    pointer-events: auto;
  }

  .sideMenu {
    position: fixed;
    top: 72px;
    right: max(20px, calc((100vw - 1120px) / 2 + 20px));
    z-index: 2;
    width: min(230px, calc(100vw - 40px));
    background: var(--sendio-card-bg, #ffffff);
    border: 1px solid var(--sendio-border, #dbeafe);
    border-radius: 22px;
    padding: 14px;
    box-shadow: 0 18px 44px rgba(17, 24, 39, 0.14);
    display: grid;
    gap: 12px;
    pointer-events: auto;
  }

  .menuHead {
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: 1px solid var(--sendio-border, #dbeafe);
    padding-bottom: 12px;
  }

  .menuHead strong {
    color: var(--sendio-button-bg, #29b9f3);
    font-size: 22px;
    font-weight: 950;
    letter-spacing: -0.05em;
  }

  .menuClose {
    border: 0;
    background: transparent;
    color: var(--sendio-text, #111827);
    font-size: 28px;
    cursor: pointer;
  }

  .menuLinks {
    display: grid;
    gap: 10px;
    align-content: start;
  }

  .menuLinks a,
  .menuLinks button {
    min-height: 40px;
    border-radius: 999px;
    border: 1px solid var(--sendio-border, #dbeafe);
    background: var(--sendio-rectangle-bg, #eef6ff);
    color: var(--sendio-text, #111827);
    text-decoration: none;
    font-size: 13px;
    font-weight: 900;
    padding: 0 16px;
    display: inline-flex;
    align-items: center;
    cursor: pointer;
  }

  .hero {
    background: var(--sendio-hero-bg, #e8e1f1);
    color: var(--sendio-text, #111827);
    border: 1px solid var(--sendio-border, #dbeafe);
    border-radius: 34px;
    padding: 52px;
    box-shadow: 0 24px 70px rgba(17, 24, 39, 0.08);
  }

  .eyebrow,
  .sectionLabel {
    margin: 0 0 14px;
    color: var(--sendio-muted, #374151);
    font-size: 12px;
    letter-spacing: 0.22em;
    font-weight: 900;
    text-transform: uppercase;
  }

  h1 {
    max-width: 800px;
    margin: 0;
    font-size: clamp(38px, 6vw, 68px);
    line-height: 0.98;
    letter-spacing: -0.055em;
  }

  .intro {
    max-width: 720px;
    margin: 22px 0 0;
    color: var(--sendio-muted, #374151);
    font-size: 18px;
    line-height: 1.75;
    font-weight: 650;
  }

  .heroActions,
  .inlineActions {
    display: flex;
    flex-wrap: wrap;
    gap: 14px;
    margin-top: 30px;
  }

  .logoutControl {
    display: inline-flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
  }

  .logoutButton,
  .menuLogoutButton {
    background: rgba(220, 38, 38, 0.08) !important;
    border-color: rgba(220, 38, 38, 0.24) !important;
    color: #991b1b !important;
  }

  .logoutConfirm {
    min-height: 38px;
    border-radius: 16px;
    border: 1px solid rgba(220, 38, 38, 0.22);
    background: var(--sendio-card-bg, #ffffff);
    padding: 6px 8px 6px 11px;
    display: inline-flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 7px;
    box-shadow: 0 10px 24px rgba(17, 24, 39, 0.08);
  }

  .logoutConfirm strong {
    color: var(--sendio-text, #111827);
    font-size: 11px;
    font-weight: 900;
  }

  .logoutConfirm button {
    min-height: 28px;
    border-radius: 999px;
    border: 1px solid var(--sendio-border, #dbeafe);
    background: var(--sendio-card-bg, #ffffff);
    color: var(--sendio-text, #111827);
    padding: 0 10px;
    font-size: 10px;
    font-weight: 950;
    cursor: pointer;
  }

  .logoutConfirm .confirmLogoutButton {
    border-color: rgba(220, 38, 38, 0.3);
    background: rgba(220, 38, 38, 0.1);
    color: #991b1b;
  }

  .logoutConfirm button:disabled {
    opacity: 0.65;
    cursor: wait;
  }

  .menuLogoutArea {
    display: grid;
    gap: 8px;
  }

  .menuLogoutConfirm {
    align-items: flex-start;
    border-radius: 14px;
  }

  .primaryButton,
  .secondaryButton,
  .secondaryLightButton {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    text-decoration: none;
    border-radius: 999px;
    padding: 13px 22px;
    font-weight: 900;
    border: 1px solid var(--sendio-border, #dbeafe);
    cursor: pointer;
  }

  .primaryButton {
    background: var(--sendio-button-bg, #29b9f3);
    color: var(--sendio-text, #111827);
  }

  .secondaryButton,
  .secondaryLightButton {
    background: var(--sendio-card-bg, #ffffff);
    color: var(--sendio-text, #111827);
  }

  .warningBox {
    margin-top: 18px;
    border: 1px solid var(--sendio-button-bg, #29b9f3);
    background: var(--sendio-rectangle-bg, #eef6ff);
    color: var(--sendio-text, #111827);
    border-radius: 18px;
    padding: 14px 18px;
    font-size: 13px;
    font-weight: 850;
  }

  .noticeBox {
    margin-top: 18px;
    border: 1px solid rgba(22, 163, 74, 0.3);
    background: rgba(22, 163, 74, 0.08);
    color: #166534;
    border-radius: 18px;
    padding: 14px 18px;
    font-size: 13px;
    font-weight: 850;
  }

  .section {
    margin-top: 28px;
    background: var(--sendio-card-bg, #ffffff);
    border: 1px solid var(--sendio-border, #dbeafe);
    border-radius: 30px;
    padding: 30px;
    box-shadow: 0 18px 50px rgba(17, 24, 39, 0.07);
  }

  .sectionHeader {
    display: flex;
    justify-content: space-between;
    gap: 18px;
    align-items: flex-end;
    margin-bottom: 20px;
  }

  .section h2,
  .panel h2 {
    margin: 0;
    font-size: clamp(28px, 4vw, 42px);
    line-height: 1.08;
    letter-spacing: -0.04em;
  }

  .summaryGrid {
    margin-top: 26px;
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 12px;
  }

  .summaryGrid article {
    background: var(--sendio-card-bg, #ffffff);
    border: 1px solid var(--sendio-border, #dbeafe);
    border-radius: 22px;
    padding: 18px;
    display: grid;
    gap: 8px;
    box-shadow: 0 14px 34px rgba(17, 24, 39, 0.06);
  }

  .summaryGrid span {
    color: var(--sendio-muted, #374151);
    font-size: 12px;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0.12em;
  }

  .summaryGrid strong {
    color: var(--sendio-text, #111827);
    font-size: 34px;
    line-height: 1;
    font-weight: 950;
  }

  .requestList {
    display: grid;
    gap: 16px;
  }

  .requestCard {
    border: 1px solid var(--sendio-border, #dbeafe);
    background: var(--sendio-rectangle-bg, #eef6ff);
    border-radius: 24px;
    padding: 18px;
  }

  .requestCardHead {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 14px;
    margin-bottom: 14px;
  }

  .serviceName {
    margin: 0 0 5px;
    color: var(--sendio-text, #111827);
    font-size: 21px;
    font-weight: 950;
    letter-spacing: -0.03em;
    display: inline-flex;
    align-items: center;
    gap: 9px;
  }

  .serviceIcon {
    width: 34px;
    height: 34px;
    border-radius: 12px;
    border: 1px solid var(--sendio-border, #dbeafe);
    background: var(--sendio-card-bg, #ffffff);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex: 0 0 auto;
    font-size: 18px;
  }

  .createdAt {
    color: var(--sendio-muted, #374151);
    font-size: 12px;
    font-weight: 800;
  }

  .badgeGroup {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 8px;
  }

  .statusBadge {
    border-radius: 999px;
    border: 1px solid var(--sendio-border, #dbeafe);
    background: var(--sendio-card-bg, #ffffff);
    color: var(--sendio-text, #111827);
    padding: 7px 10px;
    font-size: 11px;
    font-weight: 950;
    text-transform: capitalize;
  }

  .statusBadge.good {
    background: rgba(22, 163, 74, 0.1);
    border-color: rgba(22, 163, 74, 0.22);
  }

  .statusBadge.danger {
    background: rgba(220, 38, 38, 0.1);
    border-color: rgba(220, 38, 38, 0.22);
  }

  .statusBadge.info {
    background: rgba(41, 185, 243, 0.12);
    border-color: rgba(41, 185, 243, 0.22);
  }

  .requestBody {
    display: grid;
    grid-template-columns: 280px 1fr;
    gap: 14px;
  }

  .providerPanel,
  .detailsPanel {
    background: var(--sendio-card-bg, #ffffff);
    border: 1px solid var(--sendio-border, #dbeafe);
    border-radius: 18px;
    padding: 14px;
  }

  .providerPanel {
    display: grid;
    grid-template-columns: 86px 1fr;
    gap: 12px;
    align-items: center;
  }

  .providerImage {
    width: 86px;
    height: 86px;
    border-radius: 18px;
    background-color: var(--sendio-rectangle-bg, #eef6ff);
    background-size: cover;
    background-position: center;
    color: var(--sendio-button-bg, #29b9f3);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    text-decoration: none;
    font-size: 32px;
    font-weight: 950;
  }

  .providerInfo {
    min-width: 0;
    display: grid;
    gap: 4px;
  }

  .providerName {
    color: var(--sendio-text, #111827);
    text-decoration: none;
    font-size: 16px;
    font-weight: 950;
  }

  .providerInfo span,
  .providerMissing span {
    color: var(--sendio-muted, #374151);
    font-size: 12px;
    font-weight: 800;
  }

  .providerMissing {
    grid-column: 1 / -1;
    display: grid;
    gap: 6px;
  }

  .providerMissing strong {
    font-size: 15px;
  }

  .detailsPanel {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
  }

  .detailsPanel div {
    display: grid;
    gap: 4px;
  }

  .detailsPanel span {
    color: var(--sendio-muted, #374151);
    font-size: 11px;
    font-weight: 950;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  .detailsPanel strong {
    color: var(--sendio-text, #111827);
    font-size: 13px;
    line-height: 1.55;
    font-weight: 850;
    white-space: pre-wrap;
  }

  .cardActions {
    margin-top: 14px;
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .cardActions a,
  .cardActions button {
    min-height: 34px;
    border-radius: 999px;
    border: 1px solid var(--sendio-border, #dbeafe);
    background: var(--sendio-card-bg, #ffffff);
    color: var(--sendio-text, #111827);
    text-decoration: none;
    padding: 0 13px;
    font-size: 12px;
    font-weight: 950;
    display: inline-flex;
    align-items: center;
    cursor: pointer;
  }

  .cardActions .cancelButton {
    background: rgba(220, 38, 38, 0.08);
    border-color: rgba(220, 38, 38, 0.22);
  }

  .cardActions .complaintButton {
    background: rgba(245, 158, 11, 0.1);
    border-color: rgba(245, 158, 11, 0.28);
  }

  .cardActions .reviewButton {
    background: rgba(22, 163, 74, 0.1);
    border-color: rgba(22, 163, 74, 0.24);
  }

  .cardActions button:disabled {
    opacity: 0.65;
    cursor: wait;
  }

  .emptyState {
    border: 1px solid var(--sendio-border, #dbeafe);
    border-radius: 22px;
    background: var(--sendio-rectangle-bg, #eef6ff);
    padding: 26px;
    text-align: center;
  }

  .emptyState h3 {
    margin: 0;
    font-size: 26px;
    letter-spacing: -0.04em;
  }

  .emptyState p {
    color: var(--sendio-muted, #374151);
    font-size: 14px;
    line-height: 1.6;
    font-weight: 750;
    margin: 12px auto 20px;
    max-width: 520px;
  }

  .publicGrid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 18px;
    background: transparent;
    border: 0;
    box-shadow: none;
    padding: 0;
  }

  .panel {
    background: var(--sendio-card-bg, #ffffff);
    border: 1px solid var(--sendio-border, #dbeafe);
    border-radius: 26px;
    padding: 28px;
    box-shadow: 0 16px 40px rgba(17, 24, 39, 0.06);
  }

  .panel p {
    color: var(--sendio-muted, #374151);
    line-height: 1.7;
    font-weight: 700;
  }

  .archiveFooterLauncher {
    max-width: 1120px;
    margin: 16px auto 0;
    display: flex;
    justify-content: flex-end;
  }

  .archiveFooterLauncher .archiveToggleButton {
    min-width: 88px;
  }

  .activitySection {
    background: var(--sendio-card-bg, #ffffff);
  }

  .activitySectionClosed {
    padding: 0;
    overflow: hidden;
  }

  .activitySectionOpen {
    padding: 0;
    overflow: hidden;
  }

  .activitySectionToggle {
    width: 100%;
    min-height: 82px;
    border: 0;
    background: transparent;
    color: var(--sendio-text, #111827);
    padding: 18px 22px;
    display: flex;
    align-items: center;
    gap: 13px;
    text-align: left;
    cursor: pointer;
  }

  .activitySectionIcon {
    width: 40px;
    height: 40px;
    border-radius: 14px;
    border: 1px solid rgba(41, 185, 243, 0.24);
    background: var(--sendio-rectangle-bg, #eef6ff);
    color: var(--sendio-button-bg, #29b9f3);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex: 0 0 auto;
    font-size: 18px;
    font-weight: 950;
  }

  .activitySectionSummary {
    min-width: 0;
    display: grid;
    gap: 4px;
  }

  .activitySectionSummary strong {
    color: var(--sendio-text, #111827);
    font-size: clamp(18px, 2.4vw, 24px);
    line-height: 1.15;
    letter-spacing: -0.025em;
    font-weight: 950;
  }

  .activitySectionSummary span {
    color: var(--sendio-muted, #374151);
    font-size: 12px;
    line-height: 1.35;
    font-weight: 800;
  }

  .activitySectionChevron {
    width: 34px;
    height: 34px;
    margin-left: auto;
    border-radius: 999px;
    border: 1px solid var(--sendio-border, #dbeafe);
    background: var(--sendio-rectangle-bg, #eef6ff);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex: 0 0 auto;
    font-size: 15px;
    font-weight: 950;
  }

  .activitySectionContent {
    padding: 0 22px 22px;
    border-top: 1px solid var(--sendio-border, #dbeafe);
  }

  .activitySectionControls {
    min-height: 52px;
    display: flex;
    align-items: center;
    justify-content: flex-end;
  }

  .activityList {
    display: grid;
    gap: 10px;
  }

  .activityCard {
    border: 1px solid var(--sendio-border, #dbeafe);
    border-radius: 18px;
    background: var(--sendio-rectangle-bg, #eef6ff);
    padding: 14px 16px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
  }

  .activityCard strong {
    display: block;
    color: var(--sendio-text, #111827);
    font-size: 14px;
    font-weight: 950;
  }

  .activityCard p {
    margin: 5px 0 0;
    color: var(--sendio-muted, #374151);
    font-size: 13px;
    line-height: 1.45;
    font-weight: 750;
  }

  .activityCard span {
    display: block;
    margin-top: 5px;
    color: var(--sendio-muted, #374151);
    font-size: 11px;
    font-weight: 800;
  }

  .activityActions {
    display: inline-flex;
    align-items: center;
    justify-content: flex-end;
    gap: 8px;
    flex-wrap: wrap;
    flex: 0 0 auto;
  }

  .activityActions a,
  .activityActions button,
  .archiveToggleButton {
    min-height: 34px;
    border-radius: 999px;
    border: 1px solid var(--sendio-border, #dbeafe);
    background: var(--sendio-card-bg, #ffffff);
    color: var(--sendio-text, #111827);
    text-decoration: none;
    padding: 0 13px;
    font-size: 12px;
    font-weight: 950;
    display: inline-flex;
    align-items: center;
    cursor: pointer;
  }

  .activityActions button:disabled {
    opacity: 0.65;
    cursor: wait;
  }

  .deleteActivityButton {
    background: rgba(220, 38, 38, 0.08) !important;
    border-color: rgba(220, 38, 38, 0.22) !important;
  }

  .activityNew {
    border-color: rgba(41, 185, 243, 0.45);
    box-shadow: 0 10px 24px rgba(41, 185, 243, 0.08);
  }

  .activitySeen {
    opacity: 0.82;
  }

  @media (max-width: 920px) {
    .hero {
      padding: 36px 24px;
    }

    .summaryGrid,
    .publicGrid,
    .requestBody {
      grid-template-columns: 1fr;
    }

    .requestCardHead,
    .sectionHeader {
      align-items: flex-start;
      flex-direction: column;
    }

    .badgeGroup {
      justify-content: flex-start;
    }
  }

  @media (max-width: 560px) {
    .clientsPage {
      padding-left: 14px;
      padding-right: 14px;
    }

    .clientTopBar {
      align-items: flex-start;
      flex-direction: column;
      gap: 10px;
    }

    .detailsPanel {
      grid-template-columns: 1fr;
    }

    .providerPanel {
      grid-template-columns: 70px 1fr;
    }

    .providerImage {
      width: 70px;
      height: 70px;
      border-radius: 16px;
    }
  }


  /* Client page organization: compact hero support, folded activity and request cards */
  .hero {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 270px;
    align-items: center;
    gap: 30px;
  }

  .heroContent {
    min-width: 0;
  }

  .safetyMiniCard {
    align-self: center;
    border: 1px solid rgba(255, 255, 255, 0.85);
    background: rgba(255, 255, 255, 0.72);
    border-radius: 22px;
    padding: 15px;
    display: grid;
    grid-template-columns: 34px 1fr;
    gap: 11px;
    box-shadow: 0 14px 34px rgba(17, 24, 39, 0.08);
    backdrop-filter: blur(10px);
  }

  .safetyIcon {
    width: 34px;
    height: 34px;
    border-radius: 12px;
    border: 1px solid rgba(41, 185, 243, 0.24);
    background: rgba(238, 246, 255, 0.92);
    color: var(--sendio-button-bg, #29b9f3);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 20px;
    font-weight: 950;
  }

  .safetyMiniCard strong {
    display: block;
    color: var(--sendio-text, #111827);
    font-size: 14px;
    line-height: 1.25;
    font-weight: 950;
  }

  .safetyMiniCard p {
    margin: 6px 0 7px;
    color: var(--sendio-muted, #374151);
    font-size: 11px;
    line-height: 1.5;
    font-weight: 700;
  }

  .safetyMiniCard a {
    color: var(--sendio-text, #111827);
    text-decoration: none;
    font-size: 11px;
    font-weight: 950;
  }

  .compactSectionHeader {
    align-items: center;
  }

  .sectionControls {
    display: inline-flex;
    align-items: center;
    justify-content: flex-end;
    flex-wrap: wrap;
    gap: 8px;
  }

  .archiveToggleButton {
    min-height: 30px !important;
    padding: 0 11px !important;
    font-size: 11px !important;
    background: var(--sendio-card-bg, #ffffff) !important;
    box-shadow: none;
  }

  .smallControlButton {
    min-height: 34px;
    border-radius: 999px;
    border: 1px solid var(--sendio-border, #dbeafe);
    background: var(--sendio-rectangle-bg, #eef6ff);
    color: var(--sendio-text, #111827);
    padding: 0 13px;
    font-size: 12px;
    font-weight: 950;
    cursor: pointer;
  }

  .activityCard,
  .archiveItem {
    display: block;
    padding: 10px 12px;
    overflow: hidden;
  }

  .activitySummaryRow {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  .activityToggle,
  .requestToggle {
    min-width: 0;
    flex: 1 1 auto;
    border: 0;
    background: transparent;
    color: var(--sendio-text, #111827);
    padding: 2px;
    display: flex;
    align-items: center;
    gap: 10px;
    text-align: left;
    cursor: pointer;
  }

  .activityDot {
    color: var(--sendio-button-bg, #29b9f3);
    font-size: 10px;
    flex: 0 0 auto;
  }

  .archivedDot {
    color: #64748b;
  }

  .activitySummaryText,
  .requestSummaryText {
    min-width: 0;
    display: grid;
    gap: 3px;
  }

  .activitySummaryText strong,
  .requestSummaryText strong {
    color: var(--sendio-text, #111827);
    font-size: 14px;
    line-height: 1.3;
    font-weight: 950;
    overflow-wrap: anywhere;
  }

  .activitySummaryText span,
  .requestSummaryText span {
    color: var(--sendio-muted, #374151);
    font-size: 11px;
    line-height: 1.35;
    font-weight: 800;
  }

  .foldChevron {
    width: 28px;
    height: 28px;
    margin-left: auto;
    border-radius: 999px;
    border: 1px solid var(--sendio-border, #dbeafe);
    background: var(--sendio-card-bg, #ffffff);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex: 0 0 auto;
    font-size: 14px;
    font-weight: 950;
  }

  .activityDetails {
    margin-top: 9px;
    padding: 11px 13px;
    border-radius: 14px;
    border: 1px solid var(--sendio-border, #dbeafe);
    background: var(--sendio-card-bg, #ffffff);
  }

  .activityDetails p {
    margin: 0;
    color: var(--sendio-muted, #374151);
    font-size: 13px;
    line-height: 1.55;
    font-weight: 750;
  }

  .inlineDeleteConfirm {
    margin: 9px 0 0 auto;
    width: fit-content;
    max-width: 100%;
    border: 1px solid rgba(220, 38, 38, 0.22);
    background: rgba(255, 255, 255, 0.96);
    border-radius: 14px;
    padding: 8px 9px;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    flex-wrap: wrap;
    gap: 7px;
  }

  .inlineDeleteConfirm strong {
    color: #991b1b;
    font-size: 11px;
    font-weight: 950;
  }

  .inlineDeleteConfirm span {
    color: var(--sendio-muted, #374151);
    font-size: 10px;
    font-weight: 750;
  }

  .inlineDeleteConfirm button {
    min-height: 29px;
    border-radius: 999px;
    border: 1px solid var(--sendio-border, #dbeafe);
    background: var(--sendio-card-bg, #ffffff);
    color: var(--sendio-text, #111827);
    padding: 0 10px;
    font-size: 11px;
    font-weight: 950;
    cursor: pointer;
  }

  .inlineDeleteConfirm .confirmDeleteButton {
    border-color: rgba(220, 38, 38, 0.28);
    background: rgba(220, 38, 38, 0.09);
    color: #991b1b;
  }

  .inlineDeleteConfirm button:disabled {
    opacity: 0.62;
    cursor: wait;
  }

  .compactEmptyState {
    border: 1px dashed var(--sendio-border, #dbeafe);
    border-radius: 18px;
    background: var(--sendio-rectangle-bg, #eef6ff);
    padding: 18px;
    display: grid;
    gap: 5px;
    text-align: center;
  }

  .compactEmptyState strong {
    font-size: 15px;
    font-weight: 950;
  }

  .compactEmptyState span {
    color: var(--sendio-muted, #374151);
    font-size: 12px;
    font-weight: 750;
  }

  .requestCard {
    padding: 12px 14px;
  }

  .requestCardHead {
    margin-bottom: 0;
  }

  .requestSummaryHead {
    align-items: center;
  }

  .requestToggle {
    max-width: 620px;
  }

  .requestCardOpen .requestCardHead {
    margin-bottom: 14px;
  }

  .requestCardOpen {
    padding: 16px;
  }

  .archiveLayer {
    position: fixed;
    inset: 0;
    z-index: 200;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
  }

  .archiveShade {
    position: absolute;
    inset: 0;
    border: 0;
    background: rgba(15, 23, 42, 0.36);
    backdrop-filter: blur(5px);
    cursor: default;
  }

  .archivePanel {
    position: relative;
    z-index: 1;
    width: min(940px, 100%);
    max-height: min(760px, calc(100vh - 48px));
    overflow: auto;
    border: 1px solid var(--sendio-border, #dbeafe);
    border-radius: 28px;
    background: var(--sendio-card-bg, #ffffff);
    padding: 24px;
    box-shadow: 0 28px 90px rgba(15, 23, 42, 0.24);
  }

  .archiveHeader {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 18px;
    padding-bottom: 16px;
    border-bottom: 1px solid var(--sendio-border, #dbeafe);
  }

  .archiveHeader h2 {
    margin: 0;
    color: var(--sendio-text, #111827);
    font-size: 34px;
    line-height: 1;
    letter-spacing: -0.04em;
  }

  .archiveHeader p:not(.sectionLabel) {
    margin: 9px 0 0;
    color: var(--sendio-muted, #374151);
    font-size: 13px;
    line-height: 1.5;
    font-weight: 700;
  }

  .archiveCloseButton {
    width: 38px;
    height: 38px;
    border-radius: 999px;
    border: 1px solid var(--sendio-border, #dbeafe);
    background: var(--sendio-rectangle-bg, #eef6ff);
    color: var(--sendio-text, #111827);
    font-size: 24px;
    line-height: 1;
    cursor: pointer;
  }

  .archiveToolbar {
    min-height: 52px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  .archiveToolbar span {
    color: var(--sendio-muted, #374151);
    font-size: 12px;
    font-weight: 900;
  }

  .deleteAllArchiveButton {
    min-height: 34px;
    border-radius: 999px;
    border: 1px solid rgba(220, 38, 38, 0.25);
    background: rgba(220, 38, 38, 0.08);
    color: #991b1b;
    padding: 0 14px;
    font-size: 12px;
    font-weight: 950;
    cursor: pointer;
  }

  .deleteAllConfirm {
    width: 100%;
    margin-top: 0;
  }

  .deleteAllConfirm > div {
    margin-right: auto;
    display: grid;
    gap: 2px;
  }

  .archiveList {
    display: grid;
    gap: 10px;
  }

  .archiveItem {
    border: 1px solid var(--sendio-border, #dbeafe);
    border-radius: 18px;
    background: var(--sendio-rectangle-bg, #eef6ff);
  }

  .archiveEmptyState {
    min-height: 150px;
    border: 1px dashed var(--sendio-border, #dbeafe);
    border-radius: 20px;
    background: var(--sendio-rectangle-bg, #eef6ff);
    display: grid;
    place-content: center;
    gap: 6px;
    text-align: center;
    color: var(--sendio-muted, #374151);
    font-size: 13px;
    font-weight: 800;
  }

  .archiveEmptyState strong {
    color: var(--sendio-text, #111827);
    font-size: 17px;
    font-weight: 950;
  }

  @media (max-width: 920px) {
    .hero {
      grid-template-columns: 1fr;
    }

    .safetyMiniCard {
      width: min(100%, 390px);
    }

    .compactSectionHeader,
    .activitySummaryRow,
    .requestSummaryHead {
      align-items: flex-start;
      flex-direction: column;
    }

    .sectionControls,
    .activityActions,
    .badgeGroup {
      justify-content: flex-start;
    }

    .activityActions {
      width: 100%;
    }

    .requestToggle {
      width: 100%;
      max-width: none;
    }
  }

  @media (max-width: 560px) {
    .hero {
      gap: 20px;
    }

    .safetyMiniCard {
      padding: 13px;
      grid-template-columns: 30px 1fr;
    }

    .safetyIcon {
      width: 30px;
      height: 30px;
      border-radius: 10px;
    }

    .section {
      padding: 20px 14px;
    }

    .activitySectionClosed,
    .activitySectionOpen {
      padding: 0;
    }

    .activitySectionToggle {
      min-height: 72px;
      padding: 15px 14px;
    }

    .activitySectionContent {
      padding: 0 12px 14px;
    }

    .activitySectionIcon {
      width: 34px;
      height: 34px;
      border-radius: 12px;
    }

    .activityActions a,
    .activityActions button {
      min-height: 32px;
      padding: 0 10px;
      font-size: 11px;
    }

    .inlineDeleteConfirm {
      width: 100%;
      justify-content: flex-start;
    }

    .archiveLayer {
      align-items: flex-end;
      padding: 10px;
    }

    .archivePanel {
      max-height: calc(100vh - 20px);
      border-radius: 24px;
      padding: 18px 14px;
    }

    .archiveToolbar {
      align-items: flex-start;
      flex-direction: column;
      padding: 12px 0;
    }
  }
`;
