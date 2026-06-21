import { supabase } from '@/lib/supabase';

export type ServiceCategory = {
  slug: string;
  title: string;
  icons: string[];
  keywords: string[];
};

export type ServiceProvider = {
  id: string;
  kind: 'company' | 'worker';
  name: string;
  slug: string;
  city: string;
  image: string;
  status: string;
  rating: number;
  reviewsCount: number;
  searchText: string;
};

type AnyRow = Record<string, unknown>;

export const SERVICE_CATEGORIES: ServiceCategory[] = [
  {
    slug: 'emergency-services',
    title: 'Emergency Services',
    icons: ['🚑', '🚒'],
    keywords: ['emergency', 'ambulance', 'fire', 'rescue', 'urgent', 'طوارئ', 'اسعاف', 'إسعاف', 'حريق'],
  },
  {
    slug: 'taxi-services',
    title: 'Taxi Services',
    icons: ['🚕'],
    keywords: ['taxi', 'cab', 'driver', 'transport passenger', 'تاكسي', 'تكسي', 'سائق'],
  },
  {
    slug: 'transport-logistics',
    title: 'Transport & Logistics',
    icons: ['🚛', '📦'],
    keywords: ['transport', 'logistics', 'moving', 'delivery', 'shipping', 'cargo', 'نقل', 'شحن', 'توصيل'],
  },
  {
    slug: 'agriculture-machinery',
    title: 'Agriculture Machinery',
    icons: ['🚜'],
    keywords: ['agriculture', 'tractor', 'farm', 'farming', 'machinery', 'زراعة', 'جرار', 'مزرعة'],
  },
  {
    slug: 'marine-transport',
    title: 'Marine Transport',
    icons: ['🛥️', '🚢'],
    keywords: ['boat', 'ship', 'marine', 'ferry', 'sea transport', 'بحر', 'باخرة', 'سفينة', 'قارب'],
  },
  {
    slug: 'travel-booking',
    title: 'Travel Booking',
    icons: ['✈️', '🚅'],
    keywords: ['travel', 'tourism', 'booking', 'flight', 'train', 'ticket', 'trip', 'سفر', 'سياحة', 'حجز', 'طيران', 'قطار'],
  },
  {
    slug: 'construction',
    title: 'Construction Companies',
    icons: ['🏗️', '🧱'],
    keywords: ['construction', 'building', 'contractor', 'renovation', 'masonry', 'بناء', 'مقاولات', 'ترميم', 'انشاء', 'إنشاء'],
  },
  {
    slug: 'home-construction',
    title: 'Home Construction',
    icons: ['🏘️', '🏗️'],
    keywords: ['home construction', 'house building', 'villa', 'home renovation', 'بناء منازل', 'منازل', 'بيت', 'فلل'],
  },
  {
    slug: 'apartment-construction',
    title: 'Apartment Construction',
    icons: ['🏢', '🏗️'],
    keywords: ['apartment', 'building apartments', 'residential building', 'شقق', 'عمارة', 'بناء شقق'],
  },
  {
    slug: 'roads-rail',
    title: 'Roads & Rail Work',
    icons: ['🛣️', '🛤️'],
    keywords: ['road', 'rail', 'infrastructure', 'asphalt', 'paving', 'طرق', 'سكة', 'اسفلت', 'بنية تحتية'],
  },
  {
    slug: 'home-furniture',
    title: 'Home Furniture',
    icons: ['🛋️', '🛏️'],
    keywords: ['furniture', 'sofa', 'bed', 'home furniture', 'اثاث', 'أثاث', 'كنب', 'سرير'],
  },
  {
    slug: 'office-furniture',
    title: 'Office Furniture',
    icons: ['🏢', '🛋️'],
    keywords: ['office furniture', 'desk', 'office chair', 'workspace', 'اثاث مكتبي', 'أثاث مكتبي', 'مكتب'],
  },
  {
    slug: 'medical-supplies',
    title: 'Medical Supplies',
    icons: ['🩺', '💉'],
    keywords: ['medical supplies', 'medical equipment', 'health equipment', 'clinic supplies', 'مستلزمات طبية', 'طبي', 'معدات طبية'],
  },
  {
    slug: 'pharmacy',
    title: 'Pharmacy',
    icons: ['💊'],
    keywords: ['pharmacy', 'medicine', 'medication', 'drugstore', 'صيدلية', 'دواء', 'ادوية', 'أدوية'],
  },
  {
    slug: 'sports-clothing',
    title: 'Sports Clothing',
    icons: ['🎽', '👚'],
    keywords: ['sports clothing', 'sport clothes', 'gym wear', 'fitness clothing', 'ملابس رياضية', 'رياضة'],
  },
  {
    slug: 'fashion-clothing',
    title: 'Fashion & Clothing',
    icons: ['🧥', '👘'],
    keywords: ['clothing', 'fashion', 'dress', 'wear', 'ملابس', 'ازياء', 'أزياء'],
  },
  {
    slug: 'money-transfer',
    title: 'Money Transfer',
    icons: ['💸', '💵'],
    keywords: ['money transfer', 'exchange', 'currency', 'remittance', 'financial transfer', 'تحويل اموال', 'تحويل أموال', 'صرافة'],
  },
  {
    slug: 'diving-school',
    title: 'Diving School',
    icons: ['🛥️', '🎣'],
    keywords: ['diving', 'diving lessons', 'scuba', 'sea training', 'غوص', 'تعليم الغوص'],
  },
  {
    slug: 'cleaning-services',
    title: 'Cleaning Services',
    icons: ['🧼', '🏘️'],
    keywords: ['cleaning', 'house cleaning', 'office cleaning', 'maintenance cleaning', 'تنظيف', 'نظافة'],
  },
  {
    slug: 'gardening-services',
    title: 'Gardening Services',
    icons: ['🥦', '🌿'],
    keywords: ['garden', 'gardening', 'landscape', 'plants', 'outdoor', 'حدائق', 'زراعة', 'بستنة'],
  },
  {
    slug: 'electrical-services',
    title: 'Electrical Services',
    icons: ['⚒️', '💡'],
    keywords: ['electrician', 'electrical', 'electricity', 'wiring', 'كهرباء', 'كهربائي'],
  },
  {
    slug: 'plumbing-sanitary',
    title: 'Plumbing & Sanitary',
    icons: ['🛁', '🚽'],
    keywords: ['plumber', 'plumbing', 'sanitary', 'bathroom', 'water', 'سباكة', 'صحيات', 'حمام', 'مياه'],
  },
  {
    slug: 'building-materials',
    title: 'Building Materials',
    icons: ['🧱', '⚒️'],
    keywords: ['building materials', 'bricks', 'cement', 'tools', 'مواد بناء', 'طابوق', 'اسمنت'],
  },
  {
    slug: 'security-locks',
    title: 'Security & Locks',
    icons: ['🔐'],
    keywords: ['security', 'lock', 'locks', 'keys', 'alarm', 'حماية', 'اقفال', 'أقفال', 'مفاتيح'],
  },
  {
    slug: 'postal-mail',
    title: 'Postal & Mail',
    icons: ['📫', '✉️'],
    keywords: ['post', 'mail', 'postal', 'letters', 'courier', 'بريد', 'رسائل'],
  },
  {
    slug: 'shipping-parcels',
    title: 'Shipping & Parcels',
    icons: ['📦', '📭'],
    keywords: ['parcel', 'package', 'shipping', 'delivery box', 'طرود', 'شحن', 'حزمة'],
  },
  {
    slug: 'technology-computers',
    title: 'Technology & Computers',
    icons: ['🖥️', '⌨️'],
    keywords: ['computer', 'technology', 'it', 'software', 'hardware', 'laptop', 'كمبيوتر', 'حاسوب', 'تقنية'],
  },
  {
    slug: 'printing-services',
    title: 'Printing Services',
    icons: ['🖨️'],
    keywords: ['printing', 'printer', 'copy', 'design print', 'طباعة', 'مطبعة'],
  },
  {
    slug: 'audio-media',
    title: 'Audio & Media',
    icons: ['🎙️', '🎥'],
    keywords: ['audio', 'studio', 'recording', 'video', 'media', 'film', 'تصوير', 'استوديو', 'صوت'],
  },
  {
    slug: 'music-events',
    title: 'Music & Events',
    icons: ['🎷', '🎸'],
    keywords: ['music', 'events', 'party', 'concert', 'musician', 'موسيقى', 'حفلات', 'عزف'],
  },
  {
    slug: 'sports-training',
    title: 'Sports Training',
    icons: ['🥊', '🥋'],
    keywords: ['sports training', 'boxing', 'martial arts', 'coach', 'fitness', 'تدريب رياضي', 'ملاكمة', 'كاراتيه'],
  },
  {
    slug: 'groceries-produce',
    title: 'Groceries & Produce',
    icons: ['🥦', '🥬'],
    keywords: ['grocery', 'vegetables', 'food market', 'produce', 'خضار', 'بقالة', 'مواد غذائية'],
  },
  {
    slug: 'fruit-market',
    title: 'Fruit Market',
    icons: ['🍇'],
    keywords: ['fruit', 'fruits', 'fresh fruit', 'فاكهة', 'فواكه'],
  },
  {
    slug: 'cafes-bakery',
    title: 'Cafes & Bakery',
    icons: ['☕', '🍪'],
    keywords: ['cafe', 'coffee', 'bakery', 'cookies', 'sweets', 'قهوة', 'مقهى', 'مخبز', 'حلويات'],
  },
  {
    slug: 'bicycle-services',
    title: 'Bicycle Services',
    icons: ['🚲'],
    keywords: ['bicycle', 'bike', 'cycling', 'bike repair', 'دراجة', 'دراجات'],
  },
  {
    slug: 'scooter-motorbike',
    title: 'Scooter & Motorbike',
    icons: ['🛵'],
    keywords: ['scooter', 'motorbike', 'motorcycle', 'دراجة نارية', 'سكوتر'],
  },
  {
    slug: 'mobility-accessibility',
    title: 'Mobility & Accessibility',
    icons: ['🦼'],
    keywords: ['mobility', 'wheelchair', 'accessibility', 'disabled support', 'كرسي متحرك', 'ذوي الاحتياجات'],
  },
  {
    slug: 'phones-telecom',
    title: 'Phones & Telecom',
    icons: ['☎️', '📱'],
    keywords: ['phone', 'mobile', 'telecom', 'smartphone', 'هاتف', 'موبايل', 'اتصالات'],
  },
  {
    slug: 'tourism-resorts',
    title: 'Tourism & Resorts',
    icons: ['⛱️', '✈️'],
    keywords: ['tourism', 'resort', 'holiday', 'vacation', 'beach', 'سياحة', 'منتجع', 'عطلة'],
  },
];

function readText(row: AnyRow, keys: string[]) {
  for (const key of keys) {
    const value = row[key];

    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }

    if (typeof value === 'number' && Number.isFinite(value)) {
      return String(value);
    }
  }

  return '';
}

function readNumber(row: AnyRow, keys: string[]) {
  for (const key of keys) {
    const value = row[key];

    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === 'string' && value.trim() && !Number.isNaN(Number(value))) {
      return Number(value);
    }
  }

  return 0;
}

function buildRelatedTextMap(rows: AnyRow[], ownerKey: string) {
  const map = new Map<string, string[]>();

  for (const row of rows) {
    const ownerId = readText(row, [ownerKey]);

    if (!ownerId) {
      continue;
    }

    const text = [
      readText(row, ['title']),
      readText(row, ['name']),
      readText(row, ['description']),
      readText(row, ['content']),
      readText(row, ['skill']),
      readText(row, ['service']),
      readText(row, ['category']),
      readText(row, ['profession']),
    ]
      .filter(Boolean)
      .join(' ');

    if (!text) {
      continue;
    }

    const current = map.get(ownerId) ?? [];
    current.push(text);
    map.set(ownerId, current);
  }

  return map;
}

export function normalizeServiceText(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\u064b-\u065f\u0670]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function providerMatchesCategory(providerText: string, category: ServiceCategory) {
  const normalizedProviderText = normalizeServiceText(providerText);

  if (!normalizedProviderText) {
    return false;
  }

  return category.keywords.some((keyword) => {
    const normalizedKeyword = normalizeServiceText(keyword);
    return normalizedKeyword.length > 1 && normalizedProviderText.includes(normalizedKeyword);
  });
}

export function getServiceCategoryBySlug(slug: string) {
  return SERVICE_CATEGORIES.find((category) => category.slug === slug) ?? null;
}

export function getProviderHref(provider: ServiceProvider) {
  const target = provider.slug || provider.id;

  if (provider.kind === 'company') {
    return `/companies/${target}`;
  }

  return `/workers/${target}`;
}

export function formatProviderRating(provider: ServiceProvider) {
  if (!provider.reviewsCount || provider.rating <= 0) {
    return '☆☆☆☆☆ New';
  }

  const rounded = Math.round(provider.rating);
  const fullStars = '★'.repeat(Math.min(5, Math.max(0, rounded)));
  const emptyStars = '☆'.repeat(Math.max(0, 5 - rounded));

  return `${fullStars}${emptyStars} ${provider.rating.toFixed(1)}`;
}

export async function loadServiceProviders() {
  const [
    companiesResult,
    workersResult,
    companyServicesResult,
    companyFeaturesResult,
    companyProjectsResult,
    workerServicesResult,
    workerSkillsResult,
  ] = await Promise.all([
    supabase.from('companies').select('*').limit(500),
    supabase.from('workers').select('*').limit(500),
    supabase.from('company_services').select('*').limit(1000),
    supabase.from('company_features').select('*').limit(1000),
    supabase.from('company_projects').select('*').limit(1000),
    supabase.from('worker_services').select('*').limit(1000),
    supabase.from('worker_skills').select('*').limit(1000),
  ]);

  const warnings = [
    companiesResult.error?.message,
    workersResult.error?.message,
    companyServicesResult.error?.message,
    companyFeaturesResult.error?.message,
    companyProjectsResult.error?.message,
    workerServicesResult.error?.message,
    workerSkillsResult.error?.message,
  ].filter(Boolean);

  const companyRows = Array.isArray(companiesResult.data) ? (companiesResult.data as AnyRow[]) : [];
  const workerRows = Array.isArray(workersResult.data) ? (workersResult.data as AnyRow[]) : [];

  const companyServices = Array.isArray(companyServicesResult.data)
    ? (companyServicesResult.data as AnyRow[])
    : [];
  const companyFeatures = Array.isArray(companyFeaturesResult.data)
    ? (companyFeaturesResult.data as AnyRow[])
    : [];
  const companyProjects = Array.isArray(companyProjectsResult.data)
    ? (companyProjectsResult.data as AnyRow[])
    : [];

  const workerServices = Array.isArray(workerServicesResult.data)
    ? (workerServicesResult.data as AnyRow[])
    : [];
  const workerSkills = Array.isArray(workerSkillsResult.data)
    ? (workerSkillsResult.data as AnyRow[])
    : [];

  const companyServicesMap = buildRelatedTextMap(companyServices, 'company_id');
  const companyFeaturesMap = buildRelatedTextMap(companyFeatures, 'company_id');
  const companyProjectsMap = buildRelatedTextMap(companyProjects, 'company_id');
  const workerServicesMap = buildRelatedTextMap(workerServices, 'worker_id');
  const workerSkillsMap = buildRelatedTextMap(workerSkills, 'worker_id');

  const companies: ServiceProvider[] = companyRows
    .map((company) => {
      const id = readText(company, ['id']);

      if (!id) {
        return null;
      }

      const status = readText(company, ['status', 'availability']);

      const searchText = [
        readText(company, ['name']),
        readText(company, ['category']),
        readText(company, ['description']),
        readText(company, ['city']),
        readText(company, ['address']),
        status,
        ...(companyServicesMap.get(id) ?? []),
        ...(companyFeaturesMap.get(id) ?? []),
        ...(companyProjectsMap.get(id) ?? []),
      ]
        .filter(Boolean)
        .join(' ');

      return {
        id,
        kind: 'company' as const,
        name: readText(company, ['name', 'company_name', 'title']) || 'Company',
        slug: readText(company, ['slug']),
        city: readText(company, ['city', 'address']),
        image: readText(company, ['logo', 'cover']),
        status,
        rating: readNumber(company, ['rating']),
        reviewsCount: readNumber(company, ['reviews_count']),
        searchText,
      };
    })
    .filter(Boolean) as ServiceProvider[];

  const workers: ServiceProvider[] = workerRows
    .map((worker) => {
      const id = readText(worker, ['id']);

      if (!id) {
        return null;
      }

      const status = readText(worker, ['status', 'availability']);

      const searchText = [
        readText(worker, ['name']),
        readText(worker, ['full_name']),
        readText(worker, ['display_name']),
        readText(worker, ['profession']),
        readText(worker, ['category']),
        readText(worker, ['description']),
        readText(worker, ['bio']),
        readText(worker, ['city']),
        readText(worker, ['address']),
        status,
        ...(workerServicesMap.get(id) ?? []),
        ...(workerSkillsMap.get(id) ?? []),
      ]
        .filter(Boolean)
        .join(' ');

      return {
        id,
        kind: 'worker' as const,
        name:
          readText(worker, ['name', 'full_name', 'display_name']) ||
          readText(worker, ['profession']) ||
          'Worker',
        slug: readText(worker, ['slug']),
        city: readText(worker, ['city', 'address']),
        image: readText(worker, ['avatar', 'profile_image', 'image', 'photo', 'picture', 'logo', 'cover']),
        status,
        rating: readNumber(worker, ['rating']),
        reviewsCount: readNumber(worker, ['reviews_count']),
        searchText,
      };
    })
    .filter(Boolean) as ServiceProvider[];

  return {
    providers: [...companies, ...workers],
    warning: warnings.length ? 'Some service data could not be loaded.' : '',
  };
}