'use client';

import Image from 'next/image';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

type UserProfile = {
  full_name: string | null;
  user_type: 'client' | 'worker' | 'company' | string | null;
  role: string | null;
};

type ResultTypeFilter = 'all' | 'workers' | 'companies';
type SortFilter = 'best_match' | 'highest_rated' | 'most_reviewed' | 'newest';
type CategoryAdSlot = 'general' | 'household' | 'gardening' | 'logistics';

type SearchIntentRule = {
  id: string;
  label: string;
  aliases: string[];
  related: string[];
};

type ExpandedSearchTerm = {
  term: string;
  weight: number;
};

type CompanyFromAd = {
  id: string;
  name: string;
  slug: string | null;
  logo: string | null;
  category: string | null;
  city: string | null;
};

type CompanyAd = {
  id: string;
  company_id: string | null;
  title: string;
  logo: string | null;
  active: boolean | null;
  created_at: string | null;
  video_url?: string | null;
  thumbnail_url?: string | null;
  image_url?: string | null;
  description?: string | null;
  media_type?: 'video' | 'image' | 'logo' | string | null;
  cta_text?: string | null;
  target_url?: string | null;
  ad_slot?: CategoryAdSlot | string | null;
  payment_status?:
    | 'unpaid'
    | 'pending'
    | 'paid'
    | 'failed'
    | 'refunded'
    | string
    | null;
  status?:
    | 'draft'
    | 'payment_pending'
    | 'active'
    | 'paused'
    | 'expired'
    | 'rejected'
    | string
    | null;
  starts_at?: string | null;
  ends_at?: string | null;
  company: CompanyFromAd | null;
};

type RawCompanyAd = {
  id: string;
  company_id: string | null;
  title: string;
  logo: string | null;
  active: boolean | null;
  created_at: string | null;
  video_url?: string | null;
  thumbnail_url?: string | null;
  image_url?: string | null;
  description?: string | null;
  media_type?: 'video' | 'image' | 'logo' | string | null;
  cta_text?: string | null;
  target_url?: string | null;
  ad_slot?: CategoryAdSlot | string | null;
  payment_status?:
    | 'unpaid'
    | 'pending'
    | 'paid'
    | 'failed'
    | 'refunded'
    | string
    | null;
  status?:
    | 'draft'
    | 'payment_pending'
    | 'active'
    | 'paused'
    | 'expired'
    | 'rejected'
    | string
    | null;
  starts_at?: string | null;
  ends_at?: string | null;
  company: CompanyFromAd | CompanyFromAd[] | null;
};

type PublicCompany = {
  id: string;
  name: string;
  slug: string | null;
  logo: string | null;
  category: string | null;
  description: string | null;
  city: string | null;
  address: string | null;
  status: string | null;
  rating: number | null;
  reviews_count: number | null;
  created_at: string | null;
};

type PublicWorker = {
  id: string;
  name: string;
  slug: string | null;
  avatar: string | null;
  profession: string | null;
  description: string | null;
  city: string | null;
  address: string | null;
  status: string | null;
  rating: number | null;
  reviews_count: number | null;
  created_at: string | null;
};

type CompanyServiceSearchRow = {
  company_id: string | null;
  title: string | null;
  description: string | null;
};

type CompanyFeatureSearchRow = {
  company_id: string | null;
  title: string | null;
};

type CompanyProjectSearchRow = {
  company_id: string | null;
  title: string | null;
  description: string | null;
};

type CompanyArticleSearchRow = {
  company_id: string | null;
  title: string | null;
  content: string | null;
};

type WorkerServiceSearchRow = {
  worker_id: string | null;
  title: string | null;
  description: string | null;
};

type WorkerSkillSearchRow = {
  worker_id: string | null;
  title: string | null;
};

type HomeStats = {
  clients: number | null;
  workers: number | null;
  companies: number | null;
};

type SearchWeights = {
  exact: number;
  starts: number;
  includes: number;
  wordStart: number;
  token: number;
};

const categoryAdSlots: {
  id: CategoryAdSlot;
  title: string;
  label: string;
  icon: string;
}[] = [
  {
    id: 'general',
    title: 'General Maintenance Services',
    label: 'General',
    icon: '🔧',
  },
  {
    id: 'household',
    title: 'Household Services',
    label: 'Household',
    icon: '🏠',
  },
  {
    id: 'gardening',
    title: 'Landscaping & Gardening',
    label: 'Gardening',
    icon: '🌿',
  },
  {
    id: 'logistics',
    title: 'Logistics & Delivery Services',
    label: 'Logistics',
    icon: '🚚',
  },
];

const majorBelgianCities = [
  'All Belgium',
  'Brussels',
  'Antwerp',
  'Ghent',
  'Charleroi',
  'Liège',
  'Bruges',
  'Namur',
  'Leuven',
  'Mons',
  'Mechelen',
  'Aalst',
  'La Louvière',
  'Kortrijk',
  'Hasselt',
  'Ostend',
  'Sint-Niklaas',
  'Tournai',
  'Genk',
  'Seraing',
  'Roeselare',
  'Verviers',
  'Mouscron',
];

const searchIntentRules: SearchIntentRule[] = [
  {
    id: 'bathroom_sanitary',
    label: 'Bathroom / Sanitary',
    aliases: [
      'صحيات',
      'حمامات',
      'سباك',
      'سباكة',
      'sanitary',
      'bathroom',
      'plumber',
      'plumbing',
      'toilet',
      'shower',
      'salle de bain',
      'sanitaire',
      'plombier',
      'sanitair',
      'loodgieter',
      'badkamer',
    ],
    related: [
      'bathroom renovation',
      'bathroom fixtures',
      'bathroom doors',
      'tiles',
      'ceramic',
      'waterproofing',
      'water leak',
      'drainage',
      'bathroom cleaning',
      'bathroom decoration',
      'maintenance',
      'renovation',
      'carrelage',
      'étanchéité',
      'rénovation salle de bain',
      'tegels',
      'waterdichting',
      'badkamer renovatie',
    ],
  },
  {
    id: 'cupping_wellness',
    label: 'Cupping / Wellness',
    aliases: [
      'حجامة',
      'حجامه',
      'hijama',
      'cupping',
      'cupping therapy',
      'ventouse',
      'cupping massage',
    ],
    related: [
      'massage',
      'wellness',
      'physiotherapy',
      'pain relief',
      'sports recovery',
      'rehabilitation',
      'therapy',
      'therapeutic massage',
      'kiné',
      'kinésithérapie',
      'fysiotherapie',
      'revalidatie',
    ],
  },
  {
    id: 'car_maintenance',
    label: 'Car Maintenance',
    aliases: [
      'صيانة سيارة',
      'تصليح سيارة',
      'ميكانيكي',
      'garage',
      'mechanic',
      'car maintenance',
      'auto repair',
      'vehicle repair',
      'mécanicien',
      'réparation voiture',
      'monteur',
      'auto onderhoud',
    ],
    related: [
      'bodywork',
      'car painting',
      'vehicle service',
      'oil change',
      'tires',
      'diagnostics',
      'battery',
      'brakes',
      'carrosserie',
      'peinture voiture',
      'banden',
      'remmen',
      'auto spuiten',
    ],
  },
  {
    id: 'electricity',
    label: 'Electricity',
    aliases: [
      'كهربائي',
      'كهرباء',
      'electrician',
      'electricity',
      'electrical',
      'électricien',
      'électricité',
      'elektricien',
      'elektriciteit',
    ],
    related: [
      'wiring',
      'lighting',
      'sockets',
      'electrical repair',
      'installation',
      'fuse box',
      'bathroom lighting',
      'câblage',
      'éclairage',
      'stopcontacten',
      'verlichting',
    ],
  },
  {
    id: 'carpentry',
    label: 'Carpentry',
    aliases: [
      'نجار',
      'نجارة',
      'carpenter',
      'carpentry',
      'woodwork',
      'menuisier',
      'menuiserie',
      'timmerman',
      'schrijnwerker',
    ],
    related: [
      'doors',
      'furniture',
      'kitchen installation',
      'wood repair',
      'cabinet',
      'stairs',
      'portes',
      'meubles',
      'deuren',
      'meubels',
    ],
  },
  {
    id: 'cleaning',
    label: 'Cleaning',
    aliases: [
      'تنظيف',
      'cleaning',
      'cleaner',
      'house cleaning',
      'office cleaning',
      'nettoyage',
      'schoonmaak',
      'poetsdienst',
    ],
    related: [
      'deep cleaning',
      'bathroom cleaning',
      'sanitary cleaning',
      'window cleaning',
      'end of tenancy cleaning',
      'industrial cleaning',
      'nettoyage sanitaire',
      'ramen wassen',
    ],
  },
  {
    id: 'painting_decoration',
    label: 'Painting / Decoration',
    aliases: [
      'صباغ',
      'دهان',
      'ديكور',
      'painting',
      'painter',
      'decoration',
      'paint',
      'peintre',
      'peinture',
      'schilder',
      'schilderwerk',
    ],
    related: [
      'interior design',
      'wall repair',
      'wallpaper',
      'renovation',
      'plastering',
      'gypsum',
      'papier peint',
      'interieur',
      'behang',
    ],
  },
  {
    id: 'construction_renovation',
    label: 'Construction / Renovation',
    aliases: [
      'بناء',
      'ترميم',
      'تجديد',
      'construction',
      'renovation',
      'builder',
      'building',
      'rénovation',
      'construction maison',
      'renovatie',
      'bouw',
    ],
    related: [
      'masonry',
      'tiles',
      'bathroom renovation',
      'kitchen renovation',
      'roofing',
      'flooring',
      'maçonnerie',
      'toiture',
      'vloer',
      'metselwerk',
    ],
  },
  {
    id: 'gardening_landscaping',
    label: 'Gardening / Landscaping',
    aliases: [
      'حدائق',
      'بستاني',
      'gardening',
      'gardener',
      'landscaping',
      'garden',
      'jardinage',
      'jardinier',
      'tuinman',
      'tuinonderhoud',
    ],
    related: [
      'grass',
      'lawn',
      'trees',
      'plants',
      'hedges',
      'terrace',
      'paving',
      'pelouse',
      'haies',
      'gazon',
      'hagen',
    ],
  },
  {
    id: 'delivery_logistics',
    label: 'Delivery / Logistics',
    aliases: [
      'توصيل',
      'نقل',
      'delivery',
      'logistics',
      'transport',
      'moving',
      'livraison',
      'transporteur',
      'bezorging',
      'verhuis',
    ],
    related: [
      'courier',
      'furniture moving',
      'package delivery',
      'truck',
      'driver',
      'déménagement',
      'koerier',
      'chauffeur',
    ],
  },
];

function getRoleLabel(userType: string | null | undefined) {
  if (userType === 'company') return 'Corporate Account';
  if (userType === 'worker') return 'Verified Worker';
  if (userType === 'client') return 'Premium Client';
  return 'Online';
}

function getDashboardLink(userType: string | null | undefined) {
  if (userType === 'company') return '/dashboard/company';
  if (userType === 'worker') return '/dashboard/worker';
  return '/';
}

function formatCount(value: number | null) {
  if (value === null) return '—';
  return value.toLocaleString();
}

function getCompanyProfileHref(company: { id: string; slug: string | null }) {
  const identifier = company.slug?.trim() || company.id;

  return `/companies/${encodeURIComponent(identifier)}`;
}

function getWorkerProfileHref(worker: { id: string; slug: string | null }) {
  const identifier = worker.slug?.trim() || worker.id;

  return `/workers/${encodeURIComponent(identifier)}`;
}

function getAdHref(ad: CompanyAd) {
  if (ad.company) {
    return getCompanyProfileHref(ad.company);
  }

  if (ad.company_id) {
    return `/companies/${encodeURIComponent(ad.company_id)}`;
  }

  if (ad.target_url) return ad.target_url;

  return '/';
}

function getShortCompanyName(name: string) {
  const cleanName = name.trim();

  if (!cleanName) return '';

  const words = cleanName.split(/\s+/);

  if (words.length === 1) {
    return words[0].slice(0, 10);
  }

  return words
    .slice(0, 2)
    .map((word) => word.slice(0, 4))
    .join(' ');
}

function getShortWorkerName(name: string) {
  const cleanName = name.trim();

  if (!cleanName) return '';

  const words = cleanName.split(/\s+/);

  if (words.length === 1) {
    return words[0].slice(0, 10);
  }

  return words
    .slice(0, 2)
    .map((word) => word.slice(0, 4))
    .join(' ');
}

function getWorkerStatusLabel(status: string | null) {
  if (status === 'available') return 'Available';
  return 'Unavailable';
}

function getWorkerStatusClass(status: string | null) {
  if (status === 'available') return 'worker-status-available';
  return 'worker-status-unavailable';
}

function getMiniRatingStars(rating: number | null) {
  const ratingValue = Number(rating ?? 0);
  const roundedRating = Math.max(0, Math.min(5, Math.round(ratingValue)));

  return Array.from({ length: 5 }, (_, index) =>
    index < roundedRating ? '★' : '☆'
  ).join('');
}

function getMiniRatingText(rating: number | null, reviewsCount: number | null) {
  if (!reviewsCount || reviewsCount <= 0) return 'New';

  return Number(rating ?? 0).toFixed(1);
}

function getAdMedia(ad: CompanyAd) {
  return (
    ad.video_url ||
    ad.thumbnail_url ||
    ad.image_url ||
    ad.logo ||
    ad.company?.logo ||
    null
  );
}

function isVideoAd(ad: CompanyAd) {
  return Boolean(ad.video_url) || ad.media_type === 'video';
}

function isPublicActiveAd(ad: CompanyAd) {
  if (ad.active !== true) return false;
  if (ad.status && ad.status !== 'active') return false;
  if (ad.payment_status && ad.payment_status !== 'paid') return false;

  const now = new Date();

  if (ad.starts_at) {
    const startDate = new Date(ad.starts_at);

    if (!Number.isNaN(startDate.getTime()) && startDate > now) {
      return false;
    }
  }

  if (ad.ends_at) {
    const endDate = new Date(ad.ends_at);

    if (!Number.isNaN(endDate.getTime()) && endDate <= now) {
      return false;
    }
  }

  return true;
}

function normalizeCompanyAd(ad: RawCompanyAd): CompanyAd {
  return {
    id: ad.id,
    company_id: ad.company_id,
    title: ad.title,
    logo: ad.logo,
    active: ad.active,
    created_at: ad.created_at,
    video_url: ad.video_url ?? null,
    thumbnail_url: ad.thumbnail_url ?? null,
    image_url: ad.image_url ?? null,
    description: ad.description ?? null,
    media_type: ad.media_type ?? null,
    cta_text: ad.cta_text ?? null,
    target_url: ad.target_url ?? null,
    ad_slot: ad.ad_slot ?? null,
    payment_status: ad.payment_status ?? null,
    status: ad.status ?? null,
    starts_at: ad.starts_at ?? null,
    ends_at: ad.ends_at ?? null,
    company: Array.isArray(ad.company)
      ? ad.company[0] ?? null
      : ad.company ?? null,
  };
}

function normalizeSearchText(value: string | null | undefined) {
  return (value ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[إأآا]/g, 'ا')
    .replace(/[ى]/g, 'ي')
    .replace(/[ة]/g, 'ه')
    .replace(/[ؤ]/g, 'و')
    .replace(/[ئ]/g, 'ي')
    .replace(/[ـ]/g, '')
    .replace(/[^\p{L}\p{N}\s]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getSearchPhrases(value: string | null | undefined) {
  const normalized = normalizeSearchText(value);

  if (!normalized) return [];

  const words = normalized.split(/\s+/).filter(Boolean);
  const phrases: string[] = [];
  const maxLength = Math.min(3, words.length);

  for (let size = maxLength; size >= 1; size -= 1) {
    for (let index = 0; index <= words.length - size; index += 1) {
      phrases.push(words.slice(index, index + size).join(' '));
    }
  }

  if (words.length > 3) {
    phrases.unshift(words.join(' '));
  }

  return Array.from(new Set(phrases));
}

function getMatchedIntentRules(value: string | null | undefined) {
  const phrases = getSearchPhrases(value);

  if (phrases.length === 0) return [];

  return searchIntentRules.filter((rule) => {
    const aliases = rule.aliases.map(normalizeSearchText);
    const related = rule.related.map(normalizeSearchText);

    return phrases.some((phrase) => {
      return [...aliases, ...related].some((term) => {
        if (!term) return false;
        return term === phrase || term.includes(phrase) || phrase.includes(term);
      });
    });
  });
}

function getExpandedSearchTerms(value: string | null | undefined) {
  const exactPhrases = getSearchPhrases(value);
  const terms: ExpandedSearchTerm[] = exactPhrases.map((term) => ({
    term,
    weight: 1,
  }));

  const matchedRules = getMatchedIntentRules(value);

  matchedRules.forEach((rule) => {
    rule.aliases.forEach((term) => {
      terms.push({ term, weight: 0.86 });
    });

    rule.related.forEach((term) => {
      terms.push({ term, weight: 0.62 });
    });
  });

  const seenTerms = new Map<string, ExpandedSearchTerm>();

  terms.forEach((item) => {
    const normalized = normalizeSearchText(item.term);

    if (!normalized) return;

    const current = seenTerms.get(normalized);

    if (!current || item.weight > current.weight) {
      seenTerms.set(normalized, { term: normalized, weight: item.weight });
    }
  });

  return Array.from(seenTerms.values());
}

function getWeightedTextScore(
  fields: Array<string | null | undefined>,
  queryValue: string,
  weights: SearchWeights
) {
  const query = normalizeSearchText(queryValue);

  if (!query) return 0;

  const queryTokens = query.split(/\s+/).filter(Boolean);
  let bestScore = 0;

  fields.forEach((field) => {
    const text = normalizeSearchText(field);

    if (!text) return;

    if (text === query) {
      bestScore = Math.max(bestScore, weights.exact);
      return;
    }

    if (text.startsWith(query)) {
      bestScore = Math.max(bestScore, weights.starts);
      return;
    }

    if (text.includes(query)) {
      bestScore = Math.max(bestScore, weights.includes);
      return;
    }

    const words = text.split(/\s+/).filter(Boolean);

    if (words.some((word) => word.startsWith(query))) {
      bestScore = Math.max(bestScore, weights.wordStart);
    }

    const matchedTokens = queryTokens.filter((token) =>
      text.includes(token)
    ).length;

    if (matchedTokens > 0) {
      bestScore = Math.max(
        bestScore,
        Math.round((weights.token * matchedTokens) / queryTokens.length)
      );
    }
  });

  return bestScore;
}

function getExpandedWeightedTextScore(
  fields: Array<string | null | undefined>,
  queryValue: string,
  weights: SearchWeights
) {
  const expandedTerms = getExpandedSearchTerms(queryValue);
  let bestScore = 0;

  expandedTerms.forEach((item) => {
    const termScore = getWeightedTextScore(fields, item.term, weights);
    bestScore = Math.max(bestScore, Math.round(termScore * item.weight));
  });

  return bestScore;
}

function getLocationSearchScore(
  fields: Array<string | null | undefined>,
  locationQuery: string
) {
  const cleanLocationQuery = normalizeSearchText(locationQuery);

  if (!cleanLocationQuery) return 0;

  const score = getWeightedTextScore(fields, cleanLocationQuery, {
    exact: 500,
    starts: 420,
    includes: 340,
    wordStart: 260,
    token: 160,
  });

  return score > 0 ? score : -1;
}

function getCompanySearchScore(
  company: PublicCompany,
  searchQuery: string,
  locationQuery: string,
  companySearchTerms: string[],
  selectedIntent: string
) {
  const cleanSearchQuery = normalizeSearchText(searchQuery);
  const activeIntent = selectedIntent === 'all' ? '' : selectedIntent;
  const locationScore = getLocationSearchScore(
    [company.city, company.address],
    locationQuery
  );

  if (locationScore < 0) return -1;

  const companyFields = [
    company.name,
    company.category,
    company.description,
    company.status,
    ...companySearchTerms,
  ];

  let searchScore = 0;

  if (cleanSearchQuery) {
    const nameScore = getExpandedWeightedTextScore([company.name], searchQuery, {
      exact: 1300,
      starts: 1080,
      includes: 880,
      wordStart: 720,
      token: 450,
    });

    const categoryAndTermsScore = getExpandedWeightedTextScore(
      [company.category, ...companySearchTerms],
      searchQuery,
      {
        exact: 980,
        starts: 850,
        includes: 700,
        wordStart: 540,
        token: 350,
      }
    );

    const descriptionScore = getExpandedWeightedTextScore(
      [company.description],
      searchQuery,
      {
        exact: 470,
        starts: 390,
        includes: 300,
        wordStart: 240,
        token: 170,
      }
    );

    const statusScore = getExpandedWeightedTextScore(
      [company.status],
      searchQuery,
      {
        exact: 180,
        starts: 140,
        includes: 100,
        wordStart: 80,
        token: 50,
      }
    );

    searchScore = Math.max(
      nameScore,
      categoryAndTermsScore,
      descriptionScore,
      statusScore
    );

    if (searchScore <= 0) return -1;
  }

  if (activeIntent) {
    const intentScore = getExpandedWeightedTextScore(companyFields, activeIntent, {
      exact: 900,
      starts: 780,
      includes: 640,
      wordStart: 500,
      token: 320,
    });

    if (intentScore <= 0) return -1;

    searchScore += intentScore;
  }

  if (!cleanSearchQuery && !activeIntent) {
    return locationScore;
  }

  return searchScore + locationScore;
}

function getWorkerSearchScore(
  worker: PublicWorker,
  searchQuery: string,
  locationQuery: string,
  workerSearchTerms: string[],
  selectedIntent: string
) {
  const cleanSearchQuery = normalizeSearchText(searchQuery);
  const activeIntent = selectedIntent === 'all' ? '' : selectedIntent;
  const locationScore = getLocationSearchScore(
    [worker.city, worker.address],
    locationQuery
  );

  if (locationScore < 0) return -1;

  const workerFields = [
    worker.name,
    worker.profession,
    worker.description,
    worker.status,
    ...workerSearchTerms,
  ];

  let searchScore = 0;

  if (cleanSearchQuery) {
    const nameScore = getExpandedWeightedTextScore([worker.name], searchQuery, {
      exact: 1300,
      starts: 1080,
      includes: 880,
      wordStart: 720,
      token: 450,
    });

    const professionAndTermsScore = getExpandedWeightedTextScore(
      [worker.profession, ...workerSearchTerms],
      searchQuery,
      {
        exact: 1000,
        starts: 860,
        includes: 720,
        wordStart: 560,
        token: 370,
      }
    );

    const descriptionScore = getExpandedWeightedTextScore(
      [worker.description],
      searchQuery,
      {
        exact: 470,
        starts: 390,
        includes: 300,
        wordStart: 240,
        token: 170,
      }
    );

    const statusScore = getExpandedWeightedTextScore(
      [worker.status],
      searchQuery,
      {
        exact: 180,
        starts: 140,
        includes: 100,
        wordStart: 80,
        token: 50,
      }
    );

    searchScore = Math.max(
      nameScore,
      professionAndTermsScore,
      descriptionScore,
      statusScore
    );

    if (searchScore <= 0) return -1;
  }

  if (activeIntent) {
    const intentScore = getExpandedWeightedTextScore(workerFields, activeIntent, {
      exact: 900,
      starts: 780,
      includes: 640,
      wordStart: 500,
      token: 320,
    });

    if (intentScore <= 0) return -1;

    searchScore += intentScore;
  }

  if (!cleanSearchQuery && !activeIntent) {
    return locationScore;
  }

  return searchScore + locationScore;
}

function getUniqueSuggestedValues(
  values: Array<string | null | undefined>,
  currentValue: string,
  limit = 8
) {
  const currentSearch = normalizeSearchText(currentValue);
  const seenValues = new Set<string>();
  const suggestions: string[] = [];

  values.forEach((value) => {
    const cleanValue = value?.trim();

    if (!cleanValue) return;

    const normalizedValue = normalizeSearchText(cleanValue);

    if (!normalizedValue || seenValues.has(normalizedValue)) return;

    if (currentSearch && !normalizedValue.includes(currentSearch)) return;

    seenValues.add(normalizedValue);
    suggestions.push(cleanValue);
  });

  return suggestions.slice(0, limit);
}

function getCreatedTime(value: string | null) {
  if (!value) return 0;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return 0;

  return date.getTime();
}

export default function HomePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [companyUnreadMessages, setCompanyUnreadMessages] = useState(0);
  const [ads, setAds] = useState<CompanyAd[]>([]);
  const [publicCompanies, setPublicCompanies] = useState<PublicCompany[]>([]);
  const [publicWorkers, setPublicWorkers] = useState<PublicWorker[]>([]);
  const [companySearchTerms, setCompanySearchTerms] = useState<
    Record<string, string[]>
  >({});
  const [workerSearchTerms, setWorkerSearchTerms] = useState<
    Record<string, string[]>
  >({});
  const [homeSearch, setHomeSearch] = useState('');
  const [homeLocation, setHomeLocation] = useState('');
  const [homeSearchNotice, setHomeSearchNotice] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [resultTypeFilter, setResultTypeFilter] =
    useState<ResultTypeFilter>('all');
  const [filterCitySearch, setFilterCitySearch] = useState('');
  const [filterServiceSearch, setFilterServiceSearch] = useState('');
  const [availableOnly, setAvailableOnly] = useState(false);
  const [sortFilter, setSortFilter] = useState<SortFilter>('best_match');
  const [categoryAdIndexes, setCategoryAdIndexes] = useState<
    Record<CategoryAdSlot, number>
  >({
    general: 0,
    household: 0,
    gardening: 0,
    logistics: 0,
  });
  const [stats, setStats] = useState<HomeStats>({
    clients: null,
    workers: null,
    companies: null,
  });

  const isLoggedIn = Boolean(userEmail);

  const publicActiveAds = useMemo(() => {
    return ads.filter(isPublicActiveAd);
  }, [ads]);

  const categoryAdsBySlot = useMemo(() => {
    const grouped: Record<CategoryAdSlot, CompanyAd[]> = {
      general: [],
      household: [],
      gardening: [],
      logistics: [],
    };

    publicActiveAds.forEach((ad) => {
      if (
        ad.ad_slot === 'general' ||
        ad.ad_slot === 'household' ||
        ad.ad_slot === 'gardening' ||
        ad.ad_slot === 'logistics'
      ) {
        grouped[ad.ad_slot].push(ad);
      }
    });

    return grouped;
  }, [publicActiveAds]);

  const marqueeAds = useMemo(() => {
    const sliderOnlyAds = publicActiveAds.filter((ad) => !ad.ad_slot);

    if (sliderOnlyAds.length === 0) return [];

    const repeatedAds: CompanyAd[] = [];
    const minimumItems = 8;

    while (repeatedAds.length < minimumItems) {
      repeatedAds.push(...sliderOnlyAds);
    }

    return [...repeatedAds, ...repeatedAds];
  }, [publicActiveAds]);

  const activeLocationQuery = useMemo(() => {
    if (homeLocation.trim()) return homeLocation.trim();
    if (filterCitySearch.trim()) return filterCitySearch.trim();
    return '';
  }, [filterCitySearch, homeLocation]);

  const activeIntentQuery = useMemo(() => {
    return filterServiceSearch.trim();
  }, [filterServiceSearch]);

  const searchSuggestions = useMemo(() => {
    if (!homeSearch.trim()) return [];

    const companyServiceValues = Object.values(companySearchTerms).flat();
    const workerServiceValues = Object.values(workerSearchTerms).flat();
    const intentValues = searchIntentRules.flatMap((rule) => [
      rule.label,
      ...rule.aliases.slice(0, 4),
    ]);

    return getUniqueSuggestedValues(
      [
        ...publicWorkers.map((worker) => worker.profession),
        ...publicWorkers.map((worker) => worker.name),
        ...publicCompanies.map((company) => company.category),
        ...publicCompanies.map((company) => company.name),
        ...companyServiceValues,
        ...workerServiceValues,
        ...intentValues,
      ],
      homeSearch,
      8
    );
  }, [
    companySearchTerms,
    homeSearch,
    publicCompanies,
    publicWorkers,
    workerSearchTerms,
  ]);

  const locationSuggestions = useMemo(() => {
    if (!homeLocation.trim()) return [];

    return getUniqueSuggestedValues(
      [
        ...majorBelgianCities,
        ...publicWorkers.map((worker) => worker.city),
        ...publicCompanies.map((company) => company.city),
      ],
      homeLocation,
      8
    ).filter((city) => city !== 'All Belgium');
  }, [homeLocation, publicCompanies, publicWorkers]);

  const filterCitySuggestions = useMemo(() => {
    if (!filterCitySearch.trim()) return [];

    return getUniqueSuggestedValues(
      [
        ...majorBelgianCities,
        ...publicWorkers.map((worker) => worker.city),
        ...publicCompanies.map((company) => company.city),
      ],
      filterCitySearch,
      6
    ).filter((city) => city !== 'All Belgium');
  }, [filterCitySearch, publicCompanies, publicWorkers]);

  const filterServiceSuggestions = useMemo(() => {
    if (!filterServiceSearch.trim()) return [];

    const companyServiceValues = Object.values(companySearchTerms).flat();
    const workerServiceValues = Object.values(workerSearchTerms).flat();
    const intentValues = searchIntentRules.flatMap((rule) => [
      rule.label,
      ...rule.aliases,
      ...rule.related,
    ]);

    return getUniqueSuggestedValues(
      [
        ...publicWorkers.map((worker) => worker.profession),
        ...publicWorkers.map((worker) => worker.name),
        ...publicCompanies.map((company) => company.category),
        ...publicCompanies.map((company) => company.name),
        ...companyServiceValues,
        ...workerServiceValues,
        ...intentValues,
      ],
      filterServiceSearch,
      8
    );
  }, [
    companySearchTerms,
    filterServiceSearch,
    publicCompanies,
    publicWorkers,
    workerSearchTerms,
  ]);

  const matchedSearchIntentLabels = useMemo(() => {
    const combinedSearch = [homeSearch, filterServiceSearch]
      .filter((value) => value.trim().length > 0)
      .join(' ');

    if (!combinedSearch.trim()) return [];

    return getMatchedIntentRules(combinedSearch).map((rule) => rule.label);
  }, [filterServiceSearch, homeSearch]);

  const companyScoreItems = useMemo(() => {
    const searchQuery = homeSearch.trim();

    return publicCompanies
      .map((company) => {
        const score = getCompanySearchScore(
          company,
          searchQuery,
          activeLocationQuery,
          companySearchTerms[company.id] ?? [],
          activeIntentQuery
        );

        return { company, score };
      })
      .filter((item) => item.score >= 0);
  }, [
    activeIntentQuery,
    activeLocationQuery,
    companySearchTerms,
    homeSearch,
    publicCompanies,
  ]);

  const workerScoreItems = useMemo(() => {
    const searchQuery = homeSearch.trim();

    return publicWorkers
      .map((worker) => {
        const score = getWorkerSearchScore(
          worker,
          searchQuery,
          activeLocationQuery,
          workerSearchTerms[worker.id] ?? [],
          activeIntentQuery
        );

        return { worker, score };
      })
      .filter((item) => {
        if (item.score < 0) return false;
        if (availableOnly && item.worker.status !== 'available') return false;
        return true;
      });
  }, [
    activeIntentQuery,
    activeLocationQuery,
    availableOnly,
    homeSearch,
    publicWorkers,
    workerSearchTerms,
  ]);

  const filteredPublicCompanies = useMemo(() => {
    if (resultTypeFilter === 'workers') return [];

    const items = [...companyScoreItems];

    items.sort((a, b) => {
      if (sortFilter === 'highest_rated') {
        return (b.company.rating ?? 0) - (a.company.rating ?? 0);
      }

      if (sortFilter === 'most_reviewed') {
        return (b.company.reviews_count ?? 0) - (a.company.reviews_count ?? 0);
      }

      if (sortFilter === 'newest') {
        return getCreatedTime(b.company.created_at) - getCreatedTime(a.company.created_at);
      }

      if (b.score !== a.score) return b.score - a.score;
      return a.company.name.localeCompare(b.company.name);
    });

    return items.map((item) => item.company);
  }, [companyScoreItems, resultTypeFilter, sortFilter]);

  const filteredPublicWorkers = useMemo(() => {
    if (resultTypeFilter === 'companies') return [];

    const items = [...workerScoreItems];

    items.sort((a, b) => {
      if (sortFilter === 'highest_rated') {
        return (b.worker.rating ?? 0) - (a.worker.rating ?? 0);
      }

      if (sortFilter === 'most_reviewed') {
        return (b.worker.reviews_count ?? 0) - (a.worker.reviews_count ?? 0);
      }

      if (sortFilter === 'newest') {
        return getCreatedTime(b.worker.created_at) - getCreatedTime(a.worker.created_at);
      }

      if (b.score !== a.score) return b.score - a.score;
      return a.worker.name.localeCompare(b.worker.name);
    });

    return items.map((item) => item.worker);
  }, [resultTypeFilter, sortFilter, workerScoreItems]);

  const workerGridItems = useMemo(() => {
    const workersToShow = filteredPublicWorkers.slice(0, 24);

    return Array.from(
      { length: 24 },
      (_, index) => workersToShow[index] ?? null
    );
  }, [filteredPublicWorkers]);

  const companyGridItems = useMemo(() => {
    const companiesToShow = filteredPublicCompanies.slice(0, 24);

    return Array.from(
      { length: 24 },
      (_, index) => companiesToShow[index] ?? null
    );
  }, [filteredPublicCompanies]);

  const activeFilterCount = useMemo(() => {
    let count = 0;

    if (resultTypeFilter !== 'all') count += 1;
    if (filterCitySearch.trim()) count += 1;
    if (filterServiceSearch.trim()) count += 1;
    if (availableOnly) count += 1;
    if (sortFilter !== 'best_match') count += 1;

    return count;
  }, [
    availableOnly,
    filterCitySearch,
    filterServiceSearch,
    resultTypeFilter,
    sortFilter,
  ]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setCategoryAdIndexes((currentIndexes) => ({
        general: currentIndexes.general + 1,
        household: currentIndexes.household + 1,
        gardening: currentIndexes.gardening + 1,
        logistics: currentIndexes.logistics + 1,
      }));
    }, 5000);

    return () => {
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    async function loadHomeData() {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData.user;

      if (user) {
        setUserEmail(user.email ?? null);

        const { data: profileData } = await supabase
          .from('profiles')
          .select('full_name, user_type, role')
          .eq('id', user.id)
          .maybeSingle();

        if (profileData) {
          const loadedProfile = profileData as UserProfile;

          setProfile(loadedProfile);

          if (loadedProfile.user_type === 'company') {
            const { data: companyData } = await supabase
              .from('companies')
              .select('id')
              .eq('user_id', user.id)
              .maybeSingle();

            if (companyData?.id) {
              const { count } = await supabase
                .from('company_messages')
                .select('id', { count: 'exact', head: true })
                .eq('company_id', companyData.id)
                .eq('company_seen', false)
                .eq('is_archived', false);

              setCompanyUnreadMessages(count ?? 0);
            }
          } else {
            setCompanyUnreadMessages(0);
          }
        } else {
          setCompanyUnreadMessages(0);
        }
      }

      const { data: adsData } = await supabase
        .from('company_ads')
        .select(`
          *,
          company:companies!company_ads_company_id_fkey (
            id,
            name,
            slug,
            logo,
            category,
            city
          )
        `)
        .eq('active', true)
        .order('created_at', { ascending: false });

      if (adsData) {
        const normalizedAds = (adsData as unknown as RawCompanyAd[]).map(
          normalizeCompanyAd
        );
        setAds(normalizedAds);
      }

      const { data: publicWorkersData } = await supabase
        .from('workers')
        .select(
          'id, name, slug, avatar, profession, description, city, address, status, rating, reviews_count, created_at'
        )
        .order('created_at', { ascending: false });

      if (publicWorkersData) {
        setPublicWorkers(publicWorkersData as PublicWorker[]);
      }

      const { data: publicCompaniesData } = await supabase
        .from('companies')
        .select(
          'id, name, slug, logo, category, description, city, address, status, rating, reviews_count, created_at'
        )
        .order('created_at', { ascending: false });

      if (publicCompaniesData) {
        setPublicCompanies(publicCompaniesData as PublicCompany[]);
      }

      const [
        companyServicesResult,
        companyFeaturesResult,
        companyProjectsResult,
        companyArticlesResult,
        workerServicesResult,
        workerSkillsResult,
      ] = await Promise.all([
        supabase.from('company_services').select('company_id, title, description'),
        supabase.from('company_features').select('company_id, title'),
        supabase.from('company_projects').select('company_id, title, description'),
        supabase.from('company_articles').select('company_id, title, content'),
        supabase.from('worker_services').select('worker_id, title, description'),
        supabase.from('worker_skills').select('worker_id, title'),
      ]);

      const termsByCompany: Record<string, string[]> = {};

      ((companyServicesResult.data ?? []) as CompanyServiceSearchRow[]).forEach(
        (service) => {
          if (!service.company_id) return;

          const serviceTerms = [service.title, service.description].filter(
            (value): value is string =>
              typeof value === 'string' && value.trim().length > 0
          );

          termsByCompany[service.company_id] = [
            ...(termsByCompany[service.company_id] ?? []),
            ...serviceTerms,
          ];
        }
      );

      ((companyFeaturesResult.data ?? []) as CompanyFeatureSearchRow[]).forEach(
        (feature) => {
          if (!feature.company_id || !feature.title?.trim()) return;

          termsByCompany[feature.company_id] = [
            ...(termsByCompany[feature.company_id] ?? []),
            feature.title,
          ];
        }
      );

      ((companyProjectsResult.data ?? []) as CompanyProjectSearchRow[]).forEach(
        (project) => {
          if (!project.company_id) return;

          const projectTerms = [project.title, project.description].filter(
            (value): value is string =>
              typeof value === 'string' && value.trim().length > 0
          );

          termsByCompany[project.company_id] = [
            ...(termsByCompany[project.company_id] ?? []),
            ...projectTerms,
          ];
        }
      );

      ((companyArticlesResult.data ?? []) as CompanyArticleSearchRow[]).forEach(
        (article) => {
          if (!article.company_id) return;

          const articleTerms = [article.title, article.content].filter(
            (value): value is string =>
              typeof value === 'string' && value.trim().length > 0
          );

          termsByCompany[article.company_id] = [
            ...(termsByCompany[article.company_id] ?? []),
            ...articleTerms,
          ];
        }
      );

      setCompanySearchTerms(termsByCompany);

      const termsByWorker: Record<string, string[]> = {};

      ((workerServicesResult.data ?? []) as WorkerServiceSearchRow[]).forEach(
        (service) => {
          if (!service.worker_id) return;

          const serviceTerms = [service.title, service.description].filter(
            (value): value is string =>
              typeof value === 'string' && value.trim().length > 0
          );

          termsByWorker[service.worker_id] = [
            ...(termsByWorker[service.worker_id] ?? []),
            ...serviceTerms,
          ];
        }
      );

      ((workerSkillsResult.data ?? []) as WorkerSkillSearchRow[]).forEach(
        (skill) => {
          if (!skill.worker_id || !skill.title?.trim()) return;

          termsByWorker[skill.worker_id] = [
            ...(termsByWorker[skill.worker_id] ?? []),
            skill.title,
          ];
        }
      );

      setWorkerSearchTerms(termsByWorker);

      const [clientsResult, workersResult, companiesResult] =
        await Promise.all([
          supabase
            .from('profiles')
            .select('id', { count: 'exact', head: true })
            .eq('user_type', 'client'),

          supabase.from('workers').select('id', {
            count: 'exact',
            head: true,
          }),

          supabase.from('companies').select('id', {
            count: 'exact',
            head: true,
          }),
        ]);

      setStats({
        clients: clientsResult.error ? null : clientsResult.count ?? 0,
        workers: workersResult.error ? null : workersResult.count ?? 0,
        companies: companiesResult.error ? null : companiesResult.count ?? 0,
      });
    }

    loadHomeData();
  }, []);

  function handleHomeSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setHomeSearchNotice(null);

    const searchQuery = homeSearch.trim();
    const locationQuery = activeLocationQuery.trim();

    if (!searchQuery && !locationQuery && !activeIntentQuery) {
      setHomeSearchNotice('Please type a service, company, worker, or city.');
      return;
    }

    if (!searchQuery && (locationQuery || activeIntentQuery)) {
      const directoryElement = document.getElementById('public-directory');

      if (directoryElement) {
        directoryElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }

      return;
    }

    const bestCompanyResult = publicCompanies
      .map((company) => {
        const score = getCompanySearchScore(
          company,
          searchQuery,
          locationQuery,
          companySearchTerms[company.id] ?? [],
          activeIntentQuery
        );

        return { company, score };
      })
      .filter((item) => item.score >= 0)
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return a.company.name.localeCompare(b.company.name);
      })[0];

    const bestWorkerResult = publicWorkers
      .map((worker) => {
        const score = getWorkerSearchScore(
          worker,
          searchQuery,
          locationQuery,
          workerSearchTerms[worker.id] ?? [],
          activeIntentQuery
        );

        return { worker, score };
      })
      .filter((item) => {
        if (item.score < 0) return false;
        if (availableOnly && item.worker.status !== 'available') return false;
        return true;
      })
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return a.worker.name.localeCompare(b.worker.name);
      })[0];

    if (!bestCompanyResult && !bestWorkerResult) {
      setHomeSearchNotice('No matching company or worker found.');

      const directoryElement = document.getElementById('public-directory');

      if (directoryElement) {
        directoryElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }

      return;
    }

    if (
      bestCompanyResult &&
      resultTypeFilter !== 'workers' &&
      (!bestWorkerResult ||
        resultTypeFilter === 'companies' ||
        bestCompanyResult.score >= bestWorkerResult.score)
    ) {
      window.location.href = getCompanyProfileHref(bestCompanyResult.company);
      return;
    }

    if (bestWorkerResult && resultTypeFilter !== 'companies') {
      window.location.href = getWorkerProfileHref(bestWorkerResult.worker);
    }
  }

  function runFilterSearch() {
    setFiltersOpen(false);
    setHomeSearchNotice(null);

    const directoryElement = document.getElementById('public-directory');

    if (directoryElement) {
      directoryElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    setProfile(null);
    setUserEmail(null);
    setCompanyUnreadMessages(0);
    window.location.reload();
  }

  const displayName = profile?.full_name || userEmail || '';
  const userInitial = displayName ? displayName.charAt(0).toUpperCase() : 'U';
  const userType = profile?.user_type ?? null;
  const isAdmin =
    profile?.role === 'admin' || profile?.role === 'super_admin';

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');

        :root {
          --sendio-logo-size: 66px;
          --sendio-logo-text-size: 2.35rem;
          --sendio-logo-gap: 12px;
          --sendio-button-bg: #eef6ff;
          --sendio-button-bg-hover: #e3efff;
          --sendio-hero-bg: #e8e1f1;
          --sendio-cream: #ffffff;
          --sendio-page-bg: #ffffff;
          --sendio-card-bg: #ffffff;
          --sendio-soft-border: #dbeafe;
          --sendio-radius: 12px;
          --sendio-text-soft: #1f2937;
          --sendio-blue-dot: #2563eb;
        }

        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          font-family: 'Inter', sans-serif;
          background-color: var(--sendio-page-bg);
          color: #1e2a2f;
          line-height: 1.4;
          scroll-behavior: smooth;
        }

        .container {
          max-width: 1280px;
          margin: 0 auto;
          padding: 0 24px;
        }

        .navbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 0 14px;
          flex-wrap: wrap;
          gap: 16px;
        }

        .logo-area {
          display: flex;
          align-items: center;
          gap: var(--sendio-logo-gap);
        }

        .logo-img {
          width: var(--sendio-logo-size);
          height: var(--sendio-logo-size);
          object-fit: contain;
          display: block;
        }

        .logo-text {
          font-size: var(--sendio-logo-text-size);
          font-weight: 900;
          letter-spacing: -1px;
          line-height: 1;
          color: var(--sendio-text-soft);
        }

        .logo-dot {
          color: var(--sendio-blue-dot);
        }

        .nav-links {
          display: flex;
          gap: 24px;
          list-style: none;
          align-items: center;
          flex-wrap: wrap;
        }

        .nav-links a {
          text-decoration: none;
          font-weight: 500;
          color: #2c3e2f;
          transition: 0.2s;
        }

        .nav-links a:hover {
          color: var(--sendio-button-bg);
        }

        .filter-nav-button {
          border: 1px solid var(--sendio-soft-border);
          background: var(--sendio-button-bg);
          color: #111827;
          border-radius: var(--sendio-radius);
          padding: 8px 15px;
          font-size: 0.86rem;
          font-weight: 900;
          cursor: pointer;
          box-shadow: none;
          transition: 0.2s;
        }

        .filter-nav-button:hover,
        .filter-nav-button-active {
          background: var(--sendio-button-bg-hover);
          color: #111827;
          transform: translateY(-1px);
        }

        .book-btn-nav {
          background: var(--sendio-button-bg);
          color: #111827 !important;
          padding: 8px 20px;
          border-radius: var(--sendio-radius);
          font-weight: 800;
          border: 1px solid var(--sendio-soft-border);
        }

        .book-btn-nav:hover {
          background: var(--sendio-button-bg-hover);
          color: #111827 !important;
        }

        .filter-panel {
          width: min(390px, calc(100% - 48px));
          margin: -6px 0 20px auto;
          background: white;
          border: 1px solid rgba(196, 154, 108, 0.28);
          border-radius: 24px;
          padding: 16px;
          box-shadow: 0 20px 36px -24px rgba(0, 0, 0, 0.28);
        }

        .filter-panel-title {
          color: #0b5b2f;
          font-size: 1rem;
          font-weight: 900;
          margin-bottom: 12px;
        }

        .filter-stack {
          display: flex;
          flex-direction: column;
          gap: 11px;
        }

        .filter-field {
          position: relative;
        }

        .filter-label {
          display: block;
          color: #4f3b25;
          font-size: 0.72rem;
          font-weight: 900;
          margin-bottom: 6px;
        }

        .filter-segment {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 6px;
          background: #fbf8f3;
          border: 1px solid #eadcc9;
          border-radius: 16px;
          padding: 6px;
        }

        .filter-segment button {
          border: 0;
          border-radius: 12px;
          background: transparent;
          color: #4f3b25;
          padding: 9px 6px;
          font-size: 0.72rem;
          font-weight: 900;
          cursor: pointer;
          transition: 0.2s;
        }

        .filter-segment button:hover,
        .filter-segment-active {
          background: var(--sendio-button-bg) !important;
          color: #111827 !important;
        }

        .filter-input,
        .filter-select {
          width: 100%;
          min-height: 46px;
          border: 1px solid var(--sendio-soft-border);
          background: var(--sendio-cream);
          color: #111827;
          border-radius: 8px;
          padding: 11px 13px;
          font-size: 0.86rem;
          font-weight: 800;
          outline: none;
        }

        .filter-input:focus,
        .filter-select:focus {
          border-color: var(--sendio-blue-dot);
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.08);
        }

        .filter-input::placeholder {
          color: #8b7a66;
          font-weight: 700;
        }

        .filter-suggestions {
          margin-top: 7px;
          display: flex;
          flex-direction: column;
          gap: 6px;
          max-height: 150px;
          overflow: auto;
        }

        .filter-suggestion-button {
          width: 100%;
          border: 1px solid var(--sendio-soft-border);
          background: var(--sendio-button-bg);
          color: #111827;
          border-radius: var(--sendio-radius);
          padding: 9px 11px;
          font-size: 0.78rem;
          font-weight: 900;
          text-align: left;
          cursor: pointer;
          transition: 0.2s;
        }

        .filter-suggestion-button:hover {
          background: var(--sendio-button-bg-hover);
          transform: translateY(-1px);
        }

        .filter-check-row {
          min-height: 46px;
          display: flex;
          align-items: center;
          gap: 10px;
          color: #111827;
          font-size: 0.84rem;
          font-weight: 900;
          cursor: pointer;
          background: var(--sendio-cream);
          border: 1px solid var(--sendio-soft-border);
          border-radius: 8px;
          padding: 11px 13px;
        }

        .filter-search-button {
          width: 100%;
          border: 1px solid var(--sendio-soft-border);
          border-radius: var(--sendio-radius);
          padding: 12px 15px;
          font-size: 0.86rem;
          font-weight: 900;
          cursor: pointer;
          background: var(--sendio-button-bg);
          color: #111827;
          box-shadow: none;
          transition: 0.2s;
        }

        .filter-search-button:hover {
          background: var(--sendio-button-bg-hover);
          transform: translateY(-1px);
        }

        .hero {
          background: var(--sendio-hero-bg);
          border-radius: 30px;
          margin: 16px 0 34px 0;
          padding: 28px 34px;
          min-height: 440px;
          display: flex;
          flex-wrap: wrap;
          gap: 24px;
          align-items: center;
          justify-content: space-between;
          overflow: hidden;
        }

        .hero-content {
          flex: 1.2;
          color: #111827;
          min-width: 280px;
        }

        .hero-badge {
          font-size: 0.74rem;
          letter-spacing: 2px;
          color: #374151;
          font-weight: 700;
          margin-bottom: 12px;
        }

        .hero-title {
          font-size: 2.45rem;
          font-weight: 800;
          line-height: 1.1;
          margin-bottom: 14px;
          color: #111827;
        }

        .hero-desc {
          font-size: 0.96rem;
          color: #374151;
          margin-bottom: 16px;
          max-width: 82%;
        }

        .home-search-stack {
          width: 100%;
          max-width: 520px;
          margin-bottom: 16px;
          display: flex;
          flex-direction: column;
          gap: 9px;
        }

        .home-search {
          width: 100%;
          height: 58px;
          background: var(--sendio-cream);
          border: 1px solid var(--sendio-soft-border);
          border-radius: 8px;
          padding: 7px;
          display: flex;
          align-items: center;
          box-shadow: 0 10px 20px rgba(37, 99, 235, 0.06);
        }

        .home-search-icon {
          width: 34px;
          height: 34px;
          min-width: 34px;
          border-radius: 8px;
          background: var(--sendio-button-bg);
          color: #111827;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.92rem;
          font-weight: 900;
          border: 1px solid var(--sendio-soft-border);
          box-shadow: none;
        }

        .home-search input {
          width: 100%;
          border: none;
          outline: none;
          background: transparent;
          color: #111827;
          padding: 10px 14px;
          font-size: 0.9rem;
          font-weight: 700;
        }

        .home-search input::placeholder {
          color: #7a6a58;
        }

        .search-suggestions-wrap {
          width: 100%;
          max-width: 520px;
          margin: -6px 0 20px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .search-suggestions {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .search-suggestions button {
          border: 1px solid var(--sendio-soft-border);
          background: var(--sendio-button-bg);
          color: #111827;
          border-radius: var(--sendio-radius);
          padding: 7px 11px;
          font-size: 0.72rem;
          font-weight: 900;
          cursor: pointer;
          box-shadow: none;
          transition: 0.2s;
        }

        .search-suggestions button:hover {
          background: var(--sendio-button-bg-hover);
          transform: translateY(-1px);
        }

        .search-intent-hint {
          color: #111827;
          background: rgba(254, 252, 245, 0.76);
          border: 1px solid rgba(37, 99, 235, 0.12);
          border-radius: 8px;
          padding: 9px 12px;
          font-size: 0.76rem;
          font-weight: 800;
          max-width: 520px;
          margin: -7px 0 16px;
          line-height: 1.55;
        }

        .btn-primary {
          background: var(--sendio-button-bg);
          border: 1px solid var(--sendio-soft-border);
          padding: 12px 28px;
          font-size: 0.95rem;
          font-weight: 800;
          border-radius: 8px;
          color: #111827;
          cursor: pointer;
          transition: 0.2s;
          display: inline-block;
          text-decoration: none;
          box-shadow: 0 10px 20px rgba(37, 99, 235, 0.08);
        }

        .btn-primary:hover {
          background: var(--sendio-button-bg-hover);
          color: #111827;
          transform: scale(1.02);
        }

        .home-search-notice {
          color: #111827;
          background: rgba(254, 252, 245, 0.82);
          border: 1px solid var(--sendio-soft-border);
          border-radius: 8px;
          padding: 9px 13px;
          font-size: 0.82rem;
          font-weight: 800;
          max-width: 520px;
          margin: -8px 0 16px;
        }

        .hero-stats {
          flex: 0.72;
          min-width: 260px;
          min-height: 85px;
          background: var(--sendio-cream);
          backdrop-filter: blur(4px);
          border-radius: var(--sendio-radius);
          padding: 14px 18px;
          box-shadow: 0 12px 22px -16px rgba(0, 0, 0, 0.18);
          border: 1px solid rgba(37, 99, 235, 0.1);
        }

        .stat-item {
          margin-bottom: 10px;
          border-bottom: 1px solid rgba(37, 99, 235, 0.12);
          padding-bottom: 8px;
          color: #111827;
          font-size: 0.84rem;
        }

        .stat-item:last-child {
          margin-bottom: 0;
          border-bottom: none;
          padding-bottom: 0;
        }

        .stat-number {
          font-size: 1.35rem;
          font-weight: 900;
          color: #111827;
        }

        .new-section-wrapper {
          width: 100%;
          margin: 26px auto 24px;
          overflow: hidden;
        }

        .ads-section {
          width: 100%;
          max-width: 980px;
          overflow: hidden;
          margin: 0 auto 32px;
          padding: 4px 0;
        }

        .companies-marquee {
          width: 100%;
          overflow: hidden;
          white-space: nowrap;
          background: transparent;
          padding: 8px 0;
        }

        .marquee-track {
          display: flex;
          width: max-content;
          animation: scrollAds 28s linear infinite;
        }

        .marquee-track:hover {
          animation-play-state: paused;
        }

        @keyframes scrollAds {
          0% {
            transform: translateX(0);
          }

          100% {
            transform: translateX(-50%);
          }
        }

        .company-card,
        .ad-empty-card {
          flex: 0 0 220px;
          width: 220px;
          max-width: 220px;
          height: 162px;
          margin: 0 10px;
          background: white;
          border: 2px solid #0b5b2f;
          border-radius: 22px;
          text-align: center;
          transition: 0.3s;
          text-decoration: none;
          color: inherit;
          box-shadow: 0 4px 10px rgba(0,0,0,0.05);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-end;
          white-space: normal;
          position: relative;
          overflow: hidden;
          padding: 12px;
        }

        .company-card {
          cursor: pointer;
        }

        .company-card:hover {
          transform: translateY(-4px);
        }

        .company-card::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(
            to top,
            rgba(0, 0, 0, 0.78),
            rgba(0, 0, 0, 0.26),
            rgba(0, 0, 0, 0.05)
          );
          z-index: 1;
          pointer-events: none;
        }

        .ad-empty-card {
          border-style: dashed;
          opacity: 0.55;
        }

        .ad-media {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          border-radius: var(--sendio-radius);
          overflow: hidden;
          background: linear-gradient(135deg, #0b5b2f, #c49a6c);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 900;
          font-size: 24px;
          margin-bottom: 0;
          z-index: 0;
        }

        .ad-media img,
        .ad-media video {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .ad-media span {
          position: relative;
          z-index: 2;
        }

        .ad-title,
        .ad-description,
        .company-meta,
        .ad-cta {
          position: relative;
          z-index: 2;
          max-width: 100%;
          text-shadow: 0 2px 8px rgba(0, 0, 0, 0.45);
        }

        .ad-title {
          font-size: 0.9rem;
          font-weight: 900;
          color: white;
          line-height: 1.2;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .ad-description {
          font-size: 0.68rem;
          color: rgba(255, 255, 255, 0.9);
          margin-top: 4px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .company-meta {
          font-size: 0.7rem;
          color: rgba(255, 255, 255, 0.86);
          margin-top: 4px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .ad-cta {
          font-size: 0.68rem;
          color: #111827;
          font-weight: 900;
          margin-top: 7px;
          background: var(--sendio-button-bg);
          border-radius: var(--sendio-radius);
          padding: 4px 10px;
          text-shadow: none;
        }

        .services-row {
          display: flex;
          gap: 18px;
          justify-content: center;
          margin-bottom: 22px;
          flex-wrap: wrap;
        }

        .service-card-new {
          flex: 1;
          min-width: 165px;
          max-width: 205px;
          min-height: 118px;
          background: white;
          border: 2px solid #0b5b2f;
          border-radius: 18px;
          padding: 13px;
          text-align: left;
          cursor: pointer;
          transition: 0.3s;
          text-decoration: none;
          color: inherit;
          display: block;
          position: relative;
          overflow: hidden;
        }

        .service-card-new:hover {
          transform: translateY(-4px);
        }

        .service-card-with-ad {
          color: white;
          border-color: #c49a6c;
          background: #0b5b2f;
          min-height: 132px;
        }

        .service-card-with-ad:hover {
          box-shadow: 0 14px 24px rgba(0, 0, 0, 0.14);
        }

        .service-ad-media {
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, #0b5b2f, #c49a6c);
        }

        .service-ad-media img,
        .service-ad-media video {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .service-ad-fallback {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 42px;
          font-weight: 900;
          color: white;
          background: linear-gradient(135deg, #0b5b2f, #c49a6c);
        }

        .service-card-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            to top,
            rgba(0, 0, 0, 0.76),
            rgba(0, 0, 0, 0.2),
            rgba(0, 0, 0, 0.05)
          );
        }

        .service-card-content {
          position: relative;
          z-index: 2;
        }

        .service-icon-new {
          width: 30px;
          height: 30px;
          background: #0b5b2f;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 15px;
          color: white;
          margin-bottom: 10px;
        }

        .service-card-with-ad .service-icon-new {
          background: rgba(255, 255, 255, 0.18);
          backdrop-filter: blur(4px);
        }

        .service-title-new {
          font-size: 0.96rem;
          font-weight: 700;
          margin-bottom: 4px;
          color: #1e2a2f;
        }

        .service-card-with-ad .service-title-new {
          color: white;
          text-shadow: 0 2px 6px rgba(0, 0, 0, 0.35);
        }

        .service-ad-label {
          display: inline-flex;
          margin-bottom: 7px;
          border-radius: 999px;
          padding: 4px 8px;
          background: rgba(255, 255, 255, 0.86);
          color: #0b5b2f;
          font-size: 0.56rem;
          font-weight: 900;
          text-transform: uppercase;
        }

        .service-ad-title {
          color: white;
          font-size: 0.93rem;
          font-weight: 900;
          line-height: 1.15;
          text-shadow: 0 2px 8px rgba(0, 0, 0, 0.45);
          overflow: hidden;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
        }

        .service-ad-meta {
          margin-top: 5px;
          color: rgba(255, 255, 255, 0.9);
          font-size: 0.62rem;
          font-weight: 800;
          text-shadow: 0 2px 8px rgba(0, 0, 0, 0.45);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .service-ad-count {
          margin-top: 6px;
          color: rgba(255, 255, 255, 0.92);
          font-size: 0.56rem;
          font-weight: 900;
          text-transform: uppercase;
        }

        .buttons-block {
          display: flex;
          flex-direction: column;
          gap: 15px;
          align-items: center;
          margin-bottom: 14px;
        }

        .buttons-row-main {
          display: flex;
          gap: 15px;
          justify-content: center;
          flex-wrap: wrap;
        }

        .btn-custom {
          border: 1px solid var(--sendio-soft-border);
          cursor: pointer;
          padding: 10px 24px;
          border-radius: var(--sendio-radius);
          font-size: 0.85rem;
          font-weight: 800;
          transition: 0.2s;
          text-decoration: none;
          display: inline-block;
          background: var(--sendio-button-bg);
          color: #111827;
        }

        .btn-main-blue {
          background-color: var(--sendio-button-bg);
          color: #111827;
        }

        .btn-custom:hover {
          transform: translateY(-1px);
          background: var(--sendio-button-bg-hover);
          opacity: 1;
        }

        .user-view {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 15px;
          background: transparent;
          padding: 0;
          border-radius: var(--sendio-radius);
          border: 0;
          box-shadow: none;
          flex-wrap: wrap;
        }

        .user-dashboard-link {
          display: flex;
          align-items: center;
          gap: 15px;
          text-decoration: none;
        }

        .user-avatar-circle {
          width: 43px;
          height: 43px;
          border-radius: 50%;
          background: transparent;
          color: #111827;
          border: 1px solid rgba(37, 99, 235, 0.16);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 19px;
          position: relative;
          flex-shrink: 0;
        }

        .online-dot {
          width: 12px;
          height: 12px;
          background: #27ae60;
          border: 2px solid white;
          border-radius: 50%;
          position: absolute;
          bottom: 2px;
          right: 2px;
        }

        .user-info-text {
          text-align: left;
          display: flex;
          flex-direction: column;
        }

        .user-name-label {
          display: block;
          font-weight: 800;
          color: #111827;
          font-size: 14px;
        }

        .user-type-badge {
          font-size: 10px;
          color: #27ae60;
          font-weight: 700;
          text-transform: uppercase;
        }

        .admin-dashboard-button {
          text-decoration: none;
          color: #111827;
          background: transparent;
          border-radius: var(--sendio-radius);
          padding: 8px 4px;
          font-size: 12px;
          font-weight: 900;
          box-shadow: none;
        }

        .admin-dashboard-button:hover {
          background: transparent;
          color: var(--sendio-button-bg);
        }

        .company-message-alert {
          width: 42px;
          height: 42px;
          border-radius: 50%;
          background: transparent;
          color: #111827;
          border: 1px solid rgba(37, 99, 235, 0.16);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          text-decoration: none;
          position: relative;
          font-size: 18px;
          font-weight: 900;
          box-shadow: none;
          transition: 0.2s;
        }

        .company-message-alert:hover {
          transform: translateY(-1px);
          background: transparent;
          color: var(--sendio-button-bg);
        }

        .company-message-alert-dot {
          position: absolute;
          top: 2px;
          right: 2px;
          width: 11px;
          height: 11px;
          border-radius: 50%;
          background: #22c55e;
          border: 2px solid white;
        }

        .company-message-alert-count {
          position: absolute;
          right: -7px;
          bottom: -5px;
          min-width: 18px;
          height: 18px;
          padding: 0 5px;
          border-radius: 999px;
          background: var(--sendio-button-bg);
          color: #111827;
          font-size: 10px;
          line-height: 18px;
          text-align: center;
          font-weight: 900;
        }

        .logout-button {
          border: none;
          background: transparent;
          color: #ff4757;
          margin-left: 4px;
          font-size: 12px;
          cursor: pointer;
          font-weight: 800;
          padding: 8px 4px;
          border-radius: var(--sendio-radius);
        }

        .logout-button:hover {
          color: var(--sendio-button-bg);
        }

        .role-showcase {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          align-items: center;
          gap: 12px;
          margin: 12px 0 28px;
        }

        .role-card {
          flex: 0 0 177px;
          width: 177px;
          max-width: 177px;
          height: 38px;
          min-height: 38px;
          background: var(--sendio-button-bg);
          border-radius: var(--sendio-radius);
          padding: 0 12px;
          border: 1px solid var(--sendio-soft-border);
          transition: 0.2s;
          text-decoration: none;
          color: #111827;
          display: grid;
          grid-template-columns: 26px 1fr;
          column-gap: 8px;
          align-items: center;
          text-align: left;
        }

        .role-icon {
          grid-row: 1 / 3;
          width: 26px;
          height: 26px;
          min-width: 26px;
          min-height: 26px;
          border-radius: var(--sendio-radius);
          background: transparent;
          color: #111827;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 13px;
          font-weight: 900;
          margin: 0;
        }

        .role-card h3 {
          margin: 0;
          color: #111827;
          font-size: 0.82rem;
          font-weight: 900;
          line-height: 1.05;
        }

        .role-badge {
          display: none;
        }

        .role-card-active {
          background-color: var(--sendio-button-bg-hover) !important;
          border-color: rgba(37, 99, 235, 0.2) !important;
          transform: none;
          cursor: pointer;
        }

        .role-card-active h3 {
          color: #111827 !important;
        }

        .role-card-active .role-icon {
          background: transparent;
          color: #111827 !important;
        }

        .role-card-active .role-badge {
          color: #111827 !important;
        }

        .role-card-clickable {
          cursor: pointer;
        }

        .role-card-clickable:hover {
          transform: translateY(-1px);
          background: var(--sendio-button-bg-hover);
          box-shadow: none;
        }

        .role-card-active:hover {
          transform: translateY(-1px);
        }

        .public-directory {
          margin: 10px 0 46px;
          background: white;
          border: 1px solid rgba(196, 154, 108, 0.28);
          border-radius: 30px;
          padding: 24px;
          box-shadow: 0 16px 30px -20px rgba(0, 0, 0, 0.2);
        }

        .public-directory-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          gap: 18px;
          margin-bottom: 22px;
        }

        .directory-kicker {
          color: #8b5a2b;
          font-size: 0.76rem;
          font-weight: 900;
          letter-spacing: 1.5px;
          text-transform: uppercase;
        }

        .directory-title {
          margin-top: 6px;
          font-size: 1.65rem;
          color: #0b5b2f;
          font-weight: 900;
        }

        .directory-text {
          margin-top: 7px;
          color: #6e5e4a;
          font-size: 0.9rem;
        }

        .directory-intent-note {
          margin-top: 8px;
          color: #8b5a2b;
          background: #fbf8f3;
          border: 1px solid #eadcc9;
          border-radius: 14px;
          padding: 8px 10px;
          font-size: 0.76rem;
          font-weight: 800;
          display: inline-block;
        }

        .directory-count-badge {
          color: #0b5b2f;
          background: #f1e6d8;
          border-radius: 999px;
          padding: 9px 13px;
          font-size: 0.78rem;
          font-weight: 900;
          white-space: nowrap;
        }

        .directory-split {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 1px minmax(0, 1fr);
          gap: 22px;
          align-items: start;
        }

        .directory-divider {
          width: 1px;
          min-height: 100%;
          background: linear-gradient(
            to bottom,
            transparent,
            rgba(11, 91, 47, 0.35),
            transparent
          );
        }

        .directory-side-title {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          margin-bottom: 9px;
        }

        .directory-side-title h3 {
          color: #1e2a2f;
          font-size: 1rem;
          font-weight: 900;
        }

        .directory-side-title span {
          color: #8b5a2b;
          background: #fbf8f3;
          border: 1px solid #eadcc9;
          padding: 5px 9px;
          border-radius: 999px;
          font-size: 0.68rem;
          font-weight: 900;
        }

        .directory-dashboard-action {
          margin: 0 0 13px;
          display: flex;
          justify-content: flex-start;
        }

        .directory-dashboard-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          text-decoration: none;
          color: white;
          background: #0b5b2f;
          border-radius: 999px;
          padding: 8px 13px;
          font-size: 0.72rem;
          font-weight: 900;
          box-shadow: 0 8px 16px rgba(11, 91, 47, 0.16);
          transition: 0.2s;
        }

        .directory-dashboard-button:hover {
          background: #084625;
          transform: translateY(-2px);
        }

        .side-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
        }

        .directory-card,
        .directory-empty {
          min-height: 112px;
          border-radius: 18px;
          background: #fbf8f3;
          border: 1px solid #eadcc9;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-decoration: none;
          color: inherit;
          transition: 0.25s;
          padding: 9px 6px;
          position: relative;
        }

        .directory-card:hover {
          transform: translateY(-4px);
          border-color: #0b5b2f;
          box-shadow: 0 10px 18px rgba(0, 0, 0, 0.07);
        }

        .directory-empty {
          opacity: 0.38;
          border-style: dashed;
        }

        .directory-avatar {
          width: 46px;
          height: 46px;
          border-radius: 50%;
          overflow: hidden;
          background: linear-gradient(135deg, #c49a6c, #8b5a2b);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          font-weight: 900;
          margin-bottom: 6px;
        }

        .worker-directory-avatar {
          background: linear-gradient(135deg, #0b5b2f, #c49a6c);
        }

        .directory-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .worker-availability-button {
          margin: 0 0 6px;
          border-radius: 999px;
          padding: 4px 10px;
          font-size: 0.55rem;
          font-weight: 900;
          line-height: 1;
          text-transform: uppercase;
          border: 1px solid transparent;
          max-width: 92%;
          text-align: center;
        }

        .worker-status-available {
          background: #e8f8ef;
          color: #0b7f3a;
          border-color: rgba(11, 127, 58, 0.22);
        }

        .worker-status-unavailable {
          background: #fff0f1;
          color: #c62828;
          border-color: rgba(198, 40, 40, 0.2);
        }

        .directory-name {
          color: #1e2a2f;
          font-size: 0.76rem;
          font-weight: 900;
          max-width: 100%;
          text-align: center;
          overflow: hidden;
          white-space: nowrap;
          text-overflow: ellipsis;
        }

        .directory-rating {
          margin-top: 3px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
          max-width: 100%;
          line-height: 1;
          white-space: nowrap;
        }

        .directory-rating-stars {
          color: #c49a6c;
          font-size: 0.58rem;
          font-weight: 900;
          letter-spacing: -1px;
        }

        .directory-rating-score {
          color: #8b5a2b;
          font-size: 0.55rem;
          font-weight: 900;
        }

        .directory-meta {
          color: #8b5a2b;
          font-size: 0.62rem;
          font-weight: 700;
          margin-top: 3px;
          max-width: 100%;
          overflow: hidden;
          white-space: nowrap;
          text-overflow: ellipsis;
        }


        /* Sendio visual unity phase 3: lower homepage cards and buttons */
        .public-directory,
        .service-card-new,
        .directory-card,
        .directory-empty,
        .role-card,
        .filter-panel,
        .filter-input,
        .filter-select,
        .filter-check-row,
        .home-search,
        .home-search-notice,
        .search-intent-hint,
        .directory-intent-note {
          border-radius: var(--sendio-radius);
        }

        .public-directory {
          background: #ffffff;
          border: 1px solid var(--sendio-soft-border);
          box-shadow: 0 12px 28px rgba(37, 99, 235, 0.04);
        }

        .directory-title,
        .directory-side-title h3,
        .service-title-new {
          color: #111827;
        }

        .directory-kicker,
        .directory-text,
        .directory-meta,
        .directory-rating-score {
          color: #374151;
        }

        .directory-count-badge,
        .directory-side-title span,
        .directory-intent-note,
        .service-ad-label,
        .worker-availability-button {
          background: var(--sendio-button-bg);
          color: #111827;
          border: 1px solid var(--sendio-soft-border);
          border-radius: var(--sendio-radius);
          box-shadow: none;
        }

        .directory-dashboard-button {
          color: #111827;
          background: var(--sendio-button-bg);
          border: 1px solid var(--sendio-soft-border);
          border-radius: var(--sendio-radius);
          box-shadow: none;
        }

        .directory-dashboard-button:hover {
          color: #111827;
          background: var(--sendio-button-bg-hover);
          transform: translateY(-1px);
        }

        .directory-card,
        .directory-empty {
          background: #ffffff;
          border: 1px solid var(--sendio-soft-border);
          border-radius: var(--sendio-radius);
          box-shadow: none;
        }

        .directory-card:hover {
          border-color: rgba(37, 99, 235, 0.32);
          box-shadow: 0 10px 20px rgba(37, 99, 235, 0.08);
          transform: translateY(-2px);
        }

        .directory-avatar {
          border-radius: var(--sendio-radius);
          background: var(--sendio-button-bg);
          color: #111827;
          border: 1px solid var(--sendio-soft-border);
        }

        .worker-directory-avatar {
          background: #f3f4f6;
          color: #374151;
          border: 1px solid rgba(107, 114, 128, 0.18);
        }

        .worker-status-available,
        .worker-status-unavailable {
          background: var(--sendio-button-bg);
          color: #111827;
          border-color: var(--sendio-soft-border);
        }

        .directory-rating-stars {
          color: #2563eb;
        }

        .directory-divider {
          background: linear-gradient(
            to bottom,
            transparent,
            rgba(37, 99, 235, 0.24),
            transparent
          );
        }

        .service-card-new {
          background: #ffffff;
          border: 1px solid var(--sendio-soft-border);
          color: #111827;
          box-shadow: none;
        }

        .service-card-new:hover {
          border-color: rgba(37, 99, 235, 0.32);
          box-shadow: 0 10px 20px rgba(37, 99, 235, 0.08);
          transform: translateY(-2px);
        }

        .service-card-with-ad {
          background: #ffffff;
          border-color: var(--sendio-soft-border);
          color: #111827;
        }

        .service-card-with-ad .service-title-new,
        .service-ad-title,
        .service-ad-meta,
        .service-ad-count {
          color: #111827;
          text-shadow: none;
        }

        .service-card-with-ad .service-icon-new,
        .service-icon-new {
          background: var(--sendio-button-bg);
          color: #111827;
          border-radius: var(--sendio-radius);
          border: 1px solid var(--sendio-soft-border);
        }

        .service-ad-media {
          background: #ffffff;
        }

        .service-card-overlay {
          background: linear-gradient(
            to top,
            rgba(255, 255, 255, 0.9),
            rgba(255, 255, 255, 0.55),
            rgba(255, 255, 255, 0.16)
          );
        }

        .ad-cta,
        .btn-primary,
        .book-btn-nav,
        .filter-nav-button,
        .filter-search-button,
        .filter-suggestion-button,
        .search-suggestions button,
        .role-card {
          background: var(--sendio-button-bg);
          color: #111827;
          border: 1px solid var(--sendio-soft-border);
          border-radius: var(--sendio-radius);
          box-shadow: none;
        }

        .ad-cta:hover,
        .btn-primary:hover,
        .book-btn-nav:hover,
        .filter-nav-button:hover,
        .filter-search-button:hover,
        .filter-suggestion-button:hover,
        .search-suggestions button:hover,
        .role-card:hover {
          background: var(--sendio-button-bg-hover);
          color: #111827;
        }


        .footer-clean {
          border-top: 1px solid #e1d5c6;
          padding: 32px 0 18px;
          margin-top: 24px;
        }

        .footer-links {
          display: flex;
          justify-content: center;
          gap: 28px;
          flex-wrap: wrap;
          margin: 18px 0;
        }

        .footer-links a {
          color: #7a6a58;
          text-decoration: none;
          font-size: 0.85rem;
        }

        .copyright {
          text-align: center;
          padding: 18px 0 36px;
          color: #7a6a58;
          font-size: 0.8rem;
        }



        /* Sendio visual unity phase 4: final lower footer and remaining bottom elements */
        .footer-clean {
          border-top: 1px solid var(--sendio-soft-border);
          background: #ffffff;
          padding: 28px 0 18px;
          margin-top: 24px;
        }

        .footer-links {
          display: flex;
          justify-content: center;
          gap: 10px;
          flex-wrap: wrap;
          margin: 18px 0;
        }

        .footer-links a {
          min-width: 92px;
          height: 38px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: #111827;
          background: var(--sendio-button-bg);
          border: 1px solid var(--sendio-soft-border);
          border-radius: var(--sendio-radius);
          text-decoration: none;
          font-size: 0.82rem;
          font-weight: 900;
          transition: 0.2s;
        }

        .footer-links a:hover {
          background: var(--sendio-button-bg-hover);
          color: #111827;
          transform: translateY(-1px);
        }

        .copyright {
          text-align: center;
          padding: 16px 0 34px;
          color: #374151;
          font-size: 0.8rem;
          font-weight: 700;
        }

        .public-directory .directory-empty {
          background: #ffffff;
          border: 1px dashed rgba(37, 99, 235, 0.16);
          opacity: 0.5;
        }

        .public-directory,
        .directory-card,
        .directory-empty,
        .footer-clean {
          border-color: var(--sendio-soft-border);
        }

        .directory-card,
        .directory-empty {
          min-height: 112px;
        }

        .directory-name,
        .directory-side-title h3,
        .directory-title,
        .footer-links a,
        .copyright {
          color: #111827;
        }

        @media (max-width: 1100px) {
          :root {
            --sendio-logo-size: 60px;
            --sendio-logo-text-size: 2.15rem;
          }

          .company-card,
          .ad-empty-card {
            flex-basis: 210px;
            max-width: 210px;
          }

          .directory-split {
            gap: 16px;
          }

          .side-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 780px) {
          :root {
            --sendio-logo-size: 54px;
            --sendio-logo-text-size: 1.95rem;
            --sendio-logo-gap: 10px;
          }

          .hero {
            padding: 24px 20px;
            min-height: auto;
          }

          .hero-title {
            font-size: 2.25rem;
          }

          .hero-desc {
            max-width: 100%;
          }

          .navbar {
            flex-direction: column;
          }

          .nav-links {
            flex-wrap: wrap;
            justify-content: center;
            gap: 14px;
          }

          .filter-panel {
            width: 100%;
            margin-right: 0;
          }

          .company-card,
          .ad-empty-card {
            flex-basis: 200px;
            max-width: 200px;
          }

          .home-search-stack,
          .search-suggestions-wrap {
            max-width: 100%;
          }

          .role-showcase {
            gap: 10px;
            margin: 10px 0 26px;
          }

          .role-card {
            flex: 0 0 177px;
            width: 177px;
            max-width: 177px;
          }

          .public-directory-header {
            align-items: flex-start;
            flex-direction: column;
          }

          .directory-split {
            grid-template-columns: 1fr;
          }

          .directory-divider {
            width: 100%;
            height: 1px;
            min-height: 1px;
            background: linear-gradient(
              to right,
              transparent,
              rgba(11, 91, 47, 0.35),
              transparent
            );
          }

          .side-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }
      `}</style>

      <div className="container">
        <div className="navbar">
          <div className="logo-area">
            <Image
  src="/logo.png"
  alt="Sendio logo"
  width={74}
  height={74}
  className="logo-img"
  priority
/>
            <span className="logo-text">Send<span className="logo-dot">i</span>o</span>
          </div>

          <ul className="nav-links">
            <li>
              <Link href="/">Home</Link>
            </li>
            <li>
              <a href="#companies-panel">Companies</a>
            </li>
            <li>
              <Link href="/services">Services</Link>
            </li>
            <li>
              <button
                type="button"
                onClick={() => setFiltersOpen((current) => !current)}
                className={`filter-nav-button ${
                  filtersOpen ? 'filter-nav-button-active' : ''
                }`}
              >
                Filter{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
              </button>
            </li>
            <li>
              <a href="#workers-panel">Workers</a>
            </li>
            <li>
              <Link href="/clients">Clients</Link>
            </li>
            <li>
              <Link href="/get-quote" className="book-btn-nav">
                Get Quote
              </Link>
            </li>
          </ul>
        </div>

        {filtersOpen ? (
          <section className="filter-panel">
            <div className="filter-panel-title">Filter</div>

            <div className="filter-stack">
              <div className="filter-field">
                <span className="filter-label">Show</span>
                <div className="filter-segment">
                  {[
                    { value: 'all', label: 'All' },
                    { value: 'workers', label: 'Workers' },
                    { value: 'companies', label: 'Companies' },
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() =>
                        setResultTypeFilter(option.value as ResultTypeFilter)
                      }
                      className={
                        resultTypeFilter === option.value
                          ? 'filter-segment-active'
                          : ''
                      }
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="filter-field">
                <label className="filter-label" htmlFor="filter-city-search">
                  City or location
                </label>
                <input
                  id="filter-city-search"
                  className="filter-input"
                  type="search"
                  value={filterCitySearch}
                  onChange={(event) => setFilterCitySearch(event.target.value)}
                  placeholder="Type city name"
                />

                {filterCitySuggestions.length > 0 ? (
                  <div className="filter-suggestions">
                    {filterCitySuggestions.map((suggestion) => (
                      <button
                        key={`filter-city-${suggestion}`}
                        type="button"
                        className="filter-suggestion-button"
                        onClick={() => setFilterCitySearch(suggestion)}
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="filter-field">
                <label className="filter-label" htmlFor="filter-service-search">
                  Service, skill, or meaning
                </label>
                <input
                  id="filter-service-search"
                  className="filter-input"
                  type="search"
                  value={filterServiceSearch}
                  onChange={(event) =>
                    setFilterServiceSearch(event.target.value)
                  }
                  placeholder="Type service or skill"
                />

                {filterServiceSuggestions.length > 0 ? (
                  <div className="filter-suggestions">
                    {filterServiceSuggestions.map((suggestion) => (
                      <button
                        key={`filter-service-${suggestion}`}
                        type="button"
                        className="filter-suggestion-button"
                        onClick={() => setFilterServiceSearch(suggestion)}
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>

              <label className="filter-check-row">
                <input
                  type="checkbox"
                  checked={availableOnly}
                  onChange={(event) => setAvailableOnly(event.target.checked)}
                />
                Available workers only
              </label>

              <div className="filter-field">
                <label className="filter-label" htmlFor="filter-sort">
                  Sort by
                </label>
                <select
                  id="filter-sort"
                  className="filter-select"
                  value={sortFilter}
                  onChange={(event) =>
                    setSortFilter(event.target.value as SortFilter)
                  }
                >
                  <option value="best_match">Best match</option>
                  <option value="highest_rated">Highest rated</option>
                  <option value="most_reviewed">Most reviewed</option>
                  <option value="newest">Newest</option>
                </select>
              </div>

              <button
                type="button"
                className="filter-search-button"
                onClick={runFilterSearch}
              >
                Search
              </button>
            </div>
          </section>
        ) : null}

        <div className="hero">
          <div className="hero-content">
            <div className="hero-badge">✦ SENDIO PREMIUM ✦</div>

            <h1 className="hero-title">
              Welcome to <br />
              Elite Service Suite
            </h1>

            <p className="hero-desc">
              Sophisticated features, sleek design, and elegant comfort. Connect
              with trusted clients, expert workers, and top-tier companies. Book
              now and elevate your experience.
            </p>

            <form
              id="home-search-form"
              className="home-search-stack"
              onSubmit={handleHomeSearchSubmit}
            >
              <div className="home-search">
                <span className="home-search-icon" aria-hidden="true">
                  🔍
                </span>

                <input
                  type="search"
                  value={homeSearch}
                  onChange={(event) => setHomeSearch(event.target.value)}
                  placeholder="Search service, worker, company, profession, skill, or meaning"
                />
              </div>

              <div className="home-search">
                <span className="home-search-icon" aria-hidden="true">
                  📍
                </span>

                <input
                  type="search"
                  value={homeLocation}
                  onChange={(event) => setHomeLocation(event.target.value)}
                  placeholder="City or registered location"
                />
              </div>
            </form>

            {searchSuggestions.length > 0 || locationSuggestions.length > 0 ? (
              <div className="search-suggestions-wrap">
                {searchSuggestions.length > 0 ? (
                  <div className="search-suggestions">
                    {searchSuggestions.map((suggestion) => (
                      <button
                        type="button"
                        key={`search-${suggestion}`}
                        onClick={() => setHomeSearch(suggestion)}
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                ) : null}

                {locationSuggestions.length > 0 ? (
                  <div className="search-suggestions">
                    {locationSuggestions.map((suggestion) => (
                      <button
                        type="button"
                        key={`location-${suggestion}`}
                        onClick={() => setHomeLocation(suggestion)}
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}

            {matchedSearchIntentLabels.length > 0 ? (
              <p className="search-intent-hint">
                Related meaning detected:{' '}
                {matchedSearchIntentLabels.join(' / ')}. Exact matches appear
                first, then related results.
              </p>
            ) : null}

            {homeSearchNotice ? (
              <p className="home-search-notice">{homeSearchNotice}</p>
            ) : null}

            <button type="submit" form="home-search-form" className="btn-primary">
              Search →
            </button>
          </div>

          <div className="hero-stats">
            <div className="stat-item">
              <span className="stat-number">{formatCount(stats.clients)}</span>
              <br />
              Active Clients
            </div>

            <div className="stat-item">
              <span className="stat-number">{formatCount(stats.workers)}</span>
              <br />
              Verified Workers
            </div>

            <div className="stat-item">
              <span className="stat-number">
                {formatCount(stats.companies)}
              </span>
              <br />
              Partner Companies
            </div>
          </div>
        </div>

        <div className="new-section-wrapper">
          <div className="ads-section" id="ads">
            <div className="companies-marquee">
              {marqueeAds.length > 0 ? (
                <div className="marquee-track">
                  {marqueeAds.map((ad, index) => {
                    const name = ad.title || ad.company?.name || 'Ad';
                    const firstLetter = name.charAt(0).toUpperCase();
                    const media = getAdMedia(ad);
                    const videoAd = isVideoAd(ad);
                    const description = ad.description?.trim();
                    const ctaText = ad.cta_text || 'View Company';

                    return (
                      <Link
                        href={getAdHref(ad)}
                        className="company-card"
                        key={`${ad.id}-${index}`}
                      >
                        <div className="ad-media">
                          {media && videoAd ? (
                            <video
                              src={media}
                              muted
                              playsInline
                              preload="metadata"
                              autoPlay
                              loop
                            />
                          ) : null}

                          {media && !videoAd ? (
                            <Image
                              src={media}
                              alt={`${name} advertisement`}
                              width={320}
                              height={180}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              sizes="(max-width: 768px) 100vw, 320px"
                            />
                          ) : null}

                          {!media ? <span>{firstLetter}</span> : null}
                        </div>

                        <div className="ad-title">{name}</div>

                        {description ? (
                          <div className="ad-description">{description}</div>
                        ) : null}

                        {(ad.company?.category || ad.company?.city) && (
                          <div className="company-meta">
                            {ad.company?.category}
                            {ad.company?.category && ad.company?.city
                              ? ' • '
                              : ''}
                            {ad.company?.city}
                          </div>
                        )}

                        <div className="ad-cta">{ctaText}</div>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <div className="marquee-track" aria-label="Empty ads slider">
                  <div className="ad-empty-card" aria-hidden="true" />
                  <div className="ad-empty-card" aria-hidden="true" />
                  <div className="ad-empty-card" aria-hidden="true" />
                  <div className="ad-empty-card" aria-hidden="true" />

                  <div className="ad-empty-card" aria-hidden="true" />
                  <div className="ad-empty-card" aria-hidden="true" />
                  <div className="ad-empty-card" aria-hidden="true" />
                  <div className="ad-empty-card" aria-hidden="true" />
                </div>
              )}
            </div>
          </div>

          <div className="services-row" id="services">
            {categoryAdSlots.map((slot) => {
              const slotAds = categoryAdsBySlot[slot.id];
              const activeAd =
                slotAds.length > 0
                  ? slotAds[categoryAdIndexes[slot.id] % slotAds.length]
                  : null;

              const media = activeAd ? getAdMedia(activeAd) : null;
              const videoAd = activeAd ? isVideoAd(activeAd) : false;
              const href = activeAd ? getAdHref(activeAd) : '/services';
              const adTitle =
                activeAd?.title || activeAd?.company?.name || slot.title;

              return (
                <Link
                  key={slot.id}
                  href={href}
                  className={`service-card-new ${
                    activeAd ? 'service-card-with-ad' : ''
                  }`}
                >
                  {activeAd ? (
                    <>
                      <div className="service-ad-media">
                        {media && videoAd ? (
                          <video
                            src={media}
                            muted
                            playsInline
                            autoPlay
                            loop
                            preload="metadata"
                            onTimeUpdate={(event) => {
                              if (event.currentTarget.currentTime >= 5) {
                                event.currentTarget.currentTime = 0;
                              }
                            }}
                          />
                        ) : null}

                        {media && !videoAd ? (
                          <Image
                            src={media}
                            alt={`${adTitle} advertisement`}
                            width={320}
                            height={180}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            sizes="(max-width: 768px) 100vw, 320px"
                          />
                        ) : null}

                        {!media ? (
                          <div className="service-ad-fallback">
                            {adTitle.charAt(0).toUpperCase()}
                          </div>
                        ) : null}
                      </div>

                      <div className="service-card-overlay" />

                      <div className="service-card-content">
                        <div className="service-ad-label">{slot.label} Ad</div>
                        <div className="service-ad-title">{adTitle}</div>

                        {(activeAd.company?.category ||
                          activeAd.company?.city) && (
                          <div className="service-ad-meta">
                            {activeAd.company?.category}
                            {activeAd.company?.category &&
                            activeAd.company?.city
                              ? ' • '
                              : ''}
                            {activeAd.company?.city}
                          </div>
                        )}

                        {slotAds.length > 1 ? (
                          <div className="service-ad-count">
                            {slotAds.length} sponsored ads
                          </div>
                        ) : null}
                      </div>
                    </>
                  ) : (
                    <div className="service-card-content">
                      <div className="service-icon-new">{slot.icon}</div>
                      <div className="service-title-new">{slot.title}</div>
                    </div>
                  )}
                </Link>
              );
            })}
          </div>

          <div className="buttons-block">
            {!isLoggedIn && (
              <div className="buttons-row-main">
                <Link href="/login" className="btn-custom btn-main-blue">
                  Login
                </Link>

                <Link href="/register" className="btn-custom btn-main-blue">
                  Sign Up
                </Link>
              </div>
            )}

            {isLoggedIn && (
              <div className="user-view">
                <Link
                  href={getDashboardLink(userType)}
                  className="user-dashboard-link"
                >
                  <div className="user-avatar-circle">
                    <span>{userInitial}</span>
                    <div className="online-dot" />
                  </div>

                  <div className="user-info-text">
                    <span className="user-name-label">{displayName}</span>
                    <span className="user-type-badge">
                      {getRoleLabel(userType)}
                    </span>
                  </div>
                </Link>

                {isAdmin ? (
                  <Link
                    href="/dashboard/admin"
                    className="admin-dashboard-button"
                  >
                    Admin Dashboard
                  </Link>
                ) : null}

                {userType === 'company' && companyUnreadMessages > 0 ? (
                  <Link
                    href="/dashboard/company/messages"
                    className="company-message-alert"
                    aria-label={`${companyUnreadMessages} unread company messages`}
                    title={`${companyUnreadMessages} unread messages`}
                  >
                    <span className="company-message-alert-icon">💬</span>
                    <span className="company-message-alert-dot" />
                    <span className="company-message-alert-count">
                      {companyUnreadMessages > 99 ? '99+' : companyUnreadMessages}
                    </span>
                  </Link>
                ) : null}

                <button
                  type="button"
                  onClick={handleLogout}
                  className="logout-button"
                >
                  Logout
                </button>
              </div>
            )}
          </div>

          <div className="role-showcase" id="roles">
            <Link
              href="/clients"
              className={`role-card role-card-clickable ${
                userType === 'client' ? 'role-card-active' : ''
              }`}
            >
              <span className="role-icon">C</span>
              <div>
                <h3>Clients</h3>
                <div className="role-badge">Client guide</div>
              </div>
            </Link>

            <a
              href="#workers-panel"
              className={`role-card role-card-clickable ${
                userType === 'worker' ? 'role-card-active' : ''
              }`}
            >
              <span className="role-icon">W</span>
              <div>
                <h3>Workers</h3>
                <div className="role-badge">Open profiles</div>
              </div>
            </a>

            <a
              href="#companies-panel"
              className={`role-card role-card-clickable ${
                userType === 'company' ? 'role-card-active' : ''
              }`}
            >
              <span className="role-icon">S</span>
              <div>
                <h3>Companies</h3>
                <div className="role-badge">Trusted partners</div>
              </div>
            </a>
          </div>
        </div>

        <section className="public-directory" id="public-directory">
          <div className="public-directory-header">
            <div>
              <div className="directory-kicker">Public Directory</div>
              <div className="directory-title">Workers & Companies</div>
              <p className="directory-text">
                Visitors can browse real worker and company profiles directly
                without logging in.
              </p>

              {matchedSearchIntentLabels.length > 0 ? (
                <div className="directory-intent-note">
                  Exact matches first. Related results are included for:{' '}
                  {matchedSearchIntentLabels.join(' / ')}.
                </div>
              ) : null}
            </div>

            <div className="directory-count-badge">
              {filteredPublicWorkers.length} Workers •{' '}
              {filteredPublicCompanies.length} Companies
            </div>
          </div>

          <div className="directory-split">
            <div className="directory-side" id="workers-panel">
              <div className="directory-side-title">
                <h3>Workers</h3>
                <span>{filteredPublicWorkers.length} registered</span>
              </div>

              {isLoggedIn && userType === 'worker' ? (
                <div className="directory-dashboard-action">
                  <Link
                    href="/dashboard/worker"
                    className="directory-dashboard-button"
                  >
                    My Worker Dashboard
                  </Link>
                </div>
              ) : null}

              <div className="side-grid">
                {workerGridItems.map((worker, index) => {
                  if (!worker) {
                    return (
                      <div
                        key={`empty-worker-${index}`}
                        className="directory-empty"
                        aria-hidden="true"
                      />
                    );
                  }

                  const href = getWorkerProfileHref(worker);
                  const shortName = getShortWorkerName(worker.name);
                  const firstLetter = worker.name.charAt(0).toUpperCase();
                  const statusClass = getWorkerStatusClass(worker.status);
                  const statusLabel = getWorkerStatusLabel(worker.status);

                  return (
                    <Link
                      key={worker.id}
                      href={href}
                      className="directory-card"
                    >
                      <div className="directory-avatar worker-directory-avatar">
                        {worker.avatar ? (
                          <Image
                            src={worker.avatar}
                            alt={`${worker.name} avatar`}
                            width={96}
                            height={96}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            sizes="96px"
                          />
                        ) : (
                          <span>{firstLetter}</span>
                        )}
                      </div>

                      <div
                        className={`worker-availability-button ${statusClass}`}
                      >
                        {statusLabel}
                      </div>

                      <div className="directory-name">{shortName}</div>

                      <div
                        className="directory-rating"
                        aria-label={`${worker.name} rating ${Number(
                          worker.rating ?? 0
                        ).toFixed(1)} from ${worker.reviews_count ?? 0} reviews`}
                      >
                        <span className="directory-rating-stars">
                          {getMiniRatingStars(worker.rating)}
                        </span>
                        <span className="directory-rating-score">
                          {getMiniRatingText(
                            worker.rating,
                            worker.reviews_count
                          )}
                        </span>
                      </div>

                      {worker.profession || worker.city ? (
                        <div className="directory-meta">
                          {worker.profession || worker.city}
                        </div>
                      ) : null}
                    </Link>
                  );
                })}
              </div>
            </div>

            <div className="directory-divider" aria-hidden="true" />

            <div className="directory-side" id="companies-panel">
              <div className="directory-side-title">
                <h3>Companies</h3>
                <span>{filteredPublicCompanies.length} registered</span>
              </div>

              {isLoggedIn && userType === 'company' ? (
                <div className="directory-dashboard-action">
                  <Link
                    href="/dashboard/company"
                    className="directory-dashboard-button"
                  >
                    My Company Dashboard
                  </Link>
                </div>
              ) : null}

              <div className="side-grid">
                {companyGridItems.map((company, index) => {
                  if (!company) {
                    return (
                      <div
                        key={`empty-company-${index}`}
                        className="directory-empty"
                        aria-hidden="true"
                      />
                    );
                  }

                  const href = getCompanyProfileHref(company);
                  const shortName = getShortCompanyName(company.name);
                  const firstLetter = company.name.charAt(0).toUpperCase();

                  return (
                    <Link
                      key={company.id}
                      href={href}
                      className="directory-card"
                    >
                      <div className="directory-avatar">
                        {company.logo ? (
                          <Image
                            src={company.logo}
                            alt={`${company.name} logo`}
                            width={96}
                            height={96}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            sizes="96px"
                          />
                        ) : (
                          <span>{firstLetter}</span>
                        )}
                      </div>

                      <div className="directory-name">{shortName}</div>

                      <div
                        className="directory-rating"
                        aria-label={`${company.name} rating ${Number(
                          company.rating ?? 0
                        ).toFixed(1)} from ${company.reviews_count ?? 0} reviews`}
                      >
                        <span className="directory-rating-stars">
                          {getMiniRatingStars(company.rating)}
                        </span>
                        <span className="directory-rating-score">
                          {getMiniRatingText(
                            company.rating,
                            company.reviews_count
                          )}
                        </span>
                      </div>

                      {company.category || company.city ? (
                        <div className="directory-meta">
                          {company.category || company.city}
                        </div>
                      ) : null}
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        <div className="footer-clean">
          <div className="footer-links">
            <Link href="/about">About</Link>
            <Link href="/contact">FAQ</Link>
            <Link href="/contact">Contact</Link>
            <Link href="/pricing">Pricing</Link>
            <Link href="/legal">Legal</Link>
          </div>

          <div className="copyright">
            © 2026 Sendio — Premium Hospitality & Professional Network.
          </div>
        </div>
      </div>
    </>
  );
}

