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

export default function AdminUsersPage() {
  const { user: currentUser, loading: currentLoading } = useUser()
  const [users, setUsers] = useState<AppUser[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)

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
      <h1 className="text-2xl font-bold text-[var(--color-brand-primary)] mb-6">Team Management</h1>

      {users.length === 0 ? (
        <EmptyState title="No users yet" description="Users appear here after their first login." />
      ) : (
        <div className="space-y-4">
          {users.map((u) => (
            <div key={u.id} className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <p className="font-semibold text-gray-900">{u.name ?? 'Unnamed'}</p>
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
    </div>
  )
}
