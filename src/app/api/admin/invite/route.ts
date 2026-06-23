import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { UserRole } from '@/types/user.types'
import { TABLES } from '@/lib/constants'

export async function POST(req: NextRequest) {
  // Verify the caller is an admin
  const supabase = await createServerSupabaseClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: callerProfile } = await supabase
    .from(TABLES.USERS)
    .select('role')
    .eq('id', user.id)
    .single()

  if (callerProfile?.role !== 'admin') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  }

  const body = await req.json()
  const { email, name, role } = body as { email: string; name: string; role: UserRole }

  if (!email || !name) {
    return NextResponse.json({ error: 'Email and name are required' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Build redirectTo from the request origin so it always matches where the app is actually running
  const origin = req.headers.get('origin') ?? process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const redirectTo = `${origin}/auth/callback`

  // Send a Supabase magic-link invite email
  const { data: inviteData, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, { redirectTo })
  if (inviteError) {
    return NextResponse.json({ error: inviteError.message }, { status: 400 })
  }

  const newUserId = inviteData.user.id

  // Upsert profile row with chosen role
  const { error: profileError } = await admin
    .from(TABLES.USERS)
    .upsert({ id: newUserId, name, role: role ?? 'rep' })

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, id: newUserId })
}
