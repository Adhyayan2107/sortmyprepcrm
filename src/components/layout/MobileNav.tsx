'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function MobileNav() {
  const pathname = usePathname()

  const items = [
    { href: '/', label: 'Map' },
    { href: '/leads', label: 'Leads' },
    { href: '/import', label: 'Import' },
  ]

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[var(--color-brand-primary)] flex border-t border-white/10 z-50">
      {items.map((item) => {
        const active = pathname === item.href
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex-1 py-3 text-xs font-medium text-center transition-colors ${
              active ? 'text-white bg-[var(--color-brand-accent)]' : 'text-white/60'
            }`}
          >
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
