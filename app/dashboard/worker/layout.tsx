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

function getWorkerPublicHref(worker: WorkerPublicLinkData) {
  const identifier = worker.slug?.trim() || worker.id;

  return `/workers/${encodeURIComponent(identifier)}`;
}

export default function WorkerDashboardLayout({
  children,
}: WorkerDashboardLayoutProps) {
  const router = useRouter();

  const [checking, setChecking] = useState(true);
  const [workerPublicHref, setWorkerPublicHref] = useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [menuNotice, setMenuNotice] = useState('');

  const menuAreaRef = useRef<HTMLDivElement | null>(null);

  function closeMenu() {
    setIsMenuOpen(false);
  }

  function handleFixProfileColors() {
    window.localStorage.setItem('sendio-worker-profile-theme-mode', 'fixed');
    window.localStorage.setItem('sendio-theme-mode', 'fixed');
    setMenuNotice('Profile colors fixed.');
    setIsMenuOpen(false);
  }

  useEffect(() => {
    let isMounted = true;

    async function checkSessionAndLoadWorker() {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error || !user) {
        router.replace('/login');
        return;
      }

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('user_type')
        .eq('id', user.id)
        .maybeSingle();

      if (profileError) {
        console.error('Profile lookup error:', profileError.message);
      }

      const userType =
        (profileData as { user_type: string | null } | null)?.user_type ??
        user.user_metadata?.user_type ??
        null;

      if (userType === 'company') {
        router.replace('/dashboard/company');
        return;
      }

      if (userType !== 'worker') {
        router.replace('/');
        return;
      }

      const { data } = await supabase
        .from('workers')
        .select('id, slug')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!isMounted) return;

      if (data) {
        setWorkerPublicHref(getWorkerPublicHref(data as WorkerPublicLinkData));
      } else {
        setWorkerPublicHref(null);
      }

      setChecking(false);
    }

    void checkSessionAndLoadWorker();

    return () => {
      isMounted = false;
    };
  }, [router]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        menuAreaRef.current &&
        !menuAreaRef.current.contains(event.target as Node)
      ) {
        setIsMenuOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsMenuOpen(false);
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
    closeMenu();
    await supabase.auth.signOut();
    router.replace('/login');
  };

  const menuItemClass =
    'block w-full px-4 py-2 text-left text-sm font-bold text-gray-700 hover:bg-[#e8f9f2]';

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <p className="text-sm font-semibold text-gray-700">
          Checking session...
        </p>
      </div>
    );
  }

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

            <div ref={menuAreaRef} className="relative flex items-center justify-end">
              <button
                type="button"
                onClick={() => setIsMenuOpen((current) => !current)}
                aria-expanded={isMenuOpen}
                aria-label="Open worker menu"
                className="flex h-11 w-11 items-center justify-center rounded-full bg-[#23a7f1] text-2xl font-black leading-none text-white shadow-sm transition hover:bg-[#168ed1]"
              >
                ☰
              </button>

              {isMenuOpen ? (
                <div className="absolute right-0 top-14 z-50 min-w-64 overflow-hidden rounded-3xl border border-gray-100 bg-white py-2 shadow-xl">
                  <Link
                    href="/dashboard/worker"
                    onClick={closeMenu}
                    className={menuItemClass}
                  >
                    Worker Dashboard
                  </Link>

                  {workerPublicHref ? (
                    <Link
                      href={workerPublicHref}
                      onClick={closeMenu}
                      className={menuItemClass}
                    >
                      Open Public Profile
                    </Link>
                  ) : null}

                  <Link
                    href="/dashboard/worker/requests"
                    onClick={closeMenu}
                    className={menuItemClass}
                  >
                    Requests
                  </Link>

                  <Link
                    href="/dashboard/worker/cv"
                    onClick={closeMenu}
                    className={menuItemClass}
                  >
                    CV
                  </Link>

                  <button
                    type="button"
                    onClick={handleFixProfileColors}
                    className={menuItemClass}
                  >
                    Fix Profile Colors
                  </button>

                  <Link href="/" onClick={closeMenu} className={menuItemClass}>
                    Back to Home
                  </Link>

                  <div className="my-2 border-t border-gray-100" />

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="block w-full px-4 py-2 text-left text-sm font-black text-red-600 hover:bg-red-50"
                  >
                    Logout
                  </button>
                </div>
              ) : null}
            </div>
          </div>

          {menuNotice ? (
            <div className="w-fit rounded-full border border-emerald-100 bg-emerald-50 px-4 py-2 text-xs font-black text-emerald-700">
              {menuNotice}
            </div>
          ) : null}
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 py-6">{children}</section>
    </main>
  );
}