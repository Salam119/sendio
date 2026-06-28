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

function getWhatsappUrl(value: string) {
  const cleanNumber = value.replace(/\D/g, '');

  return cleanNumber ? `https://wa.me/${cleanNumber}` : null;
}

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
        await loadSocialLinks(id ?? undefined);
      } catch (error) {
        clearSocialLinks();
        alert(
          error instanceof Error
            ? error.message
            : 'Failed to load social links'
        );
      }
    }

    void initSocialLinks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      : await supabase.from('company_social_links').insert([payload]);

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
      label: 'WhatsApp',
      icon: <FaWhatsapp />,
      url: whatsapp ? getWhatsappUrl(whatsapp) : null,
    },
    {
      key: 'instagram',
      label: 'Instagram',
      icon: <FaInstagram />,
      url: instagram || null,
    },
    {
      key: 'facebook',
      label: 'Facebook',
      icon: <FaFacebook />,
      url: facebook || null,
    },
    {
      key: 'linkedin',
      label: 'LinkedIn',
      icon: <FaLinkedin />,
      url: linkedin || null,
    },
    {
      key: 'x',
      label: 'X',
      icon: <FaXTwitter />,
      url: x || null,
    },
    {
      key: 'website',
      label: 'Website',
      icon: <FaGlobe />,
      url: website || null,
    },
  ];

  return (
    <section className="rounded-[22px] border border-[var(--sendio-border)] bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--sendio-muted)]">
            Social links
          </p>
          <h2 className="mt-1 text-base font-black text-[var(--sendio-text)]">
            Public contact channels
          </h2>
        </div>

        <button
          type="button"
          onClick={() => void saveSocialLinks()}
          disabled={loading}
          className="rounded-full bg-[var(--sendio-accent)] px-4 py-2 text-xs font-black text-[var(--sendio-accent-text)] disabled:opacity-60"
        >
          {loading ? 'Saving...' : 'Save'}
        </button>
      </div>

      <div className="grid gap-2 md:grid-cols-2">
        <SocialInput
          value={whatsapp}
          onChange={setWhatsapp}
          placeholder="WhatsApp number"
        />
        <SocialInput
          value={website}
          onChange={setWebsite}
          placeholder="Website URL"
        />
        <SocialInput
          value={facebook}
          onChange={setFacebook}
          placeholder="Facebook URL"
        />
        <SocialInput
          value={instagram}
          onChange={setInstagram}
          placeholder="Instagram URL"
        />
        <SocialInput
          value={linkedin}
          onChange={setLinkedin}
          placeholder="LinkedIn URL"
        />
        <SocialInput value={x} onChange={setX} placeholder="X URL" />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {links.map((item) =>
          item.url ? (
            <a
              key={item.key}
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              title={item.label}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--sendio-border)] bg-[var(--sendio-soft)] text-sm font-black text-[var(--sendio-text)] transition hover:bg-[var(--sendio-soft-hover)]"
            >
              {item.icon}
            </a>
          ) : null
        )}

        {!links.some((item) => item.url) ? (
          <p className="rounded-2xl border border-dashed border-[var(--sendio-border)] bg-[var(--sendio-soft)] px-3 py-2 text-xs font-bold text-[var(--sendio-muted)]">
            No social links added yet.
          </p>
        ) : null}
      </div>
    </section>
  );
}

function SocialInput({
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
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-2xl border border-[var(--sendio-border)] bg-white px-3 py-2.5 text-sm font-semibold text-[var(--sendio-text)] outline-none placeholder:text-gray-400 focus:border-[var(--sendio-accent)]"
    />
  );
}