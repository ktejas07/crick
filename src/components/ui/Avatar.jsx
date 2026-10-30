import { clsx } from 'clsx'

const colors = [
  'from-gold to-gold-bright',
  'from-sapphire to-sapphire-light',
  'from-success to-emerald-400',
  'from-purple-500 to-pink-500',
  'from-orange-500 to-amber-400',
]

function getColor(name = '') {
  const idx = (name.charCodeAt(0) || 0) % colors.length
  return colors[idx]
}

function initials(name = '') {
  return name
    .split(' ')
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() || '')
    .join('')
}

export default function Avatar({ name = '', size = 'md', className = '' }) {
  const s = {
    xs:   'w-7 h-7 text-xs',
    sm:   'w-9 h-9 text-sm',
    md:   'w-11 h-11 text-base',
    lg:   'w-14 h-14 text-lg',
    xl:   'w-20 h-20 text-2xl',
  }
  const gradient = getColor(name)
  return (
    <div className={clsx(
      s[size],
      'rounded-full flex items-center justify-center font-display font-bold text-midnight',
      `bg-gradient-to-br ${gradient}`,
      'flex-shrink-0',
      className,
    )}>
      {initials(name)}
    </div>
  )
}

