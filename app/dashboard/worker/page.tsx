'use client';

import Image from 'next/image';
import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { useRouter } from 'next/navigation';
import {
  FaArrowLeft,
  FaArrowRight,
  FaEnvelope,
  FaFacebookF,
  FaGlobe,
  FaHouse,
  FaInstagram,
  FaLinkedinIn,
  FaLocationDot,
  FaPhone,
  FaStar,
  FaTrash,
  FaWhatsapp,
  FaXTwitter,
} from 'react-icons/fa6';
import { supabase } from '@/lib/supabase';
import { getWorkerId } from '@/lib/getWorkerId';

type WorkerProfile = {
  id: string;
  user_id: string;
  name: string;
  slug: string | null;
  profession: string | null;
  description: string | null;
  avatar: string | null;
  cover: string | null;
  city: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  whatsapp: string | null;
  status: string | null;
  working_hours: string | null;
  experience_years: number | null;
  views: number | null;
  requests_count: number | null;
  rating: number | null;
  reviews_count: number | null;
  created_at: string | null;
};

type WorkerService = {
  id: string;
  worker_id: string;
  title: string;
  description: string | null;
  price: string | null;
  created_at?: string | null;
};

type ServiceCategory = {
  id: string;
  name: string;
  icon: string | null;
  sort_order: number | null;
};

type WorkerServiceCategoryLink = {
  service_category_id: string;
};

type WorkerSkill = {
  id: string;
  worker_id: string;
  title: string;
  created_at?: string | null;
};

type WorkerGalleryItem = {
  id: string;
  worker_id: string;
  url: string;
  type: 'image' | 'video' | string | null;
  created_at: string | null;
};

type WorkerRequest = {
  id: string;
  worker_id: string;
  name: string;
  email: string;
  phone: string | null;
  message: string;
  status: string | null;
  created_at: string | null;
  worker_seen?: boolean | null;
  is_archived?: boolean | null;
};

type WorkerSocialLinks = {
  id: string;
  worker_id: string;
  facebook: string | null;
  instagram: string | null;
  linkedin: string | null;
  x: string | null;
  website: string | null;
};

type WorkerReview = {
  id: string;
  worker_id: string | null;
  user_id: string | null;
  user_name: string;
  rating: number;
  comment: string | null;
  created_at: string | null;
};

type CreateWorkerForm = {
  name: string;
  profession: string;
  city: string;
};

type EditWorkerForm = {
  name: string;
  profession: string;
  description: string;
  city: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  whatsapp: string;
  status: string;
  working_hours: string;
  experience_years: string;
};

type ServiceForm = {
  title: string;
  description: string;
  price: string;
};

type SkillForm = {
  title: string;
};

type SocialForm = {
  facebook: string;
  instagram: string;
  linkedin: string;
  x: string;
  website: string;
};

type SendioStyle = CSSProperties & {
  '--sendio-page': string;
  '--sendio-hero': string;
  '--sendio-soft': string;
  '--sendio-button': string;
  '--sendio-button-hover': string;
  '--sendio-border': string;
  '--sendio-accent': string;
};


const SERVICE_CATEGORY_SYMBOLS: Record<string, string> = {
  ant: '🐜',
  bath: '🛁',
  bike: '🚲',
  blocks: '🧱',
  box: '📦',
  boxes: '🗃️',
  'brick-wall': '🏗️',
  briefcase: '💼',
  brush: '🖌️',
  bug: '🐞',
  'bug-off': '🚫',
  building: '🏢',
  'building-2': '🏬',
  cabinet: '🗄️',
  camera: '📷',
  'chef-hat': '👨‍🍳',
  chimney: '🏭',
  construction: '🚧',
  curtains: '🪟',
  dishwasher: '🍽️',
  door: '🚪',
  droplet: '💧',
  droplets: '💦',
  fan: '🌀',
  fence: '🪵',
  flame: '🔥',
  flower: '🌸',
  grass: '🌱',
  grid: '▦',
  'grid-2x2': '▥',
  gutter: '🌧️',
  hammer: '🔨',
  'hard-hat': '⛑️',
  heat: '♨️',
  home: '🏠',
  'home-repair': '🛠️',
  house: '🏡',
  key: '🔑',
  laptop: '💻',
  layers: '🧽',
  layout: '🗂️',
  'layout-panel-top': '🖼️',
  leaf: '🍃',
  lightbulb: '💡',
  lock: '🔒',
  'map-pin': '📍',
  mouse: '🖱️',
  oven: '🍳',
  package: '🎁',
  'package-check': '✅',
  'paint-roller': '🧑‍🎨',
  paintbrush: '🎨',
  panel: '🧩',
  'panel-top': '🪟',
  pipe: '🚰',
  plug: '🔌',
  printer: '🖨️',
  rain: '🌦️',
  road: '🛣️',
  roof: '🏘️',
  'roof-repair': '🏚️',
  scissors: '✂️',
  scroll: '📜',
  settings: '⚙️',
  shelves: '📚',
  shovel: '⛏️',
  signpost: '🪧',
  smartphone: '📱',
  snowflake: '❄️',
  sofa: '🛋️',
  sparkles: '✨',
  spray: '🧴',
  store: '🏪',
  sun: '☀️',
  thermometer: '🌡️',
  toilet: '🚽',
  toolbox: '🧰',
  trash: '🗑️',
  'trash-2': '♻️',
  tree: '🌳',
  truck: '🚚',
  tv: '📺',
  warehouse: '🏭',
  'washing-machine': '🧺',
  waves: '🌊',
  wifi: '📶',
  wind: '🌬️',
  window: '🪟',
  wood: '🪵',
  wrench: '🔧',
  zap: '⚡',
};

function getServiceCategorySymbol(icon: string | null) {
  if (!icon) return '';

  return SERVICE_CATEGORY_SYMBOLS[icon.trim().toLowerCase()] ?? '';
}

const WORKER_MEDIA_BUCKET = 'worker-media';
const MAX_ACHIEVEMENT_IMAGES = 4;
const MAX_ACHIEVEMENT_VIDEOS = 2;
const MAX_IMAGE_SIZE_MB = 5;
const MAX_VIDEO_SIZE_MB = 50;
const FREE_GALLERY_ITEMS_LIMIT = MAX_ACHIEVEMENT_IMAGES;

const SENDIO_THEMES = [
  {
    page: '#ffffff',
    hero: '#e8f9f2',
    soft: '#f7fffb',
    button: '#23a7f1',
    buttonHover: '#168ed1',
    border: '#dbeafe',
    accent: '#c7f7f1',
  },
  {
    page: '#ffffff',
    hero: '#eef6ff',
    soft: '#f8fbff',
    button: '#23a7f1',
    buttonHover: '#168ed1',
    border: '#dbeafe',
    accent: '#dbeafe',
  },
  {
    page: '#ffffff',
    hero: '#f4edff',
    soft: '#fbf8ff',
    button: '#23a7f1',
    buttonHover: '#168ed1',
    border: '#eadcff',
    accent: '#e8d8ff',
  },
];

function formatDate(value: string | null) {
  if (!value) return 'Not available';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return 'Not available';

  return date.toLocaleDateString('en', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatStatus(value: string | null) {
  if (!value) return 'Available';
  if (value === 'available') return 'Available';
  if (value === 'busy') return 'Busy';
  if (value === 'unavailable') return 'Unavailable';

  return value
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function getStars(rating: number | null) {
  const safeRating = Math.max(0, Math.min(5, Math.round(rating ?? 0)));
  return '★'.repeat(safeRating) + '☆'.repeat(5 - safeRating);
}

function normalizeUrl(value: string | null) {
  if (!value) return null;

  const cleanValue = value.trim();

  if (!cleanValue) return null;

  if (cleanValue.startsWith('http://') || cleanValue.startsWith('https://')) {
    return cleanValue;
  }

  return `https://${cleanValue}`;
}

function getWhatsappUrl(value: string | null) {
  if (!value) return null;

  const cleanValue = value.trim();

  if (!cleanValue) return null;

  if (cleanValue.startsWith('http://') || cleanValue.startsWith('https://')) {
    return cleanValue;
  }

  const number = cleanValue.replace(/[^\d+]/g, '').replace(/^\+/, '');

  if (!number) return null;

  return `https://wa.me/${number}`;
}

function getPhoneUrl(value: string | null) {
  if (!value) return null;

  const phone = value.trim().replace(/\s/g, '');

  if (!phone) return null;

  return `tel:${phone}`;
}

function getMailUrl(value: string | null) {
  if (!value) return null;

  const email = value.trim();

  if (!email) return null;

  return `mailto:${email}`;
}

function getMapsUrl(value: string | null) {
  if (!value) return null;

  const address = value.trim();

  if (!address) return null;

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    address
  )}`;
}

function getFileExtension(file: File) {
  const fileNameParts = file.name.split('.');
  const extension = fileNameParts[fileNameParts.length - 1];

  if (!extension || extension === file.name) {
    if (file.type === 'image/jpeg') return 'jpg';
    if (file.type === 'image/png') return 'png';
    if (file.type === 'image/webp') return 'webp';
    if (file.type === 'video/mp4') return 'mp4';
    if (file.type === 'video/webm') return 'webm';

    return 'file';
  }

  return extension.toLowerCase();
}

function getUniqueFilePath(workerId: string, folder: string, file: File) {
  const extension = getFileExtension(file);
  const randomValue =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  return `${workerId}/${folder}/${randomValue}.${extension}`;
}

function getStoragePathFromPublicUrl(url: string | null) {
  if (!url) return null;

  try {
    const parsedUrl = new URL(url);
    const marker = `/storage/v1/object/public/${WORKER_MEDIA_BUCKET}/`;
    const markerIndex = parsedUrl.pathname.indexOf(marker);

    if (markerIndex === -1) return null;

    return decodeURIComponent(
      parsedUrl.pathname.slice(markerIndex + marker.length)
    );
  } catch {
    return null;
  }
}

function isImageFile(file: File) {
  return file.type.startsWith('image/');
}

function isVideoFile(file: File) {
  const videoExtensions = /\.(mp4|webm|mov|m4v|avi|mkv|3gp|mpeg|mpg|ogv)$/i;

  return file.type.startsWith('video/') || videoExtensions.test(file.name);
}

function validateImageFile(file: File) {
  if (!isImageFile(file)) {
    return 'Please upload an image file.';
  }

  if (file.size > MAX_IMAGE_SIZE_MB * 1024 * 1024) {
    return `Image size must be ${MAX_IMAGE_SIZE_MB}MB or less.`;
  }

  return null;
}

function validateVideoFile(file: File) {
  if (!isVideoFile(file)) {
    return 'Please upload a video file.';
  }

  if (file.size > MAX_VIDEO_SIZE_MB * 1024 * 1024) {
    return `Video size must be ${MAX_VIDEO_SIZE_MB}MB or less.`;
  }

  return null;
}

function cardClass(extra = '') {
  return `overflow-hidden rounded-2xl border border-[var(--sendio-border)] bg-white p-5 shadow-sm ${extra}`;
}

function inputClass(extra = '') {
  return `h-11 w-full rounded-[24px] border-0 bg-[var(--sendio-soft)] px-4 text-sm font-semibold text-slate-800 outline-none ring-1 ring-[var(--sendio-border)] focus:ring-2 focus:ring-[var(--sendio-button)] ${extra}`;
}

function textareaClass(extra = '') {
  return `w-full resize-none rounded-[24px] border-0 bg-[var(--sendio-soft)] px-4 py-3 text-sm font-semibold text-slate-800 outline-none ring-1 ring-[var(--sendio-border)] focus:ring-2 focus:ring-[var(--sendio-button)] ${extra}`;
}

function buttonClass(extra = '') {
  return `inline-flex h-11 items-center justify-center rounded-[24px] bg-[var(--sendio-button)] px-5 text-sm font-black text-white shadow-sm transition hover:bg-[var(--sendio-button-hover)] disabled:cursor-not-allowed disabled:opacity-60 ${extra}`;
}

function softButtonClass(extra = '') {
  return `inline-flex h-10 items-center justify-center rounded-full border border-[var(--sendio-border)] bg-[var(--sendio-soft)] px-4 text-xs font-black text-slate-700 transition hover:ring-2 hover:ring-[var(--sendio-button)] ${extra}`;
}

export default function WorkerDashboardPage() {
  const router = useRouter();

  const [paletteIndex, setPaletteIndex] = useState(0);

  const [worker, setWorker] = useState<WorkerProfile | null>(null);
  const [services, setServices] = useState<WorkerService[]>([]);
  const [serviceCategories, setServiceCategories] = useState<ServiceCategory[]>(
    []
  );
  const [selectedServiceCategoryIds, setSelectedServiceCategoryIds] = useState<
    string[]
  >([]);
  const [savingServiceCategoryId, setSavingServiceCategoryId] = useState<
    string | null
  >(null);
  const [skills, setSkills] = useState<WorkerSkill[]>([]);
  const [gallery, setGallery] = useState<WorkerGalleryItem[]>([]);
  const [requests, setRequests] = useState<WorkerRequest[]>([]);
  const [reviews, setReviews] = useState<WorkerReview[]>([]);
  const [socialLinks, setSocialLinks] = useState<WorkerSocialLinks | null>(
    null
  );

  const [userId, setUserId] = useState<string | null>(null);
  const [authEmail, setAuthEmail] = useState<string | null>(null);

  const [createForm, setCreateForm] = useState<CreateWorkerForm>({
    name: '',
    profession: '',
    city: '',
  });

  const [editForm, setEditForm] = useState<EditWorkerForm>({
    name: '',
    profession: '',
    description: '',
    city: '',
    address: '',
    phone: '',
    email: '',
    website: '',
    whatsapp: '',
    status: 'available',
    working_hours: '',
    experience_years: '0',
  });

  const [serviceForm, setServiceForm] = useState<ServiceForm>({
    title: '',
    description: '',
    price: '',
  });

  const [skillForm, setSkillForm] = useState<SkillForm>({
    title: '',
  });

  const [socialForm, setSocialForm] = useState<SocialForm>({
    facebook: '',
    instagram: '',
    linkedin: '',
    x: '',
    website: '',
  });

  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingAdresse, setSavingAdresse] = useState(false);
  const [savingContact, setSavingContact] = useState(false);
  const [savingService, setSavingService] = useState(false);
  const [savingSkill, setSavingSkill] = useState(false);
  const [uploadingGallery, setUploadingGallery] = useState(false);

  const [previewItem, setPreviewItem] = useState<WorkerGalleryItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const theme = SENDIO_THEMES[paletteIndex];

  const styleVars: SendioStyle = {
    '--sendio-page': theme.page,
    '--sendio-hero': theme.hero,
    '--sendio-soft': theme.soft,
    '--sendio-button': theme.button,
    '--sendio-button-hover': theme.buttonHover,
    '--sendio-border': theme.border,
    '--sendio-accent': theme.accent,
  };

  const publicProfileHref = useMemo(() => {
    if (!worker) return '/dashboard/worker';

    return `/workers/${encodeURIComponent(worker.slug?.trim() || worker.id)}`;
  }, [worker]);

  const latestRequests = requests.slice(0, 3);
  const gallerySlots = Array.from({ length: FREE_GALLERY_ITEMS_LIMIT });

  const selectedServiceCategories = serviceCategories.filter((category) =>
    selectedServiceCategoryIds.includes(category.id)
  );

  const availableServiceCategories = serviceCategories.filter(
    (category) => !selectedServiceCategoryIds.includes(category.id)
  );

  const contactActions = worker
    ? [
        { label: 'Phone', href: getPhoneUrl(worker.phone), icon: FaPhone },
        { label: 'Email', href: getMailUrl(worker.email), icon: FaEnvelope },
        {
          label: 'WhatsApp',
          href: getWhatsappUrl(worker.whatsapp),
          icon: FaWhatsapp,
        },
        { label: 'Website', href: normalizeUrl(worker.website), icon: FaGlobe },
        {
          label: 'Maps',
          href: getMapsUrl(worker.address),
          icon: FaLocationDot,
        },
        {
          label: 'Facebook',
          href: normalizeUrl(socialLinks?.facebook ?? null),
          icon: FaFacebookF,
        },
        {
          label: 'Instagram',
          href: normalizeUrl(socialLinks?.instagram ?? null),
          icon: FaInstagram,
        },
        {
          label: 'LinkedIn',
          href: normalizeUrl(socialLinks?.linkedin ?? null),
          icon: FaLinkedinIn,
        },
        {
          label: 'X',
          href: normalizeUrl(socialLinks?.x ?? null),
          icon: FaXTwitter,
        },
      ].filter((action) => action.href)
    : [];

  const profileCompletionItems = worker
    ? [
        { label: 'Avatar from Gallery', complete: Boolean(worker.avatar) },
        { label: 'Name', complete: Boolean(worker.name?.trim()) },
        { label: 'Profession', complete: Boolean(worker.profession?.trim()) },
        { label: 'Description', complete: Boolean(worker.description?.trim()) },
        { label: 'Adresse', complete: Boolean(worker.address?.trim()) },
        { label: 'Phone', complete: Boolean(worker.phone?.trim()) },
        { label: 'Contact', complete: contactActions.length > 0 },
        { label: 'Services', complete: services.length > 0 },
        { label: 'Skills', complete: skills.length > 0 },
        { label: 'Gallery', complete: gallery.length > 0 },
      ]
    : [];

  const completedProfileItems = profileCompletionItems.filter(
    (item) => item.complete
  ).length;

  const profileCompletionPercent = profileCompletionItems.length
    ? Math.round((completedProfileItems / profileCompletionItems.length) * 100)
    : 0;

  const missingProfileItems = profileCompletionItems.filter(
    (item) => !item.complete
  );

  useEffect(() => {
    const interval = window.setInterval(() => {
      setPaletteIndex((current) => (current + 1) % SENDIO_THEMES.length);
    }, 120000);

    return () => {
      window.clearInterval(interval);
    };
  }, []);

  function fillEditForm(workerData: WorkerProfile) {
    setEditForm({
      name: workerData.name ?? '',
      profession: workerData.profession ?? '',
      description: workerData.description ?? '',
      city: workerData.city ?? '',
      address: workerData.address ?? '',
      phone: workerData.phone ?? '',
      email: workerData.email ?? '',
      website: workerData.website ?? '',
      whatsapp: workerData.whatsapp ?? '',
      status: workerData.status ?? 'available',
      working_hours: workerData.working_hours ?? '',
      experience_years: String(workerData.experience_years ?? 0),
    });
  }

  function fillSocialForm(links: WorkerSocialLinks | null) {
    setSocialForm({
      facebook: links?.facebook ?? '',
      instagram: links?.instagram ?? '',
      linkedin: links?.linkedin ?? '',
      x: links?.x ?? '',
      website: links?.website ?? '',
    });
  }

  async function uploadFileToWorkerStorage(
    workerId: string,
    folder: string,
    file: File
  ) {
    const filePath = getUniqueFilePath(workerId, folder, file);

    const { error: uploadError } = await supabase.storage
      .from(WORKER_MEDIA_BUCKET)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      throw new Error(uploadError.message);
    }

    const { data } = supabase.storage
      .from(WORKER_MEDIA_BUCKET)
      .getPublicUrl(filePath);

    return {
      publicUrl: data.publicUrl,
      path: filePath,
    };
  }

  async function removeStorageFileByUrl(url: string | null) {
    const path = getStoragePathFromPublicUrl(url);

    if (!path) return;

    await supabase.storage.from(WORKER_MEDIA_BUCKET).remove([path]);
  }

  async function loadWorkerDashboard() {
    setLoading(true);
    setError(null);
    setNotice(null);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      router.replace('/login');
      return;
    }

    setUserId(user.id);
    setAuthEmail(user.email ?? null);

    const workerId = await getWorkerId();

    if (!workerId) {
      setWorker(null);
      setServices([]);
      setServiceCategories([]);
      setSelectedServiceCategoryIds([]);
      setSkills([]);
      setGallery([]);
      setRequests([]);
      setReviews([]);
      setSocialLinks(null);
      fillSocialForm(null);
      setLoading(false);
      return;
    }

    const { data: workerData, error: workerError } = await supabase
      .from('workers')
      .select('*')
      .eq('id', workerId)
      .maybeSingle();

    if (workerError || !workerData) {
      setError(workerError?.message || 'Worker profile could not be loaded.');
      setLoading(false);
      return;
    }

    const [
      servicesResult,
      skillsResult,
      galleryResult,
      requestsResult,
      reviewsResult,
      socialLinksResult,
      serviceCategoriesResult,
      serviceCategoryLinksResult,
    ] = await Promise.all([
      supabase
        .from('worker_services')
        .select('*')
        .eq('worker_id', workerId)
        .order('created_at', { ascending: false }),

      supabase
        .from('worker_skills')
        .select('*')
        .eq('worker_id', workerId)
        .order('created_at', { ascending: false }),

      supabase
        .from('worker_gallery')
        .select('*')
        .eq('worker_id', workerId)
        .order('created_at', { ascending: false }),

      supabase
        .from('worker_requests')
        .select('*')
        .eq('worker_id', workerId)
        .order('created_at', { ascending: false }),

      supabase
        .from('worker_reviews')
        .select('*')
        .eq('worker_id', workerId)
        .order('created_at', { ascending: false }),

      supabase
        .from('worker_social_links')
        .select('*')
        .eq('worker_id', workerId)
        .maybeSingle(),

      supabase
        .from('service_categories')
        .select('id, name, icon, sort_order')
        .eq('is_active', true)
        .eq('is_selectable', true)
        .in('provider_scope', ['worker', 'both'])
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true }),

      supabase
        .from('worker_service_categories')
        .select('service_category_id')
        .eq('worker_id', workerId),
    ]);

    const typedWorker = workerData as WorkerProfile;
    const typedSocialLinks =
      (socialLinksResult.data as WorkerSocialLinks | null) ?? null;

    setWorker(typedWorker);
    fillEditForm(typedWorker);

    setServices((servicesResult.data ?? []) as WorkerService[]);

    if (serviceCategoriesResult.error || serviceCategoryLinksResult.error) {
      setServiceCategories([]);
      setSelectedServiceCategoryIds([]);
      setError(
        serviceCategoriesResult.error?.message ||
          serviceCategoryLinksResult.error?.message ||
          'Service categories could not be loaded.'
      );
    } else {
      setServiceCategories(
        (serviceCategoriesResult.data ?? []) as ServiceCategory[]
      );
      setSelectedServiceCategoryIds(
        (
          (serviceCategoryLinksResult.data ??
            []) as WorkerServiceCategoryLink[]
        ).map((link) => link.service_category_id)
      );
    }

    setSkills((skillsResult.data ?? []) as WorkerSkill[]);
    setGallery((galleryResult.data ?? []) as WorkerGalleryItem[]);
    setRequests((requestsResult.data ?? []) as WorkerRequest[]);
    setReviews((reviewsResult.data ?? []) as WorkerReview[]);
    setSocialLinks(typedSocialLinks);
    fillSocialForm(typedSocialLinks);

    setLoading(false);
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadWorkerDashboard();
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleCreateWorkerProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!userId) {
      setError('User session was not found.');
      return;
    }

    const name = createForm.name.trim();
    const profession = createForm.profession.trim();
    const city = createForm.city.trim();

    if (!name) {
      setError('Worker name is required.');
      return;
    }

    setSavingProfile(true);
    setError(null);
    setNotice(null);

    const { data, error: insertError } = await supabase
      .from('workers')
      .insert({
        user_id: userId,
        name,
        profession: profession || null,
        city: city || null,
        email: authEmail,
        status: 'available',
      })
      .select('*')
      .single();

    if (insertError) {
      setError(insertError.message);
      setSavingProfile(false);
      return;
    }

    const createdWorker = data as WorkerProfile;

    setWorker(createdWorker);
    fillEditForm(createdWorker);
    setNotice('Worker profile created successfully.');
    setSavingProfile(false);
  }

  async function handleSaveHeroProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!worker) return;

    const name = editForm.name.trim();

    if (!name) {
      setError('Worker name is required.');
      return;
    }

    const experienceYears = Number(editForm.experience_years || 0);

    if (Number.isNaN(experienceYears) || experienceYears < 0) {
      setError('Experience years must be zero or more.');
      return;
    }

    setSavingProfile(true);
    setError(null);
    setNotice(null);

    const { data, error: updateError } = await supabase
      .from('workers')
      .update({
        name,
        profession: editForm.profession.trim() || null,
        description: editForm.description.trim() || null,
        city: editForm.city.trim() || null,
        status: editForm.status,
        working_hours: editForm.working_hours.trim() || null,
        experience_years: experienceYears,
      })
      .eq('id', worker.id)
      .select('*')
      .single();

    if (updateError) {
      setError(updateError.message);
      setSavingProfile(false);
      return;
    }

    const updatedWorker = data as WorkerProfile;

    setWorker(updatedWorker);
    fillEditForm(updatedWorker);
    setNotice('Profile information saved successfully.');
    setSavingProfile(false);
  }

  async function handleSaveAdresse(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!worker) return;

    setSavingAdresse(true);
    setError(null);
    setNotice(null);

    const { data, error: updateError } = await supabase
      .from('workers')
      .update({
        address: editForm.address.trim() || null,
        phone: editForm.phone.trim() || null,
      })
      .eq('id', worker.id)
      .select('*')
      .single();

    if (updateError) {
      setError(updateError.message);
      setSavingAdresse(false);
      return;
    }

    const updatedWorker = data as WorkerProfile;

    setWorker(updatedWorker);
    fillEditForm(updatedWorker);
    setNotice('Adresse saved successfully.');
    setSavingAdresse(false);
  }

  async function handleSaveContact(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!worker) return;

    setSavingContact(true);
    setError(null);
    setNotice(null);

    const { data: workerData, error: workerUpdateError } = await supabase
      .from('workers')
      .update({
        email: editForm.email.trim() || null,
        website: editForm.website.trim() || null,
        whatsapp: editForm.whatsapp.trim() || null,
      })
      .eq('id', worker.id)
      .select('*')
      .single();

    if (workerUpdateError) {
      setError(workerUpdateError.message);
      setSavingContact(false);
      return;
    }

    const socialPayload = {
      worker_id: worker.id,
      facebook: socialForm.facebook.trim() || null,
      instagram: socialForm.instagram.trim() || null,
      linkedin: socialForm.linkedin.trim() || null,
      x: socialForm.x.trim() || null,
      website: socialForm.website.trim() || null,
    };

    const { data: socialData, error: socialError } = await supabase
      .from('worker_social_links')
      .upsert(socialPayload, {
        onConflict: 'worker_id',
      })
      .select('*')
      .single();

    if (socialError) {
      setError(socialError.message);
      setSavingContact(false);
      return;
    }

    const updatedWorker = workerData as WorkerProfile;
    const updatedSocialLinks = socialData as WorkerSocialLinks;

    setWorker(updatedWorker);
    fillEditForm(updatedWorker);
    setSocialLinks(updatedSocialLinks);
    fillSocialForm(updatedSocialLinks);
    setNotice('Contact links saved successfully.');
    setSavingContact(false);
  }

  async function handleSetAvatarFromGallery(item: WorkerGalleryItem) {
    if (!worker) return;

    if (item.type !== 'image') {
      setError('Profile photo must be selected from an image in Gallery.');
      return;
    }

    setError(null);
    setNotice(null);

    const { data, error: updateError } = await supabase
      .from('workers')
      .update({
        avatar: item.url,
      })
      .eq('id', worker.id)
      .select('*')
      .single();

    if (updateError) {
      setError(updateError.message);
      return;
    }

    const updatedWorker = data as WorkerProfile;

    setWorker(updatedWorker);
    fillEditForm(updatedWorker);
    setNotice('Profile photo selected from Gallery.');
  }

  async function handleStudioUpload(file: File | undefined) {
    if (!file) return;

    if (isImageFile(file)) {
      await handleGalleryUpload(file, 'image');
      return;
    }

    if (isVideoFile(file)) {
      await handleGalleryUpload(file, 'video');
      return;
    }

    setError('Please upload an image or video file.');
  }

  async function handleGalleryUpload(
    file: File | undefined,
    mediaType: 'image' | 'video'
  ) {
    if (!worker || !file) return;

    if (gallery.length >= FREE_GALLERY_ITEMS_LIMIT) {
      setError(`Maximum ${FREE_GALLERY_ITEMS_LIMIT} gallery items allowed.`);
      return;
    }

    const validationError =
      mediaType === 'image' ? validateImageFile(file) : validateVideoFile(file);

    if (validationError) {
      setError(validationError);
      return;
    }

    setUploadingGallery(true);
    setError(null);
    setNotice(null);

    try {
      const uploaded = await uploadFileToWorkerStorage(
        worker.id,
        mediaType === 'image' ? 'gallery/images' : 'gallery/videos',
        file
      );

      const { data, error: insertError } = await supabase
        .from('worker_gallery')
        .insert({
          worker_id: worker.id,
          url: uploaded.publicUrl,
          type: mediaType,
        })
        .select('*')
        .single();

      if (insertError) {
        await supabase.storage.from(WORKER_MEDIA_BUCKET).remove([uploaded.path]);
        throw new Error(insertError.message);
      }

      setGallery((current) => [data as WorkerGalleryItem, ...current]);
      setNotice('Gallery media uploaded successfully.');
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : 'Gallery media could not be uploaded.'
      );
    } finally {
      setUploadingGallery(false);
    }
  }

  async function handleDeleteGalleryItem(item: WorkerGalleryItem) {
    const confirmed = window.confirm('Delete this gallery item?');

    if (!confirmed) return;

    setError(null);
    setNotice(null);

    if (worker?.avatar === item.url) {
      const { data, error: avatarUpdateError } = await supabase
        .from('workers')
        .update({
          avatar: null,
        })
        .eq('id', worker.id)
        .select('*')
        .single();

      if (avatarUpdateError) {
        setError(avatarUpdateError.message);
        return;
      }

      const updatedWorker = data as WorkerProfile;

      setWorker(updatedWorker);
      fillEditForm(updatedWorker);
    }

    const { error: deleteError } = await supabase
      .from('worker_gallery')
      .delete()
      .eq('id', item.id);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    await removeStorageFileByUrl(item.url);

    setGallery((current) =>
      current.filter((galleryItem) => galleryItem.id !== item.id)
    );
    setNotice('Gallery item deleted successfully.');
  }

  async function handleSelectServiceCategory(categoryId: string) {
    if (
      !worker ||
      !categoryId ||
      selectedServiceCategoryIds.includes(categoryId)
    ) {
      return;
    }

    setSavingServiceCategoryId(categoryId);
    setError(null);
    setNotice(null);

    const { error: insertError } = await supabase
      .from('worker_service_categories')
      .insert({
        worker_id: worker.id,
        service_category_id: categoryId,
        is_primary: false,
      });

    if (insertError) {
      setError(insertError.message);
      setSavingServiceCategoryId(null);
      return;
    }

    setSelectedServiceCategoryIds((current) => [...current, categoryId]);
    setNotice('Service category added.');
    setSavingServiceCategoryId(null);
  }

  async function handleRemoveServiceCategory(categoryId: string) {
    if (!worker) return;

    setSavingServiceCategoryId(categoryId);
    setError(null);
    setNotice(null);

    const { error: deleteError } = await supabase
      .from('worker_service_categories')
      .delete()
      .eq('worker_id', worker.id)
      .eq('service_category_id', categoryId);

    if (deleteError) {
      setError(deleteError.message);
      setSavingServiceCategoryId(null);
      return;
    }

    setSelectedServiceCategoryIds((current) =>
      current.filter((currentId) => currentId !== categoryId)
    );
    setNotice('Service category removed.');
    setSavingServiceCategoryId(null);
  }

  async function handleAddService(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!worker) return;

    const title = serviceForm.title.trim();

    if (!title) {
      setError('Service title is required.');
      return;
    }

    setSavingService(true);
    setError(null);
    setNotice(null);

    const { data, error: insertError } = await supabase
      .from('worker_services')
      .insert({
        worker_id: worker.id,
        title,
        description: serviceForm.description.trim() || null,
        price: serviceForm.price.trim() || null,
      })
      .select('*')
      .single();

    if (insertError) {
      setError(insertError.message);
      setSavingService(false);
      return;
    }

    setServices((current) => [data as WorkerService, ...current]);
    setServiceForm({
      title: '',
      description: '',
      price: '',
    });
    setNotice('Service added successfully.');
    setSavingService(false);
  }

  async function handleDeleteService(serviceId: string) {
    const confirmed = window.confirm('Delete this service?');

    if (!confirmed) return;

    setError(null);
    setNotice(null);

    const { error: deleteError } = await supabase
      .from('worker_services')
      .delete()
      .eq('id', serviceId);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    setServices((current) =>
      current.filter((service) => service.id !== serviceId)
    );
    setNotice('Service deleted successfully.');
  }

  async function handleAddSkill(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!worker) return;

    const title = skillForm.title.trim();

    if (!title) {
      setError('Skill title is required.');
      return;
    }

    setSavingSkill(true);
    setError(null);
    setNotice(null);

    const { data, error: insertError } = await supabase
      .from('worker_skills')
      .insert({
        worker_id: worker.id,
        title,
      })
      .select('*')
      .single();

    if (insertError) {
      setError(insertError.message);
      setSavingSkill(false);
      return;
    }

    setSkills((current) => [data as WorkerSkill, ...current]);
    setSkillForm({ title: '' });
    setNotice('Skill added successfully.');
    setSavingSkill(false);
  }

  async function handleDeleteSkill(skillId: string) {
    const confirmed = window.confirm('Delete this skill?');

    if (!confirmed) return;

    setError(null);
    setNotice(null);

    const { error: deleteError } = await supabase
      .from('worker_skills')
      .delete()
      .eq('id', skillId);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    setSkills((current) => current.filter((skill) => skill.id !== skillId));
    setNotice('Skill deleted successfully.');
  }

  if (loading) {
    return (
      <main style={styleVars} className="min-h-screen bg-[var(--sendio-page)]">
        <div className="rounded-2xl border border-[var(--sendio-border)] bg-white p-6 shadow-sm">
          <p className="text-sm font-bold text-slate-600">
            Loading worker dashboard...
          </p>
        </div>
      </main>
    );
  }

  if (error && !worker) {
    return (
      <main style={styleVars} className="min-h-screen bg-[var(--sendio-page)]">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
          <h2 className="text-lg font-black text-red-700">Dashboard Error</h2>
          <p className="mt-2 text-sm font-bold text-red-600">{error}</p>
        </div>
      </main>
    );
  }

  if (!worker) {
    return (
      <main style={styleVars} className="min-h-screen bg-[var(--sendio-page)]">
        <div className="mx-auto max-w-2xl rounded-2xl border border-[var(--sendio-border)] bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-black text-slate-950">
            Create Worker Profile
          </h2>
          <p className="mt-2 text-sm font-bold text-slate-600">
            Create your worker profile. This data will be saved in Supabase.
          </p>

          {error ? (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">
              {error}
            </div>
          ) : null}

          {notice ? (
            <div className="mt-4 rounded-xl border border-green-200 bg-green-50 p-3 text-sm font-bold text-green-700">
              {notice}
            </div>
          ) : null}

          <form onSubmit={handleCreateWorkerProfile} className="mt-6 space-y-4">
            <div>
              <label className="mb-1 block text-sm font-black">
                Worker Name
              </label>
              <input
                type="text"
                value={createForm.name}
                onChange={(event) =>
                  setCreateForm((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                className={inputClass()}
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-black">
                Profession
              </label>
              <input
                type="text"
                value={createForm.profession}
                onChange={(event) =>
                  setCreateForm((current) => ({
                    ...current,
                    profession: event.target.value,
                  }))
                }
                className={inputClass()}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-black">City</label>
              <input
                type="text"
                value={createForm.city}
                onChange={(event) =>
                  setCreateForm((current) => ({
                    ...current,
                    city: event.target.value,
                  }))
                }
                className={inputClass()}
              />
            </div>

            <button
              type="submit"
              disabled={savingProfile}
              className={buttonClass('w-full')}
            >
              {savingProfile ? 'Creating...' : 'Create Worker Profile'}
            </button>
          </form>
        </div>
      </main>
    );
  }

  return (
    <main
      style={styleVars}
      className="min-h-screen bg-[var(--sendio-page)] text-slate-950"
    >
      <div className="mx-auto w-full max-w-[1502px] space-y-5 px-3 py-4">
        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
            {error}
          </div>
        ) : null}

        {notice ? (
          <div className="rounded-2xl border border-green-200 bg-green-50 p-4 text-sm font-bold text-green-700">
            {notice}
          </div>
        ) : null}

        <section className="rounded-[32px] border border-[var(--sendio-border)] bg-[var(--sendio-hero)] p-5 shadow-sm">
          <div className="grid gap-5 xl:grid-cols-[240px_1fr_230px]">
            <div className="flex flex-col items-center justify-center rounded-[28px] bg-white/70 p-4">
              <div className="relative flex h-32 w-32 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-[var(--sendio-soft)] text-4xl font-black text-slate-700 shadow-sm">
                {worker.avatar ? (
                  <Image
                    src={worker.avatar}
                    alt={worker.name}
                    fill
                    className="object-contain"
                    sizes="128px"
                  />
                ) : (
                  worker.name.charAt(0).toUpperCase()
                )}
              </div>

              <p className="mt-3 text-center text-xs font-black text-slate-500">
                Profile photo is selected from Gallery only.
              </p>

              <div className="mt-3 flex flex-wrap justify-center gap-2">
                {contactActions.map((action) => {
                  const Icon = action.icon;

                  return (
                    <a
                      key={action.label}
                      href={action.href ?? '#'}
                      target="_blank"
                      rel="noreferrer"
                      title={action.label}
                      className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-[var(--sendio-button)] shadow-sm hover:ring-2 hover:ring-[var(--sendio-button)]"
                    >
                      <Icon aria-hidden="true" />
                    </a>
                  );
                })}
              </div>
            </div>

            <form onSubmit={handleSaveHeroProfile} className="space-y-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.25em] text-slate-500">
                  Worker Dashboard
                </p>
                <h1 className="mt-1 text-3xl font-black text-slate-950">
                  {worker.name}
                </h1>
                <p className="text-sm font-bold text-slate-600">
                  {worker.profession || 'Profession not added yet'}
                </p>
              </div>

              <div className="grid gap-2 md:grid-cols-2">
                <input
                  value={editForm.name}
                  onChange={(event) =>
                    setEditForm((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                  placeholder="Worker name"
                  className={inputClass()}
                  required
                />

                <input
                  value={editForm.profession}
                  onChange={(event) =>
                    setEditForm((current) => ({
                      ...current,
                      profession: event.target.value,
                    }))
                  }
                  placeholder="Profession"
                  className={inputClass()}
                />

                <input
                  value={editForm.city}
                  onChange={(event) =>
                    setEditForm((current) => ({
                      ...current,
                      city: event.target.value,
                    }))
                  }
                  placeholder="City"
                  className={inputClass()}
                />

                <select
                  value={editForm.status}
                  onChange={(event) =>
                    setEditForm((current) => ({
                      ...current,
                      status: event.target.value,
                    }))
                  }
                  className={inputClass()}
                >
                  <option value="available">Available</option>
                  <option value="busy">Busy</option>
                  <option value="unavailable">Unavailable</option>
                </select>

                <input
                  value={editForm.working_hours}
                  onChange={(event) =>
                    setEditForm((current) => ({
                      ...current,
                      working_hours: event.target.value,
                    }))
                  }
                  placeholder="Working hours"
                  className={inputClass()}
                />

                <input
                  type="number"
                  min="0"
                  value={editForm.experience_years}
                  onChange={(event) =>
                    setEditForm((current) => ({
                      ...current,
                      experience_years: event.target.value,
                    }))
                  }
                  placeholder="Experience years"
                  className={inputClass()}
                />
              </div>

              <textarea
                value={editForm.description}
                onChange={(event) =>
                  setEditForm((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
                rows={2}
                placeholder="About this worker"
                className={textareaClass()}
              />

              <button
                type="submit"
                disabled={savingProfile}
                className={buttonClass()}
              >
                {savingProfile ? 'Saving...' : 'Save Profile'}
              </button>
            </form>

            <div className="flex flex-col justify-between gap-3 rounded-[28px] bg-white/70 p-4">
              <div className="grid gap-2">
                <span className="rounded-full bg-white px-4 py-2 text-sm font-black text-slate-700 shadow-sm">
                  {formatStatus(worker.status)}
                </span>
                <span className="rounded-full bg-white px-4 py-2 text-sm font-black text-slate-700 shadow-sm">
                  {worker.city || 'City waiting'}
                </span>
                <span className="rounded-full bg-white px-4 py-2 text-sm font-black text-slate-700 shadow-sm">
                  {getStars(worker.rating)}
                </span>
              </div>

              <div className="grid gap-2">
                <button
                  type="button"
                  onClick={() => router.back()}
                  className={softButtonClass('justify-start gap-2')}
                >
                  <FaArrowLeft aria-hidden="true" />
                  Back
                </button>

                <a
                  href="#profile-completion"
                  className={softButtonClass('justify-start gap-2')}
                >
                  <FaArrowRight aria-hidden="true" />
                  Next
                </a>

                <Link
                  href="/dashboard/worker"
                  className={softButtonClass('justify-start gap-2')}
                >
                  <FaHouse aria-hidden="true" />
                  Home
                </Link>

                <Link
                  href={publicProfileHref}
                  className={buttonClass('justify-start gap-2')}
                >
                  Open Public Profile
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-3">
          <div id="adresse" className={cardClass()}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-black">Adresse</h2>
                <p className="mt-1 text-sm font-bold text-slate-600">
                  Full address and phone for worker location.
                </p>
              </div>

              <span className="rounded-full bg-[var(--sendio-soft)] px-3 py-1 text-xs font-black text-slate-700">
                {editForm.address.trim() ? 'Google Maps ready' : 'Maps waiting'}
              </span>
            </div>

            <form onSubmit={handleSaveAdresse} className="mt-5 space-y-3">
              <textarea
                value={editForm.address}
                onChange={(event) =>
                  setEditForm((current) => ({
                    ...current,
                    address: event.target.value,
                  }))
                }
                rows={2}
                placeholder="Full address"
                className={textareaClass()}
              />

              <input
                value={editForm.phone}
                onChange={(event) =>
                  setEditForm((current) => ({
                    ...current,
                    phone: event.target.value,
                  }))
                }
                placeholder="Phone"
                className={inputClass()}
              />

              <div className="flex flex-wrap gap-2">
                {getMapsUrl(editForm.address) ? (
                  <a
                    href={getMapsUrl(editForm.address) ?? '#'}
                    target="_blank"
                    rel="noreferrer"
                    className={softButtonClass('gap-2')}
                  >
                    <FaLocationDot aria-hidden="true" />
                    Open Maps
                  </a>
                ) : null}

                <button
                  type="submit"
                  disabled={savingAdresse}
                  className={buttonClass()}
                >
                  {savingAdresse ? 'Saving...' : 'Save Adresse'}
                </button>
              </div>
            </form>

            <div className="mt-5 h-3 rounded-b-2xl bg-[var(--sendio-accent)]" />
          </div>

          <div id="worker-cv" className={cardClass()}>
            <h2 className="text-xl font-black">CV</h2>
            <p className="mt-2 text-sm font-bold text-slate-600">
              Manage manual CV or upload PDF / DOC / DOCX.
            </p>

            <div className="mt-6 rounded-[24px] bg-[var(--sendio-soft)] p-5">
              <p className="text-sm font-black text-slate-700">
                CV is managed in its own clean page.
              </p>
              <p className="mt-2 text-xs font-bold text-slate-500">
                This dashboard only opens the CV page.
              </p>
            </div>

            <Link href="/dashboard/worker/cv" className={buttonClass('mt-5')}>
              Open CV
            </Link>

            <div className="mt-5 h-3 rounded-b-2xl bg-[var(--sendio-accent)]" />
          </div>

          <div id="contact" className={cardClass()}>
            <h2 className="text-xl font-black">Contact</h2>
            <p className="mt-1 text-sm font-bold text-slate-600">
              Contact and social links for the public worker profile.
            </p>

            <form onSubmit={handleSaveContact} className="mt-5 grid gap-2">
              <input
                value={editForm.email}
                onChange={(event) =>
                  setEditForm((current) => ({
                    ...current,
                    email: event.target.value,
                  }))
                }
                placeholder="Email"
                className={inputClass()}
              />

              <input
                value={editForm.website}
                onChange={(event) =>
                  setEditForm((current) => ({
                    ...current,
                    website: event.target.value,
                  }))
                }
                placeholder="Website"
                className={inputClass()}
              />

              <input
                value={editForm.whatsapp}
                onChange={(event) =>
                  setEditForm((current) => ({
                    ...current,
                    whatsapp: event.target.value,
                  }))
                }
                placeholder="WhatsApp"
                className={inputClass()}
              />

              <input
                value={socialForm.facebook}
                onChange={(event) =>
                  setSocialForm((current) => ({
                    ...current,
                    facebook: event.target.value,
                  }))
                }
                placeholder="Facebook"
                className={inputClass()}
              />

              <input
                value={socialForm.instagram}
                onChange={(event) =>
                  setSocialForm((current) => ({
                    ...current,
                    instagram: event.target.value,
                  }))
                }
                placeholder="Instagram"
                className={inputClass()}
              />

              <input
                value={socialForm.linkedin}
                onChange={(event) =>
                  setSocialForm((current) => ({
                    ...current,
                    linkedin: event.target.value,
                  }))
                }
                placeholder="LinkedIn"
                className={inputClass()}
              />

              <input
                value={socialForm.x}
                onChange={(event) =>
                  setSocialForm((current) => ({
                    ...current,
                    x: event.target.value,
                  }))
                }
                placeholder="X"
                className={inputClass()}
              />

              <button
                type="submit"
                disabled={savingContact}
                className={buttonClass('mt-2')}
              >
                {savingContact ? 'Saving...' : 'Save Contact'}
              </button>
            </form>

            <div className="mt-5 h-3 rounded-b-2xl bg-[var(--sendio-accent)]" />
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-[1.2fr_1fr_1fr]">
          <div id="media-management" className={cardClass()}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-black">Gallery</h2>
                <p className="mt-1 text-sm font-bold text-slate-600">
                  Main studio for profile media.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-[var(--sendio-soft)] px-3 py-1 text-xs font-black text-slate-700">
                  {gallery.length}/{FREE_GALLERY_ITEMS_LIMIT} free
                </span>

                <span className="rounded-full bg-[var(--sendio-soft)] px-3 py-1 text-xs font-black text-slate-500">
                  +{MAX_ACHIEVEMENT_VIDEOS} later plan
                </span>

                <label className={buttonClass('cursor-pointer')}>
                  Upload
                  <input
                    type="file"
                    accept="image/*,video/*"
                    onChange={(event) => {
                      handleStudioUpload(event.target.files?.[0]);
                      event.currentTarget.value = '';
                    }}
                    disabled={uploadingGallery}
                    className="sr-only"
                  />
                </label>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
              {gallerySlots.map((_, index) => {
                const item = gallery[index];

                return (
                  <div
                    key={item?.id ?? `gallery-slot-${index}`}
                    className="rounded-2xl border border-[var(--sendio-border)] bg-[var(--sendio-soft)] p-2"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        if (item) setPreviewItem(item);
                      }}
                      disabled={!item}
                      className="flex aspect-square w-full items-center justify-center overflow-hidden rounded-xl bg-white disabled:cursor-default"
                    >
                      {item ? (
                        item.type === 'video' ? (
                          <video
                            src={item.url}
                            className="h-full w-full object-contain"
                            muted
                            playsInline
                          />
                        ) : (
                          <span className="relative h-full w-full">
                            <Image
                              src={item.url}
                              alt="Worker gallery item"
                              fill
                              className="object-contain"
                              sizes="180px"
                            />
                          </span>
                        )
                      ) : (
                        <span className="text-xs font-black text-slate-400">
                          Empty
                        </span>
                      )}
                    </button>

                    {item ? (
                      <div className="mt-2 flex flex-wrap items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => setPreviewItem(item)}
                          className="rounded-full bg-white px-3 py-1 text-[11px] font-black text-[var(--sendio-button)]"
                        >
                          Preview
                        </button>

                        {item.type === 'image' ? (
                          <button
                            type="button"
                            onClick={() => handleSetAvatarFromGallery(item)}
                            disabled={worker.avatar === item.url}
                            className="rounded-full bg-white px-3 py-1 text-[11px] font-black text-green-700 disabled:text-slate-400"
                          >
                            {worker.avatar === item.url ? 'Set' : 'Photo'}
                          </button>
                        ) : null}

                        <button
                          type="button"
                          onClick={() => handleDeleteGalleryItem(item)}
                          className="rounded-full bg-white px-3 py-1 text-[11px] font-black text-red-600"
                        >
                          <FaTrash aria-hidden="true" />
                        </button>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>

            {uploadingGallery ? (
              <p className="mt-4 text-sm font-bold text-slate-600">
                Uploading gallery media...
              </p>
            ) : null}

            <p className="mt-4 text-xs font-bold text-slate-500">
              Images and videos are displayed with object-contain, so vertical
              video and full media remain visible without cropping.
            </p>

            <div className="mt-5 h-3 rounded-b-2xl bg-[var(--sendio-accent)]" />
          </div>

          <div id="services" className={cardClass()}>
            <h2 className="text-xl font-black">Services</h2>
            <p className="mt-1 text-sm font-bold text-slate-600">
              Add real worker services.
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <select
                value=""
                onChange={(event) => {
                  const categoryId = event.target.value;

                  if (categoryId) {
                    void handleSelectServiceCategory(categoryId);
                  }
                }}
                disabled={
                  savingServiceCategoryId !== null ||
                  availableServiceCategories.length === 0
                }
                aria-label="Choose service category"
                className="h-9 max-w-[220px] rounded-full border border-[var(--sendio-border)] bg-white px-3 text-xs font-black text-slate-700 outline-none focus:ring-2 focus:ring-[var(--sendio-button)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <option value="">
                  {availableServiceCategories.length === 0
                    ? 'All categories selected'
                    : 'Choose category'}
                </option>

                {availableServiceCategories.map((category) => {
                  const symbol = getServiceCategorySymbol(category.icon);

                  return (
                    <option key={category.id} value={category.id}>
                      {symbol ? `${symbol} ` : ''}
                      {category.name}
                    </option>
                  );
                })}
              </select>

              {selectedServiceCategories.map((category) => {
                const symbol = getServiceCategorySymbol(category.icon);

                return (
                  <span
                    key={category.id}
                    className="inline-flex min-h-9 items-center gap-2 rounded-full border border-[var(--sendio-border)] bg-[var(--sendio-soft)] px-3 py-1.5 text-xs font-black text-slate-700"
                  >
                    {symbol ? <span aria-hidden="true">{symbol}</span> : null}
                    <span>{category.name}</span>

                    <button
                    type="button"
                    onClick={() =>
                      void handleRemoveServiceCategory(category.id)
                    }
                    disabled={savingServiceCategoryId === category.id}
                    title={`Remove ${category.name}`}
                    aria-label={`Remove ${category.name}`}
                    className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-sm font-black text-red-500 disabled:opacity-50"
                  >
                      ×
                    </button>
                  </span>
                );
              })}
            </div>

            <form onSubmit={handleAddService} className="mt-5 grid gap-2">
              <input
                type="text"
                value={serviceForm.title}
                onChange={(event) =>
                  setServiceForm((current) => ({
                    ...current,
                    title: event.target.value,
                  }))
                }
                placeholder="Service title"
                className={inputClass()}
                required
              />

              <textarea
                value={serviceForm.description}
                onChange={(event) =>
                  setServiceForm((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
                placeholder="Service description"
                rows={2}
                className={textareaClass()}
              />

              <input
                type="text"
                value={serviceForm.price}
                onChange={(event) =>
                  setServiceForm((current) => ({
                    ...current,
                    price: event.target.value,
                  }))
                }
                placeholder="Price"
                className={inputClass()}
              />

              <button
                type="submit"
                disabled={savingService}
                className={buttonClass()}
              >
                {savingService ? 'Adding...' : 'Add Service'}
              </button>
            </form>

            <div className="mt-5 space-y-2">
              {services.length > 0 ? (
                services.map((service) => (
                  <div
                    key={service.id}
                    className="rounded-2xl bg-[var(--sendio-soft)] p-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-black">{service.title}</p>
                        {service.description ? (
                          <p className="mt-1 text-xs font-bold text-slate-600">
                            {service.description}
                          </p>
                        ) : null}
                        {service.price ? (
                          <p className="mt-1 text-xs font-black text-slate-700">
                            {service.price}
                          </p>
                        ) : null}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeleteService(service.id)}
                        className="rounded-full bg-white px-3 py-1 text-xs font-black text-red-600"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <p className="rounded-2xl bg-[var(--sendio-soft)] p-3 text-sm font-bold text-slate-500">
                  No services added yet.
                </p>
              )}
            </div>

            <div className="mt-5 h-3 rounded-b-2xl bg-[var(--sendio-accent)]" />
          </div>

          <div id="skills" className={cardClass()}>
            <h2 className="text-xl font-black">Skills</h2>
            <p className="mt-1 text-sm font-bold text-slate-600">
              Add real worker skills.
            </p>

            <form onSubmit={handleAddSkill} className="mt-5 flex gap-2">
              <input
                type="text"
                value={skillForm.title}
                onChange={(event) =>
                  setSkillForm({ title: event.target.value })
                }
                placeholder="Skill title"
                className={inputClass()}
                required
              />

              <button
                type="submit"
                disabled={savingSkill}
                className={buttonClass('shrink-0')}
              >
                {savingSkill ? '...' : 'Add'}
              </button>
            </form>

            <div className="mt-5 flex flex-wrap gap-2">
              {skills.length > 0 ? (
                skills.map((skill) => (
                  <span
                    key={skill.id}
                    className="inline-flex items-center gap-2 rounded-full bg-[var(--sendio-soft)] px-3 py-2 text-xs font-black text-slate-700"
                  >
                    {skill.title}
                    <button
                      type="button"
                      onClick={() => handleDeleteSkill(skill.id)}
                      className="text-red-500"
                      aria-label={`Delete ${skill.title}`}
                    >
                      ×
                    </button>
                  </span>
                ))
              ) : (
                <p className="text-sm font-bold text-slate-500">
                  No skills added yet.
                </p>
              )}
            </div>

            <div className="mt-5 h-3 rounded-b-2xl bg-[var(--sendio-accent)]" />
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-3">
          <div id="reviews" className={cardClass()}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-black">Reviews</h2>
                <p className="mt-1 text-sm font-bold text-slate-600">
                  Public feedback summary.
                </p>
              </div>

              <span className="inline-flex items-center gap-1 rounded-full bg-[var(--sendio-soft)] px-3 py-1 text-xs font-black text-slate-700">
                <FaStar aria-hidden="true" />
                {worker.rating ?? 0}
              </span>
            </div>

            <div className="mt-5 space-y-2">
              {reviews.slice(0, 3).length > 0 ? (
                reviews.slice(0, 3).map((review) => (
                  <div
                    key={review.id}
                    className="rounded-2xl bg-[var(--sendio-soft)] p-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-black">{review.user_name}</p>
                      <span className="text-xs font-black text-yellow-600">
                        {getStars(review.rating)}
                      </span>
                    </div>

                    {review.comment ? (
                      <p className="mt-1 text-xs font-bold text-slate-600">
                        {review.comment}
                      </p>
                    ) : null}
                  </div>
                ))
              ) : (
                <p className="rounded-2xl bg-[var(--sendio-soft)] p-3 text-sm font-bold text-slate-500">
                  No reviews yet.
                </p>
              )}
            </div>

            <div className="mt-5 h-3 rounded-b-2xl bg-[var(--sendio-accent)]" />
          </div>

          <div id="latest-requests" className={cardClass()}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-black">Latest Requests</h2>
                <p className="mt-1 text-sm font-bold text-slate-600">
                  Recent client requests.
                </p>
              </div>

              <Link href="/dashboard/worker/requests" className={softButtonClass()}>
                Open All
              </Link>
            </div>

            <div className="mt-5 space-y-2">
              {latestRequests.length > 0 ? (
                latestRequests.map((request) => (
                  <div
                    key={request.id}
                    className="rounded-2xl bg-[var(--sendio-soft)] p-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-black">{request.name}</p>
                        <p className="text-xs font-bold text-slate-500">
                          {formatDate(request.created_at)}
                        </p>
                      </div>

                      <span className="rounded-full bg-white px-3 py-1 text-[11px] font-black text-slate-600">
                        {request.status || 'new'}
                      </span>
                    </div>

                    <p className="mt-2 line-clamp-2 text-xs font-bold text-slate-600">
                      {request.message}
                    </p>
                  </div>
                ))
              ) : (
                <p className="rounded-2xl bg-[var(--sendio-soft)] p-3 text-sm font-bold text-slate-500">
                  No requests yet.
                </p>
              )}
            </div>

            <div className="mt-5 h-3 rounded-b-2xl bg-[var(--sendio-accent)]" />
          </div>

          <div id="profile-completion" className={cardClass()}>
            <h2 className="text-xl font-black">Profile Completion</h2>
            <p className="mt-1 text-sm font-bold text-slate-600">
              Current profile readiness.
            </p>

            <div className="mt-5 rounded-[24px] bg-[var(--sendio-soft)] p-5">
              <p className="text-4xl font-black text-slate-950">
                {profileCompletionPercent}%
              </p>

              <div className="mt-4 h-3 overflow-hidden rounded-full bg-white">
                <div
                  className="h-full rounded-full bg-[var(--sendio-button)]"
                  style={{ width: `${profileCompletionPercent}%` }}
                />
              </div>
            </div>

            <div className="mt-5 space-y-2">
              {missingProfileItems.length > 0 ? (
                missingProfileItems.slice(0, 5).map((item) => (
                  <p
                    key={item.label}
                    className="rounded-2xl bg-[var(--sendio-soft)] px-3 py-2 text-xs font-black text-slate-600"
                  >
                    Missing: {item.label}
                  </p>
                ))
              ) : (
                <p className="rounded-2xl bg-[var(--sendio-soft)] px-3 py-2 text-sm font-black text-green-700">
                  Profile is ready.
                </p>
              )}
            </div>

            <div className="mt-5 h-3 rounded-b-2xl bg-[var(--sendio-accent)]" />
          </div>
        </section>
      </div>

      {previewItem ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="relative flex h-[88vh] w-full max-w-5xl flex-col rounded-[28px] bg-white p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-sm font-black text-slate-700">
                Gallery Preview
              </p>

              <button
                type="button"
                onClick={() => setPreviewItem(null)}
                className="rounded-full bg-slate-100 px-4 py-2 text-sm font-black text-slate-700"
              >
                Close
              </button>
            </div>

            <div className="relative min-h-0 flex-1 overflow-hidden rounded-[24px] bg-slate-950">
              {previewItem.type === 'video' ? (
                <video
                  src={previewItem.url}
                  controls
                  playsInline
                  className="h-full w-full object-contain"
                />
              ) : (
                <Image
                  src={previewItem.url}
                  alt="Gallery preview"
                  fill
                  className="object-contain"
                  sizes="90vw"
                />
              )}
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}