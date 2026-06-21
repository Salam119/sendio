'use client';

import { ReactNode, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

type WorkerDashboardLayoutProps = {
  children: ReactNode;
};

type WorkerPublicLinkData = {
  id: string;
  slug: string | null;
};

function getWorkerPublicHref(worker: WorkerPublicLinkData) {
  const identifier = worker.slug?.trim() || worker.id;

  return `/workers/${encodeURIComponent(identifier)}`;
}

export default function WorkerDashboardLayout({
  children,
}: WorkerDashboardLayoutProps) {
  const router = useRouter();

  const [workerPublicHref, setWorkerPublicHref] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadWorkerPublicLink() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        if (isMounted) {
          setWorkerPublicHref(null);
        }

        return;
      }

      const { data } = await supabase
        .from('workers')
        .select('id, slug')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!isMounted) return;

      if (!data) {
        setWorkerPublicHref(null);
        return;
      }

      setWorkerPublicHref(getWorkerPublicHref(data as WorkerPublicLinkData));
    }

    loadWorkerPublicLink();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace('/login');
  };

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-4">
          <button
            type="button"
            onClick={() => router.push('/')}
            className="rounded-full border px-4 py-2 text-sm font-medium hover:bg-gray-100"
          >
            Back
          </button>

          <div className="text-center">
            <h1 className="text-lg font-semibold">Worker Dashboard</h1>
            <p className="text-xs text-gray-500">Manage your worker profile</p>
          </div>

          <div className="flex items-center gap-2">
            {workerPublicHref ? (
              <button
                type="button"
                onClick={() => router.push(workerPublicHref)}
                className="rounded-full bg-green-700 px-4 py-2 text-sm font-medium text-white hover:bg-green-800"
              >
                View Website
              </button>
            ) : null}

            <button
              type="button"
              onClick={handleLogout}
              className="rounded-full bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 py-6">{children}</section>
    </main>
  );
}