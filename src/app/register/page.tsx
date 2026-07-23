'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'RENTER' | 'HOST'>('RENTER');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const res = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, role })
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error?.formErrors?.[0] || data.error || 'Registration failed.');
      setLoading(false);
      return;
    }

    const signInResult = await signIn('credentials', { email, password, redirect: false });
    setLoading(false);

    if (signInResult?.error) {
      router.push('/login');
      return;
    }

    router.push('/');
    router.refresh();
  }

  return (
    <div className="max-w-md mx-auto bg-white p-8 rounded-xl border mt-8">
      <h1 className="text-2xl font-bold mb-6">Create your account</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Full name</label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border rounded-md px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border rounded-md px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Password</label>
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border rounded-md px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">I want to</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as 'RENTER' | 'HOST')}
            className="w-full border rounded-md px-3 py-2"
          >
            <option value="RENTER">Rent cars</option>
            <option value="HOST">List my car(s)</option>
          </select>
        </div>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-brand-600 text-white rounded-md py-2 font-medium hover:bg-brand-700 disabled:opacity-50"
        >
          {loading ? 'Creating account...' : 'Sign up'}
        </button>
      </form>
      <p className="text-sm text-gray-500 mt-4">
        Already have an account?{' '}
        <Link href="/login" className="text-brand-600 font-medium">
          Log in
        </Link>
      </p>
    </div>
  );
}
