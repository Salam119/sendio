'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { getCompanyId } from '@/lib/getCompanyId';

type Service = {
  id: string;
  title: string;
  description: string | null;
};

const SERVICE_DESCRIPTION_LIMIT = 500;

export default function ServicesPage() {
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

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

  useEffect(() => {
    async function init() {
      setInitialLoading(true);

      const id = await getCompanyId();

      if (!id) {
        alert('Company not found for this user.');
        setInitialLoading(false);
        return;
      }

      setCompanyId(id);
      await loadServices(id);
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