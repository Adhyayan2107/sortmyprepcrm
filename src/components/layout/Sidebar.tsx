'use client'

import { Suspense, useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useSearchParams, useRouter } from 'next/navigation'
import { useUser } from '@/hooks/useUser'
import { signOut } from '@/services/userService'

type NavChild = { label: string; href: string; dot?: string }

type NavItem = {
  href: string
  label: string
  icon: React.ReactNode
  children?: NavChild[]
}

const ICON_CLS = 'w-[18px] h-[18px] shrink-0'

const SCRIPT_NAV_CHILDREN: NavChild[] = [
  { label: 'School',           href: '/scripts?type=School',           dot: 'bg-violet-500' },
  { label: 'Coaching Centers', href: '/scripts?type=Coaching+Center',  dot: 'bg-amber-500' },
  { label: 'Aggregator',       href: '/scripts?type=Aggregator',       dot: 'bg-cyan-500' },
  { label: 'Private Teacher',  href: '/scripts?type=Private+Teacher',  dot: 'bg-emerald-500' },
  { label: 'Career Counsellor',href: '/scripts?type=Career+Counsellor',dot: 'bg-rose-500' },
  { label: 'Parent',           href: '/scripts?type=Parent',           dot: 'bg-blue-400' },
]

const ADMIN_LEADS_CHILDREN: NavChild[] = [
  { label: 'All Leads',         href: '/leads' },
  { label: 'Schools',           href: '/leads?type=School',           dot: 'bg-violet-500' },
  { label: 'Tuition Centers',   href: '/leads?type=Tuition+Center',   dot: 'bg-amber-500' },
  { label: 'Private Teachers',  href: '/leads?type=Private+Teacher',  dot: 'bg-emerald-500' },
  { label: 'Aggregators',       href: '/leads?type=Aggregators',      dot: 'bg-cyan-500' },
]

const REP_LEADS_CHILDREN: NavChild[] = [
  { label: 'My Leads',          href: '/leads?view=mine' },
  { label: 'Schools',           href: '/leads?view=mine&type=School',           dot: 'bg-violet-500' },
  { label: 'Tuition Centers',   href: '/leads?view=mine&type=Tuition+Center',   dot: 'bg-amber-500' },
  { label: 'Private Teachers',  href: '/leads?view=mine&type=Private+Teacher',  dot: 'bg-emerald-500' },
  { label: 'Aggregators',       href: '/leads?view=mine&type=Aggregators',      dot: 'bg-cyan-500' },
]

const BASE_NAV: NavItem[] = [
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
  },
  {
    href: '/scripts', label: 'Scripts',
    icon: (
      <svg className={ICON_CLS} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    children: SCRIPT_NAV_CHILDREN,
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
            className={`flex items-center gap-2 py-1 px-2 rounded text-[13px] transition-colors ${
              childActive
                ? 'text-slate-900 bg-slate-100 font-medium'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            {child.dot && (
              <span className={`w-2 h-2 rounded-full shrink-0 ${child.dot}`} />
            )}
            {child.label}
          </Link>
        )
      })}
    </div>
  )
}

const CollapseIcon = ({ collapsed }: { collapsed: boolean }) => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    {collapsed ? (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
    ) : (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
    )}
  </svg>
)

const ImportIcon = () => (
  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
  </svg>
)

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user } = useUser()
  const isAdmin = user?.role === 'admin'

  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem('sidebar-collapsed')
    if (stored === 'true') setCollapsed(true)
  }, [])

  function toggleCollapse() {
    setCollapsed((prev) => {
      const next = !prev
      localStorage.setItem('sidebar-collapsed', String(next))
      return next
    })
  }

  async function handleSignOut() {
    await signOut()
    router.push('/login')
    router.refresh()
  }

  const navItems: NavItem[] = BASE_NAV.map((item) => {
    if (item.href === '/leads') {
      return {
        ...item,
        href: isAdmin ? '/leads' : '/leads?view=mine',
        children: isAdmin ? ADMIN_LEADS_CHILDREN : REP_LEADS_CHILDREN,
      }
    }
    return item
  })

  if (isAdmin) navItems.push(ADMIN_ITEM)

  return (
    <aside
      className={`hidden md:flex flex-col bg-white border-r border-slate-200 min-h-screen transition-all duration-200 ${
        collapsed ? 'w-14' : 'w-60'
      }`}
    >
      {/* Logo + collapse toggle */}
      <div className={`h-14 flex items-center border-b border-slate-200 shrink-0 ${collapsed ? 'justify-center px-2' : 'justify-between px-3'}`}>
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#2563EB] to-[#1D4ED8] flex items-center justify-center shadow-sm shrink-0">
            <span className="text-white text-[11px] font-bold tracking-tight">SP</span>
          </div>
          {!collapsed && (
            <span className="text-[14px] font-semibold text-slate-900 tracking-tight truncate">sortmyprepCRM</span>
          )}
        </div>
        {!collapsed && (
          <button
            onClick={toggleCollapse}
            className="text-slate-400 hover:text-slate-600 transition-colors shrink-0 p-1 rounded-md hover:bg-slate-100"
            title="Collapse sidebar"
          >
            <CollapseIcon collapsed={collapsed} />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto overflow-x-hidden">
        {/* Expand button in collapsed mode */}
        {collapsed && (
          <button
            onClick={toggleCollapse}
            className="w-full flex items-center justify-center p-2 mb-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors"
            title="Expand sidebar"
          >
            <CollapseIcon collapsed={collapsed} />
          </button>
        )}
        {navItems.map((item) => {
          const baseHref = item.href.split('?')[0]
          const active = pathname === baseHref || (baseHref !== '/' && pathname.startsWith(baseHref))
          return (
            <div key={item.href}>
              <Link
                href={item.href}
                title={collapsed ? item.label : undefined}
                className={`group flex items-center gap-2.5 px-2.5 py-2 rounded-md text-[13.5px] font-medium transition-colors ${
                  active
                    ? 'bg-[#EFF6FF] text-[#1D4ED8]'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                } ${collapsed ? 'justify-center px-0' : ''}`}
              >
                <span className={`shrink-0 ${active ? 'text-[#2563EB]' : 'text-slate-400 group-hover:text-slate-500'}`}>
                  {item.icon}
                </span>
                {!collapsed && <span>{item.label}</span>}
              </Link>
              {!collapsed && active && item.children && (
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
          title={collapsed ? 'Import Leads' : undefined}
          className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium border transition-colors ${
            pathname === '/import'
              ? 'bg-[#2563EB] text-white border-[#2563EB]'
              : 'border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300'
          } ${collapsed ? 'justify-center px-0 border-0' : ''}`}
        >
          <ImportIcon />
          {!collapsed && 'Import Leads'}
        </Link>
      </div>

      {/* Footer — user identity + sign out */}
      {user && (
        <div className={`border-t border-slate-200 shrink-0 ${collapsed ? 'px-2 py-3 flex justify-center' : 'px-3 py-3'}`}>
          {collapsed ? (
            <button
              onClick={handleSignOut}
              className="w-8 h-8 rounded-full bg-gradient-to-br from-[#2563EB] to-[#1D4ED8] text-white text-[10px] font-bold flex items-center justify-center hover:opacity-80 transition-opacity"
              title={`${user.name ?? 'User'} — Sign out`}
            >
              {(user.name ?? 'U').split(' ').map((p) => p[0] ?? '').slice(0, 2).join('').toUpperCase()}
            </button>
          ) : (
            <div className="flex items-center gap-2.5 group">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#2563EB] to-[#1D4ED8] text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                {(user.name ?? 'U').split(' ').map((p) => p[0] ?? '').slice(0, 2).join('').toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[12.5px] font-semibold text-slate-900 truncate leading-tight">{user.name ?? 'User'}</p>
                <p className="text-[11px] text-slate-400 truncate capitalize leading-tight">{user.role ?? 'rep'}</p>
              </div>
              <button
                onClick={handleSignOut}
                title="Sign out"
                className="text-slate-300 hover:text-red-500 transition-colors p-1 rounded-md hover:bg-red-50 opacity-0 group-hover:opacity-100"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          )}
        </div>
      )}
    </aside>
  )
}
