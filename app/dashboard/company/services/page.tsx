'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { getCompanyId } from '@/lib/getCompanyId';

type Service = {
  id: string;
  title: string;
  description: string | null;
};

type ServiceCategory = {
  id: string;
  name: string;
  icon: string | null;
  sort_order: number | null;
};

type CompanyServiceCategoryLink = {
  service_category_id: string;
};

const SERVICE_DESCRIPTION_LIMIT = 500;

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

export default function ServicesPage() {
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [serviceCategories, setServiceCategories] = useState<ServiceCategory[]>(
    []
  );
  const [selectedServiceCategoryIds, setSelectedServiceCategoryIds] = useState<
    string[]
  >([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [loadingServiceCategories, setLoadingServiceCategories] =
    useState(true);
  const [savingServiceCategoryId, setSavingServiceCategoryId] = useState<
    string | null
  >(null);
  const [serviceCategoryError, setServiceCategoryError] = useState<
    string | null
  >(null);

  const selectedServiceCategories = useMemo(
    () =>
      serviceCategories.filter((category) =>
        selectedServiceCategoryIds.includes(category.id)
      ),
    [serviceCategories, selectedServiceCategoryIds]
  );

  const availableServiceCategories = useMemo(
    () =>
      serviceCategories.filter(
        (category) => !selectedServiceCategoryIds.includes(category.id)
      ),
    [serviceCategories, selectedServiceCategoryIds]
  );

  async function loadServices(id?: string) {
    const currentCompanyId = id || companyId;

    if (!currentCompanyId) return;

    const { data, error } = await supabase
      .from('company_services')
      .select('*')
      .eq('company_id', currentCompanyId)
      .order('title', { ascending: true });

    if (error) {
      console.error(error);
      alert(error.message);
      return;
    }

    setServices(data || []);
  }

  async function loadServiceCategories(id: string) {
    setLoadingServiceCategories(true);
    setServiceCategoryError(null);

    const [categoriesResult, linksResult] = await Promise.all([
      supabase
        .from('service_categories')
        .select('id, name, icon, sort_order')
        .eq('is_active', true)
        .eq('is_selectable', true)
        .in('provider_scope', ['company', 'both'])
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true }),

      supabase
        .from('company_service_categories')
        .select('service_category_id')
        .eq('company_id', id),
    ]);

    if (categoriesResult.error || linksResult.error) {
      setServiceCategories([]);
      setSelectedServiceCategoryIds([]);
      setServiceCategoryError(
        categoriesResult.error?.message ||
          linksResult.error?.message ||
          'Service categories could not be loaded.'
      );
      setLoadingServiceCategories(false);
      return;
    }

    setServiceCategories(
      (categoriesResult.data ?? []) as ServiceCategory[]
    );

    setSelectedServiceCategoryIds(
      (
        (linksResult.data ?? []) as CompanyServiceCategoryLink[]
      ).map((link) => link.service_category_id)
    );

    setLoadingServiceCategories(false);
  }

  useEffect(() => {
    async function init() {
      setInitialLoading(true);

      const id = await getCompanyId();

      if (!id) {
        alert('Company not found for this user.');
        setInitialLoading(false);
        setLoadingServiceCategories(false);
        return;
      }

      setCompanyId(id);

      await Promise.all([loadServices(id), loadServiceCategories(id)]);

      setInitialLoading(false);
    }

    void init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function addService() {
    if (!companyId) {
      alert('Company ID not found.');
      return;
    }

    const cleanTitle = title.trim();
    const cleanDescription = description.trim();

    if (!cleanTitle) return;

    setLoading(true);

    const { error } = await supabase.from('company_services').insert([
      {
        company_id: companyId,
        title: cleanTitle,
        description: cleanDescription || null,
      },
    ]);

    if (error) {
      console.error(error);
      alert(error.message);
      setLoading(false);
      return;
    }

    setTitle('');
    setDescription('');
    await loadServices(companyId);
    setLoading(false);
  }

  async function deleteService(id: string) {
    const { error } = await supabase
      .from('company_services')
      .delete()
      .eq('id', id);

    if (error) {
      console.error(error);
      alert(error.message);
      return;
    }

    await loadServices();
  }

  async function selectServiceCategory(categoryId: string) {
    if (
      !companyId ||
      !categoryId ||
      selectedServiceCategoryIds.includes(categoryId)
    ) {
      return;
    }

    setSavingServiceCategoryId(categoryId);
    setServiceCategoryError(null);

    const { error } = await supabase
      .from('company_service_categories')
      .insert({
        company_id: companyId,
        service_category_id: categoryId,
        is_primary: false,
      });

    if (error) {
      setServiceCategoryError(error.message);
      setSavingServiceCategoryId(null);
      return;
    }

    setSelectedServiceCategoryIds((current) => [...current, categoryId]);
    setSavingServiceCategoryId(null);
  }

  async function removeServiceCategory(categoryId: string) {
    if (!companyId) return;

    setSavingServiceCategoryId(categoryId);
    setServiceCategoryError(null);

    const { error } = await supabase
      .from('company_service_categories')
      .delete()
      .eq('company_id', companyId)
      .eq('service_category_id', categoryId);

    if (error) {
      setServiceCategoryError(error.message);
      setSavingServiceCategoryId(null);
      return;
    }

    setSelectedServiceCategoryIds((current) =>
      current.filter((currentId) => currentId !== categoryId)
    );

    setSavingServiceCategoryId(null);
  }

  return (
    <section className="rounded-[22px] border border-[var(--sendio-border)] bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--sendio-muted)]">
            Services
          </p>

          <h2 className="mt-1 text-base font-black text-[var(--sendio-text)]">
            What your company offers
          </h2>
        </div>

        <span className="rounded-full bg-[var(--sendio-soft)] px-3 py-1 text-[11px] font-black text-[var(--sendio-text)]">
          {services.length}
        </span>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <select
          value=""
          onChange={(event) => {
            const categoryId = event.target.value;

            if (categoryId) {
              void selectServiceCategory(categoryId);
            }
          }}
          disabled={
            loadingServiceCategories ||
            savingServiceCategoryId !== null ||
            availableServiceCategories.length === 0
          }
          aria-label="Choose service category"
          className="h-9 max-w-[220px] rounded-full border border-[var(--sendio-border)] bg-white px-3 text-xs font-black text-[var(--sendio-text)] outline-none focus:border-[var(--sendio-accent)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <option value="">
            {loadingServiceCategories
              ? 'Loading categories...'
              : availableServiceCategories.length === 0
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
              className="inline-flex min-h-9 items-center gap-2 rounded-full border border-[var(--sendio-border)] bg-[var(--sendio-soft)] px-3 py-1.5 text-xs font-black text-[var(--sendio-text)]"
            >
              {symbol ? <span aria-hidden="true">{symbol}</span> : null}

              <span>{category.name}</span>

              <button
                type="button"
                onClick={() => void removeServiceCategory(category.id)}
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

      {serviceCategoryError ? (
        <p className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700">
          {serviceCategoryError}
        </p>
      ) : null}

      <div className="grid gap-2 md:grid-cols-[0.8fr_1fr_auto]">
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Service name"
          className="rounded-2xl border border-[var(--sendio-border)] bg-white px-3 py-2.5 text-sm font-semibold text-[var(--sendio-text)] outline-none placeholder:text-gray-400 focus:border-[var(--sendio-accent)]"
        />

        <input
          value={description}
          maxLength={SERVICE_DESCRIPTION_LIMIT}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Short description"
          className="rounded-2xl border border-[var(--sendio-border)] bg-white px-3 py-2.5 text-sm font-semibold text-[var(--sendio-text)] outline-none placeholder:text-gray-400 focus:border-[var(--sendio-accent)]"
        />

        <button
          type="button"
          onClick={() => void addService()}
          disabled={loading || initialLoading}
          className="rounded-full bg-[var(--sendio-accent)] px-4 py-2 text-xs font-black text-[var(--sendio-accent-text)] disabled:opacity-60"
        >
          {loading ? '...' : 'Add'}
        </button>
      </div>

      <div className="mt-4 space-y-2">
        {initialLoading ? (
          <p className="rounded-2xl border border-dashed border-[var(--sendio-border)] bg-[var(--sendio-soft)] px-3 py-2 text-xs font-bold text-[var(--sendio-muted)]">
            Loading services...
          </p>
        ) : services.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-[var(--sendio-border)] bg-[var(--sendio-soft)] px-3 py-2 text-xs font-bold text-[var(--sendio-muted)]">
            No services added yet.
          </p>
        ) : (
          services.map((service) => (
            <article
              key={service.id}
              className="rounded-2xl border border-[var(--sendio-border)] bg-[var(--sendio-soft)] px-3 py-2"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="truncate text-sm font-black text-[var(--sendio-text)]">
                    {service.title}
                  </h3>

                  {service.description ? (
                    <p className="mt-1 line-clamp-2 text-xs font-semibold leading-5 text-[var(--sendio-muted)]">
                      {service.description}
                    </p>
                  ) : null}
                </div>

                <button
                  type="button"
                  onClick={() => void deleteService(service.id)}
                  className="shrink-0 rounded-full bg-white px-2 py-1 text-[11px] font-black text-red-500"
                >
                  Delete
                </button>
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
