'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useUser } from '@/hooks/useUser'
import { signOut } from '@/services/userService'

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
  const [searchValue, setSearchValue] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Clear search input when navigating away from the leads page
  useEffect(() => {
    if (!pathname.startsWith('/leads')) setSearchValue('')
  }, [pathname])

  // Close user menu on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    if (menuOpen) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [menuOpen])

  async function handleLogout() {
    await signOut()
    router.push('/login')
    router.refresh()
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    const q = searchValue.trim()
    if (!q) return
    router.push(`/leads?search=${encodeURIComponent(q)}`)
  }

  const displayName = user?.name ?? 'User'
  const initials = getInitials(displayName)

  return (
    <header className="h-14 bg-white border-b border-slate-200 flex items-center px-4 md:px-6 gap-3">
      {/* Mobile logo (sidebar is hidden on mobile) */}
      <div className="md:hidden flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#2563EB] to-[#1D4ED8] flex items-center justify-center">
          <span className="text-white text-[10px] font-bold">SP</span>
        </div>
      </div>

      {/* Global search */}
      <form onSubmit={handleSearch} className="flex-1 max-w-md">
        <div className="relative">
          <svg
            className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
          </svg>
          <input
            type="text"
            placeholder="Search leads…"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            className="w-full h-9 pl-9 pr-3 bg-slate-50 border border-transparent rounded-lg text-sm text-slate-700 placeholder:text-slate-400 focus:bg-white focus:border-slate-300 focus:ring-2 focus:ring-[#2563EB]/15 focus:outline-none transition-colors"
          />
        </div>
      </form>

      <div className="flex-1" />

      {/* User menu */}
      <div className="relative" ref={menuRef}>
        <button
          type="button"
          onClick={() => setMenuOpen((o) => !o)}
          className="flex items-center gap-2 h-9 pl-1.5 pr-2.5 rounded-lg hover:bg-slate-100 transition-colors"
        >
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#2563EB] to-[#1D4ED8] text-white text-[11px] font-bold flex items-center justify-center select-none">
            {initials}
          </div>
          <span className="text-sm font-medium text-slate-700 hidden sm:block">{displayName}</span>
          <svg className="w-3.5 h-3.5 text-slate-400 hidden sm:block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {menuOpen && (
          <div className="absolute right-0 top-full mt-1 w-56 bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden z-[9999]">
            <div className="px-3 py-2.5 border-b border-slate-100">
              <p className="text-sm font-medium text-slate-900 truncate">{displayName}</p>
              <p className="text-xs text-slate-500 truncate capitalize">{user?.role ?? 'rep'}</p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="w-full px-3 py-2 text-sm text-left text-slate-600 hover:bg-slate-50 hover:text-red-600 transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Sign out
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
