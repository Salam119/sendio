'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

type CompanyBranch = {
  id: string;
  company_id: string;
  branch_number: number;
  country: string | null;
  city: string | null;
  specialty: string | null;
  website_url: string | null;
  is_public: boolean;
};

type BranchField = 'country' | 'city' | 'specialty' | 'website_url';

type BranchEditor = {
  branchNumber: number;
  field: BranchField;
  value: string;
};

type CompanyRecord = {
  id: string;
};

const branchNumbers = [1, 2, 3, 4, 5, 6];

const branchFields: BranchField[] = [
  'country',
  'city',
  'specialty',
  'website_url',
];

const fieldLabels: Record<BranchField, string> = {
  country: 'Country',
  city: 'City',
  specialty: 'Specialty',
  website_url: 'Link',
};

const emptyFieldLabels: Record<BranchField, string> = {
  country: 'Country ▼',
  city: 'City ▼',
  specialty: 'Specialty ▼',
  website_url: 'Link ▼',
};

function normalizeUrl(value: string) {
  const cleanValue = value.trim();

  if (!cleanValue) return null;

  if (cleanValue.startsWith('http://') || cleanValue.startsWith('https://')) {
    return cleanValue;
  }

  return `https://${cleanValue}`;
}

function getFieldPlaceholder(field: BranchField) {
  if (field === 'website_url') {
    return 'Paste website, location, or partner URL';
  }

  return fieldLabels[field];
}

export default function CompanyBranchesPage() {
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [branches, setBranches] = useState<CompanyBranch[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [editor, setEditor] = useState<BranchEditor | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadBranches() {
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

      const selectedCompany = companyData as CompanyRecord;
      const selectedCompanyId = selectedCompany.id;

      setCompanyId(selectedCompanyId);

      const { data: branchData, error: branchError } = await supabase
        .from('company_branches')
        .select('*')
        .eq('company_id', selectedCompanyId)
        .order('branch_number', { ascending: true });

      if (!isMounted) return;

      if (branchError) {
        setStatusMessage(branchError.message);
        setLoading(false);
        return;
      }

      setBranches((branchData ?? []) as CompanyBranch[]);
      setLoading(false);
    }

    loadBranches();

    return () => {
      isMounted = false;
    };
  }, []);

  function getBranch(branchNumber: number) {
    return (
      branches.find((branch) => branch.branch_number === branchNumber) ?? null
    );
  }

  function getFieldValue(branch: CompanyBranch | null, field: BranchField) {
    return branch?.[field]?.trim() ?? '';
  }

  function getButtonText(branch: CompanyBranch | null, field: BranchField) {
    const value = getFieldValue(branch, field);

    if (!value) {
      return emptyFieldLabels[field];
    }

    if (field === 'website_url') {
      return 'Link';
    }

    return value;
  }

  function openEditor(branchNumber: number, field: BranchField) {
    const branch = getBranch(branchNumber);

    setEditor({
      branchNumber,
      field,
      value: getFieldValue(branch, field),
    });
    setStatusMessage(null);
  }

  async function saveEditor() {
    if (!companyId || !editor || saving) return;

    const existingBranch = getBranch(editor.branchNumber);
    const cleanValue =
      editor.field === 'website_url'
        ? normalizeUrl(editor.value)
        : editor.value.trim() || null;

    setSaving(true);
    setStatusMessage(null);

    const payload = {
      company_id: companyId,
      branch_number: editor.branchNumber,
      country: existingBranch?.country ?? null,
      city: existingBranch?.city ?? null,
      specialty: existingBranch?.specialty ?? null,
      website_url: existingBranch?.website_url ?? null,
      is_public: true,
      [editor.field]: cleanValue,
    };

    const { data, error } = await supabase
      .from('company_branches')
      .upsert(payload, { onConflict: 'company_id,branch_number' })
      .select('*')
      .maybeSingle();

    setSaving(false);

    if (error) {
      setStatusMessage(error.message);
      return;
    }

    const savedBranch = data as CompanyBranch | null;

    if (savedBranch) {
      setBranches((currentBranches) => {
        const remainingBranches = currentBranches.filter(
          (branch) => branch.branch_number !== savedBranch.branch_number
        );

        return [...remainingBranches, savedBranch].sort(
          (first, second) => first.branch_number - second.branch_number
        );
      });
    }

    setEditor(null);
    setStatusMessage('Branch saved successfully.');
  }

  if (loading) {
    return (
      <main className="branches-page">
        <div className="state-card">Loading branches and partners...</div>

        <style jsx>{`
          .branches-page {
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
    <main className="branches-page">
      <section className="page-shell">
        <h1>Branches & Partners</h1>

        <p className="page-note">
          Manage company branches and partner company links.
        </p>

        <div className="branches-container">
          <div className="branches-stack">
            {branchNumbers.map((branchNumber) => {
              const branch = getBranch(branchNumber);

              return (
                <div key={branchNumber} className="branch-row">
                  <div className="branch-label">Branch {branchNumber}</div>

                  {branchFields.map((field) => {
                    const isFilled = Boolean(getFieldValue(branch, field));

                    return (
                      <button
                        key={field}
                        type="button"
                        className={`branch-field ${
                          isFilled ? 'branch-field-filled' : ''
                        }`}
                        onClick={() => openEditor(branchNumber, field)}
                        title={fieldLabels[field]}
                      >
                        {getButtonText(branch, field)}
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>

        {statusMessage ? (
          <p className="status-message">{statusMessage}</p>
        ) : null}
      </section>

      {editor ? (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div
            className={`field-modal ${
              editor.field === 'website_url' ? 'field-modal-large' : ''
            }`}
          >
            <h2>
              Branch {editor.branchNumber} {fieldLabels[editor.field]}
            </h2>

            <label>
              {fieldLabels[editor.field]}
              <input
                type={editor.field === 'website_url' ? 'url' : 'text'}
                value={editor.value}
                onChange={(event) =>
                  setEditor({ ...editor, value: event.target.value })
                }
                placeholder={getFieldPlaceholder(editor.field)}
              />
            </label>

            <div className="modal-actions">
              <button type="button" onClick={saveEditor} disabled={saving}>
                {saving ? 'Saving...' : 'Save'}
              </button>

              <button
                type="button"
                className="cancel-button"
                onClick={() => setEditor(null)}
                disabled={saving}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <style jsx>{`
        .branches-page {
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

        h1,
        h2,
        p {
          margin-top: 0;
        }

        h1 {
          margin-bottom: 8px;
          color: #111827;
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
          color: #111827;
          font-size: 13px;
          font-weight: 900;
        }

        .page-note {
          margin-bottom: 20px;
          color: #374151;
          font-size: 14px;
          font-weight: 700;
          line-height: 1.5;
        }

        .branches-container {
          width: 1153px;
          max-width: 100%;
          height: 700px;
          background: #e4e1f1;
          padding: 33px;
          box-sizing: border-box;
          border-radius: 30px;
          overflow-x: auto;
        }

        .branches-stack {
          width: 865px;
          display: flex;
          flex-direction: column;
          row-gap: 48.8px;
        }

        .branch-row {
          width: 865px;
          max-width: 100%;
          height: 65px;
          display: grid;
          grid-template-columns: 65px 200px 200px 200px 200px;
          align-items: center;
          border-radius: 22px;
          overflow: hidden;
        }

        .branch-label {
          font-size: 10px;
          font-weight: 700;
          color: #9ca3af;
          text-align: center;
          pointer-events: none;
          user-select: none;
          background: transparent;
        }

        .branch-field {
          width: 200px;
          height: 44px;
          border-radius: 22px;
          font-size: 11px;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          cursor: pointer;
          border: 0;
          border-left: 1px solid #d1d5db;
          background: #eaf9ea;
          color: #111827;
          padding: 0 12px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .branch-field:hover {
          filter: brightness(0.985);
        }

        .branch-field-filled {
          background: #4ec7f5;
        }

        .status-message {
          margin: 14px 0 0;
          color: #374151;
          font-size: 13px;
          font-weight: 800;
        }

        .modal-backdrop {
          position: fixed;
          inset: 0;
          z-index: 50;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 18px;
          background: rgba(17, 24, 39, 0.36);
        }

        .field-modal {
          width: 360px;
          max-width: 100%;
          border: 1px solid #dbeafe;
          border-radius: 22px;
          background: #ffffff;
          padding: 20px;
          box-shadow: 0 18px 44px rgba(17, 24, 39, 0.18);
        }

        .field-modal-large {
          width: 520px;
        }

        label {
          display: flex;
          flex-direction: column;
          gap: 7px;
          color: #374151;
          font-size: 13px;
          font-weight: 900;
        }

        input {
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

        input:focus {
          border-color: #93c5fd;
        }

        .modal-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-top: 16px;
        }

        .modal-actions button {
          height: 40px;
          border: 1px solid #dbeafe;
          border-radius: 20px;
          background: #eef6ff;
          color: #111827;
          padding: 0 16px;
          font-weight: 900;
          cursor: pointer;
        }

        .modal-actions .cancel-button {
          background: #ffffff;
        }

        .modal-actions button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        @media (max-width: 620px) {
          .branches-page {
            padding: 22px 14px 50px;
          }

          .branches-container {
            padding: 33px;
          }
        }
      `}</style>
    </main>
  );
}
