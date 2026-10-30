import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'

export default function Modal({ isOpen, onClose, title, children, size = 'md' }) {
  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose?.() }
    if (isOpen) document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  const widths = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-lg' }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              className={`pointer-events-auto relative flex max-h-[calc(100dvh-2rem)] w-full ${widths[size]} flex-col
                          overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-card`}
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            >
              <div className="mb-4 flex shrink-0 items-center justify-between">
                {title && (
                  <h3 className="font-display font-semibold text-lg text-white">{title}</h3>
                )}
                <button
                  onClick={onClose}
                  className="ml-auto p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-midnight-300 transition-colors"
                  aria-label="Close dialog"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="min-h-0 overflow-y-auto overscroll-contain">
                {children}
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}

