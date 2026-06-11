'use client'

import { useRouter, usePathname } from 'next/navigation'
import { useUser } from '@/hooks/useUser'
import { signOut } from '@/services/userService'

const PAGE_NAMES: Record<string, string> = {
  '/': 'Map',
  '/leads': 'Leads',
  '/import': 'Import',
  '/scripts': 'Scripts',
  '/admin/users': 'Admin',
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0] ?? '')
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

export default function TopBar() {
  const router = useRouter()
  const pathname = usePathname()
  const { user } = useUser()

  const pageTitle = PAGE_NAMES[pathname] ?? 'Dashboard'

  async function handleLogout() {
    await signOut()
    router.push('/login')
    router.refresh()
  }

  const displayName = user?.name ?? 'User'
  const initials = getInitials(displayName)

  return (
    <header className="h-14 bg-white border-b border-slate-200 shadow-sm flex items-center justify-between px-6">
      <h1 className="text-lg font-semibold text-slate-800">{pageTitle}</h1>
      <div className="flex items-center gap-3">
        {user && (
          <span className="text-sm text-slate-500">{displayName}</span>
        )}
        <div className="w-8 h-8 rounded-full bg-[#2E86AB] text-white text-xs font-bold flex items-center justify-center select-none">
          {initials}
        </div>
        <button
          onClick={handleLogout}
          aria-label="Logout"
          className="text-slate-400 hover:text-red-500 transition-colors p-1"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </button>
      </div>
    </header>
  )
}
