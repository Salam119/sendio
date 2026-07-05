'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

type PageState =
  | 'checking'
  | 'blocked-company'
  | 'needs-worker-profile'
  | 'error';

export default function UploadCvStartPage() {
  const router = useRouter();

  const [state, setState] = useState<PageState>('checking');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function routeUploadCvUser() {
      setState('checking');
      setError(null);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        router.replace('/login?next=/upload-cv');
        return;
      }

      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (companyError) {
        setError(companyError.message);
        setState('error');
        return;
      }

      if (companyData?.id) {
        setState('blocked-company');
        return;
      }

      const { data: workerData, error: workerError } = await supabase
        .from('workers')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (workerError) {
        setError(workerError.message);
        setState('error');
        return;
      }

      if (workerData?.id) {
        router.replace('/dashboard/worker/cv');
        return;
      }

      setState('needs-worker-profile');
    }

    const timer = window.setTimeout(() => {
      routeUploadCvUser();
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [router]);

  return (
    <main className="min-h-screen bg-white px-4 py-10 text-slate-950">
      <section className="mx-auto max-w-xl rounded-3xl border border-[#dbeafe] bg-[#eef6ff] p-6 shadow-sm">
        {state === 'checking' ? (
          <>
            <h1 className="text-2xl font-black">Checking your account...</h1>
            <p className="mt-2 text-sm font-bold text-slate-600">
              Sendio is preparing the correct CV upload path.
            </p>
          </>
        ) : null}

        {state === 'needs-worker-profile' ? (
          <>
            <h1 className="text-2xl font-black">
              Create your worker profile first.
            </h1>

            <p className="mt-2 text-sm font-bold text-slate-600">
              To upload a CV, you need a worker profile. Create your worker page
              first, then return to upload your CV.
            </p>

            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                href="/dashboard/worker"
                className="inline-flex h-11 items-center justify-center rounded-full bg-[#23a7f1] px-5 text-sm font-black text-white"
              >
                Create Worker Profile
              </Link>

              <Link
                href="/services"
                className="inline-flex h-11 items-center justify-center rounded-full bg-white px-5 text-sm font-black text-slate-700"
              >
                Back to Services
              </Link>
            </div>
          </>
        ) : null}

        {state === 'blocked-company' ? (
          <>
            <h1 className="text-2xl font-black text-red-700">
              CV upload is only for workers.
            </h1>

            <p className="mt-2 text-sm font-bold text-slate-600">
              This account is connected to a company profile, so it cannot upload
              a worker CV.
            </p>

            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                href="/dashboard/company"
                className="inline-flex h-11 items-center justify-center rounded-full bg-[#23a7f1] px-5 text-sm font-black text-white"
              >
                Company Dashboard
              </Link>

              <Link
                href="/services"
                className="inline-flex h-11 items-center justify-center rounded-full bg-white px-5 text-sm font-black text-slate-700"
              >
                Back to Services
              </Link>
            </div>
          </>
        ) : null}

        {state === 'error' ? (
          <>
            <h1 className="text-2xl font-black text-red-700">
              Upload CV could not start.
            </h1>

            <p className="mt-2 rounded-2xl bg-red-50 p-3 text-sm font-bold text-red-700">
              {error || 'Unknown error.'}
            </p>

            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                href="/dashboard/worker"
                className="inline-flex h-11 items-center justify-center rounded-full bg-[#23a7f1] px-5 text-sm font-black text-white"
              >
                Worker Dashboard
              </Link>

              <Link
                href="/services"
                className="inline-flex h-11 items-center justify-center rounded-full bg-white px-5 text-sm font-black text-slate-700"
              >
                Back to Services
              </Link>
            </div>
          </>
        ) : null}
      </section>
    </main>
  );
}