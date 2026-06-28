'use client';

import { useState } from 'react';
import { useCompany } from '@/context/CompanyContext';

export default function CompanyServices() {
  const { company, addService, deleteService } = useCompany();
  const [title, setTitle] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleAddService() {
    const cleanTitle = title.trim();

    if (!cleanTitle) return;

    setSaving(true);
    await addService(cleanTitle);
    setTitle('');
    setSaving(false);
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
          {company.services.length}
        </span>
      </div>

      <div className="flex gap-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Service name"
          className="min-w-0 flex-1 rounded-2xl border border-[var(--sendio-border)] bg-white px-3 py-2.5 text-sm font-semibold text-[var(--sendio-text)] outline-none placeholder:text-gray-400 focus:border-[var(--sendio-accent)]"
        />

        <button
          type="button"
          onClick={() => void handleAddService()}
          disabled={saving}
          className="rounded-full bg-[var(--sendio-accent)] px-4 py-2 text-xs font-black text-[var(--sendio-accent-text)] disabled:opacity-60"
        >
          {saving ? '...' : 'Add'}
        </button>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {company.services.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-[var(--sendio-border)] bg-[var(--sendio-soft)] px-3 py-2 text-xs font-bold text-[var(--sendio-muted)]">
            No services added yet.
          </p>
        ) : (
          company.services.map((service) => (
            <div
              key={service.id}
              className="flex items-center gap-2 rounded-full border border-[var(--sendio-border)] bg-[var(--sendio-soft)] px-3 py-2"
            >
              <span className="max-w-[220px] truncate text-xs font-black text-[var(--sendio-text)]">
                {service.title}
              </span>

              <button
                type="button"
                onClick={() => void deleteService(service.id)}
                className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-xs font-black text-red-500"
                title="Delete service"
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