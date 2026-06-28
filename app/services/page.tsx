'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

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
  searchText: string;
};

type EmptyProviderSlot = {
  id: string;
  placeholder: true;
};

type ProviderCardItem = FeaturedProvider | EmptyProviderSlot;

type ProviderLayer = {
  key: string;
  title: string;
  direction: 'left' | 'right';
  items: ProviderCardItem[];
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

function getProviderHref(provider: FeaturedProvider) {
  return provider.kind === 'company' ? `/companies/${provider.slug}` : `/workers/${provider.slug}`;
}

function isEmptyProvider(item: ProviderCardItem): item is EmptyProviderSlot {
  return 'placeholder' in item;
}

function fillProviderSlots(items: FeaturedProvider[], key: string) {
  const filled: ProviderCardItem[] = items.slice(0, 14);

  while (filled.length < 10) {
    filled.push({
      id: `${key}-empty-${filled.length}`,
      placeholder: true,
    });
  }

  return filled;
}

function splitProviderLayers(providers: FeaturedProvider[]): ProviderLayer[] {
  return [
    {
      key: 'layer-1',
      title: 'Recommended providers',
      direction: 'left',
      items: fillProviderSlots(providers.slice(0, 14), 'layer-1'),
    },
    {
      key: 'layer-2',
      title: 'Companies on Sendio',
      direction: 'right',
      items: fillProviderSlots(
        providers.filter((provider) => provider.kind === 'company').slice(0, 14),
        'layer-2'
      ),
    },
    {
      key: 'layer-3',
      title: 'Skilled workers',
      direction: 'left',
      items: fillProviderSlots(
        providers.filter((provider) => provider.kind === 'worker').slice(0, 14),
        'layer-3'
      ),
    },
    {
      key: 'layer-4',
      title: 'More providers',
      direction: 'right',
      items: fillProviderSlots(providers.slice(14, 28), 'layer-4'),
    },
  ];
}

function shortDescription(value: string) {
  const words = value.split(/\s+/).filter(Boolean).slice(0, 9);
  return words.length > 0 ? words.join(' ') : 'Service details available on profile';
}

export default function ServicesPage() {
  const router = useRouter();

  const [services, setServices] = useState<ServiceCategoryRow[]>([]);
  const [providers, setProviders] = useState<FeaturedProvider[]>([]);
  const [loadingServices, setLoadingServices] = useState(true);
  const [warning, setWarning] = useState('');
  const [searchText, setSearchText] = useState('');
  const [locationText, setLocationText] = useState('');
  const [allServicesOpen, setAllServicesOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [subscriberEmail, setSubscriberEmail] = useState('');
  const [subscriberLocation, setSubscriberLocation] = useState('');
  const [subscribeStatus, setSubscribeStatus] = useState('');

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

    async function loadProviders() {
      const [
        companiesResult,
        workersResult,
        companyServicesResult,
        workerServicesResult,
      ] = await Promise.all([
        supabase
          .from('companies')
          .select('id, name, slug, description, logo, city, category, rating, phone')
          .limit(100),
        supabase
          .from('workers')
          .select('id, name, slug, description, avatar, city, rating, phone')
          .limit(100),
        supabase.from('company_services').select('company_id, title, description').limit(300),
        supabase.from('worker_services').select('worker_id, title, description').limit(300),
      ]);

      if (!active) {
        return;
      }

      const companyServices = (companyServicesResult.data ?? []) as RawCompanyServiceRow[];
      const workerServices = (workerServicesResult.data ?? []) as RawWorkerServiceRow[];

      const companyServiceMap = new Map<string, RawCompanyServiceRow[]>();
      const workerServiceMap = new Map<string, RawWorkerServiceRow[]>();

      companyServices.forEach((service) => {
        if (!service.company_id) {
          return;
        }

        const current = companyServiceMap.get(service.company_id) ?? [];
        current.push(service);
        companyServiceMap.set(service.company_id, current);
      });

      workerServices.forEach((service) => {
        if (!service.worker_id) {
          return;
        }

        const current = workerServiceMap.get(service.worker_id) ?? [];
        current.push(service);
        workerServiceMap.set(service.worker_id, current);
      });

      const companyProviders = ((companiesResult.data ?? []) as RawCompanyRow[]).map(
        (company) => {
          const serviceRows = companyServiceMap.get(company.id) ?? [];
          const specialty = serviceRows[0]?.title || company.category || 'Company service';
          const serviceText = serviceRows
            .map((service) => `${service.title ?? ''} ${service.description ?? ''}`)
            .join(' ');

          return {
            id: company.id,
            kind: 'company' as const,
            name: company.name || 'Company',
            slug: company.slug || company.id,
            description: company.description || 'Open this provider profile on Sendio.',
            image: company.logo,
            city: company.city || '',
            specialty,
            rating: company.rating,
            phone: company.phone,
            searchText: `${company.name ?? ''} ${company.category ?? ''} ${
              company.description ?? ''
            } ${serviceText}`.toLowerCase(),
          };
        }
      );

      const workerProviders = ((workersResult.data ?? []) as RawWorkerRow[]).map((worker) => {
        const serviceRows = workerServiceMap.get(worker.id) ?? [];
        const specialty = serviceRows[0]?.title || 'Worker service';
        const serviceText = serviceRows
          .map((service) => `${service.title ?? ''} ${service.description ?? ''}`)
          .join(' ');

        return {
          id: worker.id,
          kind: 'worker' as const,
          name: worker.name || 'Worker',
          slug: worker.slug || worker.id,
          description: worker.description || 'Open this worker profile on Sendio.',
          image: worker.avatar,
          city: worker.city || '',
          specialty,
          rating: worker.rating,
          phone: worker.phone,
          searchText: `${worker.name ?? ''} ${worker.description ?? ''} ${serviceText}`.toLowerCase(),
        };
      });

      setProviders([...companyProviders, ...workerProviders]);
    }

    loadProviders();

    return () => {
      active = false;
    };
  }, []);

  const normalizedSearch = normalizeText(searchText);
  const normalizedLocation = normalizeText(locationText);

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

  const visibleProviders = providers.filter((provider) => {
    const cityMatches = normalizedLocation
      ? normalizeText(provider.city).includes(normalizedLocation)
      : true;

    const serviceMatches = normalizedSearch ? provider.searchText.includes(normalizedSearch) : true;

    return cityMatches && serviceMatches;
  });

  const providerLayers = splitProviderLayers(visibleProviders);
  const cvImages = providers.filter((provider) => provider.image).slice(0, 3);
  const serviceMarqueeItems = services.length > 0 ? services : visibleServices;

  function findBestServiceSlugForProvider(provider: FeaturedProvider) {
    const directService = services.find((service) => {
      const serviceName = normalizeText(service.name);
      const providerSpecialty = normalizeText(provider.specialty);

      return (
        provider.searchText.includes(serviceName) ||
        providerSpecialty.includes(serviceName) ||
        serviceName.includes(providerSpecialty)
      );
    });

    if (directService) {
      return directService.slug;
    }

    const searchedService = visibleServices[0];

    if (searchedService) {
      return searchedService.slug;
    }

    return services[0]?.slug ?? '';
  }

  function getProviderRequestHref(provider: FeaturedProvider) {
    const serviceSlug = findBestServiceSlugForProvider(provider);

    if (!serviceSlug) {
      return getProviderHref(provider);
    }

    const params = new URLSearchParams({
      providerType: provider.kind,
      providerId: provider.id,
    });

    if (locationText.trim()) {
      params.set('city', locationText.trim());
    }

    return `/services/${serviceSlug}?${params.toString()}`;
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

          <button type="button" className="topIconButton" aria-label="Search">
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

            <button type="button" className="logoutButton" onClick={handleLogout}>
              Logout →
            </button>
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

          <form className="heroSearch" onSubmit={handleSearch}>
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
              href={`/services/${service.slug}`}
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
          <Link href="/register">Upload CV</Link>
        </div>

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
              <Link href={`/services/${service.slug}`} className="serviceLine" key={service.id}>
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
              <Link href={`/services/${service.slug}`} className="trendingLine" key={service.id}>
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

      <section className="providerLayers">
        {providerLayers.map((layer) => (
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
                {[...layer.items, ...layer.items].map((item, index) => {
                  if (isEmptyProvider(item)) {
                    return (
                      <article className="floatingProviderCard emptyProviderCard" key={`${item.id}-${index}`}>
                        <div className="floatingProviderImage emptyProviderImage" />
                        <div className="floatingProviderInfo">
                          <span className="emptyLine emptyWide" />
                          <span className="emptyLine emptyShort" />
                          <span className="emptyLine emptyMedium" />
                        </div>
                      </article>
                    );
                  }

                  const whatsappHref = getWhatsappHref(item.phone);

                  return (
                    <article className="floatingProviderCard" key={`${layer.key}-${item.kind}-${item.id}-${index}`}>
                      <Link
                        href={getProviderRequestHref(item)}
                        className="floatingProviderImage"
                        style={
                          item.image
                            ? {
                                backgroundImage: `url("${item.image}")`,
                              }
                            : undefined
                        }
                      >
                        {!item.image ? item.name.charAt(0).toUpperCase() : null}
                      </Link>

                      <div className="floatingProviderInfo">
                        <Link href={getProviderRequestHref(item)} className="providerNameLink">
                          {item.name}
                        </Link>

                        <span className="providerStars">
                          {item.rating ? `★ ${item.rating.toFixed(1)}` : '☆ ☆ ☆ ☆ ☆'}
                        </span>

                        <p>{shortDescription(item.description)}</p>

                        <div className="providerTinyActions">
                          {item.phone ? (
                            <a href={`tel:${cleanPhone(item.phone)}`} aria-label="Call provider">
                              ☎
                            </a>
                          ) : null}

                          {whatsappHref ? (
                            <a
                              href={whatsappHref}
                              target="_blank"
                              rel="noreferrer"
                              aria-label="Open WhatsApp"
                            >
                              ●
                            </a>
                          ) : null}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          </div>
        ))}
      </section>

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

        .cvText a {
          min-width: 190px;
          min-height: 42px;
          border-radius: 5px;
          background: var(--sendio-button-bg);
          color: var(--sendio-text);
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 13px;
          font-weight: 900;
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

          .cvText a {
            width: 100%;
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