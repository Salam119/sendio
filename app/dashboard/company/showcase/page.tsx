'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

type ShowcaseType =
  | 'new_product'
  | 'new_achievement'
  | 'new_project'
  | 'new_opportunity'
  | 'new_service'
  | 'special_offer';

type ShowcaseStatus = 'draft' | 'active' | 'paused' | 'expired';

type CompanyShowcase = {
  id: string;
  company_id: string;
  showcase_type: ShowcaseType;
  title: string;
  description: string | null;
  cta_text: string | null;
  cta_url: string | null;
  status: ShowcaseStatus;
  is_public: boolean;
  display_order: number;
  start_at: string | null;
  end_at: string | null;
  created_at: string;
  updated_at: string;
};

type ShowcaseMedia = {
  id: string;
  showcase_id: string;
  company_id: string;
  media_url: string;
  media_type: 'image' | 'video';
  thumbnail_url: string | null;
  alt_text: string | null;
  display_order: number;
  created_at: string;
};

type CompanyGalleryItem = {
  id: string;
  company_id: string | null;
  url: string;
  type: string | null;
};

const showcaseTypeOptions: { value: ShowcaseType; label: string }[] = [
  { value: 'new_product', label: 'New Product' },
  { value: 'new_achievement', label: 'New Achievement' },
  { value: 'new_project', label: 'New Project' },
  { value: 'new_opportunity', label: 'New Opportunity' },
  { value: 'new_service', label: 'New Service' },
  { value: 'special_offer', label: 'Special Offer' },
];

const statusOptions: { value: ShowcaseStatus; label: string }[] = [
  { value: 'draft', label: 'Draft' },
  { value: 'active', label: 'Active' },
  { value: 'paused', label: 'Paused' },
  { value: 'expired', label: 'Expired' },
];

function getShowcaseTypeLabel(value: ShowcaseType) {
  return showcaseTypeOptions.find((option) => option.value === value)?.label ?? 'New Product';
}

function normalizeUrl(value: string) {
  const cleanValue = value.trim();

  if (!cleanValue) return null;

  if (cleanValue.startsWith('http://') || cleanValue.startsWith('https://')) {
    return cleanValue;
  }

  return `https://${cleanValue}`;
}

function getGalleryMediaType(item: CompanyGalleryItem): 'image' | 'video' {
  return item.type?.toLowerCase() === 'video' ? 'video' : 'image';
}

export default function CompanyShowcasePage() {
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [showcaseId, setShowcaseId] = useState<string | null>(null);

  const [showcaseType, setShowcaseType] = useState<ShowcaseType>('new_product');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [ctaText, setCtaText] = useState('');
  const [ctaUrl, setCtaUrl] = useState('');
  const [status, setStatus] = useState<ShowcaseStatus>('draft');
  const [isPublic, setIsPublic] = useState(true);

  const [activeMedia, setActiveMedia] = useState<ShowcaseMedia | null>(null);
  const [galleryItems, setGalleryItems] = useState<CompanyGalleryItem[]>([]);
  const [selectorMode, setSelectorMode] = useState<'image' | 'video' | null>(null);
  const [selectedGalleryItem, setSelectedGalleryItem] =
    useState<CompanyGalleryItem | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selecting, setSelecting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const selectedTypeLabel = getShowcaseTypeLabel(showcaseType);

  const galleryImages = galleryItems.filter((item) => getGalleryMediaType(item) === 'image');
  const galleryVideos = galleryItems.filter((item) => getGalleryMediaType(item) === 'video');
  const visibleGalleryItems = selectorMode === 'video' ? galleryVideos : galleryImages;

  useEffect(() => {
    let isMounted = true;

    async function loadShowcase() {
      setLoading(true);
      setStatusMessage(null);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        if (isMounted) {
          setLoading(false);
          setStatusMessage('Please sign in again.');
        }
        return;
      }

      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!isMounted) return;

      if (companyError || !companyData) {
        setLoading(false);
        setStatusMessage('Company profile was not found.');
        return;
      }

      const selectedCompanyId = companyData.id as string;
      setCompanyId(selectedCompanyId);

      const [{ data: showcaseData }, { data: galleryData }] = await Promise.all([
        supabase
          .from('company_showcases')
          .select('*')
          .eq('company_id', selectedCompanyId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),

        supabase
          .from('company_gallery')
          .select('*')
          .eq('company_id', selectedCompanyId)
          .order('id', { ascending: true }),
      ]);

      if (!isMounted) return;

      setGalleryItems((galleryData ?? []) as CompanyGalleryItem[]);

      const selectedShowcase = showcaseData as CompanyShowcase | null;

      if (selectedShowcase) {
        setShowcaseId(selectedShowcase.id);
        setShowcaseType(selectedShowcase.showcase_type);
        setTitle(selectedShowcase.title ?? '');
        setDescription(selectedShowcase.description ?? '');
        setCtaText(selectedShowcase.cta_text ?? '');
        setCtaUrl(selectedShowcase.cta_url ?? '');
        setStatus(selectedShowcase.status);
        setIsPublic(selectedShowcase.is_public);

        const { data: mediaData } = await supabase
          .from('company_showcase_media')
          .select('*')
          .eq('showcase_id', selectedShowcase.id)
          .order('display_order', { ascending: true })
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!isMounted) return;

        setActiveMedia((mediaData as ShowcaseMedia | null) ?? null);
      }

      setLoading(false);
    }

    loadShowcase();

    return () => {
      isMounted = false;
    };
  }, []);

  async function refreshActiveMedia(selectedShowcaseId: string) {
    const { data } = await supabase
      .from('company_showcase_media')
      .select('*')
      .eq('showcase_id', selectedShowcaseId)
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    setActiveMedia((data as ShowcaseMedia | null) ?? null);
  }

  async function saveShowcase() {
    if (!companyId) return null;

    const cleanTitle = title.trim();
    const cleanDescription = description.trim();
    const cleanCtaText = ctaText.trim();
    const cleanCtaUrl = normalizeUrl(ctaUrl);

    if (!cleanTitle) {
      setStatusMessage('Title is required.');
      return null;
    }

    const payload = {
      company_id: companyId,
      showcase_type: showcaseType,
      title: cleanTitle,
      description: cleanDescription || null,
      cta_text: cleanCtaText || null,
      cta_url: cleanCtaUrl,
      status,
      is_public: isPublic,
    };

    const request = showcaseId
      ? supabase
          .from('company_showcases')
          .update(payload)
          .eq('id', showcaseId)
          .eq('company_id', companyId)
          .select('*')
          .maybeSingle()
      : supabase
          .from('company_showcases')
          .insert(payload)
          .select('*')
          .maybeSingle();

    const { data, error } = await request;

    if (error) {
      setStatusMessage(error.message);
      return null;
    }

    const savedShowcase = data as CompanyShowcase | null;

    if (!savedShowcase) {
      setStatusMessage('Showcase could not be saved.');
      return null;
    }

    setShowcaseId(savedShowcase.id);
    setShowcaseType(savedShowcase.showcase_type);
    setTitle(savedShowcase.title);
    setDescription(savedShowcase.description ?? '');
    setCtaText(savedShowcase.cta_text ?? '');
    setCtaUrl(savedShowcase.cta_url ?? '');
    setStatus(savedShowcase.status);
    setIsPublic(savedShowcase.is_public);

    return savedShowcase.id;
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (saving) return;

    setSaving(true);
    setStatusMessage(null);

    const savedId = await saveShowcase();

    setSaving(false);

    if (savedId) {
      setStatusMessage('Showcase saved successfully.');
    }
  }

  async function handleUseSelectedMedia() {
    if (!companyId || !selectedGalleryItem || selecting) return;

    setSelecting(true);
    setStatusMessage(null);

    const savedShowcaseId = showcaseId ?? (await saveShowcase());

    if (!savedShowcaseId) {
      setSelecting(false);
      return;
    }

    const mediaType = getGalleryMediaType(selectedGalleryItem);

    await supabase
      .from('company_showcase_media')
      .delete()
      .eq('showcase_id', savedShowcaseId)
      .eq('company_id', companyId);

    const { error } = await supabase.from('company_showcase_media').insert({
      showcase_id: savedShowcaseId,
      company_id: companyId,
      media_url: selectedGalleryItem.url,
      media_type: mediaType,
      display_order: 0,
      alt_text: title.trim() || null,
    });

    if (error) {
      setStatusMessage(error.message);
      setSelecting(false);
      return;
    }

    await refreshActiveMedia(savedShowcaseId);
    setSelectedGalleryItem(null);
    setSelectorMode(null);
    setSelecting(false);
    setStatusMessage('Showcase media selected successfully.');
  }

  async function handleDeleteMedia() {
    if (!activeMedia) return;

    const confirmed = window.confirm('Remove this showcase media?');

    if (!confirmed) return;

    const { error } = await supabase
      .from('company_showcase_media')
      .delete()
      .eq('id', activeMedia.id)
      .eq('company_id', activeMedia.company_id);

    if (error) {
      setStatusMessage(error.message);
      return;
    }

    setActiveMedia(null);
    setStatusMessage('Showcase media removed successfully.');
  }

  if (loading) {
    return (
      <main className="showcase-page">
        <div className="state-card">Loading company showcase...</div>

        <style jsx>{`
          .showcase-page {
            min-height: 100vh;
            background: #ffffff;
            color: #111827;
            padding: 34px 18px;
            font-family: Arial, sans-serif;
          }

          .state-card {
            max-width: 720px;
            margin: 80px auto;
            padding: 28px;
            border: 1px solid #dbeafe;
            border-radius: 22px;
            background: #eef6ff;
            text-align: center;
            font-weight: 900;
          }
        `}</style>
      </main>
    );
  }

  return (
    <main className="showcase-page">
      <div className="page-shell">
        <div className="top-row">
          <div>
            <p className="eyebrow">Company Dashboard</p>
            <h1>Company Showcase</h1>
            <p className="subtitle">
              Create one internal profile highlight. Select one image or video
              from your existing Profile Gallery. Upload new gallery files from
              the Gallery section only.
            </p>
          </div>

          <Link href="/dashboard/company" className="back-button">
            Back
          </Link>
        </div>

        <section className="content-grid">
          <form onSubmit={handleSave} className="showcase-card">
            <div className="section-header-row">
              <h2>Showcase Details</h2>

              <div className="type-select-wrap">
                <select
                  value={showcaseType}
                  onChange={(event) => setShowcaseType(event.target.value as ShowcaseType)}
                  aria-label="Showcase type"
                >
                  {showcaseTypeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <span aria-hidden="true">⌄</span>
              </div>
            </div>

            <div className="selected-type-badge">{selectedTypeLabel}</div>

            <label>
              Title
              <input
                type="text"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Example: New product launch"
              />
            </label>

            <label>
              Description
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Short description for visitors"
                rows={4}
              />
            </label>

            <div className="two-columns">
              <label>
                CTA text
                <input
                  type="text"
                  value={ctaText}
                  onChange={(event) => setCtaText(event.target.value)}
                  placeholder="Example: Learn more"
                />
              </label>

              <label>
                CTA URL
                <input
                  type="text"
                  value={ctaUrl}
                  onChange={(event) => setCtaUrl(event.target.value)}
                  placeholder="https://..."
                />
              </label>
            </div>

            <label>
              Status
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value as ShowcaseStatus)}
              >
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="toggle-row">
              <input
                type="checkbox"
                checked={isPublic}
                onChange={(event) => setIsPublic(event.target.checked)}
              />
              Show this showcase publicly
            </label>

            <button type="submit" disabled={saving}>
              {saving ? 'Saving...' : showcaseId ? 'Update Showcase' : 'Save Showcase'}
            </button>

            {statusMessage ? <p className="status-message">{statusMessage}</p> : null}
          </form>

          <aside className="media-card">
            <div className="section-header-row">
              <h2>Showcase Media</h2>
              <span className="single-media-pill">From Gallery</span>
            </div>

            <div className="select-media-dropdown">
              <button
                type="button"
                onClick={() => {
                  setSelectorMode(selectorMode ? null : 'image');
                  setSelectedGalleryItem(null);
                }}
              >
                Select Showcase Media <span>⌄</span>
              </button>

              <div className="media-mode-buttons">
                <button
                  type="button"
                  className={selectorMode === 'image' ? 'mode-active' : ''}
                  onClick={() => {
                    setSelectorMode('image');
                    setSelectedGalleryItem(null);
                  }}
                >
                  Image
                </button>

                <button
                  type="button"
                  className={selectorMode === 'video' ? 'mode-active' : ''}
                  onClick={() => {
                    setSelectorMode('video');
                    setSelectedGalleryItem(null);
                  }}
                >
                  Video
                </button>
              </div>
            </div>

            {selectorMode ? (
              <div className="gallery-selector">
                {visibleGalleryItems.length > 0 ? (
                  visibleGalleryItems.map((item) => {
                    const mediaType = getGalleryMediaType(item);
                    const isSelected = selectedGalleryItem?.id === item.id;

                    return (
                      <button
                        key={item.id}
                        type="button"
                        className={`gallery-choice ${isSelected ? 'gallery-choice-active' : ''}`}
                        onClick={() => setSelectedGalleryItem(item)}
                      >
                        <div className="gallery-choice-frame">
                          {mediaType === 'video' ? (
                            <video src={item.url} preload="metadata" />
                          ) : (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={item.url} alt="Profile gallery media" />
                          )}
                        </div>
                        <span>{mediaType}</span>
                      </button>
                    );
                  })
                ) : (
                  <div className="empty-media">
                    No {selectorMode === 'video' ? 'videos' : 'images'} found in Profile Gallery.
                  </div>
                )}
              </div>
            ) : null}

            {selectedGalleryItem ? (
              <button
                type="button"
                className="use-selected-button"
                onClick={handleUseSelectedMedia}
                disabled={selecting}
              >
                {selecting ? 'Saving...' : 'Use Selected Media'}
              </button>
            ) : null}

            <div className="current-media-preview">
              <h3>Current Showcase Media</h3>

              {activeMedia ? (
                <article className="single-media-item">
                  <div className="single-media-frame">
                    {activeMedia.media_type === 'video' ? (
                      <video src={activeMedia.media_url} controls />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={activeMedia.media_url}
                        alt={activeMedia.alt_text ?? 'Showcase media'}
                      />
                    )}
                  </div>

                  <div className="media-item-footer">
                    <span>{activeMedia.media_type}</span>
                    <button type="button" onClick={handleDeleteMedia}>
                      remove
                    </button>
                  </div>
                </article>
              ) : (
                <div className="empty-media">No showcase media selected.</div>
              )}
            </div>
          </aside>
        </section>
      </div>

      <style jsx>{`
        .showcase-page {
          min-height: 100vh;
          background: #ffffff;
          color: #111827;
          padding: 34px 18px 70px;
          font-family: Arial, sans-serif;
        }

        .page-shell {
          max-width: 1180px;
          margin: 0 auto;
        }

        .top-row {
          display: flex;
          justify-content: space-between;
          gap: 18px;
          align-items: flex-start;
          margin-bottom: 22px;
          padding: 24px;
          background: #e8e1f1;
          border: 1px solid #dbeafe;
          border-radius: 30px;
        }

        .eyebrow {
          margin: 0 0 8px;
          color: #374151;
          font-size: 11px;
          letter-spacing: 0.18em;
          font-weight: 900;
          text-transform: uppercase;
        }

        h1,
        h2,
        h3,
        p {
          margin-top: 0;
        }

        h1 {
          margin-bottom: 8px;
          font-size: clamp(26px, 4vw, 42px);
          line-height: 1.05;
        }

        h2 {
          display: inline-flex;
          align-items: center;
          min-height: 34px;
          margin: 0;
          padding: 7px 14px;
          background: #eef6ff;
          border: 1px solid #dbeafe;
          border-radius: 22px;
          font-size: 13px;
          font-weight: 900;
        }

        h3 {
          margin-bottom: 10px;
          color: #111827;
          font-size: 14px;
          font-weight: 900;
        }

        .subtitle {
          max-width: 760px;
          margin-bottom: 0;
          color: #374151;
          font-weight: 700;
          line-height: 1.5;
        }

        .back-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          height: 38px;
          padding: 0 14px;
          border-radius: 19px;
          background: #eef6ff;
          border: 1px solid #dbeafe;
          color: #111827;
          text-decoration: none;
          font-size: 13px;
          font-weight: 900;
          white-space: nowrap;
        }

        .content-grid {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 440px;
          gap: 22px;
          align-items: start;
        }

        .showcase-card,
        .media-card {
          border: 1px solid #dbeafe;
          border-radius: 22px;
          background: #ffffff;
          padding: 20px;
          box-shadow: 0 14px 34px rgba(17, 24, 39, 0.06);
          min-width: 0;
        }

        .section-header-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 16px;
        }

        .type-select-wrap {
          position: relative;
          width: 220px;
          max-width: 100%;
        }

        .type-select-wrap select {
          width: 100%;
          height: 38px;
          appearance: none;
          border: 1px solid #dbeafe;
          border-radius: 19px;
          background: #eef6ff;
          color: #111827;
          padding: 0 36px 0 14px;
          font-size: 13px;
          font-weight: 900;
          cursor: pointer;
        }

        .type-select-wrap span {
          position: absolute;
          right: 14px;
          top: 50%;
          transform: translateY(-50%);
          color: #111827;
          font-weight: 900;
          pointer-events: none;
        }

        .selected-type-badge {
          width: fit-content;
          min-height: 34px;
          display: inline-flex;
          align-items: center;
          margin-bottom: 16px;
          padding: 7px 14px;
          background: #dcfce7;
          color: #166534;
          border: 1px solid #bbf7d0;
          border-radius: 22px;
          font-size: 12px;
          font-weight: 900;
        }

        label {
          display: flex;
          flex-direction: column;
          gap: 7px;
          margin-bottom: 14px;
          color: #374151;
          font-size: 13px;
          font-weight: 900;
        }

        input,
        textarea,
        select {
          width: 100%;
          border: 1px solid #dbeafe;
          background: #ffffff;
          color: #111827;
          border-radius: 12px;
          padding: 11px 12px;
          font: inherit;
          font-weight: 700;
          outline: none;
        }

        input:focus,
        textarea:focus,
        select:focus {
          border-color: #93c5fd;
        }

        .two-columns {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .toggle-row {
          flex-direction: row;
          align-items: center;
          gap: 10px;
          width: fit-content;
        }

        .toggle-row input {
          width: 18px;
          height: 18px;
        }

        button {
          height: 44px;
          border: 1px solid #dbeafe;
          border-radius: 22px;
          background: #eef6ff;
          color: #111827;
          padding: 0 18px;
          font-weight: 900;
          cursor: pointer;
        }

        button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .status-message {
          margin: 12px 0 0;
          color: #374151;
          font-size: 13px;
          font-weight: 800;
        }

        .single-media-pill {
          min-height: 28px;
          display: inline-flex;
          align-items: center;
          padding: 5px 10px;
          border-radius: 14px;
          background: #eef6ff;
          border: 1px solid #dbeafe;
          color: #374151;
          font-size: 11px;
          font-weight: 900;
          white-space: nowrap;
        }

        .select-media-dropdown {
          border: 1px solid #dbeafe;
          border-radius: 22px;
          background: #eef6ff;
          padding: 14px;
        }

        .select-media-dropdown > button {
          width: 100%;
          justify-content: space-between;
          display: flex;
          align-items: center;
          background: #ffffff;
        }

        .media-mode-buttons {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
          margin-top: 10px;
        }

        .media-mode-buttons button {
          height: 38px;
          border-radius: 19px;
          background: #ffffff;
          font-size: 12px;
        }

        .media-mode-buttons .mode-active {
          background: #dcfce7;
          border-color: #bbf7d0;
          color: #166534;
        }

        .gallery-selector {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
          margin-top: 14px;
        }

        .gallery-choice {
          height: auto;
          display: flex;
          flex-direction: column;
          gap: 7px;
          padding: 8px;
          border-radius: 18px;
          background: #ffffff;
          border: 1px solid #dbeafe;
        }

        .gallery-choice-active {
          border-color: #86efac;
          background: #dcfce7;
        }

        .gallery-choice-frame {
          height: 118px;
          border-radius: 14px;
          overflow: hidden;
          background: #f8fafc;
          border: 1px solid #dbeafe;
        }

        .gallery-choice-frame img,
        .gallery-choice-frame video {
          width: 100%;
          height: 100%;
          object-fit: contain;
          background: #f8fafc;
        }

        .gallery-choice span {
          color: #374151;
          font-size: 11px;
          font-weight: 900;
          text-transform: uppercase;
        }

        .use-selected-button {
          width: 100%;
          margin-top: 12px;
          background: #dcfce7;
          border-color: #bbf7d0;
          color: #166534;
        }

        .current-media-preview {
          margin-top: 16px;
        }

        .single-media-item {
          border: 1px solid #dbeafe;
          border-radius: 18px;
          overflow: hidden;
          background: #ffffff;
        }

        .single-media-frame {
          height: 230px;
          background: #f8fafc;
          overflow: hidden;
        }

       .single-media-frame {
  width: 100%;
  aspect-ratio: 16 / 9;
  min-height: 260px;
  max-height: 320px;
  background: #f8fafc;
  overflow: hidden;
  border-radius: 18px 18px 0 0;
}

.single-media-frame img,
.single-media-frame video {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
  background: #f8fafc;
  display: block;

        }

        .media-item-footer {
          min-height: 38px;
          padding: 7px 8px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
        }

        .media-item-footer span {
          color: #374151;
          font-size: 11px;
          font-weight: 900;
          text-transform: uppercase;
        }

        .media-item-footer button {
          height: 26px;
          padding: 0 9px;
          border-radius: 13px;
          background: #fff1f2;
          border-color: #fecdd3;
          color: #be123c;
          font-size: 10px;
          text-transform: lowercase;
        }

        .empty-media {
          min-height: 120px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          border: 1px solid #dbeafe;
          border-radius: 18px;
          background: #eef6ff;
          color: #374151;
          text-align: center;
          font-size: 13px;
          font-weight: 900;
        }

        @media (max-width: 900px) {
          .top-row {
            flex-direction: column;
          }

          .content-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 620px) {
          .showcase-page {
            padding: 22px 14px 50px;
          }

          .top-row {
            padding: 18px;
          }

          .section-header-row {
            align-items: flex-start;
            flex-direction: column;
          }

          .two-columns,
          .gallery-selector {
            grid-template-columns: 1fr;
          }

          .type-select-wrap {
            width: 100%;
          }

          .single-media-frame {
  aspect-ratio: 16 / 9;
  min-height: 210px;
  max-height: 240px;

          }
        }
      `}</style>
    </main>
  );
}