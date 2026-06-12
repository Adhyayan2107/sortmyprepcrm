interface EmptyStateProps {
  title: string
  description?: string
  action?: React.ReactNode
}

export default function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center px-4">
      <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-4">
        <svg
          className="w-6 h-6 text-slate-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </div>
      <p className="text-slate-900 font-semibold text-[15px]">{title}</p>
      {description && (
        <p className="text-slate-500 text-sm mt-1 max-w-sm">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
