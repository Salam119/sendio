'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { getCompanyId } from '@/lib/getCompanyId';

type Service = {
  id: string;
  title: string;
  description: string | null;
};

export default function ServicesPage() {
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(false);

  async function loadServices(id?: string) {
    const currentCompanyId = id || companyId;

    if (!currentCompanyId) return;

    const { data, error } = await supabase
      .from('company_services')
      .select('*')
      .eq('company_id', currentCompanyId);

    if (error) {
      console.error(error);
      return;
    }

    setServices(data || []);
  }

  useEffect(() => {
    async function init() {
      const id = await getCompanyId();

      setCompanyId(id);
      await loadServices(id);
    }

    init();
  }, []);

  async function addService() {
    if (!companyId) return;
    if (!title.trim()) return;

    setLoading(true);

    const { error } = await supabase
      .from('company_services')
      .insert([
        {
          company_id: companyId,
          title: title.trim(),
        },
      ]);

    if (error) {
      alert(error.message);
    } else {
      setTitle('');
      await loadServices(companyId);
    }

    setLoading(false);
  }

  async function deleteService(id: string) {
    const { error } = await supabase
      .from('company_services')
      .delete()
      .eq('id', id);

    if (error) {
      alert(error.message);
      return;
    }

    await loadServices();
  }

  return (
    <div className="space-y-6">
      {/* الكود الباقي كما هو بدون تغيير */}
    </div>
  );
}