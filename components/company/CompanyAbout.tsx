'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { getCompanyId } from '@/lib/getCompanyId';

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
    <div className="bg-white rounded-2xl border border-[#e2cfbc] p-6">
      <h2 className="text-2xl font-bold text-[#2c3e2f] mb-6">
        About Company
      </h2>

      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Write company description"
        className="w-full border border-[#e2cfbc] rounded-xl p-4 min-h-[140px] resize-none"
      />

      <button
        onClick={saveDescription}
        disabled={loading}
        className="mt-4 bg-[#c49a6c] text-white px-5 py-3 rounded-xl"
      >
        {loading ? 'Saving...' : 'Save Description'}
      </button>
    </div>
  );
}