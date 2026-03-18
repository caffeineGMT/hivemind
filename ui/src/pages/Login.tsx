import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface LoginProps {
  onLogin: (user: any, token: string) => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const endpoint = isSignup ? '/api/auth/signup' : '/api/auth/login';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Authentication failed');
        return;
      }

      // Call parent callback with user data and token
      onLogin(data.user, data.token);

      // Navigate to dashboard
      navigate('/');
    } catch (err) {
      setError('Network error. Please try again.');
      console.error('[auth] Error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 px-4">
      <div className="w-full max-w-md">
        {/* Logo/Brand */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-amber-400">Hivemind Engine</h1>
          <p className="mt-2 text-zinc-400">Autonomous AI Company Orchestrator</p>
        </div>

        {/* Auth Card */}
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-8 shadow-2xl backdrop-blur-sm">
          <div className="mb-6">
            <h2 className="text-2xl font-semibold text-zinc-100">
              {isSignup ? 'Create Account' : 'Welcome Back'}
            </h2>
            <p className="mt-1 text-sm text-zinc-400">
              {isSignup
                ? 'Start your free account'
                : 'Sign in to manage your companies'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-zinc-300">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-800 px-4 py-2 text-zinc-100 placeholder-zinc-500 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                placeholder="you@example.com"
              />
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-zinc-300">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-800 px-4 py-2 text-zinc-100 placeholder-zinc-500 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                placeholder="••••••••"
              />
              {isSignup && (
                <p className="mt-1 text-xs text-zinc-500">
                  At least 8 characters with uppercase, lowercase, and number
                </p>
              )}
            </div>

            {/* Error Message */}
            {error && (
              <div className="rounded-md border border-red-900/50 bg-red-950/20 px-4 py-2 text-sm text-red-400">
                {error}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-md bg-amber-500 px-4 py-2 font-semibold text-zinc-900 transition-colors hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? 'Please wait...' : isSignup ? 'Sign Up' : 'Sign In'}
            </button>
          </form>

          {/* Toggle Mode */}
          <div className="mt-6 text-center text-sm">
            <button
              onClick={() => {
                setIsSignup(!isSignup);
                setError('');
              }}
              className="text-amber-400 hover:text-amber-300"
            >
              {isSignup
                ? 'Already have an account? Sign in'
                : "Don't have an account? Sign up"}
            </button>
          </div>

          {/* Tier Info for Signup */}
          {isSignup && (
            <div className="mt-6 space-y-3 rounded-md border border-zinc-800 bg-zinc-800/50 p-4">
              <h3 className="text-sm font-semibold text-zinc-300">Free Tier Includes:</h3>
              <ul className="space-y-1 text-xs text-zinc-400">
                <li>• 1 project</li>
                <li>• 2 AI agents</li>
                <li>• $10/month API budget</li>
                <li>• Full dashboard & analytics</li>
              </ul>
              <p className="text-xs text-zinc-500">
                Upgrade anytime for more projects, agents, and budget.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-xs text-zinc-600">
          <p>$1M revenue target • Production-ready infrastructure</p>
        </div>
      </div>
    </div>
  );
}
