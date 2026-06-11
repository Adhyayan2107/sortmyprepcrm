export default function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center h-full w-full">
      <div className="w-8 h-8 border-4 border-[var(--color-brand-accent)] border-t-transparent rounded-full animate-spin" />
    </div>
  )
}
