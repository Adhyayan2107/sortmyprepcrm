'use client'

import { useEffect, useState } from 'react'
import { AppUser, UserRole } from '@/types/user.types'
import { getAllUsers, updateUser } from '@/services/userService'
import { useUser } from '@/hooks/useUser'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import EmptyState from '@/components/ui/EmptyState'

const ALL_COUNTRIES = [
  'UAE', 'Saudi Arabia', 'Qatar', 'Kuwait', 'Bahrain',
  'Oman', 'Jordan', 'Egypt', 'Lebanon',
]

const INPUT_CLS = 'border border-gray-300 rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-[#2563EB]'

function InviteModal({ onClose, onInvited }: { onClose: () => void; onInvited: (u: AppUser) => void }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<UserRole>('rep')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !email.trim()) { setError('Name and email are required'); return }
    setSaving(true)
    setError(null)
    const res = await fetch('/api/admin/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), email: email.trim(), role }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error ?? 'Invite failed'); setSaving(false); return }
    onInvited({ id: data.id, name: name.trim(), role, countries: null })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="text-base font-semibold text-slate-800">Invite User</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Name *</label>
            <input className={INPUT_CLS} value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Email *</label>
            <input type="email" className={INPUT_CLS} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="user@sortmyprep.com" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Role</label>
            <select className={INPUT_CLS} value={role} onChange={(e) => setRole(e.target.value as UserRole)}>
              <option value="rep">Rep</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <p className="text-xs text-slate-400">An invite email will be sent. The user sets their own password.</p>
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="px-4 py-2 rounded-lg text-sm font-medium bg-[#2563EB] text-white hover:bg-[#1D4ED8] disabled:opacity-60">
              {saving ? 'Sending…' : 'Send Invite'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function AdminUsersPage() {
  const { user: currentUser, loading: currentLoading } = useUser()
  const [users, setUsers] = useState<AppUser[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [showInvite, setShowInvite] = useState(false)

  useEffect(() => {
    getAllUsers().then((res) => {
      if (res.success) setUsers(res.data)
      setLoading(false)
    })
  }, [])

  async function handleRoleChange(id: string, role: UserRole) {
    setSaving(id)
    const res = await updateUser(id, { role })
    if (res.success) {
      setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, role } : u)))
    }
    setSaving(null)
  }

  async function toggleCountry(user: AppUser, country: string) {
    const current = user.countries ?? []
    const updated = current.includes(country)
      ? current.filter((c) => c !== country)
      : [...current, country]
    setSaving(user.id)
    const res = await updateUser(user.id, { countries: updated })
    if (res.success) {
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, countries: updated } : u))
      )
    }
    setSaving(null)
  }

  if (currentLoading || loading) return <LoadingSpinner />

  if (currentUser?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Admin access required.</p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[var(--color-brand-primary)]">Team Management</h1>
        <button
          onClick={() => setShowInvite(true)}
          className="px-4 py-2 rounded-lg text-sm font-semibold bg-[#2563EB] text-white hover:bg-[#1D4ED8] transition-colors"
        >
          + Invite User
        </button>
      </div>

      {users.length === 0 ? (
        <EmptyState title="No users yet" description="Users appear here after their first login." />
      ) : (
        <div className="space-y-4">
          {users.map((u) => (
            <div key={u.id} className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-gray-900">{u.name ?? 'Unnamed'}</p>
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                      u.role === 'admin' ? 'bg-violet-100 text-violet-700' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {u.role}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">{u.id}</p>
                </div>

                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-500">Role:</label>
                  <select
                    value={u.role}
                    disabled={saving === u.id}
                    onChange={(e) => handleRoleChange(u.id, e.target.value as UserRole)}
                    className="border border-gray-300 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-accent)] disabled:opacity-60"
                  >
                    <option value="rep">Rep</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>

              <div className="mt-4">
                <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Assigned Countries</p>
                <div className="flex flex-wrap gap-2">
                  {ALL_COUNTRIES.map((country) => {
                    const active = (u.countries ?? []).includes(country)
                    return (
                      <button
                        key={country}
                        disabled={saving === u.id}
                        onClick={() => toggleCountry(u, country)}
                        className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors disabled:opacity-60 ${
                          active
                            ? 'bg-[var(--color-brand-accent)] text-white border-[var(--color-brand-accent)]'
                            : 'bg-white text-gray-600 border-gray-300 hover:border-[var(--color-brand-accent)]'
                        }`}
                      >
                        {country}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showInvite && (
        <InviteModal
          onClose={() => setShowInvite(false)}
          onInvited={(u) => setUsers((prev) => [u, ...prev])}
        />
      )}
    </div>
  )
}
