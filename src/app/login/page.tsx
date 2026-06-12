'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { ensureUserProfile } from '@/services/userService'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    if (data.user) {
      const name = data.user.user_metadata?.full_name ?? email.split('@')[0]
      await ensureUserProfile(data.user.id, name)
    }

    router.push('/')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm">
        {/* Logo + title */}
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#2563EB] to-[#1D4ED8] flex items-center justify-center shadow-sm mb-4">
            <span className="text-white font-bold text-sm tracking-tight">SP</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Welcome back</h1>
          <p className="text-sm text-slate-500 mt-1">Sign in to sortmyprepCRM</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-10 border border-slate-200 rounded-lg px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15 transition-colors"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-10 border border-slate-200 rounded-lg px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15 transition-colors"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold h-10 rounded-lg text-sm transition-colors disabled:opacity-60"
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>

        <p className="text-xs text-slate-400 text-center mt-6">
          Internal CRM · sortmyprep
        </p>
      </div>
    </div>
  )
}
