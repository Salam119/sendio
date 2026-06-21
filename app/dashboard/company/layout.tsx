'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { CompanyProvider } from '@/context/CompanyContext';

type CompanyDashboardLayoutProps = {
  children: React.ReactNode;
};

export default function CompanyDashboardLayout({
  children,
}: CompanyDashboardLayoutProps) {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    async function checkSession() {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error || !user) {
        router.replace('/login');
        return;
      }

      const userType = user.user_metadata?.user_type;

      if (userType !== 'company') {
        router.replace('/');
        return;
      }

      setChecking(false);
    }

    checkSession();
  }, [router]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace('/');
  }

  function handleBack() {
    router.back();
  }

  if (checking) {
    return (
      <div className="min-h-screen bg-[#fefcf5] flex items-center justify-center">
        <p className="text-[#2c3e2f] font-semibold">
          Checking session...
        </p>
      </div>
    );
  }

  return (
    <CompanyProvider>
      <div className="min-h-screen bg-[#fefcf5] flex">
        <aside className="w-72 bg-white border-r border-[#e2cfbc] shadow-sm">
          <div className="p-6 border-b border-[#e2cfbc]">
            <h1 className="text-2xl font-extrabold text-[#8b5a2b]">
              SENDIO
            </h1>

            <p className="text-sm text-gray-500 mt-1">
              Company Dashboard
            </p>
          </div>

          <nav className="p-4 space-y-2">
            <Link href="/dashboard/company" className="block px-4 py-3 rounded-xl hover:bg-[#f6efe7] text-[#2c3e2f] font-medium">
              Dashboard
            </Link>

            <Link href="/dashboard/company/services" className="block px-4 py-3 rounded-xl hover:bg-[#f6efe7] text-[#2c3e2f] font-medium">
              Services
            </Link>

            <Link href="/dashboard/company/projects" className="block px-4 py-3 rounded-xl hover:bg-[#f6efe7] text-[#2c3e2f] font-medium">
              Projects
            </Link>

            <Link href="/dashboard/company/gallery" className="block px-4 py-3 rounded-xl hover:bg-[#f6efe7] text-[#2c3e2f] font-medium">
              Gallery
            </Link>

            <Link href="/dashboard/company/articles" className="block px-4 py-3 rounded-xl hover:bg-[#f6efe7] text-[#2c3e2f] font-medium">
              Articles
            </Link>

            <Link href="/dashboard/company/reviews" className="block px-4 py-3 rounded-xl hover:bg-[#f6efe7] text-[#2c3e2f] font-medium">
              Reviews
            </Link>

            <Link href="/dashboard/company/messages" className="block px-4 py-3 rounded-xl hover:bg-[#f6efe7] text-[#2c3e2f] font-medium">
              Messages
            </Link>

            <Link href="/dashboard/company/ads" className="block px-4 py-3 rounded-xl hover:bg-[#f6efe7] text-[#2c3e2f] font-medium">
              Ads
            </Link>

            <Link href="/dashboard/company/analytics" className="block px-4 py-3 rounded-xl hover:bg-[#f6efe7] text-[#2c3e2f] font-medium">
              Analytics
            </Link>

            <Link href="/dashboard/company/settings" className="block px-4 py-3 rounded-xl hover:bg-[#f6efe7] text-[#2c3e2f] font-medium">
              Settings
            </Link>
          </nav>
        </aside>

        <div className="flex-1 flex flex-col">
          <header className="bg-white border-b border-[#e2cfbc] px-8 py-5 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-[#2c3e2f]">
                Company Dashboard
              </h2>

              <p className="text-sm text-gray-500">
                Manage your company profile and content
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleBack}
                className="px-4 py-2 rounded-xl border border-[#e2cfbc] hover:bg-[#f6efe7]"
              >
                Back
              </button>

              <Link
                href="/"
                className="px-4 py-2 rounded-xl border border-[#e2cfbc] hover:bg-[#f6efe7]"
              >
                View Website
              </Link>

              <button
                type="button"
                onClick={handleLogout}
                className="px-4 py-2 rounded-xl bg-red-600 text-white hover:opacity-90"
              >
                Logout
              </button>
            </div>
          </header>

          <main className="flex-1 p-8">
            {children}
          </main>
        </div>
      </div>
    </CompanyProvider>
  );
}