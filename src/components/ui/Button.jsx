import { motion } from 'framer-motion'
import { clsx } from 'clsx'

const variants = {
  primary: 'bg-gold text-midnight font-bold hover:bg-gold-bright active:bg-gold-dark shadow-gold',
  secondary: 'bg-midnight-300 text-white border border-border hover:bg-midnight-400 hover:border-sapphire',
  danger: 'bg-danger/20 text-danger border border-danger/40 hover:bg-danger/30',
  ghost: 'text-white/70 hover:text-white hover:bg-midnight-300',
  sapphire: 'bg-sapphire text-white hover:bg-sapphire-light shadow-sapphire',
  outline: 'border border-gold text-gold hover:bg-gold/10',
}

const sizes = {
  sm:  'px-3 py-1.5 text-sm rounded-lg',
  md:  'px-4 py-2.5 text-sm rounded-xl',
  lg:  'px-6 py-3 text-base rounded-xl',
  xl:  'px-8 py-4 text-lg rounded-2xl',
  icon:'p-2.5 rounded-xl',
}

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  disabled = false,
  loading = false,
  fullWidth = false,
  onClick,
  type = 'button',
  ...props
}) {
  return (
    <motion.button
      type={type}
      whileTap={{ scale: disabled || loading ? 1 : 0.95 }}
      onClick={onClick}
      disabled={disabled || loading}
      className={clsx(
        'inline-flex items-center justify-center gap-2 font-medium transition-all duration-200 select-none',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-gold/50',
        variants[variant],
        sizes[size],
        fullWidth && 'w-full',
        className,
      )}
      {...props}
    >
      {loading ? (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : children}
    </motion.button>
  )
}

