'use client';

import { ReactNode, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

type AdminDashboardLayoutProps = {
  children: ReactNode;
};

type AdminProfile = {
  role: string | null;
};

export default function AdminDashboardLayout({
  children,
}: AdminDashboardLayoutProps) {
  const router = useRouter();

  const [checkingAccess, setCheckingAccess] = useState(true);
  const [isAllowed, setIsAllowed] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function checkAdminAccess() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!isMounted) return;

      if (!user) {
        router.replace('/login');
        return;
      }

      const { data: profileData } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();

      if (!isMounted) return;

      const profile = profileData as AdminProfile | null;

      if (profile?.role !== 'admin' && profile?.role !== 'super_admin') {
        router.replace('/');
        return;
      }

      setIsAllowed(true);
      setCheckingAccess(false);
    }

    checkAdminAccess();

    return () => {
      isMounted = false;
    };
  }, [router]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace('/login');
  }

  if (checkingAccess || !isAllowed) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f6f3ef] text-[#173321]">
        <p className="font-semibold">Checking admin access...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f6f3ef] text-[#173321]">
      <header className="border-b border-[#e2d3bf] bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-4">
          <button
            type="button"
            onClick={() => router.push('/')}
            className="rounded-full border border-[#d8c3a5] px-4 py-2 text-sm font-bold text-[#173321] hover:bg-[#fbf8f3]"
          >
            Back
          </button>

          <div className="text-center">
            <h1 className="text-lg font-black text-[#0b5b2f]">
              Admin Dashboard
            </h1>
            <p className="text-xs font-semibold text-[#8b5a2b]">
              Manage Sendio platform
            </p>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="rounded-full bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700"
          >
            Logout
          </button>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 py-6">{children}</section>
    </main>
  );
}