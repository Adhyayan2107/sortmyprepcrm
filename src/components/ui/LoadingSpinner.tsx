export default function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center h-full w-full py-16">
      <div className="w-7 h-7 border-2 border-slate-200 border-t-[#2563EB] rounded-full animate-spin" />
    </div>
  )
}
