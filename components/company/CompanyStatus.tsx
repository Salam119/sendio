'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { getCompanyId } from '@/lib/getCompanyId';

export default function CompanyStatus() {
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [status, setStatus] = useState('available');
  const [workingHours, setWorkingHours] = useState('');
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
        .select('status, working_hours')
        .eq('id', id)
        .single();

      if (!isMounted) return;

      if (error) {
        alert(error.message);
        return;
      }

      setCompanyId(id);
      setStatus(data.status || 'available');
      setWorkingHours(data.working_hours || '');
    });

    return () => {
      isMounted = false;
    };
  }, []);

  async function reloadStatus(id: string) {
    const { data, error } = await supabase
      .from('companies')
      .select('status, working_hours')
      .eq('id', id)
      .single();

    if (error) {
      alert(error.message);
      return;
    }

    setStatus(data.status || 'available');
    setWorkingHours(data.working_hours || '');
  }

  async function saveStatus() {
    if (!companyId) {
      alert('Company ID not found.');
      return;
    }

    setLoading(true);

    const { error } = await supabase
      .from('companies')
      .update({
        status,
        working_hours: workingHours.trim() || null,
      })
      .eq('id', companyId);

    if (error) {
      alert(error.message);
      setLoading(false);
      return;
    }

    await reloadStatus(companyId);
    setLoading(false);
  }

  const statusStyle =
    status === 'available'
      ? 'border-green-200 bg-green-50 text-green-700'
      : status === 'busy'
        ? 'border-amber-200 bg-amber-50 text-amber-700'
        : 'border-red-200 bg-red-50 text-red-700';

  return (
    <section className="rounded-[22px] border border-[var(--sendio-border)] bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--sendio-muted)]">
            Status
          </p>
          <h2 className="mt-1 text-base font-black text-[var(--sendio-text)]">
            Availability
          </h2>
        </div>

        <span
          className={`rounded-full border px-3 py-1 text-[11px] font-black uppercase ${statusStyle}`}
        >
          {status}
        </span>
      </div>

      <div className="space-y-3">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="w-full rounded-2xl border border-[var(--sendio-border)] bg-white px-3 py-2.5 text-sm font-bold text-[var(--sendio-text)] outline-none focus:border-[var(--sendio-accent)]"
        >
          <option value="available">Available</option>
          <option value="busy">Busy</option>
          <option value="closed">Closed</option>
        </select>

        <input
          value={workingHours}
          onChange={(e) => setWorkingHours(e.target.value)}
          placeholder="Working hours"
          className="w-full rounded-2xl border border-[var(--sendio-border)] bg-white px-3 py-2.5 text-sm font-semibold text-[var(--sendio-text)] outline-none placeholder:text-gray-400 focus:border-[var(--sendio-accent)]"
        />

        <button
          type="button"
          onClick={saveStatus}
          disabled={loading}
          className="w-full rounded-full bg-[var(--sendio-accent)] px-4 py-2 text-xs font-black text-[var(--sendio-accent-text)] disabled:opacity-60"
        >
          {loading ? 'Saving...' : 'Save status'}
        </button>
      </div>
    </section>
  );
}