import { motion } from 'framer-motion'
import { clsx } from 'clsx'

export default function Card({ children, className = '', glow = false, hover = false, animate = true, onClick, ...props }) {
  const Comp = animate ? motion.div : 'div'
  const motionProps = animate ? {
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.25 },
  } : {}

  return (
    <Comp
      onClick={onClick}
      className={clsx(
        'rounded-2xl border border-border bg-card p-4',
        'shadow-card',
        hover && 'cursor-pointer hover:border-sapphire/50 hover:bg-midnight-300 transition-all duration-200',
        glow && 'border-gold/30 shadow-gold',
        onClick && 'cursor-pointer',
        className,
      )}
      {...motionProps}
      {...props}
    >
      {children}
    </Comp>
  )
}

