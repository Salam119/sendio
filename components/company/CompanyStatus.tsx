'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { getCompanyId } from '@/lib/getCompanyId';

export default function CompanyStatus() {
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [status, setStatus] = useState('available');
  const [workingHours, setWorkingHours] = useState('');
  const [loading, setLoading] = useState(false);

  async function loadStatus() {
    const id = await getCompanyId();

    if (!id) {
      alert('Company not found for this user.');
      return;
    }

    setCompanyId(id);

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

  useEffect(() => {
    loadStatus();
  }, []);

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

    await loadStatus();
    setLoading(false);
  }

  const statusStyle =
    status === 'available'
      ? 'bg-green-100 text-green-700 border-green-300'
      : status === 'busy'
      ? 'bg-yellow-100 text-yellow-700 border-yellow-300'
      : 'bg-red-100 text-red-700 border-red-300';

  return (
    <div className="bg-white rounded-2xl border border-[#e2cfbc] p-6">
      <h2 className="text-2xl font-bold text-[#2c3e2f] mb-6">
        Company Status
      </h2>

      <div className="space-y-4">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="w-full border border-[#e2cfbc] rounded-xl px-4 py-3"
        >
          <option value="available">Available</option>
          <option value="busy">Busy</option>
          <option value="closed">Closed</option>
        </select>

        <div
          className={`inline-flex px-4 py-2 rounded-full border text-sm font-semibold ${statusStyle}`}
        >
          {status.toUpperCase()}
        </div>

        <input
          value={workingHours}
          onChange={(e) => setWorkingHours(e.target.value)}
          placeholder="Working hours"
          className="w-full border border-[#e2cfbc] rounded-xl px-4 py-3"
        />

        <button
          onClick={saveStatus}
          disabled={loading}
          className="bg-[#c49a6c] text-white px-5 py-3 rounded-xl disabled:opacity-60"
        >
          {loading ? 'Saving...' : 'Save Status'}
        </button>
      </div>
    </div>
  );
}