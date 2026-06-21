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
      .eq('company_id', currentCompanyId);

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

    initFeatures();
  }, []);

  async function addFeature() {
    if (!companyId) {
      alert('Company ID not found.');
      return;
    }

    if (!title.trim()) return;

    setLoading(true);

    const { error } = await supabase
      .from('company_features')
      .insert([
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
    <div className="bg-white rounded-2xl border border-[#e2cfbc] p-6">
      <h2 className="text-2xl font-bold text-[#2c3e2f] mb-6">
        Company Features
      </h2>

      <div className="flex gap-3 mb-6">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Add a feature"
          className="flex-1 border border-[#e2cfbc] rounded-xl px-4 py-3"
        />

        <button
          onClick={addFeature}
          disabled={loading}
          className="bg-[#c49a6c] text-white px-5 py-3 rounded-xl"
        >
          {loading ? 'Saving...' : 'Add'}
        </button>
      </div>

      <div className="flex flex-wrap gap-3">
        {features.map((feature) => (
          <div
            key={feature.id}
            className="flex items-center gap-3 bg-[#fefcf5] border border-[#e2cfbc] px-4 py-2 rounded-full"
          >
            <span className="text-sm text-[#2c3e2f]">
              {feature.title}
            </span>

            <button
              onClick={() => deleteFeature(feature.id)}
              className="text-red-500 text-sm"
            >
              Delete
            </button>
          </div>
        ))}

        {features.length === 0 && (
          <p className="text-gray-400 text-sm">
            No features added yet.
          </p>
        )}
      </div>
    </div>
  );
}