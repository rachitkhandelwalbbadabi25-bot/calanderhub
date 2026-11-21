import React, { useState } from 'react';
import { CalendarDays, Lock, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react';
import { loginWithId, signUpMember } from '../lib/api';
import { isFirebaseConfigured } from '../lib/firebase';

const DEMO_ACCOUNTS = [
  { label: "Sushmita Ma'am", role: 'GS Control', username: 'sushmita', pass: 'admin123', dot: 'bg-violet-500' },
  { label: 'General Secretary', role: 'GS Control', username: 'gs_head', pass: 'gs123', dot: 'bg-indigo-500' },
  { label: 'Core Council', role: 'Full Power', username: 'core_council', pass: 'core123', dot: 'bg-amber-500' },
  { label: 'Media Lead', role: 'Media Only', username: 'media_user', pass: 'media123', dot: 'bg-rose-500' },
  { label: 'Operations Lead', role: 'Tech Only', username: 'ops_user', pass: 'ops123', dot: 'bg-sky-500' },
];

export default function AuthScreen({ onAuthenticated }) {
  const [mode, setMode] = useState('signin'); // 'signin' | 'signup'
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [title, setTitle] = useState('');
  const [department, setDepartment] = useState('Media');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user =
        mode === 'signin'
          ? await loginWithId(username, password)
          : await signUpMember({ username, password, name, department, title });
      onAuthenticated(user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function fillDemo(acc) {
    setMode('signin');
    setUsername(acc.username);
    setPassword(acc.pass);
    setError('');
  }

  return (
    <div className="min-h-screen bg-[#F7F8FA] flex flex-col lg:flex-row">
      {/* Left: Crisp Architectural Product Preview */}
      <div className="lg:w-[52%] bg-white border-b lg:border-b-0 lg:border-r border-zinc-200 p-8 sm:p-12 lg:p-16 flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-2.5 mb-12">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
              <CalendarDays className="w-4 h-4" />
            </div>
            <span className="font-display font-bold text-base text-zinc-950">CouncilFlow</span>
            <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-600">
              Firebase Live Sync
            </span>
          </div>

          <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-zinc-950 tracking-tight leading-[1.12] max-w-md">
            One shared calendar.
            <span className="text-indigo-600 block mt-1">Clear accountability.</span>
          </h1>
          <p className="text-sm text-zinc-500 mt-4 max-w-md leading-relaxed">
            Media, Operations (Tech), and Core Council stay on the exact same page — with scoped edit
            permissions and a live GS Control audit log.
          </p>

          {/* Realistic Mini Calendar & Audit Preview */}
          <div className="mt-10 rounded-xl border border-zinc-200 bg-zinc-50/70 p-4 max-w-lg shadow-xs">
            <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-zinc-200/80">
              <span className="text-xs font-semibold text-zinc-900">Today&apos;s Shared Schedule</span>
              <div className="flex items-center gap-2 text-[11px] font-medium">
                <span className="inline-flex items-center gap-1 text-rose-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500" /> Media
                </span>
                <span className="inline-flex items-center gap-1 text-sky-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-500" /> Operations
                </span>
                <span className="inline-flex items-center gap-1 text-amber-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Core
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between bg-white px-3 py-2 rounded-lg border border-zinc-200/80 border-l-[3px] border-l-rose-500">
                <div>
                  <p className="text-xs font-semibold text-zinc-900">TechFest Teaser Reel Shoot</p>
                  <p className="text-[11px] text-zinc-500">14:00 – 16:30 • Kabir Nair</p>
                </div>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-rose-50 text-rose-700">
                  Media
                </span>
              </div>

              <div className="flex items-center justify-between bg-white px-3 py-2 rounded-lg border border-zinc-200/80 border-l-[3px] border-l-sky-500">
                <div>
                  <p className="text-xs font-semibold text-zinc-900">QR Check-in &amp; Portal Deploy</p>
                  <p className="text-[11px] text-zinc-500">17:00 – 19:00 • Devansh Patel</p>
                </div>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-sky-50 text-sky-700">
                  Operations
                </span>
              </div>

              <div className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-indigo-50/70 border border-indigo-100 text-[11px] text-indigo-900">
                <span className="inline-flex items-center gap-1.5 font-medium">
                  <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                  GS Control: Logged edit by Aarav Sharma
                </span>
                <span className="text-indigo-600 font-mono text-[10px]">Live</span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick-Fill Role Bar */}
        <div className="mt-10 pt-6 border-t border-zinc-200/80">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-3">
            Quick-fill role credentials
          </p>
          <div className="flex flex-wrap gap-2">
            {DEMO_ACCOUNTS.map((acc) => (
              <button
                key={acc.username}
                type="button"
                onClick={() => fillDemo(acc)}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 hover:border-zinc-300 text-xs font-medium text-zinc-800 transition cursor-pointer"
              >
                <span className={`w-2 h-2 rounded-full ${acc.dot}`} />
                <span>{acc.label}</span>
                <span className="text-[10px] text-zinc-400">({acc.role})</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Right: Clean Auth Form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-sm">
          {!isFirebaseConfigured && (
            <div className="mb-5 p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-1.5">
              <div className="flex items-center gap-1.5 font-semibold">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                Firebase Config Needed
              </div>
              <p className="text-[11px] text-amber-800 leading-relaxed">
                Add your Firebase Web App keys to <code className="font-mono bg-amber-100 px-1 rounded">.env.local</code> (or Vercel Environment Variables) and enable <strong>Email/Password</strong> in Firebase Auth + <strong>Firestore</strong>.
              </p>
            </div>
          )}

          <div className="mb-7">
            <h2 className="font-display text-2xl font-bold text-zinc-950">
              {mode === 'signin' ? 'Sign in' : 'Create your ID'}
            </h2>
            <p className="text-xs text-zinc-500 mt-1">
              {mode === 'signin'
                ? 'Use your team ID (or email) and password to access the calendar.'
                : 'New accounts are tracked in the team accountability log.'}
            </p>
          </div>

          <div className="grid grid-cols-2 p-1 rounded-lg bg-zinc-200/70 mb-6">
            <button
              type="button"
              onClick={() => {
                setMode('signin');
                setError('');
              }}
              className={`py-1.5 text-xs font-semibold rounded-md transition cursor-pointer ${
                mode === 'signin' ? 'bg-white text-zinc-950 shadow-xs' : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('signup');
                setError('');
              }}
              className={`py-1.5 text-xs font-semibold rounded-md transition cursor-pointer ${
                mode === 'signup' ? 'bg-white text-zinc-950 shadow-xs' : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              Sign Up
            </button>
          </div>

          {error && (
            <div className="mb-4 px-3.5 py-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-zinc-700 mb-1">Full Name</label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Ananya Roy"
                      className="w-full px-3 py-2 rounded-lg border border-zinc-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-700 mb-1">Role / Title</label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Video Editor"
                      className="w-full px-3 py-2 rounded-lg border border-zinc-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-700 mb-1">Track</label>
                  <div className="grid grid-cols-2 gap-2">
                    {['Media', 'Operations'].map((dept) => (
                      <button
                        key={dept}
                        type="button"
                        onClick={() => setDepartment(dept)}
                        className={`py-2 px-3 rounded-lg border text-xs font-semibold transition cursor-pointer ${
                          department === dept
                            ? dept === 'Media'
                              ? 'border-rose-500 bg-rose-50 text-rose-700'
                              : 'border-sky-500 bg-sky-50 text-sky-700'
                            : 'border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50'
                        }`}
                      >
                        {dept === 'Media' ? 'Media' : 'Operations (Tech)'}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1">User ID or Email</label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="sushmita or name@college.edu"
                className="w-full px-3 py-2 rounded-lg border border-zinc-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1">Password</label>
              <div className="relative">
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 rounded-lg border border-zinc-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 pr-9"
                />
                <Lock className="w-3.5 h-3.5 text-zinc-400 absolute right-3 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !isFirebaseConfigured}
              className="w-full py-2.5 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm flex items-center justify-center gap-2 transition disabled:opacity-60 cursor-pointer shadow-xs"
            >
              {loading ? 'Authenticating...' : mode === 'signin' ? 'Continue' : 'Create Account'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
