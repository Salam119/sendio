'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { getCompanyId } from '@/lib/getCompanyId';

type Feature = {
  id: string;
  title: string;
};

export default function CompanyFeatures() {
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [features, setFeatures] = useState<Feature[]>([]);
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(false);

  async function loadFeatures(id?: string) {
    const currentCompanyId = id || companyId;

    if (!currentCompanyId) {
      return;
    }

    const { data, error } = await supabase
      .from('company_features')
      .select('*')
      .eq('company_id', currentCompanyId)
      .order('id', { ascending: true });

    if (error) {
      alert(error.message);
      return;
    }

    setFeatures(data || []);
  }

  useEffect(() => {
    async function initFeatures() {
      const id = await getCompanyId();

      if (!id) {
        alert('Company not found for this user.');
        return;
      }

      setCompanyId(id);
      await loadFeatures(id);
    }

    void initFeatures();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function addFeature() {
    if (!companyId) {
      alert('Company ID not found.');
      return;
    }

    if (!title.trim()) return;

    setLoading(true);

    const { error } = await supabase.from('company_features').insert([
      {
        company_id: companyId,
        title: title.trim(),
      },
    ]);

    if (error) {
      alert(error.message);
      setLoading(false);
      return;
    }

    setTitle('');
    await loadFeatures(companyId);

    setLoading(false);
  }

  async function deleteFeature(id: string) {
    const { error } = await supabase
      .from('company_features')
      .delete()
      .eq('id', id);

    if (error) {
      alert(error.message);
      return;
    }

    await loadFeatures();
  }

  return (
    <section className="rounded-[22px] border border-[var(--sendio-border)] bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--sendio-muted)]">
            Features
          </p>
          <h2 className="mt-1 text-base font-black text-[var(--sendio-text)]">
            Strengths and specialties
          </h2>
        </div>

        <span className="rounded-full bg-[var(--sendio-soft)] px-3 py-1 text-[11px] font-black text-[var(--sendio-text)]">
          {features.length}
        </span>
      </div>

      <div className="flex gap-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Add a feature"
          className="min-w-0 flex-1 rounded-2xl border border-[var(--sendio-border)] bg-white px-3 py-2.5 text-sm font-semibold text-[var(--sendio-text)] outline-none placeholder:text-gray-400 focus:border-[var(--sendio-accent)]"
        />

        <button
          type="button"
          onClick={() => void addFeature()}
          disabled={loading}
          className="rounded-full bg-[var(--sendio-accent)] px-4 py-2 text-xs font-black text-[var(--sendio-accent-text)] disabled:opacity-60"
        >
          {loading ? '...' : 'Add'}
        </button>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {features.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-[var(--sendio-border)] bg-[var(--sendio-soft)] px-3 py-2 text-xs font-bold text-[var(--sendio-muted)]">
            No features added yet.
          </p>
        ) : (
          features.map((feature) => (
            <div
              key={feature.id}
              className="flex items-center gap-2 rounded-full border border-[var(--sendio-border)] bg-[var(--sendio-soft)] px-3 py-2"
            >
              <span className="max-w-[220px] truncate text-xs font-black text-[var(--sendio-text)]">
                {feature.title}
              </span>

              <button
                type="button"
                onClick={() => void deleteFeature(feature.id)}
                className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-xs font-black text-red-500"
                title="Delete feature"
              >
                ×
              </button>
            </div>
          ))
        )}
      </div>
    </section>
  );
}