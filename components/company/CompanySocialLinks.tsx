'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { getCompanyId } from '@/lib/getCompanyId';

import {
  FaWhatsapp,
  FaInstagram,
  FaFacebook,
  FaLinkedin,
  FaXTwitter,
  FaGlobe,
} from 'react-icons/fa6';

type SocialLinks = {
  id: string;
  whatsapp: string | null;
  facebook: string | null;
  instagram: string | null;
  linkedin: string | null;
  x: string | null;
  website: string | null;
};

export default function CompanySocialLinks() {
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [rowId, setRowId] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [facebook, setFacebook] = useState('');
  const [instagram, setInstagram] = useState('');
  const [linkedin, setLinkedin] = useState('');
  const [x, setX] = useState('');
  const [website, setWebsite] = useState('');
  const [loading, setLoading] = useState(false);

  function clearSocialLinks() {
    setRowId('');
    setWhatsapp('');
    setFacebook('');
    setInstagram('');
    setLinkedin('');
    setX('');
    setWebsite('');
  }

  async function loadSocialLinks(id?: string) {
    clearSocialLinks();

    const currentCompanyId = id || companyId;

    if (!currentCompanyId) {
      return;
    }

    const { data, error } = await supabase
      .from('company_social_links')
      .select('*')
      .eq('company_id', currentCompanyId)
      .limit(1);

    if (error) {
      alert(error.message);
      return;
    }

    const item = data?.[0] as SocialLinks | undefined;

    if (item) {
      setRowId(item.id);
      setWhatsapp(item.whatsapp || '');
      setFacebook(item.facebook || '');
      setInstagram(item.instagram || '');
      setLinkedin(item.linkedin || '');
      setX(item.x || '');
      setWebsite(item.website || '');
    }
  }

  useEffect(() => {
    async function initSocialLinks() {
      try {
        const id = await getCompanyId();

        setCompanyId(id);
        await loadSocialLinks(id);
      } catch (error) {
        clearSocialLinks();
        alert(
          error instanceof Error
            ? error.message
            : 'Failed to load social links'
        );
      }
    }

    initSocialLinks();
  }, []);

  async function saveSocialLinks() {
    if (!companyId) {
      alert('Company ID not found.');
      return;
    }

    setLoading(true);

    const payload = {
      company_id: companyId,
      whatsapp: whatsapp.trim() || null,
      facebook: facebook.trim() || null,
      instagram: instagram.trim() || null,
      linkedin: linkedin.trim() || null,
      x: x.trim() || null,
      website: website.trim() || null,
    };

    const { error } = rowId
      ? await supabase
          .from('company_social_links')
          .update(payload)
          .eq('id', rowId)
      : await supabase
          .from('company_social_links')
          .insert([payload]);

    if (error) {
      alert(error.message);
      setLoading(false);
      return;
    }

    await loadSocialLinks(companyId);
    setLoading(false);
  }

  const links = [
    {
      key: 'whatsapp',
      icon: <FaWhatsapp />,
      color: 'bg-green-500',
      url: whatsapp ? `https://wa.me/${whatsapp}` : null,
    },
    {
      key: 'instagram',
      icon: <FaInstagram />,
      color: 'bg-pink-500',
      url: instagram || null,
    },
    {
      key: 'facebook',
      icon: <FaFacebook />,
      color: 'bg-blue-600',
      url: facebook || null,
    },
    {
      key: 'linkedin',
      icon: <FaLinkedin />,
      color: 'bg-blue-700',
      url: linkedin || null,
    },
    {
      key: 'x',
      icon: <FaXTwitter />,
      color: 'bg-black',
      url: x || null,
    },
    {
      key: 'website',
      icon: <FaGlobe />,
      color: 'bg-gray-600',
      url: website || null,
    },
  ];

  return (
    <div className="bg-white rounded-2xl border border-[#e2cfbc] p-6">
      <h2 className="text-2xl font-bold text-[#2c3e2f] mb-6">
        Social Links
      </h2>

      <div className="grid md:grid-cols-2 gap-3 mb-6">
        <input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="WhatsApp number" className="border border-[#e2cfbc] rounded-xl px-4 py-3" />
        <input value={facebook} onChange={(e) => setFacebook(e.target.value)} placeholder="Facebook URL" className="border border-[#e2cfbc] rounded-xl px-4 py-3" />
        <input value={instagram} onChange={(e) => setInstagram(e.target.value)} placeholder="Instagram URL" className="border border-[#e2cfbc] rounded-xl px-4 py-3" />
        <input value={linkedin} onChange={(e) => setLinkedin(e.target.value)} placeholder="LinkedIn URL" className="border border-[#e2cfbc] rounded-xl px-4 py-3" />
        <input value={x} onChange={(e) => setX(e.target.value)} placeholder="X URL" className="border border-[#e2cfbc] rounded-xl px-4 py-3" />
        <input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="Website URL" className="border border-[#e2cfbc] rounded-xl px-4 py-3" />
      </div>

      <button
        onClick={saveSocialLinks}
        disabled={loading}
        className="bg-[#c49a6c] text-white px-5 py-3 rounded-xl mb-6"
      >
        {loading ? 'Saving...' : 'Save Social Links'}
      </button>

      <div className="flex flex-wrap gap-3">
        {links.map((item) =>
          item.url ? (
            <a
              key={item.key}
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`w-12 h-12 flex items-center justify-center rounded-xl text-white text-xl ${item.color}`}
            >
              {item.icon}
            </a>
          ) : null
        )}

        {!links.some((item) => item.url) && (
          <div className="text-gray-400 text-sm">
            No social links added yet.
          </div>
        )}
      </div>
    </div>
  );
}