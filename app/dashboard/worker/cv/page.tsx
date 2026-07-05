'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

type WorkerRow = {
  id: string;
  user_id: string;
  name: string | null;
  slug: string | null;
};

type WorkerCvRow = {
  id?: string;
  worker_id: string;

  first_name: string | null;
  last_name: string | null;
  age: number | null;
  nationality: string | null;

  profession: string | null;
  specialty: string | null;
  experience: string | null;
  work_type: string | null;
  availability: string | null;
  working_hours: string | null;

  education: string | null;
  certificates: string | null;
  licenses: string | null;
  training: string | null;

  languages: string | null;
  skills: string | null;
  tools_equipment: string | null;

  previous_work: string | null;
  work_areas: string | null;
  professional_summary: string | null;

  full_address: string | null;
  phone: string | null;

  cv_mode: 'manual' | 'file';
  cv_file_url: string | null;
  cv_file_name: string | null;
  cv_file_type: string | null;
  cv_file_mime_type: string | null;
  cv_file_uploaded_at: string | null;
};

const emptyCv = (workerId: string): WorkerCvRow => ({
  worker_id: workerId,

  first_name: '',
  last_name: '',
  age: null,
  nationality: '',

  profession: '',
  specialty: '',
  experience: '',
  work_type: '',
  availability: '',
  working_hours: '',

  education: '',
  certificates: '',
  licenses: '',
  training: '',

  languages: '',
  skills: '',
  tools_equipment: '',

  previous_work: '',
  work_areas: '',
  professional_summary: '',

  full_address: '',
  phone: '',

  cv_mode: 'manual',
  cv_file_url: null,
  cv_file_name: null,
  cv_file_type: null,
  cv_file_mime_type: null,
  cv_file_uploaded_at: null,
});

const allowedMimeTypes = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

const manualCvClearPayload = {
  first_name: null,
  last_name: null,
  age: null,
  nationality: null,

  profession: null,
  specialty: null,
  experience: null,
  work_type: null,
  availability: null,
  working_hours: null,

  education: null,
  certificates: null,
  licenses: null,
  training: null,

  languages: null,
  skills: null,
  tools_equipment: null,

  previous_work: null,
  work_areas: null,
  professional_summary: null,

  full_address: null,
  phone: null,
};

const fileCvClearPayload = {
  cv_file_url: null,
  cv_file_name: null,
  cv_file_type: null,
  cv_file_mime_type: null,
  cv_file_uploaded_at: null,
};

function hasManualCvContent(cv: WorkerCvRow | null) {
  if (!cv) return false;

  return Boolean(
    cv.first_name?.trim() ||
      cv.last_name?.trim() ||
      cv.age ||
      cv.nationality?.trim() ||
      cv.profession?.trim() ||
      cv.specialty?.trim() ||
      cv.experience?.trim() ||
      cv.work_type?.trim() ||
      cv.availability?.trim() ||
      cv.working_hours?.trim() ||
      cv.education?.trim() ||
      cv.certificates?.trim() ||
      cv.licenses?.trim() ||
      cv.training?.trim() ||
      cv.languages?.trim() ||
      cv.skills?.trim() ||
      cv.tools_equipment?.trim() ||
      cv.previous_work?.trim() ||
      cv.work_areas?.trim() ||
      cv.professional_summary?.trim() ||
      cv.full_address?.trim() ||
      cv.phone?.trim(),
  );
}

function getFileType(fileName: string) {
  const lower = fileName.toLowerCase();

  if (lower.endsWith('.pdf')) return 'pdf';
  if (lower.endsWith('.doc')) return 'doc';
  if (lower.endsWith('.docx')) return 'docx';

  return 'file';
}

export default function WorkerCvPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [worker, setWorker] = useState<WorkerRow | null>(null);
  const [cv, setCv] = useState<WorkerCvRow | null>(null);

  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const publicProfileHref = useMemo(() => {
    if (!worker) return '/';
    return `/workers/${worker.slug || worker.id}`;
  }, [worker]);

  const hasManualCv = useMemo(() => hasManualCvContent(cv), [cv]);
  const hasFileCv = Boolean(cv?.cv_file_url);
  const hasAnyCv = hasManualCv || hasFileCv;

  useEffect(() => {
    const loadWorkerCv = async () => {
      setLoading(true);
      setError('');
      setMessage('');

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setError('Please sign in as a worker to manage your CV.');
        setLoading(false);
        return;
      }

      const { data: workerData, error: workerError } = await supabase
        .from('workers')
        .select('id, user_id, name, slug')
        .eq('user_id', user.id)
        .maybeSingle();

      if (workerError || !workerData) {
        setError('No worker profile was found for this account.');
        setLoading(false);
        return;
      }

      setWorker(workerData);

      const { data: cvData, error: cvError } = await supabase
        .from('worker_cv')
        .select('*')
        .eq('worker_id', workerData.id)
        .maybeSingle();

      if (cvError) {
        setError(cvError.message);
        setLoading(false);
        return;
      }

      if (cvData) {
        setCv(cvData as WorkerCvRow);
        setLoading(false);
        return;
      }

      const newCv = emptyCv(workerData.id);

      const { data: insertedCv, error: insertError } = await supabase
        .from('worker_cv')
        .insert(newCv)
        .select('*')
        .single();

      if (insertError) {
        setError(insertError.message);
        setLoading(false);
        return;
      }

      setCv(insertedCv as WorkerCvRow);
      setLoading(false);
    };

    loadWorkerCv();
  }, []);

  const updateCvField = (
    field: keyof WorkerCvRow,
    value: string | number | null,
  ) => {
    setCv((current) => {
      if (!current) return current;
      return {
        ...current,
        [field]: value,
      };
    });
  };

  const saveManualCv = async () => {
    if (!cv || !worker) return;

    setSaving(true);
    setError('');
    setMessage('');

    const payload = {
      worker_id: worker.id,

      first_name: cv.first_name || null,
      last_name: cv.last_name || null,
      age: cv.age,
      nationality: cv.nationality || null,

      profession: cv.profession || null,
      specialty: cv.specialty || null,
      experience: cv.experience || null,
      work_type: cv.work_type || null,
      availability: cv.availability || null,
      working_hours: cv.working_hours || null,

      education: cv.education || null,
      certificates: cv.certificates || null,
      licenses: cv.licenses || null,
      training: cv.training || null,

      languages: cv.languages || null,
      skills: cv.skills || null,
      tools_equipment: cv.tools_equipment || null,

      previous_work: cv.previous_work || null,
      work_areas: cv.work_areas || null,
      professional_summary: cv.professional_summary || null,

      full_address: cv.full_address || null,
      phone: cv.phone || null,

      cv_mode: 'manual' as const,
      ...fileCvClearPayload,
    };

    const { data, error: saveError } = await supabase
      .from('worker_cv')
      .upsert(payload, { onConflict: 'worker_id' })
      .select('*')
      .single();

    if (saveError) {
      setError(saveError.message);
      setSaving(false);
      return;
    }

    setCv(data as WorkerCvRow);
    setMessage('CV saved successfully.');
    setSaving(false);
  };

  const uploadCvFile = async (file: File | null) => {
    if (!file || !worker || !cv) return;

    setUploading(true);
    setError('');
    setMessage('');

    if (!allowedMimeTypes.includes(file.type)) {
      setError('Only PDF, DOC, or DOCX files are allowed.');
      setUploading(false);
      return;
    }

    const fileType = getFileType(file.name);
    const filePath = `${worker.id}/cv.${fileType}`;

    const { error: uploadError } = await supabase.storage
      .from('worker-cv')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true,
        contentType: file.type,
      });

    if (uploadError) {
      setError(uploadError.message);
      setUploading(false);
      return;
    }

    const { data: publicFile } = supabase.storage
      .from('worker-cv')
      .getPublicUrl(filePath);

    const payload = {
      worker_id: worker.id,
      cv_mode: 'file' as const,
      ...manualCvClearPayload,
      cv_file_url: publicFile.publicUrl,
      cv_file_name: file.name,
      cv_file_type: fileType,
      cv_file_mime_type: file.type,
      cv_file_uploaded_at: new Date().toISOString(),
    };

    const { data, error: updateError } = await supabase
      .from('worker_cv')
      .upsert(payload, { onConflict: 'worker_id' })
      .select('*')
      .single();

    if (updateError) {
      setError(updateError.message);
      setUploading(false);
      return;
    }

    setCv(data as WorkerCvRow);
    setMessage('CV file uploaded successfully.');
    setUploading(false);
  };

  const deleteCv = async () => {
    if (!worker) return;

    const confirmed = window.confirm('Delete the current CV?');

    if (!confirmed) return;

    setDeleting(true);
    setError('');
    setMessage('');

    const payload = {
      worker_id: worker.id,
      cv_mode: 'manual' as const,
      ...manualCvClearPayload,
      ...fileCvClearPayload,
    };

    const { data, error: deleteError } = await supabase
      .from('worker_cv')
      .upsert(payload, { onConflict: 'worker_id' })
      .select('*')
      .single();

    if (deleteError) {
      setError(deleteError.message);
      setDeleting(false);
      return;
    }

    setCv(data as WorkerCvRow);
    setMessage('CV deleted successfully.');
    setDeleting(false);
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-white px-4 py-6 text-slate-900">
        <div className="mx-auto max-w-6xl rounded-3xl border border-slate-200 p-6">
          Loading CV...
        </div>
      </main>
    );
  }

  if (error && !worker) {
    return (
      <main className="min-h-screen bg-white px-4 py-6 text-slate-900">
        <div className="mx-auto max-w-6xl rounded-3xl border border-red-200 bg-red-50 p-6 text-red-700">
          {error}
        </div>
      </main>
    );
  }

  if (!worker || !cv) {
    return null;
  }

  return (
    <main className="min-h-screen bg-white px-4 py-6 text-slate-900">
      <div className="mx-auto max-w-6xl space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/services"
            className="rounded-full border border-sky-100 bg-sky-50 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-sky-100"
          >
            Back
          </Link>

          <Link
            href="/dashboard/worker"
            className="rounded-full border border-sky-100 bg-sky-50 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-sky-100"
          >
            Worker Dashboard
          </Link>

          <Link
            href={publicProfileHref}
            className="rounded-full border border-sky-100 bg-sky-50 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-sky-100"
          >
            Public Profile
          </Link>
        </div>

        <section className="rounded-[32px] border border-sky-100 bg-[#eef6ff] p-6 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.3em] text-slate-500">
            Worker CV
          </p>
          <h1 className="mt-2 text-3xl font-black text-slate-950">
            Manage your CV
          </h1>
          <p className="mt-2 max-w-2xl text-sm font-semibold text-slate-600">
            Choose one method: write your CV manually or upload your CV file.
          </p>
        </section>

        {message ? (
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm font-bold text-emerald-700">
            {message}
          </div>
        ) : null}

        {error ? (
          <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-bold text-red-700">
            {error}
          </div>
        ) : null}

        <section className="grid gap-4 lg:grid-cols-2">
          <button
            type="button"
            onClick={() => updateCvField('cv_mode', 'manual')}
            className={`rounded-3xl border p-5 text-left shadow-sm ${
              cv.cv_mode === 'manual'
                ? 'border-sky-300 bg-sky-50'
                : 'border-slate-200 bg-white'
            }`}
          >
            <p className="text-lg font-black text-slate-950">
              Write CV manually
            </p>
            <p className="mt-2 text-sm font-semibold text-slate-600">
              Fill your professional CV fields. Saving manual CV will replace
              any uploaded CV file.
            </p>
          </button>

          <button
            type="button"
            onClick={() => updateCvField('cv_mode', 'file')}
            className={`rounded-3xl border p-5 text-left shadow-sm ${
              cv.cv_mode === 'file'
                ? 'border-sky-300 bg-sky-50'
                : 'border-slate-200 bg-white'
            }`}
          >
            <p className="text-lg font-black text-slate-950">
              Upload CV file
            </p>
            <p className="mt-2 text-sm font-semibold text-slate-600">
              Upload PDF, DOC, or DOCX. Uploading a file will replace the
              manual CV fields.
            </p>
          </button>
        </section>

        {cv.cv_mode === 'manual' ? (
          <section className="rounded-[32px] border border-sky-100 bg-white p-5 shadow-sm">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.25em] text-slate-500">
                  Manual CV
                </p>
                <h2 className="text-2xl font-black text-slate-950">
                  Professional details
                </h2>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {hasAnyCv ? (
                  <button
                    type="button"
                    onClick={deleteCv}
                    disabled={deleting || saving || uploading}
                    className="rounded-full bg-red-600 px-5 py-2 text-sm font-black text-white disabled:opacity-50"
                  >
                    {deleting ? 'Deleting...' : 'Delete CV'}
                  </button>
                ) : null}

                <button
                  type="button"
                  onClick={saveManualCv}
                  disabled={saving || deleting || uploading}
                  className="rounded-full bg-slate-950 px-5 py-2 text-sm font-black text-white disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save CV'}
                </button>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <input
                value={cv.first_name || ''}
                onChange={(event) =>
                  updateCvField('first_name', event.target.value)
                }
                placeholder="First name"
                className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none focus:border-sky-300"
              />

              <input
                value={cv.last_name || ''}
                onChange={(event) =>
                  updateCvField('last_name', event.target.value)
                }
                placeholder="Last name"
                className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none focus:border-sky-300"
              />

              <input
                type="number"
                value={cv.age ?? ''}
                onChange={(event) =>
                  updateCvField(
                    'age',
                    event.target.value ? Number(event.target.value) : null,
                  )
                }
                placeholder="Age"
                className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none focus:border-sky-300"
              />

              <input
                value={cv.nationality || ''}
                onChange={(event) =>
                  updateCvField('nationality', event.target.value)
                }
                placeholder="Nationality"
                className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none focus:border-sky-300"
              />

              <input
                value={cv.profession || ''}
                onChange={(event) =>
                  updateCvField('profession', event.target.value)
                }
                placeholder="Profession"
                className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none focus:border-sky-300"
              />

              <input
                value={cv.specialty || ''}
                onChange={(event) =>
                  updateCvField('specialty', event.target.value)
                }
                placeholder="Specialty"
                className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none focus:border-sky-300"
              />

              <textarea
                value={cv.experience || ''}
                onChange={(event) =>
                  updateCvField('experience', event.target.value)
                }
                placeholder="Experience"
                rows={2}
                className="resize-y rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none focus:border-sky-300"
              />

              <input
                value={cv.work_type || ''}
                onChange={(event) =>
                  updateCvField('work_type', event.target.value)
                }
                placeholder="Work type"
                className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none focus:border-sky-300"
              />

              <input
                value={cv.availability || ''}
                onChange={(event) =>
                  updateCvField('availability', event.target.value)
                }
                placeholder="Availability"
                className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none focus:border-sky-300"
              />

              <input
                value={cv.working_hours || ''}
                onChange={(event) =>
                  updateCvField('working_hours', event.target.value)
                }
                placeholder="Working hours"
                className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none focus:border-sky-300"
              />

              <textarea
                value={cv.education || ''}
                onChange={(event) =>
                  updateCvField('education', event.target.value)
                }
                placeholder="Education"
                rows={2}
                className="resize-y rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none focus:border-sky-300"
              />

              <textarea
                value={cv.certificates || ''}
                onChange={(event) =>
                  updateCvField('certificates', event.target.value)
                }
                placeholder="Certificates"
                rows={2}
                className="resize-y rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none focus:border-sky-300"
              />

              <textarea
                value={cv.licenses || ''}
                onChange={(event) =>
                  updateCvField('licenses', event.target.value)
                }
                placeholder="Licenses"
                rows={2}
                className="resize-y rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none focus:border-sky-300"
              />

              <textarea
                value={cv.training || ''}
                onChange={(event) =>
                  updateCvField('training', event.target.value)
                }
                placeholder="Training"
                rows={2}
                className="resize-y rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none focus:border-sky-300"
              />

              <textarea
                value={cv.languages || ''}
                onChange={(event) =>
                  updateCvField('languages', event.target.value)
                }
                placeholder="Languages"
                rows={2}
                className="resize-y rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none focus:border-sky-300"
              />

              <textarea
                value={cv.skills || ''}
                onChange={(event) =>
                  updateCvField('skills', event.target.value)
                }
                placeholder="Skills"
                rows={2}
                className="resize-y rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none focus:border-sky-300"
              />

              <textarea
                value={cv.tools_equipment || ''}
                onChange={(event) =>
                  updateCvField('tools_equipment', event.target.value)
                }
                placeholder="Tools / Equipment"
                rows={2}
                className="resize-y rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none focus:border-sky-300"
              />

              <textarea
                value={cv.previous_work || ''}
                onChange={(event) =>
                  updateCvField('previous_work', event.target.value)
                }
                placeholder="Previous work"
                rows={2}
                className="resize-y rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none focus:border-sky-300"
              />

              <textarea
                value={cv.work_areas || ''}
                onChange={(event) =>
                  updateCvField('work_areas', event.target.value)
                }
                placeholder="Work areas"
                rows={2}
                className="resize-y rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none focus:border-sky-300"
              />

              <textarea
                value={cv.professional_summary || ''}
                onChange={(event) =>
                  updateCvField('professional_summary', event.target.value)
                }
                placeholder="Professional summary"
                rows={3}
                className="resize-y rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none focus:border-sky-300 md:col-span-2"
              />

              <textarea
                value={cv.full_address || ''}
                onChange={(event) =>
                  updateCvField('full_address', event.target.value)
                }
                placeholder="Full address"
                rows={2}
                className="resize-y rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none focus:border-sky-300"
              />

              <input
                value={cv.phone || ''}
                onChange={(event) =>
                  updateCvField('phone', event.target.value)
                }
                placeholder="Phone"
                className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none focus:border-sky-300"
              />
            </div>
          </section>
        ) : (
          <section className="rounded-[32px] border border-sky-100 bg-white p-5 shadow-sm">
            <div className="mb-4">
              <p className="text-xs font-black uppercase tracking-[0.25em] text-slate-500">
                CV File
              </p>
              <h2 className="text-2xl font-black text-slate-950">
                Upload PDF / DOC / DOCX
              </h2>
            </div>

            <label className="block cursor-pointer rounded-3xl border border-dashed border-sky-200 bg-sky-50 p-6 text-center">
              <input
                type="file"
                accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                className="hidden"
                disabled={uploading || deleting || saving}
                onChange={(event) =>
                  uploadCvFile(event.target.files?.[0] || null)
                }
              />

              <span className="block text-lg font-black text-slate-950">
                {uploading
                  ? 'Uploading...'
                  : cv.cv_file_url
                    ? 'Replace CV file'
                    : 'Choose CV file'}
              </span>

              <span className="mt-2 block text-sm font-semibold text-slate-600">
                PDF, DOC, or DOCX only
              </span>
            </label>

            {cv.cv_file_url ? (
              <div className="mt-4 space-y-3">
                <a
                  href={cv.cv_file_url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-800 hover:bg-slate-50"
                >
                  <span>{cv.cv_file_type?.toUpperCase() || 'CV'} File</span>
                  <span>Open</span>
                </a>

                <button
                  type="button"
                  onClick={deleteCv}
                  disabled={deleting || uploading || saving}
                  className="w-full rounded-2xl bg-red-600 px-4 py-3 text-sm font-black text-white disabled:opacity-50"
                >
                  {deleting ? 'Deleting...' : 'Delete CV'}
                </button>
              </div>
            ) : null}
          </section>
        )}
      </div>
    </main>
  );
}