export default function Spinner({ size = 'md', className = '' }) {
  const s = { sm: 'w-4 h-4', md: 'w-8 h-8', lg: 'w-12 h-12' }
  return (
    <div className={`${s[size]} border-2 border-gold/30 border-t-gold rounded-full animate-spin ${className}`} />
  )
}

export function FullPageSpinner() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-midnight">
      <div className="flex flex-col items-center gap-4">
        <Spinner size="lg" />
        <p className="text-white/50 text-sm font-medium">Loading...</p>
      </div>
    </div>
  )
}

