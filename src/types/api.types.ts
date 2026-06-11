export type ServiceResult<T> =
  | { success: true; data: T }
  | { success: false; error: string }

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  code?: string
}

export interface ImportResult {
  added: number
  skipped: number
  errors: Array<{ row: number; reason: string }>
}
