import { clsx } from 'clsx'

export default function Input({
  label,
  error,
  className = '',
  icon: Icon,
  ...props
}) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-sm font-medium text-white/70">{label}</label>
      )}
      <div className="relative">
        {Icon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40">
            <Icon size={16} />
          </span>
        )}
        <input
          className={clsx(
            'w-full bg-midnight-100 border rounded-xl px-4 py-3 text-white placeholder-white/30',
            'focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold/30',
            'transition-all duration-200 text-sm',
            Icon && 'pl-10',
            error ? 'border-danger' : 'border-border',
            className,
          )}
          {...props}
        />
      </div>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  )
}

