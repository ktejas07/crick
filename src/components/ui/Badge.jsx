import { clsx } from 'clsx'

const variants = {
  gold:     'bg-gold/20 text-gold border border-gold/30',
  sapphire: 'bg-sapphire/20 text-sapphire-light border border-sapphire/30',
  success:  'bg-success/20 text-success border border-success/30',
  danger:   'bg-danger/20 text-danger border border-danger/30',
  muted:    'bg-midnight-300 text-white/60 border border-border',
  live:     'bg-success/20 text-success border border-success/40 animate-pulse',
}

export default function Badge({ children, variant = 'muted', className = '' }) {
  return (
    <span className={clsx(
      'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wide',
      variants[variant],
      className,
    )}>
      {children}
    </span>
  )
}

