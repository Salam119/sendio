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
  views: number | null;
  connections: number | null;
  rating: number | null;
  reviews_count: number | null;
};

export default function CompanyInfo() {
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [category, setCategory] = useState('');
  const [views, setViews] = useState(0);
  const [connections, setConnections] = useState(0);
  const [rating, setRating] = useState(0);
  const [reviewsCount, setReviewsCount] = useState(0);
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
        .select(
          'phone, email, website, city, address, category, views, connections, rating, reviews_count'
        )
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
      setViews(company.views || 0);
      setConnections(company.connections || 0);
      setRating(Number(company.rating || 0));
      setReviewsCount(company.reviews_count || 0);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  async function reloadCompanyInfo(id: string) {
    const { data, error } = await supabase
      .from('companies')
      .select(
        'phone, email, website, city, address, category, views, connections, rating, reviews_count'
      )
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
    setViews(company.views || 0);
    setConnections(company.connections || 0);
    setRating(Number(company.rating || 0));
    setReviewsCount(company.reviews_count || 0);
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
    <div className="bg-white rounded-2xl border border-[#e2cfbc] p-6">
      <h2 className="text-2xl font-bold text-[#2c3e2f] mb-6">
        Company Info
      </h2>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-3">
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Phone"
            className="w-full border border-[#e2cfbc] rounded-xl px-4 py-3"
          />

          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="w-full border border-[#e2cfbc] rounded-xl px-4 py-3"
          />

          <input
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            placeholder="Website"
            className="w-full border border-[#e2cfbc] rounded-xl px-4 py-3"
          />

          <input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="City"
            className="w-full border border-[#e2cfbc] rounded-xl px-4 py-3"
          />

          <input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Address"
            className="w-full border border-[#e2cfbc] rounded-xl px-4 py-3"
          />

          <input
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="Category"
            className="w-full border border-[#e2cfbc] rounded-xl px-4 py-3"
          />

          <button
            onClick={saveCompanyInfo}
            disabled={loading}
            className="bg-[#c49a6c] text-white px-5 py-3 rounded-xl"
          >
            {loading ? 'Saving...' : 'Save Company Info'}
          </button>
        </div>

        <div className="space-y-3">
          <InsightCard label="Views" value={views} />

          <InsightCard label="Connections" value={connections} />

          <InsightCard label="Rating" value={`${rating} / 5`} />

          <InsightCard label="Reviews" value={reviewsCount} />
        </div>
      </div>
    </div>
  );
}

function InsightCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="border border-[#e2cfbc] rounded-xl p-4 flex justify-between items-center">
      <span className="text-sm text-[#2c3e2f]">{label}</span>

      <span className="text-sm font-semibold text-[#2c3e2f]">{value}</span>
    </div>
  );
}