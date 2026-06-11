'use client'

import { useRouter } from 'next/navigation'
import { useUser } from '@/hooks/useUser'
import { signOut } from '@/services/userService'

export default function TopBar() {
  const router = useRouter()
  const { user } = useUser()

  async function handleLogout() {
    await signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4">
      <div />
      <div className="flex items-center gap-4">
        {user && (
          <span className="text-sm text-gray-600 font-medium">
            {user.name ?? 'User'}
          </span>
        )}
        <button
          onClick={handleLogout}
          className="text-sm text-gray-500 hover:text-red-500 transition-colors"
        >
          Logout
        </button>
      </div>
    </header>
  )
}
