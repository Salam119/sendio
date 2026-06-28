'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { getCompanyId } from '@/lib/getCompanyId';

const DESCRIPTION_LIMIT = 1200;

export default function CompanyAbout() {
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;

    void getCompanyId().then(async (id) => {
      if (!isMounted) return;

      if (!id) {
        alert('Company not found for this user.');
        return;
      }

      const { data, error } = await supabase
        .from('companies')
        .select('description')
        .eq('id', id)
        .single();

      if (!isMounted) return;

      if (error) {
        alert(error.message);
        return;
      }

      setCompanyId(id);
      setDescription(data?.description || '');
    });

    return () => {
      isMounted = false;
    };
  }, []);

  async function reloadAbout(id: string) {
    const { data, error } = await supabase
      .from('companies')
      .select('description')
      .eq('id', id)
      .single();

    if (error) {
      alert(error.message);
      return;
    }

    setDescription(data?.description || '');
  }

  async function saveDescription() {
    if (!companyId) {
      alert('Company ID not found.');
      return;
    }

    setLoading(true);

    const { error } = await supabase
      .from('companies')
      .update({
        description: description.trim(),
      })
      .eq('id', companyId);

    if (error) {
      alert(error.message);
      setLoading(false);
      return;
    }

    await reloadAbout(companyId);
    setLoading(false);
  }

  return (
    <section className="rounded-[22px] border border-[var(--sendio-border)] bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--sendio-muted)]">
            About
          </p>
          <h2 className="mt-1 text-base font-black text-[var(--sendio-text)]">
            Company description
          </h2>
        </div>

        <span className="text-[11px] font-bold text-[var(--sendio-muted)]">
          {description.length}/{DESCRIPTION_LIMIT}
        </span>
      </div>

      <textarea
        value={description}
        maxLength={DESCRIPTION_LIMIT}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Write a clear short description about your company."
        className="min-h-[112px] w-full resize-none rounded-2xl border border-[var(--sendio-border)] bg-white p-3 text-sm font-semibold leading-6 text-[var(--sendio-text)] outline-none placeholder:text-gray-400 focus:border-[var(--sendio-accent)]"
      />

      <button
        type="button"
        onClick={saveDescription}
        disabled={loading}
        className="mt-3 rounded-full bg-[var(--sendio-accent)] px-4 py-2 text-xs font-black text-[var(--sendio-accent-text)] disabled:opacity-60"
      >
        {loading ? 'Saving...' : 'Save description'}
      </button>
    </section>
  );
}