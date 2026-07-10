'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { getCompanyId } from '@/lib/getCompanyId';

type CompanyInfoData = {
  phone: string | null;
  email: string | null;
  website: string | null;
  city: string | null;
  address: string | null;
  category: string | null;
};

export default function CompanyInfo() {
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [category, setCategory] = useState('');
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
        .select('phone, email, website, city, address, category')
        .eq('id', id)
        .single();

      if (!isMounted) return;

      if (error) {
        alert(error.message);
        return;
      }

      const company = data as CompanyInfoData;

      setCompanyId(id);
      setPhone(company.phone || '');
      setEmail(company.email || '');
      setWebsite(company.website || '');
      setCity(company.city || '');
      setAddress(company.address || '');
      setCategory(company.category || '');
    });

    return () => {
      isMounted = false;
    };
  }, []);

  async function reloadCompanyInfo(id: string) {
    const { data, error } = await supabase
      .from('companies')
      .select('phone, email, website, city, address, category')
      .eq('id', id)
      .single();

    if (error) {
      alert(error.message);
      return;
    }

    const company = data as CompanyInfoData;

    setPhone(company.phone || '');
    setEmail(company.email || '');
    setWebsite(company.website || '');
    setCity(company.city || '');
    setAddress(company.address || '');
    setCategory(company.category || '');
  }

  async function saveCompanyInfo() {
    if (!companyId) {
      alert('Company ID not found.');
      return;
    }

    setLoading(true);

    const { error } = await supabase
      .from('companies')
      .update({
        phone: phone.trim() || null,
        email: email.trim() || null,
        website: website.trim() || null,
        city: city.trim() || null,
        address: address.trim() || null,
        category: category.trim() || null,
      })
      .eq('id', companyId);

    if (error) {
      alert(error.message);
      setLoading(false);
      return;
    }

    await reloadCompanyInfo(companyId);
    setLoading(false);
  }

  return (
    <section className="rounded-[22px] border border-[var(--sendio-border)] bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--sendio-muted)]">
            Company info
          </p>

          <h2 className="mt-1 text-base font-black text-[var(--sendio-text)]">
            Basic contact and profile data
          </h2>
        </div>

        <button
          type="button"
          onClick={saveCompanyInfo}
          disabled={loading}
          className="rounded-full bg-[var(--sendio-accent)] px-4 py-2 text-xs font-black text-[var(--sendio-accent-text)] shadow-sm disabled:opacity-60"
        >
          {loading ? 'Saving...' : 'Save'}
        </button>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <CompactInput value={phone} onChange={setPhone} placeholder="Phone" />
        <CompactInput value={email} onChange={setEmail} placeholder="Email" />

        <CompactInput
          value={website}
          onChange={setWebsite}
          placeholder="Website"
        />

        <CompactInput value={city} onChange={setCity} placeholder="City" />

        <CompactInput
          value={address}
          onChange={setAddress}
          placeholder="Address"
        />

        <CompactInput
          value={category}
          onChange={setCategory}
          placeholder="Category"
        />
      </div>
    </section>
  );
}

function CompactInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <input
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className="w-full rounded-2xl border border-[var(--sendio-border)] bg-white px-3 py-2.5 text-sm font-semibold text-[var(--sendio-text)] outline-none transition placeholder:text-gray-400 focus:border-[var(--sendio-accent)]"
    />
  );
}
