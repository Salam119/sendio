'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import CompanyAdMediaPreview from '@/components/CompanyAdMediaPreview';
import TrackedCompanyAdLink from '@/components/TrackedCompanyAdLink';

type ServiceCategoryRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  image_url: string | null;
  parent_id: string | null;
  is_popular: boolean | null;
  is_active: boolean | null;
  sort_order: number | null;
};

type RawCompanyRow = {
  id: string;
  name: string | null;
  slug: string | null;
  description: string | null;
  logo: string | null;
  city: string | null;
  category: string | null;
  rating: number | null;
  phone: string | null;
};

type RawWorkerRow = {
  id: string;
  name: string | null;
  slug: string | null;
  description: string | null;
  avatar: string | null;
  city: string | null;
  rating: number | null;
  phone: string | null;
};

type CompanyCategoryLink = {
  company_id: string | null;
  service_category_id: string | null;
};

type WorkerCategoryLink = {
  worker_id: string | null;
  service_category_id: string | null;
};

type FeaturedProvider = {
  id: string;
  kind: 'company' | 'worker';
  name: string;
  slug: string;
  description: string;
  image: string | null;
  city: string;
  specialty: string;
  rating: number | null;
  phone: string | null;
  serviceCategoryIds: string[];
  serviceSlugs: string[];
  serviceNames: string[];
  primaryServiceSlug: string;
  searchText: string;
};

type ServicesAdCompany = {
  id: string;
  name: string | null;
  slug: string | null;
  logo: string | null;
  city: string | null;
};

type RawServicesPageAd = {
  id: string;
  company_id: string | null;
  title: string | null;
  description: string | null;
  image_url: string | null;
  video_url: string | null;
  thumbnail_url: string | null;
  logo: string | null;
  media_type: string | null;
  cta_text: string | null;
  target_url: string | null;
  active: boolean | null;
  status: string | null;
  starts_at: string | null;
  ends_at: string | null;
  show_services_page: boolean | null;
  services_slider_level: number | null;
  company:
    | ServicesAdCompany
    | ServicesAdCompany[]
    | null;
};

type ServicesPageAd = Omit<
  RawServicesPageAd,
  'company'
> & {
  company: ServicesAdCompany | null;
};

type EmptyServicesAdSlot = {
  id: string;
  placeholder: true;
};

type ServicesAdCardItem =
  | ServicesPageAd
  | EmptyServicesAdSlot;

type ServicesAdLayer = {
  key: string;
  level: 1 | 2 | 3 | 4;
  title: string;
  direction: 'left' | 'right';
  items: ServicesAdCardItem[];
};

type ServicesAdLayerSettingRow = {
  level: 1 | 2 | 3 | 4;
  enabled: boolean;
};

type ServicesAdSlotRow = {
  level: 1 | 2 | 3 | 4;
  slot_index: number;
  ad_id: string | null;
  is_enabled: boolean;
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

const FALLBACK_SERVICE_ICONS = [
  '🧰',
  '🔧',
  '🏠',
  '🧹',
  '🚚',
  '💡',
  '🌿',
  '🎨',
  '🛠️',
  '🧽',
  '📦',
  '🔌',
];

function getFallbackIcon(serviceName: string) {
  const total = serviceName.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return FALLBACK_SERVICE_ICONS[total % FALLBACK_SERVICE_ICONS.length];
}

function getServiceIcon(service: ServiceCategoryRow) {
  const icon = service.icon?.trim().toLowerCase();

  if (!icon) {
    return getFallbackIcon(service.name);
  }

  return SERVICE_ICON_MAP[icon] ?? getFallbackIcon(service.name);
}

function normalizeText(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? '';
}


function shortDescription(value: string) {
  const words = value.split(/\s+/).filter(Boolean).slice(0, 9);
  return words.length > 0 ? words.join(' ') : 'Service details available on profile';
}

function normalizeServicesPageAd(
  ad: RawServicesPageAd
): ServicesPageAd {
  const company = Array.isArray(ad.company)
    ? ad.company[0] ?? null
    : ad.company;

  return {
    ...ad,
    services_slider_level: Number(
      ad.services_slider_level ?? 0
    ),
    company,
  };
}

function isServicesPageAdActive(ad: ServicesPageAd) {
  if (ad.active !== true) {
    return false;
  }

  if (ad.status !== 'active') {
    return false;
  }

  const now = new Date();

  if (ad.starts_at) {
    const startsAt = new Date(ad.starts_at);

    if (
      !Number.isNaN(startsAt.getTime()) &&
      startsAt > now
    ) {
      return false;
    }
  }

  if (ad.ends_at) {
    const endsAt = new Date(ad.ends_at);

    if (
      !Number.isNaN(endsAt.getTime()) &&
      endsAt < now
    ) {
      return false;
    }
  }

  return true;
}

function getServicesAdMedia(ad: ServicesPageAd) {
  return (
    ad.video_url ||
    ad.image_url ||
    ad.thumbnail_url ||
    ad.logo ||
    ad.company?.logo ||
    null
  );
}

function isServicesVideoAd(ad: ServicesPageAd) {
  return (
    Boolean(ad.video_url) ||
    ad.media_type === 'video'
  );
}

function getServicesAdCompanyHref(
  ad: ServicesPageAd
) {
  const companySlug =
    ad.company?.slug || ad.company?.id;

  return companySlug
    ? `/companies/${companySlug}`
    : '/companies';
}

function isEmptyServicesAd(
  item: ServicesAdCardItem
): item is EmptyServicesAdSlot {
  return 'placeholder' in item;
}

function buildServicesAdLayers(
  ads: ServicesPageAd[],
  layerSettings: ServicesAdLayerSettingRow[],
  slots: ServicesAdSlotRow[]
): ServicesAdLayer[] {
  const adById = new Map(ads.map((ad) => [ad.id, ad]));
  const enabledLevels = new Set(
    layerSettings
      .filter((layer) => layer.enabled === true)
      .map((layer) => layer.level)
  );

  const layerDefinitions: Array<{
    level: 1 | 2 | 3 | 4;
    key: string;
    title: string;
    direction: 'left' | 'right';
  }> = [
    {
      level: 1,
      key: 'services-ad-level-1',
      title: 'Services advertisements — Level 1',
      direction: 'left',
    },
    {
      level: 2,
      key: 'services-ad-level-2',
      title: 'Services advertisements — Level 2',
      direction: 'right',
    },
    {
      level: 3,
      key: 'services-ad-level-3',
      title: 'Services advertisements — Level 3',
      direction: 'left',
    },
    {
      level: 4,
      key: 'services-ad-level-4',
      title: 'Services advertisements — Level 4',
      direction: 'right',
    },
  ];

  return layerDefinitions
    .filter((layer) => enabledLevels.has(layer.level))
    .map((layer) => {
      const layerSlots = slots
        .filter((slot) => slot.level === layer.level)
        .sort((a, b) => a.slot_index - b.slot_index);

      const items: ServicesAdCardItem[] = layerSlots.map((slot) => {
        if (slot.is_enabled !== true || !slot.ad_id) {
          return {
            id: `${layer.key}-empty-${slot.slot_index}`,
            placeholder: true,
          };
        }

        return (
          adById.get(slot.ad_id) ?? {
            id: `${layer.key}-inactive-${slot.slot_index}`,
            placeholder: true,
          }
        );
      });

      return {
        ...layer,
        items,
      };
    });
}

export default function ServicesPage() {
  const router = useRouter();
  const heroSearchRef = useRef<HTMLFormElement | null>(null);

  const [services, setServices] = useState<ServiceCategoryRow[]>([]);
  const [providers, setProviders] = useState<FeaturedProvider[]>([]);
  const [serviceAds, setServiceAds] = useState<ServicesPageAd[]>([]);
  const [serviceAdLayerSettings, setServiceAdLayerSettings] =
    useState<ServicesAdLayerSettingRow[]>([]);
  const [serviceAdSlots, setServiceAdSlots] = useState<ServicesAdSlotRow[]>([]);
  const [loadingServices, setLoadingServices] = useState(true);
  const [warning, setWarning] = useState('');
  const [searchText, setSearchText] = useState('');
  const [locationText, setLocationText] = useState('');
  const [allServicesOpen, setAllServicesOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [subscriberEmail, setSubscriberEmail] = useState('');
  const [subscriberLocation, setSubscriberLocation] = useState('');
  const [subscribeStatus, setSubscribeStatus] = useState('');
  const [isUserLoggedIn, setIsUserLoggedIn] = useState(false);
  useEffect(() => {
    let active = true;

    async function loadServicesPageAds() {
      const [adsResult, layersResult, slotsResult] = await Promise.all([
        supabase
          .from('company_ads')
          .select(`
            id,
            company_id,
            title,
            description,
            image_url,
            video_url,
            thumbnail_url,
            logo,
            media_type,
            cta_text,
            target_url,
            active,
            status,
            starts_at,
            ends_at,
            show_services_page,
            services_slider_level,
            company:companies (
              id,
              name,
              slug,
              logo,
              city
            )
          `)
          .eq('active', true)
          .eq('status', 'active')
          .order('created_at', { ascending: false }),
        supabase
          .from('services_ad_layers')
          .select('level, enabled')
          .order('level', { ascending: true }),
        supabase
          .from('services_ad_slots')
          .select('level, slot_index, ad_id, is_enabled')
          .order('level', { ascending: true })
          .order('slot_index', { ascending: true }),
      ]);

      if (!active) {
        return;
      }

      if (adsResult.error || layersResult.error || slotsResult.error) {
        setServiceAds([]);
        setServiceAdLayerSettings([]);
        setServiceAdSlots([]);
        setWarning('Service advertisements could not be loaded.');
        return;
      }

      const normalizedAds = (
        (adsResult.data ?? []) as RawServicesPageAd[]
      )
        .map(normalizeServicesPageAd)
        .filter(isServicesPageAdActive);

      setServiceAds(normalizedAds);
      setServiceAdLayerSettings(
        (layersResult.data ?? []) as ServicesAdLayerSettingRow[]
      );
      setServiceAdSlots(
        (slotsResult.data ?? []) as ServicesAdSlotRow[]
      );
    }

    void loadServicesPageAds();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    async function loadServices() {
      setLoadingServices(true);
      setWarning('');

      const { data, error } = await supabase
        .from('service_categories')
        .select(
          'id, name, slug, description, icon, image_url, parent_id, is_popular, is_active, sort_order'
        )
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true });

      if (!active) {
        return;
      }

      if (error) {
        setServices([]);
        setWarning('Services could not be loaded right now. Please try again later.');
        setLoadingServices(false);
        return;
      }

      setServices(data ?? []);
      setLoadingServices(false);
    }

    loadServices();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    async function loadAuthState() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!active) {
        return;
      }

      setIsUserLoggedIn(Boolean(user));
    }

    loadAuthState();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setIsUserLoggedIn(Boolean(session?.user));
      }
    );

    return () => {
      active = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let active = true;

    async function loadProviders() {
      if (services.length === 0) {
        setProviders([]);
        return;
      }

      const [companyLinksResult, workerLinksResult] = await Promise.all([
        supabase
          .from('company_service_categories')
          .select('company_id, service_category_id'),
        supabase
          .from('worker_service_categories')
          .select('worker_id, service_category_id'),
      ]);

      if (!active) {
        return;
      }

      if (companyLinksResult.error || workerLinksResult.error) {
        setProviders([]);
        setWarning(
          companyLinksResult.error?.message ||
            workerLinksResult.error?.message ||
            'Linked providers could not be loaded.'
        );
        return;
      }

      const companyLinks = (companyLinksResult.data ?? []) as CompanyCategoryLink[];
      const workerLinks = (workerLinksResult.data ?? []) as WorkerCategoryLink[];
      const serviceById = new Map(services.map((service) => [service.id, service]));
      const companyCategoryMap = new Map<string, Set<string>>();
      const workerCategoryMap = new Map<string, Set<string>>();

      companyLinks.forEach((link) => {
        if (!link.company_id || !link.service_category_id || !serviceById.has(link.service_category_id)) {
          return;
        }

        const current = companyCategoryMap.get(link.company_id) ?? new Set<string>();
        current.add(link.service_category_id);
        companyCategoryMap.set(link.company_id, current);
      });

      workerLinks.forEach((link) => {
        if (!link.worker_id || !link.service_category_id || !serviceById.has(link.service_category_id)) {
          return;
        }

        const current = workerCategoryMap.get(link.worker_id) ?? new Set<string>();
        current.add(link.service_category_id);
        workerCategoryMap.set(link.worker_id, current);
      });

      const companyIds = Array.from(companyCategoryMap.keys());
      const workerIds = Array.from(workerCategoryMap.keys());

      const [companiesResult, workersResult] = await Promise.all([
        companyIds.length > 0
          ? supabase
              .from('companies')
              .select('id, name, slug, description, logo, city, rating, phone')
              .in('id', companyIds)
          : Promise.resolve({ data: [], error: null }),
        workerIds.length > 0
          ? supabase
              .from('workers')
              .select('id, name, slug, description, avatar, city, rating, phone')
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

      const companyProviders: FeaturedProvider[] = ((companiesResult.data ?? []) as RawCompanyRow[])
        .flatMap((company): FeaturedProvider[] => {
          const serviceCategoryIds = Array.from(companyCategoryMap.get(company.id) ?? []);
          const linkedServices = serviceCategoryIds
            .map((categoryId) => serviceById.get(categoryId))
            .filter((service): service is ServiceCategoryRow => Boolean(service));

          if (linkedServices.length === 0) {
            return [];
          }

          const serviceNames = linkedServices.map((service) => service.name);
          const serviceSlugs = linkedServices.map((service) => service.slug);

          return [{
            id: company.id,
            kind: 'company' as const,
            name: company.name || 'Company',
            slug: company.slug || company.id,
            description: company.description || 'Open this provider profile on Sendio.',
            image: company.logo,
            city: company.city || '',
            specialty: serviceNames[0] || 'Company service',
            rating: company.rating,
            phone: company.phone,
            serviceCategoryIds,
            serviceSlugs,
            serviceNames,
            primaryServiceSlug: serviceSlugs[0],
            searchText: `${company.name ?? ''} ${company.description ?? ''} ${serviceNames.join(' ')}`.toLowerCase(),
          }];
        });

      const workerProviders: FeaturedProvider[] = ((workersResult.data ?? []) as RawWorkerRow[])
        .flatMap((worker): FeaturedProvider[] => {
          const serviceCategoryIds = Array.from(workerCategoryMap.get(worker.id) ?? []);
          const linkedServices = serviceCategoryIds
            .map((categoryId) => serviceById.get(categoryId))
            .filter((service): service is ServiceCategoryRow => Boolean(service));

          if (linkedServices.length === 0) {
            return [];
          }

          const serviceNames = linkedServices.map((service) => service.name);
          const serviceSlugs = linkedServices.map((service) => service.slug);

          return [{
            id: worker.id,
            kind: 'worker' as const,
            name: worker.name || 'Worker',
            slug: worker.slug || worker.id,
            description: worker.description || 'Open this worker profile on Sendio.',
            image: worker.avatar,
            city: worker.city || '',
            specialty: serviceNames[0] || 'Worker service',
            rating: worker.rating,
            phone: worker.phone,
            serviceCategoryIds,
            serviceSlugs,
            serviceNames,
            primaryServiceSlug: serviceSlugs[0],
            searchText: `${worker.name ?? ''} ${worker.description ?? ''} ${serviceNames.join(' ')}`.toLowerCase(),
          }];
        });

      setProviders([...companyProviders, ...workerProviders]);
    }

    loadProviders();

    return () => {
      active = false;
    };
  }, [services]);

  const normalizedSearch = normalizeText(searchText);

  const visibleServices = services.filter((service) => {
    if (!normalizedSearch) {
      return true;
    }

    return (
      service.name.toLowerCase().includes(normalizedSearch) ||
      normalizeText(service.description).includes(normalizedSearch)
    );
  });

  const trendingServices = visibleServices.slice(0, 8);


  const serviceAdLayers = buildServicesAdLayers(
    serviceAds,
    serviceAdLayerSettings,
    serviceAdSlots
  );
  const cvImages = providers.filter((provider) => provider.image).slice(0, 3);
  const serviceMarqueeItems = services.length > 0 ? services : visibleServices;


  function getServiceHref(service: ServiceCategoryRow) {
    const params = new URLSearchParams();

    if (locationText.trim()) {
      params.set('city', locationText.trim());
    }

    const query = params.toString();
    return query ? `/services/${service.slug}?${query}` : `/services/${service.slug}`;
  }

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const searchValue = normalizeText(searchText);

    if (!searchValue) {
      setAllServicesOpen(true);
      return;
    }

    const exactService = services.find(
      (service) => normalizeText(service.name) === searchValue
    );

    const partialService =
      exactService ??
      services.find((service) => normalizeText(service.name).includes(searchValue));

    if (partialService) {
      const params = new URLSearchParams();

      if (locationText.trim()) {
        params.set('city', locationText.trim());
      }

      const queryString = params.toString();

      router.push(
        queryString
          ? `/services/${partialService.slug}?${queryString}`
          : `/services/${partialService.slug}`
      );
      return;
    }

    setAllServicesOpen(true);
    setWarning('No exact service found. Please choose one from the list below.');
  }

  function handleSubscribe(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setSubscribeStatus('');

    if (!subscriberEmail.trim() || !subscriberEmail.includes('@')) {
      setSubscribeStatus('Please enter a valid email address.');
      return;
    }

    if (!subscriberLocation.trim()) {
      setSubscribeStatus('Please enter your city or postal code.');
      return;
    }

    localStorage.setItem(
      'sendio-service-subscribe',
      JSON.stringify({
        email: subscriberEmail.trim(),
        location: subscriberLocation.trim(),
        createdAt: new Date().toISOString(),
      })
    );

    setSubscribeStatus('Subscribed successfully. Email alerts will be activated soon.');
    setSubscriberEmail('');
    setSubscriberLocation('');
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/login');
  }

  return (
    <main className="sendio-page servicesPage">
      <header className="topBar">
        <Link href="/" className="sendioLogo">
          Sendio
        </Link>

        <div className="topActions">
          <Link href="/register" className="joinLink">
            Join as Provider
          </Link>

          <button
            type="button"
            className="topIconButton"
            aria-label="Search"
            onClick={() =>
              heroSearchRef.current?.scrollIntoView({
                behavior: 'smooth',
                block: 'center',
              })
            }
          >
            ⌕
          </button>

          <button
            type="button"
            className="topIconButton"
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
              <Link href="/" className="sendioLogo" onClick={() => setMenuOpen(false)}>
                Sendio
              </Link>

              <button type="button" className="menuClose" onClick={() => setMenuOpen(false)}>
                ×
              </button>
            </div>

            <nav className="menuLinks">
              <Link href="/services" onClick={() => setMenuOpen(false)}>
                Find Services
              </Link>
              <Link href="/register" onClick={() => setMenuOpen(false)}>
                Join as Provider
              </Link>
              <Link href="/contact" onClick={() => setMenuOpen(false)}>
                Contact
              </Link>
              <Link href="/legal" onClick={() => setMenuOpen(false)}>
                Legal
              </Link>
            </nav>

            {isUserLoggedIn ? (
              <button type="button" className="logoutButton" onClick={handleLogout}>
                Logout →
              </button>
            ) : (
              <Link
                href="/login"
                className="logoutButton"
                onClick={() => setMenuOpen(false)}
              >
                Sign in →
              </Link>
            )}
          </aside>
        </div>
      ) : null}

      <section className="heroSection">
        <div className="smallPageNav">
          <button type="button" onClick={() => router.back()}>
            Back
          </button>
          <Link href="/">Home</Link>
          <Link href="/contact">Next</Link>
        </div>

        <div className="heroBox">
          <p className="heroTitle">Find trusted providers near you.</p>

          <form ref={heroSearchRef} className="heroSearch" onSubmit={handleSearch}>
            <input
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              placeholder="What service do you need?"
              type="search"
            />

            <input
              value={locationText}
              onChange={(event) => setLocationText(event.target.value)}
              placeholder="City or postal code"
              type="search"
            />

            <button type="submit" aria-label="Search">
              ⌕
            </button>
          </form>
        </div>
      </section>

      <section className="quickServiceStrip" aria-label="All service shortcuts">
        <div className="quickServiceTrack">
          {[...serviceMarqueeItems, ...serviceMarqueeItems].map((service, index) => (
            <Link
              href={getServiceHref(service)}
              className="quickServiceItem"
              key={`${service.id}-${index}`}
            >
              <span>{getServiceIcon(service)}</span>
              <strong>{service.name}</strong>
            </Link>
          ))}
        </div>
      </section>

      <section className="cvBox">
        <div className="cvText">
          <span>FOR SKILLED WORKERS</span>
          <p>Upload your CV and optional recommendation letters to join Sendio as a worker.</p>
       
        </div>
<Link href="/upload-cv" className="cvUploadButton">
          Upload CV
        </Link>
        {cvImages.length > 0 ? (
          <div className="cvFaces" aria-label="Provider photos">
            {cvImages.map((provider) => (
              <span
                key={`${provider.kind}-${provider.id}`}
                style={
                  provider.image
                    ? {
                        backgroundImage: `url("${provider.image}")`,
                      }
                    : undefined
                }
              />
            ))}
          </div>
        ) : null}
      </section>

      <section className="collapsedServices">
        <button
          type="button"
          className="collapseButton"
          onClick={() => setAllServicesOpen((current) => !current)}
        >
          <span>{loadingServices ? 'Loading services' : 'All services'}</span>
          <strong>{allServicesOpen ? '⌃' : '⌄'}</strong>
        </button>

        {allServicesOpen ? (
          <div className="serviceList">
            {visibleServices.map((service) => (
              <Link href={getServiceHref(service)} className="serviceLine" key={service.id}>
                <span>{getServiceIcon(service)}</span>
                <strong>{service.name}</strong>
              </Link>
            ))}
          </div>
        ) : null}
      </section>

      {trendingServices.length > 0 ? (
        <section className="trendingServices">
          <h2>Trending services</h2>

          <div className="trendingGrid">
            {trendingServices.map((service) => (
              <Link href={getServiceHref(service)} className="trendingLine" key={service.id}>
                <span>{getServiceIcon(service)}</span>
                <strong>{service.name}</strong>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section className="subscribeBox">
        <p>Subscribe to receive free project cost information by email.</p>

        <form className="subscribeForm" onSubmit={handleSubscribe}>
          <input
            type="email"
            placeholder="Email address"
            value={subscriberEmail}
            onChange={(event) => setSubscriberEmail(event.target.value)}
          />

          <input
            type="text"
            placeholder="City or postal code"
            value={subscriberLocation}
            onChange={(event) => setSubscriberLocation(event.target.value)}
          />

          <button type="submit">Subscribe</button>
        </form>

        {subscribeStatus ? <span className="subscribeStatus">{subscribeStatus}</span> : null}
      </section>

      {warning ? <p className="warningBox">{warning}</p> : null}

      {serviceAdLayers.length > 0 ? (
        <section
          className="providerLayers"
          aria-label="Services advertisements"
        >
          {serviceAdLayers.map((layer) => (
            <div className="providerLayer" key={layer.key}>
              <h2>{layer.title}</h2>

              <div className="providerAutoSlider">
                <div
                  className={
                    layer.direction === 'left'
                      ? 'providerTrack providerTrackLeft'
                      : 'providerTrack providerTrackRight'
                  }
                >
                  {[...layer.items, ...layer.items].map(
                    (item, index) => {
                      if (isEmptyServicesAd(item)) {
                        return (
                          <article
                            className="floatingProviderCard emptyProviderCard"
                            key={`${item.id}-${index}`}
                          >
                            <div className="floatingProviderImage emptyProviderImage" />

                            <div className="floatingProviderInfo">
                              <span className="emptyLine emptyWide" />
                              <span className="emptyLine emptyShort" />
                              <span className="emptyLine emptyMedium" />
                            </div>
                          </article>
                        );
                      }

                      const media = getServicesAdMedia(item);
                      const videoAd = isServicesVideoAd(item);
                      const adTitle =
                        item.title?.trim() ||
                        item.company?.name ||
                        'Advertisement';
                      const adDescription =
                        item.description?.trim() ||
                        'Open this company profile on Sendio.';

                      return (
                        <article
                          className="floatingProviderCard serviceAdCard"
                          key={`${layer.key}-${item.id}-${index}`}
                        >
                          <CompanyAdMediaPreview
                            adId={item.id}
                            mediaUrl={media}
                            isVideo={videoAd}
                            alt={`${adTitle} advertisement`}
                            fallbackLetter={adTitle
                              .charAt(0)
                              .toUpperCase()}
                          />

                          <div className="floatingProviderInfo">
                            <TrackedCompanyAdLink
                              adId={item.id}
                              href={getServicesAdCompanyHref(item)}
                              className="providerNameLink"
                            >
                              {adTitle}
                            </TrackedCompanyAdLink>

                            <span className="providerStars">
                              Advertisement • Level {layer.level}
                            </span>

                            <p>{shortDescription(adDescription)}</p>
                          </div>
                        </article>
                      );
                    }
                  )}
                </div>
              </div>
            </div>
          ))}
        </section>
      ) : null}

      <footer className="servicesFooter">
        <strong>Sendio</strong>

        <nav>
          <Link href="/legal">Terms</Link>
          <Link href="/legal">Privacy</Link>
          <Link href="/legal">Legal</Link>
          <Link href="/contact">Contact</Link>
        </nav>

        <p>© 2026 Sendio. All rights reserved.</p>
      </footer>

      <style>{`
        .servicesPage {
          min-height: 100vh;
          background: var(--sendio-page-bg);
          color: var(--sendio-text);
          overflow-x: hidden;
        }

        .topBar {
          height: 58px;
          padding: 0 18px;
          background: var(--sendio-card-bg);
          border-bottom: 1px solid var(--sendio-border);
          display: flex;
          align-items: center;
          justify-content: space-between;
          position: sticky;
          top: 0;
          z-index: 40;
        }

        .sendioLogo {
          color: var(--sendio-button-bg);
          font-size: 24px;
          font-weight: 950;
          text-decoration: none;
          letter-spacing: -0.05em;
        }

        .topActions {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .joinLink {
          color: var(--sendio-text);
          text-decoration: none;
          font-size: 14px;
          font-weight: 850;
        }

        .topIconButton {
          border: 0;
          background: transparent;
          color: var(--sendio-text);
          font-size: 24px;
          font-weight: 950;
          line-height: 1;
          cursor: pointer;
        }

        .menuLayer {
          position: fixed;
          inset: 0;
          z-index: 100;
        }

        .menuShade {
          position: absolute;
          inset: 0;
          border: 0;
          background: rgba(17, 24, 39, 0.34);
        }

        .sideMenu {
          position: relative;
          z-index: 2;
          width: min(292px, 74vw);
          min-height: 100vh;
          background: var(--sendio-card-bg);
          padding: 18px;
          box-shadow: 12px 0 40px rgba(17, 24, 39, 0.14);
          display: grid;
          grid-template-rows: auto 1fr auto;
        }

        .menuHead {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-bottom: 14px;
          border-bottom: 1px solid var(--sendio-border);
        }

        .menuClose {
          border: 0;
          background: transparent;
          color: var(--sendio-text);
          font-size: 28px;
          cursor: pointer;
        }

        .menuLinks {
          display: grid;
          align-content: start;
          padding-top: 14px;
        }

        .menuLinks a {
          color: var(--sendio-text);
          text-decoration: none;
          padding: 15px 4px;
          border-bottom: 1px solid var(--sendio-border);
          font-size: 14px;
          font-weight: 750;
        }

        .logoutButton {
          min-height: 42px;
          border: 0;
          border-radius: 7px;
          background: var(--sendio-button-bg);
          color: var(--sendio-text);
          font-size: 13px;
          font-weight: 900;
          cursor: pointer;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }

        .heroSection {
          min-height: 310px;
          padding: 16px 6% 26px;
          background:
            linear-gradient(90deg, rgba(17, 24, 39, 0.55), rgba(17, 24, 39, 0.12)),
            var(--sendio-hero-bg);
          display: grid;
          align-content: center;
          gap: 24px;
        }

        .smallPageNav {
          width: fit-content;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 5px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.9);
        }

        .smallPageNav a,
        .smallPageNav button {
          border: 0;
          background: transparent;
          color: var(--sendio-text);
          text-decoration: none;
          font-size: 12px;
          font-weight: 850;
          padding: 7px 10px;
          border-radius: 999px;
          cursor: pointer;
        }

        .heroBox {
          width: min(720px, 100%);
          min-height: 142px;
          border-radius: 10px;
          background: rgba(17, 24, 39, 0.34);
          padding: 24px;
          display: grid;
          align-content: center;
          gap: 18px;
        }

        .heroTitle {
          margin: 0;
          color: #ffffff;
          font-size: clamp(24px, 5vw, 42px);
          line-height: 1.08;
          font-weight: 950;
          letter-spacing: -0.04em;
        }

        .heroSearch {
          min-height: 50px;
          background: #ffffff;
          border-radius: 999px;
          display: grid;
          grid-template-columns: 1fr 1fr 48px;
          overflow: hidden;
        }

        .heroSearch input {
          border: 0;
          outline: none;
          color: var(--sendio-text);
          font-size: 13px;
          padding: 0 17px;
          min-width: 0;
        }

        .heroSearch input + input {
          border-left: 1px solid var(--sendio-border);
        }

        .heroSearch button {
          border: 0;
          background: var(--sendio-button-bg);
          color: var(--sendio-text);
          font-size: 18px;
          font-weight: 950;
          cursor: pointer;
        }

        .quickServiceStrip {
          overflow: hidden;
          background: var(--sendio-card-bg);
          border-bottom: 1px solid var(--sendio-border);
          padding: 22px 0 20px;
        }

        .quickServiceTrack {
          width: max-content;
          display: flex;
          gap: 34px;
          animation: sendioServicesMarquee 70s linear infinite;
        }

        .quickServiceStrip:hover .quickServiceTrack {
          animation-play-state: paused;
        }

        .quickServiceItem {
          flex: 0 0 76px;
          color: var(--sendio-text);
          text-decoration: none;
          display: grid;
          justify-items: center;
          gap: 7px;
          text-align: center;
        }

        .quickServiceItem span {
          color: var(--sendio-button-bg);
          font-size: 31px;
          line-height: 1;
        }

        .quickServiceItem strong {
          font-size: 11px;
          line-height: 1.15;
          font-weight: 700;
        }

        @keyframes sendioServicesMarquee {
          from {
            transform: translateX(0);
          }
          to {
            transform: translateX(-50%);
          }
        }

        .cvBox {
          margin: 22px 6% 26px;
          min-height: 126px;
          border-radius: 8px;
          background: var(--sendio-rectangle-bg);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          padding: 22px;
        }

        .cvText span {
          display: inline-block;
          margin-bottom: 12px;
          padding: 6px 10px;
          border-radius: 3px;
          background: var(--sendio-button-hover);
          color: var(--sendio-text);
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 0.08em;
        }

        .cvText p {
          margin: 0 0 16px;
          color: var(--sendio-text);
          font-size: 14px;
          line-height: 1.45;
          font-weight: 700;
        }

        .cvUploadButton {
          min-width: 108px;
          min-height: 30px;
          border-radius: 999px;
          background: var(--sendio-button-bg);
          color: var(--sendio-text);
          border: 1px solid var(--sendio-border);
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 7px 13px;
          font-size: 11px;
          font-weight: 900;
          box-shadow: 0 8px 18px rgba(17, 24, 39, 0.08);
          transition:
            background 0.18s ease,
            transform 0.18s ease,
            border-color 0.18s ease;
        }

        .cvUploadButton:hover {
          background: var(--sendio-button-hover);
          transform: translateY(-1px);
        }

        .cvFaces {
          min-width: 142px;
          display: flex;
          justify-content: flex-end;
          align-items: center;
        }

        .cvFaces span {
          width: 58px;
          height: 58px;
          border-radius: 50%;
          border: 4px solid var(--sendio-card-bg);
          background-color: var(--sendio-card-bg);
          background-size: cover;
          background-position: center;
          margin-left: -18px;
          box-shadow: 0 8px 18px rgba(17, 24, 39, 0.12);
        }

        .collapsedServices {
          margin: 22px 6%;
          border-top: 1px solid var(--sendio-border);
          border-bottom: 1px solid var(--sendio-border);
          background: var(--sendio-card-bg);
        }

        .collapseButton {
          width: 100%;
          min-height: 50px;
          border: 0;
          background: transparent;
          color: var(--sendio-text);
          display: flex;
          align-items: center;
          justify-content: space-between;
          cursor: pointer;
          padding: 0 4px;
        }

        .collapseButton span {
          font-size: 15px;
          font-weight: 850;
        }

        .collapseButton strong {
          font-size: 18px;
        }

        .serviceList {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 0 28px;
          padding: 4px 0 18px;
        }

        .serviceLine {
          min-height: 38px;
          color: var(--sendio-text);
          text-decoration: none;
          border-bottom: 1px solid var(--sendio-border);
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .serviceLine span {
          width: 22px;
          display: inline-flex;
          justify-content: center;
          color: var(--sendio-button-bg);
          font-size: 16px;
        }

        .serviceLine strong {
          font-size: 13px;
          line-height: 1.25;
          font-weight: 700;
        }

        .trendingServices {
          margin: 30px 6% 24px;
        }

        .trendingServices h2 {
          margin: 0 0 14px;
          color: var(--sendio-text);
          font-size: 17px;
          line-height: 1.2;
          font-weight: 850;
        }

        .trendingGrid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 8px 14px;
        }

        .trendingLine {
          min-height: 46px;
          border: 1px solid var(--sendio-border);
          background: var(--sendio-card-bg);
          color: var(--sendio-text);
          text-decoration: none;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 10px;
        }

        .trendingLine span {
          width: 26px;
          display: inline-flex;
          justify-content: center;
          color: var(--sendio-button-bg);
          font-size: 19px;
        }

        .trendingLine strong {
          font-size: 12px;
          line-height: 1.2;
          font-weight: 700;
        }

        .subscribeBox {
          margin: 30px 6%;
          border-radius: 8px;
          background: var(--sendio-rectangle-bg);
          padding: 22px;
        }

        .subscribeBox p {
          margin: 0 0 16px;
          color: var(--sendio-text);
          font-size: 14px;
          line-height: 1.45;
          font-weight: 800;
        }

        .subscribeForm {
          display: grid;
          grid-template-columns: 1fr 1fr 140px;
          gap: 10px;
        }

        .subscribeForm input {
          min-height: 42px;
          border: 1px solid var(--sendio-border);
          background: var(--sendio-card-bg);
          color: var(--sendio-text);
          padding: 0 13px;
          font-size: 13px;
          outline: none;
        }

        .subscribeForm button {
          min-height: 42px;
          border: 0;
          background: var(--sendio-button-bg);
          color: var(--sendio-text);
          font-size: 13px;
          font-weight: 900;
          cursor: pointer;
        }

        .subscribeStatus {
          display: block;
          margin-top: 10px;
          color: var(--sendio-muted);
          font-size: 12px;
          font-weight: 800;
        }

        .warningBox {
          margin: 0 6% 20px;
          padding: 14px;
          border: 1px solid var(--sendio-border);
          background: var(--sendio-card-bg);
          color: var(--sendio-muted);
          font-size: 13px;
          font-weight: 800;
        }

        .providerLayers {
          display: grid;
          gap: 34px;
          margin: 34px 0 46px;
        }

        .providerLayer {
          overflow: hidden;
        }

        .providerLayer h2 {
          margin: 0 6% 13px;
          color: var(--sendio-text);
          font-size: 17px;
          line-height: 1.2;
          font-weight: 850;
        }

        .providerAutoSlider {
          overflow: hidden;
          padding: 0 0 8px;
        }

        .providerTrack {
          width: max-content;
          display: flex;
          gap: 18px;
          padding: 0 18px;
        }

        .providerTrackLeft {
          animation: providerMoveLeft 58s linear infinite;
        }

        .providerTrackRight {
          animation: providerMoveRight 58s linear infinite;
        }

        .providerAutoSlider:hover .providerTrack {
          animation-play-state: paused;
        }

        @keyframes providerMoveLeft {
          from {
            transform: translateX(0);
          }
          to {
            transform: translateX(-50%);
          }
        }

        @keyframes providerMoveRight {
          from {
            transform: translateX(-50%);
          }
          to {
            transform: translateX(0);
          }
        }

        .floatingProviderCard {
          flex: 0 0 218px;
          color: var(--sendio-text);
        }

        .floatingProviderImage {
          width: 218px;
          height: 128px;
          border-radius: 11px;
          background-color: var(--sendio-rectangle-bg);
          background-size: cover;
          background-position: center;
          color: var(--sendio-button-bg);
          text-decoration: none;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 30px;
          font-weight: 950;
          overflow: hidden;
        }
         .serviceAdCard .ad-media {
  position: relative;
  width: 218px;
  height: 128px;
  border-radius: 11px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--sendio-rectangle-bg);
  color: var(--sendio-button-bg);
  font-size: 30px;
  font-weight: 950;
}

.serviceAdCard .ad-media video,
.serviceAdCard .ad-media img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.serviceAdCard .ad-media span {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
        .floatingProviderInfo {
          width: 218px;
          min-height: 78px;
          margin-top: 7px;
          border: 1px solid var(--sendio-border);
          border-radius: 9px;
          background: var(--sendio-card-bg);
          padding: 8px 9px;
          display: grid;
          gap: 3px;
        }

        .providerNameLink {
          color: var(--sendio-text);
          text-decoration: none;
          font-size: 13px;
          line-height: 1.1;
          font-weight: 900;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .providerStars {
          color: var(--sendio-muted);
          font-size: 10.5px;
          line-height: 1;
          font-weight: 750;
        }

        .floatingProviderInfo p {
          margin: 0;
          color: var(--sendio-muted);
          font-size: 10.5px;
          line-height: 1.22;
          font-weight: 600;
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .providerTinyActions {
          display: inline-flex;
          gap: 5px;
          margin-top: 2px;
        }

        .providerTinyActions a {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: var(--sendio-button-bg);
          color: var(--sendio-text);
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
          font-weight: 950;
        }

        .emptyProviderImage {
          background:
            linear-gradient(135deg, rgba(255, 255, 255, 0.2), rgba(255, 255, 255, 0)),
            var(--sendio-rectangle-bg);
        }

        .emptyLine {
          display: block;
          height: 8px;
          border-radius: 999px;
          background: var(--sendio-rectangle-bg);
        }

        .emptyWide {
          width: 78%;
        }

        .emptyShort {
          width: 42%;
        }

        .emptyMedium {
          width: 60%;
        }

        .servicesFooter {
          background: var(--sendio-card-bg);
          border-top: 1px solid var(--sendio-border);
          padding: 34px 6%;
          text-align: center;
          display: grid;
          justify-items: center;
          gap: 14px;
        }

        .servicesFooter strong {
          color: var(--sendio-button-bg);
          font-size: 30px;
          line-height: 1;
          font-weight: 950;
          letter-spacing: -0.05em;
        }

        .servicesFooter nav {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 14px;
        }

        .servicesFooter a,
        .servicesFooter p {
          color: var(--sendio-muted);
          text-decoration: none;
          font-size: 12px;
          margin: 0;
        }

        @media (max-width: 760px) {
          .topBar {
            height: 52px;
            padding: 0 14px;
          }

          .sendioLogo {
            font-size: 20px;
          }

          .topActions {
            gap: 12px;
          }

          .joinLink {
            font-size: 12px;
          }

          .topIconButton {
            font-size: 21px;
          }

          .sideMenu {
            width: min(246px, 68vw);
            padding: 16px;
          }

          .menuLinks a {
            padding: 13px 2px;
            font-size: 13px;
          }

          .heroSection {
            min-height: 282px;
            padding: 14px 22px 26px;
          }

          .heroBox {
            padding: 18px;
            min-height: 136px;
          }

          .heroSearch {
            grid-template-columns: 1fr 42px;
            border-radius: 28px;
          }

          .heroSearch input {
            min-height: 46px;
            padding: 0 14px;
          }

          .heroSearch input + input {
            grid-column: 1 / -1;
            border-left: 0;
            border-top: 1px solid var(--sendio-border);
          }

          .heroSearch button {
            grid-row: 1;
            grid-column: 2;
          }

          .quickServiceTrack {
            gap: 28px;
            animation-duration: 60s;
          }

          .quickServiceItem {
            flex-basis: 68px;
          }

          .quickServiceItem span {
            font-size: 27px;
          }

          .quickServiceItem strong {
            font-size: 10.5px;
          }

          .cvBox {
            margin: 20px 22px;
            padding: 18px;
            display: grid;
          }

          .cvUploadButton {
            width: fit-content;
          }

          .cvFaces {
            justify-content: flex-start;
          }

          .collapsedServices,
          .trendingServices,
          .subscribeBox {
            margin-left: 22px;
            margin-right: 22px;
          }

          .serviceList,
          .trendingGrid {
            grid-template-columns: 1fr;
          }

          .subscribeForm {
            grid-template-columns: 1fr;
          }

          .providerLayer h2 {
            margin-left: 22px;
            margin-right: 22px;
          }

          .providerTrack {
            gap: 14px;
            padding: 0 14px;
          }

          .floatingProviderCard {
            flex-basis: 176px;
          }

          .floatingProviderImage {
            width: 176px;
            height: 104px;
            border-radius: 10px;
          }
            .serviceAdCard .ad-media {
  width: 176px;
  height: 104px;
  border-radius: 10px;
}
          .floatingProviderInfo {
            width: 176px;
            min-height: 74px;
            padding: 7px 8px;
          }

          .providerNameLink {
            font-size: 12px;
          }

          .floatingProviderInfo p {
            font-size: 10px;
          }
        }
      `}</style>
    </main>
  );
}