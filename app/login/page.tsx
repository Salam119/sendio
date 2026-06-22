'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

type UserType = 'client' | 'worker' | 'company';

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);

    const email = String(formData.get('email') || '').trim();
    const password = String(formData.get('password') || '');

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.user) {
      alert(error?.message || 'Login failed');
      setLoading(false);
      return;
    }

    const userType =
      data.user.user_metadata?.user_type as UserType | undefined;

    if (userType === 'company') {
      router.replace('/dashboard/company');
    } else if (userType === 'worker') {
      router.replace('/dashboard/worker');
    } else {
      router.replace('/');
    }
  }

  return (
    <div className="min-h-screen bg-[#fefcf5] flex items-center justify-center p-4">
      <div className="max-w-sm w-full bg-white rounded-3xl shadow-xl overflow-hidden border border-[#e2cfbc]">
        <div className="bg-gradient-to-br from-[#c49a6c] to-[#a57c52] p-6 text-center text-white">
          <h1 className="text-xl font-bold">Welcome Back</h1>

          <p className="text-xs opacity-85 mt-2">
            Sign in to your account
          </p>
        </div>

        <div className="p-6">
          <button
            type="button"
            onClick={() => router.push('/')}
            className="mb-4 text-sm font-semibold text-[#8b5a2b]"
          >
            ← Back
          </button>

          <form onSubmit={handleLogin} className="space-y-3">
            <input
              name="email"
              type="email"
              placeholder="Email address"
              className="w-full px-5 py-3 border border-[#e2cfbc] rounded-full focus:outline-none focus:ring-2 focus:ring-[#c49a6c]"
              required
            />

            <input
              name="password"
              type="password"
              placeholder="Password"
              className="w-full px-5 py-3 border border-[#e2cfbc] rounded-full focus:outline-none focus:ring-2 focus:ring-[#c49a6c]"
              required
            />

            <button
              disabled={loading}
              className="w-full bg-[#c49a6c] text-white py-3 rounded-full font-bold hover:bg-[#a57c52] transition-colors disabled:opacity-60"
            >
              {loading ? 'Signing In...' : 'Sign In →'}
            </button>
          </form>

          <p className="text-center text-sm text-[#5a6e4a] mt-5">
            Don&apos;t have an account?{' '}
            <a href="/register" className="text-[#c49a6c] font-bold">
              Create Account
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}