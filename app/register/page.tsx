'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

type UserType = 'client' | 'worker' | 'company';

export default function RegisterPage() {
  const router = useRouter();

  const [userType, setUserType] = useState<UserType>('client');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  async function handleRegister(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    const formData = new FormData(e.currentTarget);

    const email = String(formData.get('email') || '').trim();
    const password = String(formData.get('password') || '');
    const confirmPassword = String(formData.get('confirmPassword') || '');
    const fullName = String(formData.get('fullName') || '').trim();

    if (password !== confirmPassword) {
      alert('Passwords do not match!');
      setLoading(false);
      return;
    }

    const redirectTo = `${window.location.origin}/auth/callback`;

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectTo,
        data: {
          full_name: fullName,
          user_type: userType,
        },
      },
    });

    if (error) {
      alert(error.message);
      setLoading(false);
      return;
    }

    const userId = data.user?.id;

    if (userId && userType === 'company') {
      const { error: companyError } = await supabase
        .from('companies')
        .insert([
          {
            user_id: userId,
            name: fullName,
            email,
            status: 'available',
            views: 0,
            connections: 0,
            rating: 0,
            reviews_count: 0,
          },
        ]);

      if (companyError) {
        alert(companyError.message);
        setLoading(false);
        return;
      }
    }

    if (data.session) {
      if (userType === 'company') {
        router.replace('/dashboard/company');
      } else if (userType === 'worker') {
        router.replace('/dashboard/worker');
      } else {
        router.replace('/');
      }

      return;
    }

    setMessage(
      'Account created. Please confirm your email. After confirmation, you will enter directly.'
    );

    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-[#fefcf5] flex items-center justify-center p-4">
      <div className="max-w-sm w-full bg-white rounded-3xl shadow-xl overflow-hidden border border-[#e2cfbc]">
        <div className="bg-gradient-to-br from-[#c49a6c] to-[#a57c52] p-6 text-center text-white">
          <h1 className="text-xl font-bold">
            Create Account
          </h1>

          <p className="text-xs opacity-85 mt-2">
            Join Sendio today
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

          <div className="flex bg-[#f5f0ea] p-1 rounded-full mb-5">
            {(['client', 'worker', 'company'] as UserType[]).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setUserType(type)}
                className={`flex-1 py-2 rounded-full text-sm font-semibold capitalize transition-all ${
                  userType === type
                    ? 'bg-[#c49a6c] text-white shadow-md'
                    : 'text-[#5a4a3a]'
                }`}
              >
                {type}
              </button>
            ))}
          </div>

          <form onSubmit={handleRegister} className="space-y-3">
            <input
              name="fullName"
              placeholder="Full name"
              className="w-full px-5 py-3 border border-[#e2cfbc] rounded-full focus:outline-none focus:ring-2 focus:ring-[#c49a6c]"
              required
            />

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

            <input
              name="confirmPassword"
              type="password"
              placeholder="Confirm password"
              className="w-full px-5 py-3 border border-[#e2cfbc] rounded-full focus:outline-none focus:ring-2 focus:ring-[#c49a6c]"
              required
            />

            <button
              disabled={loading}
              className="w-full bg-[#c49a6c] text-white py-3 rounded-full font-bold hover:bg-[#a57c52] transition-colors disabled:opacity-60"
            >
              {loading ? 'Processing...' : 'Create Account →'}
            </button>
          </form>

          {message && (
            <p className="text-center text-sm text-[#0b5b2f] mt-4 font-medium">
              {message}
            </p>
          )}

          <p className="text-center text-sm text-[#5a6e4a] mt-5">
            Already have an account?{' '}
            <a href="/login" className="text-[#c49a6c] font-bold">
              Sign In
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}