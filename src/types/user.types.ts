export type UserRole = 'admin' | 'rep'

export interface AppUser {
  id: string
  name: string | null
  role: UserRole
  countries: string[] | null
}
