'use client'

import { Suspense } from 'react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { useUser } from '@/hooks/useUser'
import { CONTACT_TYPES } from '@/lib/constants'

type NavChild = { label: string; href: string }

type NavItem = {
  href: string
  label: string
  icon: React.ReactNode
  children?: NavChild[]
}

const ICON_CLS = 'w-[18px] h-[18px] shrink-0'

const NAV_ITEMS: NavItem[] = [
  {
    href: '/', label: 'Map',
    icon: (
      <svg className={ICON_CLS} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
      </svg>
    ),
  },
  {
    href: '/leads', label: 'Leads',
    icon: (
      <svg className={ICON_CLS} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    children: [
      { label: 'All Leads', href: '/leads' },
      { label: 'My Leads', href: '/leads?view=mine' },
    ],
  },
  {
    href: '/scripts', label: 'Scripts',
    icon: (
      <svg className={ICON_CLS} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    children: CONTACT_TYPES.map((type) => ({
      label: type,
      href: `/scripts?type=${encodeURIComponent(type)}`,
    })),
  },
  {
    href: '/analytics', label: 'Analytics',
    icon: (
      <svg className={ICON_CLS} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    href: '/rankings', label: 'Rankings',
    icon: (
      <svg className={ICON_CLS} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
]

const ADMIN_ITEM: NavItem = {
  href: '/admin/users', label: 'Admin',
  icon: (
    <svg className={ICON_CLS} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
}

function SidebarChildLinks({ children }: { children: NavChild[] }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  function isChildActive(childHref: string): boolean {
    const url = new URL(childHref, 'http://x')
    if (url.pathname !== pathname) return false
    if (!url.search) return !searchParams.toString()
    let match = true
    url.searchParams.forEach((v, k) => { if (searchParams.get(k) !== v) match = false })
    return match
  }

  return (
    <div className="mt-0.5 ml-7 pl-3 border-l border-slate-200 space-y-0.5">
      {children.map((child) => {
        const childActive = isChildActive(child.href)
        return (
          <Link
            key={child.href}
            href={child.href}
            className={`block py-1 px-2 rounded text-[13px] transition-colors ${
              childActive
                ? 'text-slate-900 bg-slate-100 font-medium'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            {child.label}
          </Link>
        )
      })}
    </div>
  )
}

export default function Sidebar() {
  const pathname = usePathname()
  const { user } = useUser()

  const items = user?.role === 'admin' ? [...NAV_ITEMS, ADMIN_ITEM] : NAV_ITEMS

  return (
    <aside className="hidden md:flex flex-col w-60 bg-white border-r border-slate-200 min-h-screen">
      {/* Logo */}
      <div className="px-4 h-14 flex items-center border-b border-slate-200">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#2563EB] to-[#1D4ED8] flex items-center justify-center shadow-sm">
            <span className="text-white text-[11px] font-bold tracking-tight">SP</span>
          </div>
          <span className="text-[14px] font-semibold text-slate-900 tracking-tight">sortmyprepCRM</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        {items.map((item) => {
          const active = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
          return (
            <div key={item.href}>
              <Link
                href={item.href}
                className={`group flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-[13.5px] font-medium transition-colors ${
                  active
                    ? 'bg-slate-100 text-slate-900'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <span className={active ? 'text-[#2563EB]' : 'text-slate-400 group-hover:text-slate-500'}>
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </Link>
              {active && item.children && (
                <Suspense fallback={null}>
                  <SidebarChildLinks children={item.children} />
                </Suspense>
              )}
            </div>
          )
        })}
      </nav>

      {/* Import Leads button */}
      <div className="px-2 pb-2">
        <Link
          href="/import"
          className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium border transition-colors ${
            pathname === '/import'
              ? 'bg-[#2563EB] text-white border-[#2563EB]'
              : 'border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300'
          }`}
        >
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          Import Leads
        </Link>
      </div>

      {/* Footer — user identity strip */}
      {user && (
        <div className="px-3 py-3 border-t border-slate-200 flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-slate-900 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
            {(user.name ?? 'U').split(' ').map((p) => p[0] ?? '').slice(0, 2).join('').toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[12.5px] font-medium text-slate-900 truncate">{user.name ?? 'User'}</p>
            <p className="text-[11px] text-slate-400 truncate capitalize">{user.role ?? 'rep'}</p>
          </div>
        </div>
      )}
    </aside>
  )
}
