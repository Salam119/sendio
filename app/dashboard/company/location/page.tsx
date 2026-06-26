'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

type CompanyLocation = {
  id: string;
  company_id: string;
  address_line: string | null;
  city: string | null;
  postal_code: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  google_place_id: string | null;
  map_title: string | null;
  directions_note: string | null;
  is_public: boolean;
};

export default function CompanyLocationPage() {
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [locationId, setLocationId] = useState<string | null>(null);

  const [addressLine, setAddressLine] = useState('');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [country, setCountry] = useState('Belgium');
  const [mapTitle, setMapTitle] = useState('');
  const [directionsNote, setDirectionsNote] = useState('');
  const [isPublic, setIsPublic] = useState(true);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadLocation() {
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

      const { data: locationData } = await supabase
        .from('company_locations')
        .select('*')
        .eq('company_id', selectedCompanyId)
        .maybeSingle();

      if (!isMounted) return;

      const selectedLocation = locationData as CompanyLocation | null;

      if (selectedLocation) {
        setLocationId(selectedLocation.id);
        setAddressLine(selectedLocation.address_line ?? '');
        setCity(selectedLocation.city ?? '');
        setPostalCode(selectedLocation.postal_code ?? '');
        setCountry(selectedLocation.country ?? 'Belgium');
        setMapTitle(selectedLocation.map_title ?? '');
        setDirectionsNote(selectedLocation.directions_note ?? '');
        setIsPublic(selectedLocation.is_public);
      }

      setLoading(false);
    }

    loadLocation();

    return () => {
      isMounted = false;
    };
  }, []);

  function getCompanyAddress() {
    return [addressLine.trim(), postalCode.trim(), city.trim(), country.trim()]
      .filter(Boolean)
      .join(', ');
  }

  function getGoogleMapsPreviewUrl() {
    const destination = getCompanyAddress();

    if (!destination) return null;

    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      destination
    )}`;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!companyId || saving) return;

    const cleanAddress = addressLine.trim();
    const cleanCity = city.trim();
    const cleanPostalCode = postalCode.trim();
    const cleanCountry = country.trim() || 'Belgium';

    if (!cleanAddress || !cleanCity) {
      setStatusMessage('Address and city are required.');
      return;
    }

    setSaving(true);
    setStatusMessage(null);

    const payload = {
      company_id: companyId,
      address_line: cleanAddress,
      city: cleanCity,
      postal_code: cleanPostalCode || null,
      country: cleanCountry,
      map_title: mapTitle.trim() || null,
      directions_note: directionsNote.trim() || null,
      is_public: isPublic,
    };

    const { data, error } = await supabase
      .from('company_locations')
      .upsert(payload, { onConflict: 'company_id' })
      .select('*')
      .maybeSingle();

    setSaving(false);

    if (error) {
      setStatusMessage(error.message);
      return;
    }

    const savedLocation = data as CompanyLocation | null;

    if (savedLocation) {
      setLocationId(savedLocation.id);
    }

    setStatusMessage('Location saved successfully.');
  }

  const mapsPreviewUrl = getGoogleMapsPreviewUrl();

  if (loading) {
    return (
      <main className="location-page">
        <div className="state-card">Loading location settings...</div>

        <style jsx>{`
          .location-page {
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
    <main className="location-page">
      <div className="page-shell">
        <div className="top-row">
          <div>
            <p className="eyebrow">Company Dashboard</p>
            <h1>Location & Directions</h1>
            <p className="subtitle">
              Add your real company address so clients can open directions in
              Google Maps from their device.
            </p>
          </div>

          <Link href="/dashboard/company" className="back-button">
            Back
          </Link>
        </div>

        <section className="content-grid">
          <form onSubmit={handleSubmit} className="location-card">
            <h2>Location Details</h2>

            <label>
              Address line
              <input
                type="text"
                value={addressLine}
                onChange={(event) => setAddressLine(event.target.value)}
                placeholder="Street and number"
              />
            </label>

            <div className="two-columns">
              <label>
                City
                <input
                  type="text"
                  value={city}
                  onChange={(event) => setCity(event.target.value)}
                  placeholder="City"
                />
              </label>

              <label>
                Postal code
                <input
                  type="text"
                  value={postalCode}
                  onChange={(event) => setPostalCode(event.target.value)}
                  placeholder="Postal code"
                />
              </label>
            </div>

            <label>
              Country
              <input
                type="text"
                value={country}
                onChange={(event) => setCountry(event.target.value)}
                placeholder="Country"
              />
            </label>

            <label>
              Map title
              <input
                type="text"
                value={mapTitle}
                onChange={(event) => setMapTitle(event.target.value)}
                placeholder="Example: Main office"
              />
            </label>

            <label>
              Directions note
              <textarea
                value={directionsNote}
                onChange={(event) => setDirectionsNote(event.target.value)}
                placeholder="Optional note for clients"
                rows={4}
              />
            </label>

            <label className="toggle-row">
              <input
                type="checkbox"
                checked={isPublic}
                onChange={(event) => setIsPublic(event.target.checked)}
              />
              Show this location publicly
            </label>

            <button type="submit" disabled={saving}>
              {saving ? 'Saving...' : locationId ? 'Update Location' : 'Save Location'}
            </button>

            {statusMessage ? <p className="status-message">{statusMessage}</p> : null}
          </form>

          <aside className="preview-card">
            <h2>Preview</h2>

            <div className="map-preview">
              {mapsPreviewUrl ? (
                <iframe
                  title="Company location preview"
                  src={`https://www.google.com/maps?q=${encodeURIComponent(
                    getCompanyAddress()
                  )}&output=embed`}
                  loading="lazy"
                />
              ) : (
                <div className="empty-map">Add address and city to preview map.</div>
              )}
            </div>

            <div className="address-box">
              <span>Saved destination</span>
              <strong>{getCompanyAddress() || 'No location yet'}</strong>
            </div>

            {mapsPreviewUrl ? (
              <a
                href={mapsPreviewUrl}
                target="_blank"
                rel="noreferrer"
                className="maps-link"
              >
                Open in Google Maps
              </a>
            ) : null}
          </aside>
        </section>
      </div>

      <style jsx>{`
        .location-page {
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
          margin-bottom: 16px;
          padding: 7px 14px;
          background: #eef6ff;
          border: 1px solid #dbeafe;
          border-radius: 22px;
          font-size: 13px;
          font-weight: 900;
        }

        .subtitle {
          max-width: 620px;
          margin-bottom: 0;
          color: #374151;
          font-weight: 700;
          line-height: 1.5;
        }

        .back-button,
        .maps-link {
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
          grid-template-columns: minmax(0, 1fr) 420px;
          gap: 22px;
          align-items: start;
        }

        .location-card,
        .preview-card {
          border: 1px solid #dbeafe;
          border-radius: 22px;
          background: #ffffff;
          padding: 20px;
          box-shadow: 0 14px 34px rgba(17, 24, 39, 0.06);
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
        textarea {
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
        textarea:focus {
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

        .map-preview {
          height: 280px;
          border: 1px solid #dbeafe;
          border-radius: 18px;
          overflow: hidden;
          background: #eef6ff;
        }

        .map-preview iframe {
          width: 100%;
          height: 100%;
          border: 0;
        }

        .empty-map {
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          color: #374151;
          text-align: center;
          font-weight: 800;
        }

        .address-box {
          margin-top: 14px;
          min-height: 64px;
          padding: 12px 14px;
          border: 1px solid #dbeafe;
          border-radius: 22px;
          background: #eef6ff;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .address-box span {
          color: #374151;
          font-size: 11px;
          font-weight: 900;
          text-transform: uppercase;
        }

        .address-box strong {
          color: #111827;
          font-size: 13px;
          line-height: 1.35;
        }

        .maps-link {
          margin-top: 14px;
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
          .location-page {
            padding: 22px 14px 50px;
          }

          .top-row {
            padding: 18px;
          }

          .two-columns {
            grid-template-columns: 1fr;
          }

          .map-preview {
            height: 230px;
          }
        }
      `}</style>
    </main>
  );
}