'use client';

import Image from 'next/image';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import TrackedCompanyAdLink from '@/components/TrackedCompanyAdLink';
import CompanyAdMediaPreview from '@/components/CompanyAdMediaPreview';
import HeroAdPhonePreview, {
  openHeroAdPhonePreview,
} from '@/components/HeroAdPhonePreview';
import RegisterButtonAvatar from '@/components/RegisterButtonAvatar';
import LoginButtonAvatar from '@/components/LoginButtonAvatar';
type UserProfile = {
  full_name: string | null;
  user_type: 'client' | 'worker' | 'company' | string | null;
  role: string | null;
};
 type HomeLanguage = 'fr' | 'nl' | 'en' | 'ar' | 'es';
type HomeServiceCategory = {
  id: string;
  name: string;
  name_fr: string | null;
  name_nl: string | null;
  translations: {
  ar?: string;
  es?: string;
} | null;
  slug: string;
  icon: string | null;
  image_url: string | null;
};



type ResultTypeFilter = 'all' | 'workers' | 'companies';
type SortFilter = 'best_match' | 'highest_rated' | 'most_reviewed' | 'newest';
type CategoryAdSlot = 'general' | 'household' | 'gardening' | 'logistics';
type DirectoryPanel = 'workers' | 'companies';

type HeroLayout =
  | 'single'
  | 'split_2'
  | 'feature_left_3'
  | 'feature_right_3'
  | 'equal_3'
  | 'grid_4'
  | 'grid_6';

type HeroSettings = {
  enabled: boolean;
  layout: HeroLayout;
};

type HeroSlotRow = {
  slot_index: number;
  ad_id: string | null;
  is_enabled: boolean;
};

function getHeroSlotCount(layout: HeroLayout) {
  if (layout === 'single') return 1;
  if (layout === 'split_2') return 2;

  if (
    layout === 'feature_left_3' ||
    layout === 'feature_right_3' ||
    layout === 'equal_3'
  ) {
    return 3;
  }

  if (layout === 'grid_4') return 4;
  return 6;
}

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
    show_home_slider?: boolean | null;
  show_home_hero?: boolean | null;
  show_home_fixed?: boolean | null;
  show_services_page?: boolean | null;
  home_fixed_slot?: CategoryAdSlot | string | null;
  services_slider_level?: number | null;
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
  show_home_slider?: boolean | null;
show_home_hero?: boolean | null;
show_home_fixed?: boolean | null;
show_services_page?: boolean | null;
home_fixed_slot?: CategoryAdSlot | string | null;
services_slider_level?: number | null;
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
    title: 'Entretien et réparations',
    label: 'Services généraux',
    icon: '🔧',
  },
  {
    id: 'household',
    title: 'Services à domicile',
    label: 'Domicile',
    icon: '🏠',
  },
  {
    id: 'gardening',
    title: 'Jardinage et aménagement extérieur',
    label: 'Jardinage',
    icon: '🌿',
  },
  {
    id: 'logistics',
    title: 'Livraison et logistique',
    label: 'Logistique',
    icon: '🚚',
  },
];

const majorBelgianCities = [
  'Toute la Belgique',
  'Bruxelles',
  'Anvers',
  'Gand',
  'Charleroi',
  'Liège',
  'Bruges',
  'Namur',
  'Louvain',
  'Mons',
  'Malines',
  'Alost',
  'La Louvière',
  'Courtrai',
  'Hasselt',
  'Ostende',
  'Saint-Nicolas',
  'Tournai',
  'Genk',
  'Seraing',
  'Roulers',
  'Verviers',
  'Mouscron',
];

const belgianLocationVariants: Record<string, string[]> = {
  'toute la belgique': [
    'Belgique',
    'Belgium',
    'België',
    'بلجيكا',
    'Bélgica',
  ],

  belgique: [
    'Belgique',
    'Belgium',
    'België',
    'بلجيكا',
    'Bélgica',
  ],

  bruxelles: [
    'Bruxelles',
    'Brussels',
    'Brussel',
    'بروكسل',
    'Bruselas',
  ],

  anvers: [
    'Anvers',
    'Antwerp',
    'Antwerpen',
    'أنتويرب',
    'انتويرب',
    'Amberes',
  ],

  gand: [
    'Gand',
    'Ghent',
    'Gent',
    'غنت',
    'جنت',
    'Gante',
  ],

  charleroi: [
    'Charleroi',
    'شارلروا',
  ],

  liege: [
    'Liège',
    'Liege',
    'لييج',
    'Lieja',
  ],

  bruges: [
    'Bruges',
    'Brugge',
    'بروج',
    'Brujas',
  ],

  namur: [
    'Namur',
    'Namen',
    'نامور',
  ],

  louvain: [
    'Louvain',
    'Leuven',
    'لوفان',
    'Lovaina',
  ],

  mons: [
    'Mons',
    'Bergen',
    'مونس',
  ],

  malines: [
    'Malines',
    'Mechelen',
    'ميخلين',
    'Malinas',
  ],

  alost: [
    'Alost',
    'Aalst',
    'آلست',
    'الست',
  ],

  'la louviere': [
    'La Louvière',
    'La Louviere',
    'لا لوفيير',
  ],

  courtrai: [
    'Courtrai',
    'Kortrijk',
    'كورتريك',
  ],

  hasselt: [
    'Hasselt',
    'هاسلت',
  ],

  ostende: [
    'Ostende',
    'Ostend',
    'Oostende',
    'أوستند',
    'اوستند',
  ],

  'saint nicolas': [
    'Saint-Nicolas',
    'Sint-Niklaas',
    'سان نيكولا',
    'San Nicolás',
  ],

  tournai: [
    'Tournai',
    'Doornik',
    'تورناي',
  ],

  genk: [
    'Genk',
    'جينك',
  ],

  seraing: [
    'Seraing',
    'سيران',
  ],

  roulers: [
    'Roulers',
    'Roeselare',
    'روسيلار',
  ],

  verviers: [
    'Verviers',
    'فيرفييه',
  ],

  mouscron: [
    'Mouscron',
    'Moeskroen',
    'موسكرون',
  ],
};
function normalizeBelgianLocationName(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/-/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
const belgianLocationDisplayNames: Record<
  string,
  Record<HomeLanguage, string>
> = {
  'toute la belgique': {
    fr: 'Toute la Belgique',
    nl: 'Heel België',
    en: 'All Belgium',
    ar: 'كل بلجيكا',
    es: 'Toda Bélgica',
  },
  belgique: {
    fr: 'Belgique',
    nl: 'België',
    en: 'Belgium',
    ar: 'بلجيكا',
    es: 'Bélgica',
  },
  bruxelles: {
    fr: 'Bruxelles',
    nl: 'Brussel',
    en: 'Brussels',
    ar: 'بروكسل',
    es: 'Bruselas',
  },
  anvers: {
    fr: 'Anvers',
    nl: 'Antwerpen',
    en: 'Antwerp',
    ar: 'أنتويرب',
    es: 'Amberes',
  },
  gand: {
    fr: 'Gand',
    nl: 'Gent',
    en: 'Ghent',
    ar: 'غنت',
    es: 'Gante',
  },
  charleroi: {
    fr: 'Charleroi',
    nl: 'Charleroi',
    en: 'Charleroi',
    ar: 'شارلروا',
    es: 'Charleroi',
  },
  liege: {
    fr: 'Liège',
    nl: 'Luik',
    en: 'Liège',
    ar: 'لييج',
    es: 'Lieja',
  },
  bruges: {
    fr: 'Bruges',
    nl: 'Brugge',
    en: 'Bruges',
    ar: 'بروج',
    es: 'Brujas',
  },
  namur: {
    fr: 'Namur',
    nl: 'Namen',
    en: 'Namur',
    ar: 'نامور',
    es: 'Namur',
  },
  louvain: {
    fr: 'Louvain',
    nl: 'Leuven',
    en: 'Leuven',
    ar: 'لوفان',
    es: 'Lovaina',
  },
  mons: {
    fr: 'Mons',
    nl: 'Bergen',
    en: 'Mons',
    ar: 'مونس',
    es: 'Mons',
  },
  malines: {
    fr: 'Malines',
    nl: 'Mechelen',
    en: 'Mechelen',
    ar: 'ميخلين',
    es: 'Malinas',
  },
  alost: {
    fr: 'Alost',
    nl: 'Aalst',
    en: 'Aalst',
    ar: 'آلست',
    es: 'Aalst',
  },
  'la louviere': {
    fr: 'La Louvière',
    nl: 'La Louvière',
    en: 'La Louvière',
    ar: 'لا لوفيير',
    es: 'La Louvière',
  },
  courtrai: {
    fr: 'Courtrai',
    nl: 'Kortrijk',
    en: 'Kortrijk',
    ar: 'كورتريك',
    es: 'Kortrijk',
  },
  hasselt: {
    fr: 'Hasselt',
    nl: 'Hasselt',
    en: 'Hasselt',
    ar: 'هاسلت',
    es: 'Hasselt',
  },
  ostende: {
    fr: 'Ostende',
    nl: 'Oostende',
    en: 'Ostend',
    ar: 'أوستند',
    es: 'Ostende',
  },
  'saint nicolas': {
    fr: 'Saint-Nicolas',
    nl: 'Sint-Niklaas',
    en: 'Sint-Niklaas',
    ar: 'سان نيكولا',
    es: 'San Nicolás',
  },
  tournai: {
    fr: 'Tournai',
    nl: 'Doornik',
    en: 'Tournai',
    ar: 'تورناي',
    es: 'Tournai',
  },
  genk: {
    fr: 'Genk',
    nl: 'Genk',
    en: 'Genk',
    ar: 'جينك',
    es: 'Genk',
  },
  seraing: {
    fr: 'Seraing',
    nl: 'Seraing',
    en: 'Seraing',
    ar: 'سيران',
    es: 'Seraing',
  },
  roulers: {
    fr: 'Roulers',
    nl: 'Roeselare',
    en: 'Roeselare',
    ar: 'روسيلار',
    es: 'Roeselare',
  },
  verviers: {
    fr: 'Verviers',
    nl: 'Verviers',
    en: 'Verviers',
    ar: 'فيرفييه',
    es: 'Verviers',
  },
  mouscron: {
    fr: 'Mouscron',
    nl: 'Moeskroen',
    en: 'Mouscron',
    ar: 'موسكرون',
    es: 'Mouscron',
  },
};
function getBelgianLocationDisplayName(
  value: string,
  language: HomeLanguage
) {
  const normalizedValue = normalizeBelgianLocationName(value);

  const locationEntry = Object.entries(
    belgianLocationVariants
  ).find(
    ([key, variants]) =>
      key === normalizedValue ||
      variants.some(
        (variant) =>
          normalizeBelgianLocationName(variant) === normalizedValue
      )
  );

  if (!locationEntry) return value;

  const [locationKey] = locationEntry;

  return (
    belgianLocationDisplayNames[locationKey]?.[language] ??
    value
  );
}
const searchIntentRules: SearchIntentRule[] = [
  {
    id: 'bathroom_sanitary',
    label: 'Salle de bain et sanitaires',
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
    label: 'Bien-être et soins',
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
    label: 'Entretien et réparation automobile',
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
    label: 'Électricité',
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
    label: 'Menuiserie',
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
    label: 'Nettoyage',
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
    label: 'Peinture et décoration',
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
    label: 'Construction et rénovation',
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
    label: 'Jardinage et aménagement extérieur',
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
    label: 'Livraison et logistique',
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

const frenchSearchSuggestionsByIntent: Record<string, string[]> = {
  bathroom_sanitary: [
    'Salle de bain',
    'Sanitaires',
    'Plombier',
    'Rénovation de salle de bain',
    'Carrelage',
    'Étanchéité',
  ],
  cupping_wellness: [
    'Bien-être',
    'Massage',
    'Kinésithérapie',
    'Soins par ventouses',
    'Récupération sportive',
  ],
  car_maintenance: [
    'Entretien automobile',
    'Réparation automobile',
    'Mécanicien',
    'Carrosserie',
    'Pneus',
    'Freins',
  ],
  electricity: [
    'Électricien',
    'Électricité',
    'Éclairage',
    'Câblage',
    'Installation électrique',
  ],
  carpentry: [
    'Menuisier',
    'Menuiserie',
    'Portes',
    'Meubles',
    'Escaliers',
  ],
  cleaning: [
    'Nettoyage',
    'Nettoyage à domicile',
    'Nettoyage de bureaux',
    'Nettoyage de vitres',
    'Nettoyage industriel',
  ],
  painting_decoration: [
    'Peintre',
    'Peinture',
    'Décoration',
    'Papier peint',
    'Plafonnage',
  ],
  construction_renovation: [
    'Construction',
    'Rénovation',
    'Maçonnerie',
    'Toiture',
    'Revêtement de sol',
  ],
  gardening_landscaping: [
    'Jardinage',
    'Jardinier',
    'Entretien de jardin',
    'Taille de haies',
    'Aménagement extérieur',
  ],
  delivery_logistics: [
    'Livraison',
    'Logistique',
    'Transport',
    'Déménagement',
    'Coursier',
  ],
};
const arabicSearchSuggestionsByIntent: Record<string, string[]> = {
  bathroom_sanitary: [
    'سباك',
    'سباكة',
    'حمامات',
    'صحيات',
  ],
  cupping_wellness: [
    'حجامة',
    'مساج',
    'عناية صحية',
  ],
  car_maintenance: [
    'ميكانيكي',
    'صيانة سيارة',
    'تصليح سيارة',
  ],
  electricity: [
    'كهربائي',
    'كهرباء',
  ],
  carpentry: [
    'نجار',
    'نجارة',
  ],
  cleaning: [
    'تنظيف',
    'تنظيف المنازل',
    'تنظيف المكاتب',
  ],
  painting_decoration: [
    'صباغ',
    'دهان',
    'ديكور',
  ],
  construction_renovation: [
    'بناء',
    'ترميم',
    'تجديد',
    'أسقف',
    'سقف',
  ],
  gardening_landscaping: [
    'بستاني',
    'حدائق',
  ],
  delivery_logistics: [
    'توصيل',
    'نقل',
  ],
};
 function getRoleLabel(
  userType: string | null | undefined,
  language: HomeLanguage = 'fr'
) {
  if (userType === 'company') {
    return language === 'nl'
      ? 'Bedrijfsaccount'
      : language === 'en'
        ? 'Company account'
        : 'Compte entreprise';
  }

  if (userType === 'worker') {
    return language === 'nl'
      ? 'Professioneel account'
      : language === 'en'
        ? 'Professional account'
        : 'Compte professionnel';
  }

  if (userType === 'client') {
    return language === 'nl'
      ? 'Klantaccount'
      : language === 'en'
        ? 'Client account'
        : 'Compte client';
  }

  return language === 'nl'
    ? 'Online'
    : language === 'en'
      ? 'Online'
      : 'En ligne';
}

function getDashboardLink(userType: string | null | undefined) {
  if (userType === 'company') return '/dashboard/company';
  if (userType === 'worker') return '/dashboard/worker';
  return '/';
}

function formatCount(value: number | null) {
  if (value === null) return '—';
  return value.toLocaleString('fr-BE');
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

function getWorkerStatusLabel(
  status: string | null,
  language: HomeLanguage
) {
  if (status === 'available') {
    return language === 'nl'
      ? 'Beschikbaar'
      : language === 'en'
        ? 'Available'
        : language === 'ar'
          ? 'متاح'
          : language === 'es'
            ? 'Disponible'
            : 'Disponible';
  }

  return language === 'nl'
    ? 'Niet beschikbaar'
    : language === 'en'
      ? 'Unavailable'
      : language === 'ar'
        ? 'غير متاح'
        : language === 'es'
          ? 'No disponible'
          : 'Indisponible';
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

function getMiniRatingText(
  rating: number | null,
  reviewsCount: number | null,
  language: HomeLanguage
) {
  if (!reviewsCount || reviewsCount <= 0) {
    return language === 'nl'
      ? 'Nieuw'
      : language === 'en'
        ? 'New'
        : language === 'ar'
          ? 'جديد'
          : language === 'es'
            ? 'Nuevo'
            : 'Nouveau';
  }

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

function getAdPosterMedia(ad: CompanyAd) {
  return (
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
    show_home_slider: ad.show_home_slider ?? false,
    show_home_hero: ad.show_home_hero ?? false,
    show_home_fixed: ad.show_home_fixed ?? false,
    show_services_page: ad.show_services_page ?? false,
    home_fixed_slot: ad.home_fixed_slot ?? null,
    services_slider_level: ad.services_slider_level ?? null,
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

  const locationTerms = new Set<string>([locationQuery]);

  Object.entries(belgianLocationVariants).forEach(([frenchName, variants]) => {
    const normalizedVariants = variants.map(normalizeSearchText);
    const matchesFrenchName =
      frenchName.startsWith(cleanLocationQuery) ||
      cleanLocationQuery.startsWith(frenchName);
    const matchesVariant = normalizedVariants.some(
      (variant) =>
        variant.startsWith(cleanLocationQuery) ||
        cleanLocationQuery.startsWith(variant)
    );

    if (matchesFrenchName || matchesVariant) {
      variants.forEach((variant) => locationTerms.add(variant));
    }
  });

  const score = Math.max(
    ...Array.from(locationTerms).map((term) =>
      getWeightedTextScore(fields, term, {
        exact: 500,
        starts: 420,
        includes: 340,
        wordStart: 260,
        token: 160,
      })
    )
  );

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

  const startsWithSuggestions: string[] = [];
  const includesSuggestions: string[] = [];

  values.forEach((value) => {
    const cleanValue = value?.trim();

    if (!cleanValue) return;

    const normalizedValue = normalizeSearchText(cleanValue);

    if (!normalizedValue || seenValues.has(normalizedValue)) return;

    if (currentSearch && !normalizedValue.includes(currentSearch)) return;

    seenValues.add(normalizedValue);

    if (
      currentSearch &&
      normalizedValue.startsWith(currentSearch)
    ) {
      startsWithSuggestions.push(cleanValue);
    } else {
      includesSuggestions.push(cleanValue);
    }
  });

  return [
    ...startsWithSuggestions,
    ...includesSuggestions,
  ].slice(0, limit);
}
function getCreatedTime(value: string | null) {
  if (!value) return 0;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return 0;

  return date.getTime();
}
export default function HomePage() {
  const [homeLanguage, setHomeLanguage] =
  useState<HomeLanguage>('fr');
  const [isLanguageMenuOpen, setIsLanguageMenuOpen] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [companyUnreadMessages, setCompanyUnreadMessages] = useState(0);
  const [ads, setAds] = useState<CompanyAd[]>([]);
  const [homeServiceCategories, setHomeServiceCategories] = useState<
    HomeServiceCategory[]
  >([]);
  const [heroSettings, setHeroSettings] = useState<HeroSettings>({
    enabled: false,
    layout: 'single',
  });
  const [heroSlots, setHeroSlots] = useState<HeroSlotRow[]>([]);
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
  const [navMenuOpen, setNavMenuOpen] = useState(false);
  const [activeDirectoryPanel, setActiveDirectoryPanel] =
    useState<DirectoryPanel | null>(null);
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
  const [publicNoticeVisible, setPublicNoticeVisible] = useState(false);

  const isLoggedIn = Boolean(userEmail);

  const publicActiveAds = useMemo(() => {
    return ads.filter(isPublicActiveAd);
  }, [ads]);

  const heroAds = useMemo(() => {
    if (!heroSettings.enabled) {
      return [] as Array<CompanyAd | null>;
    }

    const slotCount = getHeroSlotCount(heroSettings.layout);
    const slotByIndex = new Map(
      heroSlots.map((slot) => [slot.slot_index, slot])
    );

    return Array.from({ length: slotCount }, (_, index) => {
      const slot = slotByIndex.get(index + 1);

      if (!slot || slot.is_enabled !== true || !slot.ad_id) {
        return null;
      }

      return (
        publicActiveAds.find((ad) => ad.id === slot.ad_id) ??
        null
      );
    });
  }, [heroSettings, heroSlots, publicActiveAds]);

  const hasHeroAds = heroAds.some(Boolean);

         const categoryAdsBySlot = useMemo(() => {
    const grouped: Record<CategoryAdSlot, CompanyAd[]> = {
      general: [],
      household: [],
      gardening: [],
      logistics: [],
    };

    publicActiveAds.forEach((ad) => {
      if (ad.show_home_fixed !== true) {
        return;
      }

      const fixedSlot =
        ad.home_fixed_slot ?? ad.ad_slot;

      if (
        fixedSlot === 'general' ||
        fixedSlot === 'household' ||
        fixedSlot === 'gardening' ||
        fixedSlot === 'logistics'
      ) {
        grouped[fixedSlot].push(ad);
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
    const intentValues =
  homeLanguage === 'fr'
    ? searchIntentRules.flatMap((rule) => [
        rule.label,
        ...(frenchSearchSuggestionsByIntent[rule.id] ?? []),
      ])
    : homeLanguage === 'ar'
      ? searchIntentRules.flatMap((rule) => [
          ...(arabicSearchSuggestionsByIntent[rule.id] ?? []),
        ])
      : [];

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
    homeLanguage,
    homeSearch,
    publicCompanies,
    publicWorkers,
    workerSearchTerms,
  ]);

  const locationSuggestions = useMemo(() => {
    if (!homeLocation.trim()) return [];

    return getUniqueSuggestedValues(
      [
       ...majorBelgianCities.map((city) =>
  getBelgianLocationDisplayName(city, homeLanguage)
),
        ...publicWorkers.map((worker) => worker.city),
        ...publicCompanies.map((company) => company.city),
      ],
      homeLocation,
      8
    ).filter(
  (city) =>
    city !== 'Toute la Belgique' &&
    city !== 'Heel België' &&
    city !== 'All Belgium'
);
  }, [
  homeLanguage,
  homeLocation,
  publicCompanies,
  publicWorkers,
]);

  const filterCitySuggestions = useMemo(() => {
  if (!filterCitySearch.trim()) return [];

  const cityVariants = majorBelgianCities.flatMap((city) => {
    const normalizedCity = normalizeBelgianLocationName(city);

    return [
      getBelgianLocationDisplayName(city, homeLanguage),
      ...(belgianLocationVariants[normalizedCity] ?? []),
    ];
  });

  return getUniqueSuggestedValues(
    [
      ...cityVariants,
      ...publicWorkers.map((worker) => worker.city),
      ...publicCompanies.map((company) => company.city),
    ],
    filterCitySearch,
    6
  ).filter(
    (city) =>
      !['Belgique', 'Belgium', 'België', 'بلجيكا', 'Bélgica'].includes(city)
  );
}, [
  filterCitySearch,
  homeLanguage,
  publicCompanies,
  publicWorkers,
]);

  const filterServiceSuggestions = useMemo(() => {
  if (!filterServiceSearch.trim()) return [];

  const companyServiceValues = Object.values(companySearchTerms).flat();
  const workerServiceValues = Object.values(workerSearchTerms).flat();
 const localizedServiceValues = homeServiceCategories.map((service) =>
  homeLanguage === 'nl'
    ? service.name_nl?.trim() || service.name
    : homeLanguage === 'en'
      ? service.name
      : homeLanguage === 'ar'
        ? service.translations?.ar?.trim() || service.name
        : homeLanguage === 'es'
          ? service.translations?.es?.trim() || service.name
          : service.name_fr?.trim() || service.name
);

  const intentValues =
  homeLanguage === 'fr'
    ? searchIntentRules.flatMap((rule) => [
        rule.label,
        ...(frenchSearchSuggestionsByIntent[rule.id] ?? []),
      ])
    : [];

    return getUniqueSuggestedValues(
      [
        ...localizedServiceValues,
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
    homeLanguage,
    homeServiceCategories,
    publicCompanies,
    publicWorkers,
    workerSearchTerms,
  ]);

  

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
  return filteredPublicWorkers;
  }, [filteredPublicWorkers]);

  const companyGridItems = useMemo(() => {
  return filteredPublicCompanies;
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
  const languageTimer = window.setTimeout(() => {
    const savedLanguage = window.localStorage.getItem(
      'sendio-home-language'
    );

    if (
  savedLanguage === 'fr' ||
  savedLanguage === 'nl' ||
  savedLanguage === 'en' ||
  savedLanguage === 'ar' ||
  savedLanguage === 'es'
) {
      setHomeLanguage(savedLanguage);
      return;
    }

    const browserLanguage = window.navigator.language.toLowerCase();

    setHomeLanguage(
      browserLanguage.startsWith('nl') ? 'nl' : 'fr'
    );
  }, 0);

  return () => window.clearTimeout(languageTimer);
}, []);
useEffect(() => {
  document.documentElement.lang =
    homeLanguage === 'nl'
      ? 'nl-BE'
      : homeLanguage === 'fr'
        ? 'fr-BE'
        : 'en';
}, [homeLanguage]);

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
  const noticeKey = 'sendio-public-update-notice-seen';

  if (window.sessionStorage.getItem(noticeKey) === '1') {
    return;
  }

  let hideTimer: number | undefined;

  const showTimer = window.setTimeout(() => {
    window.sessionStorage.setItem(noticeKey, '1');
    setPublicNoticeVisible(true);

    hideTimer = window.setTimeout(() => {
      setPublicNoticeVisible(false);
    }, 15000);
  }, 0);

  return () => {
    window.clearTimeout(showTimer);

    if (hideTimer !== undefined) {
      window.clearTimeout(hideTimer);
    }
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

      const { data: homeServicesData } = await supabase
        .from('service_categories')
       .select('id, name, name_fr, name_nl, translations, slug, icon, image_url')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true });

      if (homeServicesData) {
        setHomeServiceCategories(
          homeServicesData as HomeServiceCategory[]
        );
      }

      const [heroSettingsResult, heroSlotsResult] = await Promise.all([
        supabase
          .from('home_hero_settings')
          .select('enabled, layout')
          .eq('id', 1)
          .maybeSingle(),
        supabase
          .from('home_hero_slots')
          .select('slot_index, ad_id, is_enabled')
          .order('slot_index', { ascending: true }),
      ]);

      if (heroSettingsResult.data) {
        setHeroSettings({
          enabled: heroSettingsResult.data.enabled === true,
          layout:
            (heroSettingsResult.data.layout as HeroLayout) ||
            'single',
        });
      }

      if (heroSlotsResult.data) {
        setHeroSlots(heroSlotsResult.data as HeroSlotRow[]);
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
      setHomeSearchNotice('Indiquez un service, une entreprise, un professionnel ou une ville.');
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
      setHomeSearchNotice('Aucune entreprise ni aucun professionnel ne correspond à votre recherche.');

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
  function handleHomeLanguageChange(language: HomeLanguage) {
  setHomeLanguage(language);
  window.localStorage.setItem('sendio-home-language', language);
  setIsLanguageMenuOpen(false);
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
         width: 100%;
          max-width: none;
          margin: 0;
          padding: 0 clamp(16px, 2vw, 32px);
        }
        .navbar {
          min-height: 90px;
          display: flex;
          justify-content: flex-end;
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
          position: relative;
          z-index: 20;
          display: flex;
          gap: 8px;
          list-style: none;
          align-items: center;
          flex-wrap: wrap;
          margin-right: 30px;
          transform: translateY(22px);
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

        .nav-home-link {
          width: 56px;
          height: 56px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0;
          border: 10px solid var(--sendio-page-bg);
          border-radius: 50%;
          background: #111111;
          box-sizing: border-box;
          box-shadow: none;
        }

        .nav-home-link:hover {
          background: #111111;
          opacity: 0.9;
        }

        .nav-home-square {
          width: 9px;
          height: 9px;
          display: block;
          border-radius: 2px;
          background: #ffffff;
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

        .nav-menu-wrap {
          position: relative;
        }

        .nav-menu-toggle {
          width: 62px;
          height: 62px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border: 10px solid var(--sendio-page-bg);
          border-radius: 18px;
          background: var(--sendio-button-bg);
          color: #111827;
          cursor: pointer;
          box-sizing: border-box;
          box-shadow: none;
          transition: 0.2s;
        }

        .nav-menu-toggle:hover,
        .nav-menu-toggle-active {
          background: var(--sendio-button-bg-hover);
          transform: translateY(-1px);
        }

        .nav-menu-lines {
          width: 21px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .nav-menu-lines span {
          width: 100%;
          height: 2px;
          display: block;
          border-radius: 999px;
          background: #111827;
        }

        .nav-menu-panel {
          position: absolute;
          top: calc(100% + 9px);
          right: 0;
          z-index: 40;
          width: 180px;
          display: flex;
          flex-direction: column;
          gap: 6px;
          padding: 8px;
          border: 1px solid var(--sendio-soft-border);
          border-radius: 16px;
          background: #ffffff;
          box-shadow: 0 18px 36px -22px rgba(0, 0, 0, 0.35);
        }

        .nav-menu-panel a,
        .nav-menu-panel button {
          width: 100%;
          min-height: 38px;
          display: flex;
          align-items: center;
          justify-content: flex-start;
          border: 0;
          border-radius: 10px;
          padding: 9px 11px;
          background: transparent;
          color: #111827;
          font: inherit;
          font-size: 0.82rem;
          font-weight: 800;
          text-decoration: none;
          text-align: left;
          cursor: pointer;
        }

        .nav-menu-panel a:hover,
        .nav-menu-panel button:hover {
          background: var(--sendio-button-bg);
          color: #111827;
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
          height: 655px;
          min-height: 655px;
          background: var(--sendio-hero-bg);
          border-radius: 30px;
          margin: -44px 0 0 0;
          padding: 28px 34px 76px;
          display: flex;
          flex-wrap: wrap;
          gap: 24px;
          align-items: center;
          justify-content: space-between;
          overflow: visible;
          position: relative;
        }

        .hero-ad-grid {
          position: absolute;
          inset: 0;
          z-index: 0;
          display: grid;
          gap: 0;
          overflow: hidden;
          border-radius: inherit;
          background: #000000;
          isolation: isolate;
        }

        .hero-layout-single {
          grid-template-columns: 1fr;
          grid-template-rows: 1fr;
        }

        .hero-layout-split_2 {
          grid-template-columns: repeat(2, minmax(0, 1fr));
          grid-template-rows: 1fr;
        }

        .hero-layout-feature_left_3 {
          grid-template-columns: 2fr 1fr;
          grid-template-rows: repeat(2, minmax(0, 1fr));
        }

        .hero-layout-feature_left_3 .hero-ad-slot:first-child,
        .hero-layout-feature_left_3 .hero-ad-empty-slot:first-child {
          grid-row: 1 / 3;
        }

        .hero-layout-feature_right_3 {
          grid-template-columns: 1fr 2fr;
          grid-template-rows: repeat(2, minmax(0, 1fr));
        }

        .hero-layout-feature_right_3 .hero-ad-slot:nth-child(3),
        .hero-layout-feature_right_3 .hero-ad-empty-slot:nth-child(3) {
          grid-column: 2;
          grid-row: 1 / 3;
        }

        .hero-layout-equal_3 {
          grid-template-columns: repeat(3, minmax(0, 1fr));
          grid-template-rows: 1fr;
        }

        .hero-layout-grid_4 {
          grid-template-columns: repeat(2, minmax(0, 1fr));
          grid-template-rows: repeat(2, minmax(0, 1fr));
        }

        .hero-layout-grid_6 {
          grid-template-columns: repeat(3, minmax(0, 1fr));
          grid-template-rows: repeat(2, minmax(0, 1fr));
        }

        .hero-ad-slot,
        .hero-ad-empty-slot {
          position: relative;
          min-width: 0;
          min-height: 0;
          overflow: hidden;
          border: 0;
          border-radius: 0;
          padding: 0;
          margin: -2px;
          background: transparent;
        }

        .hero-ad-slot {
          cursor: pointer;
        }

        .hero-ad-slot img {
          width: 100%;
          height: 100%;
          display: block;
          object-fit: cover;
        }

        .hero-ad-video {
          position: absolute;
          inset: -4px;
          z-index: 1;
          width: calc(100% + 8px);
          height: calc(100% + 8px);
          display: block;
          object-fit: cover;
          background: transparent;
          transform: translateZ(0);
        }

        .hero-ad-poster-fallback {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #0b5b2f, #29b9f3);
          color: white;
          font-size: clamp(2rem, 7vw, 5rem);
          font-weight: 900;
        }

        .hero-ad-play-button,
        .service-ad-play-button {
          position: absolute;
          left: 50%;
          top: 50%;
          z-index: 4;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 54px;
          height: 54px;
          border: 3px solid rgba(255, 255, 255, 0.94);
          border-radius: 999px;
          background: rgba(0, 0, 0, 0.62);
          color: white;
          font-size: 1.35rem;
          line-height: 1;
          pointer-events: none;
          transform: translate(-50%, -50%);
          box-shadow: 0 8px 22px rgba(0, 0, 0, 0.28);
        }

        .service-ad-play-button {
          width: 46px;
          height: 46px;
          font-size: 1.1rem;
        }

        @media (max-width: 700px) {
          .hero-layout-feature_left_3,
          .hero-layout-feature_right_3,
          .hero-layout-equal_3 {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            grid-template-rows: repeat(2, minmax(0, 1fr));
          }

          .hero-layout-feature_left_3 .hero-ad-slot:first-child,
          .hero-layout-feature_left_3 .hero-ad-empty-slot:first-child,
          .hero-layout-equal_3 .hero-ad-slot:first-child,
          .hero-layout-equal_3 .hero-ad-empty-slot:first-child {
            grid-column: 1 / 3;
            grid-row: 1;
          }

          .hero-layout-feature_right_3 .hero-ad-slot:nth-child(3),
          .hero-layout-feature_right_3 .hero-ad-empty-slot:nth-child(3) {
            grid-column: 1 / 3;
            grid-row: 1;
          }

          .hero-layout-grid_6 {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            grid-template-rows: repeat(3, minmax(0, 1fr));
          }
        }

        .hero-content,
        .hero-search-area,
        .hero-services-link {
          z-index: 2;
        }

        .hero-copy {
          padding: 12px 14px;
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.22);
          backdrop-filter: blur(2px);
        }

        .hero-search-area .home-search {
          background: rgba(255, 255, 255, 0.78);
          backdrop-filter: blur(8px);
        }

        .hero-preview-modal {
          position: fixed;
          inset: 0;
          z-index: 200;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 18px;
          background: rgba(0, 0, 0, 0.78);
        }

        .hero-preview-shell {
          position: relative;
          width: min(1100px, 96vw);
          height: min(680px, 88vh);
          overflow: hidden;
          border-radius: 24px;
          background: #000;
        }

        .hero-preview-shell img,
        .hero-preview-shell video {
          width: 100%;
          height: 100%;
          display: block;
          object-fit: contain;
          background: #000;
        }

        .hero-preview-close {
          position: absolute;
          top: 14px;
          right: 14px;
          z-index: 3;
          width: 42px;
          height: 42px;
          border: 0;
          border-radius: 50%;
          background: rgba(255,255,255,0.92);
          color: #111;
          font-size: 25px;
          font-weight: 900;
          cursor: pointer;
        }

        .hero-services-link {
          position: absolute;
          left: 0;
          bottom: -28px;
          width: min(40%, 430px);
          min-width: 320px;
          height: 56px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #111111;
          color: #ffffff;
          border: 10px solid var(--sendio-page-bg);
          border-radius: 999px;
          font-size: 0.72rem;
          font-weight: 600;
          letter-spacing: 0.02em;
          line-height: 1;
          text-decoration: none;
          box-shadow: none;
          z-index: 5;
          transition: opacity 0.2s ease;
        }

        .hero-services-link:hover {
          color: #ffffff;
          opacity: 0.9;
        }

        .hero-brand-inset {
          position: absolute;
          left: 0;
          top: -28px;
          z-index: 6;
          min-width: 250px;
          height: 66px;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 0 22px 0 12px;
          border: 10px solid var(--sendio-page-bg);
          border-radius: 999px;
          background: #111111;
          box-shadow: none;
          text-decoration: none;
          cursor: pointer;
        }

        .hero-brand-inset .logo-img {
          width: 44px;
          height: 44px;
          flex: 0 0 44px;
        }

        .hero-brand-inset .logo-text {
          font-size: 1.85rem;
          color: #ffffff;
        }

        .hero-content {
          flex: 1 1 100%;
          align-self: stretch;
          min-width: 0;
          min-height: 336px;
          color: #111827;
          position: relative;
          pointer-events: none;
        }

        .hero-copy {
          position: absolute;
          left: 0;
          bottom: 8px;
          width: min(42%, 430px);
          z-index: 2;
        }

        .hero-badge {
          font-size: 0.62rem;
          letter-spacing: 1.4px;
          color: #374151;
          font-weight: 700;
          margin-bottom: 7px;
        }

        .hero-title {
          font-size: 1.72rem;
          font-weight: 800;
          line-height: 1.08;
          margin-bottom: 8px;
          color: #111827;
        }

        .hero-desc {
          font-size: 0.76rem;
          line-height: 1.5;
          color: #374151;
          margin-bottom: 0;
          max-width: 100%;
        }

        .hero-search-area {
          position: absolute;
          right: 0;
          bottom: -28px;
          width: 240px;
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 7px;
          z-index: 5;
        }

        .hero-search-fields-below {
          width: 240px;
          max-width: 240px;
          margin: 34px 0 0 auto;
          position: relative;
          z-index: 6;
        }

        .hero-search-fields-below + .new-section-wrapper {
          margin-top: 12px;
        }

        .hero-search-fields-below .search-suggestions-wrap,
        .hero-search-fields-below .search-intent-hint,
        .hero-search-fields-below .home-search-notice {
          width: 240px;
          max-width: 240px;
          margin: 7px 0 0;
        }

        .hero-search-fields-below .search-suggestions-wrap {
          gap: 5px;
        }

        .hero-search-fields-below .search-suggestions {
          gap: 5px;
        }

        .hero-search-fields-below .search-suggestions button {
          padding: 5px 7px;
          font-size: 0.62rem;
        }

        .hero-search-fields-below .search-intent-hint,
        .hero-search-fields-below .home-search-notice {
          padding: 6px 8px;
          font-size: 0.65rem;
          line-height: 1.35;
        }

        .home-search-stack {
          width: 240px;
          max-width: 240px;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 7px;
        }

        .home-search {
          width: 240px;
          height: 38px;
          background: var(--sendio-cream);
          border: 1px solid var(--sendio-soft-border);
          border-radius: 8px;
          padding: 4px;
          display: flex;
          align-items: center;
          box-shadow: 0 8px 16px rgba(37, 99, 235, 0.05);
        }

        .home-search-icon {
          width: 28px;
          height: 28px;
          min-width: 28px;
          border-radius: 7px;
          background: var(--sendio-button-bg);
          color: #111827;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.74rem;
          font-weight: 900;
          border: 1px solid var(--sendio-soft-border);
          box-shadow: none;
        }

        .home-search input {
          width: 100%;
          min-width: 0;
          border: none;
          outline: none;
          background: transparent;
          color: #111827;
          padding: 6px 8px;
          font-size: 0.72rem;
          font-weight: 700;
        }

        .home-search input::placeholder {
          color: #7a6a58;
        }

        .hero-home-button {
          width: 56px;
          height: 56px;
          align-self: flex-end;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0;
          border: 10px solid var(--sendio-page-bg);
          border-radius: 50%;
          background: #111111;
          color: #ffffff;
          text-decoration: none;
          cursor: pointer;
          box-sizing: border-box;
          box-shadow: none;
          transition: opacity 0.2s ease;
        }

        .hero-home-button:hover {
          color: #ffffff;
          opacity: 0.9;
        }

        .hero-home-button-square {
          width: 9px;
          height: 9px;
          display: block;
          border-radius: 2px;
          background: #ffffff;
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

        .hero-search-area .search-suggestions-wrap,
        .hero-search-area .search-intent-hint,
        .hero-search-area .home-search-notice {
          width: 240px;
          max-width: 240px;
          margin: 0;
        }

        .hero-search-area .search-suggestions-wrap {
          gap: 5px;
        }

        .hero-search-area .search-suggestions {
          gap: 5px;
        }

        .hero-search-area .search-suggestions button {
          padding: 5px 7px;
          font-size: 0.62rem;
        }

        .hero-search-area .search-intent-hint,
        .hero-search-area .home-search-notice {
          padding: 6px 8px;
          font-size: 0.65rem;
          line-height: 1.35;
        }

        .hero-search-area .btn-primary {
          width: 240px;
          min-height: 38px;
          padding: 8px 14px;
          font-size: 0.74rem;
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
  width: auto;
  margin: 26px calc(-1 * clamp(16px, 2vw, 32px)) 24px;
  overflow: hidden;
}

.ads-section {
  width: 100%;
  max-width: none;
  overflow: hidden;
  margin: 0 0 32px;
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
          margin: 58px 0 18px;
        }

        .buttons-row-main {
          display: flex;
          gap: 18px;
          justify-content: center;
          align-items: center;
          flex-wrap: wrap;
        }

        .auth-avatar-button-wrap {
          position: relative;
          display: inline-flex;
          min-width: 168px;
        }

        .btn-custom {
          width: 100%;
          min-height: 48px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border: 1px solid transparent;
          cursor: pointer;
          padding: 12px 28px;
          border-radius: 14px;
          font-size: 0.9rem;
          font-weight: 900;
          letter-spacing: 0.01em;
          transition: transform 0.2s ease, box-shadow 0.2s ease, filter 0.2s ease;
          text-decoration: none;
          color: #ffffff;
          box-shadow: 0 10px 22px -14px rgba(15, 23, 42, 0.65);
        }

        .btn-login-avatar {
          background: linear-gradient(135deg, #0ea5e9, #2563eb);
          border-color: rgba(37, 99, 235, 0.35);
        }

        .btn-register-avatar {
          background: linear-gradient(135deg, #8b5cf6, #6d28d9);
          border-color: rgba(109, 40, 217, 0.35);
        }

        .btn-custom:hover {
          transform: translateY(-2px);
          filter: brightness(1.04);
          box-shadow: 0 14px 26px -15px rgba(15, 23, 42, 0.75);
          opacity: 1;
        }

        .btn-custom:focus-visible {
          outline: 3px solid rgba(37, 99, 235, 0.22);
          outline-offset: 3px;
        }

        @media (max-width: 640px) {
          .buttons-block {
            margin-top: 50px;
          }

          .buttons-row-main {
            gap: 14px;
          }

          .auth-avatar-button-wrap {
            min-width: 142px;
          }

          .btn-custom {
            min-height: 44px;
            padding: 10px 20px;
            font-size: 0.82rem;
          }
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
          position: absolute;
          top: -41px;
          left: 24px;
          right: 24px;
          z-index: 5;
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          align-items: center;
          gap: 24px;
          pointer-events: none;
        }

        .role-showcase .role-card {
          position: relative;
          width: 220px;
          max-width: 100%;
          height: 82px;
          min-height: 82px;
          display: grid;
          grid-template-columns: 44px 1fr;
          align-items: center;
          gap: 12px;
          padding: 0 20px;
          border: 6px solid #ffffff;
          border-radius: 24px;
          text-decoration: none;
          font-weight: 900;
          pointer-events: auto;
          box-shadow:
            0 0 0 2px rgba(255, 255, 255, 0.96),
            inset 0 0 0 2px currentColor,
            inset 0 8px 14px rgba(255, 255, 255, 0.58),
            0 16px 24px -17px rgba(15, 23, 42, 0.62);
          transition:
            transform 0.2s ease,
            box-shadow 0.2s ease;
        }

        .role-showcase .role-card:nth-child(1) {
          justify-self: start;
        }

        .role-showcase .role-card:nth-child(2) {
          justify-self: center;
        }

        .role-showcase .role-card:nth-child(3) {
          justify-self: end;
        }

        .role-showcase .role-card-client {
          background: #ecfdf5;
          color: #047857;
        }

        .role-showcase .role-card-worker {
          background: #eff6ff;
          color: #1d4ed8;
        }

        .role-showcase .role-card-company {
          background: #f5f3ff;
          color: #7c3aed;
        }

        .role-showcase .role-icon {
          width: 44px;
          height: 44px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 14px;
          background: rgba(255, 255, 255, 0.92);
          font-size: 21px;
          line-height: 1;
          box-shadow:
            inset 0 0 0 1px rgba(15, 23, 42, 0.06),
            0 4px 9px rgba(15, 23, 42, 0.1);
        }

        .role-showcase .role-label {
          font-size: 1.05rem;
          font-weight: 900;
          line-height: 1;
          text-align: center;
        }

        .role-showcase .role-card-clickable {
          cursor: pointer;
          font: inherit;
          text-align: left;
        }

        .role-showcase .role-card-open {
          transform: translateY(-4px);
          box-shadow:
            0 0 0 2px rgba(255, 255, 255, 0.98),
            inset 0 0 0 2px currentColor,
            inset 0 8px 14px rgba(255, 255, 255, 0.64),
            0 20px 30px -18px rgba(15, 23, 42, 0.68);
        }

        .role-showcase .role-card:hover {
          transform: translateY(-4px);
          box-shadow:
            0 0 0 2px rgba(255, 255, 255, 0.98),
            inset 0 0 0 2px currentColor,
            inset 0 8px 14px rgba(255, 255, 255, 0.64),
            0 20px 30px -18px rgba(15, 23, 42, 0.68);
        }

        .role-showcase .role-card-active::after {
          content: '\\2713';
          position: absolute;
          top: -10px;
          right: -10px;
          width: 26px;
          height: 26px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 3px solid #ffffff;
          border-radius: 999px;
          background: #2563eb;
          color: #ffffff;
          font-size: 13px;
          font-weight: 900;
        }

        .public-directory {
          position: relative;
          overflow: visible;
          margin: 58px 0 46px;
          background: white;
          border: 1px solid rgba(196, 154, 108, 0.28);
          border-radius: 30px;
          padding: 72px 24px 24px;
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
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: #ffffff;
          border: 1px solid #e3e8ff;
          border-radius: 999px;
          padding: 8px 12px;
          font-size: 0.78rem;
          font-weight: 900;
          white-space: nowrap;
          box-shadow: 0 8px 22px rgba(79, 70, 229, 0.08);
        }

        .directory-count-workers {
          color: #2563eb;
        }

        .directory-count-divider {
          color: #a8afc4;
        }

        .directory-count-companies {
          color: #7c3aed;
        }

        .directory-drawer {
          min-width: 0;
          border: 1px solid var(--sendio-soft-border);
          border-radius: 18px;
          background: #f8fbff;
          padding: 18px;
          animation: directoryDrawerOpen 0.28s ease both;
        }

        @keyframes directoryDrawerOpen {
          from {
            opacity: 0;
            transform: translateY(-8px);
          }

          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .directory-scroll-hint {
          margin: -1px 0 12px;
          color: #6b7280;
          font-size: 0.72rem;
          font-weight: 800;
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
          display: flex;
          gap: 12px;
          overflow-x: auto;
          overflow-y: hidden;
          padding: 3px 3px 12px;
          scroll-snap-type: x proximity;
          scrollbar-width: thin;
          scrollbar-color: #93c5fd transparent;
          overscroll-behavior-inline: contain;
          -webkit-overflow-scrolling: touch;
        }

        .side-grid::-webkit-scrollbar {
          height: 8px;
        }

        .side-grid::-webkit-scrollbar-track {
          background: transparent;
        }

        .side-grid::-webkit-scrollbar-thumb {
          background: #bfdbfe;
          border-radius: 999px;
        }

        .directory-card,
        .directory-empty {
          flex: 0 0 158px;
          width: 158px;
          min-width: 158px;
          min-height: 132px;
          scroll-snap-align: start;
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

        .worker-status-available {
  background: #e8f8ef;
  color: #0b7f3a;
  border-color: rgba(11, 127, 58, 0.22);
}

.worker-status-unavailable {
  background: #eef6ff;
  color: #2563eb;
  border-color: rgba(37, 99, 235, 0.22);
}
        

        .directory-rating-stars {
          color: #2563eb;
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
          margin-top: 34px;
          padding: 0 0 18px;
          border-top: 0;
          background: transparent;
        }

        .footer-shell {
          overflow: hidden;
          border: 1px solid #e4e7ff;
          border-radius: 28px;
          background:
            radial-gradient(circle at 88% 18%, rgba(139, 92, 246, 0.12), transparent 28%),
            radial-gradient(circle at 12% 85%, rgba(37, 99, 235, 0.09), transparent 30%),
            #ffffff;
          box-shadow: 0 20px 45px rgba(60, 61, 110, 0.09);
        }

        .footer-main {
          display: grid;
          grid-template-columns: minmax(0, 1.2fr) minmax(320px, 0.8fr);
          gap: 28px;
          align-items: center;
          padding: 32px clamp(22px, 4vw, 52px) 26px;
        }

        .footer-brand {
          min-width: 0;
        }

        .footer-brand-row {
          display: inline-flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 15px;
        }

        .footer-logo {
          width: 52px;
          height: 52px;
          object-fit: contain;
        }

        .footer-brand-name {
          color: #172554;
          font-size: clamp(1.75rem, 3vw, 2.5rem);
          font-weight: 900;
          letter-spacing: -0.04em;
        }

        .footer-title {
          max-width: 650px;
          color: #111827;
          font-size: clamp(1.2rem, 2.1vw, 1.7rem);
          font-weight: 900;
          line-height: 1.25;
        }

        .footer-text {
          max-width: 690px;
          margin-top: 10px;
          color: #5f6781;
          font-size: 0.92rem;
          line-height: 1.7;
        }
          .footer-email {
  width: fit-content;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-top: 14px;
  color: #4f46e5;
  font-size: 0.88rem;
  font-weight: 850;
  text-decoration: none;
}

.footer-email:hover {
  text-decoration: underline;
}
        .footer-beta {
          width: fit-content;
          margin-top: 16px;
          padding: 9px 13px;
          border: 1px solid #ddd6fe;
          border-radius: 999px;
          background: rgba(245, 243, 255, 0.92);
          color: #6d28d9;
          font-size: 0.78rem;
          font-weight: 850;
        }

        .footer-links {
          display: grid;
          grid-template-columns: repeat(5, minmax(76px, 1fr));
          gap: 10px;
          margin: 0;
        }

        .footer-links a {
          min-height: 82px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 7px;
          padding: 10px 8px;
          color: #4c1d95;
          background: rgba(248, 247, 255, 0.94);
          border: 1px solid #e5e1ff;
          border-radius: 17px;
          text-decoration: none;
          font-size: 0.75rem;
          font-weight: 900;
          transition: transform 0.2s, background 0.2s, border-color 0.2s;
        }

        .footer-links a:hover {
          background: #f3f0ff;
          border-color: #cfc5ff;
          color: #4c1d95;
          transform: translateY(-2px);
        }

        .footer-link-icon {
          font-size: 1.28rem;
          line-height: 1;
        }

        .footer-bottom {
          border-top: 1px solid #ececff;
          padding: 15px 20px 17px;
          text-align: center;
          color: #667085;
          font-size: 0.78rem;
          font-weight: 700;
        }

        .copyright {
          color: inherit;
        }

        @media (max-width: 900px) {
          .footer-main {
            grid-template-columns: 1fr;
          }

          .footer-links {
            grid-template-columns: repeat(5, minmax(64px, 1fr));
          }
        }

        @media (max-width: 620px) {
          .footer-main {
            padding: 25px 16px 20px;
          }

          .footer-links {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .footer-links a:last-child {
            grid-column: 1 / -1;
          }
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

        }

        @media (max-width: 780px) {
          :root {
            --sendio-logo-size: 54px;
            --sendio-logo-text-size: 1.95rem;
            --sendio-logo-gap: 10px;
          }

          .hero {
            height: 520px;
            min-height: 520px;
            padding: 24px 20px 72px;
            margin: 16px 0 0;
          }

          .hero-services-link {
            left: 0;
            bottom: -26px;
            width: min(86%, 430px);
            min-width: 0;
            height: 52px;
            border-width: 9px;
            font-size: 0.7rem;
          }

          .hero-content {
            min-height: 420px;
          }

          .hero-brand-inset {
            top: -26px;
            min-width: 0;
            width: min(78%, 300px);
            height: 60px;
            padding: 0 16px 0 10px;
            border-width: 9px;
          }

          .hero-brand-inset .logo-img {
            width: 40px;
            height: 40px;
            flex-basis: 40px;
          }

          .hero-brand-inset .logo-text {
            font-size: 1.65rem;
          }

          .hero-copy {
            left: 0;
            bottom: 152px;
            width: min(100%, 320px);
          }

          .hero-search-area {
            right: 0;
            bottom: -26px;
            width: 240px;
          }

          .hero-title {
            font-size: 1.55rem;
          }

          .hero-desc {
            max-width: 100%;
            font-size: 0.72rem;
          }

          .navbar {
            min-height: 78px;
            flex-direction: row;
            justify-content: flex-end;
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
            top: -32px;
            left: 10px;
            right: 10px;
            gap: 6px;
          }

          .role-showcase .role-card {
            width: 100%;
            max-width: 126px;
            height: 64px;
            min-height: 64px;
            grid-template-columns: 30px 1fr;
            gap: 5px;
            padding: 0 8px;
            border-width: 4px;
            border-radius: 18px;
          }

          .role-showcase .role-icon {
            width: 30px;
            height: 30px;
            border-radius: 10px;
            font-size: 15px;
          }

          .role-showcase .role-label {
            font-size: 0.76rem;
          }

          .role-showcase .role-card-active::after {
            top: -8px;
            right: -7px;
            width: 21px;
            height: 21px;
            font-size: 11px;
          }

          .public-directory {
            margin-top: 50px;
            padding-top: 58px;
          }

          .public-directory-header {
            align-items: flex-start;
            flex-direction: column;
          }


          .directory-drawer {
            padding: 14px 10px;
          }

          .directory-card,
          .directory-empty {
            flex-basis: 136px;
            width: 136px;
            min-width: 136px;
            min-height: 126px;
          }

        }

        .home-services-intro {
          width: min(980px, calc(100% - 32px));
          margin: 18px auto 6px;
          text-align: center;
        }

        .home-services-intro h1 {
          margin: 0;
          color: #111827;
          font-size: clamp(1.08rem, 2vw, 1.45rem);
          font-weight: 900;
          line-height: 1.25;
        }

        .home-services-intro p {
          max-width: 900px;
          margin: 8px auto 0;
          color: #374151;
          font-size: 0.9rem;
          font-weight: 600;
          line-height: 1.6;
        }

        .home-services-slider {
          display: none;
        }
                  @media (min-width: 701px) {
                    .hero-services-link {
            left: 10px;
            right: 10px;
            bottom: -30px;
            width: auto;
            min-width: 0;
            height: 60px;
            border-width: 10px;
            font-size: 0.82rem;
          }

          .hero-search-area {
            left: 50%;
            right: auto;
            bottom: -72px;
            width: 60px;
            height: 60px;
            transform: translateX(-50%);
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 0;
            z-index: 10;
          }

          .hero-search-area .btn-primary {
            width: 60px;
            min-width: 60px;
            height: 60px;
            min-height: 60px;
            padding: 0;
            border: 10px solid var(--sendio-page-bg);
            border-radius: 999px;
          }

          .hero-search-fields-below {
            width: min(900px, calc(100% - 48px));
            max-width: none;
            margin: 46px auto 0;
          }

          .home-search-stack {
            width: 100%;
            max-width: none;
            display: flex;
            flex-direction: row-reverse;
            gap: 84px;
          }

          .home-search {
            flex: 1 1 0;
            width: auto;
            height: 48px;
            padding: 5px;
            border-radius: 10px;
          }
          .home-search-icon {
            width: 36px;
            height: 36px;
            min-width: 36px;
            border-radius: 8px;
            font-size: 0.84rem;
          }

          .home-services-slider {
            display: block;
            width: 100%;
            margin: 18px 0 22px;
            padding: 10px 0 6px;
            overflow: hidden;
          }

          .home-services-track {
            display: flex;
            align-items: flex-start;
            width: max-content;
            gap: 36px;
            animation:
              homeServicesDesktopLeftToRight 60s linear infinite;
            will-change: transform;
          }

          .home-services-track:hover {
            animation-play-state: paused;
          }

          .home-service-floating-link {
            flex: 0 0 92px;
            width: 92px;
            margin: 0;
            padding: 0;
            display: grid;
            justify-items: center;
            gap: 8px;
            color: #111827;
            text-decoration: none;
            text-align: center;
            background: transparent;
            border: none;
            box-shadow: none;
          }

          .home-service-floating-icon {
            width: 38px;
            height: 38px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            font-size: 38px;
            line-height: 1;
            filter: drop-shadow(
              0 5px 7px rgba(15, 23, 42, 0.12)
            );
          }

          .home-service-floating-icon img {
            width: 38px;
            height: 38px;
            object-fit: contain;
          }

          .home-service-floating-name {
            width: 92px;
            color: #334155;
            font-size: 12px;
            line-height: 1.15;
            font-weight: 700;
            text-align: center;
            white-space: normal;
          }

          @keyframes homeServicesDesktopLeftToRight {
            from {
              transform: translateX(-50%);
            }

            to {
              transform: translateX(0);
            }
          }
                      .hero-brand-inset {
            transform: translateY(-20px);
          }

          .nav-links {
            transform: translateY(-14px);
          }
                    .nav-home-link {
            transform: scale(0.82);
            transform-origin: center;
          }

          .nav-menu-wrap > button {
            transform: scale(0.82);
            transform-origin: center;
          }
          }
        @media (min-width: 1000px) {
          .services-row {
            display: flex;
            gap: 18px;
            justify-content: center;
            margin: 34px auto 42px;
            flex-wrap: nowrap;
          }

          .service-card-new {
            position: relative;
            isolation: isolate;
            flex: 0 0 320px;
            width: 320px;
            min-width: 320px;
            max-width: 320px;
            min-height: 0;
            padding: 0;
            display: flex;
            flex-direction: column;
            background-color: transparent;
            border: 0;
            border-radius: 24px;
            box-shadow: none;
            filter: drop-shadow(0 10px 25px rgba(0, 0, 0, 0.12));
            overflow: visible;
            font-family: system-ui, -apple-system, sans-serif;
            direction: ltr;
          }

          .service-card-new::after {
            content: '';
            position: absolute;
            left: 0;
            right: 0;
            bottom: 0;
            z-index: 0;
            height: 24px;
            border-radius: 0 0 24px 24px;
            background: linear-gradient(180deg, #e8ebf0 0%, #cfd5de 100%);
            clip-path: polygon(0 48%, 100% 0, 100% 100%, 0 100%);
            pointer-events: none;
          }

          .service-card-new:hover {
            transform: none;
          }

          .service-card-with-ad {
            min-height: 0;
            background-color: transparent;
            color: inherit;
          }

          .service-ad-media {
            position: relative;
            inset: auto;
            z-index: 2;
            width: 100%;
            height: 220px;
            min-height: 220px;
            flex: 0 0 220px;
            border-radius: 24px 24px 0 0;
            clip-path: polygon(0 0, 100% 12%, 100% 100%, 0 100%);
            background-color: #f0f0f0;
            overflow: hidden;
          }

          .service-ad-media img {
            width: 100%;
            height: 100%;
            object-fit: cover;
          }

          .service-card-overlay {
            display: none;
          }

          .service-card-content {
            position: relative;
            z-index: 2;
            flex: 1 1 auto;
            min-height: 148px;
            padding: 16px 20px 40px 20px;
            border-radius: 0 0 24px 24px;
            background-color: #ffffff;
            clip-path: polygon(
              0 0,
              100% 0,
              100% calc(100% - 18px),
              0 100%
            );
          }

          .service-ad-label {
            display: flex;
            gap: 15px;
            margin: 0 0 8px 0;
            padding: 0;
            background: transparent;
            color: #666;
            font-size: 14px;
            font-weight: 400;
            text-transform: none;
          }

          .service-ad-meta {
            margin: 0 0 6px 0;
            color: #888;
            font-size: 12px;
            font-weight: 400;
            text-shadow: none;
          }

          .service-ad-title {
            margin: 0 0 12px 0;
            color: #111;
            font-size: 18px;
            font-weight: 700;
            line-height: 1.25;
            text-shadow: none;
          }

          .service-ad-count {
            display: flex;
            gap: 15px;
            margin: 0 0 8px 0;
            color: #666;
            font-size: 14px;
            font-weight: 400;
            text-transform: none;
          }

          .service-card-new:not(.service-card-with-ad)::before {
            content: '';
            position: relative;
            z-index: 2;
            width: 100%;
            height: 220px;
            min-height: 220px;
            flex: 0 0 220px;
            border-radius: 24px 24px 0 0;
            clip-path: polygon(0 0, 100% 12%, 100% 100%, 0 100%);
            background-color: #f0f0f0;
          }

          .service-card-new:not(.service-card-with-ad)
            .service-icon-new {
            position: absolute;
            top: -145px;
            left: 50%;
            margin: 0;
            transform: translateX(-50%);
          }

          .service-card-new:not(.service-card-with-ad)
            .service-title-new {
            margin: 0 0 12px 0;
            color: #111;
            font-size: 18px;
            font-weight: 700;
            line-height: 1.25;
          }
        }

        /* SENDIO MOBILE HEADER HERO COMPLETE V1 */
        @media (max-width: 700px) {
          .container {
            padding-left: 6px;
            padding-right: 6px;
          }

          .navbar {
            height: 58px;
            min-height: 58px;
            padding: 0;
            margin: 0 0 -24px;
            position: relative;
            z-index: 30;
          }

              .nav-links {
  position: absolute;
  right: 4px;
  bottom: 16px;
  z-index: 35;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex-wrap: nowrap;
  gap: 2px;
  margin: 0;
  transform: none;
}

.nav-links li {
  margin: 0;
}

        .nav-home-link {
  width: 34px;
  height: 34px;
  padding: 0;
  border: 5px solid var(--sendio-page-bg);
  border-radius: 50%;
  background: #111111;
  box-sizing: border-box;
  transform: none;
}

  .nav-menu-toggle {
  width: 36px;
  height: 36px;
  padding: 0;
  border: 5px solid var(--sendio-page-bg);
  border-radius: 12px;
  background: var(--sendio-button-bg);
  box-sizing: border-box;
  transform: none;
}

          .nav-menu-toggle:hover,
          .nav-menu-toggle-active {
            background: var(--sendio-button-bg-hover);
            transform: none;
          }


             .nav-menu-lines {
  width: 14px;
  gap: 3px;
}

.nav-menu-lines span {
  height: 2px;
}

          .nav-menu-panel {
            top: calc(100% + 6px);
            right: 0;
          }

          .hero {
            height: 250px;
            min-height: 250px;
            margin: 0;
            padding: 0;
            border-radius: 24px;
          }

          .hero-content {
            min-height: 0;
          }

               .hero-brand-inset {
  top: -34px;
  left: 6px;
  width: 142px;
  min-width: 0;
  height: 40px;
  padding: 0 9px 0 6px;
  border-width: 5px;
}

          .hero-brand-inset .logo-img {
  width: 26px;
  height: 26px;
  flex: 0 0 26px;
}

          .hero-brand-inset .logo-text {
  font-size: 1.1rem;
}

          .hero-layout-grid_6 {
            grid-template-columns:
              repeat(2, minmax(0, 1fr));
            grid-template-rows:
              repeat(2, minmax(0, 1fr));
          }

          .hero-layout-grid_6 > :nth-child(n + 5) {
            display: none;
          }

          .hero-ad-slot,
          .hero-ad-empty-slot {
            margin: -2px;
          }

         .hero-services-link {
  left: 6px;
  right: 6px;
  bottom: -34px;
  width: auto;
  min-width: 0;
  height: 40px;
  border-width: 5px;
}
         .hero-search-area {
  left: 50%;
  right: auto;
  bottom: -60px;
  width: 36px;
  align-items: center;
  transform: translateX(-50%);
  z-index: 7;
}

          .hero-home-button {
  width: 36px;
  height: 36px;
  border-width: 5px;
}

          .hero-search-fields-below {
            width: 100%;
            max-width: none;
            margin: 66px 0 0;
          }

          .home-search-stack {
            width: 100%;
            max-width: none;
            display: flex;
            flex-direction: row-reverse;
            gap: 6px;
          }

          .hero-search-fields-below .home-search {
            flex: 1 1 0;
            width: auto;
            min-width: 0;
            height: 32px;
            padding: 3px;
            border-radius: 7px;
          }

          .hero-search-fields-below .home-search-icon {
            width: 24px;
            height: 24px;
            min-width: 24px;
            border-radius: 6px;
            font-size: 0.66rem;
          }

          .hero-search-fields-below .home-search input {
            min-width: 0;
            padding: 4px 5px;
            font-size: 0.62rem;
          }

          .hero-search-fields-below .search-suggestions-wrap,
          .hero-search-fields-below .search-intent-hint,
          .hero-search-fields-below .home-search-notice {
            width: 100%;
            max-width: none;
          }

          .home-services-slider {
            display: block;
            width: 100%;
            margin: 8px 0 10px;
            padding: 3px 0;
            overflow: hidden;
          }

          .home-services-track {
            display: flex;
            align-items: flex-start;
            width: max-content;
            gap: 28px;
            animation:
              homeServicesLeftToRight 60s linear infinite;
            will-change: transform;
          }

          .home-services-track:hover {
            animation-play-state: paused;
          }

          .home-service-floating-link {
            flex: 0 0 68px;
            width: 68px;
            margin: 0;
            padding: 0;
            display: grid;
            justify-items: center;
            gap: 7px;
            color: #111827;
            text-decoration: none;
            text-align: center;
            background: transparent;
            border: none;
            box-shadow: none;
          }

          .home-service-floating-icon {
            width: 27px;
            height: 27px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            font-size: 27px;
            line-height: 1;
            filter: drop-shadow(
              0 5px 7px rgba(15, 23, 42, 0.12)
            );
            transition:
              transform 160ms ease,
              filter 160ms ease;
          }

          .home-service-floating-icon img {
            width: 27px;
            height: 27px;
            object-fit: contain;
          }

          .home-service-floating-link:active
            .home-service-floating-icon {
            transform: scale(0.92);
          }

          .home-service-floating-name {
            width: 68px;
            color: #334155;
            font-size: 10.5px;
            font-weight: 700;
            line-height: 1.15;
            text-align: center;
            white-space: normal;
          }

          @keyframes homeServicesLeftToRight {
            from {
              transform: translateX(-50%);
            }

            to {
              transform: translateX(0);
            }
          }

          .services-row {
            width: 100%;
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 18px 14px;
            margin: 20px auto 30px;
            padding: 8px 5px 16px;
            perspective: 950px;
            perspective-origin: 50% 42%;
          }

          .service-card-new {
            --sendio-card-rotate-x: 3deg;
            --sendio-card-rotate-y: 0deg;
            width: 100%;
            min-width: 0;
            max-width: none;
            transform:
              rotateX(var(--sendio-card-rotate-x))
              rotateY(var(--sendio-card-rotate-y))
              translateZ(0);
            transform-origin: center bottom;
            transform-style: preserve-3d;
            backface-visibility: hidden;
            box-shadow:
              0 20px 24px -18px rgba(15, 23, 42, 0.5),
              0 10px 18px -16px rgba(37, 99, 235, 0.34);
            transition:
              transform 180ms ease,
              box-shadow 180ms ease;
            will-change: transform;
          }

          .service-card-new:nth-child(odd) {
            --sendio-card-rotate-y: 7deg;
          }

          .service-card-new:nth-child(even) {
            --sendio-card-rotate-y: -7deg;
          }

          .service-card-new:nth-child(n + 3) {
            --sendio-card-rotate-x: 2deg;
          }

          .service-card-new:hover {
            transform:
              rotateX(var(--sendio-card-rotate-x))
              rotateY(var(--sendio-card-rotate-y))
              translateY(-2px)
              translateZ(8px);
            box-shadow:
              0 24px 30px -18px rgba(15, 23, 42, 0.54),
              0 14px 22px -18px rgba(37, 99, 235, 0.38);
          }

          .service-card-new:active {
            transform:
              rotateX(var(--sendio-card-rotate-x))
              rotateY(var(--sendio-card-rotate-y))
              translateZ(4px)
              scale(0.985);
          }

}
              .filter-overlay {
          position: fixed;
          inset: 0;
          z-index: 999;
          display: flex;
          align-items: flex-start;
          justify-content: flex-end;
          padding: 76px 24px 24px;
          background: rgba(15, 23, 42, 0.14);
        }

        .filter-overlay .filter-panel {
          position: relative;
          width: min(320px, calc(100vw - 24px));
          max-height: calc(100vh - 100px);
          overflow-y: auto;
          margin: 0;
          padding: 14px;
          border-radius: 16px;
          background: #ffffff;
          box-shadow: 0 22px 50px rgba(15, 23, 42, 0.24);
        }

        .filter-overlay .filter-panel-title {
          margin-bottom: 8px;
          font-size: 0.9rem;
        }

        .filter-overlay .filter-stack {
          gap: 8px;
        }

        .filter-overlay .filter-input,
        .filter-overlay .filter-select {
          min-height: 40px;
          padding: 8px 12px;
        }

        .filter-overlay .filter-check-row,
        .filter-overlay .filter-search-button {
          min-height: 40px;
        }

        .public-update-notice {
          position: fixed;
          top: 18px;
          left: 18px;
          z-index: 140;
          width: min(390px, calc(100vw - 36px));
          padding: 18px 46px 18px 18px;
          border: 1px solid rgba(219, 234, 254, 0.86);
          border-radius: 18px;
          background: rgba(255, 255, 255, 0.82);
          color: #111827;
          box-shadow: 0 20px 45px -28px rgba(15, 23, 42, 0.48);
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
        }

        .public-update-notice-title {
          margin: 0 0 9px;
          font-size: 1rem;
          font-weight: 900;
          line-height: 1.35;
        }

        .public-update-notice-text {
          margin: 0 0 9px;
          font-size: 0.82rem;
          font-weight: 500;
          line-height: 1.55;
        }

        .public-update-notice-cta {
          margin: 2px 0 5px;
          font-size: 0.82rem;
          font-weight: 900;
          line-height: 1.45;
        }

        .public-update-notice-email {
          color: #2563eb;
          font-size: 0.84rem;
          font-weight: 900;
          text-decoration: none;
        }

        .public-update-notice-email:hover {
          text-decoration: underline;
        }

        .public-update-notice-close {
          position: absolute;
          top: 10px;
          right: 11px;
          width: 28px;
          height: 28px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border: 0;
          border-radius: 50%;
          background: rgba(238, 246, 255, 0.92);
          color: #111827;
          font-size: 1rem;
          font-weight: 900;
          cursor: pointer;
        }

        .public-update-notice-close:hover {
          background: var(--sendio-button-bg-hover);
        }

       @media (max-width: 700px) {
  .public-update-notice {
    top: 10px;
    left: 12px;
    width: min(260px, calc(100vw - 24px));
    padding: 10px 34px 10px 12px;
    border-radius: 14px;
  }

  .public-update-notice-title {
    font-size: 0.72rem;
    line-height: 1.25;
    margin-bottom: 6px;
  }

  .public-update-notice-text {
    font-size: 0.61rem;
    line-height: 1.38;
    margin-bottom: 6px;
  }

  .public-update-notice-cta {
    font-size: 0.61rem;
    line-height: 1.35;
    margin-bottom: 3px;
  }

  .public-update-notice-email {
    font-size: 0.62rem;
    line-height: 1.3;
  }

  .public-update-notice-close {
    top: 6px;
    right: 6px;
    width: 24px;
    height: 24px;
  }
}
      `}</style>

      {publicNoticeVisible ? (
        <aside
          className="public-update-notice"
          role="status"
          aria-live="polite"
        >
          <button
  type="button"
  className="public-update-notice-close"
  aria-label={
    homeLanguage === 'nl'
      ? 'Melding sluiten'
      : homeLanguage === 'en'
        ? 'Close notification'
        : homeLanguage === 'ar'
          ? 'إغلاق الإشعار'
          : homeLanguage === 'es'
            ? 'Cerrar aviso'
            : 'Fermer l’annonce'
  }
  onClick={() => setPublicNoticeVisible(false)}
>
  ×
</button>

<p className="public-update-notice-title">
  {homeLanguage === 'nl'
    ? '💬 Direct chatten is beschikbaar op Sendio'
    : homeLanguage === 'en'
      ? '💬 Direct chat is available on Sendio'
      : homeLanguage === 'ar'
        ? '💬 الدردشة المباشرة متاحة على Sendio'
        : homeLanguage === 'es'
          ? '💬 El chat directo está disponible en Sendio'
          : '💬 Le chat direct est disponible sur Sendio'}
</p>

<p className="public-update-notice-text">
  {homeLanguage === 'nl'
    ? 'Communiceer rechtstreeks met klanten, vakmensen en bedrijven, eenvoudig en veilig.'
    : homeLanguage === 'en'
      ? 'Communicate directly with clients, professionals and companies, simply and securely.'
      : homeLanguage === 'ar'
        ? 'تواصل مباشرة مع العملاء والمهنيين والشركات بسهولة وأمان.'
        : homeLanguage === 'es'
          ? 'Comunícate directamente con clientes, profesionales y empresas de forma sencilla y segura.'
          : 'Échangez directement avec les clients, les professionnels et les entreprises, simplement et en toute sécurité.'}
</p>

<p className="public-update-notice-cta">
  {homeLanguage === 'nl'
    ? 'Een idee of suggestie? Schrijf ons:'
    : homeLanguage === 'en'
      ? 'Have an idea or suggestion? Write to us:'
      : homeLanguage === 'ar'
        ? 'لديك فكرة أو اقتراح؟ راسلنا:'
        : homeLanguage === 'es'
          ? '¿Tienes una idea o sugerencia? Escríbenos:'
          : 'Une idée ou une suggestion ? Écrivez-nous :'}
</p>

<a
  className="public-update-notice-email"
  href="mailto:info@sendio.be?subject=Suggestion%20pour%20Sendio"
>
  info@sendio.be
</a>
        </aside>
      ) : null}

      <div className="container">
        <div className="navbar">
          <ul className="nav-links">
             <li
  style={{
    position: 'relative',
    listStyle: 'none',
    display: 'flex',
    alignItems: 'center',
    marginRight: '2px',
  }}
>
  <button
    type="button"
    onClick={() =>
      setIsLanguageMenuOpen((current) => !current)
    }
    aria-label={
      homeLanguage === 'nl'
        ? 'Taal wijzigen'
        : homeLanguage === 'en'
          ? 'Change language'
          : 'Changer de langue'
    }
    aria-expanded={isLanguageMenuOpen}
    aria-haspopup="menu"
    style={{
      width: '24px',
      height: '30px',
      padding: 0,
      border: 0,
      background: 'transparent',
      color: isLanguageMenuOpen ? '#29b9f3' : '#111827',
      cursor: 'pointer',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      lineHeight: 1,
      transition: 'color 160ms ease',
    }}
  >
    <span
      style={{
        fontSize: '9px',
        fontWeight: 900,
        letterSpacing: '0.2px',
      }}
    >
      {homeLanguage.toUpperCase()}
    </span>

    <span
      aria-hidden="true"
      style={{
        marginTop: '1px',
        fontSize: '8px',
        fontWeight: 900,
      }}
    >
      ▼
    </span>
  </button>

  {isLanguageMenuOpen ? (
    <div
      role="menu"
      style={{
        position: 'absolute',
        top: '32px',
        left: '-10px',
        zIndex: 200,
        minWidth: '46px',
        padding: '4px',
        border: '1px solid #dbeafe',
        borderRadius: '8px',
        background: '#ffffff',
        boxShadow: '0 8px 20px rgba(15, 23, 42, 0.14)',
      }}
    >
      {(['fr', 'nl', 'en', 'ar', 'es'] as HomeLanguage[]).map(
        (language) => (
          <button
            key={language}
            type="button"
            role="menuitem"
            onClick={() =>
              handleHomeLanguageChange(language)
            }
            style={{
              width: '100%',
              padding: '6px',
              border: 0,
              borderRadius: '6px',
              background:
                homeLanguage === language
                  ? '#e3efff'
                  : 'transparent',
              color:
                homeLanguage === language
                  ? '#29b9f3'
                  : '#111827',
              cursor: 'pointer',
              fontSize: '9px',
              fontWeight: 900,
            }}
          >
            {language.toUpperCase()}
          </button>
        )
      )}
    </div>
  ) : null}
</li>
            <li>
              <Link href="/get-quote" className="nav-home-link" aria-label="Demander un devis">
                <span className="nav-home-square" aria-hidden="true" />
              </Link>
            </li>

            <li className="nav-menu-wrap">
              <button
                type="button"
                className={`nav-menu-toggle ${
                  navMenuOpen ? 'nav-menu-toggle-active' : ''
                }`}
                aria-label="Ouvrir le menu de navigation"
                aria-expanded={navMenuOpen}
                onClick={() => setNavMenuOpen((current) => !current)}
              >
                <span className="nav-menu-lines" aria-hidden="true">
                  <span />
                  <span />
                  <span />
                </span>
              </button>

              {navMenuOpen ? (
                <div className="nav-menu-panel">
                  <button
                    type="button"
                    onClick={() => {
                      setNavMenuOpen(false);
                      setFiltersOpen((current) => !current);
                    }}
                 >
   {homeLanguage === 'nl'
  ? 'Filters'
  : homeLanguage === 'en'
    ? 'Filters'
    : homeLanguage === 'ar'
      ? 'الفلاتر'
      : homeLanguage === 'es'
        ? 'Filtros'
        : 'Filtres'}
{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
</button>

<a
  href="#companies-panel"
  onClick={() => setNavMenuOpen(false)}
>
  {homeLanguage === 'nl'
    ? 'Bedrijven'
    : homeLanguage === 'en'
      ? 'Companies'
      : homeLanguage === 'ar'
        ? 'الشركات'
        : homeLanguage === 'es'
          ? 'Empresas'
          : 'Entreprises'}
</a>

<a
  href="#workers-panel"
  onClick={() => setNavMenuOpen(false)}
>
  {homeLanguage === 'nl'
    ? 'Vakmensen'
    : homeLanguage === 'en'
      ? 'Professionals'
      : homeLanguage === 'ar'
        ? 'المهنيون'
        : homeLanguage === 'es'
          ? 'Profesionales'
          : 'Professionnels'}
</a>

<Link
  href="/clients"
  onClick={() => setNavMenuOpen(false)}
>
  {homeLanguage === 'nl'
    ? 'Klanten'
    : homeLanguage === 'en'
      ? 'Clients'
      : homeLanguage === 'ar'
        ? 'العملاء'
        : homeLanguage === 'es'
          ? 'Clientes'
          : 'Clients'}
</Link>
                </div>
              ) : null}
            </li>
          </ul>
        </div>

             {filtersOpen ? (
  <div
    className="filter-overlay"
    onClick={() => setFiltersOpen(false)}
  >
    <section
      className="filter-panel"
      role="dialog"
      aria-modal="true"
     aria-label={
homeLanguage === 'nl'
  ? 'Filters'
  : homeLanguage === 'en'
    ? 'Filters'
    : homeLanguage === 'ar'
      ? 'الفلاتر'
      : homeLanguage === 'es'
        ? 'Filtros'
        : 'Filtres'
}
      onClick={(event) => event.stopPropagation()}
    >
           <div className="filter-panel-title">
 { homeLanguage === 'nl'
  ? 'Filters'
  : homeLanguage === 'en'
    ? 'Filters'
    : homeLanguage === 'ar'
      ? 'الفلاتر'
      : homeLanguage === 'es'
        ? 'Filtros'
        : 'Filtres'}
</div>

            <div className="filter-stack">
              <div className="filter-field">
                <span className="filter-label">{homeLanguage === 'nl'
  
  ? 'Tonen'
  : homeLanguage === 'en'
    ? 'Show'
    : homeLanguage === 'ar'
      ? 'عرض'
      : homeLanguage === 'es'
        ? 'Mostrar'
        : 'Afficher'}</span>
                <div className="filter-segment">
                  {[
                     {
  
  value: 'all',
  label:
    homeLanguage === 'nl'
      ? 'Alles'
      : homeLanguage === 'en'
        ? 'All'
        : homeLanguage === 'ar'
          ? 'الكل'
          : homeLanguage === 'es'
            ? 'Todos'
            : 'Tous',
},
{
  value: 'workers',
  label:
    homeLanguage === 'nl'
      ? 'Vakmensen'
      : homeLanguage === 'en'
        ? 'Professionals'
        : homeLanguage === 'ar'
          ? 'المهنيون'
          : homeLanguage === 'es'
            ? 'Profesionales'
            : 'Professionnels',
},
{
  value: 'companies',
  label:
    homeLanguage === 'nl'
      ? 'Bedrijven'
      : homeLanguage === 'en'
        ? 'Companies'
        : homeLanguage === 'ar'
          ? 'الشركات'
          : homeLanguage === 'es'
            ? 'Empresas'
            : 'Entreprises',
},
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
                {homeLanguage === 'nl'
  ? 'Stad of gemeente'
  : homeLanguage === 'en'
    ? 'City or location'
    : homeLanguage === 'ar'
      ? 'المدينة أو المنطقة'
      : homeLanguage === 'es'
        ? 'Ciudad o localidad'
        : 'Ville ou localité'}
                </label>
                <input
                  id="filter-city-search"
                  className="filter-input"
                  type="search"
                  value={filterCitySearch}
                  onChange={(event) => setFilterCitySearch(event.target.value)}
                 placeholder={
  homeLanguage === 'nl'
    ? 'Vul een stad of gemeente in'
    : homeLanguage === 'en'
      ? 'Enter a city or location'
      : homeLanguage === 'ar'
        ? 'أدخل مدينة أو منطقة'
        : homeLanguage === 'es'
          ? 'Introduce una ciudad o localidad'
          : 'Indiquez une ville ou une localité'
}
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
                  {homeLanguage === 'nl'
  ? 'Dienst, beroep of behoefte'
  : homeLanguage === 'en'
    ? 'Service, trade or need'
    : homeLanguage === 'ar'
      ? 'خدمة أو مهنة أو احتياج'
      : homeLanguage === 'es'
        ? 'Servicio, oficio o necesidad'
        : 'Service, métier ou besoin'}
                </label>
                <input
                  id="filter-service-search"
                  className="filter-input"
                  type="search"
                  value={filterServiceSearch}
                  onChange={(event) =>
                    setFilterServiceSearch(event.target.value)
                  }
                placeholder={
  homeLanguage === 'nl'
    ? 'Vul een dienst of beroep in'
    : homeLanguage === 'en'
      ? 'Enter a service or trade'
      : homeLanguage === 'ar'
        ? 'أدخل خدمة أو مهنة'
        : homeLanguage === 'es'
          ? 'Introduce un servicio u oficio'
          : 'Indiquez un service ou un métier'
}
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
               {homeLanguage === 'nl'
  ? 'Alleen beschikbare vakmensen'
  : homeLanguage === 'en'
    ? 'Available professionals only'
    : homeLanguage === 'ar'
      ? 'المهنيون المتاحون فقط'
      : homeLanguage === 'es'
        ? 'Solo profesionales disponibles'
        : 'Professionnels disponibles uniquement'}
              </label>

             
            <div className="filter-field">
  <label className="filter-label" htmlFor="filter-sort">
    {homeLanguage === 'nl'
      ? 'Sorteren op'
      : homeLanguage === 'en'
        ? 'Sort by'
        : homeLanguage === 'ar'
          ? 'ترتيب حسب'
          : homeLanguage === 'es'
            ? 'Ordenar por'
            : 'Trier par'}
  </label>

  <select
    id="filter-sort"
    className="filter-select"
    value={sortFilter}
    onChange={(event) =>
      setSortFilter(event.target.value as SortFilter)
    }
  >
    <option value="best_match">
      {homeLanguage === 'nl'
        ? 'Beste overeenkomst'
        : homeLanguage === 'en'
          ? 'Best match'
          : homeLanguage === 'ar'
            ? 'أفضل تطابق'
            : homeLanguage === 'es'
              ? 'Mejor coincidencia'
              : 'Meilleure correspondance'}
    </option>

    <option value="highest_rated">
      {homeLanguage === 'nl'
        ? 'Best beoordeeld'
        : homeLanguage === 'en'
          ? 'Top rated'
          : homeLanguage === 'ar'
            ? 'الأعلى تقييمًا'
            : homeLanguage === 'es'
              ? 'Mejor valorados'
              : 'Mieux notés'}
    </option>

    <option value="most_reviewed">
      {homeLanguage === 'nl'
        ? 'Meeste beoordelingen'
        : homeLanguage === 'en'
          ? 'Most reviews'
          : homeLanguage === 'ar'
            ? 'الأكثر مراجعات'
            : homeLanguage === 'es'
              ? 'Más reseñas'
              : 'Plus d’avis'}
    </option>

    <option value="newest">
      {homeLanguage === 'nl'
        ? 'Meest recent'
        : homeLanguage === 'en'
          ? 'Most recent'
          : homeLanguage === 'ar'
            ? 'الأحدث'
            : homeLanguage === 'es'
              ? 'Más recientes'
              : 'Plus récents'}
    </option>
  </select>
</div>

<button
  type="button"
  className="filter-search-button"
  onClick={runFilterSearch}
>
  {homeLanguage === 'nl'
    ? 'Zoeken'
    : homeLanguage === 'en'
      ? 'Search'
      : homeLanguage === 'ar'
        ? 'بحث'
        : homeLanguage === 'es'
          ? 'Buscar'
          : 'Rechercher'}
</button>
            </div>
          </section>
           </div>
        ) : null}

        <div className="hero">
          {hasHeroAds ? (
            <div
              className={`hero-ad-grid hero-layout-${heroSettings.layout}`}
              aria-label="Publicités principales de la page d’accueil"
            >
              {heroAds.map((ad, index) =>
                ad ? (
                  <button
                    type="button"
                    key={`${ad.id}-${index}`}
                    className="hero-ad-slot"
                    onClick={() => {
                      const mediaUrl =
                        isVideoAd(ad) && ad.video_url
                          ? ad.video_url
                          : getAdMedia(ad);

                      if (!mediaUrl) return;

                      openHeroAdPhonePreview({
                        title: ad.title,
                        mediaUrl,
                        mediaType:
                          isVideoAd(ad) && ad.video_url
                            ? 'video'
                            : 'image',
                      });
                    }}
                    aria-label={`Ouvrir l’aperçu de l’annonce ${ad.title}`}
                  >
                    {isVideoAd(ad) && ad.video_url ? (
                      getAdPosterMedia(ad) ? (
                        <Image
                          src={getAdPosterMedia(ad) as string}
                          alt={`Annonce ${ad.title}`}
                          fill
                          unoptimized
                          sizes="100vw"
                          style={{ objectFit: 'cover' }}
                        />
                      ) : (
                        <span className="hero-ad-poster-fallback">
                          {(
                            ad.title ||
                            ad.company?.name ||
                            'S'
                          )
                            .charAt(0)
                            .toUpperCase()}
                        </span>
                      )
                    ) : getAdMedia(ad) ? (
                      <Image
                        src={getAdMedia(ad) as string}
                        alt={`Annonce ${ad.title}`}
                        fill
                        unoptimized
                        sizes="100vw"
                        style={{ objectFit: 'cover' }}
                      />
                    ) : null}

                    {isVideoAd(ad) && ad.video_url ? (
                      <span
                        className="hero-ad-play-button"
                        aria-hidden="true"
                      >
                        ▶
                      </span>
                    ) : null}
                  </button>
                ) : (
                  <div
                    key={`empty-${index}`}
                    className="hero-ad-empty-slot"
                    aria-hidden="true"
                  />
                )
              )}
            </div>
          ) : null}
          <Link href="/legal" className="hero-brand-inset" aria-label="Mentions légales">
            <Image
              src="/logo.png"
              alt="Logo Sendio"
              width={74}
              height={74}
              className="logo-img"
              priority
            />
            <span className="logo-text">
              Send<span className="logo-dot">i</span>o
            </span>
          </Link>

          <div className="hero-content" aria-hidden="true" />

          <div className="hero-search-area">
            <button
              type="submit"
              form="home-search-form"
              className="hero-home-button"
              aria-label="Rechercher"
            >
              <span className="hero-home-button-square" aria-hidden="true" />
            </button>
          </div>

          <div className="hero-stats" style={{ display: "none" }}>
            <div className="stat-item">
              <span className="stat-number">{formatCount(stats.clients)}</span>
              <br />
              Clients actifs
            </div>

            <div className="stat-item">
              <span className="stat-number">{formatCount(stats.workers)}</span>
              <br />
              Professionnels vérifiés
            </div>

            <div className="stat-item">
              <span className="stat-number">
                {formatCount(stats.companies)}
              </span>
              <br />
             {homeLanguage === 'nl'
  ? 'Partnerbedrijven'
  : homeLanguage === 'en'
    ? 'Partner companies'
    : 'Entreprises partenaires'}
            </div>
          </div>

          <Link href="/services" className="hero-services-link">
 {homeLanguage === 'nl'
  ? 'Diensten'
  : homeLanguage === 'ar'
    ? 'الخدمات'
    : homeLanguage === 'es'
      ? 'Servicios'
      : 'Services'}
</Link>
        </div>

        <div className="hero-search-fields-below">
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
               placeholder={
  homeLanguage === 'nl'
    ? 'Zoek een dienst, vakman of bedrijf'
    : homeLanguage === 'en'
      ? 'Search for a service, professional or company'
      : homeLanguage === 'ar'
        ? 'ابحث عن خدمة أو مهني أو شركة'
        : homeLanguage === 'es'
          ? 'Busca un servicio, profesional o empresa'
          : 'Rechercher un service, un professionnel ou une entreprise'
}
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
                placeholder={
  homeLanguage === 'nl'
    ? 'Stad of gemeente'
    : homeLanguage === 'en'
      ? 'City or location'
      : homeLanguage === 'ar'
        ? 'المدينة أو المنطقة'
        : homeLanguage === 'es'
          ? 'Ciudad o localidad'
          : 'Ville ou localité'
}
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
                  {locationSuggestions.map((suggestion) => {
  const displayedLocation =
    getBelgianLocationDisplayName(suggestion, homeLanguage);

  return (
    <button
      type="button"
      key={`location-${suggestion}`}
      onClick={() => setHomeLocation(displayedLocation)}
    >
      {displayedLocation}
    </button>
  );
})}
                </div>
              ) : null}
            </div>
          ) : null}

          

          {homeSearchNotice ? (
            <p className="home-search-notice">{homeSearchNotice}</p>
          ) : null}
        </div>

        <section
          className="home-services-intro"
          aria-labelledby="home-services-intro-title"
        >
          <h1 id="home-services-intro-title">
             {homeLanguage === 'nl'
  ? 'Een loodgieter, elektricien of dakwerker in de buurt nodig?'
  : homeLanguage === 'en'
    ? 'Looking for a professional near you?'
    : homeLanguage === 'ar'
      ? 'هل تبحث عن مهني بالقرب منك؟'
      : homeLanguage === 'es'
        ? '¿Buscas un profesional cerca de ti?'
        : 'Vous cherchez un professionnel près de chez vous ?'}
          </h1>
          <p>
           {homeLanguage === 'nl'
  ? 'Vind ook een schoonmaakbedrijf, huishoudhulp, tuinman of verhuisfirma, plus vakmensen voor renovatie. Bekijk profielen en chat rechtstreeks via Sendio.'
  : homeLanguage === 'en'
    ? 'Need a plumber, electrician, roofer, cleaning company or house cleaner? Browse profiles and chat directly on Sendio.'
    : homeLanguage === 'ar'
  ? (
      <span dir="rtl">
        سباك، كهربائي، عامل أسقف، شركة تنظيف أو عاملة منزلية: تصفح الملفات الشخصية وتواصل مباشرة عبر شات{' '}
        <bdi dir="ltr">Sendio</bdi>.
      </span>
    )
      : homeLanguage === 'es'
        ? 'Fontanero, electricista, techador, empresa de limpieza o empleada de hogar: consulta los perfiles y habla directamente en Sendio.'
        : 'Plombier, électricien, couvreur, société de nettoyage ou femme de ménage : consultez les profils et discutez directement sur Sendio.'}
          </p>
        </section>

        {homeServiceCategories.length > 0 ? (
          <div
            className="home-services-slider"
            aria-label={homeLanguage === 'nl' ? 'Diensten' : 'Services'}
          >
            <div className="home-services-track">
              {[
                ...homeServiceCategories,
                ...homeServiceCategories,
              ].map((service, index) => {
                const city = homeLocation.trim();
                const href = city
                  ? `/services/${service.slug}?city=${encodeURIComponent(city)}`
                  : `/services/${service.slug}`;
                const serviceLabel =
  homeLanguage === 'nl'
    ? service.name_nl?.trim() || service.name
    : homeLanguage === 'en'
      ? service.name
      : homeLanguage === 'ar'
        ? service.translations?.ar?.trim() || service.name
        : homeLanguage === 'es'
          ? service.translations?.es?.trim() || service.name
          : service.name_fr?.trim() || service.name;
                return (
                  <Link
                    href={href}
                    className="home-service-floating-link"
                    key={`${service.id}-${index}`}
                    aria-label={serviceLabel}
                  >
                    <span className="home-service-floating-icon">
                      {service.image_url ? (
                        <Image
                          src={service.image_url}
                          alt=""
                          width={40}
                          height={40}
                          unoptimized
                        />
                      ) : service.icon ? (
                        <span aria-hidden="true">
                         {(
 {
  ant: '🐜',
  bath: '🛁',
  bike: '🚲',
  blocks: '🧱',
  box: '📦',
  boxes: '📦📦',
  'brick-wall': '🧱🔨',
  briefcase: '💼',
  brush: '🧹',
  bug: '🐛',
  'bug-off': '🪲',
  building: '🏢',
  'building-2': '🏬',
  cabinet: '🗄️',
  camera: '📹',
  'chef-hat': '👨‍🍳',
  chimney: '🏚️',
  construction: '🏗️',
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
  grid: '🟫',
  'grid-2x2': '🧩',
  gutter: '🏠🌧️',
  hammer: '🔨',
  'hard-hat': '👷',
  heat: '♨️',
  home: '🏠',
  'home-repair': '🛠️',
  house: '🏡',
  key: '🔑',
  laptop: '💻',
  layers: '🧽',
  layout: '📐',
  'layout-panel-top': '🪚',
  leaf: '🍃',
  lightbulb: '💡',
  lock: '🔒',
  'map-pin': '📍',
  mouse: '🐁',
  oven: '🍳',
  package: '📦',
  'package-check': '📦✅',
  'paint-roller': '🖌️',
  paintbrush: '🎨',
  panel: '⚡🔧',
  'panel-top': '🧱🛠️',
  pipe: '🚰',
  plug: '🔌',
  printer: '🖨️',
  rain: '🌧️',
  road: '🛣️',
  roof: '🏠',
  'roof-repair': '🏠🔨',
  scissors: '✂️',
  scroll: '📜',
  settings: '⚙️',
  shelves: '🗄️',
  shovel: '🪏',
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
  wind: '💨',
  window: '🪟',
  wood: '🪵',
  wrench: '🔧',
  zap: '⚡',
} as Record<string, string>
)[service.icon.trim().toLowerCase()] ?? '🧰'}
                        </span>
                      ) : (
                        <span aria-hidden="true">✦</span>
                      )}
                    </span>

                    <span className="home-service-floating-name">
                      {serviceLabel}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        ) : null}

        <div className="new-section-wrapper">
          <div className="ads-section" id="ads">
            <div className="companies-marquee">
              {marqueeAds.length > 0 ? (
                <div className="marquee-track">
                  {marqueeAds.map((ad, index) => {
                    const name = ad.title || ad.company?.name || 'Annonce';
                    const firstLetter = name.charAt(0).toUpperCase();
                    const media = getAdMedia(ad);
                    const poster = getAdPosterMedia(ad);
                    const videoAd = isVideoAd(ad);
                    const description = ad.description?.trim();

                    return (
                        <div
  className="company-card"
  key={`${ad.id}-${index}`}
>
  <CompanyAdMediaPreview
    adId={ad.id}
    mediaUrl={media}
    posterUrl={poster}
    videoUrl={ad.video_url ?? null}
    isVideo={videoAd}
    alt={`Annonce ${name}`}
    fallbackLetter={firstLetter}
  />

  <TrackedCompanyAdLink
    adId={ad.id}
    href={getAdHref(ad)}
    className="ad-cta"
  >
    <span
      style={{
        display: 'block',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        fontSize: '0.72rem',
        fontWeight: 900,
        lineHeight: 1.15,
      }}
    >
      {name}
    </span>

    {description ? (
      <span
        style={{
          display: 'block',
          marginTop: '2px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          fontSize: '0.58rem',
          fontWeight: 700,
          lineHeight: 1.1,
        }}
      >
        {description}
      </span>
    ) : null}
  </TrackedCompanyAdLink>
</div>
                    );
                  })}
                </div>
              ) : (
                <div className="marquee-track" aria-label="Carrousel publicitaire vide">
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

              const poster = activeAd
                ? getAdPosterMedia(activeAd)
                : null;
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
                  onClick={(event) => {
                    if (
                      !activeAd ||
                      !videoAd ||
                      !activeAd.video_url
                    ) {
                      return;
                    }

                    event.preventDefault();

                    openHeroAdPhonePreview({
                      title: activeAd.title,
                      mediaUrl: activeAd.video_url,
                      mediaType: 'video',
                    });
                  }}
                >
                  {activeAd ? (
                    <>
                      <div className="service-ad-media">
                        {poster ? (
                          <Image
                            src={poster}
                            unoptimized={poster.startsWith('/api/r2/media?')}
                            alt={`Annonce ${adTitle}`}
                            width={320}
                            height={180}
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover',
                            }}
                            sizes="(max-width: 768px) 100vw, 320px"
                          />
                        ) : (
                          <div className="service-ad-fallback">
                            {adTitle.charAt(0).toUpperCase()}
                          </div>
                        )}

                        {videoAd && activeAd.video_url ? (
                          <span
                            className="service-ad-play-button"
                            aria-hidden="true"
                          >
                            ▶
                          </span>
                        ) : null}
                      </div>

                     

                      <div className="service-card-content">
                      
                        <div className="service-ad-title">{adTitle}</div>

                        {(activeAd.company?.category ||
                          activeAd.company?.city) && (
                          <div className="service-ad-meta">
                            {activeAd.company?.category === 'Profil pédagogique'
  ? homeLanguage === 'nl'
    ? 'Educatief profiel'
    : homeLanguage === 'en'
      ? 'Educational profile'
      : 'Profil pédagogique'
  : activeAd.company?.category}
                            {activeAd.company?.category &&
                            activeAd.company?.city
                              ? ' • '
                              : ''}
                            {activeAd.company?.city}
                          </div>
                        )}

                     
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
    <div className="auth-avatar-button-wrap">
      <LoginButtonAvatar />
      <Link href="/login" className="btn-custom btn-login-avatar">
      {homeLanguage === 'nl'
  ? 'Inloggen'
  : homeLanguage === 'en'
    ? 'Login'
    : homeLanguage === 'ar'
      ? 'تسجيل الدخول'
      : homeLanguage === 'es'
        ? 'Iniciar sesión'
        : 'Connexion'}
      </Link>
    </div>

    <div className="auth-avatar-button-wrap">
      <RegisterButtonAvatar />
      <Link
        href="/register"
        className="btn-custom btn-register-avatar"
      >
       {homeLanguage === 'nl'
  ? 'Registreren'
  : homeLanguage === 'en'
    ? 'Sign Up'
    : homeLanguage === 'ar'
      ? 'إنشاء حساب'
      : homeLanguage === 'es'
        ? 'Registrarse'
        : "S'inscrire"}
      </Link>
    </div>
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
                     {getRoleLabel(userType, homeLanguage)}
                    </span>
                  </div>
                </Link>

                {isAdmin ? (
                  <Link
                    href="/dashboard/admin"
                    className="admin-dashboard-button"
                  >
                    Administration
                  </Link>
                ) : null}

                {userType === 'company' && companyUnreadMessages > 0 ? (
                  <Link
                    href="/dashboard/company/messages"
                    className="company-message-alert"
                    aria-label={`${companyUnreadMessages} messages non lus pour l’entreprise`}
                    title={`${companyUnreadMessages} messages non lus`}
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
                  {homeLanguage === 'nl'
  ? 'Uitloggen'
  : homeLanguage === 'en'
    ? 'Sign out'
    : 'Se déconnecter'}
                </button>
              </div>
            )}
          </div>

        </div>

        <section className="public-directory" id="public-directory">
          <div className="role-showcase" id="roles">
            <Link
              href="/clients"
              className={`role-card role-card-client role-card-clickable ${
                userType === 'client' ? 'role-card-active' : ''
              }`}
            >
              <span className="role-icon" aria-hidden="true">
                {'\u{1F464}'}
              </span>
             <span className="role-label">
  {homeLanguage === 'nl'
    ? 'Klant'
    : homeLanguage === 'en'
      ? 'Client'
      : homeLanguage === 'ar'
        ? 'عميل'
        : homeLanguage === 'es'
          ? 'Cliente'
          : 'Client'}
</span>

            </Link>

            <button
              type="button"
              className={`role-card role-card-worker role-card-clickable ${
                userType === 'worker' ? 'role-card-active' : ''
              } ${
                activeDirectoryPanel === 'workers' ? 'role-card-open' : ''
              }`}
              onClick={() =>
                setActiveDirectoryPanel((currentPanel) =>
                  currentPanel === 'workers' ? null : 'workers'
                )
              }
              aria-expanded={activeDirectoryPanel === 'workers'}
              aria-controls="workers-panel"
            >
              <span className="role-icon" aria-hidden="true">
                {'\u{1F4BC}'}
              </span>
             <span
  className="role-label"
  style={
    homeLanguage === 'fr'
      ? { fontSize: '12px', whiteSpace: 'nowrap' }
      : undefined
  }
>
  {homeLanguage === 'nl'
    ? 'Werker'
    : homeLanguage === 'en'
      ? 'Worker'
      : homeLanguage === 'ar'
        ? 'عامل'
        : homeLanguage === 'es'
          ? 'Trabajador'
          : 'Travailleur'}
</span>
 
            </button>

            <button
              type="button"
              className={`role-card role-card-company role-card-clickable ${
                userType === 'company' ? 'role-card-active' : ''
              } ${
                activeDirectoryPanel === 'companies' ? 'role-card-open' : ''
              }`}
              onClick={() =>
                setActiveDirectoryPanel((currentPanel) =>
                  currentPanel === 'companies' ? null : 'companies'
                )
              }
              aria-expanded={activeDirectoryPanel === 'companies'}
              aria-controls="companies-panel"
            >
              <span className="role-icon" aria-hidden="true">
                {'\u{1F3E2}'}
              </span>
             <span className="role-label">
  {homeLanguage === 'nl'
    ? 'Bedrijf'
    : homeLanguage === 'en'
      ? 'Company'
      : homeLanguage === 'ar'
        ? 'شركة'
        : homeLanguage === 'es'
          ? 'Empresa'
          : 'Entreprise'}
</span>
            </button>
          </div>
          <div className="public-directory-header">
  <div>
    <div className="directory-kicker">
      {homeLanguage === 'nl'
        ? 'OPENBARE GIDS'
        : homeLanguage === 'en'
          ? 'PUBLIC DIRECTORY'
          : homeLanguage === 'ar'
            ? 'الدليل العام'
            : homeLanguage === 'es'
              ? 'DIRECTORIO PÚBLICO'
              : 'ANNUAIRE PUBLIC'}
    </div>

    <div className="directory-title">
      {homeLanguage === 'nl'
        ? 'Vakmensen en bedrijven'
        : homeLanguage === 'en'
          ? 'Professionals and companies'
          : homeLanguage === 'ar'
            ? 'المهنيون والشركات'
            : homeLanguage === 'es'
              ? 'Profesionales y empresas'
              : 'Professionnels et entreprises'}
    </div>

    <p className="directory-text">
      {homeLanguage === 'nl'
        ? 'Bekijk de openbare profielen van vakmensen en bedrijven zonder in te loggen.'
        : homeLanguage === 'en'
          ? 'Browse the public profiles of professionals and companies without signing in.'
          : homeLanguage === 'ar'
            ? 'تصفح الملفات العامة للمهنيين والشركات دون تسجيل الدخول.'
            : homeLanguage === 'es'
              ? 'Consulta los perfiles públicos de profesionales y empresas sin iniciar sesión.'
              : 'Consultez les profils publics des professionnels et des entreprises sans vous connecter.'}
    </p>
  </div>

  <div className="directory-count-badge">
    <span className="directory-count-workers">
      {filteredPublicWorkers.length}{' '}
      {homeLanguage === 'nl'
        ? 'vakmensen'
        : homeLanguage === 'en'
          ? 'professionals'
          : homeLanguage === 'ar'
            ? 'مهنيين'
            : homeLanguage === 'es'
              ? 'profesionales'
              : 'professionnels'}
    </span>

    <span className="directory-count-divider" aria-hidden="true">
      •
    </span>

    <span className="directory-count-companies">
      {filteredPublicCompanies.length}{' '}
      {homeLanguage === 'nl'
        ? 'bedrijven'
        : homeLanguage === 'en'
          ? 'companies'
          : homeLanguage === 'ar'
            ? 'شركات'
            : homeLanguage === 'es'
              ? 'empresas'
              : 'entreprises'}
    </span>
  </div>
</div>

          {activeDirectoryPanel === 'workers' ? (
            <div
              className="directory-drawer directory-side"
              id="workers-panel"
            >
              <div className="directory-side-title">
  <h3>
    {homeLanguage === 'nl'
      ? 'Vakmensen'
      : homeLanguage === 'en'
        ? 'Professionals'
        : homeLanguage === 'ar'
          ? 'المهنيون'
          : homeLanguage === 'es'
            ? 'Profesionales'
            : 'Professionnels'}
  </h3>

  <span>
    {filteredPublicWorkers.length}{' '}
    {homeLanguage === 'nl'
      ? 'ingeschreven'
      : homeLanguage === 'en'
        ? 'registered'
        : homeLanguage === 'ar'
          ? 'مسجلون'
          : homeLanguage === 'es'
            ? 'registrados'
            : 'inscrits'}
  </span>
</div>

<p className="directory-scroll-hint">
  {homeLanguage === 'nl'
    ? 'Sleep of scroll horizontaal om alle vakmensen te bekijken.'
    : homeLanguage === 'en'
      ? 'Swipe or scroll horizontally to browse all professionals.'
      : homeLanguage === 'ar'
        ? 'اسحب أو مرر أفقياً لتصفح جميع المهنيين.'
        : homeLanguage === 'es'
          ? 'Desliza o desplázate horizontalmente para ver todos los profesionales.'
          : 'Faites glisser ou défiler horizontalement pour parcourir tous les professionnels.'}
</p>

{isLoggedIn && userType === 'worker' ? (
  <div className="directory-dashboard-action">
    <Link
      href="/dashboard/worker"
      className="directory-dashboard-button"
    >
      {homeLanguage === 'nl'
        ? 'Mijn dashboard'
        : homeLanguage === 'en'
          ? 'My dashboard'
          : homeLanguage === 'ar'
            ? 'لوحة التحكم'
            : homeLanguage === 'es'
              ? 'Mi panel'
              : 'Mon tableau de bord'}
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
                  const statusLabel = getWorkerStatusLabel(worker.status, homeLanguage);

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
                            unoptimized={worker.avatar.startsWith('/api/r2/media?')}
                            alt={`Photo de ${worker.name}`}
                            width={96}
                            height={96}
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover',
                            }}
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
                        aria-label={`Note de ${worker.name} : ${Number(
                          worker.rating ?? 0
                        ).toFixed(1)} sur 5, basée sur ${
                          worker.reviews_count ?? 0
                        } avis`}
                      >
                        <span className="directory-rating-stars">
                          {getMiniRatingStars(worker.rating)}
                        </span>
                        <span className="directory-rating-score">
  {getMiniRatingText(
    worker.rating,
    worker.reviews_count,
    homeLanguage
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
          ) : null}

          {activeDirectoryPanel === 'companies' ? (
            <div
              className="directory-drawer directory-side"
              id="companies-panel"
            >
             <div className="directory-side-title">
  <h3>
    {homeLanguage === 'nl'
      ? 'Bedrijven'
      : homeLanguage === 'en'
        ? 'Companies'
        : homeLanguage === 'ar'
          ? 'الشركات'
          : homeLanguage === 'es'
            ? 'Empresas'
            : 'Entreprises'}
  </h3>

  <span>
    {filteredPublicCompanies.length}{' '}
    {homeLanguage === 'nl'
      ? 'ingeschreven'
      : homeLanguage === 'en'
        ? 'registered'
        : homeLanguage === 'ar'
          ? 'مسجلة'
          : homeLanguage === 'es'
            ? 'registradas'
            : 'inscrites'}
  </span>
</div>

<p className="directory-scroll-hint">
  {homeLanguage === 'nl'
    ? 'Sleep of scroll horizontaal om alle bedrijven te bekijken.'
    : homeLanguage === 'en'
      ? 'Swipe or scroll horizontally to browse all companies.'
      : homeLanguage === 'ar'
        ? 'اسحب أو مرر أفقياً لتصفح جميع الشركات.'
        : homeLanguage === 'es'
          ? 'Desliza o desplázate horizontalmente para ver todas las empresas.'
          : 'Faites glisser ou défiler horizontalement pour parcourir toutes les entreprises.'}
</p>

              {isLoggedIn && userType === 'company' ? (
                <div className="directory-dashboard-action">
                  <Link
                    href="/dashboard/company"
                    className="directory-dashboard-button"
                  >
                  {homeLanguage === 'nl'
  ? 'Mijn dashboard'
  : homeLanguage === 'en'
    ? 'My dashboard'
    : homeLanguage === 'ar'
      ? 'لوحة التحكم'
      : homeLanguage === 'es'
        ? 'Mi panel'
        : 'Mon tableau de bord'}
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
                            unoptimized={company.logo.startsWith('/api/r2/media?')}
                            alt={`Logo de ${company.name}`}
                            width={96}
                            height={96}
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover',
                            }}
                            sizes="96px"
                          />
                        ) : (
                          <span>{firstLetter}</span>
                        )}
                      </div>

                      <div className="directory-name">{shortName}</div>

                      <div
                        className="directory-rating"
                        aria-label={`Note de ${company.name} : ${Number(
                          company.rating ?? 0
                        ).toFixed(1)} sur 5, basée sur ${
                          company.reviews_count ?? 0
                        } avis`}
                      >
                        <span className="directory-rating-stars">
                          {getMiniRatingStars(company.rating)}
                        </span>
                        <span className="directory-rating-score">
  {getMiniRatingText(
    company.rating,
    company.reviews_count,
    homeLanguage
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
          ) : null}
        </section>

        <footer className="footer-clean">
          <div className="footer-shell">
            <div className="footer-main">
              <div className="footer-brand">
                <div className="footer-brand-row">
                  <Image
                    src="/logo.png"
                    alt="Logo Sendio"
                    width={52}
                    height={52}
                    className="footer-logo"
                  />
                  <span className="footer-brand-name">Sendio</span>
                </div>

                <div className="footer-title">
  {homeLanguage === 'nl'
    ? 'Ontdek diensten, vakmensen en bedrijven in heel België.'
    : homeLanguage === 'en'
      ? 'Discover services, professionals and companies across Belgium.'
      : homeLanguage === 'ar'
        ? 'اكتشف الخدمات والمهنيين والشركات في جميع أنحاء بلجيكا.'
        : homeLanguage === 'es'
          ? 'Descubre servicios, profesionales y empresas en toda Bélgica.'
          : 'Découvrez des services, des professionnels et des entreprises partout en Belgique.'}
</div>

<p className="footer-text">
  {homeLanguage === 'nl'
    ? 'Bekijk openbare profielen, vergelijk aangeboden diensten en volg de ontwikkeling van Sendio.'
    : homeLanguage === 'en'
      ? 'Browse public profiles, compare available services and follow Sendio’s progress.'
      : homeLanguage === 'ar'
        ? (
            <>
              تصفح الملفات العامة، وقارن الخدمات المتاحة، وتابع تطور{' '}
              <span dir="ltr">Sendio</span>.
            </>
          )
        : homeLanguage === 'es'
          ? 'Consulta perfiles públicos, compara los servicios disponibles y sigue la evolución de Sendio.'
          : 'Consultez les profils publics, comparez les services proposés et suivez l’évolution de Sendio.'}
</p>

<a className="footer-email" href="mailto:info@sendio.be">
  ✉ info@sendio.be
</a>

<div className="footer-beta">
  {homeLanguage === 'nl'
    ? 'Experimenteel bètaplatform — informatie kan veranderen.'
    : homeLanguage === 'en'
      ? 'Experimental beta platform — information may change.'
      : homeLanguage === 'ar'
        ? 'منصة تجريبية في المرحلة التجريبية — قد تتغير المعلومات.'
        : homeLanguage === 'es'
          ? 'Plataforma beta experimental — la información puede cambiar.'
          : 'Plateforme bêta expérimentale — les informations peuvent évoluer.'}
</div>
</div>

<nav
  className="footer-links"
  aria-label={
    homeLanguage === 'nl'
      ? 'Voettekst'
      : homeLanguage === 'en'
        ? 'Footer'
        : homeLanguage === 'ar'
          ? 'تذييل الصفحة'
          : homeLanguage === 'es'
            ? 'Pie de página'
            : 'Pied de page'
  }
>
  <Link href="/about">
    <span className="footer-link-icon" aria-hidden="true">
      ⓘ
    </span>
    <span>
      {homeLanguage === 'nl'
        ? 'Over ons'
        : homeLanguage === 'en'
          ? 'About'
          : homeLanguage === 'ar'
            ? 'من نحن'
            : homeLanguage === 'es'
              ? 'Quiénes somos'
              : 'À propos'}
    </span>
  </Link>

  <Link href="/contact">
    <span className="footer-link-icon" aria-hidden="true">
      ?
    </span>
    <span>
      {homeLanguage === 'ar'
        ? 'الأسئلة الشائعة'
        : homeLanguage === 'es'
          ? 'Preguntas frecuentes'
          : 'FAQ'}
    </span>
  </Link>

  <Link href="/contact">
    <span className="footer-link-icon" aria-hidden="true">
      ✉
    </span>
    <span>
      {homeLanguage === 'ar'
        ? 'اتصل بنا'
        : homeLanguage === 'es'
          ? 'Contacto'
          : 'Contact'}
    </span>
  </Link>

  <Link href="/pricing">
    <span className="footer-link-icon" aria-hidden="true">
      📣
    </span>
    <span>
      {homeLanguage === 'nl'
        ? 'Adverteren'
        : homeLanguage === 'en'
          ? 'Advertising'
          : homeLanguage === 'ar'
            ? 'الإعلانات'
            : homeLanguage === 'es'
              ? 'Publicidad'
              : 'Publicité'}
    </span>
  </Link>

  <Link href="/legal">
    <span className="footer-link-icon" aria-hidden="true">
      ⚖
    </span>
    <span>
      {homeLanguage === 'nl'
        ? 'Wettelijke vermeldingen'
        : homeLanguage === 'en'
          ? 'Legal notices'
          : homeLanguage === 'ar'
            ? 'الإشعارات القانونية'
            : homeLanguage === 'es'
              ? 'Avisos legales'
              : 'Mentions légales'}
    </span>
  </Link>
</nav>
</div>

<div className="footer-bottom">
  <span className="copyright">
    {homeLanguage === 'nl'
      ? 'Sendio — Experimenteel bètaplatform · 2026.'
      : homeLanguage === 'en'
        ? 'Sendio — Experimental beta platform · 2026.'
        : homeLanguage === 'ar'
          ? (
              <>
                <span dir="ltr">Sendio</span>
                {' — منصة تجريبية · 2026.'}
              </>
            )
          : homeLanguage === 'es'
            ? 'Sendio — Plataforma beta experimental · 2026.'
            : 'Sendio — Plateforme bêta expérimentale · 2026.'}
  </span>
</div>
          </div>
        </footer>
      </div>
      <HeroAdPhonePreview />
    </>
  );
}


