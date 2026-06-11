export default function LoadingSpinner() {
  return (
    <div className="flex flex-col items-center justify-center h-full w-full">
      <div className="w-10 h-10 border-[3px] border-[#2E86AB] border-t-transparent rounded-full animate-spin" />
      <p className="text-slate-400 text-sm mt-3">Loading&hellip;</p>
    </div>
  )
}
