'use client';

import { ReactNode, useEffect, useState } from 'react';
import Link from 'next/link';
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

  const dropdownButtonClass =
    'flex h-[34px] min-w-24 items-center justify-center rounded-full bg-[#23a7f1] px-[14px] text-[13px] font-bold text-white shadow-sm transition hover:bg-[#168ed1]';
  const dropdownMenuClass =
    'absolute right-0 z-20 mt-2 min-w-52 overflow-hidden rounded-2xl border border-gray-100 bg-white py-2 text-sm shadow-xl';
  const dropdownItemClass =
    'block w-full px-4 py-2 text-left font-semibold text-gray-700 hover:bg-[#e8f9f2]';

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-lg font-semibold">Worker Dashboard</h1>
            <p className="text-xs text-gray-500">Manage your worker profile</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <details className="relative">
              <summary className={`${dropdownButtonClass} cursor-pointer list-none`}>
                Profile ▼
              </summary>
              <div className={dropdownMenuClass}>
                {workerPublicHref ? (
                  <Link href={workerPublicHref} className={dropdownItemClass}>
                    View Public Profile
                  </Link>
                ) : null}
                <Link href="/dashboard/worker#basic-info" className={dropdownItemClass}>
                  Edit Profile
                </Link>
                <Link href="/dashboard/worker#profile-photo" className={dropdownItemClass}>
                  Upload Profile Photo
                </Link>
                <Link href="/dashboard/worker#profile-completion" className={dropdownItemClass}>
                  Profile Completion
                </Link>
              </div>
            </details>

            <details className="relative">
              <summary className={`${dropdownButtonClass} cursor-pointer list-none`}>
                Manage ▼
              </summary>
              <div className={dropdownMenuClass}>
                <Link href="/dashboard/worker#services" className={dropdownItemClass}>
                  Services
                </Link>
                <Link href="/dashboard/worker#skills" className={dropdownItemClass}>
                  Skills
                </Link>
                <Link href="/dashboard/worker#media-management" className={dropdownItemClass}>
                  Achievements Gallery
                </Link>
                <Link href="/dashboard/worker#reviews" className={dropdownItemClass}>
                  Reviews
                </Link>
              </div>
            </details>

            <details className="relative">
              <summary className={`${dropdownButtonClass} cursor-pointer list-none`}>
                Requests ▼
              </summary>
              <div className={dropdownMenuClass}>
                <Link href="/dashboard/worker#latest-requests" className={dropdownItemClass}>
                  Latest Requests
                </Link>
                <Link href="/dashboard/worker/requests" className={dropdownItemClass}>
                  Open All Requests
                </Link>
                <Link href="/dashboard/worker/requests" className={dropdownItemClass}>
                  Unread Requests
                </Link>
                <Link href="/dashboard/worker/requests" className={dropdownItemClass}>
                  Archived Requests
                </Link>
              </div>
            </details>

            <details className="relative">
              <summary className={`${dropdownButtonClass} cursor-pointer list-none`}>
                Account ▼
              </summary>
              <div className={dropdownMenuClass}>
                <Link href="/dashboard/worker" className={dropdownItemClass}>
                  Dashboard Home
                </Link>
                <Link href="/" className={dropdownItemClass}>
                  Back to Home
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className={dropdownItemClass}
                >
                  Logout
                </button>
              </div>
            </details>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 py-6">{children}</section>
    </main>
  );
}
