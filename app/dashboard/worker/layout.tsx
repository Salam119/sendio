'use client';

import { ReactNode, useEffect, useRef, useState } from 'react';
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

type WorkerMenu = 'profile' | 'manage' | 'requests' | 'account' | null;

function getWorkerPublicHref(worker: WorkerPublicLinkData) {
  const identifier = worker.slug?.trim() || worker.id;

  return `/workers/${encodeURIComponent(identifier)}`;
}

export default function WorkerDashboardLayout({
  children,
}: WorkerDashboardLayoutProps) {
  const router = useRouter();

  const [workerPublicHref, setWorkerPublicHref] = useState<string | null>(null);
  const [openMenu, setOpenMenu] = useState<WorkerMenu>(null);

  const menuAreaRef = useRef<HTMLDivElement | null>(null);

  function toggleMenu(menu: Exclude<WorkerMenu, null>) {
    setOpenMenu((current) => (current === menu ? null : menu));
  }

  function closeMenus() {
    setOpenMenu(null);
  }

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

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        menuAreaRef.current &&
        !menuAreaRef.current.contains(event.target as Node)
      ) {
        setOpenMenu(null);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpenMenu(null);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  const handleLogout = async () => {
    closeMenus();
    await supabase.auth.signOut();
    router.replace('/login');
  };

  const dropdownButtonClass =
    'flex h-[34px] min-w-24 items-center justify-center rounded-full bg-[#23a7f1] px-[14px] text-[13px] font-bold text-white shadow-sm transition hover:bg-[#168ed1]';

  const dropdownMenuClass =
    'absolute right-0 top-[42px] z-50 min-w-52 overflow-hidden rounded-2xl border border-gray-100 bg-white py-2 text-sm shadow-xl';

  const dropdownItemClass =
    'block w-full px-4 py-2 text-left font-semibold text-gray-700 hover:bg-[#e8f9f2]';
  return (
    <main className="min-h-screen bg-gray-50 text-gray-900">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-lg font-semibold">Worker Dashboard</h1>
              <p className="text-xs text-gray-500">
                Manage your worker profile
              </p>
            </div>

            <div ref={menuAreaRef} className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => toggleMenu('profile')}
                  aria-expanded={openMenu === 'profile'}
                  className={dropdownButtonClass}
                >
                  Profile ▼
                </button>

                {openMenu === 'profile' ? (
                  <div className={dropdownMenuClass}>
                    {workerPublicHref ? (
                      <Link
                        href={workerPublicHref}
                        onClick={closeMenus}
                        className={dropdownItemClass}
                      >
                        View Public Profile
                      </Link>
                    ) : null}

                    <Link
                      href="/dashboard/worker#basic-info"
                      onClick={closeMenus}
                      className={dropdownItemClass}
                    >
                      Edit Profile
                    </Link>

                    <Link
                      href="/dashboard/worker#profile-photo"
                      onClick={closeMenus}
                      className={dropdownItemClass}
                    >
                      Upload Profile Photo
                    </Link>

                    <Link
                      href="/dashboard/worker#profile-completion"
                      onClick={closeMenus}
                      className={dropdownItemClass}
                    >
                      Profile Completion
                    </Link>
                  </div>
                ) : null}
              </div>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => toggleMenu('manage')}
                  aria-expanded={openMenu === 'manage'}
                  className={dropdownButtonClass}
                >
                  Manage ▼
                </button>

                {openMenu === 'manage' ? (
                  <div className={dropdownMenuClass}>
                    <Link
                      href="/dashboard/worker#services"
                      onClick={closeMenus}
                      className={dropdownItemClass}
                    >
                      Services
                    </Link>

                    <Link
                      href="/dashboard/worker#skills"
                      onClick={closeMenus}
                      className={dropdownItemClass}
                    >
                      Skills
                    </Link>

                    <Link
                      href="/dashboard/worker#media-management"
                      onClick={closeMenus}
                      className={dropdownItemClass}
                    >
                      Achievements Gallery
                    </Link>

                    <Link
                      href="/dashboard/worker#reviews"
                      onClick={closeMenus}
                      className={dropdownItemClass}
                    >
                      Reviews
                    </Link>
                  </div>
                ) : null}
              </div>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => toggleMenu('requests')}
                  aria-expanded={openMenu === 'requests'}
                  className={dropdownButtonClass}
                >
                  Requests ▼
                </button>

                {openMenu === 'requests' ? (
                  <div className={dropdownMenuClass}>
                    <Link
                      href="/dashboard/worker#latest-requests"
                      onClick={closeMenus}
                      className={dropdownItemClass}
                    >
                      Latest Requests
                    </Link>

                    <Link
                      href="/dashboard/worker/requests"
                      onClick={closeMenus}
                      className={dropdownItemClass}
                    >
                      Open All Requests
                    </Link>

                    <Link
                      href="/dashboard/worker/requests"
                      onClick={closeMenus}
                      className={dropdownItemClass}
                    >
                      Unread Requests
                    </Link>

                    <Link
                      href="/dashboard/worker/requests"
                      onClick={closeMenus}
                      className={dropdownItemClass}
                    >
                      Archived Requests
                    </Link>
                  </div>
                ) : null}
              </div>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => toggleMenu('account')}
                  aria-expanded={openMenu === 'account'}
                  className={dropdownButtonClass}
                >
                  Account ▼
                </button>

                {openMenu === 'account' ? (
                  <div className={dropdownMenuClass}>
                    <Link
                      href="/dashboard/worker"
                      onClick={closeMenus}
                      className={dropdownItemClass}
                    >
                      Dashboard Home
                    </Link>

                    <Link
                      href="/"
                      onClick={closeMenus}
                      className={dropdownItemClass}
                    >
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
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </header>
      <section className="mx-auto max-w-6xl px-4 py-6">{children}</section>
    </main>
  );
}