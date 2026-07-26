'use client';

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import {
  deleteFileFromR2,
  uploadFileToR2,
} from '@/lib/r2-media-client';

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
  storage_provider: string | null;
  object_key: string | null;
};

type FileStage =
  | 'idle'
  | 'selected'
  | 'uploading'
  | 'saving'
  | 'ready'
  | 'error';

type Feedback = {
  type: 'success' | 'error' | 'info' | 'warning';
  text: string;
};

const CV_BUCKET = 'worker-cv';
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const CV_EXTENSIONS = ['pdf', 'doc', 'docx'] as const;

const allowedMimeTypes = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

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
  storage_provider: null,
  object_key: null,
});

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
  storage_provider: null,
  object_key: null,
};

const inputClassName =
  'w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-300 focus:ring-4 focus:ring-sky-50';

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

function formatFileSize(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function formatUploadedDate(value: string | null) {
  if (!value) return 'Unknown date';

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) return 'Unknown date';

  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(parsed);
}

function manualCvSignature(cv: WorkerCvRow | null) {
  if (!cv) return '';

  return JSON.stringify({
    first_name: cv.first_name || '',
    last_name: cv.last_name || '',
    age: cv.age,
    nationality: cv.nationality || '',
    profession: cv.profession || '',
    specialty: cv.specialty || '',
    experience: cv.experience || '',
    work_type: cv.work_type || '',
    availability: cv.availability || '',
    working_hours: cv.working_hours || '',
    education: cv.education || '',
    certificates: cv.certificates || '',
    licenses: cv.licenses || '',
    training: cv.training || '',
    languages: cv.languages || '',
    skills: cv.skills || '',
    tools_equipment: cv.tools_equipment || '',
    previous_work: cv.previous_work || '',
    work_areas: cv.work_areas || '',
    professional_summary: cv.professional_summary || '',
    full_address: cv.full_address || '',
    phone: cv.phone || '',
  });
}

function getStoredObjectPath(publicUrl: string | null) {
  if (!publicUrl) return null;

  const marker = `/storage/v1/object/public/${CV_BUCKET}/`;
  const markerIndex = publicUrl.indexOf(marker);

  if (markerIndex === -1) return null;

  const encodedPath = publicUrl.slice(markerIndex + marker.length).split('?')[0];

  try {
    return decodeURIComponent(encodedPath);
  } catch {
    return encodedPath;
  }
}

function FeedbackBox({ feedback }: { feedback: Feedback | null }) {
  if (!feedback) return null;

  const classes =
    feedback.type === 'success'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
      : feedback.type === 'error'
        ? 'border-red-200 bg-red-50 text-red-800'
        : feedback.type === 'warning'
          ? 'border-amber-200 bg-amber-50 text-amber-800'
          : 'border-sky-200 bg-sky-50 text-sky-800';

  return (
    <div className={`rounded-2xl border px-4 py-3 text-sm font-bold ${classes}`}>
      {feedback.text}
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-2">
      <span className="block text-sm font-black text-slate-800">{label}</span>
      {hint ? (
        <span className="block text-xs font-semibold text-slate-500">
          {hint}
        </span>
      ) : null}
      {children}
    </label>
  );
}

function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="mb-4">
      <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-500">
        {eyebrow}
      </p>
      <h3 className="mt-1 text-xl font-black text-slate-950">{title}</h3>
      <p className="mt-1 text-sm font-semibold text-slate-600">{description}</p>
    </div>
  );
}

const stageLabels: Record<FileStage, string> = {
  idle: 'No file selected',
  selected: 'File selected',
  uploading: 'Uploading file...',
  saving: 'Saving CV information...',
  ready: 'CV ready',
  error: 'Action required',
};

export default function WorkerCvPage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [worker, setWorker] = useState<WorkerRow | null>(null);
  const [cv, setCv] = useState<WorkerCvRow | null>(null);
  const [savedManualSignature, setSavedManualSignature] = useState('');

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileStage, setFileStage] = useState<FileStage>('idle');

  const [pageError, setPageError] = useState('');
  const [manualFeedback, setManualFeedback] = useState<Feedback | null>(null);
  const [fileFeedback, setFileFeedback] = useState<Feedback | null>(null);

  const publicProfileHref = useMemo(() => {
    if (!worker) return '/';
    return `/workers/${worker.slug || worker.id}`;
  }, [worker]);

  const hasManualCv = useMemo(() => hasManualCvContent(cv), [cv]);
  const hasFileCv = Boolean(cv?.cv_file_url);
  const hasAnyCv = hasManualCv || hasFileCv;

  const hasUnsavedManualChanges = useMemo(() => {
    if (!cv) return false;
    return manualCvSignature(cv) !== savedManualSignature;
  }, [cv, savedManualSignature]);

  useEffect(() => {
    const loadWorkerCv = async () => {
      setLoading(true);
      setPageError('');
      setManualFeedback(null);
      setFileFeedback(null);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setPageError('Please sign in as a worker to manage your CV.');
        setLoading(false);
        return;
      }

      const { data: workerData, error: workerError } = await supabase
        .from('workers')
        .select('id, user_id, name, slug')
        .eq('user_id', user.id)
        .maybeSingle();

      if (workerError || !workerData) {
        setPageError('No worker profile was found for this account.');
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
        setPageError(cvError.message);
        setLoading(false);
        return;
      }

      if (cvData) {
        const loadedCv = cvData as WorkerCvRow;
        setCv(loadedCv);
        setSavedManualSignature(manualCvSignature(loadedCv));
        setFileStage(loadedCv.cv_file_url ? 'ready' : 'idle');
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
        setPageError(insertError.message);
        setLoading(false);
        return;
      }

      const createdCv = insertedCv as WorkerCvRow;
      setCv(createdCv);
      setSavedManualSignature(manualCvSignature(createdCv));
      setLoading(false);
    };

    void loadWorkerCv();
  }, []);

  useEffect(() => {
    if (!hasUnsavedManualChanges && !selectedFile) return;

    const warnBeforeLeaving = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', warnBeforeLeaving);

    return () => {
      window.removeEventListener('beforeunload', warnBeforeLeaving);
    };
  }, [hasUnsavedManualChanges, selectedFile]);

  const updateCvField = (
    field: keyof WorkerCvRow,
    value: string | number | null,
  ) => {
    setManualFeedback(null);

    setCv((current) => {
      if (!current) return current;

      return {
        ...current,
        [field]: value,
      };
    });
  };

  const resetFileSelection = () => {
    setSelectedFile(null);
    setFileStage(hasFileCv ? 'ready' : 'idle');

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const switchCvMode = (mode: WorkerCvRow['cv_mode']) => {
    if (!cv || cv.cv_mode === mode) return;

    if (cv.cv_mode === 'manual' && hasUnsavedManualChanges) {
      const confirmed = window.confirm(
        'You have unsaved manual CV changes. Switch without saving them?',
      );

      if (!confirmed) return;
    }

    if (cv.cv_mode === 'file' && selectedFile) {
      const confirmed = window.confirm(
        'A file is selected but not uploaded. Discard the selection?',
      );

      if (!confirmed) return;
    }

    setManualFeedback(null);
    setFileFeedback(null);
    setSelectedFile(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    setCv((current) => {
      if (!current) return current;

      return {
        ...current,
        cv_mode: mode,
      };
    });

    if (mode === 'manual') {
      setManualFeedback({
        type: 'info',
        text: hasFileCv
          ? 'Your uploaded CV remains published until you save the manual CV.'
          : 'Complete the fields, then press Save CV.',
      });
    } else {
      setFileStage(hasFileCv ? 'ready' : 'idle');
      setFileFeedback({
        type: 'info',
        text: hasManualCv
          ? 'Your manual CV remains published until a new file is uploaded successfully.'
          : 'Choose a file first, then press Upload CV.',
      });
    }
  };

  const workerCvPaths = (currentCv: WorkerCvRow | null) => {
    if (!worker || currentCv?.storage_provider === 'r2') return [];

    const canonicalPaths = CV_EXTENSIONS.map(
      (extension) => `${worker.id}/cv.${extension}`,
    );
    const currentPath = getStoredObjectPath(currentCv?.cv_file_url || null);

    return Array.from(
      new Set(
        [...canonicalPaths, currentPath].filter(
          (value): value is string => Boolean(value),
        ),
      ),
    );
  };

  const removeStorageFiles = async (paths: string[]) => {
    if (!paths.length) return null;

    const { error: removeError } = await supabase.storage
      .from(CV_BUCKET)
      .remove(paths);

    return removeError?.message || null;
  };

  const removeStoredCvFile = async (currentCv: WorkerCvRow | null) => {
    if (!currentCv?.cv_file_url) return null;

    try {
      if (
        currentCv.storage_provider === 'r2' &&
        currentCv.object_key
      ) {
        await deleteFileFromR2(currentCv.object_key);
        return null;
      }

      return removeStorageFiles(workerCvPaths(currentCv));
    } catch (error) {
      return error instanceof Error
        ? error.message
        : 'The stored CV file could not be removed.';
    }
  };

  const saveManualCv = async () => {
    if (!cv || !worker) return;

    if (!hasManualCvContent(cv)) {
      setManualFeedback({
        type: 'error',
        text: 'Add at least one CV detail before saving.',
      });
      return;
    }

    setSaving(true);
    setPageError('');
    setManualFeedback({
      type: 'info',
      text: 'Saving your manual CV...',
    });

    const previousCv = cv;

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
      setManualFeedback({
        type: 'error',
        text: `The CV was not saved: ${saveError.message}`,
      });
      setSaving(false);
      return;
    }

    const savedCv = data as WorkerCvRow;
    setCv(savedCv);
    setSavedManualSignature(manualCvSignature(savedCv));

    const cleanupError = await removeStoredCvFile(previousCv);

    setSelectedFile(null);
    setFileStage('idle');

    if (cleanupError) {
      setManualFeedback({
        type: 'warning',
        text: `Manual CV saved, but an old uploaded file could not be removed: ${cleanupError}`,
      });
    } else {
      setManualFeedback({
        type: 'success',
        text: 'Manual CV saved successfully. Any previous uploaded CV file was removed.',
      });
    }

    setSaving(false);
  };

  const selectCvFile = (file: File | null) => {
    setFileFeedback(null);

    if (!file) {
      resetFileSelection();
      return;
    }

    const fileType = getFileType(file.name);
    const hasAllowedExtension = CV_EXTENSIONS.includes(
      fileType as (typeof CV_EXTENSIONS)[number],
    );
    const hasAllowedMime =
      !file.type || allowedMimeTypes.includes(file.type);

    if (!hasAllowedExtension || !hasAllowedMime) {
      setSelectedFile(null);
      setFileStage('error');
      setFileFeedback({
        type: 'error',
        text: 'Only PDF, DOC, or DOCX files are allowed.',
      });

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setSelectedFile(null);
      setFileStage('error');
      setFileFeedback({
        type: 'error',
        text: 'The selected file is larger than 10 MB.',
      });

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    setSelectedFile(file);
    setFileStage('selected');
    setFileFeedback({
      type: 'info',
      text: 'File selected. Press Upload CV to publish it.',
    });
  };

  const uploadCvFile = async () => {
    if (!selectedFile || !worker || !cv) return;

    const file = selectedFile;
    const fileType = getFileType(file.name);

    setUploading(true);
    setPageError('');
    setFileStage('uploading');
    setFileFeedback({
      type: 'info',
      text: 'Uploading the selected file...',
    });

    const previousCv = cv;
    let uploadedObjectKey: string | null = null;
    let uploadedPublicUrl: string | null = null;

    try {
      const uploaded = await uploadFileToR2(file, 'worker-cv');
      uploadedObjectKey = uploaded.objectKey;
      uploadedPublicUrl = uploaded.publicUrl;
    } catch (uploadError) {
      setFileStage('error');
      setFileFeedback({
        type: 'error',
        text: `Upload failed: ${
          uploadError instanceof Error
            ? uploadError.message
            : 'Unknown upload error.'
        }`,
      });
      setUploading(false);

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    setFileStage('saving');
    setFileFeedback({
      type: 'info',
      text: 'File uploaded. Saving CV information...',
    });

    const payload = {
      worker_id: worker.id,
      cv_mode: 'file' as const,
      ...manualCvClearPayload,
      cv_file_url: uploadedPublicUrl,
      cv_file_name: file.name,
      cv_file_type: fileType,
      cv_file_mime_type: file.type || null,
      cv_file_uploaded_at: new Date().toISOString(),
      storage_provider: 'r2',
      object_key: uploadedObjectKey,
    };

    const { data, error: updateError } = await supabase
      .from('worker_cv')
      .upsert(payload, { onConflict: 'worker_id' })
      .select('*')
      .single();

    if (updateError) {
      if (uploadedObjectKey) {
        try {
          await deleteFileFromR2(uploadedObjectKey);
        } catch (cleanupError) {
          console.error('Unable to remove failed CV upload:', cleanupError);
        }
      }

      setFileStage('error');
      setFileFeedback({
        type: 'error',
        text: `The file uploaded, but its CV information could not be saved: ${updateError.message}`,
      });
      setUploading(false);

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    const savedCv = data as WorkerCvRow;
    setCv(savedCv);
    setSavedManualSignature(manualCvSignature(savedCv));

    const cleanupError =
      previousCv.object_key !== uploadedObjectKey
        ? await removeStoredCvFile(previousCv)
        : null;

    setSelectedFile(null);
    setFileStage('ready');

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    if (cleanupError) {
      setFileFeedback({
        type: 'warning',
        text: `CV uploaded and published, but an older file could not be removed: ${cleanupError}`,
      });
    } else {
      setFileFeedback({
        type: 'success',
        text: 'CV uploaded, saved, and published successfully.',
      });
    }

    setUploading(false);
  };

  const deleteCv = async () => {
    if (!worker || !cv) return;

    const confirmed = window.confirm(
      'Delete the current CV and its uploaded file permanently?',
    );

    if (!confirmed) return;

    setDeleting(true);
    setPageError('');

    const activeFeedback: Feedback = {
      type: 'info',
      text: 'Deleting the CV and its uploaded file...',
    };

    if (cv.cv_mode === 'file') {
      setFileFeedback(activeFeedback);
    } else {
      setManualFeedback(activeFeedback);
    }

    const previousCv = cv;

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
      const feedback: Feedback = {
        type: 'error',
        text: `The CV record could not be cleared: ${deleteError.message}`,
      };

      if (cv.cv_mode === 'file') {
        setFileFeedback(feedback);
      } else {
        setManualFeedback(feedback);
      }

      setDeleting(false);
      return;
    }

    const cleanupError = await removeStoredCvFile(previousCv);

    const clearedCv = data as WorkerCvRow;
    setCv(clearedCv);
    setSavedManualSignature(manualCvSignature(clearedCv));
    setSelectedFile(null);
    setFileStage('idle');

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    setManualFeedback({
      type: cleanupError ? 'warning' : 'success',
      text: cleanupError
        ? `CV deleted, but its stored file needs manual cleanup: ${cleanupError}`
        : 'CV deleted successfully.',
    });
    setFileFeedback(null);
    setDeleting(false);
  };

  const operationInProgress = saving || uploading || deleting;

  if (loading) {
    return (
      <main className="min-h-screen bg-white px-4 py-6 text-slate-900">
        <div className="mx-auto max-w-6xl rounded-3xl border border-slate-200 p-6">
          Loading CV...
        </div>
      </main>
    );
  }

  if (pageError && !worker) {
    return (
      <main className="min-h-screen bg-white px-4 py-6 text-slate-900">
        <div className="mx-auto max-w-6xl rounded-3xl border border-red-200 bg-red-50 p-6 text-red-700">
          {pageError}
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
          <p className="mt-2 max-w-3xl text-sm font-semibold text-slate-600">
            Choose one method. Your current CV remains published until the new
            manual CV is saved or a new file is uploaded successfully.
          </p>
        </section>

        {pageError ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-800">
            {pageError}
          </div>
        ) : null}

        <section className="grid gap-4 lg:grid-cols-2">
          <button
            type="button"
            onClick={() => switchCvMode('manual')}
            disabled={operationInProgress}
            className={`rounded-3xl border p-5 text-left shadow-sm transition disabled:cursor-not-allowed disabled:opacity-60 ${
              cv.cv_mode === 'manual'
                ? 'border-sky-300 bg-sky-50 ring-4 ring-sky-50'
                : 'border-slate-200 bg-white hover:border-sky-200'
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-lg font-black text-slate-950">
                Write CV manually
              </p>
              <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-600">
                {cv.cv_mode === 'manual' ? 'Selected' : 'Choose'}
              </span>
            </div>
            <p className="mt-2 text-sm font-semibold text-slate-600">
              Complete clearly labelled professional fields. Nothing is
              replaced until you press Save CV.
            </p>
          </button>

          <button
            type="button"
            onClick={() => switchCvMode('file')}
            disabled={operationInProgress}
            className={`rounded-3xl border p-5 text-left shadow-sm transition disabled:cursor-not-allowed disabled:opacity-60 ${
              cv.cv_mode === 'file'
                ? 'border-sky-300 bg-sky-50 ring-4 ring-sky-50'
                : 'border-slate-200 bg-white hover:border-sky-200'
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-lg font-black text-slate-950">
                Upload CV file
              </p>
              <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-600">
                {cv.cv_mode === 'file' ? 'Selected' : 'Choose'}
              </span>
            </div>
            <p className="mt-2 text-sm font-semibold text-slate-600">
              Select PDF, DOC, or DOCX first. The current CV stays published
              until upload and saving both succeed.
            </p>
          </button>
        </section>

        {cv.cv_mode === 'manual' ? (
          <section className="space-y-4 rounded-[32px] border border-sky-100 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.25em] text-slate-500">
                  Manual CV
                </p>
                <h2 className="mt-1 text-2xl font-black text-slate-950">
                  Professional details
                </h2>
                <p className="mt-1 text-sm font-semibold text-slate-600">
                  Every field has a permanent label, so the form remains clear
                  while you write.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full px-3 py-2 text-xs font-black ${
                    hasUnsavedManualChanges
                      ? 'bg-amber-50 text-amber-800'
                      : 'bg-emerald-50 text-emerald-800'
                  }`}
                >
                  {saving
                    ? 'Saving...'
                    : hasUnsavedManualChanges
                      ? 'Unsaved changes'
                      : 'All changes saved'}
                </span>

                {hasAnyCv ? (
                  <button
                    type="button"
                    onClick={deleteCv}
                    disabled={operationInProgress}
                    className="rounded-full bg-red-600 px-5 py-2 text-sm font-black text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {deleting ? 'Deleting...' : 'Delete CV'}
                  </button>
                ) : null}

                <button
                  type="button"
                  onClick={saveManualCv}
                  disabled={operationInProgress || !hasUnsavedManualChanges}
                  className="rounded-full bg-slate-950 px-5 py-2 text-sm font-black text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save CV'}
                </button>
              </div>
            </div>

            <FeedbackBox feedback={manualFeedback} />

            <div className="rounded-3xl border border-slate-100 bg-slate-50/60 p-4">
              <SectionHeading
                eyebrow="Section 1"
                title="Personal information"
                description="Basic identity details shown in the manual CV."
              />

              <div className="grid gap-4 md:grid-cols-2">
                <Field label="First name">
                  <input
                    value={cv.first_name || ''}
                    onChange={(event) =>
                      updateCvField('first_name', event.target.value)
                    }
                    placeholder="Enter first name"
                    className={inputClassName}
                  />
                </Field>

                <Field label="Last name">
                  <input
                    value={cv.last_name || ''}
                    onChange={(event) =>
                      updateCvField('last_name', event.target.value)
                    }
                    placeholder="Enter last name"
                    className={inputClassName}
                  />
                </Field>

                <Field label="Age">
                  <input
                    type="number"
                    min={16}
                    max={100}
                    value={cv.age ?? ''}
                    onChange={(event) =>
                      updateCvField(
                        'age',
                        event.target.value ? Number(event.target.value) : null,
                      )
                    }
                    placeholder="Enter age"
                    className={inputClassName}
                  />
                </Field>

                <Field label="Nationality">
                  <input
                    value={cv.nationality || ''}
                    onChange={(event) =>
                      updateCvField('nationality', event.target.value)
                    }
                    placeholder="Enter nationality"
                    className={inputClassName}
                  />
                </Field>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-100 bg-slate-50/60 p-4">
              <SectionHeading
                eyebrow="Section 2"
                title="Professional information"
                description="Role, specialty, experience, availability, and preferred work."
              />

              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Profession">
                  <input
                    value={cv.profession || ''}
                    onChange={(event) =>
                      updateCvField('profession', event.target.value)
                    }
                    placeholder="Example: Electrician"
                    className={inputClassName}
                  />
                </Field>

                <Field label="Specialty">
                  <input
                    value={cv.specialty || ''}
                    onChange={(event) =>
                      updateCvField('specialty', event.target.value)
                    }
                    placeholder="Enter specialty"
                    className={inputClassName}
                  />
                </Field>

                <Field label="Experience">
                  <textarea
                    value={cv.experience || ''}
                    onChange={(event) =>
                      updateCvField('experience', event.target.value)
                    }
                    placeholder="Describe your experience"
                    rows={3}
                    className={`${inputClassName} resize-y`}
                  />
                </Field>

                <Field label="Work type">
                  <input
                    value={cv.work_type || ''}
                    onChange={(event) =>
                      updateCvField('work_type', event.target.value)
                    }
                    placeholder="Full-time, part-time, freelance..."
                    className={inputClassName}
                  />
                </Field>

                <Field label="Availability">
                  <input
                    value={cv.availability || ''}
                    onChange={(event) =>
                      updateCvField('availability', event.target.value)
                    }
                    placeholder="Available now, weekends..."
                    className={inputClassName}
                  />
                </Field>

                <Field label="Working hours">
                  <input
                    value={cv.working_hours || ''}
                    onChange={(event) =>
                      updateCvField('working_hours', event.target.value)
                    }
                    placeholder="Example: Monday-Friday, 08:00-17:00"
                    className={inputClassName}
                  />
                </Field>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-100 bg-slate-50/60 p-4">
              <SectionHeading
                eyebrow="Section 3"
                title="Education and qualifications"
                description="Education, certificates, licenses, and professional training."
              />

              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Education">
                  <textarea
                    value={cv.education || ''}
                    onChange={(event) =>
                      updateCvField('education', event.target.value)
                    }
                    placeholder="Schools, diplomas, degrees..."
                    rows={3}
                    className={`${inputClassName} resize-y`}
                  />
                </Field>

                <Field label="Certificates">
                  <textarea
                    value={cv.certificates || ''}
                    onChange={(event) =>
                      updateCvField('certificates', event.target.value)
                    }
                    placeholder="List relevant certificates"
                    rows={3}
                    className={`${inputClassName} resize-y`}
                  />
                </Field>

                <Field label="Licenses">
                  <textarea
                    value={cv.licenses || ''}
                    onChange={(event) =>
                      updateCvField('licenses', event.target.value)
                    }
                    placeholder="Driving or professional licenses"
                    rows={3}
                    className={`${inputClassName} resize-y`}
                  />
                </Field>

                <Field label="Training">
                  <textarea
                    value={cv.training || ''}
                    onChange={(event) =>
                      updateCvField('training', event.target.value)
                    }
                    placeholder="Courses and professional training"
                    rows={3}
                    className={`${inputClassName} resize-y`}
                  />
                </Field>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-100 bg-slate-50/60 p-4">
              <SectionHeading
                eyebrow="Section 4"
                title="Skills and languages"
                description="Languages, practical skills, tools, and equipment you can use."
              />

              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Languages">
                  <textarea
                    value={cv.languages || ''}
                    onChange={(event) =>
                      updateCvField('languages', event.target.value)
                    }
                    placeholder="Example: French - fluent, Dutch - basic"
                    rows={3}
                    className={`${inputClassName} resize-y`}
                  />
                </Field>

                <Field label="Skills">
                  <textarea
                    value={cv.skills || ''}
                    onChange={(event) =>
                      updateCvField('skills', event.target.value)
                    }
                    placeholder="List your strongest skills"
                    rows={3}
                    className={`${inputClassName} resize-y`}
                  />
                </Field>

                <div className="md:col-span-2">
                  <Field label="Tools and equipment">
                    <textarea
                      value={cv.tools_equipment || ''}
                      onChange={(event) =>
                        updateCvField('tools_equipment', event.target.value)
                      }
                      placeholder="Tools, machines, vehicles, software..."
                      rows={3}
                      className={`${inputClassName} resize-y`}
                    />
                  </Field>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-100 bg-slate-50/60 p-4">
              <SectionHeading
                eyebrow="Section 5"
                title="Work history"
                description="Previous work, service areas, and a professional summary."
              />

              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Previous work">
                  <textarea
                    value={cv.previous_work || ''}
                    onChange={(event) =>
                      updateCvField('previous_work', event.target.value)
                    }
                    placeholder="Employers, projects, or completed jobs"
                    rows={4}
                    className={`${inputClassName} resize-y`}
                  />
                </Field>

                <Field label="Work areas">
                  <textarea
                    value={cv.work_areas || ''}
                    onChange={(event) =>
                      updateCvField('work_areas', event.target.value)
                    }
                    placeholder="Cities or regions where you work"
                    rows={4}
                    className={`${inputClassName} resize-y`}
                  />
                </Field>

                <div className="md:col-span-2">
                  <Field label="Professional summary">
                    <textarea
                      value={cv.professional_summary || ''}
                      onChange={(event) =>
                        updateCvField(
                          'professional_summary',
                          event.target.value,
                        )
                      }
                      placeholder="Write a short professional introduction"
                      rows={5}
                      className={`${inputClassName} resize-y`}
                    />
                  </Field>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-100 bg-slate-50/60 p-4">
              <SectionHeading
                eyebrow="Section 6"
                title="Contact information"
                description="Contact details included in the manual CV."
              />

              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Full address">
                  <textarea
                    value={cv.full_address || ''}
                    onChange={(event) =>
                      updateCvField('full_address', event.target.value)
                    }
                    placeholder="Enter your full address"
                    rows={3}
                    className={`${inputClassName} resize-y`}
                  />
                </Field>

                <Field label="Phone number">
                  <input
                    type="tel"
                    value={cv.phone || ''}
                    onChange={(event) =>
                      updateCvField('phone', event.target.value)
                    }
                    placeholder="Enter phone number"
                    className={inputClassName}
                  />
                </Field>
              </div>
            </div>

            <div className="sticky bottom-3 z-10 flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-slate-200 bg-white/95 p-4 shadow-lg backdrop-blur">
              <div>
                <p className="text-sm font-black text-slate-950">
                  {saving
                    ? 'Saving your CV...'
                    : hasUnsavedManualChanges
                      ? 'You have unsaved changes'
                      : 'Your manual CV is saved'}
                </p>
                <p className="text-xs font-semibold text-slate-500">
                  Saving a manual CV replaces and removes the uploaded file.
                </p>
              </div>

              <button
                type="button"
                onClick={saveManualCv}
                disabled={operationInProgress || !hasUnsavedManualChanges}
                className="rounded-full bg-[#29b9f3] px-6 py-3 text-sm font-black text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save CV'}
              </button>
            </div>
          </section>
        ) : (
          <section className="space-y-4 rounded-[32px] border border-sky-100 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.25em] text-slate-500">
                  CV File
                </p>
                <h2 className="mt-1 text-2xl font-black text-slate-950">
                  Upload PDF, DOC, or DOCX
                </h2>
                <p className="mt-1 text-sm font-semibold text-slate-600">
                  Select the file first. Upload starts only after you press the
                  Upload CV button.
                </p>
              </div>

              <span
                className={`rounded-full px-4 py-2 text-xs font-black ${
                  fileStage === 'ready'
                    ? 'bg-emerald-50 text-emerald-800'
                    : fileStage === 'error'
                      ? 'bg-red-50 text-red-800'
                      : fileStage === 'uploading' || fileStage === 'saving'
                        ? 'bg-sky-50 text-sky-800'
                        : 'bg-slate-100 text-slate-700'
                }`}
              >
                {stageLabels[fileStage]}
              </span>
            </div>

            <FeedbackBox feedback={fileFeedback} />

            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              className="hidden"
              disabled={operationInProgress}
              onChange={(event) =>
                selectCvFile(event.target.files?.[0] || null)
              }
            />

            <div className="rounded-3xl border border-dashed border-sky-200 bg-sky-50 p-6 text-center">
              <p className="text-lg font-black text-slate-950">
                {selectedFile
                  ? 'A new CV file is ready to upload'
                  : hasFileCv
                    ? 'Choose a replacement file'
                    : 'Choose your CV file'}
              </p>
              <p className="mt-2 text-sm font-semibold text-slate-600">
                PDF, DOC, or DOCX · Maximum 10 MB
              </p>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={operationInProgress}
                className="mt-4 rounded-full border border-sky-200 bg-white px-6 py-3 text-sm font-black text-slate-800 transition hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {hasFileCv ? 'Choose replacement' : 'Choose file'}
              </button>
            </div>

            {selectedFile ? (
              <div className="rounded-3xl border border-sky-200 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">
                      Selected file
                    </p>
                    <p className="mt-2 break-all text-lg font-black text-slate-950">
                      {selectedFile.name}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-600">
                      {getFileType(selectedFile.name).toUpperCase()} ·{' '}
                      {formatFileSize(selectedFile.size)}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={resetFileSelection}
                    disabled={operationInProgress}
                    className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  >
                    Remove selection
                  </button>
                </div>

                <div className="mt-4 grid gap-2 sm:grid-cols-3">
                  <div className="rounded-2xl bg-slate-50 p-3 text-center">
                    <p className="text-xs font-bold text-slate-500">Step 1</p>
                    <p className="mt-1 text-sm font-black text-slate-900">
                      File selected
                    </p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-3 text-center">
                    <p className="text-xs font-bold text-slate-500">Step 2</p>
                    <p className="mt-1 text-sm font-black text-slate-900">
                      Upload file
                    </p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-3 text-center">
                    <p className="text-xs font-bold text-slate-500">Step 3</p>
                    <p className="mt-1 text-sm font-black text-slate-900">
                      Publish CV
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={uploadCvFile}
                  disabled={operationInProgress}
                  className="mt-4 w-full rounded-2xl bg-[#29b9f3] px-5 py-3 text-sm font-black text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {fileStage === 'uploading'
                    ? 'Uploading file...'
                    : fileStage === 'saving'
                      ? 'Saving CV information...'
                      : 'Upload CV'}
                </button>
              </div>
            ) : null}

            {hasFileCv ? (
              <div className="rounded-3xl border border-emerald-200 bg-emerald-50/40 p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">
                        Current published CV
                      </p>
                      <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-800">
                        Published
                      </span>
                    </div>

                    <p className="mt-3 break-all text-xl font-black text-slate-950">
                      {cv.cv_file_name || 'CV file'}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm font-semibold text-slate-600">
                      <span>
                        Type: {cv.cv_file_type?.toUpperCase() || 'FILE'}
                      </span>
                      <span>
                        Uploaded: {formatUploadedDate(cv.cv_file_uploaded_at)}
                      </span>
                    </div>
                  </div>

                  <span className="rounded-2xl bg-white px-4 py-3 text-sm font-black text-emerald-800 shadow-sm">
                    CV ready
                  </span>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  <a
                    href={cv.cv_file_url || '#'}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-center text-sm font-black text-slate-800 transition hover:bg-slate-50"
                  >
                    Open CV
                  </a>

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={operationInProgress}
                    className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm font-black text-slate-800 transition hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Replace file
                  </button>

                  <button
                    type="button"
                    onClick={deleteCv}
                    disabled={operationInProgress}
                    className="rounded-2xl bg-red-600 px-4 py-3 text-sm font-black text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {deleting ? 'Deleting...' : 'Delete CV'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 text-center">
                <p className="text-base font-black text-slate-900">
                  No CV file is published yet
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-600">
                  Select a supported file, review its name and size, then press
                  Upload CV.
                </p>
              </div>
            )}
          </section>
        )}
      </div>
    </main>
  );
}
